import { describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, Rect } from 'fabric'
import { useCanvasHistory } from './useCanvasHistory'

// react-dom이 act() 사용을 허용하도록 하는 React 테스트 환경 플래그
globalThis.IS_REACT_ACT_ENVIRONMENT = true

/** 훅을 실제 React 렌더링 안에서 실행하고, 최신 반환값을 result로 노출한다. */
function renderCanvasHistory(fabricCanvasRef) {
  const result = {}
  function HookHarness() {
    Object.assign(result, useCanvasHistory(fabricCanvasRef))
    return null
  }
  const root = createRoot(document.createElement('div'))
  act(() => root.render(createElement(HookHarness)))
  return result
}

function createCanvas() {
  return new Canvas(document.createElement('canvas'))
}

function addRect(canvas) {
  canvas.add(new Rect({ width: 10, height: 10 }))
}

describe('useCanvasHistory', () => {
  it('오브젝트 추가 후 undo하면 사라지고, redo하면 다시 나타난다', async () => {
    const canvas = createCanvas()
    const result = renderCanvasHistory({ current: canvas })

    act(() => addRect(canvas))
    await vi.waitFor(() => expect(result.canUndo).toBe(true))

    act(() => result.undo())
    await vi.waitFor(() => expect(canvas.getObjects()).toHaveLength(0))

    act(() => result.redo())
    await vi.waitFor(() => expect(canvas.getObjects()).toHaveLength(1))
  })

  it('변경 2회 후 undo 2회를 하면 초기 상태(빈 캔버스)로 돌아간다', async () => {
    const canvas = createCanvas()
    const result = renderCanvasHistory({ current: canvas })

    act(() => addRect(canvas))
    await vi.waitFor(() => expect(canvas.getObjects()).toHaveLength(1))
    act(() => addRect(canvas))
    await vi.waitFor(() => expect(canvas.getObjects()).toHaveLength(2))

    act(() => result.undo())
    await vi.waitFor(() => expect(canvas.getObjects()).toHaveLength(1))
    act(() => result.undo())
    await vi.waitFor(() => expect(canvas.getObjects()).toHaveLength(0))
  })

  it('undo 후 새 변경을 하면 redo가 불가능해진다', async () => {
    const canvas = createCanvas()
    const result = renderCanvasHistory({ current: canvas })

    act(() => addRect(canvas))
    await vi.waitFor(() => expect(result.canUndo).toBe(true))

    act(() => result.undo())
    await vi.waitFor(() => expect(result.canRedo).toBe(true))

    act(() => addRect(canvas))
    await vi.waitFor(() => expect(result.canRedo).toBe(false))
  })

  it('31회 변경 시 히스토리가 30개로 제한되어, 가장 오래된 상태로는 undo할 수 없다', async () => {
    const canvas = createCanvas()
    const result = renderCanvasHistory({ current: canvas })

    for (let i = 0; i < 31; i += 1) {
      act(() => addRect(canvas))
      // eslint-disable-next-line no-await-in-loop
      await vi.waitFor(() => expect(canvas.getObjects()).toHaveLength(i + 1))
    }

    for (let i = 0; i < 40; i += 1) {
      if (!result.canUndo) break
      act(() => result.undo())
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    // 히스토리가 무제한이었다면 초기 빈 캔버스(0개)까지 돌아갔겠지만,
    // 30개 제한 때문에 가장 오래된 스냅샷들은 이미 버려져 1개가 남는다.
    expect(canvas.getObjects().length).toBeGreaterThan(0)
  })

  it('복원(loadFromJSON) 중 발생하는 이벤트가 히스토리에 쌓이지 않는다', async () => {
    const canvas = createCanvas()
    const result = renderCanvasHistory({ current: canvas })

    act(() => addRect(canvas))
    await vi.waitFor(() => expect(result.canUndo).toBe(true))

    act(() => result.undo())
    await vi.waitFor(() => expect(canvas.getObjects()).toHaveLength(0))
    // 복원 중 fabric이 발생시키는 object:removed 등이 새 히스토리로 잘못
    // 기록됐다면 canUndo가 계속 true로 남아 더 되돌릴 것처럼 보인다.
    expect(result.canUndo).toBe(false)

    act(() => result.redo())
    await vi.waitFor(() => expect(canvas.getObjects()).toHaveLength(1))
    expect(result.canRedo).toBe(false)
  })

  it('Ctrl+Z keydown으로 undo가 호출된다', async () => {
    const canvas = createCanvas()
    renderCanvasHistory({ current: canvas })

    act(() => addRect(canvas))
    await vi.waitFor(() => expect(canvas.getObjects()).toHaveLength(1))

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    })
    await vi.waitFor(() => expect(canvas.getObjects()).toHaveLength(0))
  })

  it('IText 편집 중에는 Ctrl+Z를 가로채지 않는다', async () => {
    const canvas = createCanvas()
    renderCanvasHistory({ current: canvas })

    act(() => addRect(canvas))
    await vi.waitFor(() => expect(canvas.getObjects()).toHaveLength(1))
    canvas.getActiveObject = () => ({ isEditing: true })

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(canvas.getObjects()).toHaveLength(1)
  })
})
