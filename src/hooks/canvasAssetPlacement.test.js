import 'fake-indexeddb/auto'
// jsdom Blob과 Node structuredClone 간 비호환 우회(assetStorage.test.js와 동일 이유).
import { Blob as NodeBlob } from 'node:buffer'
import { beforeAll, describe, expect, it } from 'vitest'
import { Canvas, FabricImage } from 'fabric'
import { addImageAssetToCanvas } from './canvasAssetPlacement'
import { LOGICAL_CANVAS } from './useFabricCanvas'
import { AnimatedGif } from '../fabric/AnimatedGif'

// 2x2px 3프레임 GIF / 1프레임 정적 GIF(gifFrameDecoder.test.js와 동일 fixture).
const ANIMATED_GIF_BASE64 =
  'R0lGODlhAgACAPEAAP8AAAD/AAAA/////yH5BAQKAAAALAAAAAACAAIAAAIEBENxLAAh+QQICgAAACwBAAEAAQABAAACAgQLACH5BAAKAAAALAAAAAABAAEAAAICDAsAOw=='
const STATIC_GIF_BASE64 = 'R0lGODlhAgACAPEAAP8AAAD/AAAA/////yH5BAAKAAAALAAAAAACAAIAAAIEBENxLAA7'

function base64ToBlob(base64, type) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new NodeBlob([bytes], { type })
}

function createCanvas() {
  const canvasEl = document.createElement('canvas')
  return new Canvas(canvasEl)
}

// File 대신 node:buffer Blob 기반 파일 스텁을 쓴다(useCanvasBackground.test.js와 동일 이유).
class FakeImageFile extends NodeBlob {
  constructor(name, type, width, height) {
    super(['fake-image-bytes'], { type })
    this.name = name
    this._width = width
    this._height = height
  }
}

// jsdom은 <img>.src를 설정해도 실제로 로드하지 않아 onload가 영영 안 온다.
// FabricImage.fromURL이 기다리는 onload를 이 파일 안에서만 즉시 흉내낸다(useCanvasBackground.test.js와 동일 우회).
let nextImageSize = { width: 100, height: 80 }
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
      Object.defineProperty(this, 'width', { value: nextImageSize.width, configurable: true })
      Object.defineProperty(this, 'height', { value: nextImageSize.height, configurable: true })
      Object.defineProperty(this, 'complete', { value: true, configurable: true })
      setTimeout(() => this.onload && this.onload())
    },
  })
  const ctxProto = Object.getPrototypeOf(document.createElement('canvas').getContext('2d'))
  ctxProto.drawImage = function drawImage() {}
})

describe('addImageAssetToCanvas', () => {
  it('캔버스보다 작은 이미지는 원본 크기로 캔버스 중앙에 추가된다', async () => {
    nextImageSize = { width: 100, height: 80 }
    const canvas = createCanvas()
    const asset = { id: 'asset-1', blob: new FakeImageFile('cat.png', 'image/png') }

    await addImageAssetToCanvas(canvas, asset)

    const [added] = canvas.getObjects()
    expect(added.assetId).toBe('asset-1')
    expect(added.getScaledWidth()).toBe(100)
    expect(added.left).toBe((LOGICAL_CANVAS.width - 100) / 2)
    expect(added.top).toBe((LOGICAL_CANVAS.height - 80) / 2)
  })

  it('캔버스보다 큰 이미지는 비율을 유지한 채 스케일 다운된다', async () => {
    nextImageSize = { width: LOGICAL_CANVAS.width * 2, height: LOGICAL_CANVAS.height * 2 }
    const canvas = createCanvas()
    const asset = { id: 'asset-2', blob: new FakeImageFile('big.png', 'image/png') }

    await addImageAssetToCanvas(canvas, asset)

    const [added] = canvas.getObjects()
    expect(added.getScaledWidth()).toBe(LOGICAL_CANVAS.width)
    expect(added.getScaledHeight()).toBe(LOGICAL_CANVAS.height)
  })

  it('추가된 오브젝트가 활성 오브젝트로 선택된다', async () => {
    nextImageSize = { width: 50, height: 50 }
    const canvas = createCanvas()
    const asset = { id: 'asset-3', blob: new FakeImageFile('sq.png', 'image/png') }

    await addImageAssetToCanvas(canvas, asset)

    expect(canvas.getActiveObject()).toBe(canvas.getObjects()[0])
  })

  it('애니메이션 GIF(2프레임 이상)는 AnimatedGif 인스턴스로 캔버스에 추가된다', async () => {
    const canvas = createCanvas()
    const asset = { id: 'asset-gif', mimeType: 'image/gif', blob: base64ToBlob(ANIMATED_GIF_BASE64, 'image/gif') }

    await addImageAssetToCanvas(canvas, asset)

    const [added] = canvas.getObjects()
    expect(added).toBeInstanceOf(AnimatedGif)
    expect(added.assetId).toBe('asset-gif')
    expect(added.frames.length).toBe(3)
  })

  it('정지 이미지(PNG)는 AnimatedGif가 아닌 FabricImage 인스턴스로 캔버스에 추가된다', async () => {
    nextImageSize = { width: 50, height: 50 }
    const canvas = createCanvas()
    const asset = { id: 'asset-png', mimeType: 'image/png', blob: new FakeImageFile('cat.png', 'image/png') }

    await addImageAssetToCanvas(canvas, asset)

    const [added] = canvas.getObjects()
    expect(added).toBeInstanceOf(FabricImage)
    expect(added).not.toBeInstanceOf(AnimatedGif)
  })

  it('프레임 1개뿐인 정적 GIF는 AnimatedGif가 아닌 정지 이미지로 추가된다', async () => {
    nextImageSize = { width: 2, height: 2 }
    const canvas = createCanvas()
    const asset = { id: 'asset-static-gif', mimeType: 'image/gif', blob: base64ToBlob(STATIC_GIF_BASE64, 'image/gif') }

    await addImageAssetToCanvas(canvas, asset)

    const [added] = canvas.getObjects()
    expect(added).toBeInstanceOf(FabricImage)
    expect(added).not.toBeInstanceOf(AnimatedGif)
  })
})
