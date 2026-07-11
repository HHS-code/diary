import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Canvas, Rect } from 'fabric'
import { useCanvasKeyboardShortcuts } from './useCanvasKeyboardShortcuts'

function TestHost({ fabricCanvasRef }) {
  useCanvasKeyboardShortcuts(fabricCanvasRef)
  return null
}

function renderHost(fabricCanvasRef) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<TestHost fabricCanvasRef={fabricCanvasRef} />)
  })
  return () => {
    act(() => root.unmount())
    container.remove()
  }
}

function dispatchKeydown(init) {
  window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }))
}

describe('useCanvasKeyboardShortcuts', () => {
  let canvas
  let cleanup

  beforeEach(() => {
    const canvasEl = document.createElement('canvas')
    canvas = new Canvas(canvasEl)
  })

  afterEach(() => {
    cleanup?.()
  })

  it('Delete 키를 누르면 활성 오브젝트를 캔버스에서 제거한다', () => {
    const rect = new Rect({ left: 0, top: 0, width: 10, height: 10 })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    cleanup = renderHost({ current: canvas })

    act(() => {
      dispatchKeydown({ key: 'Delete' })
    })

    expect(canvas.getObjects()).toHaveLength(0)
  })

  it('Ctrl+C 후 Ctrl+V를 누르면 (10, 10) 오프셋된 복제본이 추가된다', async () => {
    const rect = new Rect({ left: 5, top: 5, width: 10, height: 10 })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    cleanup = renderHost({ current: canvas })

    await act(async () => {
      dispatchKeydown({ key: 'c', ctrlKey: true })
      await Promise.resolve()
    })
    await act(async () => {
      dispatchKeydown({ key: 'v', ctrlKey: true })
      await Promise.resolve()
    })

    expect(canvas.getObjects()).toHaveLength(2)
    const clone = canvas.getObjects()[1]
    expect(clone.left).toBe(15)
    expect(clone.top).toBe(15)
  })

  it('텍스트 편집 중(isEditing)이면 Delete를 눌러도 아무 일도 일어나지 않는다', () => {
    const rect = new Rect({ left: 0, top: 0, width: 10, height: 10 })
    rect.isEditing = true
    canvas.add(rect)
    canvas.setActiveObject(rect)
    cleanup = renderHost({ current: canvas })

    act(() => {
      dispatchKeydown({ key: 'Delete' })
    })

    expect(canvas.getObjects()).toHaveLength(1)
  })

  it('언마운트하면 keydown 리스너가 더 이상 반응하지 않는다', () => {
    const rect = new Rect({ left: 0, top: 0, width: 10, height: 10 })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    const unmount = renderHost({ current: canvas })

    unmount()
    cleanup = null

    act(() => {
      dispatchKeydown({ key: 'Delete' })
    })

    expect(canvas.getObjects()).toHaveLength(1)
  })
})
