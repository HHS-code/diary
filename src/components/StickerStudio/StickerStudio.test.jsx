import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { Canvas, FabricImage, Path } from 'fabric'
import { StickerStudio } from './StickerStudio'
import { removeBackgroundFromImage } from '../../ai/backgroundRemoval'

const registerSticker = vi.fn().mockResolvedValue('sticker-id')

vi.mock('../../hooks/useAssetLibrary', () => ({
  useAssetLibrary: vi.fn(() => ({
    stickers: [],
    registerSticker,
  })),
}))

vi.mock('../../ai/backgroundRemoval', () => ({
  removeBackgroundFromImage: vi.fn(),
}))

// jsdom은 <img>.src를 설정해도 실제로 로드하지 않아 onload가 영영 안 온다.
// StickerImageUpload.test.jsx와 동일하게, 이미지 업로드로 캔버스에 대상 이미지를
// 하나 올려둔 뒤 "AI 배경제거" 버튼을 눌러야 하므로 같은 우회가 필요하다.
let nextImageSize = { width: 100, height: 80 }
beforeAll(() => {
  const nativeDescriptor = Object.getOwnPropertyDescriptor(window.HTMLImageElement.prototype, 'src')
  Object.defineProperty(window.HTMLImageElement.prototype, 'src', {
    configurable: true,
    get() {
      return nativeDescriptor.get.call(this)
    },
    set(value) {
      nativeDescriptor.set.call(this, value)
      if (!value) return
      Object.defineProperty(this, 'width', { value: nextImageSize.width, configurable: true })
      Object.defineProperty(this, 'height', { value: nextImageSize.height, configurable: true })
      Object.defineProperty(this, 'complete', { value: true, configurable: true })
      setTimeout(() => this.onload && this.onload())
    },
  })
  const ctxProto = Object.getPrototypeOf(document.createElement('canvas').getContext('2d'))
  ctxProto.drawImage = function drawImage() {}
})

async function uploadImageToCanvas(container) {
  const input = container.querySelector('input[type="file"]')
  const file = new File(['fake-image-bytes'], 'cat.png', { type: 'image/png' })
  Object.defineProperty(input, 'files', { value: [file], writable: false, configurable: true })
  await act(async () => {
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
}

function findButtonByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text)
}

// StickerStudio가 내부적으로 만드는 fabric Canvas 인스턴스는 컴포넌트 밖에 노출되지 않는다.
// Canvas.prototype.on은 마운트 시 usePaintTools/StickerStudio의 path:created 구독에서 곧바로
// 호출되므로, 그 호출의 this(=mock.instances[0])를 잡아 인스턴스를 얻는다.
async function mountStickerStudioAndGetFabricCanvas() {
  const onSpy = vi.spyOn(Canvas.prototype, 'on')
  await act(async () => {
    root.render(<StickerStudio />)
  })
  const fabricCanvas = onSpy.mock.instances[0]
  onSpy.mockRestore()
  return fabricCanvas
}

