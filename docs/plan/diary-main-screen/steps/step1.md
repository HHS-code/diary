# Step 1: xp-calendar

## 읽을 파일
- `docs/plan/diary-main-screen/PRD.md` — "XP 스타일 캘린더 (좌측)"
- `docs/plan/diary-main-screen/architecture.md` — "XPCalendar.jsx (신규)"
- `src/components/Calendar/Calendar.jsx` (현재 있는 사각 그리드 캘린더 — 대체 대상, 아직 삭제하지 않는다)
- `reference/화면 캡처 2026-07-11 103520.png` (있다면 — Windows XP 데스크톱 캘린더 가젯 레퍼런스: 상단 파란 헤더에 "월 - 연도", 요일 행, 카드형 날짜 셀, 오늘 날짜 노란 배경)

## 작업

`src/components/XPCalendar/XPCalendar.jsx`를 새로 만든다.

- props: `{ selectedDate, onSelectDate, currentYear, currentMonth, onChangeMonth }`
  - `selectedDate`: `'YYYY-MM-DD'` 문자열
  - `onSelectDate(dateKey)`: 날짜 셀 클릭 시 호출
  - `currentYear`, `currentMonth`(0-11): 이 컴포넌트가 보여줄 월 — 부모(`DiaryApp`)가 소유한 state를 그대로 받는다. 이 컴포넌트 내부에 별도의 연/월 state를 두지 않는다.
  - `onChangeMonth(year, month)`: ◀▶ 클릭 시 호출해 부모의 연/월 state를 갱신시킨다.
- 레이아웃: 상단에 파란 배경 헤더 바 — 가운데 "YYYY년 M월" 텍스트, 양옆에 ◀▶ 버튼. 그 아래 요일 행(일~토), 그 아래 날짜 카드 그리드(7열).
- 날짜 셀 배경/테두리 규칙:
  - 오늘 날짜 = 노란색 배경.
  - 선택된 날짜(`selectedDate`)이면서 오늘이 아닌 경우 = 파란색 테두리 박스.
  - 그 외 = 기본(흰색/투명 배경, 얇은 테두리).
- 날짜 셀 클릭 시 `onSelectDate('YYYY-MM-DD')` 호출.
- 월의 첫 요일 앞/마지막 주 뒤의 빈 칸은 기존 `Calendar.jsx`처럼 빈 셀로 채운다(`buildCalendarDays` 로직 참고해 동일 방식으로 재구현 가능).
- 인라인 스타일 객체로 구현한다 (프로젝트 전반 방식, CSS 파일이나 styled-components 등 새 방식 도입하지 않는다).

이 step에서는 `DiaryApp.jsx`에 연결하지 않는다 (연결은 step 5). `Calendar.jsx`도 아직 삭제하지 않는다 (삭제는 step 5).

## AC
- `npm run lint`가 에러 없이 통과한다.
- 임시로 `App.jsx`나 별도 진입점에서 `<XPCalendar selectedDate="2026-07-11" onSelectDate={console.log} currentYear={2026} currentMonth={6} onChangeMonth={console.log} />`를 렌더링해 브라우저에서 확인한다 (확인 후 임시 코드는 되돌리거나, 이 step의 커밋에 남기지 않는다): 파란 헤더 + ◀▶ 버튼, 요일 행, 날짜 그리드가 레퍼런스 이미지와 유사한 레이아웃으로 보이고, 오늘 날짜가 노란색으로 표시되며, ◀▶ 클릭 시 `onChangeMonth`가 올바른 연/월 인자로 호출된다(콘솔 로그로 확인).

## 금지
- `Calendar.jsx`를 이 step에서 삭제하거나 수정하지 마라. 이유: 삭제는 step 5(main-screen-wiring)의 범위 — 다른 step이 아직 참고할 수 있다.
- `DiaryApp.jsx`를 수정하지 마라. 이유: 화면 연결은 step 5의 범위.
- 연/월 드롭다운 점프, 헤더 텍스트 클릭 모달 등 PRD Out-of-scope에 없는 월 이동 방식을 추가하지 마라. 이유: PRD에 "◀▶ 버튼으로만 이동"으로 명시됨.
