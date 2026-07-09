# 빌드 리포트 — diary (diary-app)

각 step이 무엇을 했는지 위에서 아래로 읽으면 프로젝트가 자라는 과정이 보인다.

- [완료] **Step 0: storage-layer** — src/storage/diaryStorage.js 생성. 공개 API: loadAllDiaryData(), saveAllDiaryData(data), getDatePageData(data, dateKey, tab), setDatePageData(data, dateKey, tab, canvasJSON). localStorage 키 'diary-app-data' 하나에 전체를 JSON 직렬화. setDatePageData는 spread로 새 객체 반환(in-place 변경 없음). Fabric.js·React 의존 없음. 다음 step(fabric-canvas-shell)은 이 네 함수를 import해 캔버스 load/save에 사용한다. ([리포트](step0-storage-layer.md))
- [완료] **Step 1: fabric-canvas-shell** — src/hooks/useFabricCanvas.js 생성. 공개 API: useFabricCanvas(canvasElementRef) → fabricCanvasRef. 마운트 시 new Canvas(el, { width:800, height:600 }) 생성, 언마운트 시 dispose(). src/components/DiaryCanvas/DiaryCanvas.jsx 생성 — <canvas> 렌더링 + 임시 '테스트용 네모 추가' 버튼(step 2~4에서 교체 예정). App.jsx를 Vite 보일러플레이트에서 DiaryCanvas 렌더링으로 교체. Fabric.js import: { Canvas, Rect } from 'fabric' (v7 named export). storage/diaryStorage.js 미연결(step 6에서 연결). npm run build 통과(471 kB). ([리포트](step1-fabric-canvas-shell.md))
- [완료] **Step 2: sticker-palette** — src/components/StickerPalette/StickerPalette.jsx 생성. props: { fabricCanvasRef }. STICKERS 상수(30개 이모지)를 그리드 버튼으로 렌더링, 클릭 시 FabricText(emoji, fontSize:48)를 캔버스 중앙(400,300) ±100px 랜덤 오프셋 위치에 추가. Fabric.js import: { FabricText } from 'fabric'. DiaryCanvas.jsx에서 Rect import 및 테스트용 네모 추가 버튼 제거, StickerPalette를 좌측에 배치. npm run build 통과(472 kB). 다음 step(image-upload)은 fabricCanvasRef를 동일 방식으로 받아 이미지 오브젝트를 추가하면 된다. ([리포트](step2-sticker-palette.md))
- [대기] **Step 3: image-upload** — 
- [대기] **Step 4: text-memo-fonts** — 
- [대기] **Step 5: calendar-tabs** — 
- [대기] **Step 6: autosave** — 
- [대기] **Step 7: json-png-io** — 
