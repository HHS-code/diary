import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssetImportPanel } from './AssetImportPanel'

function createLibrary() {
  return {
    images: [],
    fonts: [],
    stickers: [],
    registerImage: vi.fn().mockResolvedValue('image-id'),
    registerFont: vi.fn().mockResolvedValue('font-id'),
    registerSticker: vi.fn().mockResolvedValue('sticker-id'),
    refresh: vi.fn().mockResolvedValue(undefined),
  }
}

function setInputFiles(input, files) {
  Object.defineProperty(input, 'files', { value: files, writable: false, configurable: true })
}

async function flushAsyncWork() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

let container
let root

function renderPanel(library, onSelectImage) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<AssetImportPanel library={library} onSelectImage={onSelectImage} />)
  })
}

function getFileSelectInput() {
  return [...container.querySelectorAll('input[type="file"]')].find(
    (input) => !input.hasAttribute('webkitdirectory'),
  )
}

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('AssetImportPanel', () => {
  it('파일 선택 input에 이미지 1개 + 폰트 1개를 넣으면 각각 registerImage/registerFont가 1번씩 호출된다', async () => {
    const library = createLibrary()
    renderPanel(library)
    const input = getFileSelectInput()
    const imageFile = new File(['x'], 'cat.png', { type: 'image/png' })
    const fontFile = new File(['x'], 'MyFont.ttf', { type: 'font/ttf' })
    setInputFiles(input, [imageFile, fontFile])

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await flushAsyncWork()
    })

    expect(library.registerImage).toHaveBeenCalledTimes(1)
    expect(library.registerImage).toHaveBeenCalledWith(imageFile)
    expect(library.registerFont).toHaveBeenCalledTimes(1)
    expect(library.registerFont).toHaveBeenCalledWith(fontFile)
  })

  it('지원하지 않는 확장자(.txt) 파일은 무시하고 등록 함수를 호출하지 않는다', async () => {
    const library = createLibrary()
    renderPanel(library)
    const input = getFileSelectInput()
    const textFile = new File(['x'], 'notes.txt', { type: 'text/plain' })
    setInputFiles(input, [textFile])

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await flushAsyncWork()
    })

    expect(library.registerImage).not.toHaveBeenCalled()
    expect(library.registerFont).not.toHaveBeenCalled()
  })

  it('등록된 이미지/폰트 파일명을 목록에 표시한다', () => {
    const library = createLibrary()
    library.images = [{ id: '1', filename: 'cat.png', blob: new Blob(['x'], { type: 'image/png' }) }]
    library.fonts = [{ id: '2', filename: 'MyFont.ttf' }]
    renderPanel(library)

    expect(container.textContent).toContain('cat.png')
    expect(container.textContent).toContain('MyFont.ttf')
  })

  it('이미지 목록을 썸네일 img 태그로 렌더링한다', () => {
    const library = createLibrary()
    library.images = [{ id: '1', filename: 'cat.png', blob: new Blob(['x'], { type: 'image/png' }) }]
    renderPanel(library)

    const img = container.querySelector('img[alt="cat.png"]')
    expect(img).not.toBeNull()
    expect(img.src).toMatch(/^blob:/)
  })

  it('이미지 목록 항목을 클릭하면 onSelectImage가 해당 asset과 함께 호출된다', () => {
    const library = createLibrary()
    const asset = { id: '1', filename: 'cat.png', blob: new Blob(['x'], { type: 'image/png' }) }
    library.images = [asset]
    const onSelectImage = vi.fn()
    renderPanel(library, onSelectImage)

    const button = [...container.querySelectorAll('button')].find((el) =>
      el.querySelector('img[alt="cat.png"]'),
    )
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onSelectImage).toHaveBeenCalledTimes(1)
    expect(onSelectImage).toHaveBeenCalledWith(asset)
  })

  it('library.stickers가 있을 때 "스티커" 섹션이 개수와 함께 렌더링되고, 클릭 시 onSelectImage가 해당 스티커 asset과 함께 호출된다', () => {
    const library = createLibrary()
    const sticker = { id: '1', filename: 'my-sticker.png', blob: new Blob(['x'], { type: 'image/png' }) }
    library.stickers = [sticker]
    const onSelectImage = vi.fn()
    renderPanel(library, onSelectImage)

    expect(container.textContent).toContain('스티커 (1)')
    const img = container.querySelector('img[alt="my-sticker.png"]')
    expect(img).not.toBeNull()
    expect(img.src).toMatch(/^blob:/)

    const button = [...container.querySelectorAll('button')].find((el) =>
      el.querySelector('img[alt="my-sticker.png"]'),
    )
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onSelectImage).toHaveBeenCalledTimes(1)
    expect(onSelectImage).toHaveBeenCalledWith(sticker)
  })
})
