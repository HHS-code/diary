import 'fake-indexeddb/auto'
// jsdom Blob과 Node structuredClone 간 비호환 우회(assetStorage.test.js와 동일 이유).
import { Blob as NodeBlob } from 'node:buffer'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Canvas, FabricImage } from 'fabric'
import { ImageUploadButton } from './ImageUploadButton'
import { AnimatedGif } from '../../fabric/AnimatedGif'
import { getAsset } from '../../storage/assetStorage'
import { LOGICAL_CANVAS } from '../../hooks/useFabricCanvas'

// 2x2px 3프레임 GIF(gifFrameDecoder.test.js/canvasAssetPlacement.test.js와 동일 fixture).
const ANIMATED_GIF_BASE64 =
  'R0lGODlhAgACAPEAAP8AAAD/AAAA/////yH5BAQKAAAALAAAAAACAAIAAAIEBENxLAAh+QQICgAAACwBAAEAAQABAAACAgQLACH5BAAKAAAALAAAAAABAAEAAAICDAsAOw=='

function base64ToBytes(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// input.files[0]로 쓸 File 대신 node:buffer Blob 기반 파일 스텁을 쓴다
// (canvasAssetPlacement.test.js와 동일 이유).
class FakeImageFile extends NodeBlob {
  constructor(name, type, content = 'fake-image-bytes') {
    super([content], { type })
    this.name = name
  }
}

// jsdom은 <img>.src를 설정해도 실제로 로드하지 않아 onload가 영영 안 온다.
// FabricImage.fromURL이 기다리는 onload를 이 파일 안에서만 즉시 흉내낸다
// (canvasAssetPlacement.test.js와 동일 우회).
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

// saveAsset(fake-indexeddb 트랜잭션)과 decodeGifFrames까지 이어지는 비동기 체인이
// 끝날 시간을 준다(AssetImportPanel.test.js의 flushAsyncWork보다 넉넉하게).
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
    root.render(<ImageUploadButton fabricCanvasRef={fabricCanvasRef} />)
  })
}

function createFabricCanvasRef() {
  const canvasEl = document.createElement('canvas')
  return { current: new Canvas(canvasEl) }
}

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('ImageUploadButton', () => {
  it('파일을 선택하면 saveAsset으로 저장되고 캔버스에 추가된 오브젝트가 assetId를 갖는다', async () => {
    nextImageSize = { width: 50, height: 50 }
    const fabricCanvasRef = createFabricCanvasRef()
    renderButton(fabricCanvasRef)
    const input = container.querySelector('input[type="file"]')
    const file = new FakeImageFile('cat.png', 'image/png')
    setInputFiles(input, [file])

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await flushAsyncWork()
    })

    const [added] = fabricCanvasRef.current.getObjects()
    expect(added.assetId).toBeTruthy()
    const record = await getAsset(added.assetId)
    expect(record.filename).toBe('cat.png')
    expect(record.mimeType).toBe('image/png')
  })

  it('캔버스보다 큰 이미지는 비율을 유지한 채 스케일 다운된다', async () => {
    nextImageSize = { width: LOGICAL_CANVAS.width * 2, height: LOGICAL_CANVAS.height * 2 }
    const fabricCanvasRef = createFabricCanvasRef()
    renderButton(fabricCanvasRef)
    const input = container.querySelector('input[type="file"]')
    const file = new FakeImageFile('big.png', 'image/png')
    setInputFiles(input, [file])

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await flushAsyncWork()
    })

    const [added] = fabricCanvasRef.current.getObjects()
    expect(added.getScaledWidth()).toBe(LOGICAL_CANVAS.width)
    expect(added.getScaledHeight()).toBe(LOGICAL_CANVAS.height)
  })

  it('GIF 파일(2프레임 이상)을 선택하면 AnimatedGif 인스턴스로 캔버스에 추가된다', async () => {
    const fabricCanvasRef = createFabricCanvasRef()
    renderButton(fabricCanvasRef)
    const input = container.querySelector('input[type="file"]')
    const file = new FakeImageFile('anim.gif', 'image/gif', base64ToBytes(ANIMATED_GIF_BASE64))
    setInputFiles(input, [file])

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await flushAsyncWork()
    })

    const [added] = fabricCanvasRef.current.getObjects()
    expect(added).toBeInstanceOf(AnimatedGif)
    expect(added.assetId).toBeTruthy()
  })

  it('정지 이미지(PNG)를 선택하면 AnimatedGif가 아닌 FabricImage 인스턴스로 추가된다', async () => {
    nextImageSize = { width: 50, height: 50 }
    const fabricCanvasRef = createFabricCanvasRef()
    renderButton(fabricCanvasRef)
    const input = container.querySelector('input[type="file"]')
    const file = new FakeImageFile('cat.png', 'image/png')
    setInputFiles(input, [file])

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await flushAsyncWork()
    })

    const [added] = fabricCanvasRef.current.getObjects()
    expect(added).toBeInstanceOf(FabricImage)
    expect(added).not.toBeInstanceOf(AnimatedGif)
  })
})
