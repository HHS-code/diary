import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Canvas, FabricImage, Rect } from 'fabric'
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

function fireCanvasMouseEvent(canvas, type, x, y, target) {
  act(() => {
    canvas.fire(`mouse:${type}`, { scenePoint: { x, y }, target })
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
    // 지우개 미리보기용 "지울 수 없는" 배경 Rect가 다시 깔리므로(addUnerasableBackground),
    // 크롭 결과 이미지 외에 화면에 안 보이는 배경 오브젝트 하나가 더 있는 게 정상이다.
    const images = canvas.getObjects().filter((object) => object instanceof FabricImage)
    expect(images).toHaveLength(1)
    expect(images[0]).not.toBe(existing)
    expect(images[0].width).toBe(100)
    expect(images[0].height).toBe(200)
    expect(canvas.getObjects().some((object) => object.erasable === false)).toBe(true)
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

  it('드래그로 그린 뒤 사각형은 선택·조절 가능한 상태(hasControls)로 바뀐다', () => {
    const fabricCanvasRef = { current: canvas }
    const host = renderHost(fabricCanvasRef)
    cleanup = host.cleanup

    act(() => host.getCropTool().startCropping())
    dragCropArea(canvas)

    const [rect] = canvas.getObjects().filter((object) => object instanceof Rect)
    expect(rect.selectable).toBe(true)
    expect(rect.hasControls).toBe(true)
    expect(canvas.getActiveObject()).toBe(rect)
  })

  it('핸들로 크기를 다시 조절한 뒤 적용하면 조절된 크기로 잘라낸다', () => {
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
    const [rect] = canvas.getObjects().filter((object) => object instanceof Rect)
    // 모서리 핸들 드래그를 흉내낸다: 가로/세로를 1.5배로 키운다(scaleX/scaleY 조작).
    act(() => rect.set({ scaleX: 1.5, scaleY: 1.5 }))

    act(() => host.getCropTool().applyCrop())

    expect(canvas.toCanvasElement).toHaveBeenCalledWith(1, { left: 10, top: 20, width: 150, height: 300 })
  })

  it('조절 가능한 사각형이 아닌 새 지점을 드래그하면 기존 사각형을 버리고 새로 그린다', () => {
    const fabricCanvasRef = { current: canvas }
    const host = renderHost(fabricCanvasRef)
    cleanup = host.cleanup

    act(() => host.getCropTool().startCropping())
    dragCropArea(canvas)
    const [firstRect] = canvas.getObjects().filter((object) => object instanceof Rect)

    fireCanvasMouseEvent(canvas, 'down', 200, 200)
    fireCanvasMouseEvent(canvas, 'move', 250, 260)
    fireCanvasMouseEvent(canvas, 'up', 250, 260)

    const rects = canvas.getObjects().filter((object) => object instanceof Rect)
    expect(rects).toHaveLength(1)
    expect(rects[0]).not.toBe(firstRect)
    expect(rects[0]).toMatchObject({ left: 200, top: 200, width: 50, height: 60 })
  })

  it('조절 가능해진 사각형 자체를 누르면 새로 그리지 않고 기존 사각형을 그대로 둔다', () => {
    const fabricCanvasRef = { current: canvas }
    const host = renderHost(fabricCanvasRef)
    cleanup = host.cleanup

    act(() => host.getCropTool().startCropping())
    dragCropArea(canvas)
    const [rect] = canvas.getObjects().filter((object) => object instanceof Rect)

    fireCanvasMouseEvent(canvas, 'down', 50, 100, rect)

    const rects = canvas.getObjects().filter((object) => object instanceof Rect)
    expect(rects).toHaveLength(1)
    expect(rects[0]).toBe(rect)
  })
})
