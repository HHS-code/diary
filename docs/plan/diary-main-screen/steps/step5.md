# Step 5: main-screen-wiring

## 읽을 파일
- `docs/plan/diary-main-screen/PRD.md` — "화면 전환", "성공 기준" 전체
- `docs/plan/diary-main-screen/architecture.md` — "DiaryApp.jsx (수정)", "화면 전환 흐름" 전체
- `src/components/DiaryApp/DiaryApp.jsx` (현재 구조 — Calendar + Tabs + DiaryCanvas가 한 화면에 있음)
- `src/components/XPCalendar/XPCalendar.jsx` (step 1 산출물)
- `src/components/AnalogClockWidget/AnalogClockWidget.jsx` (step 2 산출물)
- `src/components/WeatherWidget/WeatherWidget.jsx` (step 3 산출물)
- `src/components/TodoWidget/TodoWidget.jsx` (step 4 산출물)
- `src/components/Calendar/Calendar.jsx` (삭제 대상)

## 작업

`src/components/DiaryApp/DiaryApp.jsx`를 수정해 메인 화면/편집 화면 전환 구조로 바꾼다.

- 새 state 추가:
  - `screen`: `'main' | 'edit'`, 초기값 `'main'`.
  - `currentYear`, `currentMonth`: 오늘 날짜 기준으로 초기화 (`XPCalendar`에 props로 전달할 부모 소유 state).
- 기존 `selectedDate`, `activeTab`, `refreshKey` 등 state와 로직(저장/조회 관련 함수)은 그대로 유지한다.
- `screen === 'main'`일 때:
  - 좌측에 `XPCalendar`를 렌더링한다. props: `selectedDate`, `currentYear`, `currentMonth`를 전달하고, `onSelectDate`는 `selectedDate`를 갱신한 뒤 `screen`을 `'edit'`으로 바꾸는 핸들러, `onChangeMonth`는 `currentYear`/`currentMonth`를 갱신하는 핸들러를 연결한다.
  - 우측에 `TodoWidget`(`selectedDate` 전달), `WeatherWidget`, `AnalogClockWidget`를 세로로 배치한다.
- `screen === 'edit'`일 때:
  - 기존처럼 `{selectedDate}` 제목(h2) + `Tabs` + `DiaryCanvas`/영화 탭 placeholder를 렌더링한다 (기존 로직 변경 없음).
  - 제목(h2) 왼쪽에 ◀ 버튼을 추가한다. 클릭 시 `screen`을 `'main'`으로 되돌린다 (`selectedDate`, `currentYear`, `currentMonth`는 그대로 유지 — 별도로 초기화하지 않는다).

`src/components/Calendar/Calendar.jsx` 파일과 그 폴더를 삭제한다 (더 이상 어디서도 사용하지 않는 dead code가 되므로).

## AC
- `npm run lint`가 에러 없이 통과한다.
- 브라우저에서 diary 창을 열면 좌측 XP 캘린더 + 우측 위젯 3개(할일/날씨/시계)가 보이는 메인 화면이 뜬다.
- 캘린더에서 아무 날짜나 클릭하면 그 날짜의 편집 화면(탭+캔버스)으로 전환되고, 제목 왼쪽에 ◀ 버튼이 보인다.
- 편집 화면에서 스티커/이미지/텍스트 추가, 자동 저장 등 기존 기능이 그대로 동작한다(회귀 없음).
- ◀ 버튼을 누르면 메인 화면으로 돌아가고, 직전에 보고 있던 월(currentYear/currentMonth)이 그대로 유지된다(다른 달로 이동한 뒤 날짜를 선택하고 돌아왔을 때 처음 그 달이 다시 보이는지로 확인).
- `src/components/Calendar/Calendar.jsx`가 삭제되어 있고, 프로젝트 어디에서도 이를 import하지 않는다.

## 금지
- `DiaryCanvas`, `Tabs`, `storage/diaryStorage.js`의 다이어리/영화 관련 로직을 변경하지 마라. 이유: PRD Out-of-scope — 다이어리 편집 기능 자체는 로직 변경 없음으로 합의됨.
- 새 npm 패키지(라우터 등)를 추가하지 마라. 이유: 화면 전환은 컴포넌트 내부 state로만 처리하기로 합의됨.
- `Window.jsx`, `Taskbar.jsx` 등 `desktop-ui` 범위의 파일을 건드리지 마라. 이유: 이번 작업은 diary 창 내부 화면만 다룬다.
