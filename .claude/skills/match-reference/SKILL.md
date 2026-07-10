---
name: match-reference
description: reference/ 폴더의 스크린샷과 지금 로컬 서버에 떠 있는 실제 화면을 픽셀 단위로 비교해서, 특정 UI 요소(하단바, 버튼 등)의 색상·그라데이션을 눈대중이 아니라 실측값으로 맞춘다. 사용자가 "reference랑 안 닮았다", "색감 맞춰줘", "UI를 참고 이미지대로" 등을 말하면 사용한다.
---

# match-reference

reference 이미지와 실제 렌더링 결과를 눈대중으로 비교하면 왕복이 많고 부정확하다.
대신 두 이미지에서 같은 위치의 픽셀 RGB 값을 직접 뽑아 비교해 오차를 없앤다.

## 전제 조건

- 대상 프로젝트의 dev 서버가 이미 떠 있어야 한다 (예: `localhost:5174`). 안 떠 있으면
  사용자에게 포트를 묻거나 실행 방법을 확인한다.
- Playwright MCP가 연결되어 있어야 한다 (`mcp__playwright__*` 도구). 없으면
  `/mcp` 결과를 확인하고 사용자에게 알린다.

## 절차

1. **대상 요소 확정** — 사용자가 지목한 UI 요소(예: "하단바")가 코드의 어느
   컴포넌트/파일인지 Grep으로 먼저 찾는다.

2. **reference 이미지 확보** — `reference/` 폴더에서 가장 관련성 높은 이미지를
   고른다. 여러 장이면 사용자에게 어떤 걸 기준으로 할지 확인한다.

3. **픽셀 실측 (reference)** — reference 이미지를 브라우저에 `file://` 또는
   로컬 정적 서빙으로 열고, `browser_evaluate`로 canvas에 그린 뒤 대상 좌표의
   `getImageData` RGB를 읽는다. 예:

   ```js
   () => {
     const img = document.querySelector('img');
     const canvas = document.createElement('canvas');
     canvas.width = img.naturalWidth;
     canvas.height = img.naturalHeight;
     const ctx = canvas.getContext('2d');
     ctx.drawImage(img, 0, 0);
     // 상단/중간/하단 등 그라데이션 구간별로 여러 점을 뽑는다
     const points = [[x1, y1], [x2, y2], [x3, y3]];
     return points.map(([x, y]) => ctx.getImageData(x, y, 1, 1).data);
   }
   ```

   그라데이션이면 최소 3개 지점(상단/중간/하단) 이상 뽑아야 방향과 정지점을
   재현할 수 있다.

4. **픽셀 실측 (현재 구현)** — 같은 방식으로 `localhost` 페이지에서 대상
   요소를 스크린샷하거나 `getComputedStyle`로 현재 background 값을 읽는다.

5. **코드 반영** — 실측 RGB를 hex로 변환해 CSS/스타일 객체에 그대로 대입한다.
   추측으로 톤을 조정하지 않는다 — 실측값을 우선한다. 그라데이션 정지점
   비율(%)은 reference 이미지에서 색이 바뀌는 y좌표를 요소 전체 높이로
   나눠 계산한다.

6. **검증 스크린샷** — 반영 후 `browser_navigate`로 새로고침하고
   `browser_take_screenshot`으로 다시 캡처, reference와 나란히 Read로 띄워
   육안 확인 + 3번에서 뽑은 동일 좌표를 재실측해 오차(ΔRGB)를 보고한다.

7. **반복 여부** — 오차가 눈에 띄면 사용자에게 다시 묻지 않고 스스로 재조정을
   1회 더 시도한다. 그래도 안 맞으면 결과를 보여주고 사용자 판단을 구한다.

## 주의

- 아이콘·레이아웃·구조는 사용자가 별도로 요청하지 않는 한 건드리지 않는다.
  이 스킬은 색상/그라데이션 매칭 전용이다.
- 스크린샷 파일은 프로젝트 루트에 쌓이므로 (`.playwright-mcp/`, `*.png`) 작업
  끝나면 임시 파일을 지울지 사용자에게 확인한다 (git 커밋 대상 아님).
- 실측이 불가능한 경우(예: reference가 손그림/저해상도라 경계가 흐릿함)에는
  그 사실을 밝히고 근사치임을 명시한다.
