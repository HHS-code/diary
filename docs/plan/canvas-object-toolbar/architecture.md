# Architecture — 캔버스 오브젝트 조작 툴바

## 기술 스택

- React + Fabric.js (기존과 동일, 새 패키지 추가 없음)
- 기존 `useFabricCanvas` 훅이 반환하는 `fabricCanvasRef`를 그대로 사용

## 폴더 구조 (제안)

```
diary/
  docs/plan/canvas-object-toolbar/   PRD.md, architecture.md (이 문서)
  src/
    components/
      DiaryCanvas/
        DiaryCanvas.jsx             ObjectToolbar 렌더링 추가 (수정)
      ObjectToolbar/
        ObjectToolbar.jsx           신규: 순수 UI — 플로팅 미니 툴바 (단일 선택용 버튼)
    hooks/
      useFabricCanvas.js            selection 이벤트 콜백 전달 (수정)
      useActiveSelection.js         신규: 로직 — selection:* 이벤트 구독, 활성 오브젝트 state
      useObjectActions.js           신규: 로직 — 복사/삭제/레이어 순서 Fabric.js 호출
      useCanvasKeyboardShortcuts.js 신규: 로직 — Delete/Ctrl+C/Ctrl+V 처리
```

다중 선택 시 함께 이동하는 동작은 Fabric.js `ActiveSelection`이 기본 제공하므로 별도 코드가 없다. 정렬/등간격 배치(`useAlignment.js`, `AlignmentToolbar.jsx`)는 시도했으나, `ActiveSelection`에 속한 오브젝트가 상대좌표로 전환되고 `getBoundingRect()`(절대좌표) 캐시가 `set()`만으로 안전하게 갱신되지 않는 문제가 실측으로 확인되어 이번 범위에서 제외했다(PRD Out-of-scope 참고).

## UI/로직 분리 원칙

이 phase부터 새로 작성하는 코드는 **로직(Fabric.js 호출·상태·이벤트)과 UI(JSX+스타일)를 파일 단위로 분리**한다. UI를 바꾸는 작업(색상·배치·아이콘 교체 등)이 기능(복사가 실제로 되는지, 레이어 순서가 맞는지 등)에 영향을 주지 않게 하기 위함이다.

- `useXxx.js` (훅): Fabric.js API 호출, 상태 계산, 이벤트 구독을 담당한다. JSX를 반환하지 않는다. 버튼을 눌렀을 때 실행할 함수들(`copySelection()`, `bringToFront()` 등)을 반환한다.
- `Xxx.jsx` (컴포넌트): 훅이 반환한 함수/데이터를 props로 받아 버튼을 그리기만 한다. Fabric.js를 직접 import하거나 호출하지 않는다.
- 예: `ObjectToolbar.jsx`는 `useObjectActions(fabricCanvasRef, activeObject)`가 반환한 `{ copy, remove, bringToFront, sendToBack, bringForward, sendBackward }` 함수를 받아 버튼 6개를 그리기만 한다. 버튼 스타일만 바꾸는 작업은 `ObjectToolbar.jsx`만 건드리면 되고 `useObjectActions.js`는 손대지 않는다.
- 이 원칙은 이번에 새로 쓰는 파일에만 적용한다. 기존 `StickerPalette.jsx` 등은 이번 범위에서 리팩터링하지 않는다(수술적 변경 원칙, PRD Out-of-scope).

## useActiveSelection.js (신규 — 로직)

- 훅 시그니처: `useActiveSelection(fabricCanvasRef) -> { activeObject: FabricObject | null, activeSelection: ActiveSelection | null }`
- `fabricCanvasRef.current`가 준비되면 `selection:created`, `selection:updated`, `selection:cleared` 이벤트를 구독해 내부 state를 갱신한다.
- 단일 선택이면 `activeObject`만 채워지고, 다중 선택(`ActiveSelection`, 2개 이상)이면 `activeSelection`도 채워진다.
- JSX 없음. `DiaryCanvas`가 이 훅을 호출해 `ObjectToolbar` 렌더링 여부를 결정한다. `activeSelection`은 다중 선택 여부 판단에 계속 쓰이지만, 다중 선택 시 별도 UI(정렬 툴바 등)는 렌더링하지 않는다.

## useObjectActions.js (신규 — 로직)

