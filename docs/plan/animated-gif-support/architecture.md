# Architecture — 애니메이션 GIF 지원

## 컴포넌트 개요

```
src/
  storage/
    assetStorage.js              (기존, 변경 없음 — Blob 저장/조회는 그대로 재사용)
  fabric/
    AnimatedGif.js                (신규 — FabricImage를 상속한 커스텀 오브젝트 클래스)
    gifFrameDecoder.js             (신규 — gifuct-js로 GIF Blob → 프레임 배열 변환)
    sharedGifRenderLoop.js         (신규 — 캔버스당 공유 requestAnimationFrame 루프)
  hooks/
    canvasAssetPlacement.js        (기존, 수정 — GIF는 AnimatedGif 경로로 분기)
    useFabricCanvas.js             (기존, 수정 — 공유 렌더 루프 생명주기 연결)
  components/
    ImageUploadButton/ImageUploadButton.jsx  (기존, 수정 — assetStorage 경로로 전환)
```

## 데이터 흐름

### 1. GIF 등록 및 프레임 디코딩

```
사용자가 GIF 파일을 등록(AssetImportPanel 파일선택/폴더선택/드래그드롭, 또는 ImageUploadButton)
  → useAssetLibrary.registerImage(file) / assetStorage.saveAsset(...)  (기존 그대로, blob 저장)
  → 캔버스에 배치되는 시점(canvasAssetPlacement.addImageAssetToCanvas 또는
    ImageUploadButton의 addImageToCanvas)에서 gifFrameDecoder.decodeGifFrames(blob) 호출
      → gifuct-js로 파싱 → { frames: HTMLCanvasElement[], delays: number[] } 반환
      → frames.length === 1 이면 기존 FabricImage.fromURL 경로 그대로 사용 (정적 GIF)
      → frames.length >= 2 이면 AnimatedGif 인스턴스 생성
```

- 프레임은 각각 오프스크린 `<canvas>`에 합성된 상태(diff/disposal 처리 완료)로 보관해, 렌더 시 `drawImage`만 하면 되도록 한다.

### 2. AnimatedGif 오브젝트 (`src/fabric/AnimatedGif.js`)

```js
import { FabricImage, classRegistry } from 'fabric'

export class AnimatedGif extends FabricImage {
  static type = 'AnimatedGif'
  static customProperties = ['assetId', 'frameDelays', 'currentFrameIndex']

  constructor(element, options) {
    super(element, options)
    this.assetId = options?.assetId
    this.frames = options?.frames ?? [element]      // HTMLCanvasElement[]
    this.frameDelays = options?.frameDelays ?? [100]
    this.currentFrameIndex = 0
  }

  advanceFrame() {
    this.currentFrameIndex = (this.currentFrameIndex + 1) % this.frames.length
    this._element = this.frames[this.currentFrameIndex]
  }

  static async fromObject(object, options) {
    // assetId로 IndexedDB에서 원본 GIF blob을 다시 조회해 프레임 재파싱
    const record = await getAsset(object.assetId)
    const { frames, delays } = await decodeGifFrames(record.blob)
    const img = new AnimatedGif(frames[0], { ...object, frames, frameDelays: delays })
    return img
  }
}

classRegistry.setClass(AnimatedGif)
```

- `render()`/`_render()`는 오버라이드하지 않는다 — `this._element`를 현재 프레임으로 교체해두면 `FabricImage`의 기존 `_render(ctx)`가 그 엘리먼트를 그대로 `drawImage`한다.
- `toObject()`도 오버라이드하지 않는다 — `static customProperties`에 나열한 필드(`assetId`, `frameDelays`, `currentFrameIndex`)가 `FabricObject.toObject()`에 자동 병합된다. `frames`(디코딩된 프레임 배열)는 `customProperties`에 포함하지 않아 직렬화되지 않는다(ADR-3).
- `fromObject`는 `assetId`를 이용해 IndexedDB에서 원본을 다시 조회하고 프레임을 재디코딩한 뒤 인스턴스를 만든다 — 이 과정이 비동기이므로 `useFabricCanvas.js`의 기존 `resolveCanvasAssetReferences` 이후, `loadFromJSON` 내부에서 자연히 await된다(Fabric의 `enlivenObjects`가 각 오브젝트의 `fromObject` Promise를 기다림).

### 3. 공유 렌더 루프 (`src/fabric/sharedGifRenderLoop.js`)

```js
export function createSharedGifRenderLoop(fabricCanvas) {
  const animatedObjects = new Set()
  let rafId = null
  let lastTickTimes = new WeakMap() // AnimatedGif -> 마지막 프레임 전환 시각

  function tick(now) {
    let needsRender = false
    for (const obj of animatedObjects) {
      const last = lastTickTimes.get(obj) ?? 0
      const delay = obj.frameDelays[obj.currentFrameIndex] ?? 100
      if (now - last >= delay) {
        obj.advanceFrame()
        lastTickTimes.set(obj, now)
        needsRender = true
      }
    }
    if (needsRender) fabricCanvas.renderAll()
    rafId = requestAnimationFrame(tick)
  }

  return {
    register(obj) { animatedObjects.add(obj) },
    unregister(obj) { animatedObjects.delete(obj) },
    start() { if (!rafId) rafId = requestAnimationFrame(tick) },
    stop() { cancelAnimationFrame(rafId); rafId = null },
  }
}
```

