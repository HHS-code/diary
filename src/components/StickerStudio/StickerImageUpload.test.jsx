import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Canvas, FabricImage } from 'fabric'
import { StickerImageUpload } from './StickerImageUpload'

const STICKER_CANVAS_SIZE = { width: 512, height: 512 }

// jsdom은 <img>.src를 설정해도 실제로 로드하지 않아 onload가 영영 안 온다.
// FabricImage.fromURL이 기다리는 onload를 이 파일 안에서만 즉시 흉내낸다
// (ImageUploadButton.test.jsx와 동일 우회).
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

function setInputFiles(input, files) {
  Object.defineProperty(input, 'files', { value: files, writable: false, configurable: true })
}

// FabricImage.fromURL까지 이어지는 비동기 체인이 끝날 시간을 준다
// (ImageUploadButton.test.jsx의 flushAsyncWork와 동일 이유).
async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 50))
}

let container
let root

function renderButton(fabricCanvasRef) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<StickerImageUpload fabricCanvasRef={fabricCanvasRef} />)
  })
}

function createStickerCanvasRef() {
  const canvasEl = document.createElement('canvas')
  return { current: new Canvas(canvasEl, STICKER_CANVAS_SIZE) }
}

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('StickerImageUpload', () => {
  it('캔버스보다 작은 이미지는 원본 크기로 캔버스 중앙에 추가된다', async () => {
    nextImageSize = { width: 100, height: 80 }
    const fabricCanvasRef = createStickerCanvasRef()
    renderButton(fabricCanvasRef)
    const input = container.querySelector('input[type="file"]')
    const file = new File(['fake-image-bytes'], 'cat.png', { type: 'image/png' })
    setInputFiles(input, [file])

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await flushAsyncWork()
    })

    const [added] = fabricCanvasRef.current.getObjects()
    expect(added).toBeInstanceOf(FabricImage)
    expect(added.getScaledWidth()).toBe(100)
    expect(added.left).toBe((STICKER_CANVAS_SIZE.width - 100) / 2)
    expect(added.top).toBe((STICKER_CANVAS_SIZE.height - 80) / 2)
  })

  it('캔버스보다 큰 이미지는 비율을 유지한 채 스케일 다운된다', async () => {
    nextImageSize = { width: STICKER_CANVAS_SIZE.width * 2, height: STICKER_CANVAS_SIZE.height * 2 }
    const fabricCanvasRef = createStickerCanvasRef()
    renderButton(fabricCanvasRef)
    const input = container.querySelector('input[type="file"]')
    const file = new File(['fake-image-bytes'], 'big.png', { type: 'image/png' })
    setInputFiles(input, [file])

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await flushAsyncWork()
    })

    const [added] = fabricCanvasRef.current.getObjects()
    expect(added.getScaledWidth()).toBe(STICKER_CANVAS_SIZE.width)
    expect(added.getScaledHeight()).toBe(STICKER_CANVAS_SIZE.height)
  })

  it('업로드한 이미지는 assetId가 부여되지 않은 임시 오브젝트다', async () => {
    nextImageSize = { width: 50, height: 50 }
    const fabricCanvasRef = createStickerCanvasRef()
    renderButton(fabricCanvasRef)
    const input = container.querySelector('input[type="file"]')
    const file = new File(['fake-image-bytes'], 'cat.png', { type: 'image/png' })
    setInputFiles(input, [file])

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await flushAsyncWork()
    })

    const [added] = fabricCanvasRef.current.getObjects()
    expect(added.assetId).toBeUndefined()
  })
})
