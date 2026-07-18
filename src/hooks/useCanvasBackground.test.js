import 'fake-indexeddb/auto'
// jsdom Blob과 Node structuredClone 간 비호환 우회(assetStorage.test.js와 동일 이유).
import { Blob as NodeBlob } from 'node:buffer'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Canvas, Rect } from 'fabric'
import { useCanvasBackground } from './useCanvasBackground'
import { EXTRA_SERIALIZED_PROPS, resolveCanvasAssetReferences } from './useFabricCanvas'
import { getAsset } from '../storage/assetStorage'

function createCanvas() {
  const canvasEl = document.createElement('canvas')
  return new Canvas(canvasEl)
}

function addBackgroundRect(canvas) {
  const rect = new Rect({ left: 0, top: 0, width: 50, height: 50 })
  rect.isBackground = true
  canvas.add(rect)
  return rect
}

// File 대신 node:buffer Blob 기반 파일 스텁을 쓴다 — jsdom File은 jsdom Blob이라
// fake-indexeddb의 structuredClone과 비호환이다(assetStorage.test.js와 동일 이슈).
class FakeImageFile extends NodeBlob {
  constructor(name, type, content = 'fake-image-bytes') {
    super([content], { type })
    this.name = name
  }
}

function deleteAssetsDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('diary-assets')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// jsdom은 <img>.src를 설정해도 실제로 로드하지 않아 onload가 영영 안 온다.
// FabricImage.fromURL이 기다리는 onload를 이 파일 안에서만 즉시 흉내낸다.
// 또한 jsdom canvas는 실제 디코딩된 비트맵이 없으면 drawImage에서
// "Image given has not completed loading"로 죽으므로, 렌더 단계도 no-op으로 둔다
// (node-canvas 네이티브 바인딩 없이 이미지 픽셀 자체를 검증할 방법이 없다 —
// 이 테스트가 확인하려는 건 isBackground/assetId 등 메타데이터의 왕복이다).
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

describe('useCanvasBackground', () => {
  it('setColor는 캔버스 배경색을 지정한 색으로 바꾼다', () => {
    const canvas = createCanvas()
    const { setColor } = useCanvasBackground({ current: canvas })

    setColor('#ffcc00')

    expect(canvas.backgroundColor).toBe('#ffcc00')
  })

  it('setColor로 바꾼 배경색은 toJSON() 직렬화에 포함된다', () => {
    const canvas = createCanvas()
    const { setColor } = useCanvasBackground({ current: canvas })

    setColor('#ffcc00')

    expect(canvas.toJSON().background).toBe('#ffcc00')
  })

  it('setColor는 배경 변경 후 object:modified 이벤트를 발생시켜 오토세이브 파이프라인을 태운다', () => {
    const canvas = createCanvas()
    const onModified = vi.fn()
    canvas.on('object:modified', onModified)
    const { setColor } = useCanvasBackground({ current: canvas })

    setColor('#ffcc00')

    expect(onModified).toHaveBeenCalled()
  })

  it('lockBackground는 isBackground 오브젝트를 선택 불가로 고정하고 맨 뒤로 보낸다', () => {
    const canvas = createCanvas()
    const bg = addBackgroundRect(canvas)
    const front = new Rect({ left: 10, top: 10, width: 20, height: 20 })
    canvas.add(front)
    canvas.sendObjectToBack(front) // bg가 앞에 있는 상태에서 시작
    const { lockBackground } = useCanvasBackground({ current: canvas })

    lockBackground()

    expect(bg.selectable).toBe(false)
    expect(bg.evented).toBe(false)
    expect(canvas.getObjects()[0]).toBe(bg)
  })

  it('clearBackground는 isBackground 오브젝트만 제거하고 일반 오브젝트는 남긴다', () => {
    const canvas = createCanvas()
    addBackgroundRect(canvas)
    const normal = new Rect({ left: 10, top: 10, width: 20, height: 20 })
    canvas.add(normal)
    const { clearBackground } = useCanvasBackground({ current: canvas })

    clearBackground()

    expect(canvas.getObjects()).toHaveLength(1)
    expect(canvas.getObjects()[0]).toBe(normal)
  })

  it('lock 후 toObject 직렬화에 isBackground와 고정 상태(selectable/evented)가 포함된다', () => {
    const canvas = createCanvas()
    addBackgroundRect(canvas)
    const { lockBackground } = useCanvasBackground({ current: canvas })

    lockBackground()

    const serialized = canvas.toObject(['isBackground', 'selectable', 'evented'])
    expect(serialized.objects[0].isBackground).toBe(true)
    expect(serialized.objects[0].selectable).toBe(false)
    expect(serialized.objects[0].evented).toBe(false)
  })

  it('setImage는 파일을 assetStorage에 저장하고 isBackground/assetId를 가진 오브젝트를 캔버스에 추가한다', async () => {
    const canvas = createCanvas()
    const { setImage } = useCanvasBackground({ current: canvas })
    const file = new FakeImageFile('bg.png', 'image/png')

    await setImage(file)

    const [added] = canvas.getObjects()
    expect(added.isBackground).toBe(true)
    expect(added.assetId).toEqual(expect.any(String))

    const record = await getAsset(added.assetId)
    expect(record.filename).toBe('bg.png')
    expect(await record.blob.text()).toBe('fake-image-bytes')
  })

  it('배경 이미지를 저장(toJSON) 후 assetId 참조로 다시 로드하면 배경이 복원된다', async () => {
    const canvas = createCanvas()
    const { setImage } = useCanvasBackground({ current: canvas })
    await setImage(new FakeImageFile('bg.png', 'image/png'))
    const savedAssetId = canvas.getObjects()[0].assetId

    const serialized = canvas.toObject(EXTRA_SERIALIZED_PROPS)
    expect(serialized.objects[0].assetId).toBe(savedAssetId)
    const resolved = await resolveCanvasAssetReferences(serialized)

    const reloadedCanvas = createCanvas()
    await reloadedCanvas.loadFromJSON(resolved)

    const [restored] = reloadedCanvas.getObjects()
    expect(restored.isBackground).toBe(true)
    expect(restored.assetId).toBe(savedAssetId)
    expect(restored.getSrc()).toMatch(/^blob:/)
  })

  it('fabricCanvasRef.current가 없으면 아무 동작도 하지 않는다', () => {
    const { setColor, lockBackground, clearBackground } = useCanvasBackground({ current: null })

    expect(() => setColor('#ffcc00')).not.toThrow()
    expect(() => lockBackground()).not.toThrow()
    expect(() => clearBackground()).not.toThrow()
  })
})
