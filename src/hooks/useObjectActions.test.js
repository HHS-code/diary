import { describe, expect, it } from 'vitest'
import { Canvas, Rect } from 'fabric'
import { useObjectActions } from './useObjectActions'

function createCanvasWithRect() {
  const canvasEl = document.createElement('canvas')
  const canvas = new Canvas(canvasEl)
  const rect = new Rect({ left: 100, top: 100, width: 50, height: 50 })
  canvas.add(rect)
  return { canvas, rect }
}

describe('useObjectActions', () => {
  it('copy는 원본에서 (10, 10)만큼 오프셋된 위치에 복제본을 추가한다', async () => {
    const { canvas, rect } = createCanvasWithRect()
    const { copy } = useObjectActions({ current: canvas })

    await copy(rect)

    expect(canvas.getObjects()).toHaveLength(2)
    const clone = canvas.getObjects()[1]
    expect(clone.left).toBe(110)
    expect(clone.top).toBe(110)
    expect(canvas.getActiveObject()).toBe(clone)
  })

  it('remove는 대상 오브젝트를 캔버스에서 제거한다', () => {
    const { canvas, rect } = createCanvasWithRect()
    const { remove } = useObjectActions({ current: canvas })

    remove(rect)

    expect(canvas.getObjects()).toHaveLength(0)
  })

  it('bringToFront는 오브젝트를 맨 앞(배열 마지막)으로 옮긴다', () => {
    const canvasEl = document.createElement('canvas')
    const canvas = new Canvas(canvasEl)
    const back = new Rect({ left: 0, top: 0, width: 10, height: 10 })
    const middle = new Rect({ left: 10, top: 10, width: 10, height: 10 })
    const front = new Rect({ left: 20, top: 20, width: 10, height: 10 })
    canvas.add(back, middle, front)
    const { bringToFront } = useObjectActions({ current: canvas })

    bringToFront(back)

    expect(canvas.getObjects().at(-1)).toBe(back)
  })

  it('sendToBack은 오브젝트를 맨 뒤(배열 처음)로 옮긴다', () => {
    const canvasEl = document.createElement('canvas')
    const canvas = new Canvas(canvasEl)
    const back = new Rect({ left: 0, top: 0, width: 10, height: 10 })
    const middle = new Rect({ left: 10, top: 10, width: 10, height: 10 })
    const front = new Rect({ left: 20, top: 20, width: 10, height: 10 })
    canvas.add(back, middle, front)
    const { sendToBack } = useObjectActions({ current: canvas })

    sendToBack(front)

    expect(canvas.getObjects()[0]).toBe(front)
  })

  it('fabricCanvasRef.current가 없으면 아무 동작도 하지 않는다', () => {
    const { remove } = useObjectActions({ current: null })
    const rect = new Rect({ left: 0, top: 0, width: 10, height: 10 })

    expect(() => remove(rect)).not.toThrow()
  })
})
