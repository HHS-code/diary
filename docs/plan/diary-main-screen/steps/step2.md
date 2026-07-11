# Step 2: analog-clock-widget

## 읽을 파일
- `docs/plan/diary-main-screen/PRD.md` — "3. 아날로그 시계"
- `docs/plan/diary-main-screen/architecture.md` — "AnalogClockWidget.jsx (신규)"
- `src/components/Clock/Clock.jsx` (참고용 — 1초 갱신 패턴만 참고. 이 파일은 Taskbar 전용이며 건드리지 않는다)

## 작업

`src/components/AnalogClockWidget/AnalogClockWidget.jsx`를 새로 만든다.

- props 없음.
- 내부 state로 현재 시각(`Date`)을 가지고, `Clock.jsx`와 동일한 방식(`useEffect` + `setInterval(1000)`)으로 1초마다 갱신한다.
- SVG로 시계 원판(원 + 눈금 또는 숫자 없이 단순 원판도 가능, 재량)과 시침·분침·초침을 렌더링한다.
  - 각 바늘의 회전각은 현재 시각의 시/분/초 값으로 계산한다(시침은 분 값도 반영해 부드럽게 움직이도록 계산, 재량).
- 레트로(XP) 느낌의 테두리/그림자를 카드 스타일로 감싼다(다른 위젯과 톤을 맞출 수 있게 재량 — 정확한 픽셀 매칭은 요구되지 않는다).
- 인라인 스타일로 구현한다.

`Clock.jsx`는 참고만 하고 수정하지 않는다 — 이 컴포넌트는 `Clock.jsx`를 import하거나 재사용하지 않는, 완전히 독립된 신규 컴포넌트다.

## AC
- `npm run lint`가 에러 없이 통과한다.
- 임시로 아무 화면에 `<AnalogClockWidget />`를 렌더링해 브라우저에서 확인한다(확인 후 커밋에 임시 코드를 남기지 않는다): 시침/분침/초침이 있는 원형 시계가 보이고, 몇 초 기다리면 초침이 실제 시간에 맞춰 움직인다.

## 금지
- `Clock.jsx`를 수정하거나 이 컴포넌트에서 import하지 마라. 이유: Taskbar 전용 디지털 시계와 완전히 독립된 별개 컴포넌트로 합의됨.
- `DiaryApp.jsx`를 수정하지 마라. 이유: 화면 연결은 step 5의 범위.
- 알람, 타이머, 시간대 변경 등 PRD에 없는 기능을 추가하지 마라. 이유: 범위는 "현재 시각을 보여주는 아날로그 시계"로 한정.
