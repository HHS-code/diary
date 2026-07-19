import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Canvas, Rect } from 'fabric'
import { useCanvasKeyboardShortcuts } from './useCanvasKeyboardShortcuts'

function TestHost({ fabricCanvasRef, registerAndPlaceImage, registerAndPlaceYoutubeCard }) {
  useCanvasKeyboardShortcuts(fabricCanvasRef, { registerAndPlaceImage, registerAndPlaceYoutubeCard })
  return null
}

function renderHost(fabricCanvasRef, registerAndPlaceImage, registerAndPlaceYoutubeCard) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      <TestHost
        fabricCanvasRef={fabricCanvasRef}
        registerAndPlaceImage={registerAndPlaceImage}
        registerAndPlaceYoutubeCard={registerAndPlaceYoutubeCard}
      />,
    )
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

function dispatchPaste(clipboardData) {
  const event = new Event('paste', { bubbles: true })
  Object.defineProperty(event, 'clipboardData', { value: clipboardData ?? null })
  window.dispatchEvent(event)
}

function makeEmptyClipboardData() {
  return { files: [], items: [] }
}

function makeTextClipboardData(text) {
  return { files: [], items: [], getData: () => text }
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

  it('Backspace 키를 누르면 활성 오브젝트를 캔버스에서 제거한다', () => {
    const rect = new Rect({ left: 0, top: 0, width: 10, height: 10 })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    cleanup = renderHost({ current: canvas })

    act(() => {
      dispatchKeydown({ key: 'Backspace' })
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
      dispatchPaste(makeEmptyClipboardData())
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

  it('텍스트 편집 중(isEditing)이면 Backspace를 눌러도 아무 일도 일어나지 않는다(글자 지우기 유지)', () => {
    const rect = new Rect({ left: 0, top: 0, width: 10, height: 10 })
    rect.isEditing = true
    canvas.add(rect)
    canvas.setActiveObject(rect)
    cleanup = renderHost({ current: canvas })

    act(() => {
      dispatchKeydown({ key: 'Backspace' })
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

  it('클립보드에 이미지가 있으면 Ctrl+V 시 registerAndPlaceImage로 등록·배치하고 오브젝트 붙여넣기는 하지 않는다', async () => {
    stubClipboardRead(async () => [makeClipboardImageItem()])
    const registerAndPlaceImage = vi.fn().mockResolvedValue('asset-id')
    const rect = new Rect({ left: 5, top: 5, width: 10, height: 10 })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    cleanup = renderHost({ current: canvas }, registerAndPlaceImage)

    await act(async () => {
      dispatchKeydown({ key: 'c', ctrlKey: true })
      await Promise.resolve()
    })
    await act(async () => {
      dispatchPaste(makeEmptyClipboardData())
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(registerAndPlaceImage).toHaveBeenCalledTimes(1)
    expect(registerAndPlaceImage.mock.calls[0][0]).toBeInstanceOf(File)
    expect(canvas.getObjects()).toHaveLength(1)
  })

  it('클립보드에 이미지가 없으면 기존과 동일하게 오브젝트 붙여넣기가 동작한다', async () => {
    stubClipboardRead(async () => [])
    const registerAndPlaceImage = vi.fn()
    const rect = new Rect({ left: 5, top: 5, width: 10, height: 10 })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    cleanup = renderHost({ current: canvas }, registerAndPlaceImage)

    await act(async () => {
      dispatchKeydown({ key: 'c', ctrlKey: true })
      await Promise.resolve()
    })
    await act(async () => {
      dispatchPaste(makeEmptyClipboardData())
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(registerAndPlaceImage).not.toHaveBeenCalled()
    expect(canvas.getObjects()).toHaveLength(2)
  })

  it('navigator.clipboard.read가 예외를 던지면 기존 오브젝트 붙여넣기로 폴백한다', async () => {
    stubClipboardRead(async () => {
      throw new Error('permission denied')
    })
    const registerAndPlaceImage = vi.fn()
    const rect = new Rect({ left: 5, top: 5, width: 10, height: 10 })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    cleanup = renderHost({ current: canvas }, registerAndPlaceImage)

    await act(async () => {
      dispatchKeydown({ key: 'c', ctrlKey: true })
      await Promise.resolve()
    })
    await act(async () => {
      dispatchPaste(makeEmptyClipboardData())
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(registerAndPlaceImage).not.toHaveBeenCalled()
    expect(canvas.getObjects()).toHaveLength(2)
  })

  it('paste 이벤트의 clipboardData.files에 이미지가 있으면 navigator.clipboard.read보다 우선해 registerAndPlaceImage로 등록한다', async () => {
    stubClipboardRead(async () => {
      throw new Error('should not be called when native paste has an image file')
    })
    const registerAndPlaceImage = vi.fn().mockResolvedValue('asset-id')
    const rect = new Rect({ left: 5, top: 5, width: 10, height: 10 })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    cleanup = renderHost({ current: canvas }, registerAndPlaceImage)

    const imageFile = new File(['fake-image-bytes'], 'explorer-copy.png', { type: 'image/png' })
    await act(async () => {
      dispatchPaste({ files: [imageFile], items: [] })
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(registerAndPlaceImage).toHaveBeenCalledTimes(1)
    expect(registerAndPlaceImage.mock.calls[0][0]).toBe(imageFile)
    expect(canvas.getObjects()).toHaveLength(1)
  })

  it('클립보드 텍스트가 유튜브 URL이면 Ctrl+V 시 registerAndPlaceYoutubeCard가 추출된 videoId로 호출된다', async () => {
    stubClipboardRead(async () => [])
    const registerAndPlaceYoutubeCard = vi.fn().mockResolvedValue(undefined)
    cleanup = renderHost({ current: canvas }, undefined, registerAndPlaceYoutubeCard)

    await act(async () => {
      dispatchPaste(makeTextClipboardData('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(registerAndPlaceYoutubeCard).toHaveBeenCalledTimes(1)
    expect(registerAndPlaceYoutubeCard).toHaveBeenCalledWith('dQw4w9WgXcQ')
    expect(canvas.getObjects()).toHaveLength(0)
  })

  it('네이티브 이미지 파일이 있으면 유튜브 URL 텍스트가 같이 있어도 이미지 붙여넣기가 우선된다', async () => {
    const registerAndPlaceImage = vi.fn().mockResolvedValue('asset-id')
    const registerAndPlaceYoutubeCard = vi.fn()
    cleanup = renderHost({ current: canvas }, registerAndPlaceImage, registerAndPlaceYoutubeCard)

    const imageFile = new File(['fake-image-bytes'], 'explorer-copy.png', { type: 'image/png' })
    await act(async () => {
      dispatchPaste({
        files: [imageFile],
        items: [],
        getData: () => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      })
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(registerAndPlaceImage).toHaveBeenCalledTimes(1)
    expect(registerAndPlaceYoutubeCard).not.toHaveBeenCalled()
  })

  it('클립보드 텍스트가 유튜브 URL이 아닌 일반 텍스트면 기존 오브젝트 붙여넣기로 폴백한다', async () => {
    stubClipboardRead(async () => [])
    const registerAndPlaceYoutubeCard = vi.fn()
    const rect = new Rect({ left: 5, top: 5, width: 10, height: 10 })
    canvas.add(rect)
    canvas.setActiveObject(rect)
    cleanup = renderHost({ current: canvas }, undefined, registerAndPlaceYoutubeCard)

    await act(async () => {
      dispatchKeydown({ key: 'c', ctrlKey: true })
      await Promise.resolve()
    })
    await act(async () => {
      dispatchPaste(makeTextClipboardData('그냥 텍스트입니다'))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(registerAndPlaceYoutubeCard).not.toHaveBeenCalled()
    expect(canvas.getObjects()).toHaveLength(2)
  })

  it('텍스트 편집 중(isEditing)이면 유튜브 URL을 붙여넣어도 아무 동작이 없다', async () => {
    const registerAndPlaceYoutubeCard = vi.fn()
    const rect = new Rect({ left: 0, top: 0, width: 10, height: 10 })
    rect.isEditing = true
    canvas.add(rect)
    canvas.setActiveObject(rect)
    cleanup = renderHost({ current: canvas }, undefined, registerAndPlaceYoutubeCard)

    await act(async () => {
      dispatchPaste(makeTextClipboardData('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
      await Promise.resolve()
    })

    expect(registerAndPlaceYoutubeCard).not.toHaveBeenCalled()
    expect(canvas.getObjects()).toHaveLength(1)
  })
})
