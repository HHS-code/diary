# Step 1: youtube-card-object

## 읽을 파일
- docs/plan/youtube-embed/PRD.md (섹션 "2. 카드 모양")
- docs/plan/youtube-embed/architecture.md (섹션 "2. 커스텀 오브젝트")
- src/fabric/AnimatedGif.js (이 프로젝트에서 `FabricImage`를 상속해 커스텀 오브젝트를 만든 유일한 선례 — `static type`/`static customProperties`/`static fromObject`/`classRegistry.setClass` 패턴을 그대로 따른다)
- src/hooks/useFabricCanvas.js (16행 `EXTRA_SERIALIZED_PROPS`, 9행 `LOGICAL_CANVAS = { width: 1600, height: 1000 }` — architecture.md 초안에 이 수치가 다르게 적혀 있다면 이 파일의 실제 값을 따른다)

## 작업

`src/fabric/YoutubeCard.js` (신규):

- `class YoutubeCard extends FabricImage`
- `static type = 'YoutubeCard'`
- `static customProperties = ['videoId']` — JSON 직렬화에는 videoId만 포함한다(PRD 합의 — 썸네일 URL이나 재생 상태는 저장하지 않는다).
- 생성자는 `videoId`를 받아 `https://img.youtube.com/vi/{videoId}/hqdefault.jpg`를 이미지 소스로 로드한다(`FabricImage.fromURL` 또는 동등한 방식 — 이미지 로드는 비동기이므로 정적 팩토리 함수(예: `static async create(videoId, options)`)로 감싸 Promise를 반환하는 형태를 권장한다. 정확한 시그니처는 재량).
- 썸네일 위에 재생 버튼(▶) 표시: Fabric의 `_render` 오버라이드로 원본 이미지를 그린 뒤 반투명 원 + 삼각형(▶)을 얹거나, 별도 오버레이 오브젝트를 Group으로 묶는 방식 중 재량으로 선택한다. 어느 쪽이든 최종적으로 `canvas.add()`에 이 클래스의 인스턴스 하나만 추가하면 되는 형태여야 한다(Group을 쓴다면 Group 자체가 `YoutubeCard` 타입일 필요는 없으나, 저장/복원 시 재생버튼 오버레이도 함께 정상 복원돼야 한다 — 가장 단순한 방법은 `_render` 오버라이드로 이미지 위에 직접 그리는 것).
- 16:9 비율 고정: 크기조절은 허용하되 비율이 깨지지 않게 한다(Fabric의 `lockUniScaling = true` 또는 컨트롤 커스터마이징).
- `static async fromObject(object, options)`: `object.videoId`로 썸네일 URL을 재조립해 인스턴스를 복원한다(`AnimatedGif.fromObject`가 assetId로 IndexedDB를 재조회하는 것과 달리, 여긴 외부 URL 문자열 조립만 하면 되므로 더 단순하다).
- 파일 끝에 `classRegistry.setClass(YoutubeCard)`.

## AC
- `npm run lint && npm run test` 통과.
- 신규 테스트 `src/fabric/YoutubeCard.test.js`:
  - videoId로 인스턴스를 만들면 `type === 'YoutubeCard'`이고 이미지 src에 해당 videoId가 포함되는지.
  - `toObject()` 결과에 `videoId`가 포함되고, 썸네일 URL 전체나 재생 상태 같은 다른 필드는 커스텀 속성으로 남지 않는지(PRD의 "videoId만 저장" 검증).
  - `YoutubeCard.fromObject({ videoId: '...', ... })`로 복원한 인스턴스가 다시 올바른 videoId와 썸네일 src를 갖는지.
  - 16:9 비율 관련 속성(`lockUniScaling` 등 실제로 채택한 방식)이 설정되어 있는지.

## 금지
- 이 step에서 캔버스에 카드를 실제로 추가하는 배치 로직, 붙여넣기 이벤트 처리, `DiaryCanvas.jsx` 수정을 하지 마라. 이유: 이 step은 오브젝트 클래스 정의만 담당한다 — 배치/붙여넣기 연결은 step2의 범위다.
- iframe이나 DOM 오버레이, 재생 로직을 만들지 마라. 이유: 인라인 재생은 step4의 범위이며, 이 step에서 만드는 것은 항상 정지된 썸네일 카드 오브젝트다.
- 재생 상태(`isPlaying` 등)를 `customProperties`에 추가하지 마라. 이유: PRD/architecture 합의에 따라 저장되는 것은 `videoId` 하나뿐이다.
