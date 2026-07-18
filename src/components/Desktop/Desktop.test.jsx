import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Desktop } from './Desktop'

let container
let root

function renderDesktop(props) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<Desktop {...props} />)
  })
}

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('Desktop', () => {
  it('diary 아이콘을 클릭하면 onOpenDiary가 호출된다', () => {
    const onOpenDiary = vi.fn()
    const onOpenStickerStudio = vi.fn()
    renderDesktop({ onOpenDiary, onOpenStickerStudio })

    act(() => {
      container.querySelector('button[aria-label="diary"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
    })

    expect(onOpenDiary).toHaveBeenCalledTimes(1)
    expect(onOpenStickerStudio).not.toHaveBeenCalled()
  })

  it('스티커 스튜디오 아이콘을 클릭하면 onOpenStickerStudio가 호출된다', () => {
    const onOpenDiary = vi.fn()
    const onOpenStickerStudio = vi.fn()
    renderDesktop({ onOpenDiary, onOpenStickerStudio })

    act(() => {
      container.querySelector('button[aria-label="sticker studio"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
    })

    expect(onOpenStickerStudio).toHaveBeenCalledTimes(1)
    expect(onOpenDiary).not.toHaveBeenCalled()
  })
})
