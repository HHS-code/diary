# Step 3: canvas-history

## 읽을 파일
- `src/hooks/useFabricCanvas.js` — `EXTRA_SERIALIZED_PROPS`, `isLoading` 가드 패턴, 오토세이브 이벤트 구조
- `src/hooks/useCanvasKeyboardShortcuts.js` — 전역 keydown 등록·IText 편집 중 무시 판별 방식 (재사용할 것)
- `src/hooks/useCanvasBackground.js` — `canvas.fire('object:modified')`로 저장 파이프라인 태우는 패턴
- `src/hooks/usePaintTools.js` — 그리기/지우기가 발생시키는 이벤트 확인
- `src/components/DiaryCanvas/DiaryCanvas.jsx` — 훅 연결 자리

## 작업

### 1. `src/hooks/useCanvasHistory.js` (신규 — 로직 훅)

시그니처 (architecture.md 합의):
```
useCanvasHistory(fabricCanvasRef) -> { undo, redo, canUndo, canRedo }
```
부작용으로 Ctrl+Z(undo) / Ctrl+Y(redo) 전역 keydown 등록.

- **스냅샷 스택**: `object:added` / `object:modified` / `object:removed` 이벤트마다
  `canvas.toObject(EXTRA_SERIALIZED_PROPS)` 스냅샷을 `past`에 push.
  `EXTRA_SERIALIZED_PROPS`는 useFabricCanvas.js에서 export해 재사용 (중복 정의 금지).
- `past`는 **30개 제한** — 초과 시 가장 오래된 것을 버린다 (PRD 합의: 메모리 보호).
- 새 변경 발생 시 `future`(redo 스택)를 비운다.
- **초기 스냅샷**: 마운트(및 초기 loadFromJSON 완료) 후의 상태를 base로 1개 확보해,
  첫 변경도 undo로 되돌아갈 수 있어야 한다.
- undo: 현재 상태를 `future`에 push → `past`에서 pop → `loadFromJSON`으로 복원 → `renderAll`. redo는 반대.
- **복원 중 가드 (핵심 규칙)**: `loadFromJSON` 동안 발생하는 이벤트가 히스토리에 다시
  쌓이면 무한 오염이므로 `isRestoring` 플래그로 기록을 중단한다 (useFabricCanvas의 isLoading 패턴).
- **오토세이브 연동**: 복원 완료 후 `canvas.fire('object:modified')`로 기존 저장
  파이프라인을 태운다. 이 fire가 히스토리에 기록되지 않도록 가드 해제 순서에 주의.
- **텍스트 편집 중 무시**: IText 편집 모드에서는 Ctrl+Z/Y를 가로채지 않는다
  (브라우저 기본 텍스트 undo 유지) — useCanvasKeyboardShortcuts의 기존 판별 방식 재사용.
- 배경(색/이미지)은 toObject 스냅샷에 포함되므로 배경 변경도 자동으로 undo 대상.

### 2. `src/components/DiaryCanvas/DiaryCanvas.jsx` (수정 — 최소)

- `useCanvasHistory(fabricCanvasRef)` 호출 추가. 그 외 무수정 (undo 버튼 UI 없음 — 단축키만, PRD 범위).

### 3. 테스트 (TDD)

`src/hooks/useCanvasHistory.test.js` (신규): 최소 —
- 오브젝트 추가 → undo → 캔버스에서 사라짐 → redo → 다시 나타남
- 변경 2회 → undo 2회 → 초기 상태
- undo 후 새 변경 → redo 불가(canRedo false)
- 31회 변경 시 past가 30개를 넘지 않고, 가장 오래된 것부터 버려진다
- 복원(loadFromJSON) 중 발생한 이벤트가 히스토리에 쌓이지 않는다
- Ctrl+Z keydown으로 undo가 호출된다

## AC
```
npm run lint
npm run test
npm run build
```
셋 다 exit code 0. 기존 테스트 전부 유지 + 신규 테스트 통과.

## 금지
- `useFabricCanvas.js`의 오토세이브 로직을 수정하지 마라 (EXTRA_SERIALIZED_PROPS export 추가만 허용). 이유: 저장은 검증된 기존 파이프라인 — 히스토리는 그 위에 얹는다.
- undo/redo UI 버튼을 만들지 마라. 이유: PRD 범위는 단축키만.
- 스냅샷을 localStorage에 저장하지 마라. 이유: 히스토리는 세션 메모리 전용 — 저장하면 용량 한계(PRD 전제)를 위협.
- 기존 훅 4종 및 `usePaintTools.js` 수정 금지. 이유: 확정된 계약.
