# 빌드 리포트 — diary (asset-import-pipeline)

각 step이 무엇을 했는지 위에서 아래로 읽으면 프로젝트가 자라는 과정이 보인다.

- [완료] **Step 0: asset-storage** — src/storage/assetStorage.js: saveAsset({type,filename,mimeType,blob,fontFamily?}) -> Promise<string id>, getAsset(id) -> Promise<AssetRecord|null>, listAssets(type) -> Promise<AssetRecord[]> (createdAt asc), deleteAsset(id) -> Promise<void>, createAssetObjectURL(blob) -> string. IndexedDB "diary-assets"/store "assets"/keyPath "id", 외부 라이브러리(idb) 없이 네이티브 indexedDB 직접 사용. 트랜잭션마다 connection을 열고 oncomplete/onerror에서 반드시 db.close() — 안 닫으면 다음 deleteDatabase/open이 블로킹됨(테스트에서 실제로 걸림). 테스트는 devDependency fake-indexeddb(6.2.5)로 jsdom에 IndexedDB polyfill; jsdom Blob과 Node 내장 structuredClone 간 비호환으로 테스트에서만 node:buffer의 Blob을 사용(프로덕션 코드/실브라우저는 영향 없음). 다음 step(asset-migration)은 이 5개 함수만 import해서 쓰면 됨. ([리포트](step0-asset-storage.md))
- [완료] **Step 1: asset-migration** — src/storage/assetMigration.js: runAssetMigration() -> Promise<void>. localStorage['diary-asset-migration-done']==='true'면 즉시 반환(멱등). diaryStorage.loadAllDiaryData()의 모든 dateKey×{diary,movie}.canvasJSON.objects를 순회, src가 'data:'로 시작하는 오브젝트만 fetch(dataUrl)->blob->assetStorage.saveAsset({type:'image',...})로 이관 후 src 제거+assetId 추가, saveAllDiaryData로 재저장. 오브젝트 단위 실패는 원본 유지하고 계속 진행(부분 성공, 롤백 없음). src/hooks/useFabricCanvas.js에 resolveCanvasAssetReferences(canvasJSON) -> Promise<object> 추가 export — loadFromJSON 직전에 objects[].assetId를 assetStorage.getAsset+createAssetObjectURL로 src에 역참조 채움(assetId 없거나 조회 실패 시 원본 그대로 통과). App.jsx 최상위 useEffect(fire-and-forget)에서 runAssetMigration() 호출. 테스트에서 fetch/Blob이 만드는 jsdom Blob은 fake-indexeddb structuredClone과 비호환이라(step0과 동일 이슈) assetMigration.test.js는 vi.stubGlobal('fetch', ...)로 node:buffer Blob을 반환하도록 테스트에서만 우회 — 프로덕션 fetch 호출 자체는 스펙 그대로. ([리포트](step1-asset-migration.md))
- [대기] **Step 2: asset-import-panel** — 
- [대기] **Step 3: font-registry** — 
- [대기] **Step 4: canvas-background-integration** — 
- [대기] **Step 5: clipboard-paste-priority** — 
