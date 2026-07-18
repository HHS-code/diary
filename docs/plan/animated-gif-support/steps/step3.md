# Step 3: gif-placement-integration

## 읽을 파일
- docs/plan/animated-gif-support/PRD.md (섹션 4 "등록 경로 통합")
- docs/plan/animated-gif-support/ADR.md (ADR-5)
- docs/plan/animated-gif-support/architecture.md (섹션 4 "등록 경로 통합")
- src/hooks/canvasAssetPlacement.js (전체 — 현재 `addImageAssetToCanvas` 구현)
- src/hooks/canvasAssetPlacement.test.js (전체 — 기존 테스트가 쓰는 jsdom/fake-indexeddb 우회 패턴을 신규 테스트에도 동일하게 적용할 것)
- src/components/ImageUploadButton/ImageUploadButton.jsx (전체 — 현재 base64 FileReader 구현)
- src/fabric/AnimatedGif.js (step 1 산출물)
- src/fabric/gifFrameDecoder.js (step 0 산출물)
- src/storage/assetStorage.js (`saveAsset`, `createAssetObjectURL` 시그니처)

## 작업

### 공용 GIF 판별/배치 헬퍼

캔버스에 이미지를 배치하는 두 지점(`canvasAssetPlacement.js`, `ImageUploadButton.jsx`)이 동일한 GIF 판별 로직을 쓰도록, `src/fabric/gifFrameDecoder.js` 또는 새 파일(예: `src/fabric/placeImageOrGif.js`)에 공용 함수를 만든다:

- 시그니처 예: `createImageOrAnimatedGifObject({ blob, assetId, mimeType }) -> Promise<FabricImage | AnimatedGif>`.
- `mimeType`(또는 blob.type)이 `image/gif`가 아니면 기존 `FabricImage.fromURL(createAssetObjectURL(blob))`로 정지 이미지를 반환한다.
- `image/gif`이면 `decodeGifFrames(blob)`을 호출해 `frames.length === 1`이면 정지 이미지 경로(위와 동일), `frames.length >= 2`이면 `new AnimatedGif(frames[0], { assetId, frames, frameDelays: delays })`를 반환한다.
- 이 함수는 스케일 다운(`scaleToFit`)이나 캔버스 중앙 배치, `canvas.add()` 호출은 하지 않는다 — 오브젝트를 만들어 반환하기만 한다. 배치 로직은 호출부(`canvasAssetPlacement.js`, `ImageUploadButton.jsx`)에 남긴다(기존 두 파일의 스케일 다운 코드가 동일하니 중복이지만, 이 step 범위에서는 그 중복 제거를 강제하지 않는다 — 필요하면 자연스럽게 정리해도 되지만 필수 작업은 아니다).

### canvasAssetPlacement.js 수정

- `addImageAssetToCanvas(canvas, asset)`이 `FabricImage.fromURL(objectUrl)` 대신 위 공용 함수로 오브젝트를 얻도록 바꾼다. `asset.blob`의 MIME 타입으로 GIF 여부를 판별한다(`asset` 객체에 `mimeType` 필드가 있는지 `assetStorage.js`의 `AssetRecord` 형태를 확인하고, 없으면 `asset.blob.type`을 사용).
- 스케일 다운·중앙 배치·`assetId` 설정·`canvas.add()`/`setActiveObject()`/`renderAll()` 로직은 오브젝트 타입(FabricImage든 AnimatedGif든)과 무관하게 기존과 동일하게 동작해야 한다(둘 다 `FabricImage`의 서브클래스이므로 `img.scale()`, `img.getScaledWidth()` 등 기존 API가 그대로 먹는다).

### ImageUploadButton.jsx 전환 (ADR-5)

- `handleFileChange`의 `FileReader.readAsDataURL` 경로를 제거하고, `assetStorage.saveAsset({ type: 'image', filename: file.name, mimeType: file.type, blob: file })`로 저장한 뒤 반환된 `id`와 `file`을 이용해 위 공용 함수로 오브젝트를 만들어 캔버스에 추가하도록 바꾼다.
- `addImageToCanvas`가 만드는 오브젝트에도 `assetId: id`를 설정한다(현재 `canvasAssetPlacement.js`의 `addImageAssetToCanvas`와 동일하게).
- 이 변경은 GIF 여부와 무관하게 이 버튼으로 올리는 **모든** 이미지에 적용된다(ADR-5) — 기존에 이 버튼으로 올린 이미지가 base64로 Fabric JSON에 박히던 것이, 이제는 IndexedDB 참조(`assetId`)로 바뀐다.

## AC
- `npm run lint && npm run build && npm run test` 통과. 신규/수정 테스트:
  - `canvasAssetPlacement.test.js`에 케이스 추가: `asset.blob`이 애니메이션 GIF(2프레임 이상, 테스트용 `decodeGifFrames`를 모킹하거나 실제 작은 GIF 픽스처 사용)일 때 캔버스에 추가된 오브젝트가 `AnimatedGif`의 인스턴스인지, 정지 이미지(PNG 등)일 때는 기존처럼 `FabricImage`(정확히는 `AnimatedGif`가 아닌 것)인지.
  - `ImageUploadButton.test.jsx`(기존 파일이 있다면 그 파일, 없다면 신규): 파일 선택 시 `assetStorage.saveAsset`이 호출되고 캔버스에 추가된 오브젝트가 `assetId`를 갖는지. 기존 회귀 테스트(스케일 다운 등)가 계속 통과하는지.
  - jsdom/IndexedDB 관련 테스트 우회 패턴은 `canvasAssetPlacement.test.js`에 이미 있는 `fake-indexeddb/auto` + `node:buffer Blob` + `HTMLImageElement.prototype.src` 즉시 onload 스텁 방식을 그대로 재사용한다.

## 금지
- `canvasAssetPlacement.js`와 `ImageUploadButton.jsx`에 GIF 판별 로직을 각각 따로 작성하지 마라. 이유: architecture.md가 "GIF 판별 및 AnimatedGif 분기는 공용 함수로 공유"를 명시 — 두 곳에서 로직이 갈라지면 한쪽만 고치는 버그가 생기기 쉽다.
- `useCanvasBackground.js`(배경 이미지 경로)를 이 step에서 건드리지 마라. 이유: PRD Out-of-scope — 배경은 계속 정지 이미지로 처리한다.
- `ImageUploadButton.jsx` 전환 시 기존 스케일 다운/중앙 배치 계산식(`Math.min(...)` 비율 유지 로직)을 바꾸지 마라. 이유: 저장 방식만 바꾸는 것이 목적이며, 배치 동작은 회귀 없이 그대로 유지되어야 한다.
