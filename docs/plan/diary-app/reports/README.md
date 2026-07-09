# 빌드 리포트 — diary (diary-app)

각 step이 무엇을 했는지 위에서 아래로 읽으면 프로젝트가 자라는 과정이 보인다.

- [완료] **Step 0: storage-layer** — src/storage/diaryStorage.js 생성. 공개 API: loadAllDiaryData(), saveAllDiaryData(data), getDatePageData(data, dateKey, tab), setDatePageData(data, dateKey, tab, canvasJSON). localStorage 키 'diary-app-data' 하나에 전체를 JSON 직렬화. setDatePageData는 spread로 새 객체 반환(in-place 변경 없음). Fabric.js·React 의존 없음. 다음 step(fabric-canvas-shell)은 이 네 함수를 import해 캔버스 load/save에 사용한다. ([리포트](step0-storage-layer.md))
- [대기] **Step 1: fabric-canvas-shell** — 
- [대기] **Step 2: sticker-palette** — 
- [대기] **Step 3: image-upload** — 
- [대기] **Step 4: text-memo-fonts** — 
- [대기] **Step 5: calendar-tabs** — 
- [대기] **Step 6: autosave** — 
- [대기] **Step 7: json-png-io** — 
