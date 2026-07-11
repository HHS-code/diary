# 빌드 리포트 — diary (diary-main-screen)

각 step이 무엇을 했는지 위에서 아래로 읽으면 프로젝트가 자라는 과정이 보인다.

- [완료] **Step 0: storage-todos** — src/storage/diaryStorage.js에 getDateTodos(data, dateKey) -> Todo[] (없으면 []), setDateTodos(data, dateKey, todos) -> DiaryData (data 비변경, diary/movie 필드 보존, spread 병합) 추가. Todo = { id, text, done } — id 생성은 호출자(TodoWidget, step4) 책임. loadAllDiaryData/saveAllDiaryData는 미수정, 그대로 재사용. 프로젝트에 테스트 러너 없음 — Node 스크립트로 수동 검증(AC 그대로). 다음 step이 import할 산출 파일: src/storage/diaryStorage.js. ([리포트](step0-storage-todos.md))
- [대기] **Step 1: xp-calendar** — 
- [대기] **Step 2: analog-clock-widget** — 
- [대기] **Step 3: weather-widget** — 
- [대기] **Step 4: todo-widget** — 
- [대기] **Step 5: main-screen-wiring** — 
