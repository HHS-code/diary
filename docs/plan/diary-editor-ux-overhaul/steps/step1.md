# Step 1: canvas-background-custom

## 읽을 파일
- docs/plan/diary-editor-ux-overhaul/PRD.md (섹션 1 배경 부분 + "원칙")
- docs/plan/diary-editor-ux-overhaul/architecture.md (섹션 2)
- src/hooks/useFabricCanvas.js (step 0 산출물 — 오토세이브 이벤트 확인)
- src/components/DiaryCanvas/DiaryCanvas.jsx (수정 대상)
- src/components/StickerPalette/StickerPalette.jsx (패널/버튼 스타일 참고)
- docs/design.md (버튼 공통 스타일)

## 작업

### useCanvasBackground.js (신규 로직)
- `src/hooks/useCanvasBackground.js`: `useCanvasBackground(fabricCanvasRef) -> { setColor, setImage }`.
- `setColor(hex)`: `canvas.backgroundColor = hex` 후 `canvas.renderAll()`.
- `setImage(file)`: FileReader로 dataURL을 읽고 Fabric.js `FabricImage.fromURL`로 이미지를 만들어 캔버스 크기에 맞게 scale 조정 후 `canvas.backgroundImage`로 설정, `renderAll()`.
- 배경 변경 후 기존 오토세이브가 저장하는지 확인: `useFabricCanvas`는 `object:added/modified/removed`만 구독하므로 배경 변경은 감지되지 않는다. 해결: `useCanvasBackground` 안에서 배경 변경 직후 `canvas.fire('object:modified')`를 호출해 기존 저장 파이프라인을 그대로 태운다 (useFabricCanvas.js 자체는 수정하지 않는 게 우선. fire 방식이 동작하지 않으면 최소 수정으로 background 변경 전용 이벤트를 scheduleSave에 추가).
- JSX 반환 없음.
- **vitest 단위 테스트 필수**: `src/hooks/useCanvasBackground.test.js` — 실제 Fabric.js Canvas로 setColor 후 `canvas.backgroundColor`가 바뀌는지, toJSON()에 배경이 포함되는지 검증. 테스트 먼저 작성.

### CanvasBackgroundControl.jsx (신규 UI)
- `src/components/CanvasBackgroundControl/CanvasBackgroundControl.jsx`: props `{ actions: { setColor, setImage } }`.
- `<input type="color">`(색상)과 파일 선택 버튼(이미지) 두 개를 담은 작은 패널. 스타일은 `StickerPalette`의 패널 프레임과 `docs/design.md` 버튼 공통 스펙 재사용.
- fabric을 import하지 않는다. props의 함수 호출만.

### DiaryCanvas.jsx (UI)
- `useCanvasBackground(fabricCanvasRef)` 호출, `CanvasBackgroundControl`을 좌측 사이드바(StickerPalette 아래 등)에 추가.

## AC
- `npm run lint` && `npm run build` && `npm run test` 통과 (신규 테스트 포함)

## 금지
- `storage/diaryStorage.js`를 수정하지 마라. 이유: 배경은 canvasJSON 안에 직렬화되므로 저장 포맷 변경이 불필요하다.
- 배경 이미지 필터/편집 기능을 추가하지 마라. 이유: PRD Out-of-scope.
