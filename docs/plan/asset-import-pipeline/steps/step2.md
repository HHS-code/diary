# Step 2: asset-import-panel

## 읽을 파일
- docs/plan/asset-import-pipeline/PRD.md (섹션 3)
- docs/plan/asset-import-pipeline/ADR.md (ADR-4)
- docs/plan/asset-import-pipeline/architecture.md (섹션 1 "에셋 등록" 데이터 흐름, 컴포넌트 개요의 useAssetLibrary/AssetImportPanel)
- src/storage/assetStorage.js (step 0 산출물)
- src/components/StickerPalette/StickerPalette.jsx (패널 스타일 참고)
- src/components/CanvasBackgroundControl/CanvasBackgroundControl.jsx (있다면 — 패널 프레임 스타일 참고)
- docs/design.md (버튼/패널 공통 스타일)

## 작업

### useAssetLibrary.js (신규 훅)

`src/hooks/useAssetLibrary.js`:

- 공개 시그니처: `useAssetLibrary() -> { images: AssetRecord[], fonts: AssetRecord[], registerImage(file) -> Promise<string>, registerFont(file) -> Promise<string>, refresh() -> Promise<void> }`.
- 내부적으로 `assetStorage.listAssets('image')`/`listAssets('font')`를 호출해 상태로 유지하고, `registerImage`/`registerFont`가 `assetStorage.saveAsset(...)` 호출 후 상태를 갱신(refresh)한다.
- `registerFont`는 파일명(확장자 제외)을 `fontFamily` 기본값으로 사용한다. 동일 이름이 이미 `fonts` 목록에 있으면 뒤에 짧은 id suffix(예: 앞 4자리)를 붙여 충돌을 피한다.
- 확장자 분류 규칙(공용 함수로 분리해 재사용 가능하게 함): `.jpg/.jpeg/.png/.gif/.webp` → image, `.ttf/.otf/.woff/.woff2` → font, 그 외 → 무시(등록하지 않고 조용히 skip).

### AssetImportPanel.jsx (신규 UI)

`src/components/AssetImportPanel/AssetImportPanel.jsx`:

- props: `{ library: ReturnType<typeof useAssetLibrary> }` (훅 결과를 그대로 주입받는 형태 — 컴포넌트 내부에서 훅을 새로 호출하지 않는다. 여러 UI 지점에서 같은 라이브러리 상태를 공유하기 위함).
- 지원 입력 UI 3종을 하나의 패널에 담는다:
  1. 파일 선택 버튼: `<input type="file" multiple accept="image/*,.ttf,.otf,.woff,.woff2">`.
  2. 폴더 선택 버튼: `<input type="file" webkitdirectory multiple>` — 선택된 `FileList` 전체를 순회하며 확장자 분류 규칙으로 image/font 각각 등록, 그 외는 무시.
  3. 드래그앤드롭 영역: 이 패널 컨테이너에 `onDragOver`(preventDefault) / `onDrop`(preventDefault, `e.dataTransfer.files` 순회 후 동일 분류 규칙 적용) 핸들러를 건다. 드롭 시 폴더 자체를 드롭하는 경우(`webkitGetAsEntry` 재귀 탐색)까지는 다루지 않아도 된다 — 파일 여러 개를 직접 드롭하는 경우만 지원(폴더 재귀 탐색은 위 2번 폴더 선택 버튼으로 충분).
- 등록된 이미지/폰트 목록을 간단히 나열(파일명 정도)해 사용자가 뭐가 등록됐는지 확인할 수 있게 한다 — 목록 항목의 삭제/관리 UI는 넣지 않는다(PRD out-of-scope).
- 스타일은 `StickerPalette`/`CanvasBackgroundControl` 패널 프레임과 `docs/design.md` 버튼 공통 스펙을 재사용한다.

## AC
- `npm run lint && npm run build && npm run test` 통과. 신규 테스트:
  - `useAssetLibrary.test.js`: `registerImage`/`registerFont` 호출 후 각각 `images`/`fonts` 상태에 반영되는지.
  - `AssetImportPanel.test.jsx`: 파일 input의 `onChange`(jsdom에서 FileList를 흉내낸 이벤트)로 이미지 1개 + 폰트 1개를 동시에 넣었을 때 두 종류로 정확히 분류되어 등록 함수가 각각 1번씩 호출되는지, 확장자가 다른(예: `.txt`) 파일은 무시되는지.

## 금지
- 드롭/붙여넣기 대상 범위를 캔버스나 화면 전체로 넓히지 마라. 이유: ADR-4 결정 — 이 패널 컨테이너 영역에만 한정.
- 폴더 드롭 시 하위 폴더 재귀 탐색(`webkitGetAsEntry`/`FileSystemDirectoryEntry`)을 구현하지 마라. 이유: 범위를 좁혀 이 step의 복잡도를 낮추기 위한 합의 — 폴더 일괄 추가는 폴더 "선택" 버튼(`webkitdirectory`)으로 충분히 커버된다.
- 등록된 에셋의 삭제/편집 UI를 만들지 마라. 이유: PRD Out-of-scope.
