# Step 6: sticker-save-and-reuse

## 읽을 파일
- docs/plan/sticker-studio/PRD.md (섹션 6 "저장 및 재사용", 성공 기준 전체)
- docs/plan/sticker-studio/ADR.md (ADR-4)
- docs/plan/sticker-studio/architecture.md (섹션 7 "저장", 섹션 8 "내 스티커 목록 / 재편집", 섹션 9 "AssetImportPanel 연동")
- src/components/StickerStudio/StickerStudio.jsx (step 2~5 산출물 — 캔버스, 업로드/크롭, 누끼따기, 테두리 상태)
- src/hooks/useAssetLibrary.js (step 1 산출물 — `stickers`, `registerSticker`)
- src/components/AssetImportPanel/AssetImportPanel.jsx (전체 — 이미지 섹션 렌더링 패턴, `onSelectImage` prop)
- src/components/DiaryCanvas/DiaryCanvas.jsx (`AssetImportPanel`을 어떻게 마운트하고 `onSelectImage`를 `canvasAssetPlacement.addImageAssetToCanvas`에 연결하는지)
- src/hooks/canvasAssetPlacement.js (`addImageAssetToCanvas(canvas, asset)` 시그니처 — 스티커도 이 함수를 그대로 탄다)
- src/storage/assetStorage.js (`getAsset`, `createAssetObjectURL`)

## 작업

### 저장 ("완성" 버튼)

`StickerStudio.jsx`에 "완성" 버튼을 추가한다:

- 흰색 테두리가 적용된 상태(step 5의 확정 결과)가 있으면 그 `HTMLCanvasElement`를, 없으면 현재 Fabric 캔버스를 rasterize한 결과(`fabricCanvas.toCanvasElement()` 또는 동등한 방법)를 저장 대상으로 삼는다.
- `canvasElement.toBlob('image/png')`로 PNG Blob을 얻는다(콜백 기반 API이므로 Promise로 감싸 await한다).
- `useAssetLibrary().registerSticker(blob, filename)`을 호출한다(step 1 산출물). 파일명은 간단한 기본값(예: `sticker-${Date.now()}.png`)을 쓴다 — 사용자 입력 UI는 필요 없다(PRD에 파일명 지정 요구 없음).
- 저장이 끝나면 사용자에게 저장됨을 알리는 간단한 피드백을 표시한다(토스트/알림 UI가 기존에 있으면 그 패턴을 따르고, 없으면 버튼 텍스트를 잠깐 "저장됨"으로 바꾸는 정도의 최소 구현으로 충분하다).
- 이 저장은 항상 새 `assetId`를 발급한다(ADR-4) — "내 스티커"에서 불러와 편집한 경우에도 원본 레코드를 `deleteAsset`하거나 덮어쓰지 않는다. 불러온 스티커의 `assetId`를 추적해 저장 시 재사용하는 로직을 만들지 않는다.

### MyStickersPanel.jsx (신규)

`src/components/StickerStudio/MyStickersPanel.jsx`:

- props: `{ stickers: AssetRecord[], onSelectSticker: (asset) => void }` — `AssetImportPanel`의 이미지 그리드와 동일한 패턴(썸네일 3열 그리드, `createAssetObjectURL`로 objectURL 생성 후 언마운트/목록 변경 시 `revokeObjectURL`로 정리).
- `StickerStudio.jsx` 사이드바에 이 패널을 추가하고, `useAssetLibrary().stickers`와 클릭 핸들러를 연결한다.
- 클릭 시 핸들러(`StickerStudio.jsx`에 구현): `assetStorage.getAsset(id)`로 Blob을 얻고 `createAssetObjectURL`로 objectURL을 만들어 `FabricImage.fromURL(objectURL)`로 현재 캔버스에 로드한다 — 이 시점에 기존 캔버스 오브젝트는 모두 제거하고 이 이미지 하나로 교체한다(크롭과 동일하게 "캔버스를 이 스티커로 다시 시작"하는 개념).

### AssetImportPanel.jsx 연동 (다이어리 캔버스 쪽)

- `AssetImportPanel`이 받는 `library` prop에 이제 `stickers` 필드가 있다(step 1에서 `useAssetLibrary`가 이미 반환하도록 만들어짐). 기존 "이미지" 섹션(`library.images` 그리드)과 동일한 패턴으로 "스티커" 섹션을 추가한다 — 헤더 텍스트만 다르게(예: "스티커 (N)"), 나머지 그리드/썸네일/클릭 로직은 이미지 섹션과 동일한 구조를 반복한다.
- 스티커 항목 클릭 시 기존 `onSelectImage` 콜백을 그대로 재사용한다(별도의 `onSelectSticker` prop을 새로 만들지 않는다 — architecture.md 섹션 9: "스티커도 assetStorage의 Blob이므로 이미지와 동일한 배치 로직을 그대로 탄다"). `DiaryCanvas.jsx`가 이미 `onSelectImage`를 `canvasAssetPlacement.addImageAssetToCanvas`에 연결해두었으므로, 이 step에서 `DiaryCanvas.jsx`를 수정할 필요는 없는지 먼저 확인하고, 필요하다면 최소한으로 연결한다.

## AC
- `npm run lint && npm run build && npm run test` 통과.
- 신규 테스트 `StickerStudio.test.jsx`에 케이스 추가: "완성" 버튼을 누르면 `registerSticker`(모킹)가 PNG Blob과 함께 호출되는지.
- 신규 테스트 `MyStickersPanel.test.jsx`: 스티커 목록이 썸네일로 렌더링되는지, 클릭 시 `onSelectSticker`가 해당 asset과 함께 호출되는지.
- 기존 `AssetImportPanel.test.jsx`에 케이스 추가: `library.stickers`가 있을 때 "스티커" 섹션이 렌더링되고 개수가 표시되는지, 클릭 시 `onSelectImage`가 해당 스티커 asset과 함께 호출되는지(이미지 섹션과 동일한 검증 패턴 반복).
- 통합 확인(가능한 범위에서 테스트로): 스티커 스튜디오에서 저장한 스티커가 `assetStorage`에 `type: 'sticker'`로 남아 `AssetImportPanel`의 `library.stickers`로 조회되는지 — `useAssetLibrary` 단위 테스트 수준에서 이미 커버되면 별도 통합 테스트를 새로 만들지 않아도 된다(과설계 방지).

## 금지
- "내 스티커"에서 불러온 스티커를 편집 후 저장할 때 원본 `assetId`를 재사용하거나 `deleteAsset`으로 원본을 지우지 마라. 이유: ADR-4 — "다른 이름으로 저장"이 이번 phase의 명시적 결정이며, 사용자가 실수로 원본을 잃는 상황이 생기면 안 된다.
- `AssetImportPanel.jsx`에 스티커 섹션을 추가하면서 기존 이미지/폰트 섹션의 순서, 스타일, 동작을 변경하지 마라. 이유: 기존 다이어리 사용자 경험에 대한 회귀를 만들지 않기 위함 — 이번 변경은 섹션 추가로 한정한다.
- 이 step에서 스티커 삭제/이름변경 UI를 만들지 마라. 이유: PRD Out-of-scope — 저장·재편집(다른 이름으로 저장)까지만 이번 phase 범위다.
