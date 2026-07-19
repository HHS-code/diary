# Step 3: youtube-card-persistence

## 읽을 파일
- docs/plan/youtube-embed/PRD.md (섹션 "4. 저장/불러오기", 성공 기준 중 "저장 후 다시 불러오면 카드가 동일하게 복원된다")
- docs/plan/youtube-embed/architecture.md (섹션 "6. 저장/불러오기")
- src/hooks/useFabricCanvas.js (전체, 특히 16행 `EXTRA_SERIALIZED_PROPS`, 28-37행 `resolveObjectAssetReference` — `type === 'AnimatedGif'`를 건너뛰는 기존 예외 처리 패턴)
- src/fabric/YoutubeCard.js (step1 산출물 — `customProperties`, `fromObject`)
- src/components/ExportImportControls/ExportImportControls.jsx (JSON 백업 export/import UI — 이 step이 건드리는 저장 경로가 이 UI를 통해서도 동작하는지 확인용)

## 작업

### `src/hooks/useFabricCanvas.js` 수정

- `resolveObjectAssetReference`(28-37행)의 가드를 확장한다: 현재 `object.type === 'AnimatedGif'`일 때 assetId 치환을 건너뛰는데, `object.type === 'YoutubeCard'`일 때도 마찬가지로 건너뛰도록 조건을 추가한다. 이유(주석으로 남길 것): `YoutubeCard`는 `assetId`가 아니라 `videoId` 기반이라 이 치환 로직 자체가 필요 없고, 잘못 건드리면 `YoutubeCard.fromObject`가 기대하는 원본 필드가 깨질 수 있다.
- `EXTRA_SERIALIZED_PROPS`(16행) 자체는 수정하지 않는다 — `YoutubeCard.customProperties = ['videoId']`가 Fabric의 `toObject(EXTRA_SERIALIZED_PROPS)` 호출 시 이미 자동으로 포함되므로(AnimatedGif도 같은 방식으로 동작 중), 이 배열에 `videoId`를 추가할 필요가 없다는 것을 실제로 테스트로 확인한다.

## AC
- `npm run lint && npm run test` 통과.
- 신규 테스트 (`useFabricCanvas.test.js`에 추가하거나 신규 파일):
  - `YoutubeCard` 인스턴스를 캔버스에 추가하고 `canvas.toObject(EXTRA_SERIALIZED_PROPS)`를 호출하면 결과 JSON의 해당 오브젝트에 `videoId`가 포함되는지.
  - `resolveCanvasAssetReferences`에 `type: 'YoutubeCard', videoId: '...'`인 오브젝트가 포함된 canvasJSON을 넣었을 때, 해당 오브젝트가 `resolveObjectAssetReference`의 assetId 치환을 거치지 않고 그대로 통과하는지(AnimatedGif와 동일하게 건너뛰는지).
  - canvasJSON을 만들어 `loadFromJSON`으로 복원했을 때(`YoutubeCard.fromObject` 경유) 복원된 오브젝트가 `type === 'YoutubeCard'`이고 원래 `videoId`와 일치하는지.
- 수동/Playwright 확인: 개발 서버에서 (1) 유튜브 카드를 캔버스에 추가 → (2) 페이지를 새로고침(또는 JSON export 후 import) → (3) 카드가 동일한 videoId로 복원되고 썸네일이 다시 뜨는지 실제로 확인하고 report에 기록한다.

## 금지
- `EXTRA_SERIALIZED_PROPS` 배열에 `videoId`나 다른 필드를 추가하지 마라. 이유: `static customProperties`가 이미 이 역할을 하며, 두 메커니즘을 동시에 쓰면 중복이고 이유 없는 우회다. AC에서 이걸 실제로 검증한다.
- `AnimatedGif` 관련 기존 분기(`resolveObjectAssetReference`, `gifRenderLoop` 등록/해제 등)의 동작을 변경하지 마라. 이유: 이 step은 `YoutubeCard`에 대한 예외를 "추가"하는 것이지 기존 GIF 처리 로직을 리팩터링하는 것이 아니다.
- 재생 상태(iframe, 재생 중 여부)를 저장하거나 복원하려 하지 마라. 이유: PRD 합의에 따라 저장되는 것은 videoId뿐이며, 재생은 항상 정지 상태로 다시 열린다(인라인 재생 자체는 step4의 범위).
