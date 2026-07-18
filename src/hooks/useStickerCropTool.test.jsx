import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Canvas, Rect } from 'fabric'
import { useStickerCropTool } from './useStickerCropTool'

function TestHost({ fabricCanvasRef, onReady }) {
  const cropTool = useStickerCropTool(fabricCanvasRef)
  onReady(cropTool)
  return null
}

function renderHost(fabricCanvasRef) {
  let cropTool
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      <TestHost
        fabricCanvasRef={fabricCanvasRef}
        onReady={(tool) => {
          cropTool = tool
        }}
      />,
    )
  })
  return {
    getCropTool: () => cropTool,
    cleanup: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

function fireCanvasMouseEvent(canvas, type, x, y) {
  act(() => {
    canvas.fire(`mouse:${type}`, { scenePoint: { x, y } })
  })
}

// 크롭 드래그 시작(10,20) → 이동(110,220): 100x200 영역을 표시한다.
function dragCropArea(canvas) {
  fireCanvasMouseEvent(canvas, 'down', 10, 20)
  fireCanvasMouseEvent(canvas, 'move', 110, 220)
  fireCanvasMouseEvent(canvas, 'up', 110, 220)
}

describe('useStickerCropTool', () => {
  let canvas
  let cleanup

  beforeEach(() => {
    const canvasEl = document.createElement('canvas')
    canvas = new Canvas(canvasEl, { width: 512, height: 512 })
  })

  afterEach(() => {
    cleanup?.()
  })

  it('startCropping 후 드래그하면 임시 사각형 영역이 캔버스에 표시된다', () => {
    const fabricCanvasRef = { current: canvas }
    const host = renderHost(fabricCanvasRef)
    cleanup = host.cleanup

    act(() => host.getCropTool().startCropping())
    dragCropArea(canvas)

    const rects = canvas.getObjects().filter((object) => object instanceof Rect)
    expect(rects).toHaveLength(1)
    expect(rects[0]).toMatchObject({ left: 10, top: 20, width: 100, height: 200 })
  })

  it('cancelCropping은 표시된 영역만 지우고 캔버스에 있던 기존 오브젝트는 그대로 둔다', () => {
    const existing = new Rect({ left: 0, top: 0, width: 30, height: 30 })
    canvas.add(existing)
    const fabricCanvasRef = { current: canvas }
    const host = renderHost(fabricCanvasRef)
    cleanup = host.cleanup

    act(() => host.getCropTool().startCropping())
    dragCropArea(canvas)
    act(() => host.getCropTool().cancelCropping())

    expect(canvas.getObjects()).toEqual([existing])
    expect(host.getCropTool().isCropping).toBe(false)
  })

  it('applyCrop은 지정한 영역을 잘라낸 이미지 하나만 남기고 이전 오브젝트들을 제거한다', () => {
    const existing = new Rect({ left: 0, top: 0, width: 30, height: 30 })
    canvas.add(existing)
    // jsdom에는 실제 캔버스 렌더링 백엔드가 없어 toCanvasElement가 픽셀을 그릴 수 없다.
    // AC가 허용하는 대로, 요청된 크기의 빈 캔버스를 돌려주는 구조적 스텁으로 검증한다.
    canvas.toCanvasElement = vi.fn((multiplier, options) => {
      const el = document.createElement('canvas')
      el.width = options.width
      el.height = options.height
      return el
    })

    const fabricCanvasRef = { current: canvas }
    const host = renderHost(fabricCanvasRef)
    cleanup = host.cleanup

    act(() => host.getCropTool().startCropping())
    dragCropArea(canvas)
    act(() => host.getCropTool().applyCrop())

    expect(canvas.toCanvasElement).toHaveBeenCalledWith(1, { left: 10, top: 20, width: 100, height: 200 })
    const objects = canvas.getObjects()
    expect(objects).toHaveLength(1)
    expect(objects[0]).not.toBe(existing)
    expect(objects[0].width).toBe(100)
    expect(objects[0].height).toBe(200)
    expect(host.getCropTool().isCropping).toBe(false)
  })

  it('영역을 드래그하지 않고 적용을 누르면 아무 것도 바뀌지 않는다', () => {
    const existing = new Rect({ left: 0, top: 0, width: 30, height: 30 })
    canvas.add(existing)
    const fabricCanvasRef = { current: canvas }
    const host = renderHost(fabricCanvasRef)
    cleanup = host.cleanup

    act(() => host.getCropTool().startCropping())
    act(() => host.getCropTool().applyCrop())

    expect(canvas.getObjects()).toEqual([existing])
  })
})
