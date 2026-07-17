# Step 1: asset-migration

## 읽을 파일
- docs/plan/asset-import-pipeline/PRD.md (섹션 2)
- docs/plan/asset-import-pipeline/ADR.md (ADR-2)
- docs/plan/asset-import-pipeline/architecture.md (섹션 4 "마이그레이션")
- src/storage/assetStorage.js (step 0 산출물 — saveAsset 시그니처 확인)
- src/storage/diaryStorage.js (loadAllDiaryData/saveAllDiaryData, 수정 대상 아님 — 그대로 재사용)
- src/hooks/useFabricCanvas.js (캔버스 JSON 로드 지점 확인 — src 필드가 어디서 Fabric에 먹여지는지)

## 작업

### assetMigration.js (신규)

`src/storage/assetMigration.js`:

- 공개 함수: `runAssetMigration() -> Promise<void>`.
- 동작 순서:
  1. `localStorage.getItem('diary-asset-migration-done')`이 `'true'`면 즉시 반환(아무 것도 안 함).
  2. `diaryStorage.loadAllDiaryData()`로 전체 데이터를 로드.
  3. 모든 `dateKey`의 `diary`/`movie` 탭 `canvasJSON.objects` 배열을 순회하며, `src`가 `"data:"`로 시작하는 오브젝트(base64 이미지)를 찾는다.
  4. 찾은 각 오브젝트에 대해: `fetch(dataUrl).then(r => r.blob())`으로 Blob 변환 → MIME 타입은 blob.type 사용, filename은 `migrated-<dateKey>-<index>`처럼 합성 → `assetStorage.saveAsset({ type: 'image', filename, mimeType: blob.type, blob })` 호출해 새 id 발급.
  5. 해당 오브젝트에서 `src` 필드를 제거하고 `assetId: <새 id>`를 추가한다. 오브젝트의 다른 필드(left/top/scaleX/scaleY/isBackground 등)는 손대지 않는다.
  6. 개별 이미지 변환이 실패(예외 발생)하면 그 오브젝트는 원본 그대로 두고 건너뛴 뒤 나머지를 계속 처리한다 — 전체를 중단하거나 롤백하지 않는다.
  7. 순회가 끝나면 갱신된 전체 데이터를 `diaryStorage.saveAllDiaryData(data)`로 재저장.
  8. `localStorage.setItem('diary-asset-migration-done', 'true')`.
- 이 함수는 앱 부팅 시 한 번 호출되어야 한다. 호출 위치는 `src/main.jsx` 또는 `src/App.jsx` 최상위 중 이 레포의 진입점 구조에 맞는 곳으로 고르되, 렌더링을 막지 않도록 `useEffect` 또는 모듈 최상위에서 fire-and-forget으로 실행한다(마이그레이션이 끝나기 전에도 앱은 기존 base64 데이터를 그대로 렌더링할 수 있으므로 화면이 비어 보이지 않는다).

### 캔버스 로드 경로에 assetId 역참조 추가

- Fabric 캔버스가 저장된 `canvasJSON`을 불러와 렌더링하는 지점(`useFabricCanvas.js` 또는 그 호출부)에서, 오브젝트에 `assetId`가 있으면 로드 직전에 `assetStorage.getAsset(assetId)`로 Blob을 가져와 `createAssetObjectURL(blob)`로 objectURL을 만들어 `src` 필드에 채워 넣은 뒤 Fabric의 `loadFromJSON`(또는 동등 API)에 넘긴다.
- `assetId`가 없는 오브젝트(마이그레이션 전 신규 데이터, 또는 이미지가 아닌 오브젝트)는 기존 로직 그대로 통과시킨다.
- 이 역참조 로직은 마이그레이션 여부와 무관하게 항상 동작해야 한다 — step 4(canvas-background-integration)에서 신규로 저장되는 이미지도 동일하게 `assetId` 방식을 쓰기 때문이다.

## AC
- `npm run lint && npm run build && npm run test` 통과. 마이그레이션 로직에 대한 vitest 테스트 포함:
  - base64 `src`를 가진 오브젝트 1개가 포함된 가짜 `canvasJSON`으로 `runAssetMigration()`을 실행하면, 실행 후 `diaryStorage`에 저장된 데이터의 해당 오브젝트가 `src` 없이 `assetId`를 갖는지, `assetStorage.getAsset(assetId)`로 원본과 동일한 내용을 조회할 수 있는지 검증.
  - 이미 `'diary-asset-migration-done'`이 설정된 경우 재실행 시 데이터가 변경되지 않는지(멱등성) 검증.

## 금지
- 마이그레이션 실패 시 전체 데이터를 롤백하거나 예외를 앱 상위로 전파하지 마라. 이유: architecture "부분 성공 허용" 원칙 — 사용자의 나머지 데이터가 화면에서 사라지면 안 된다.
- base64 저장 경로(레거시 호환 분기)를 영구적으로 남겨두지 마라. 이유: ADR-2 결정 — 마이그레이션 이후에는 이 phase의 신규 저장 경로(step 4에서 교체)가 base64를 만들지 않는다. 단, 이 step 자체는 "기존 base64를 읽어서 변환"하는 것이 본연의 역할이므로 마이그레이션 함수 내부에서 base64를 다루는 것은 금지 대상이 아니다.
