# Architecture — 고정 캔버스 해상도 + 표시 스케일

## 핵심 개념

- **논리 좌표계**: 모든 오브젝트 좌표·크기·저장 데이터는 항상 1600×1000 평면 기준. 기기와 무관.
- **표시 스케일**: 화면에 보이는 `<canvas>` 엘리먼트만 `scale = min(가용폭/1600, 가용높이/1000)` 배율로 그림. Fabric.js에서는 `canvas.setDimensions({ width: 1600*scale, height: 1000*scale })` + `canvas.setZoom(scale)` 조합 — zoom이 걸린 상태에서 fabric이 마우스 좌표를 논리 좌표로 자동 변환하므로 조작이 정확하다.

## 수정 파일

```
src/
  hooks/
    useFabricCanvas.js       고정 논리 크기 + 표시 스케일 적용 (수정)
    canvasMigration.js       fit 변환 함수 추가 (수정)
  components/
    DiaryCanvas/DiaryCanvas.jsx      측정값 → scale 계산으로 변경 (수정)
    ExportImportControls/...jsx      PNG 내보내기 multiplier 적용 (수정)
```

## 상수

`src/hooks/useFabricCanvas.js`(또는 공용 위치)에 정의:
```js
export const LOGICAL_CANVAS = { width: 1600, height: 1000 }
```

## useFabricCanvas.js (수정)

- `options.width/height`(픽셀 크기 지정) 대신 `options.displayScale`을 받는다.
- 캔버스 생성: `new Canvas(el, { width: 1600*scale, height: 1000*scale, backgroundColor: '#ffffff' })` 후 `setZoom(scale)`.
- `onSave`의 두 번째 인자(canvasSize)는 항상 `LOGICAL_CANVAS`를 전달 — 저장 데이터는 논리 좌표계 기준이므로.
- 직렬화(`toObject`)는 zoom과 무관하게 논리 좌표를 담으므로 추가 처리 없음.

## canvasMigration.js (수정 — fit 변환 추가)

기존 `scaleCanvasObjects`(stretch 방식)는 유지하되 사용처가 없어지면 제거 가능. 신규:

```js
fitCanvasObjects(canvas, fromSize, toSize) -> void
```
- `s = min(toSize.width/fromSize.width, toSize.height/fromSize.height)` (비율 유지)
- `dx = (toSize.width - fromSize.width*s) / 2`, `dy = (toSize.height - fromSize.height*s) / 2` (가운데 정렬)
- 각 오브젝트: `left = left*s + dx`, `top = top*s + dy`, `scaleX *= s`, `scaleY *= s`, `setCoords()`
- `fromSize === toSize`면 아무것도 안 함 (신버전 데이터는 no-op).
- vitest 테스트: 800×600 → 1600×1000 fit 시 배율 s=1600/800=2 vs 1000/600≈1.667 중 작은 1.667 적용, 가로 여백 (1600-800*1.667)/2 확인. 동일 크기 no-op 확인.

## DiaryCanvas.jsx (수정)

- 측정(마운트 1회, 기존 유지) 후 `scale = min(가용폭/1600, 가용높이/1000)` 계산. 최소 스케일 하한(예: 0.2) 클램프.
- `useFabricCanvas(..., { displayScale: scale, onLoaded: fitLoadedObjects })`.
- `fitLoadedObjects`: 저장된 canvasSize(없으면 800×600)와 `LOGICAL_CANVAS`가 다르면 `fitCanvasObjects` 1회 호출.

## ExportImportControls.jsx (수정)

- PNG 내보내기: `canvas.toDataURL({ format: 'png', multiplier: LOGICAL_CANVAS.width / canvas.getWidth() })` — 엘리먼트가 몇 배율로 표시 중이든 출력은 항상 1600×1000.

## 갤러리 썸네일 (변경 없음)

`useDiaryThumbnails`는 저장된 canvasSize로 StaticCanvas를 만들어 렌더링하는 기존 동작 유지. 신버전 데이터는 자연히 1600×1000 비율 썸네일이 된다.

## 모듈 경계

- 좌표계·스케일 계산은 전부 로직 레이어(useFabricCanvas, canvasMigration)에서 처리. UI 컴포넌트는 scale 값을 계산해 넘길 뿐 fabric을 직접 다루지 않는다 (기존 분리 원칙 유지).
