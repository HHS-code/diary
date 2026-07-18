import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StickerStudio } from './StickerStudio'

const registerSticker = vi.fn().mockResolvedValue('sticker-id')

vi.mock('../../hooks/useAssetLibrary', () => ({
  useAssetLibrary: vi.fn(() => ({
    stickers: [],
    registerSticker,
  })),
}))

let container
let root

// jsdom의 canvas.toBlob은 node-canvas의 toBuffer(스레드풀 비동기 인코딩)를 거쳐 콜백을
// 호출하므로 완료 시점이 한 틱보다 길게 걸릴 수 있다 — 짧은 간격으로 폴링해서 기다린다.
async function waitUntil(predicate, timeoutMs = 5000, intervalMs = 20) {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitUntil timed out')
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
}

// fabric의 StaticCanvasDOMManager가 <canvas>를 wrapper div로 감싸며 React가
// 모르는 DOM 구조 변경을 일으켜, root.unmount()의 DOM 제거 단계에서
// jsdom이 "not a child of this node"를 던진다(useFabricCanvas.test.js와 동일 이유).
async function unmountIgnoringKnownDomWrapperError() {
  try {
    await act(async () => {
      root.unmount()
    })
  } catch (error) {
    if (!(error instanceof DOMException)) throw error
  }
}

afterEach(async () => {
  await unmountIgnoringKnownDomWrapperError()
  container.remove()
})

describe('StickerStudio', () => {
  it('에러 없이 마운트되고 캔버스 엘리먼트를 렌더링한다', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<StickerStudio />)
    })

    expect(container.querySelector('canvas')).not.toBeNull()
  })

  it('"테두리 추가" 버튼을 누르면 두께 슬라이더와 적용 버튼이 나타나고, 다시 누르면 사라진다', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<StickerStudio />)
    })

    const buttons = Array.from(container.querySelectorAll('button'))
    const outlineToggleButton = buttons.find((button) => button.textContent === '테두리 추가')

    await act(async () => {
      outlineToggleButton.click()
    })

    expect(container.querySelector('input[type="range"]')).not.toBeNull()
    expect(Array.from(container.querySelectorAll('button')).some((b) => b.textContent === '적용')).toBe(true)

    await act(async () => {
      outlineToggleButton.click()
    })

    expect(container.querySelector('input[type="range"]')).toBeNull()
  })

  it('"완성" 버튼을 누르면 registerSticker가 PNG Blob과 함께 호출된다', async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<StickerStudio />)
    })

    const saveButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === '완성',
    )

    await act(async () => {
      saveButton.click()
      await waitUntil(() => registerSticker.mock.calls.length > 0)
    })

    expect(registerSticker).toHaveBeenCalledTimes(1)
    const [blob, filename] = registerSticker.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
    expect(filename).toMatch(/^sticker-\d+\.png$/)
  })
})
