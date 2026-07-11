import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImageUploadButton } from './ImageUploadButton/ImageUploadButton'
import { TextMemoButton } from './TextMemoButton/TextMemoButton'
import { ExportImportControls } from './ExportImportControls/ExportImportControls'
import { CanvasBackgroundControl } from './CanvasBackgroundControl/CanvasBackgroundControl'

let container
let root

function render(element) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(element)
  })
}

function findButtonByText(text) {
  const buttons = [...container.querySelectorAll('button')]
  return buttons.find((button) => button.textContent.includes(text))
}

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('버튼 아이콘 적용 (아이콘+텍스트 병기)', () => {
  it('ImageUploadButton의 "이미지 추가" 버튼에 svg 아이콘과 텍스트가 함께 있다', () => {
    render(<ImageUploadButton fabricCanvasRef={{ current: null }} />)

    const button = findButtonByText('이미지 추가')
    expect(button, '"이미지 추가" 버튼이 없음').toBeTruthy()
    expect(button.querySelector('svg'), 'svg 아이콘이 없음').toBeTruthy()
  })

  it('TextMemoButton의 "텍스트 추가" 버튼에 svg 아이콘과 텍스트가 함께 있다', () => {
    render(<TextMemoButton fabricCanvasRef={{ current: null }} />)

    const button = findButtonByText('텍스트 추가')
    expect(button, '"텍스트 추가" 버튼이 없음').toBeTruthy()
    expect(button.querySelector('svg'), 'svg 아이콘이 없음').toBeTruthy()
  })

  it('ExportImportControls의 버튼 3개에 각각 svg 아이콘과 텍스트가 함께 있다', () => {
    render(
      <ExportImportControls
        fabricCanvasRef={{ current: null }}
        selectedDate="2026-07-11"
        onImportSuccess={vi.fn()}
      />,
    )

    for (const text of ['JSON 내보내기', 'JSON 불러오기', 'PNG 내보내기']) {
      const button = findButtonByText(text)
      expect(button, `"${text}" 버튼이 없음`).toBeTruthy()
      expect(button.querySelector('svg'), `"${text}" 버튼에 svg 아이콘이 없음`).toBeTruthy()
    }
  })

  it('CanvasBackgroundControl에 배경색 아이콘과 "배경 이미지" 버튼 아이콘이 있다', () => {
    render(<CanvasBackgroundControl actions={{ setColor: vi.fn(), setImage: vi.fn() }} />)

    const imageButton = findButtonByText('배경 이미지')
    expect(imageButton, '"배경 이미지" 버튼이 없음').toBeTruthy()
    expect(imageButton.querySelector('svg'), '"배경 이미지" 버튼에 svg 아이콘이 없음').toBeTruthy()

    const svgCount = container.querySelectorAll('svg').length
    expect(svgCount, '배경색(팔레트) 아이콘이 없음 — svg가 2개 이상이어야 함').toBeGreaterThanOrEqual(2)
  })
})
