# Step 2: window-component

## 읽을 파일
- `docs/plan/desktop-ui/architecture.md` — "컴포넌트 책임 > Window", "상태 흐름 (App.jsx)" 섹션
- `src/App.jsx` (step1 완료 후의 얇은 wrapper 형태 — 구조 참고용, 이 step에서는 수정하지 않음)

## 작업

`src/components/Window/Window.jsx`를 만든다. **순수 레이아웃 컴포넌트** — children의 내용(다이어리 관련 로직)에 대해 아무것도 몰라야 한다.

시그니처 (내부 구현은 자유):
```
Window({ title, onClose, children })
```

렌더링 내용:
- 화면 전체를 덮는 오버레이 레이어 — 배경(뒤에 있는 Desktop) 클릭을 막는 모달 역할. 반투명/어둡게 처리하거나 단순 불투명 배경으로 해도 됨.
- 오버레이 위, 화면 중앙에 고정 크기 창 박스 (예: viewport의 85~90% 폭/높이). 리사이즈 불가, 항상 이 크기·중앙 위치 고정.
- 창 박스 상단에 타이틀바: `title` prop 텍스트 표시 + 닫기(X) 버튼. 닫기 버튼 클릭 시 `onClose()` 호출.
- 창 박스 본문 영역에 `children`을 렌더링 (스크롤이 필요하면 본문에 `overflow: auto`).
- 드래그로 창을 이동시키는 기능은 만들지 않는다.

이 step에서는 아직 `App.jsx`나 다른 컴포넌트에서 `Window`를 사용하지 않는다 (step7에서 연결).

## AC
- `npm run build`가 에러 없이 성공한다.
- `npm run lint`가 에러 없이 통과한다.

## 금지
- 드래그 이동, 리사이즈, 최소화/최대화 기능을 만들지 마라. 이유: PRD Out-of-scope에 명시.
- `Window.jsx` 안에서 `DiaryApp`이나 다른 기능 컴포넌트를 import하지 마라. 이유: Window는 무엇을 감싸는지 몰라야 하는 순수 틀 컴포넌트 (UI/기능 분리 원칙).
