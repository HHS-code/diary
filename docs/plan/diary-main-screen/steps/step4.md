# Step 4: todo-widget

## 읽을 파일
- `docs/plan/diary-main-screen/PRD.md` — "1. 할 일 체크리스트"
- `docs/plan/diary-main-screen/architecture.md` — "TodoWidget.jsx (신규)", "데이터 모델"
- `src/storage/diaryStorage.js` (step 0에서 추가된 `getDateTodos`/`setDateTodos` — 이 step에서 처음 실제로 연결)

## 작업

`src/components/TodoWidget/TodoWidget.jsx`를 새로 만든다.

- props: `{ selectedDate }` — `'YYYY-MM-DD'` 문자열.
- `loadAllDiaryData()` → `getDateTodos(data, selectedDate)`로 목록을 읽어 렌더링한다.
- 항목 추가: 텍스트 입력 + 추가 버튼(또는 Enter). 추가 시 `id: crypto.randomUUID()`, `done: false`로 새 항목을 만들어 목록에 추가하고, `loadAllDiaryData()` → `setDateTodos(...)` → `saveAllDiaryData(...)`로 즉시 저장한다.
- 완료 체크: 체크박스 클릭 시 해당 항목의 `done`을 토글하고 즉시 저장한다. `done: true`인 항목은 취소선 등으로 시각 구분한다.
- 삭제: 각 항목에 삭제 버튼을 두고, 클릭 시 목록에서 제거 후 즉시 저장한다.
- `selectedDate` prop이 바뀌면(다른 날짜 선택) 그 날짜의 todos를 다시 읽어와 목록을 교체한다.
- 레트로(XP) 카드 스타일로 감싼다. 인라인 스타일로 구현한다.

localStorage에는 이 컴포넌트가 직접 접근하지 않는다 — 반드시 `storage/diaryStorage.js`의 함수를 통해서만 읽고 쓴다.

## AC
- `npm run lint`가 에러 없이 통과한다.
- 임시로 아무 화면에 `<TodoWidget selectedDate="2026-07-11" />`를 렌더링해 브라우저에서 확인한다(확인 후 커밋에 임시 코드를 남기지 않는다): 항목을 추가하면 목록에 나타나고, 새로고침해도 유지된다. 체크하면 완료 표시되고, 삭제하면 목록에서 사라지며 새로고침해도 사라진 채로 유지된다. `selectedDate`를 다른 값으로 바꿔 렌더링하면 그 날짜의 (비어있는) 목록이 보인다.

## 금지
- localStorage를 `diaryStorage.js`를 거치지 않고 직접 `localStorage.getItem`/`setItem`으로 접근하지 마라. 이유: 기존 프로젝트 관례(storage 계층 경유)를 유지해야 한다.
- 우선순위, 마감일, 반복 일정, 알림 등 PRD에 없는 필드/기능을 추가하지 마라. 이유: PRD Out-of-scope에 "추가/체크/삭제만"으로 명시됨.
- `DiaryApp.jsx`를 수정하지 마라. 이유: 화면 연결은 step 5의 범위.
