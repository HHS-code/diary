import 'fake-indexeddb/auto'
// jsdom Blob과 Node structuredClone 간 비호환 우회(assetStorage.test.js와 동일 이유).
import { Blob as NodeBlob } from 'node:buffer'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { classRegistry, FabricImage } from 'fabric'
import { AnimatedGif } from './AnimatedGif'
import { saveAsset } from '../storage/assetStorage'

function createFrameCanvas(fillStyle) {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = fillStyle
  return canvas
}

function deleteAssetsDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('diary-assets')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// jsdom은 <img>.src를 설정해도 실제로 로드하지 않아 onload가 영영 안 온다.
// FabricImage 생성자가 기다리는 onload를 이 파일 안에서만 즉시 흉내낸다
// (useCanvasBackground.test.js/canvasAssetPlacement.test.js와 동일 우회).
beforeAll(() => {
  const nativeDescriptor = Object.getOwnPropertyDescriptor(window.HTMLImageElement.prototype, 'src')
  Object.defineProperty(window.HTMLImageElement.prototype, 'src', {
    configurable: true,
    get() {
      return nativeDescriptor.get.call(this)
    },
    set(value) {
      nativeDescriptor.set.call(this, value)
      if (!value) return
      Object.defineProperty(this, 'width', { value: 100, configurable: true })
      Object.defineProperty(this, 'height', { value: 80, configurable: true })
      Object.defineProperty(this, 'complete', { value: true, configurable: true })
      setTimeout(() => this.onload && this.onload())
    },
  })
  const ctxProto = Object.getPrototypeOf(document.createElement('canvas').getContext('2d'))
  ctxProto.drawImage = function drawImage() {}
})

beforeEach(async () => {
  await deleteAssetsDatabase()
})

describe('AnimatedGif', () => {
  it('advanceFrame을 호출하면 currentFrameIndex가 다음 프레임으로 넘어가고 _element가 교체된다', () => {
    const c1 = createFrameCanvas('red')
    const c2 = createFrameCanvas('green')
    const gif = new AnimatedGif(c1, { frames: [c1, c2], frameDelays: [100, 100], assetId: 'x' })

    gif.advanceFrame()

    expect(gif.currentFrameIndex).toBe(1)
    expect(gif._element).toBe(c2)
  })

  it('advanceFrame을 프레임 개수만큼 반복 호출하면 currentFrameIndex가 다시 0으로 순환한다', () => {
    const c1 = createFrameCanvas('red')
    const c2 = createFrameCanvas('green')
    const c3 = createFrameCanvas('blue')
    const gif = new AnimatedGif(c1, { frames: [c1, c2, c3], frameDelays: [100, 100, 100], assetId: 'x' })

    gif.advanceFrame()
    gif.advanceFrame()
    gif.advanceFrame()

    expect(gif.currentFrameIndex).toBe(0)
    expect(gif._element).toBe(c1)
  })

  it('frames가 1개뿐이면 advanceFrame을 호출해도 아무 변화가 없다', () => {
    const c1 = createFrameCanvas('red')
    const gif = new AnimatedGif(c1, { frames: [c1], frameDelays: [100], assetId: 'x' })

    gif.advanceFrame()

    expect(gif.currentFrameIndex).toBe(0)
    expect(gif._element).toBe(c1)
  })

  it('toObject는 assetId/frameDelays/currentFrameIndex를 포함하고 type은 AnimatedGif이며 frames는 포함하지 않는다', () => {
    const c1 = createFrameCanvas('red')
    const c2 = createFrameCanvas('green')
    const gif = new AnimatedGif(c1, { frames: [c1, c2], frameDelays: [100, 150], assetId: 'asset-1' })

    const serialized = gif.toObject(['assetId', 'frameDelays', 'currentFrameIndex'])

    expect(serialized.type).toBe('AnimatedGif')
    expect(serialized.assetId).toBe('asset-1')
    expect(serialized.frameDelays).toEqual([100, 150])
    expect(serialized.currentFrameIndex).toBe(0)
    expect(serialized.frames).toBeUndefined()
  })

  it('classRegistry.getClass는 AnimatedGif 모듈을 import하기만 하면 AnimatedGif 클래스를 반환한다', () => {
    expect(classRegistry.getClass('AnimatedGif')).toBe(AnimatedGif)
  })

  it('fromObject는 유효한 assetId로 GIF blob을 다시 디코딩해 AnimatedGif로 복원한다', async () => {
    // COMPOSITING_GIF_BASE64와 동일한 fixture(gifFrameDecoder.test.js 참고) — 3프레임 GIF.
    const base64 =
      'R0lGODlhAgACAPEAAP8AAAD/AAAA/////yH5BAQKAAAALAAAAAACAAIAAAIEBENxLAAh+QQICgAAACwBAAEAAQABAAACAgQLACH5BAAKAAAALAAAAAABAAEAAAICDAsAOw=='
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    const blob = new NodeBlob([bytes], { type: 'image/gif' })
    const assetId = await saveAsset({ type: 'image', filename: 'anim.gif', mimeType: 'image/gif', blob })

    const restored = await AnimatedGif.fromObject({
      type: 'AnimatedGif',
      assetId,
      frameDelays: [1],
      currentFrameIndex: 0,
      left: 5,
      top: 5,
    })

    expect(restored).toBeInstanceOf(AnimatedGif)
    expect(restored.assetId).toBe(assetId)
    expect(restored.frames.length).toBe(3)
    expect(restored.left).toBe(5)
  })

  it('fromObject는 존재하지 않는 assetId(getAsset이 null 반환)일 때 에러 없이 일반 이미지로 폴백한다', async () => {
    // 실제로는 AnimatedGif.toObject()가 FabricImage로부터 물려받은 src(getSrc() 결과, 마지막
    // 표시 프레임의 dataURL)를 포함하므로, 폴백 시 이 src로 일반 FabricImage를 복원할 수 있다.
    const restored = await AnimatedGif.fromObject({
      type: 'AnimatedGif',
      assetId: 'missing-asset-id',
      frameDelays: [100],
      currentFrameIndex: 0,
      left: 5,
      top: 5,
      src: 'data:image/png;base64,AAAA',
    })

    expect(restored).toBeInstanceOf(FabricImage)
    expect(restored).not.toBeInstanceOf(AnimatedGif)
    expect(restored.left).toBe(5)
  })
})
