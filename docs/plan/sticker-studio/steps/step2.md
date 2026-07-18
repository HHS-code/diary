# Step 2: sticker-studio-shell

## 읽을 파일
- docs/plan/sticker-studio/PRD.md (섹션 1 "데스크톱 진입점", 섹션 2 "캔버스", 섹션 3 "스티커 제작 — 그리기")
- docs/plan/sticker-studio/ADR.md (ADR-1, ADR-7)
- docs/plan/sticker-studio/architecture.md (섹션 1 컴포넌트 개요, 섹션 2~3)
- src/App.jsx (전체 — `isDiaryOpen` state와 `Window`/`DiaryApp` 연결 패턴, 그대로 복제할 대상)
- src/components/Desktop/Desktop.jsx (전체 — 아이콘 버튼 패턴, `onOpenDiary` prop)
- src/components/Window/Window.jsx (전체 — props `{ title, onClose, children }`만 받는 단순 컴포넌트, 수정 불필요)
- src/assets/icons.js (전체 — export 패턴)
- reference/Windows XP Icons/Paint.png (신규 아이콘 소스 파일)
- src/hooks/useFabricCanvas.js (step 0 산출물 — `logicalSize`/`backgroundColor` 옵션)
- src/hooks/usePaintTools.js (전체 — `fabricCanvasRef`만 받는 시그니처, 그대로 재사용)
- src/hooks/useCanvasHistory.js (전체 — 동일)
- src/hooks/useCanvasKeyboardShortcuts.js (전체 — `registerAndPlaceImage` 콜백 시그니처)
- src/components/PaintToolbox/PaintToolbox.jsx (전체 — 그리기 도구 UI, props 그대로 재사용)
- src/components/DiaryApp/DiaryApp.jsx (다이어리 앱 루트가 어떻게 구성되는지 참고용)

## 작업

### 아이콘 추가

`reference/Windows XP Icons/Paint.png`를 `src/assets/`(예: `sticker-studio-icon.png`)로 복사하고, `src/assets/icons.js`에 `stickerStudioIcon`으로 export를 추가한다(`diaryIcon` export 방식 그대로 따라 함).

### 데스크톱 진입점

- `src/components/Desktop/Desktop.jsx`: `onOpenStickerStudio: () => void` prop을 추가로 받아, 기존 diary 아이콘 버튼 옆에 동일한 스타일의 스티커 스튜디오 아이콘 버튼을 추가한다(`stickerStudioIcon`, 라벨 "sticker studio" 또는 "스티커").
- `src/App.jsx`: `isStickerStudioOpen` state를 `isDiaryOpen`과 나란히 추가하고, `<Desktop onOpenDiary={...} onOpenStickerStudio={() => setIsStickerStudioOpen(true)} />`로 연결. `isStickerStudioOpen && <Window title="sticker studio" onClose={() => setIsStickerStudioOpen(false)}><StickerStudio /></Window>`를 기존 diary Window 블록 옆에 추가.

### StickerStudio.jsx (신규)

`src/components/StickerStudio/StickerStudio.jsx`:

- 이 컴포넌트가 스티커 스튜디오 화면의 루트다. `useFabricCanvas`를 캔버스 크기 `{ width: 512, height: 512 }`(모듈 상수로 정의, 예: `STICKER_LOGICAL_CANVAS`)와 `backgroundColor: 'transparent'`로 호출한다.
- `onSave` 콜백은 넘기지 않거나(오토세이브 없음) 아무 것도 하지 않는 빈 함수를 넘긴다 — architecture.md 섹션 2 명시: 스티커 스튜디오는 편집 중 상태를 영속시키지 않고, "완성" 시점에만 명시적으로 저장한다(저장 로직 자체는 이후 step의 범위).
- `usePaintTools(fabricCanvasRef)`, `useCanvasHistory(fabricCanvasRef)`를 그대로 호출해 연결한다.
- `useCanvasKeyboardShortcuts(fabricCanvasRef, { registerAndPlaceImage })`를 연결한다 — `registerAndPlaceImage`는 이 step에서는 최소 구현(예: 클립보드 이미지를 캔버스 중앙에 배치만 하고 별도 에셋 등록은 하지 않는 임시 함수, 또는 `undefined`로 두어 클립보드 이미지 우선 처리를 비활성화)으로 두어도 된다 — 본격적인 에셋 등록 연동은 이후 step(sticker-save-and-reuse)의 몫이다. 이 step에서는 훅이 에러 없이 연결되어 최소한 Delete/Ctrl+C/V(오브젝트 복제)가 동작하는 것까지만 확인한다.
- `PaintToolbox`(기존 컴포넌트)를 사이드바 자리에 렌더링해 `usePaintTools`의 반환값과 연결한다(다이어리에서 쓰는 방식 그대로 — props 그대로 전달).
- 캔버스는 `<canvas>` 엘리먼트를 렌더링하고 `useFabricCanvas`가 반환한 ref를 연결한다(다이어리의 캔버스 엘리먼트 마운트 패턴을 그대로 따른다).

## AC
- `npm run lint && npm run build && npm run test` 통과.
- 신규 테스트 `StickerStudio.test.jsx`: 컴포넌트가 에러 없이 마운트되는지, `<canvas>` 엘리먼트가 렌더링되는지.
- 신규 테스트 `Desktop.test.jsx`(기존 파일이 있다면 거기에 추가): `onOpenStickerStudio` prop을 넘기고 스티커 스튜디오 아이콘을 클릭하면 그 콜백이 호출되는지, 기존 `onOpenDiary` 클릭 동작은 회귀 없이 그대로인지.
- `App.jsx`에 대한 기존 테스트가 있다면(없다면 생략 가능) 그것이 통과하는지, 다이어리 아이콘 클릭 시 여전히 `DiaryApp`이 열리는지 확인.

## 금지
- 이 step에서 이미지 업로드, 크롭, 누끼따기, 흰색 테두리, 저장 UI를 만들지 마라. 이유: 각각 이후 step(3~6)의 범위이며, 이 step은 "빈 캔버스가 열리고 그리기/undo·redo/복사삭제가 되는" 최소 뼈대까지만 담당한다(PRD 섹션 1~3).
- `Window` 컴포넌트 자체를 수정하지 마라(다중 창 지원 추가 등). 이유: ADR-1 — 이번 phase는 기존 단일창 `Window` 구현을 그대로 쓰고 다중 창 스택은 범위 밖이다.
- 다이어리 쪽 `App.jsx`/`Desktop.jsx`의 기존 diary 관련 코드(`isDiaryOpen`, diary 아이콘)를 삭제하거나 구조를 바꾸지 마라. 이유: 기존 동작과 나란히 추가하는 것이 목적이며, 다이어리 진입 경로가 회귀하면 안 된다.
