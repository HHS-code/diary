import { beforeAll, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, Rect } from 'fabric'
import { useYoutubeCardPlayback } from './useYoutubeCardPlayback'
import { YoutubeCard } from '../fabric/YoutubeCard'

const VIDEO_ID = 'dQw4w9WgXcQ'

// react-dom이 act() 사용을 허용하도록 하는 React 테스트 환경 플래그
globalThis.IS_REACT_ACT_ENVIRONMENT = true

// jsdom은 <img>.src를 설정해도 실제로 로드하지 않아 onload가 영영 안 온다.
// YoutubeCard.create 내부(FabricImage.fromURL)가 기다리는 onload를
// 이 파일 안에서만 즉시 흉내낸다(YoutubeCard.test.js와 동일 우회).
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
      Object.defineProperty(this, 'width', { value: 100, configurable: true })
      Object.defineProperty(this, 'height', { value: 80, configurable: true })
      Object.defineProperty(this, 'complete', { value: true, configurable: true })
      setTimeout(() => this.onload && this.onload())
    },
  })
  const ctxProto = Object.getPrototypeOf(document.createElement('canvas').getContext('2d'))
  ctxProto.drawImage = function drawImage() {}
})

/** 훅을 실제 React 렌더링 안에서 실행하고, 최신 반환값을 result.value로 노출한다. */
function renderPlayback(fabricCanvasRef) {
  const result = {}
  function HookHarness() {
    result.value = useYoutubeCardPlayback(fabricCanvasRef)
    return null
  }
  const root = createRoot(document.createElement('div'))
  act(() => root.render(createElement(HookHarness)))
  return result
}

function createCanvasWithCard() {
  const canvas = new Canvas(document.createElement('canvas'))
  return YoutubeCard.create(VIDEO_ID).then((card) => {
    canvas.add(card)
    return { canvas, card }
  })
}

describe('useYoutubeCardPlayback', () => {
  it('YoutubeCard를 클릭하면 그 카드의 videoId로 재생 상태가 세팅된다', async () => {
    const { canvas, card } = await createCanvasWithCard()
    const result = renderPlayback({ current: canvas })

    act(() => canvas.fire('mouse:down', { target: card }))

    expect(result.value.videoId).toBe(VIDEO_ID)
  })

  it('빈 캔버스 공간을 클릭하면 재생 상태가 해제된다', async () => {
    const { canvas, card } = await createCanvasWithCard()
    const result = renderPlayback({ current: canvas })
    act(() => canvas.fire('mouse:down', { target: card }))
    expect(result.value.videoId).toBe(VIDEO_ID)

    act(() => canvas.fire('mouse:down', { target: null }))

    expect(result.value.videoId).toBeNull()
  })

  it('재생 중인 카드는 회전/크기조절이 잠기고, 재생 종료 시 원래 값으로 복원된다', async () => {
    const { canvas, card } = await createCanvasWithCard()
    renderPlayback({ current: canvas })
    expect(card.hasControls).toBe(true)
    expect(card.lockRotation).toBe(false)

    act(() => canvas.fire('mouse:down', { target: card }))

    expect(card.hasControls).toBe(false)
    expect(card.lockRotation).toBe(true)
    expect(card.lockScalingX).toBe(true)
    expect(card.lockScalingY).toBe(true)

    act(() => canvas.fire('mouse:down', { target: null }))

    expect(card.hasControls).toBe(true)
    expect(card.lockRotation).toBe(false)
    expect(card.lockScalingX).toBe(false)
    expect(card.lockScalingY).toBe(false)
  })

  it('재생 중 YoutubeCard가 아닌 다른 오브젝트를 클릭하면 재생이 종료되고 잠금이 원복된다', async () => {
    const { canvas, card } = await createCanvasWithCard()
    const rect = new Rect({ left: 500, top: 500, width: 10, height: 10 })
    canvas.add(rect)
    const result = renderPlayback({ current: canvas })
    act(() => canvas.fire('mouse:down', { target: card }))
    expect(result.value.videoId).toBe(VIDEO_ID)

    act(() => canvas.fire('mouse:down', { target: rect }))

    expect(result.value.videoId).toBeNull()
    expect(card.hasControls).toBe(true)
  })

  it('재생 중 다른 YoutubeCard를 클릭하면 재생 대상이 그 카드로 전환된다', async () => {
    const { canvas, card } = await createCanvasWithCard()
    const otherCard = await YoutubeCard.create('otherVideoId123')
    canvas.add(otherCard)
    const result = renderPlayback({ current: canvas })
    act(() => canvas.fire('mouse:down', { target: card }))
    expect(result.value.videoId).toBe(VIDEO_ID)

    act(() => canvas.fire('mouse:down', { target: otherCard }))

    expect(result.value.videoId).toBe('otherVideoId123')
    expect(card.hasControls).toBe(true)
    expect(otherCard.hasControls).toBe(false)
  })

  it('캔버스 zoom이 바뀌면 재생 중 카드의 화면 크기/위치도 zoom 배율만큼 함께 바뀐다', async () => {
    const { canvas, card } = await createCanvasWithCard()
    const result = renderPlayback({ current: canvas })
    act(() => canvas.fire('mouse:down', { target: card }))
    const widthBeforeZoom = result.value.width

    act(() => {
      canvas.setZoom(2)
      canvas.fire('after:render')
    })

    expect(result.value.width).toBe(widthBeforeZoom * 2)
  })

  it('after:render 시점마다 재생 중 카드의 화면 좌표를 다시 계산한다', async () => {
    const { canvas, card } = await createCanvasWithCard()
    const result = renderPlayback({ current: canvas })
    act(() => canvas.fire('mouse:down', { target: card }))
    const initialLeft = result.value.left

    act(() => {
      card.set({ left: card.left + 500 })
      canvas.fire('after:render')
    })

    expect(result.value.left).not.toBe(initialLeft)
  })
})
