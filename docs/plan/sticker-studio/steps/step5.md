# Step 5: sticker-outline

## 읽을 파일
- docs/plan/sticker-studio/PRD.md (섹션 5 "흰색 테두리")
- docs/plan/sticker-studio/ADR.md (ADR-6)
- docs/plan/sticker-studio/architecture.md (섹션 6 "흰색 테두리")
- src/components/StickerStudio/StickerStudio.jsx (step 2 산출물 — 사이드바 구조)

## 작업

### stickerOutline.js (신규)

`src/fabric/stickerOutline.js`:

- 공개 시그니처: `createOutlinedSticker(sourceCanvasElement: HTMLCanvasElement, thicknessPx: number) -> HTMLCanvasElement`.
- 구현 절차(architecture.md 섹션 6 그대로):
  1. `sourceCanvasElement`(알파 채널이 있는 이미지)를 오프스크린 캔버스에 그린다.
  2. `globalCompositeOperation = 'source-in'` 방식으로 불투명 영역을 흰색으로 단색화한 실루엣 캔버스를 만든다(흰 사각형을 이 컴포지트 모드로 덮어 그리면 알파 모양은 유지한 채 색만 흰색이 된다).
  3. 이 실루엣을 `thicknessPx`에 비례한 방향 수(예: 8~32 사이, 두께가 클수록 방향 수를 늘림 — 각도 스텝이 촘촘할수록 매끈함)로 반지름 `thicknessPx`만큼 회전시키며 `drawImage`를 반복 호출해, 확장된 흰색 테두리 캔버스를 만든다.
  4. 그 위에 원본 `sourceCanvasElement`를 다시 그려 최종 합성(테두리 바깥쪽 + 원본 이미지)한다.
  5. 최종 `HTMLCanvasElement`를 반환한다.
- `thicknessPx`가 0이거나 음수면 원본을 그대로 복사한 캔버스를 반환한다(테두리 없음 상태와 동일하게 취급).
- 이 함수는 Fabric이나 DOM 상태에 의존하지 않는 순수 함수다 — 입력 캔버스와 숫자만 받아 새 캔버스를 반환한다.

### StickerStudio.jsx 연결

- 사이드바에 "테두리 추가" 버튼과 두께 조절 슬라이더(예: 0~20px)를 추가한다.
- 슬라이더 값이 바뀔 때마다(디바운스 적용 — 예: 100ms) 현재 캔버스를 rasterize한 `HTMLCanvasElement`를 `createOutlinedSticker`에 넘겨 결과를 미리보기 영역(별도 `<canvas>` 엘리먼트 또는 이미지 미리보기)에 표시한다. 메인 편집 캔버스(Fabric)를 직접 덮어쓰지 않는다 — 미리보기는 별도 표시 영역에서 이루어진다(architecture.md: "Fabric 캔버스 렌더 루프와 무관한 별도 오프스크린 처리").
- "적용" 버튼을 누르면 이 미리보기 결과가 최종 저장 대상으로 확정된다 — 이 확정 상태를 다음 step(저장)이 사용할 수 있도록 컴포넌트 상태(예: `outlinedResultRef` 또는 `useState`)로 보관한다. 정확한 보관 방식은 이 step에서 정하고, 다음 step이 그 인터페이스를 그대로 쓴다.
- "테두리 없이 저장" 경로도 유지되어야 한다 — 테두리 기능은 선택 사항이다(PRD: "테두리 추가" 버튼을 누르는 경우에만 적용).

## AC
- `npm run lint && npm run build && npm run test` 통과.
- 신규 테스트 `stickerOutline.test.js`:
  - `thicknessPx: 0`을 넘기면 원본과 동일한 크기의 캔버스를 반환하는지(픽셀 완전 동일까지는 아니어도, 최소 크기와 알파 유무 등 구조적 사실로 검증).
  - `thicknessPx: 10`을 넘기면 반환된 캔버스가 원본보다 불투명 영역이 넓어지는지(예: 원본 이미지의 경계 바로 바깥 픽셀이 테두리 적용 후 불투명해지는지를 `getImageData`로 확인).
  - jsdom에 실제 `<canvas>` 2D 렌더링이 제한적이므로(node-canvas 미설치 시 `drawImage` 등이 실제 픽셀을 그리지 않을 수 있음), 기존 테스트들이 쓰는 `HTMLCanvasElement`/`CanvasRenderingContext2D` 우회·스텁 패턴(`canvasAssetPlacement.test.js`, `useCanvasBackground.test.js` 등)을 참고해 검증 가능한 수준으로 테스트를 설계한다 — 완전한 픽셀 렌더링 검증이 jsdom에서 불가능하면, 함수가 올바른 순서로 `drawImage`/`globalCompositeOperation`을 호출하는지(스파이) 검증하는 것으로 대체해도 된다.

## 금지
- 테두리 생성을 Fabric 캔버스의 매 프레임 렌더 루프 안에서 재계산하지 마라. 이유: ADR-6 — 슬라이더 조작 시 디바운스 후 오프스크린에서 한 번만 계산하는 것이 의도된 성능 전략이다.
- 흰색이 아닌 다른 색을 테두리 색으로 받는 옵션을 추가하지 마라. 이유: PRD Out-of-scope — "흰색 외 다른 색상의 테두리"는 명시적으로 범위 밖이다.
- `createOutlinedSticker`가 `fabric` 모듈을 import하게 만들지 마라. 이유: architecture.md — 이 처리는 순수 Canvas 2D 이미지 처리이며 Fabric 오브젝트 개념과 무관해야 다음 step(저장)에서 어떤 소스(그리기 결과든 누끼 결과든)에도 동일하게 적용할 수 있다.
