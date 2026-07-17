# 빌드 리포트 — diary (asset-import-pipeline)

각 step이 무엇을 했는지 위에서 아래로 읽으면 프로젝트가 자라는 과정이 보인다.

- [완료] **Step 0: asset-storage** — src/storage/assetStorage.js: saveAsset({type,filename,mimeType,blob,fontFamily?}) -> Promise<string id>, getAsset(id) -> Promise<AssetRecord|null>, listAssets(type) -> Promise<AssetRecord[]> (createdAt asc), deleteAsset(id) -> Promise<void>, createAssetObjectURL(blob) -> string. IndexedDB "diary-assets"/store "assets"/keyPath "id", 외부 라이브러리(idb) 없이 네이티브 indexedDB 직접 사용. 트랜잭션마다 connection을 열고 oncomplete/onerror에서 반드시 db.close() — 안 닫으면 다음 deleteDatabase/open이 블로킹됨(테스트에서 실제로 걸림). 테스트는 devDependency fake-indexeddb(6.2.5)로 jsdom에 IndexedDB polyfill; jsdom Blob과 Node 내장 structuredClone 간 비호환으로 테스트에서만 node:buffer의 Blob을 사용(프로덕션 코드/실브라우저는 영향 없음). 다음 step(asset-migration)은 이 5개 함수만 import해서 쓰면 됨. ([리포트](step0-asset-storage.md))
- [대기] **Step 1: asset-migration** — 
- [대기] **Step 2: asset-import-panel** — 
- [대기] **Step 3: font-registry** — 
- [대기] **Step 4: canvas-background-integration** — 
- [대기] **Step 5: clipboard-paste-priority** — 
