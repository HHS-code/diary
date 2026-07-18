import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Canvas, Rect } from 'fabric'
import { useCanvasKeyboardShortcuts } from './useCanvasKeyboardShortcuts'

function TestHost({ fabricCanvasRef, registerImage }) {
  useCanvasKeyboardShortcuts(fabricCanvasRef, { registerImage })
  return null
}

function renderHost(fabricCanvasRef, registerImage) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<TestHost fabricCanvasRef={fabricCanvasRef} registerImage={registerImage} />)
  })
  return () => {
    act(() => root.unmount())
    container.remove()
  }
}

function stubClipboardRead(implementation) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { read: implementation },
    configurable: true,
  })
}

function makeClipboardImageItem(mimeType = 'image/png') {
  return {
    types: [mimeType],
    getType: async () => new Blob(['fake-image-bytes'], { type: mimeType }),
  }
}

function dispatchKeydown(init) {
  window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }))
}

describe('useCanvasKeyboardShortcuts', () => {
  let canvas
  let cleanup
  let originalClipboard

  beforeEach(() => {
    const canvasEl = document.createElement('canvas')
    canvas = new Canvas(canvasEl)
    originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  })

  afterEach(() => {
    cleanup?.()
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard)
    } else {
      delete navigator.clipboard
    }
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

  it('클립보드에 이미지가 있으면 Ctrl+V 시 registerImage로 등록만 하고 오브젝트 붙여넣기는 하지 않는다', async () => {
    stubClipboardRead(async () => [makeClipboardImageItem()])
    const registerImage = vi.fn().mockResolvedValue('asset-id')
    const rect = new Rect({ left: 5, top: 5, width: 10, height: 10 })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    cleanup = renderHost({ current: canvas }, registerImage)

    await act(async () => {
      dispatchKeydown({ key: 'c', ctrlKey: true })
      await Promise.resolve()
    })
    await act(async () => {
      dispatchKeydown({ key: 'v', ctrlKey: true })
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(registerImage).toHaveBeenCalledTimes(1)
    expect(registerImage.mock.calls[0][0]).toBeInstanceOf(File)
    expect(canvas.getObjects()).toHaveLength(1)
  })

  it('클립보드에 이미지가 없으면 기존과 동일하게 오브젝트 붙여넣기가 동작한다', async () => {
    stubClipboardRead(async () => [])
    const registerImage = vi.fn()
    const rect = new Rect({ left: 5, top: 5, width: 10, height: 10 })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    cleanup = renderHost({ current: canvas }, registerImage)

    await act(async () => {
      dispatchKeydown({ key: 'c', ctrlKey: true })
      await Promise.resolve()
    })
    await act(async () => {
      dispatchKeydown({ key: 'v', ctrlKey: true })
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(registerImage).not.toHaveBeenCalled()
    expect(canvas.getObjects()).toHaveLength(2)
  })

  it('navigator.clipboard.read가 예외를 던지면 기존 오브젝트 붙여넣기로 폴백한다', async () => {
    stubClipboardRead(async () => {
      throw new Error('permission denied')
    })
    const registerImage = vi.fn()
    const rect = new Rect({ left: 5, top: 5, width: 10, height: 10 })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    cleanup = renderHost({ current: canvas }, registerImage)

    await act(async () => {
      dispatchKeydown({ key: 'c', ctrlKey: true })
      await Promise.resolve()
    })
    await act(async () => {
      dispatchKeydown({ key: 'v', ctrlKey: true })
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(registerImage).not.toHaveBeenCalled()
    expect(canvas.getObjects()).toHaveLength(2)
  })
})
