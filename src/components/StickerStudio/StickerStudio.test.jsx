import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { StickerStudio } from './StickerStudio'

let container
let root

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
})
