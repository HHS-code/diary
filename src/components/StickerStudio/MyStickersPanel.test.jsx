import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MyStickersPanel } from './MyStickersPanel'

let container
let root

function renderPanel(stickers, onSelectSticker) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<MyStickersPanel stickers={stickers} onSelectSticker={onSelectSticker} />)
  })
}

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('MyStickersPanel', () => {
  it('스티커 목록을 썸네일 img 태그로 렌더링한다', () => {
    const sticker = { id: '1', filename: 'my-sticker.png', blob: new Blob(['x'], { type: 'image/png' }) }
    renderPanel([sticker], vi.fn())

    expect(container.textContent).toContain('내 스티커 (1)')
    const img = container.querySelector('img[alt="my-sticker.png"]')
    expect(img).not.toBeNull()
    expect(img.src).toMatch(/^blob:/)
  })

  it('스티커 항목을 클릭하면 onSelectSticker가 해당 asset과 함께 호출된다', () => {
    const sticker = { id: '1', filename: 'my-sticker.png', blob: new Blob(['x'], { type: 'image/png' }) }
    const onSelectSticker = vi.fn()
    renderPanel([sticker], onSelectSticker)

    const button = [...container.querySelectorAll('button')].find((el) =>
      el.querySelector('img[alt="my-sticker.png"]'),
    )
    act(() => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onSelectSticker).toHaveBeenCalledTimes(1)
    expect(onSelectSticker).toHaveBeenCalledWith(sticker)
  })
})
