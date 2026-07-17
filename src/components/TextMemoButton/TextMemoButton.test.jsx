import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TextMemoButton } from './TextMemoButton'

vi.mock('../../hooks/useFontRegistry', () => ({
  useFontRegistry: vi.fn(() => ({
    customFonts: [{ label: 'MyCustomFont', value: 'MyCustomFont' }],
  })),
}))

let container
let root

function renderButton() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<TextMemoButton fabricCanvasRef={{ current: null }} />)
  })
}

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('TextMemoButton', () => {
  it('텍스트 추가 버튼을 누르면 드롭다운에 기존 폰트 8종과 커스텀 폰트가 모두 나타난다', () => {
    renderButton()
    act(() => {
      container.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const options = [...container.querySelectorAll('select option')].map((option) => option.value)
    expect(options).toContain('Nanum Pen Script')
    expect(options).toContain('Shadows Into Light')
    expect(options).toContain('MyCustomFont')
    expect(options).toHaveLength(9)
  })
})
