# Step 5: calendar-hover-button

## 읽을 파일
- docs/plan/diary-editor-ux-overhaul/PRD.md (섹션 5 + "원칙")
- docs/plan/diary-editor-ux-overhaul/architecture.md (섹션 6)
- src/components/XPCalendar/XPCalendar.jsx (수정 대상)
- docs/design.md (버튼 스타일)

## 작업

### XPCalendar.jsx (UI)
- 날짜 셀에 hover 상태를 추가한다: `useState`로 `hoveredDateKey`를 관리하고 각 셀 `onMouseEnter`/`onMouseLeave`에서 갱신.
- hover된 셀 위에 작은 "작성" 버튼을 오버레이로 표시한다 (셀 `position: relative` + 버튼 `position: absolute`, 셀 하단 중앙 등).
- 이 버튼의 `onClick`은 `onSelectDate(dateKey)`를 호출하되, 이벤트 버블링으로 셀 자체 onClick이 중복 실행되지 않도록 `e.stopPropagation()` 처리.
- 날짜 셀 자체 클릭의 기존 동작(`onSelectDate` 호출)은 그대로 유지.
- 버튼 스타일은 design.md 공통 버튼 스펙 축소판 (작은 크기, 파란 강조 허용 — 헤더바 그라디언트 색 재사용 가능).
- 캘린더의 월 이동/날짜 계산 로직(buildCalendarDays, formatDateKey, moveToPrevMonth 등)은 변경하지 않는다.

## AC
- `npm run lint` && `npm run build` && `npm run test` 통과

## 금지
- 캘린더 날짜 계산/월 이동 로직을 수정하지 마라. 이유: UI만 추가하는 step이다.
- 셀 클릭 기존 동작을 제거하지 마라. 이유: 호버 버튼은 추가 진입점이지 대체가 아니다 (합의됨).