// 도구 전환(tool 상태 변경)과 path:created 발생을 한 act() 안에서 동시에 처리하면, 발행
// 시점에 아직 이전 tool 값을 캡처한 구독이 반응해 보정 영역이 무시된다 — 도구 전환이 먼저
// 이펙트로 재구독을 마치도록 act()를 둘로 나눈다.
async function drawAiCorrectionRegion(container, fabricCanvas) {
  const aiCorrectionToolButton = container.querySelector('button[aria-label="AI 보정"]')
  await act(async () => {
    aiCorrectionToolButton.click()
  })
  const regionPath = new Path('M 0 0 L 40 0 L 40 40 L 0 40 Z')
  await act(async () => {
    fabricCanvas.add(regionPath)
    fabricCanvas.fire('path:created', { path: regionPath })
  })
}

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
  removeBackgroundFromImage.mockReset()
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

  describe('AI 배경제거', () => {
    it('클릭 즉시 버튼이 비활성화되고 "처리 중..."으로 바뀐다', async () => {
      container = document.createElement('div')
      document.body.appendChild(container)
      root = createRoot(container)

      await act(async () => {
        root.render(<StickerStudio />)
      })
      await uploadImageToCanvas(container)

      removeBackgroundFromImage.mockReturnValue(new Promise(() => {}))
      const button = findButtonByText(container, 'AI 배경제거')

      await act(async () => {
        button.click()
      })

      expect(button.disabled).toBe(true)
      expect(button.textContent).toBe('처리 중...')
    })

    it('성공 시 캔버스의 대상 오브젝트가 교체되고 버튼이 재활성화된다', async () => {
      container = document.createElement('div')
      document.body.appendChild(container)
      root = createRoot(container)

      await act(async () => {
        root.render(<StickerStudio />)
      })
      await uploadImageToCanvas(container)

      const resultBlob = new Blob(['fake-png-bytes'], { type: 'image/png' })
      removeBackgroundFromImage.mockResolvedValue(resultBlob)
      const addSpy = vi.spyOn(Canvas.prototype, 'add')
      const removeSpy = vi.spyOn(Canvas.prototype, 'remove')

      const button = findButtonByText(container, 'AI 배경제거')

      await act(async () => {
        button.click()
      })
      // button.click() 직후에는 상태가 'processing'으로 아직 반영되지 않은 순간이 있어
      // (setBackgroundRemovalStatus가 React 배치 업데이트라 동기 클릭 시점엔 미반영),
      // "disabled===false"만 보는 waitUntil이 그 찰나에 통과해버릴 수 있다(레이스 컨디션).
      // removeBackgroundFromImage 호출 자체를 기다리는 게 실제로 원하는 완료 조건이다.
      await waitUntil(() => removeBackgroundFromImage.mock.calls.length > 0 && button.disabled === false)

      expect(button.textContent).toBe('AI 배경제거')
      expect(removeBackgroundFromImage).toHaveBeenCalledTimes(1)

      const removedTarget = removeSpy.mock.calls.at(-1)[0]
      const addedResult = addSpy.mock.calls.at(-1)[0]
      expect(addedResult).not.toBe(removedTarget)
      expect(addedResult).toBeInstanceOf(FabricImage)

      addSpy.mockRestore()
      removeSpy.mockRestore()
    })

    it('실패(reject) 시에도 버튼이 재활성화된다', async () => {
      container = document.createElement('div')
      document.body.appendChild(container)
      root = createRoot(container)

      await act(async () => {
        root.render(<StickerStudio />)
      })
      await uploadImageToCanvas(container)

      removeBackgroundFromImage.mockRejectedValue(new Error('model load failed'))
      const button = findButtonByText(container, 'AI 배경제거')

      await act(async () => {
        button.click()
        await waitUntil(() => button.disabled === false)
      })

      expect(button.disabled).toBe(false)
    })

    it('AI 배경제거 직전 상태를 캡처해 removeBackgroundFromImage에 전달한다(다음 step의 복원용 저장)', async () => {
      container = document.createElement('div')
      document.body.appendChild(container)
      root = createRoot(container)

      await act(async () => {
        root.render(<StickerStudio />)
      })
      await uploadImageToCanvas(container)

      removeBackgroundFromImage.mockResolvedValue(new Blob(['x'], { type: 'image/png' }))
      const toCanvasElementSpy = vi.spyOn(Canvas.prototype, 'toCanvasElement')
      const button = findButtonByText(container, 'AI 배경제거')

      await act(async () => {
        button.click()
        await waitUntil(() => button.disabled === false)
      })

      expect(toCanvasElementSpy).toHaveBeenCalled()
      const capturedElement = toCanvasElementSpy.mock.results[0].value
      expect(removeBackgroundFromImage.mock.calls[0][0]).toBe(capturedElement)

      toCanvasElementSpy.mockRestore()
    })
  })

  describe('AI 보정', () => {
    it('AI 배경제거를 한 번도 하지 않은 상태로 "AI 보정" 도구를 선택하면 "복원" 버튼이 비활성화된다', async () => {
      container = document.createElement('div')
      document.body.appendChild(container)
      root = createRoot(container)

      await act(async () => {
        root.render(<StickerStudio />)
      })

      const restoreButton = findButtonByText(container, '복원')
      const eraseButton = findButtonByText(container, '삭제')

      expect(restoreButton.disabled).toBe(true)
      expect(eraseButton.disabled).toBe(true)
    })

    it('AI 배경제거 성공 후에도 보정 영역을 그리기 전에는 "복원"/"삭제" 버튼이 비활성화된다', async () => {
      container = document.createElement('div')
      document.body.appendChild(container)
      root = createRoot(container)

      await act(async () => {
        root.render(<StickerStudio />)
      })
      await uploadImageToCanvas(container)

      removeBackgroundFromImage.mockResolvedValue(new Blob(['x'], { type: 'image/png' }))
      const removeBgButton = findButtonByText(container, 'AI 배경제거')
      await act(async () => {
        removeBgButton.click()
        await waitUntil(() => removeBgButton.disabled === false)
      })

      expect(findButtonByText(container, '복원').disabled).toBe(true)
      expect(findButtonByText(container, '삭제').disabled).toBe(true)
    })

    it('AI 배경제거 후 보정 영역을 그리고 "복원"을 누르면 대상 오브젝트가 교체되고 버튼이 다시 비활성화된다', async () => {
      container = document.createElement('div')
      document.body.appendChild(container)
      root = createRoot(container)

      const fabricCanvas = await mountStickerStudioAndGetFabricCanvas()
      await uploadImageToCanvas(container)

      removeBackgroundFromImage.mockResolvedValue(new Blob(['x'], { type: 'image/png' }))
      const removeBgButton = findButtonByText(container, 'AI 배경제거')
      await act(async () => {
        removeBgButton.click()
        await waitUntil(() => removeBgButton.disabled === false)
      })

      await drawAiCorrectionRegion(container, fabricCanvas)

      const restoreButton = findButtonByText(container, '복원')
      expect(restoreButton.disabled).toBe(false)

      const addSpy = vi.spyOn(Canvas.prototype, 'add')
      const removeSpy = vi.spyOn(Canvas.prototype, 'remove')

      await act(async () => {
        restoreButton.click()
      })

      const removedTarget = removeSpy.mock.calls.at(-1)[0]
      const addedResult = addSpy.mock.calls.at(-1)[0]
      expect(addedResult).not.toBe(removedTarget)
      expect(addedResult).toBeInstanceOf(FabricImage)
      expect(findButtonByText(container, '복원').disabled).toBe(true)

      addSpy.mockRestore()
      removeSpy.mockRestore()
    })

    it('AI 배경제거 없이도 보정 영역을 그리고 "삭제"를 누르면 대상 오브젝트가 교체된다', async () => {
      container = document.createElement('div')
      document.body.appendChild(container)
      root = createRoot(container)

      const fabricCanvas = await mountStickerStudioAndGetFabricCanvas()
      await uploadImageToCanvas(container)

      await drawAiCorrectionRegion(container, fabricCanvas)

      const eraseButton = findButtonByText(container, '삭제')
      expect(eraseButton.disabled).toBe(false)

      const addSpy = vi.spyOn(Canvas.prototype, 'add')
      const removeSpy = vi.spyOn(Canvas.prototype, 'remove')

      await act(async () => {
        eraseButton.click()
      })

      const removedTarget = removeSpy.mock.calls.at(-1)[0]
      const addedResult = addSpy.mock.calls.at(-1)[0]
      expect(addedResult).not.toBe(removedTarget)
      expect(addedResult).toBeInstanceOf(FabricImage)
      expect(findButtonByText(container, '삭제').disabled).toBe(true)

      addSpy.mockRestore()
      removeSpy.mockRestore()
    })
  })
})
