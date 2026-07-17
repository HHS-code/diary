# Step 4: canvas-background-integration

## 읽을 파일
- docs/plan/asset-import-pipeline/PRD.md (섹션 5)
- docs/plan/asset-import-pipeline/architecture.md (섹션 3 "배경 이미지 통합")
- src/hooks/useCanvasBackground.js (수정 대상)
- src/hooks/useAssetLibrary.js (step 2 산출물)
- src/storage/assetStorage.js (step 0 산출물, createAssetObjectURL 포함)
- src/hooks/useFabricCanvas.js / 캔버스 JSON 로드 지점 (step 1에서 이미 assetId 역참조 로직이 추가돼 있음 — 재사용, 재구현 금지)
- src/components/CanvasBackgroundControl/CanvasBackgroundControl.jsx (있다면 — 배경 이미지 선택 UI)

## 작업

### useCanvasBackground.js 수정

- 기존 `setImage(file)`는 `FileReader.readAsDataURL` → base64 → `FabricImage.fromURL(dataUrl)` 방식이었다. 이를 다음으로 교체한다:
  1. `assetStorage.saveAsset({ type: 'image', filename: file.name, mimeType: file.type, blob: file })`로 저장, id 발급받음.
  2. `assetStorage.getAsset(id)`로 다시 조회(또는 저장 시 받은 blob을 그대로 재사용)해 `createAssetObjectURL(blob)`로 objectURL 생성.
  3. 그 objectURL로 기존과 동일하게 `FabricImage.fromURL(objectURL)` 호출.
  4. 생성된 Fabric 이미지 오브젝트에 기존 `isBackground: true`에 더해 `assetId: id`를 함께 설정한다.
- `addAdjustableBackgroundImage` 내부의 스케일 계산(`coverScale`), `sendObjectToBack`, `setActiveObject` 등 기존 배치 로직은 그대로 유지한다 — 데이터 출처(objectURL vs dataURL)만 바뀐다.
- `setColor`, `lockBackground`, `clearBackground`는 이미지와 무관한 로직이므로 변경하지 않는다.

### 캔버스 저장/로드 경로 확인 (재구현 아님)

- step 1에서 캔버스 JSON 로드 시 `assetId`가 있으면 `assetStorage.getAsset`으로 objectURL을 재구성하는 로직을 이미 넣었다. 이 step에서는 그 경로가 배경 이미지 오브젝트(`isBackground: true` && `assetId` 있음)에도 동일하게 동작하는지 확인만 한다 — 별도 분기를 새로 만들지 않는다.
- 캔버스 저장(`toJSON`) 시 `assetId` 필드가 함께 직렬화되어야 한다. Fabric의 커스텀 프로퍼티 직렬화 설정(`toObject`에 커스텀 필드 포함시키는 방식, 이미 `isBackground`가 직렬화되고 있다면 동일한 메커니즘을 따름)을 확인하고, 안 되면 그 메커니즘에 `assetId`를 추가한다.

## AC
- `npm run lint && npm run build && npm run test` 통과. 신규/수정 테스트:
  - `useCanvasBackground.test.js`: `setImage(file)` 호출 후 캔버스에 추가된 오브젝트가 `isBackground: true`와 `assetId`(문자열)를 모두 갖는지, `assetStorage.getAsset(assetId)`로 원본 파일 내용을 되찾을 수 있는지 검증.
  - 캔버스를 저장(`toJSON`) 후 다시 로드했을 때 배경 이미지가 정상적으로 복원되는지(round-trip) 검증하는 테스트 1개 추가.

## 금지
- `isBackground`, `lockBackground`, `clearBackground` 등 기존 배경 오브젝트 취급 로직의 동작을 바꾸지 마라. 이유: PRD 원칙 — "UI/데이터 출처 변경이 기존 기능 동작을 바꿔서는 안 된다"에 준함(이번엔 저장 방식 변경이지만 동일 원칙 적용).
- 배경 이미지에 필터/편집 기능을 추가하지 마라. 이유: PRD Out-of-scope.
