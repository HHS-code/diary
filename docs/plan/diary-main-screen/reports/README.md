# 빌드 리포트 — diary (diary-main-screen)

각 step이 무엇을 했는지 위에서 아래로 읽으면 프로젝트가 자라는 과정이 보인다.

- [완료] **Step 0: storage-todos** — src/storage/diaryStorage.js에 getDateTodos(data, dateKey) -> Todo[] (없으면 []), setDateTodos(data, dateKey, todos) -> DiaryData (data 비변경, diary/movie 필드 보존, spread 병합) 추가. Todo = { id, text, done } — id 생성은 호출자(TodoWidget, step4) 책임. loadAllDiaryData/saveAllDiaryData는 미수정, 그대로 재사용. 프로젝트에 테스트 러너 없음 — Node 스크립트로 수동 검증(AC 그대로). 다음 step이 import할 산출 파일: src/storage/diaryStorage.js. ([리포트](step0-storage-todos.md))
- [완료] **Step 1: xp-calendar** — src/components/XPCalendar/XPCalendar.jsx 신규 생성: export function XPCalendar({ selectedDate, onSelectDate, currentYear, currentMonth, onChangeMonth }). 연/월 state는 이 컴포넌트가 갖지 않고 부모에게서 props로만 받아 표시 — ◀▶ 클릭 시 계산만 해서 onChangeMonth(year, month) 호출. 오늘=노란 배경(#ffff00), 선택된 날짜(오늘 아님)=파란 2px 테두리, buildCalendarDays/formatDateKey는 Calendar.jsx와 동일 로직으로 파일 내부에 재구현(공유 안 함). Calendar.jsx는 삭제하지 않음(step 5 범위). DiaryApp.jsx는 아직 연결 안 함(step 5 범위). 다음 step이 import할 산출 파일: src/components/XPCalendar/XPCalendar.jsx. ([리포트](step1-xp-calendar.md))
- [대기] **Step 2: analog-clock-widget** — 
- [대기] **Step 3: weather-widget** — 
- [대기] **Step 4: todo-widget** — 
- [대기] **Step 5: main-screen-wiring** — 
