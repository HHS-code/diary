# Step 0: storage-todos

## 읽을 파일
- `docs/plan/diary-main-screen/PRD.md` — "데이터 저장"
- `docs/plan/diary-main-screen/architecture.md` — "데이터 모델", "storage/diaryStorage.js 확장"
- `src/storage/diaryStorage.js`

## 작업

`src/storage/diaryStorage.js`에 날짜별 할 일(todos) 목록을 다루는 함수 두 개를 추가한다. 기존 `getDatePageData`/`setDatePageData`와 같은 파일, 같은 스타일(JSDoc, 인자 비변경, `?? []` 형태의 기본값)로 작성한다.

- `getDateTodos(data, dateKey)`
  - 해당 날짜에 `todos`가 없으면 빈 배열을 반환한다.
- `setDateTodos(data, dateKey, todos)`
  - 인자 `data`를 직접 변경하지 않고, 해당 날짜의 `todos` 필드만 갱신한 새 객체를 반환한다.
  - 같은 날짜의 기존 `diary`/`movie` 필드는 그대로 보존한다 (spread로 병합).

Todo 항목의 형태는 `{ id: string, text: string, done: boolean }`이다 (id 생성은 이 step의 책임이 아니다 — 호출하는 쪽인 TodoWidget에서 생성한다. 이 step은 저장/조회 함수만 만든다).

`loadAllDiaryData`/`saveAllDiaryData`는 그대로 재사용한다 (수정하지 않는다).

## AC
- `npm run lint`가 에러 없이 통과한다.
- Node REPL 또는 임시 스크립트로 다음을 눈으로 확인한다: `setDateTodos({}, '2026-07-11', [{id:'a', text:'test', done:false}])`가 `{ '2026-07-11': { todos: [...] } }` 형태를 반환하고, 같은 날짜에 이미 `diary` 필드가 있는 객체에 적용해도 그 `diary` 필드가 사라지지 않는다.

## 금지
- `DiaryApp.jsx`, `Calendar.jsx` 등 다른 컴포넌트 파일을 건드리지 마라. 이유: 이 step은 storage 계층만 다룬다 — 다음 step들이 이 함수를 가져다 쓴다.
- Todo 항목에 PRD/architecture에 없는 필드(우선순위, 마감일, 반복 등)를 추가하지 마라. 이유: PRD의 Out-of-scope에 명시된 범위 밖 기능.