- 캔버스 하나당 이 루프를 하나만 생성한다(`useFabricCanvas.js`의 `fabricCanvas` 생성 시점에 함께 만들어 `fabricCanvasRef`와 함께 보관).
- `AnimatedGif` 오브젝트가 `canvas.add()`될 때 `register`, `canvas.remove()`(삭제) 될 때 `unregister` — `object:added`/`object:removed` 이벤트에 훅을 건다.
- 틱마다 `renderAll()`은 "갱신이 실제로 필요했을 때만" 최대 1회 호출 — GIF가 몇 개든 이 호출 빈도는 늘지 않는다(PRD 성공 기준의 "동시 여러 개 재생" 근거).
- 캔버스 `dispose()` 시 `stop()`을 호출해 루프를 정리한다(`useFabricCanvas.js`의 언마운트 cleanup에 연결).

### 4. 등록 경로 통합

- `canvasAssetPlacement.js`: `addImageAssetToCanvas`가 `asset.blob`의 MIME 타입이 `image/gif`인 경우 `decodeGifFrames`를 거쳐 `AnimatedGif` 또는(프레임 1개 시) 기존 `FabricImage` 경로로 분기한다. GIF가 아니면 기존 로직 그대로.
- `ImageUploadButton.jsx`: 기존 `FileReader.readAsDataURL` 대신 `assetStorage.saveAsset({ type: 'image', ..., blob: file })`으로 저장 후 `createAssetObjectURL`로 objectURL을 얻어 `addImageToCanvas`에 넘기도록 교체(ADR-5). GIF 판별 및 `AnimatedGif` 분기는 `canvasAssetPlacement.js`와 동일한 헬퍼를 공유한다(중복 구현 방지를 위해 GIF 판별+오브젝트 생성 로직을 공용 함수로 뽑아 두 곳에서 호출).

### 5. 저장 및 재로드

```
저장: fabricCanvas.toObject(EXTRA_SERIALIZED_PROPS) 호출 시
  AnimatedGif.customProperties(assetId, frameDelays, currentFrameIndex)가
  기존 EXTRA_SERIALIZED_PROPS 메커니즘과 별개로 Fabric 표준 customProperties 경로를 통해
  자동 포함됨 — useFabricCanvas.js의 EXTRA_SERIALIZED_PROPS 배열 수정 불필요.

재로드: useFabricCanvas.js의 기존 흐름
  resolveCanvasAssetReferences(canvasJSON)  // 기존 assetId -> src 채움 (일반 이미지용, 변경 없음)
  → fabricCanvas.loadFromJSON(resolvedCanvasJSON)
    → 내부적으로 각 object의 type("AnimatedGif")을 classRegistry에서 찾아
      AnimatedGif.fromObject(object)를 호출 → assetId로 다시 GIF를 디코딩해 복원
  → fabricCanvas.renderAll()
  → (신규) 복원된 AnimatedGif 오브젝트들을 공유 렌더 루프에 register
```

- `resolveCanvasAssetReferences`는 `AnimatedGif` 오브젝트에 대해 `src`를 채우는 동작을 하지 않아도 된다 — `AnimatedGif.fromObject`가 자체적으로 `assetId`를 사용해 프레임을 재구성하기 때문. 다만 `object.assetId`가 있는 모든 오브젝트를 일괄 처리하는 기존 로직과 충돌하지 않도록, `resolveObjectAssetReference`가 `type === 'AnimatedGif'`인 오브젝트는 건드리지 않고 통과시키게 한 줄 분기를 추가한다.

## 신규 의존성

- `gifuct-js`(또는 동급의 경량 GIF 디코더) — GIF 바이너리 파싱 및 프레임 합성.

## 변경하지 않는 것

- `assetStorage.js`의 스키마, `useAssetLibrary.js`, `AssetImportPanel.jsx`의 파일 분류·등록 UI — GIF도 기존과 동일하게 `type: 'image'`로 저장된다(별도 에셋 타입을 만들지 않는다).
- `useCanvasBackground.js` — 배경 경로는 이번 phase에서 건드리지 않는다(PRD Out-of-scope).
- `diaryStorage.js`, ObjectToolbar, export/import(JSON/PNG), 오토세이브 이벤트 파이프라인(`object:added/modified/removed`) — 전부 기존 그대로. `AnimatedGif`는 `FabricObject`를 상속하므로 이 파이프라인에 자동으로 올라탄다.
