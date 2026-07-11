import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ObjectToolbar } from './ObjectToolbar'

const BUTTON_LABELS = ['복사', '삭제', '맨 앞으로', '맨 뒤로', '한 단계 앞으로', '한 단계 뒤로']

function createActions() {
  return {
    copy: vi.fn(),
    remove: vi.fn(),
    bringToFront: vi.fn(),
    sendToBack: vi.fn(),
    bringForward: vi.fn(),
    sendBackward: vi.fn(),
  }
}

let container
let root

function renderToolbar(props) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<ObjectToolbar {...props} />)
  })
}

function findButtonByLabel(label) {
  const buttons = [...container.querySelectorAll('button')]
  return buttons.find((button) => button.getAttribute('aria-label') === label)
}

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('ObjectToolbar (고정 패널)', () => {
  it('activeObject가 null이어도 버튼 6개가 모두 렌더링된다', () => {
    renderToolbar({ activeObject: null, actions: createActions() })

    for (const label of BUTTON_LABELS) {
      expect(findButtonByLabel(label), `"${label}" 버튼이 없음`).toBeTruthy()
    }
  })

  it('activeObject가 null이면 모든 버튼이 disabled 상태다', () => {
    renderToolbar({ activeObject: null, actions: createActions() })

    for (const label of BUTTON_LABELS) {
      expect(findButtonByLabel(label).disabled, `"${label}" 버튼이 disabled가 아님`).toBe(true)
    }
  })

  it('activeObject가 있으면 모든 버튼이 활성화된다', () => {
    renderToolbar({ activeObject: {}, actions: createActions() })

    for (const label of BUTTON_LABELS) {
      expect(findButtonByLabel(label).disabled, `"${label}" 버튼이 disabled임`).toBe(false)
    }
  })

  it('복사 버튼을 클릭하면 actions.copy가 activeObject를 인자로 호출된다', () => {
    const actions = createActions()
    const activeObject = { id: 'target' }
    renderToolbar({ activeObject, actions })

    act(() => {
      findButtonByLabel('복사').click()
    })

    expect(actions.copy).toHaveBeenCalledWith(activeObject)
  })

  it('삭제 버튼을 클릭하면 actions.remove가 activeObject를 인자로 호출된다', () => {
    const actions = createActions()
    const activeObject = { id: 'target' }
    renderToolbar({ activeObject, actions })

    act(() => {
      findButtonByLabel('삭제').click()
    })

    expect(actions.remove).toHaveBeenCalledWith(activeObject)
  })

  it('각 버튼은 아이콘(svg)만 표시하고 title/aria-label로 의미를 전달한다', () => {
    renderToolbar({ activeObject: null, actions: createActions() })

    for (const label of BUTTON_LABELS) {
      const button = findButtonByLabel(label)
      expect(button.querySelector('svg'), `"${label}" 버튼에 svg 아이콘이 없음`).toBeTruthy()
      expect(button.getAttribute('title'), `"${label}" 버튼에 title이 없음`).toBe(label)
      expect(button.textContent, `"${label}" 버튼에 텍스트가 남아 있음`).toBe('')
    }
  })

  it('플로팅 배치가 아니다 — position: absolute를 사용하지 않는다', () => {
    renderToolbar({ activeObject: {}, actions: createActions() })

    const positioned = [...container.querySelectorAll('*')].filter(
      (el) => el.style.position === 'absolute',
    )
    expect(positioned).toHaveLength(0)
  })
})