- 훅 시그니처: `useObjectActions(fabricCanvasRef) -> { copy, remove, bringToFront, sendToBack, bringForward, sendBackward }` — 각 함수는 `(target: FabricObject) => void`.
- 복사: `target.clone()` → `left`/`top`에 오프셋(예: +10px) → `canvas.add()` → `canvas.setActiveObject()`.
- 삭제: `canvas.remove(target)`.
- 레이어: `canvas.bringObjectToFront(target)` / `sendObjectToBack(target)` / `bringObjectForward(target)` / `sendObjectBackwards(target)` (Fabric.js v6 Canvas API).
- Fabric.js 호출만 담당하며 JSX를 반환하지 않는다.

## useCanvasKeyboardShortcuts.js (신규 — 로직)

- 훅 시그니처: `useCanvasKeyboardShortcuts(fabricCanvasRef)` — 반환값 없음, 부작용(이벤트 리스너 등록)만 수행.
- `DiaryCanvas`에서 호출, 캔버스가 포커스 상태(또는 선택된 오브젝트가 있을 때)일 때만 동작.
- `keydown` 전역 리스너:
  - `Delete`: 현재 활성 오브젝트(또는 다중 선택 전체)를 `canvas.remove()`.
  - `Ctrl+C`: 활성 오브젝트를 내부 변수(모듈 스코프 또는 `useRef`)에 clone하여 보관.
  - `Ctrl+V`: 보관된 clone을 오프셋 위치에 `canvas.add()` — `useObjectActions`의 `copy` 로직과 오프셋 계산 방식을 동일하게 맞춘다.
- 텍스트 입력 중(예: Fabric.js의 `IText` 편집 모드)에는 단축키가 브라우저 기본 동작을 가로채지 않도록, `canvas.getActiveObject()`가 편집 모드인지 확인 후 무시한다.

## ObjectToolbar.jsx (신규 — 순수 UI)

- props: `{ activeObject, actions: { copy, remove, bringToFront, sendToBack, bringForward, sendBackward } }` — `useObjectActions`가 반환한 함수 객체를 그대로 받는다. Fabric.js를 직접 import하지 않는다.
- 표시 위치: `activeObject.getBoundingRect()`로 오브젝트의 캔버스 내 좌표를 구해, 그 바로 위(공간 부족 시 아래)에 `position: absolute`로 배치. 부모(`DiaryCanvas`의 캔버스 래퍼)는 `position: relative`가 되어야 한다.
- 버튼: 복사 / 삭제 / 맨 앞으로 / 맨 뒤로 / 한 단계 앞으로 / 한 단계 뒤로. 각 버튼 `onClick`은 `() => actions.copy(activeObject)` 형태로 props의 함수를 호출만 한다.
- 스타일: `docs/design.md`의 버튼 공통 스펙 재사용 — `border:1px solid #7d7d64`, `background:linear-gradient(180deg,#fdfdfa,#dcd9c7)`, `borderRadius:3`. 패널 프레임은 `StickerPalette`의 `panelStyle`과 동일한 값(`#ece9d8` 배경, 동일 boxShadow)을 재사용.

## DiaryCanvas.jsx (수정)

- 캔버스 래퍼 `<div>`에 `position: 'relative'` 추가 (툴바 절대 위치 기준점).
- `useActiveSelection(fabricCanvasRef)`로 `{ activeObject }`를 얻는다 (`activeSelection`은 이번 범위에서 미사용).
- `useObjectActions(fabricCanvasRef)`로 액션 함수 객체를 얻어 `ObjectToolbar`에 props로 전달한다.
- `activeObject`가 있으면(단일 선택) `ObjectToolbar`를 조건부 렌더링한다. 다중 선택 시에는 Fabric.js 기본 동작(그룹 드래그 이동)만 적용되고 별도 UI는 뜨지 않는다.
- `useCanvasKeyboardShortcuts(fabricCanvasRef)` 호출 추가.

## 모듈 경계

- `useActiveSelection.js`, `useObjectActions.js`, `useCanvasKeyboardShortcuts.js`는 Fabric.js 캔버스 인스턴스(`fabricCanvasRef`)에만 의존하고, `storage/diaryStorage.js`나 localStorage에 직접 접근하지 않는다 (기존 오토세이브는 `useFabricCanvas`의 `object:*` 이벤트가 그대로 감지하므로 별도 저장 로직 불필요).
- `ObjectToolbar.jsx`는 Fabric.js를 직접 import하지 않는다 — 오직 훅이 반환한 props(데이터 + 함수)만 사용한다. 이 경계를 지키면 툴바의 색상·배치·아이콘을 바꾸는 작업이 `useObjectActions.js`의 동작(복사가 실제로 되는지 등)에 영향을 줄 수 없다.
- 새 컴포넌트는 `StickerPalette`, `ImageUploadButton` 등 기존 캔버스 도구 컴포넌트와 형제 관계로, 서로 참조하지 않는다.
