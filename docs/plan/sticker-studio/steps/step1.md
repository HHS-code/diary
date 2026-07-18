# Step 1: sticker-asset-type

## 읽을 파일
- docs/plan/sticker-studio/PRD.md (섹션 6 "저장 및 재사용")
- docs/plan/sticker-studio/ADR.md (ADR-3, ADR-4)
- docs/plan/sticker-studio/architecture.md (섹션 9 "AssetImportPanel 연동")
- src/storage/assetStorage.js (전체 — `AssetRecord` JSDoc 타입, `saveAsset`/`listAssets` 시그니처)
- src/hooks/useAssetLibrary.js (전체 — `images`/`fonts` 상태 관리 패턴, `classifyAssetType`)
- src/storage/assetStorage.test.js, src/hooks/useAssetLibrary.test.js (기존 테스트 패턴 참고)

## 작업

### assetStorage.js 타입 확장

`src/storage/assetStorage.js`의 `AssetRecord` JSDoc 유니온을 `"image" | "font"`에서 `"image" | "font" | "sticker"`로 넓힌다. `saveAsset`/`listAssets`의 JSDoc 파라미터 타입도 동일하게 갱신한다. 함수 구현 자체(`saveAsset`, `getAsset`, `listAssets`, `deleteAsset`, `createAssetObjectURL`)는 `type` 문자열을 그대로 저장/필터링하는 범용 로직이라 코드 변경이 필요 없을 가능성이 높다 — 실제로 `'sticker'` 타입 레코드를 넣고 빼는 테스트로 그 사실을 확인한다.

### useAssetLibrary.js 확장

`src/hooks/useAssetLibrary.js`의 `useAssetLibrary()` 반환값에 `stickers: AssetRecord[]`와 `registerSticker(blob, filename) -> Promise<string>`을 추가한다:

- `stickers` 상태는 `images`/`fonts`와 동일한 패턴으로 `refresh()` 안에서 `listAssets('sticker')`를 호출해 채운다(`Promise.all`에 세 번째 호출 추가).
- `registerSticker`는 `registerImage`/`registerFont`와 달리 `File` 객체가 아니라 이미 만들어진 `Blob`과 파일명을 받는다(스티커 스튜디오가 캔버스를 `toBlob()`으로 export한 결과를 그대로 넘기는 흐름이기 때문 — architecture.md 섹션 7 참고). 시그니처 예: `registerSticker(blob: Blob, filename: string) -> Promise<string>`. 내부적으로 `saveAsset({ type: 'sticker', filename, mimeType: blob.type || 'image/png', blob })` 호출 후 `refresh()`.
- `classifyAssetType(filename)`(확장자 기반 image/font 분류 함수)은 이 step에서 건드리지 않는다 — 스티커는 사용자가 파일을 "선택"해서 분류되는 게 아니라 스튜디오가 명시적으로 `registerSticker`를 호출하는 것이므로 확장자 분류 로직과 무관하다.

## AC
- `npm run lint && npm run build && npm run test` 통과.
- 신규 테스트 `assetStorage.test.js`에 케이스 추가: `saveAsset({ type: 'sticker', ... })`로 저장한 레코드가 `listAssets('sticker')`로 조회되고, `listAssets('image')`/`listAssets('font')` 결과에는 섞이지 않는지.
- 신규 테스트 `useAssetLibrary.test.js`에 케이스 추가: `registerSticker(blob, 'my-sticker.png')` 호출 후 `stickers` 상태에 반영되는지, `images`/`fonts` 상태는 영향받지 않는지.
- 기존 `useAssetLibrary.test.js`/`assetStorage.test.js`의 image/font 관련 테스트가 그대로 통과하는지(회귀 없음).

## 금지
- `classifyAssetType`이 `'sticker'`를 반환하도록 확장자 분류 로직을 바꾸지 마라. 이유: PRD — 스티커는 `AssetImportPanel`의 파일 선택/드래그드롭 경로로 사용자가 직접 "등록"하는 대상이 아니라, 스티커 스튜디오가 완성 시점에 프로그램적으로 저장하는 대상이다. 두 등록 경로를 섞으면 사용자가 임의 PNG 파일을 스티커로 착각해 올릴 수 있어 ADR-3의 "새 타입 추가"라는 좁은 범위를 벗어난다.
- `AssetImportPanel.jsx`를 이 step에서 수정하지 마라. 이유: 스티커 목록을 UI에 노출하는 작업은 마지막 step(sticker-save-and-reuse)의 범위다(architecture.md 섹션 9). 이 step은 저장 계층까지만 다룬다.
- IndexedDB 스키마(`DB_VERSION`, object store 이름/keyPath)를 변경하지 마라. 이유: ADR-3 — 기존 스토어에 `type` 값만 추가하는 것으로 충분하며, 버전을 올리면 불필요한 마이그레이션 이슈가 생긴다.
