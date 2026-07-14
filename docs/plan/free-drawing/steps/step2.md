# Step 2: paint-toolbox-ui

## 읽을 파일
- `src/hooks/usePaintTools.js` — step 0·1 산출물 (이 UI가 연결할 훅)
- `src/components/StickerPalette/StickerPalette.jsx` — 사이드바 패널 프레임 스타일(240px)의 원본
- `src/components/ObjectToolbar/ObjectToolbar.jsx` + `ObjectToolbar.test.jsx` — 순수 UI 컴포넌트·테스트 패턴 (createRoot+act, aria-label로 버튼 찾기)
- `src/components/DiaryCanvas/DiaryCanvas.jsx` — 사이드바 배치 구조
- `docs/design.md` — XP Luna 색·보더·버튼 공통 스펙

## 작업

### 1. `src/components/PaintToolbox/PaintToolbox.jsx` (신규 — 순수 UI)

- props: `{ tool, color, width, onToolChange, onColorChange, onWidthChange }` — fabric 미import (architecture.md 모듈 경계).
- 레이아웃 (위→아래, StickerPalette 프레임 스타일 재사용, 폭 240px 사이드바용):
  1. **도구 격자**: 2열 아이콘 버튼 5개 — 선택(화살표)/연필/브러시/에어브러시/지우개.
     현재 `tool`인 버튼은 눌린(sunken) 상태로 구분 표시. 각 버튼에 `aria-label`(한글 도구명)과 `title`.
     아이콘은 기존 관례대로 `react-icons/md`에서 선택.
  2. **굵기 옵션**: 현재 도구의 굵기 선택 UI (XP 그림판의 도구 아래 옵션 박스 대응).
     select 도구이거나 pencil(굵기 1 고정)일 때는 비활성.
  3. **색상 팔레트**: XP 그림판식 색상 격자(2행 × 14열 = 28색, XP 그림판 기본 팔레트 색) + 현재 색 표시 칸.
     지우개/선택 도구일 때 색 선택은 비활성이어도 되고 활성 유지해도 됨(재량) — 단 동작이 일관되게.
- 스타일 1차: `docs/design.md`의 기존 스펙(패널 프레임·버튼·보더)을 재사용하고, 새 색상값 발명은 XP 그림판 28색 팔레트에 한정. **정밀 실측 매칭은 step 4(match-reference)에서 하므로 여기서 픽셀 단위에 매달리지 마라.**

### 2. `src/components/DiaryCanvas/DiaryCanvas.jsx` (수정)

- `usePaintTools(fabricCanvasRef)` 호출 추가, `PaintToolbox`를 **사이드바 최상단(StickerPalette 위)**에 배치 (architecture.md 합의 — XP 그림판에서 도구 팔레트가 가장 먼저 보이는 것과 대응).
- 그 외 기존 렌더링·훅 호출 무수정.

### 3. 테스트 (TDD)

`src/components/PaintToolbox/PaintToolbox.test.jsx` (신규): 최소 —
- 도구 버튼 5개가 렌더링되고, 클릭 시 `onToolChange`가 해당 도구명으로 호출된다
- 현재 tool 버튼이 눌린 상태로 구분된다 (aria-pressed 또는 스타일 속성으로 검증)
- 색상 칸 클릭 시 `onColorChange` 호출, 굵기 변경 시 `onWidthChange` 호출
- pencil일 때 굵기 UI가 비활성이다

## AC
```
npm run lint
npm run test
npm run build
```
셋 다 exit code 0. 기존 테스트 전부 유지 + 신규 테스트 통과.

## 금지
- `PaintToolbox.jsx`에서 fabric을 import하지 마라. 이유: UI/로직 분리 원칙 — UI 수정이 그리기 동작에 영향 주지 않게.
- `usePaintTools.js`의 공개 시그니처를 바꾸지 마라. 이유: step 0·1에서 테스트까지 확정된 계약. UI 사정으로 훅을 바꾸고 싶으면 blocked로 멈추고 사람을 불러라.
- undo/redo UI(버튼)를 만들지 마라. 이유: step 3의 범위 — 단축키만으로 제공 예정.
- 기존 사이드바 컴포넌트들(StickerPalette 등)의 내부를 수정하지 마라. 이유: 수술적 변경 원칙.
