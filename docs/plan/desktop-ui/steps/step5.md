# Step 5: taskbar

## 읽을 파일
- `docs/plan/desktop-ui/architecture.md` — "컴포넌트 책임 > Taskbar", "상태 흐름 (App.jsx)"
- `src/components/PowerButton/PowerButton.jsx` — step4 산출물 (props 없음, 그대로 렌더링만 하면 됨)
- `src/components/Clock/Clock.jsx` — step3 산출물 (props 없음, 그대로 렌더링만 하면 됨)

## 작업

`src/components/Taskbar/Taskbar.jsx`를 만든다. Props 없음:
```
Taskbar()
```

- 화면 하단에 고정되는 전체 폭 바를 렌더링한다 (예: `position: fixed; bottom: 0; left: 0; right: 0`, 레퍼런스 목업의 파랑/보라 계열 바 느낌).
- 바 내부 좌측에 `<PowerButton />`, 우측에 `<Clock />`을 배치한다 (flex 레이아웃 등으로 좌우 정렬).
- 이 컴포넌트는 배치(레이아웃)만 담당한다 — 자체 상태나 로직을 갖지 않는다.
- 아직 `App.jsx`에서 사용하지 않는다 (step7에서 연결한다).

## AC
- `npm run build`가 에러 없이 성공한다.
- `npm run lint`가 에러 없이 통과한다.

## 금지
- `PowerButton`이나 `Clock`의 내부 로직(state, 이벤트 핸들러 등)을 이 컴포넌트 안으로 복제하거나 옮기지 마라. 이유: 각 컴포넌트의 책임 분리를 유지한다 — Taskbar는 배치만.
