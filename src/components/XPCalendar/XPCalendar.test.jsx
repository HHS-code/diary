import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { XPCalendar } from './XPCalendar'

let container
let root

function renderCalendar(props) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<XPCalendar {...props} />)
  })
}

function createProps(overrides = {}) {
  return {
    selectedDate: '',
    onSelectDate: vi.fn(),
    currentYear: 2026,
    currentMonth: 6,
    onChangeMonth: vi.fn(),
    ...overrides,
  }
}

function findDayCellButton(day) {
  const buttons = [...container.querySelectorAll('button')]
  return buttons.find((button) => button.textContent === String(day))
}

function findWriteButton() {
  const buttons = [...container.querySelectorAll('button')]
  return buttons.find((button) => button.textContent === '작성')
}

function hoverDayCell(day) {
  act(() => {
    findDayCellButton(day).dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  })
}

function unhoverDayCell(day) {
  act(() => {
    findDayCellButton(day).dispatchEvent(
      new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }),
    )
  })
}

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('XPCalendar (날짜 호버 작성 버튼)', () => {
  it('마우스를 올리기 전에는 작성 버튼이 보이지 않는다', () => {
    renderCalendar(createProps())

    expect(findWriteButton()).toBeUndefined()
  })

  it('날짜 셀에 마우스를 올리면 작성 버튼이 나타난다', () => {
    renderCalendar(createProps())

    hoverDayCell(15)

    expect(findWriteButton()).toBeTruthy()
  })

  it('날짜 셀에서 마우스가 벗어나면 작성 버튼이 사라진다', () => {
    renderCalendar(createProps())

    hoverDayCell(15)
    unhoverDayCell(15)

    expect(findWriteButton()).toBeUndefined()
  })

  it('작성 버튼을 클릭하면 onSelectDate가 해당 날짜 키로 정확히 1회 호출된다', () => {
    const onSelectDate = vi.fn()
    renderCalendar(createProps({ onSelectDate }))

    hoverDayCell(15)
    act(() => {
      findWriteButton().click()
    })

    expect(onSelectDate).toHaveBeenCalledTimes(1)
    expect(onSelectDate).toHaveBeenCalledWith('2026-07-15')
  })

  it('날짜 셀 자체를 클릭하는 기존 동작은 그대로 onSelectDate를 호출한다', () => {
    const onSelectDate = vi.fn()
    renderCalendar(createProps({ onSelectDate }))

    act(() => {
      findDayCellButton(15).click()
    })

    expect(onSelectDate).toHaveBeenCalledTimes(1)
    expect(onSelectDate).toHaveBeenCalledWith('2026-07-15')
  })
})
