import { describe, expect, it } from 'vitest'
import { Canvas, Rect } from 'fabric'
import { scaleCanvasObjects } from './canvasMigration'

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
