# Step 2: ai-correction-tool

## 읽을 파일
- docs/plan/ai-background-removal/PRD.md (섹션 2 "AI 보정 도구", 성공 기준)
- docs/plan/ai-background-removal/ADR.md (ADR-3)
- docs/plan/ai-background-removal/architecture.md (섹션 2 "AI 보정 (복원/삭제)")
- src/components/StickerStudio/StickerStudio.jsx (step 1 산출물 — "AI 배경제거" 버튼, `originalBeforeAiRemovalRef`(또는 동등한 이름)에 보관된 원본)
- src/hooks/usePaintTools.js (전체 — `'lasso'` 도구가 어떻게 추가되어 있는지, `buildBrush`/`applyToolToCanvas`/`path:created` 처리 패턴. 동일 패턴으로 `'ai-correction'`을 추가한다)
- src/fabric/stickerCutout.js (전체 — `previewLassoCutout`의 `util.sendObjectToPlane` 좌표 변환, `commitLassoCutout`의 rasterize·교체 패턴. 이 step의 `stickerAiCorrection.js`가 동일한 방식을 재사용한다)
- src/components/PaintToolbox/PaintToolbox.jsx (도구 버튼 UI — 새 도구 버튼 추가 위치 참고)

## 작업

### usePaintTools.js에 'ai-correction' 도구 추가

`sticker-studio`의 `'lasso'` 도구와 동일한 패턴으로 추가한다:

- `buildBrush`에 `tool === 'ai-correction'` 분기 추가 — `PencilBrush` 기반, `'lasso'`와 시각적으로 구분되는 스타일(예: 다른 색상의 점선, `'lasso'`가 파란 점선이면 이쪽은 다른 색으로).
- `path:created` 처리에서 `'ai-correction'` 도구로 그린 Path도 `'lasso'`와 동일하게 그림 획으로 박제하지 않고(`isFreeDrawing`/`erasable` 태그 없음) 처리한다 — 다만 `'lasso'`처럼 즉시 `canvas.remove(path)`하지 않고, "마지막으로 그려진 보정 영역"으로 컴포넌트가 참조할 수 있는 형태로 남긴다(정확한 보관 방식은 `StickerStudio.jsx`에서 상태로 관리 — usePaintTools 내부에서 자동 처리하지 않아도 된다. `sticker-studio`의 `path:created` 구독 패턴(`StickerStudio.jsx`가 직접 캔버스 이벤트를 구독하는 방식)을 그대로 따른다).

### stickerAiCorrection.js (신규)

`src/fabric/stickerAiCorrection.js`:

- `restoreRegion(currentCanvasElement: HTMLCanvasElement, originalCanvasElement: HTMLCanvasElement, regionPath) -> HTMLCanvasElement` — `regionPath`를 이용해 `originalCanvasElement`에서 해당 영역만 추출해 `currentCanvasElement` 위에 덮어 그린 새 캔버스를 반환한다(원본 픽셀 복구).
- `eraseRegion(currentCanvasElement: HTMLCanvasElement, regionPath) -> HTMLCanvasElement` — `regionPath` 영역을 `currentCanvasElement`에서 투명화(`globalCompositeOperation = 'destination-out'`)한 새 캔버스를 반환한다.
- 좌표 변환은 `stickerCutout.js`가 쓰는 `util.sendObjectToPlane` 패턴을 재사용해, `regionPath`를 대상 캔버스의 좌표계로 정렬한다.
- 두 함수 모두 순수 함수에 가깝게 만든다(Fabric 오브젝트를 직접 캔버스에 추가/제거하지 않고, 결과 캔버스만 반환) — 캔버스 반영은 호출부(`StickerStudio.jsx`)가 담당한다.

### StickerStudio.jsx 연결

- "AI 보정" 도구를 선택하면, 이전 step에서 보관해둔 `originalBeforeAiRemovalRef.current`가 없을 경우(AI 배경제거를 아직 한 번도 안 한 상태) "복원" 버튼을 비활성화한다("삭제"는 원본 없이도 동작 가능하므로 활성화 유지).
- 영역을 그린 뒤 "복원"/"삭제" 버튼 클릭 시 `stickerAiCorrection.js`의 해당 함수를 호출하고, 결과를 새 `FabricImage`로 만들어 `stickerCutout.js`의 `commitLassoCutout`과 동일한 방식(원래 위치/assetId 유지)으로 캔버스의 대상 이미지를 교체한다.
- 이 보정 과정은 여러 번 반복 가능해야 한다(그리고→적용→다시 그리고→적용 …).

## AC
- `npm run lint && npm run build && npm run test` 통과.
- 신규 테스트 `stickerAiCorrection.test.js`: `restoreRegion` 호출 후 해당 영역이 원본 픽셀로 복구되는지(alpha 값 또는 색상 비교), `eraseRegion` 호출 후 해당 영역이 투명해지는지 — jsdom 캔버스 렌더링 제약이 있으면 `sticker-outline` step이 썼던 스텁/스파이 검증 패턴(호출 순서·컴포지트 모드 확인)으로 대체 가능.
- 신규 테스트: `usePaintTools`에서 `tool`을 `'ai-correction'`으로 설정했을 때 `'lasso'`와 다른 스타일의 브러시가 적용되는지, 그림 획이 영구히 남지 않는지.
- 신규 테스트: `StickerStudio.jsx`에서 AI 배경제거를 한 번도 하지 않은 상태로 "AI 보정" 도구를 선택하면 "복원" 버튼이 비활성화되는지.

## 금지
- `'ai-correction'` 도구를 기존 `'lasso'` 도구의 옵션(모드 전환)으로 합치지 마라. 이유: ADR-3 — 완전히 별개의 새 도구로 추가하는 것이 명시적 결정이며, 기존 누끼따기 도구(`stickerCutout.js`)의 동작을 전혀 건드리지 않아야 한다.
- "복원" 기능을 원본 보관(`originalBeforeAiRemovalRef`) 없이 구현하려 하지 마라(예: 마스크를 반전시켜 추정하는 방식 등). 이유: architecture.md가 명시한 대로 "AI 배경제거 직전의 원본"을 그대로 참조해야 정확한 복원이 가능하다 — 정확도가 떨어지는 추정 방식으로 대체하면 안 된다.
- 이 step에서 `stickerOutline.js`(흰색 테두리)나 저장(`assetLibrary.registerSticker`) 로직을 수정하지 마라. 이유: 두 기능 모두 이미 완성되어 있고, AI 배경제거/보정을 거친 이미지도 기존 흐름을 그대로 타도록 설계되어 있어(architecture.md "변경하지 않는 것") 추가 연결 작업이 필요 없다.
