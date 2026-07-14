# 빌드 리포트 — diary (free-drawing)

각 step이 무엇을 했는지 위에서 아래로 읽으면 프로젝트가 자라는 과정이 보인다.

- [완료] **Step 0: paint-tools-drawing** — usePaintTools(fabricCanvasRef) -> { tool, color, width, setTool, setColor, setWidth } 신규 (src/hooks/usePaintTools.js). tool ∈ select|pencil|brush|airbrush(기본 select), 도구/색/굵기는 useEffect([tool,color,width])에서 applyToolToCanvas로 캔버스에 반영 — 브러시는 매번 새로 생성(PencilBrush 굵기1 고정 | PencilBrush width | SprayBrush width+density=width*5). path:created(PencilBrush의 Path·SprayBrush의 Group 모두 path 키)에서 selectable:false, evented:false, isFreeDrawing:true, erasable:true로 박제. 캔버스 준비 폴링은 useActiveSelection의 50ms setInterval 패턴 재사용. useFabricCanvas.js EXTRA_SERIALIZED_PROPS에 'isFreeDrawing','erasable' 추가됨. 테스트는 @testing-library 없이 react act+createRoot 하니스(usePaintTools.test.js 상단 renderPaintTools 참고 — step 1 지우개 테스트 시 재사용 가능). eraser 도구·@erase2d/fabric import는 아직 없음(step 1 몫), DiaryCanvas 연결도 아직 없음(step 2 몫). ([리포트](step0-paint-tools-drawing.md))
- [대기] **Step 1: eraser-erase2d** — 
- [대기] **Step 2: paint-toolbox-ui** — 
- [대기] **Step 3: canvas-history** — 
- [대기] **Step 4: xp-paint-ui-match** — 
