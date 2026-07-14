# Step 4: xp-paint-ui-match (manual — 러너 대상 아님)

> 이 step은 headless 러너가 실행하지 않는다 (index.json status: "manual").
> 로컬 dev 서버 + 브라우저 스크린샷 실측 비교가 필요해 대화 세션에서 진행한다.

## 읽을 파일
- `reference/ms-paint-on-xp-v0-lilxt1d7tbf11.webp` — XP 그림판 레퍼런스 스크린샷
- `src/components/PaintToolbox/PaintToolbox.jsx` — step 2 산출물
- `.claude/skills/match-reference/SKILL.md`

## 작업
- `match-reference` 스킬로 PaintToolbox(도구 격자·굵기 옵션·색상 팔레트)를 레퍼런스와
  픽셀 실측 비교하고 색상·그라데이션·보더·눌림 효과를 실측값으로 맞춘다.
- 종료 조건: "마음에 들 때까지"가 아니라 **레퍼런스와 실측값이 일치할 때까지** (coplan OQ-9 합의).

## AC
- match-reference 실측 비교 결과 일치 + `npm run lint` / `npm run test` / `npm run build` 통과 유지.

## 금지
- `usePaintTools.js`, `useCanvasHistory.js` 등 로직 파일 수정 금지. 이유: UI/로직 분리 — 이 step은 스타일만.
