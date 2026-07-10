# Step 6: desktop-screen

## 읽을 파일
- `docs/plan/desktop-ui/PRD.md` — "Desktop 화면" 항목
- `docs/plan/desktop-ui/architecture.md` — "컴포넌트 책임 > Desktop"
- `src/assets/icons.js` — step0 산출물. `wallpaper`, `diaryIcon` export 확인

## 작업

`src/components/Desktop/Desktop.jsx`를 만든다.

시그니처:
```
Desktop({ onOpenDiary })
```

- `icons.js`의 `wallpaper` 이미지를 뷰포트 전체(100vw x 100vh 또는 그에 준하는 크기)를 채우는 배경으로 렌더링한다.
- 화면 좌상단 영역에 `diaryIcon` 이미지 + "diary" 텍스트를 세로로 배치한 아이콘 하나를 렌더링한다 (레퍼런스 목업 `reference/main.png` 참고).
- 이 아이콘을 클릭하면 `onOpenDiary()`를 호출한다 — 그 외의 로직은 갖지 않는다.
- 다른 아이콘이 추가될 가능성을 대비한 배열/맵 구조는 만들지 않는다. diary 아이콘 하나만 JSX에 하드코딩한다.

## AC
- `npm run build`가 에러 없이 성공한다.
- `npm run lint`가 에러 없이 통과한다.

## 금지
- 아이콘 목록을 배열로 만들고 `.map()`으로 렌더링하는 확장 구조를 만들지 마라. 이유: PRD Out-of-scope — 지금은 diary 아이콘 하나만 필요하며, 향후 확장을 미리 설계하지 않는다(YAGNI, CLAUDE.md "단순함 우선").
- `Window`, `DiaryApp` 등 다른 기능/틀 컴포넌트를 이 안에서 import하지 마라. 이유: Desktop은 아이콘 클릭을 부모(App)에게 알리기만 하는 순수 컴포넌트다 — 창을 여는 실제 상태는 App.jsx가 갖는다.
