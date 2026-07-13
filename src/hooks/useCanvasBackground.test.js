import { describe, expect, it, vi } from 'vitest'
import { Canvas, Rect } from 'fabric'
import { useCanvasBackground } from './useCanvasBackground'

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

  it('fabricCanvasRef.current가 없으면 아무 동작도 하지 않는다', () => {
    const { setColor, lockBackground, clearBackground } = useCanvasBackground({ current: null })

    expect(() => setColor('#ffcc00')).not.toThrow()
    expect(() => lockBackground()).not.toThrow()
    expect(() => clearBackground()).not.toThrow()
  })
})
