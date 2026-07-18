# Step 4: sticker-lasso-cutout

## 읽을 파일
- docs/plan/sticker-studio/PRD.md (섹션 4 "배경 제거(누끼따기)" 부분)
- docs/plan/sticker-studio/ADR.md (ADR-5)
- docs/plan/sticker-studio/architecture.md (섹션 5 "누끼따기 (올가미)")
- src/hooks/usePaintTools.js (전체 — `tool` 상태 목록, `buildBrush`, `applyToolToCanvas`, `path:created` 구독 패턴. 여기에 `'lasso'`를 추가한다)
- src/components/StickerStudio/StickerStudio.jsx (step 2 산출물)
- src/components/PaintToolbox/PaintToolbox.jsx (도구 선택 버튼 UI — `'lasso'` 버튼을 추가할 위치 참고)
- node_modules/fabric의 `clipPath`, `Path`, `PencilBrush` API(타입/소스로 확인)

## 작업

### usePaintTools.js에 'lasso' 도구 추가

`src/hooks/usePaintTools.js`의 `tool` 유니온에 `'lasso'`를 추가한다:

- `buildBrush`에 `tool === 'lasso'` 분기를 추가한다 — `PencilBrush`를 쓰되 시각적으로 선택 영역임을 구분할 수 있도록 얇은 점선 느낌(가능하다면 `strokeDashArray` 유사 설정, fabric의 freeDrawingBrush가 지원하는 범위 내에서. 지원하지 않으면 색상만이라도 구분되게 한다 — 예: 밝은 파란색 고정, 굵기는 얇게 고정).
- `path:created` 이벤트 구독부(`pinCreatedStroke`)를 그대로 쓰면 `isFreeDrawing`/`erasable` 태그가 붙어 지우개 대상이 되거나 영구적인 그림 획으로 취급된다 — `lasso` 도구로 그린 Path는 이 훅의 표준 `path:created` 처리를 타지 않고 별도로 처리되어야 한다(아래 stickerCutout.js가 이 이벤트를 가로채 소비). `usePaintTools`가 `tool === 'lasso'`일 때는 `pinCreatedStroke`에서 태그를 붙이지 않고 대신 캔버스에서 그 Path를 즉시 제거(`canvas.remove(path)`)해, 그림 획으로 남지 않고 오직 좌표 정보(폐곡선 모양)만 다음 단계로 넘어가도록 한다. 이 훅이 직접 `stickerCutout.js`를 호출할 필요는 없다 — `path:created` 이벤트 자체는 계속 발생하므로, `StickerStudio.jsx`가 별도로 이 이벤트를 구독해 `tool === 'lasso'`일 때 `stickerCutout.js`로 넘기는 방식으로 관심사를 분리한다.

### stickerCutout.js (신규)

`src/fabric/stickerCutout.js`:

- `previewLassoCutout(targetImage, lassoPath) -> void` — `lassoPath`의 좌표를 `targetImage`의 로컬 좌표계로 변환해(Fabric의 오브젝트 좌표 변환 유틸 사용) `targetImage.clipPath`로 설정하고 `targetImage.canvas?.renderAll()`을 호출한다. 이 함수는 여러 번 호출될 수 있다(사용자가 올가미를 다시 그려 재시도).
- `commitLassoCutout(canvas, targetImage) -> Promise<void>` — 현재 `targetImage.clipPath`가 적용된 상태를 실제 픽셀로 굽는다: `targetImage`가 차지하는 영역만큼 `toCanvasElement()`(또는 동등한 방법)로 rasterize한 뒤, 그 결과로 새 `FabricImage`를 만들어 `canvas`에서 기존 `targetImage`를 제거하고 교체한다. 새 이미지는 원래 위치(`left`/`top`)를 유지한다. `assetId` 등 기존 메타데이터가 `targetImage`에 있었다면 새 오브젝트에 승계한다.
- 두 함수 다 대상 오브젝트가 없거나 `lassoPath`가 비정상(점 2개 미만 등)인 경우 아무 것도 하지 않고 조용히 반환한다.

### StickerStudio.jsx 연결

- `path:created` 이벤트를 구독해(캔버스가 준비된 후) `usePaintTools().tool === 'lasso'`일 때, 이벤트로 받은 `path`와 현재 선택된 대상 이미지(캔버스에 이미지가 하나뿐이면 그것을, 여러 개면 `canvas.getActiveObject()`)를 `previewLassoCutout`에 넘긴다.
- "누끼 적용" 버튼을 사이드바에 추가해 `commitLassoCutout`을 호출한다. "다시 그리기" 또는 단순히 새 올가미를 다시 그리면 `previewLassoCutout`이 다시 호출되어 이전 미리보기를 덮어쓴다.

## AC
- `npm run lint && npm run build && npm run test` 통과.
- 신규 테스트 `stickerCutout.test.js`: `previewLassoCutout` 호출 후 `targetImage.clipPath`가 설정되는지. `commitLassoCutout` 호출 후 캔버스의 오브젝트 개수가 그대로 1개이되(교체됨) 새 오브젝트가 `clipPath`를 갖지 않는(이미 rasterize되어 별도 clipPath가 필요 없는) 순수 이미지인지.
- 신규 테스트: `usePaintTools`에서 `tool`을 `'lasso'`로 설정하고 `path:created`를 발생시켰을 때, 해당 Path가 `isFreeDrawing` 태그 없이 캔버스에서 제거되는지(그림 획으로 영구히 남지 않는지).

## 금지
- 올가미로 그린 Path에 `isFreeDrawing`/`erasable` 태그를 붙이지 마라. 이유: 지우개 도구가 실수로 선택 영역 표시선을 지우거나, undo/redo 히스토리에 불필요한 그림 획으로 기록되면 안 된다 — 올가미는 "선택 도구"이지 "그리기 도구"가 아니다.
- `commitLassoCutout` 전에 자동으로 커밋하지 마라(예: 올가미를 그리자마자 바로 rasterize). 이유: architecture.md ADR-5 — 미리보기(clipPath 적용)와 확정(rasterize)을 분리해 사용자가 다시 그려 재시도할 수 있어야 한다.
- 열리지 않은 곡선(시작점≠끝점)을 강제로 검증해 에러를 던지거나 사용자에게 다시 그리라고 막지 마라. 이유: ADR-5 — Fabric Path의 fill 규칙에 맡겨 자동으로 닫힌 것처럼 채워지는 동작을 그대로 받아들이기로 합의했다.
