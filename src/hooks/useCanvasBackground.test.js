import { describe, expect, it, vi } from 'vitest'
import { Canvas } from 'fabric'
import { useCanvasBackground } from './useCanvasBackground'

function createCanvas() {
  const canvasEl = document.createElement('canvas')
  return new Canvas(canvasEl)
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

  it('fabricCanvasRef.current가 없으면 아무 동작도 하지 않는다', () => {
    const { setColor } = useCanvasBackground({ current: null })

    expect(() => setColor('#ffcc00')).not.toThrow()
  })
})
