# Step 3: clock-component

## 읽을 파일
- `docs/plan/desktop-ui/PRD.md` — "실시간 시계" 항목
- `docs/plan/desktop-ui/architecture.md` — "컴포넌트 책임 > Clock"

## 작업

`src/components/Clock/Clock.jsx`를 만든다. Props 없는 순수 표시 컴포넌트:
```
Clock()
```

- `useEffect` 안에서 `setInterval`(1000ms)로 현재 시각을 state에 저장하고, 매 tick마다 `new Date()`로 갱신한다. 언마운트 시 `clearInterval`로 정리한다.
- 표시 형식은 레퍼런스 목업(`reference/main.png`)과 동일하게 두 줄(또는 인접 배치):
  - 시간: `H:MM a.m./p.m.` — 12시간제(0시/12시는 12로 표시), 분은 2자리 0-패딩, `a.m.`/`p.m.`은 소문자+마침표. 예: `8:48 p.m.`, `12:05 a.m.`
  - 날짜: `YYYY-MM-DD`. 예: `2026-07-10`
- 다른 state/props에 의존하지 않는 독립적인 컴포넌트로 만든다 (App의 `isDiaryOpen` 등과 무관하게 항상 동일하게 동작).
- 아직 다른 컴포넌트에서 사용하지 않는다 (step5에서 Taskbar가 연결한다).

## AC
- `npm run build`가 에러 없이 성공한다.
- `npm run lint`가 에러 없이 통과한다.

## 금지
- 날짜/시간 포맷팅 라이브러리(day.js, date-fns, moment 등)를 새로 추가하지 마라. 이유: PRD Out-of-scope "새 npm 패키지 추가 금지" — 내장 `Date` 객체로 충분한 범위.
