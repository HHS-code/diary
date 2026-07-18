import { describe, expect, it, vi } from 'vitest'
import { Canvas, FabricImage, Path, Rect } from 'fabric'
import { commitLassoCutout, previewLassoCutout } from './stickerCutout'

function createCanvas() {
  return new Canvas(document.createElement('canvas'), { width: 512, height: 512 })
}

function stubToCanvasElement(canvas) {
  canvas.toCanvasElement = vi.fn((multiplier, options) => {
    const el = document.createElement('canvas')
    el.width = options.width
    el.height = options.height
    return el
  })
}

describe('previewLassoCutout', () => {
  it('올가미 Path를 targetImage의 clipPath로 지정하고 캔버스를 다시 렌더한다', () => {
    const canvas = createCanvas()
    const targetImage = new Rect({ left: 0, top: 0, width: 100, height: 100 })
    canvas.add(targetImage)
    const lassoPath = new Path('M 10 10 L 50 10 L 50 50 L 10 50 Z')
    const renderAllSpy = vi.spyOn(canvas, 'renderAll')

    previewLassoCutout(targetImage, lassoPath)

    expect(targetImage.clipPath).toBe(lassoPath)
    expect(renderAllSpy).toHaveBeenCalled()
  })

  it('여러 번 호출하면 이전 미리보기를 새 올가미로 덮어쓴다', () => {
    const canvas = createCanvas()
    const targetImage = new Rect({ left: 0, top: 0, width: 100, height: 100 })
    canvas.add(targetImage)
    const firstLasso = new Path('M 10 10 L 50 10 L 50 50 L 10 50 Z')
    const secondLasso = new Path('M 5 5 L 20 5 L 20 20 L 5 20 Z')

    previewLassoCutout(targetImage, firstLasso)
    previewLassoCutout(targetImage, secondLasso)

    expect(targetImage.clipPath).toBe(secondLasso)
  })

  it('targetImage가 없으면 아무 것도 하지 않는다', () => {
    const lassoPath = new Path('M 10 10 L 50 10 L 50 50 L 10 50 Z')

    expect(() => previewLassoCutout(undefined, lassoPath)).not.toThrow()
  })

  it('lassoPath의 점이 2개 미만이면 clipPath를 설정하지 않는다', () => {
    const canvas = createCanvas()
    const targetImage = new Rect({ left: 0, top: 0, width: 100, height: 100 })
    canvas.add(targetImage)
    const tooShortPath = new Path('M 10 10')

    previewLassoCutout(targetImage, tooShortPath)

    expect(targetImage.clipPath).toBeUndefined()
  })
})

describe('commitLassoCutout', () => {
  it('clipPath가 적용된 targetImage를 rasterize해 새 이미지로 교체하고, 새 이미지는 clipPath를 갖지 않는다', async () => {
    const canvas = createCanvas()
    const targetImage = new Rect({ left: 20, top: 30, width: 100, height: 80 })
    canvas.add(targetImage)
    previewLassoCutout(targetImage, new Path('M 10 10 L 50 10 L 50 50 L 10 50 Z'))
    stubToCanvasElement(canvas)

    await commitLassoCutout(canvas, targetImage)

    const objects = canvas.getObjects()
    expect(objects).toHaveLength(1)
    expect(objects[0]).not.toBe(targetImage)
    expect(objects[0]).toBeInstanceOf(FabricImage)
    expect(objects[0].clipPath).toBeUndefined()
  })

  it('canvas.toCanvasElement를 targetImage의 경계 영역과 targetImage만 거르는 filter로 호출한다', async () => {
    const canvas = createCanvas()
    const targetImage = new Rect({ left: 20, top: 30, width: 100, height: 80 })
    const otherObject = new Rect({ left: 0, top: 0, width: 10, height: 10 })
    canvas.add(otherObject, targetImage)
    const expectedBoundingRect = targetImage.getBoundingRect()
    stubToCanvasElement(canvas)

    await commitLassoCutout(canvas, targetImage)

    expect(canvas.toCanvasElement).toHaveBeenCalledTimes(1)
    const [multiplier, options] = canvas.toCanvasElement.mock.calls[0]
    expect(multiplier).toBe(1)
    expect(options).toMatchObject(expectedBoundingRect)
    expect(options.filter(targetImage)).toBe(true)
    expect(options.filter(otherObject)).toBe(false)
  })

  it('새 이미지는 원래 위치(경계 영역의 좌상단)를 유지한다', async () => {
    const canvas = createCanvas()
    const targetImage = new Rect({ left: 20, top: 30, width: 100, height: 80 })
    canvas.add(targetImage)
    const expectedBoundingRect = targetImage.getBoundingRect()
    stubToCanvasElement(canvas)

    await commitLassoCutout(canvas, targetImage)

    const [newImage] = canvas.getObjects()
    expect(newImage.getBoundingRect().left).toBeCloseTo(expectedBoundingRect.left)
    expect(newImage.getBoundingRect().top).toBeCloseTo(expectedBoundingRect.top)
  })

  it('assetId 등 기존 메타데이터를 새 오브젝트로 승계한다', async () => {
    const canvas = createCanvas()
    const targetImage = new Rect({ left: 0, top: 0, width: 50, height: 50 })
    targetImage.set({ assetId: 'asset-123' })
    canvas.add(targetImage)
    stubToCanvasElement(canvas)

    await commitLassoCutout(canvas, targetImage)

    expect(canvas.getObjects()[0].assetId).toBe('asset-123')
  })

  it('교체된 새 이미지를 활성 오브젝트로 선택한다', async () => {
    const canvas = createCanvas()
    const targetImage = new Rect({ left: 0, top: 0, width: 50, height: 50 })
    canvas.add(targetImage)
    stubToCanvasElement(canvas)

    await commitLassoCutout(canvas, targetImage)

    expect(canvas.getActiveObject()).toBe(canvas.getObjects()[0])
  })

  it('canvas나 targetImage가 없으면 아무 것도 하지 않는다', async () => {
    const canvas = createCanvas()
    const targetImage = new Rect({ left: 0, top: 0, width: 50, height: 50 })
    canvas.add(targetImage)

    await commitLassoCutout(undefined, targetImage)
    await commitLassoCutout(canvas, undefined)

    expect(canvas.getObjects()).toEqual([targetImage])
  })
})
