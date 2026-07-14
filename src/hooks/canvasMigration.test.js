import { describe, expect, it } from 'vitest'
import { Canvas, Rect } from 'fabric'
import { scaleCanvasObjects, fitCanvasObjects } from './canvasMigration'

function createCanvas() {
  const canvasEl = document.createElement('canvas')
  return new Canvas(canvasEl)
}

describe('scaleCanvasObjects', () => {
  it('800×600에서 1400×900으로 옮기면 좌표와 크기가 비율대로 늘어난다', () => {
    const canvas = createCanvas()
    const rect = new Rect({ left: 100, top: 60, width: 50, height: 50, scaleX: 2, scaleY: 2 })
    canvas.add(rect)

    scaleCanvasObjects(canvas, { width: 800, height: 600 }, { width: 1400, height: 900 })

    // scaleX 비율 = 1400/800 = 1.75, scaleY 비율 = 900/600 = 1.5
    expect(rect.left).toBeCloseTo(175)
    expect(rect.top).toBeCloseTo(90)
    expect(rect.scaleX).toBeCloseTo(3.5)
    expect(rect.scaleY).toBeCloseTo(3)
  })

  it('같은 크기면 아무것도 안 바뀐다', () => {
    const canvas = createCanvas()
    const rect = new Rect({ left: 100, top: 60, width: 50, height: 50 })
    canvas.add(rect)

    scaleCanvasObjects(canvas, { width: 800, height: 600 }, { width: 800, height: 600 })

    expect(rect.left).toBe(100)
    expect(rect.top).toBe(60)
    expect(rect.scaleX).toBe(1)
    expect(rect.scaleY).toBe(1)
  })

  it('배경 이미지가 있으면 배경도 동일 비율로 스케일된다', () => {
    const canvas = createCanvas()
    const background = new Rect({ left: 0, top: 0, width: 800, height: 600 })
    canvas.backgroundImage = background

    scaleCanvasObjects(canvas, { width: 800, height: 600 }, { width: 1400, height: 900 })

    expect(background.scaleX).toBeCloseTo(1.75)
    expect(background.scaleY).toBeCloseTo(1.5)
  })
})

describe('fitCanvasObjects', () => {
  it('800×600에서 1600×1000으로 옮기면 비율 유지 배율(min)로 균일 확대되고 가운데 정렬된다', () => {
    const canvas = createCanvas()
    const rect = new Rect({ left: 100, top: 60, width: 50, height: 50, scaleX: 2, scaleY: 2 })
    canvas.add(rect)

    fitCanvasObjects(canvas, { width: 800, height: 600 }, { width: 1600, height: 1000 })

    // 배율 = min(1600/800=2, 1000/600≈1.667) = 5/3, 가로 여백 = (1600 - 800*5/3)/2 = 400/3
    const scale = 1000 / 600
    const offsetX = (1600 - 800 * scale) / 2
    expect(rect.left).toBeCloseTo(100 * scale + offsetX)
    expect(rect.top).toBeCloseTo(60 * scale) // 세로는 여백 0
    expect(rect.scaleX).toBeCloseTo(2 * scale)
    expect(rect.scaleY).toBeCloseTo(2 * scale) // 가로/세로 동일 배율 — 찌그러짐 없음
  })

  it('같은 크기면 아무것도 안 바뀐다', () => {
    const canvas = createCanvas()
    const rect = new Rect({ left: 100, top: 60, width: 50, height: 50 })
    canvas.add(rect)

    fitCanvasObjects(canvas, { width: 1600, height: 1000 }, { width: 1600, height: 1000 })

    expect(rect.left).toBe(100)
    expect(rect.top).toBe(60)
    expect(rect.scaleX).toBe(1)
  })

  it('배경 이미지도 동일한 균일 배율과 오프셋으로 옮겨진다', () => {
    const canvas = createCanvas()
    const background = new Rect({ left: 0, top: 0, width: 800, height: 600 })
    canvas.backgroundImage = background

    fitCanvasObjects(canvas, { width: 800, height: 600 }, { width: 1600, height: 1000 })

    const scale = 1000 / 600
    const offsetX = (1600 - 800 * scale) / 2
    expect(background.left).toBeCloseTo(offsetX)
    expect(background.scaleX).toBeCloseTo(scale)
    expect(background.scaleY).toBeCloseTo(scale)
  })
})

describe('표시 배율과 PNG 출력 크기', () => {
  /** PNG 헤더(IHDR)에서 픽셀 크기를 읽는다. 바이트 16~23이 width/height(빅엔디언 uint32). */
  function parsePngSize(dataUrl) {
    const base64 = dataUrl.split(',')[1]
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const view = new DataView(bytes.buffer)
    return { width: view.getUint32(16), height: view.getUint32(20) }
  }

  it('축소 표시(zoom 0.5) 상태에서도 multiplier 역보정으로 항상 1600×1000 PNG가 나온다', () => {
    const canvasEl = document.createElement('canvas')
    // 논리 1600×1000을 0.5 배율로 표시하는 상황 재현
    const canvas = new Canvas(canvasEl, { width: 800, height: 500 })
    canvas.setZoom(0.5)
    canvas.add(new Rect({ left: 100, top: 100, width: 50, height: 50 }))

    const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 1600 / canvas.getWidth() })

    expect(parsePngSize(dataUrl)).toEqual({ width: 1600, height: 1000 })
  })
})
