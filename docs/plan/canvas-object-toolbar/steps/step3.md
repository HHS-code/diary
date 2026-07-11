# Step 3: keyboard-shortcuts

## 읽을 파일
- docs/plan/canvas-object-toolbar/PRD.md
- docs/plan/canvas-object-toolbar/architecture.md (특히 "useCanvasKeyboardShortcuts.js" 절)
- src/hooks/useObjectActions.js (step 1 산출물 — copy/remove 로직을 참고해 오프셋 계산 방식을 동일하게 맞춘다)
- src/components/DiaryCanvas/DiaryCanvas.jsx (수정 대상)

## 작업

`src/hooks/useCanvasKeyboardShortcuts.js`를 새로 만든다.

- 시그니처: `useCanvasKeyboardShortcuts(fabricCanvasRef)` — 반환값 없음(부작용으로 전역 `keydown` 리스너를 등록/해제).
- `useEffect` 안에서 `window`에 `keydown` 리스너를 등록하고, 언마운트 시 해제한다.
- `Delete` 키: `fabricCanvasRef.current.getActiveObject()`가 있으면 (단일이든 `ActiveSelection`이든) 제거한다. `ActiveSelection`인 경우 `getObjects()`로 하위 오브젝트들을 순회하며 각각 `canvas.remove()`한다.
- `Ctrl+C` (또는 Mac `Cmd+C`, `e.metaKey`도 확인): 현재 활성 오브젝트를 `clone()`하여 훅 내부의 `useRef`에 보관한다(모듈 스코프 변수는 여러 캔버스 인스턴스가 있을 경우 상태가 섞일 수 있으므로 사용하지 않는다).
- `Ctrl+V` (또는 `Cmd+V`): 보관된 clone이 있으면, step 1의 `copy` 함수와 동일한 오프셋 규칙(+10, +10)으로 새 위치를 계산해 `canvas.add()` 후 `setActiveObject()`. 매번 붙여넣을 때마다 오프셋이 누적되지 않도록, 원본 clone을 기준으로 매번 새로 clone해서 추가한다.
- 텍스트 편집 모드 가드: `keydown` 핸들러 시작 부분에서 `fabricCanvasRef.current?.getActiveObject()?.isEditing`이 `true`이면 (Fabric.js `IText`/`Textbox` 편집 중) 아무 것도 하지 않고 즉시 return한다. 이유는 architecture에 명시된 대로 텍스트 입력 중 브라우저/IME 기본 동작을 가로채지 않기 위함.
- JSX 반환 없음.

`src/components/DiaryCanvas/DiaryCanvas.jsx`를 수정한다.

- `useCanvasKeyboardShortcuts(fabricCanvasRef)` 호출을 추가한다 (다른 훅 호출들과 나란히).

## AC
- `npm run lint` 통과
- `npm run build` 통과
- 코드 리뷰 관점 자가 점검: `isEditing` 가드가 `Delete`/`Ctrl+C`/`Ctrl+V` 세 핸들러 모두에 적용되는지, `keydown` 리스너가 언마운트 시 정리되는지 확인해 리포트에 기록한다.

## 금지
- `document.execCommand` 등 브라우저 클립보드 API를 사용하지 마라. 이유: PRD 범위는 "캔버스 내부 복사/붙여넣기"이며 시스템 클립보드 연동은 요구되지 않았다 — 범위 확장 금지 원칙.
- `ObjectToolbar.jsx`/`AlignmentToolbar.jsx`의 버튼 동작을 변경하지 마라. 이유: 이번 step은 키보드 단축키 추가만 다루며, 기존 버튼은 이미 완료된 범위다.
- `useObjectActions.js`의 `copy`/`remove` 함수 시그니처를 변경하지 마라. 이유: step 1에서 이미 `ObjectToolbar.jsx`가 그 시그니처로 사용 중이며, 변경 시 이전 step 결과가 깨진다. 오프셋 계산 로직만 참고해서 이 훅 안에서 독립적으로 구현한다.
