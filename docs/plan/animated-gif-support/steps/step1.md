# Step 1: animated-gif-object

## 읽을 파일
- docs/plan/animated-gif-support/PRD.md (섹션 2 "캔버스 애니메이션 오브젝트")
- docs/plan/animated-gif-support/ADR.md (ADR-2, ADR-3)
- docs/plan/animated-gif-support/architecture.md (섹션 2 "AnimatedGif 오브젝트")
- src/fabric/gifFrameDecoder.js (step 0 산출물 — `decodeGifFrames` 시그니처만 참고, 이 step에서는 직접 호출하지 않아도 됨. `fromObject`에서만 사용)
- src/storage/assetStorage.js (`getAsset(id) -> Promise<AssetRecord|null>` 시그니처)
- node_modules/fabric의 `FabricImage`, `classRegistry` export 확인 (import 경로: `from 'fabric'`)

## 작업

### AnimatedGif.js (신규)

`src/fabric/AnimatedGif.js`:

- `FabricImage`를 상속하는 클래스 `AnimatedGif`를 만든다. `static type = 'AnimatedGif'`.
- `static customProperties = ['assetId', 'frameDelays', 'currentFrameIndex']` — 이 필드들이 `toObject()`/`toJSON()` 직렬화에 자동 포함되도록 한다(architecture.md 참고, `toObject()` 오버라이드 불필요).
- 생성자: `constructor(element, options)` — `super(element, options)` 호출 후 `this.assetId`, `this.frames`(HTMLCanvasElement 배열, 옵션에 없으면 `[element]`), `this.frameDelays`, `this.currentFrameIndex = options?.currentFrameIndex ?? 0`을 설정한다.
- `advanceFrame()` 메서드: `currentFrameIndex`를 `(currentFrameIndex + 1) % frames.length`로 갱신하고 `this._element = this.frames[this.currentFrameIndex]`로 교체한다. `frames.length`가 1 이하면 아무 것도 하지 않는다(방어적으로 — 이 클래스는 항상 프레임 2개 이상일 때만 쓰이지만, 호출부 실수로 1개가 들어와도 무한分기 없이 안전해야 함).
- `_render`/`render`는 오버라이드하지 않는다 — `FabricImage`의 기존 렌더 로직이 `this._element`를 그대로 사용하므로 프레임 교체만으로 충분하다(architecture.md에 근거 설명 있음).
- `static async fromObject(object, options)`: `object.assetId`로 `assetStorage.getAsset(id)`를 조회하고, 그 `record.blob`을 `gifFrameDecoder.decodeGifFrames(blob)`으로 디코딩해 `frames`/`delays`를 얻은 뒤 `new AnimatedGif(frames[0], { ...object, frames, frameDelays: delays })`를 반환한다. `getAsset`이 `null`을 반환하거나 디코딩이 실패하면(원본 에셋이 삭제된 경우 등) 에러를 던지지 않고 `object`의 기존 필드만으로 일반 `FabricImage`를 대체 생성해 반환한다(깨진 참조로 인해 캔버스 전체 로드가 실패하지 않도록 — 이 폴백 규칙은 architecture.md에 명시되어 있지 않으므로 이 step에서 새로 정하는 안전장치이며, 다음 step들이 이 동작에 의존하지 않는다).
- 파일 하단에서 `classRegistry.setClass(AnimatedGif)`를 호출해 등록한다.

## AC
- `npm run lint && npm run build && npm run test` 통과. 신규 테스트 `AnimatedGif.test.js`:
  - `new AnimatedGif(canvas, { frames: [c1, c2], frameDelays: [100, 100], assetId: 'x' })` 생성 후 `advanceFrame()`을 호출하면 `currentFrameIndex`가 1이 되고 `_element === frames[1]`인지.
  - `advanceFrame()`을 프레임 개수만큼 반복 호출하면 `currentFrameIndex`가 다시 0으로 순환하는지.
  - `toObject(['assetId', 'frameDelays', 'currentFrameIndex'])` 결과에 세 필드가 포함되고 `type === 'AnimatedGif'`인지, `frames` 필드는 포함되지 않는지.
  - `classRegistry.getClass('AnimatedGif')`가 `AnimatedGif` 클래스를 반환하는지(모듈을 import하기만 하면 등록되는지 확인).
  - `fromObject`가 유효한 `assetId`로 정상 복원되는지, 존재하지 않는 `assetId`(getAsset이 null 반환)일 때 에러 없이 일반 이미지로 폴백하는지(모킹 필요 — 기존 `useCanvasBackground.test.js`/`canvasAssetPlacement.test.js`의 fake-indexeddb + node:buffer Blob 우회 패턴을 동일하게 참고).

## 금지
- `_render`나 `render`를 오버라이드하지 마라. 이유: architecture.md ADR-2 — `FabricImage`의 기존 렌더 파이프라인을 그대로 재사용하는 것이 이번 설계의 핵심이며, 직접 그리기 로직을 새로 만들면 캐싱·변환(회전/스케일) 처리를 다시 구현해야 해서 PRD의 "기존 오브젝트 기능 동일 지원" 요구를 깨뜨릴 위험이 있다.
- `toObject()`를 오버라이드하지 마라. 이유: `static customProperties` 선언만으로 Fabric 표준 메커니즘이 직렬화를 처리한다(ADR-3, architecture.md에 근거).
- 공유 렌더 루프(다음 step)를 이 파일 안에서 만들거나 호출하지 마라. 이유: 이 step은 오브젝트 클래스 자체의 정의만 담당하고, 프레임을 언제 넘길지 스케줄링하는 책임은 다음 step(sharedGifRenderLoop)에 있다.
