import { describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, Group, Path, PencilBrush, SprayBrush } from 'fabric'
import { usePaintTools } from './usePaintTools'

// react-dom이 act() 사용을 허용하도록 하는 React 테스트 환경 플래그
globalThis.IS_REACT_ACT_ENVIRONMENT = true

/** 훅을 실제 React 렌더링 안에서 실행하고, 최신 반환값을 result로 노출한다. */
function renderPaintTools(fabricCanvasRef) {
  const result = {}
  function HookHarness() {
    Object.assign(result, usePaintTools(fabricCanvasRef))
    return null
  }
  const root = createRoot(document.createElement('div'))
  act(() => root.render(createElement(HookHarness)))
  return result
}

function createCanvas() {
  return new Canvas(document.createElement('canvas'))
}

describe('usePaintTools', () => {
  it('기본값은 select 도구·검정색이고, 캔버스는 그리기 모드가 아니다', () => {
    const canvas = createCanvas()

    const result = renderPaintTools({ current: canvas })

    expect(result.tool).toBe('select')
    expect(result.color).toBe('#000000')
    expect(canvas.isDrawingMode).toBeFalsy()
  })

  it('pencil 선택 시 그리기 모드가 켜지고 굵기 1 고정 PencilBrush가 설정된다', () => {
    const canvas = createCanvas()
    const result = renderPaintTools({ current: canvas })

    act(() => result.setTool('pencil'))

    expect(canvas.isDrawingMode).toBe(true)
    expect(canvas.freeDrawingBrush).toBeInstanceOf(PencilBrush)
    expect(canvas.freeDrawingBrush.width).toBe(1)
    expect(canvas.freeDrawingBrush.color).toBe('#000000')
  })

  it('brush 선택 시 width 상태값을 굵기로 쓰는 PencilBrush가 설정된다', () => {
    const canvas = createCanvas()
    const result = renderPaintTools({ current: canvas })

    act(() => result.setTool('brush'))

    expect(canvas.isDrawingMode).toBe(true)
    expect(canvas.freeDrawingBrush).toBeInstanceOf(PencilBrush)
    expect(canvas.freeDrawingBrush.width).toBe(result.width)
  })

  it('airbrush 선택 시 SprayBrush가 설정되고 굵기·밀도가 width 기반이다', () => {
    const canvas = createCanvas()
    const result = renderPaintTools({ current: canvas })

    act(() => result.setWidth(8))
    act(() => result.setTool('airbrush'))

    expect(canvas.isDrawingMode).toBe(true)
    expect(canvas.freeDrawingBrush).toBeInstanceOf(SprayBrush)
    expect(canvas.freeDrawingBrush.width).toBe(8)
    expect(canvas.freeDrawingBrush.density).toBe(8 * 5)
  })

  it('그리기 도구에서 select로 돌아오면 그리기 모드가 꺼진다', () => {
    const canvas = createCanvas()
    const result = renderPaintTools({ current: canvas })

    act(() => result.setTool('brush'))
    act(() => result.setTool('select'))

    expect(canvas.isDrawingMode).toBe(false)
  })

  it('path:created로 생성된 획은 선택 불가로 박제되고 isFreeDrawing·erasable가 붙는다', () => {
    const canvas = createCanvas()
    renderPaintTools({ current: canvas })
    const path = new Path('M 0 0 L 10 10')

    canvas.fire('path:created', { path })

    expect(path.selectable).toBe(false)
    expect(path.evented).toBe(false)
    expect(path.isFreeDrawing).toBe(true)
    expect(path.erasable).toBe(true)
  })

  it('에어브러시 산출물(Group)도 path:created에서 동일하게 박제된다', () => {
    const canvas = createCanvas()
    renderPaintTools({ current: canvas })
    const group = new Group([])

    canvas.fire('path:created', { path: group })

    expect(group.selectable).toBe(false)
    expect(group.evented).toBe(false)
    expect(group.isFreeDrawing).toBe(true)
    expect(group.erasable).toBe(true)
  })

  it('setColor는 활성 브러시의 색상에 즉시 반영된다', () => {
    const canvas = createCanvas()
    const result = renderPaintTools({ current: canvas })

    act(() => result.setTool('brush'))
    act(() => result.setColor('#ff0000'))

    expect(result.color).toBe('#ff0000')
    expect(canvas.freeDrawingBrush.color).toBe('#ff0000')
  })

  it('setWidth는 활성 브러시의 굵기에 즉시 반영된다', () => {
    const canvas = createCanvas()
    const result = renderPaintTools({ current: canvas })

    act(() => result.setTool('brush'))
    act(() => result.setWidth(12))

    expect(result.width).toBe(12)
    expect(canvas.freeDrawingBrush.width).toBe(12)
  })

  it('pencil은 setWidth 후에도 굵기 1을 유지한다', () => {
    const canvas = createCanvas()
    const result = renderPaintTools({ current: canvas })

    act(() => result.setTool('pencil'))
    act(() => result.setWidth(12))

    expect(canvas.freeDrawingBrush.width).toBe(1)
  })

  it('fabricCanvasRef.current가 없으면 setTool이 던지지 않는다', () => {
    const result = renderPaintTools({ current: null })

    expect(() => act(() => result.setTool('brush'))).not.toThrow()
  })
})
