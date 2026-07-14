import { describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, Group, Path, PencilBrush, Point, Rect, SprayBrush } from 'fabric'
import { ClippingGroup, EraserBrush } from '@erase2d/fabric'
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

  it('eraser 선택 시 그리기 모드가 켜지고 width 굵기의 EraserBrush가 설정된다', () => {
    const canvas = createCanvas()
    const result = renderPaintTools({ current: canvas })

    act(() => result.setWidth(10))
    act(() => result.setTool('eraser'))

    expect(canvas.isDrawingMode).toBe(true)
    expect(canvas.freeDrawingBrush).toBeInstanceOf(EraserBrush)
    expect(canvas.freeDrawingBrush.width).toBe(10)
  })

  /** 지우개가 (150,0)→(150,150) 세로로 지나간 상황을 드래그 없이 재현한다. */
  function finishEraserStrokeAcross(eraser) {
    eraser._points = [new Point(150, 0), new Point(150, 150)]
    eraser._finalizeAndAddPath()
  }

  it('지우개가 지나가면 erasable 획에만 지운 자국(ClippingGroup clipPath)이 커밋된다', async () => {
    const canvas = createCanvas()
    const stroke = new Path('M 0 75 L 300 75', { stroke: '#000000', strokeWidth: 4, fill: null, erasable: true })
    // 스티커/사진/텍스트에 해당 — erasable 미설정(기본 false)
    const sticker = new Rect({ left: 100, top: 25, width: 100, height: 100, fill: '#00ff00' })
    canvas.add(stroke, sticker)
    const result = renderPaintTools({ current: canvas })
    act(() => result.setTool('eraser'))

    finishEraserStrokeAcross(canvas.freeDrawingBrush)

    await vi.waitFor(() => expect(stroke.clipPath).toBeInstanceOf(ClippingGroup))
    expect(sticker.clipPath).toBeUndefined()
  })

  it('지운 커밋이 끝나면 object:modified를 발생시켜 기존 오토세이브 파이프라인을 태운다', async () => {
    const canvas = createCanvas()
    const stroke = new Path('M 0 75 L 300 75', { stroke: '#000000', strokeWidth: 4, fill: null, erasable: true })
    canvas.add(stroke)
    const result = renderPaintTools({ current: canvas })
    act(() => result.setTool('eraser'))
    const onModified = vi.fn()
    canvas.on('object:modified', onModified)

    finishEraserStrokeAcross(canvas.freeDrawingBrush)

    await vi.waitFor(() => expect(onModified).toHaveBeenCalled())
    expect(stroke.clipPath).toBeInstanceOf(ClippingGroup)
  })

  it('아무것도 지우지 못한 드래그는 커밋도 object:modified도 발생시키지 않는다', async () => {
    const canvas = createCanvas()
    const stroke = new Path('M 0 75 L 300 75', { stroke: '#000000', strokeWidth: 4, fill: null, erasable: true })
    canvas.add(stroke)
    const result = renderPaintTools({ current: canvas })
    act(() => result.setTool('eraser'))
    const onModified = vi.fn()
    canvas.on('object:modified', onModified)

    const eraser = canvas.freeDrawingBrush
    eraser._points = [new Point(5, 5), new Point(10, 10)]
    eraser._finalizeAndAddPath()

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(stroke.clipPath).toBeUndefined()
    expect(onModified).not.toHaveBeenCalled()
  })
})
