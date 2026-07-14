import { describe, expect, it } from 'vitest'
import { Canvas, Group, Path, Point, SprayBrush } from 'fabric'
import { ClippingGroup, eraseObject } from '@erase2d/fabric'
import { buildThumbnail } from './useDiaryThumbnails'

// useFabricCanvas.js의 비공개 상수와 동일한 목록 — 저장 시 포함되는 추가 속성.
const EXTRA_SERIALIZED_PROPS = ['isBackground', 'selectable', 'evented', 'isFreeDrawing', 'erasable']

// usePaintTools의 pinCreatedStroke가 그린 획에 박제하는 속성들
const PINNED_STROKE_PROPS = { selectable: false, evented: false, isFreeDrawing: true, erasable: true }

function createPinnedStroke() {
  return new Path('M 0 75 L 300 75', {
    stroke: '#000000',
    strokeWidth: 4,
    fill: null,
    ...PINNED_STROKE_PROPS,
  })
}

/** EraserBrush.createPath가 만드는 것과 동일한 구조의 지우개 획 (세로선 x=150) */
function createEraserPath() {
  return new Path('M 150 0 L 150 150', {
    stroke: 'black',
    strokeWidth: 8,
    fill: null,
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
    globalCompositeOperation: 'destination-out',
  })
}

async function createCanvasWithErasedStroke() {
  const canvas = new Canvas(document.createElement('canvas'))
  const stroke = createPinnedStroke()
  canvas.add(stroke)
  await eraseObject(stroke, createEraserPath())
  return { canvas, stroke }
}

describe('지워진 획의 직렬화 왕복 (architecture 검증 가정 1)', () => {
  it('toObject→loadFromJSON 왕복 후에도 지운 상태(ClippingGroup clipPath)가 유지된다', async () => {
    const { canvas, stroke } = await createCanvasWithErasedStroke()
    expect(stroke.clipPath).toBeInstanceOf(ClippingGroup)

    const json = canvas.toObject(EXTRA_SERIALIZED_PROPS)
    const restored = new Canvas(document.createElement('canvas'))
    await restored.loadFromJSON(json)

    const [restoredStroke] = restored.getObjects()
    expect(restoredStroke.clipPath).toBeInstanceOf(ClippingGroup)
    expect(restoredStroke.clipPath.getObjects()).toHaveLength(1)
  })

  it('왕복 후 렌더링에서 지운 자리는 투명하고 안 지운 자리는 획이 남아 있다', async () => {
    const { canvas } = await createCanvasWithErasedStroke()

    const restored = new Canvas(document.createElement('canvas'))
    await restored.loadFromJSON(canvas.toObject(EXTRA_SERIALIZED_PROPS))
    restored.renderAll()

    const ctx = restored.getContext()
    const erasedPixel = ctx.getImageData(150, 75, 1, 1).data
    const keptPixel = ctx.getImageData(50, 75, 1, 1).data
    expect(erasedPixel[3]).toBe(0)
    expect(keptPixel[3]).toBeGreaterThan(0)
  })

  it('왕복 후에도 획의 selectable=false·evented=false·isFreeDrawing·erasable이 유지된다', async () => {
    const { canvas } = await createCanvasWithErasedStroke()

    const restored = new Canvas(document.createElement('canvas'))
    await restored.loadFromJSON(canvas.toObject(EXTRA_SERIALIZED_PROPS))

    const [restoredStroke] = restored.getObjects()
    expect(restoredStroke.selectable).toBe(false)
    expect(restoredStroke.evented).toBe(false)
    expect(restoredStroke.isFreeDrawing).toBe(true)
    expect(restoredStroke.erasable).toBe(true)
  })

  it('지워진 획이 포함된 canvasJSON을 buildThumbnail(StaticCanvas)로 에러 없이 PNG로 만든다', async () => {
    const { canvas } = await createCanvasWithErasedStroke()

    const dataUrl = await buildThumbnail(canvas.toObject(EXTRA_SERIALIZED_PROPS), {
      width: 300,
      height: 150,
    })

    expect(dataUrl).toMatch(/^data:image\/png;base64,/)
  })
})

describe('에어브러시 산출물의 직렬화 왕복 (architecture 검증 가정 2)', () => {
  it('SprayBrush가 만든 Group이 왕복 후 같은 분사 점 개수와 박제 속성으로 복원된다', async () => {
    const canvas = new Canvas(document.createElement('canvas'))
    const brush = new SprayBrush(canvas)
    brush.onMouseDown(new Point(150, 75))
    brush.onMouseUp()
    const [sprayGroup] = canvas.getObjects()
    expect(sprayGroup).toBeInstanceOf(Group)
    // usePaintTools의 path:created 박제와 동일한 속성 부여
    sprayGroup.set(PINNED_STROKE_PROPS)

    const restored = new Canvas(document.createElement('canvas'))
    await restored.loadFromJSON(canvas.toObject(EXTRA_SERIALIZED_PROPS))

    const [restoredGroup] = restored.getObjects()
    expect(restoredGroup).toBeInstanceOf(Group)
    expect(restoredGroup.getObjects()).toHaveLength(sprayGroup.getObjects().length)
    expect(restoredGroup.selectable).toBe(false)
    expect(restoredGroup.evented).toBe(false)
    expect(restoredGroup.isFreeDrawing).toBe(true)
    expect(restoredGroup.erasable).toBe(true)
  })
})
