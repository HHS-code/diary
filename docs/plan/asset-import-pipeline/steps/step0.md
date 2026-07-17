# Step 0: asset-storage

## 읽을 파일
- docs/plan/asset-import-pipeline/PRD.md (섹션 1)
- docs/plan/asset-import-pipeline/ADR.md (ADR-1)
- docs/plan/asset-import-pipeline/architecture.md (섹션 2 "IndexedDB 스키마")
- src/storage/diaryStorage.js (기존 저장 모듈 — 스타일 참고용, 수정 대상 아님)

## 작업

### assetStorage.js (신규)

`src/storage/assetStorage.js`에 IndexedDB 기반 이미지/폰트 Blob 저장소를 만든다.

- DB명 `"diary-assets"`, object store명 `"assets"`, keyPath `"id"`.
- 레코드 형태: `{ id: string, type: "image" | "font", filename: string, mimeType: string, fontFamily?: string, blob: Blob, createdAt: number }`.
- 공개 함수 시그니처:
  - `saveAsset({ type, filename, mimeType, blob, fontFamily }) -> Promise<string>` — 내부에서 id(uuid, `crypto.randomUUID()` 사용)를 발급해 저장하고 id를 반환한다.
  - `getAsset(id) -> Promise<AssetRecord | null>` — 없으면 null.
  - `listAssets(type) -> Promise<AssetRecord[]>` — `type`으로 필터링, `createdAt` 오름차순.
  - `deleteAsset(id) -> Promise<void>` — 이번 phase의 UI에서는 쓰이지 않지만 스토리지 계층 완결성을 위해 구현한다 (PRD out-of-scope는 "삭제 UI"이지, 저장 계층의 delete 함수 자체가 아니다).
- IndexedDB 열기/버전 처리, 트랜잭션 처리는 내부 헬퍼로 캡슐화하고 위 5개 함수 외에는 export하지 않는다.
- 브라우저 네이티브 `indexedDB` API를 직접 사용한다(`idb` 등 외부 라이브러리 도입 여부는 이 step에서 판단해 결정해도 되지만, 도입한다면 `package.json`에 정식 추가하고 이유를 리포트에 남긴다).

### objectURL 헬퍼

- 같은 파일에 `createAssetObjectURL(blob) -> string`(`URL.createObjectURL` 래퍼)을 추가한다. 이후 step들이 이 함수를 통해서만 objectURL을 만들도록 하기 위함 — 직접 `URL.createObjectURL`을 호출하는 코드가 여러 곳에 흩어지지 않게 한다.

### vitest 단위 테스트 (필수, 구현보다 먼저 작성)

`src/storage/assetStorage.test.js`:
- `saveAsset`으로 이미지 하나 저장 후 `getAsset(id)`로 다시 읽으면 blob/filename/mimeType이 일치하는지.
- `listAssets('image')`가 저장한 이미지만 반환하고 `listAssets('font')`는 빈 배열을 반환하는지 (타입 필터링 검증).
- `deleteAsset(id)` 후 `getAsset(id)`가 null을 반환하는지.
- 테스트 환경(jsdom)에서 IndexedDB가 기본 제공되지 않을 수 있다 — 필요하면 `fake-indexeddb` 같은 테스트 전용 polyfill을 devDependency로 추가해도 된다(프로덕션 코드에는 영향 없음).

## AC
- `npm run lint && npm run build && npm run test` 통과 (신규 테스트 포함)

## 금지
- `diaryStorage.js`를 수정하지 마라. 이유: 이번 step은 별도의 새 저장소를 만드는 것이지 기존 다이어리 텍스트/캔버스 메타 저장 방식을 바꾸는 게 아니다.
- 이미지 압축·리사이즈 로직을 넣지 마라. 이유: PRD Out-of-scope("이미지 압축/리사이즈... 원본 그대로 저장").
- 에셋 목록/삭제 UI를 만들지 마라. 이유: 이번 step은 저장 계층뿐이고 UI는 이후 step(asset-import-panel 등) 범위다.
