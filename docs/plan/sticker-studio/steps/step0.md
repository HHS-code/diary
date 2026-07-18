# Step 0: canvas-size-param

## 읽을 파일
- docs/plan/sticker-studio/PRD.md (섹션 2 "캔버스")
- docs/plan/sticker-studio/ADR.md (ADR-2)
- docs/plan/sticker-studio/architecture.md (섹션 2 "캔버스 생성")
- src/hooks/useFabricCanvas.js (전체 — 현재 시그니처, `LOGICAL_CANVAS` export, 캔버스 생성/저장 콜백 로직)
- src/hooks/useFabricCanvas.test.js (전체 — 기존 테스트가 캔버스 크기를 어떻게 가정하는지)

## 작업

### useFabricCanvas.js 수정

`src/hooks/useFabricCanvas.js`의 `useFabricCanvas(canvasElementRef, initialCanvasJSON, onSave, options)` 시그니처는 그대로 두고, `options`에 두 필드를 추가한다:

- `options.logicalSize?: { width: number, height: number }` — 생략 시 기존 `LOGICAL_CANVAS`(1600×1000)를 그대로 쓴다.
- `options.backgroundColor?: string` — 생략 시 기존 `'#ffffff'`를 그대로 쓴다.

구현 방향:
- 훅 내부에서 `const logicalSize = options?.logicalSize ?? LOGICAL_CANVAS`로 계산해, 현재 `LOGICAL_CANVAS.width`/`LOGICAL_CANVAS.height`를 직접 참조하던 자리(캔버스 생성 시 `width`/`height` 계산, 오브젝트 중앙 배치 관련 로직이 이 훅 안에 있다면 그 부분)를 이 지역 변수로 교체한다.
- `new Canvas(el, { ..., backgroundColor: options?.backgroundColor ?? '#ffffff' })`로 배경색도 옵션화한다.
- 저장 콜백 `onSaveRef.current(fabricCanvas.toObject(EXTRA_SERIALIZED_PROPS), LOGICAL_CANVAS)` 호출부의 두 번째 인자도 `LOGICAL_CANVAS` 대신 `logicalSize`로 바꾼다 — 저장 시 실제 캔버스 크기가 전달되어야 한다.
- 모듈 최상위 `export const LOGICAL_CANVAS = { width: 1600, height: 1000 }`는 이름과 값 그대로 유지한다(다른 파일들이 이 export를 참조하므로 삭제·rename 금지).
- 훅의 반환값(`fabricCanvasRef`)과 `options.onLoaded` 동작은 변경하지 않는다.

## AC
- `npm run lint && npm run build && npm run test` 통과.
- 기존 `useFabricCanvas.test.js`의 모든 테스트가 수정 없이 그대로 통과해야 한다(옵션을 넘기지 않는 기존 호출부는 동작이 완전히 동일해야 함 — 이게 이 step의 핵심 회귀 기준이다).
- 신규 테스트: `logicalSize: { width: 300, height: 300 }`를 넘겨 훅을 생성하면 실제 `fabricCanvas.width`/`fabricCanvasRef.current.width`(혹은 대응하는 조회 방법)가 300이 되는지. `backgroundColor: 'transparent'`를 넘기면 캔버스의 `backgroundColor` 속성이 `'transparent'`로 설정되는지. `onSave`가 `logicalSize`를 두 번째 인자로 받는지(300×300을 넘긴 경우 콜백에 `{ width: 300, height: 300 }`이 전달되는지, 저장 트리거는 기존 디바운스 테스트 패턴을 따른다).

## 금지
- `LOGICAL_CANVAS`라는 이름이나 그 값(1600×1000)을 변경하지 마라. 이유: 다이어리 쪽 여러 파일(`canvasAssetPlacement.js`, `ImageUploadButton.jsx`, `StickerPalette.jsx` 등)이 이 상수를 직접 import해서 오브젝트 중앙 배치 등에 쓰고 있어, 값이 바뀌면 다이어리 화면이 깨진다.
- `options`를 넘기지 않는 기존 호출부의 동작을 조금이라도 바꾸지 마라(캔버스 크기, 배경색, 저장 콜백 인자 모두 기존과 100% 동일해야 함). 이유: 이 step은 다이어리 회귀 없이 스티커 스튜디오가 쓸 여지만 넓히는 것이 목적이다(ADR-2).
- 이 step에서 `StickerStudio` 컴포넌트나 데스크톱 진입점을 만들지 마라. 이유: 다음 step(sticker-studio-shell)의 책임이며, 이 step은 `useFabricCanvas` 자체의 파라미터화만 다룬다.
