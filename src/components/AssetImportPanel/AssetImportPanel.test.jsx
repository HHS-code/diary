import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssetImportPanel } from './AssetImportPanel'

function createLibrary() {
  return {
    images: [],
    fonts: [],
    registerImage: vi.fn().mockResolvedValue('image-id'),
    registerFont: vi.fn().mockResolvedValue('font-id'),
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

function renderPanel(library) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<AssetImportPanel library={library} />)
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
    library.images = [{ id: '1', filename: 'cat.png' }]
    library.fonts = [{ id: '2', filename: 'MyFont.ttf' }]
    renderPanel(library)

    expect(container.textContent).toContain('cat.png')
    expect(container.textContent).toContain('MyFont.ttf')
  })
})
