import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaintToolbox } from './PaintToolbox'

const TOOL_LABELS = {
  select: '선택',
  pencil: '연필',
  brush: '브러시',
  airbrush: '에어브러시',
  eraser: '지우개',
}

function defaultProps(overrides = {}) {
  return {
    tool: 'select',
    color: '#000000',
    width: 4,
    onToolChange: vi.fn(),
    onColorChange: vi.fn(),
    onWidthChange: vi.fn(),
    ...overrides,
  }
}

let container
let root

function renderToolbox(props) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<PaintToolbox {...props} />)
  })
}

function findButtonByLabel(label) {
  const buttons = [...container.querySelectorAll('button')]
  return buttons.find((button) => button.getAttribute('aria-label') === label)
}

function findWidthButtons() {
  const buttons = [...container.querySelectorAll('button')]
  return buttons.filter((button) => button.getAttribute('aria-label')?.startsWith('굵기'))
}

function findColorButtons() {
  const buttons = [...container.querySelectorAll('button')]
  return buttons.filter((button) => button.getAttribute('aria-label')?.startsWith('색상'))
}

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('PaintToolbox (그리기 도구 패널)', () => {
  it('도구 버튼 5개(선택/연필/브러시/에어브러시/지우개)가 모두 렌더링된다', () => {
    renderToolbox(defaultProps())

    for (const label of Object.values(TOOL_LABELS)) {
      expect(findButtonByLabel(label), `"${label}" 버튼이 없음`).toBeTruthy()
    }
  })

  it('도구 버튼을 클릭하면 onToolChange가 해당 도구명으로 호출된다', () => {
    const props = defaultProps()
    renderToolbox(props)

    for (const [tool, label] of Object.entries(TOOL_LABELS)) {
      act(() => {
        findButtonByLabel(label).click()
      })
      expect(props.onToolChange).toHaveBeenLastCalledWith(tool)
    }
  })

  it('현재 tool 버튼만 aria-pressed=true로 눌린 상태가 표시된다', () => {
    renderToolbox(defaultProps({ tool: 'brush' }))

    expect(findButtonByLabel('브러시').getAttribute('aria-pressed')).toBe('true')
    for (const label of ['선택', '연필', '에어브러시', '지우개']) {
      expect(findButtonByLabel(label).getAttribute('aria-pressed'), `"${label}"가 눌린 상태임`).toBe('false')
    }
  })

  it('색상 칸을 클릭하면 onColorChange가 해당 색상값으로 호출된다', () => {
    const props = defaultProps({ tool: 'brush' })
    renderToolbox(props)

    const red = findButtonByLabel('색상 #FF0000')
    expect(red, '빨강 색상 칸이 없음').toBeTruthy()
    act(() => {
      red.click()
    })

    expect(props.onColorChange).toHaveBeenCalledWith('#FF0000')
  })

  it('색상 팔레트는 2행 14열 = 28색이다', () => {
    renderToolbox(defaultProps())

    expect(findColorButtons()).toHaveLength(28)
  })

  it('굵기 버튼을 클릭하면 onWidthChange가 해당 숫자 굵기로 호출된다', () => {
    const props = defaultProps({ tool: 'brush' })
    renderToolbox(props)

    const widthButtons = findWidthButtons()
    expect(widthButtons.length, '굵기 버튼이 없음').toBeGreaterThan(0)
    act(() => {
      widthButtons[0].click()
    })

    expect(props.onWidthChange).toHaveBeenCalledWith(expect.any(Number))
  })

  it('pencil 도구일 때 굵기 버튼이 모두 비활성(disabled)이다 — 굵기 1 고정', () => {
    renderToolbox(defaultProps({ tool: 'pencil' }))

    for (const button of findWidthButtons()) {
      expect(button.disabled, `"${button.getAttribute('aria-label')}"가 disabled가 아님`).toBe(true)
    }
  })

  it('select 도구일 때도 굵기 버튼이 비활성이다', () => {
    renderToolbox(defaultProps({ tool: 'select' }))

    for (const button of findWidthButtons()) {
      expect(button.disabled).toBe(true)
    }
  })

  it('brush 도구일 때는 굵기 버튼이 활성이다', () => {
    renderToolbox(defaultProps({ tool: 'brush' }))

    for (const button of findWidthButtons()) {
      expect(button.disabled).toBe(false)
    }
  })
})
