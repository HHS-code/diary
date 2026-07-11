# 빌드 리포트 — diary (canvas-object-toolbar)

각 step이 무엇을 했는지 위에서 아래로 읽으면 프로젝트가 자라는 과정이 보인다.

- [완료] **Step 0: active-selection-tracking** — useActiveSelection(fabricCanvasRef) -> { activeObject, activeSelection } 생성 (src/hooks/useActiveSelection.js). Fabric.js selection:created/updated/cleared 3개 이벤트 구독, getObjects().length >= 2면 activeSelection, 아니면 activeObject. 제약: fabricCanvasRef.current는 useFabricCanvas 내부에서 Promise.then()으로 비동기 세팅되므로 마운트 시점 effect에서 즉시 null일 수 있음 — 50ms setInterval로 폴링 후 준비되면 구독, 언마운트/재구독 시 정리(off) 보장. DiaryCanvas.jsx에서 이 훅을 호출해 임시 텍스트(선택됨:/다중 선택:)로 노출 중이며, 다음 step(object-actions-toolbar)에서 이 임시 표시를 ObjectToolbar.jsx로 교체하고 useObjectActions.js를 추가해야 함. 캔버스 래퍼 div에 position:relative 이미 추가됨. ([리포트](step0-active-selection-tracking.md))
- [대기] **Step 1: object-actions-toolbar** — 
- [대기] **Step 2: alignment-toolbar** — 
- [대기] **Step 3: keyboard-shortcuts** — 
