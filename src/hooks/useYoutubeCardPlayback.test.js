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

/** card 중심(재생 버튼 위) 캔버스 scene 좌표를 반환한다. */
function playButtonScenePoint(card) {
  return card.getCenterPoint()
}

/** card 몸통이지만 재생 버튼 원 밖인 scene 좌표(카드 좌상단 모서리 근처)를 반환한다. */
function cardBodyScenePoint(card) {
  const bounding = card.getBoundingRect()
  return { x: bounding.left + 5, y: bounding.top + 5 }
}

/** Fabric의 mouse:up 이벤트를 흉내낸다 — isClick은 실제 Fabric이 mousemove 발생 여부로 계산해주는 값. */
function fireMouseUp(canvas, target, scenePoint, { isClick = true } = {}) {
  canvas.fire('mouse:up', { target, scenePoint, isClick })
}

describe('useYoutubeCardPlayback', () => {
  it('카드의 재생 버튼을 클릭하면 그 카드의 videoId로 재생 상태가 세팅된다', async () => {
    const { canvas, card } = await createCanvasWithCard()
    const result = renderPlayback({ current: canvas })

    act(() => fireMouseUp(canvas, card, playButtonScenePoint(card)))

    expect(result.value.videoId).toBe(VIDEO_ID)
  })

  it('카드 몸통(재생 버튼 밖)을 클릭해도 재생되지 않는다', async () => {
    const { canvas, card } = await createCanvasWithCard()
    const result = renderPlayback({ current: canvas })

    act(() => fireMouseUp(canvas, card, cardBodyScenePoint(card)))

    expect(result.value.videoId).toBeNull()
  })

  it('재생 버튼 위에서 시작했더라도 드래그(Fabric이 isClick=false로 판정)로 끝나면 재생되지 않는다', async () => {
    const { canvas, card } = await createCanvasWithCard()
    const result = renderPlayback({ current: canvas })

    act(() => fireMouseUp(canvas, card, playButtonScenePoint(card), { isClick: false }))

    expect(result.value.videoId).toBeNull()
  })

  it('재생 중 빈 캔버스 공간을 클릭하면 재생 상태가 해제된다', async () => {
    const { canvas, card } = await createCanvasWithCard()
    const result = renderPlayback({ current: canvas })
    act(() => fireMouseUp(canvas, card, playButtonScenePoint(card)))
    expect(result.value.videoId).toBe(VIDEO_ID)

    act(() => fireMouseUp(canvas, null, { x: 0, y: 0 }))

    expect(result.value.videoId).toBeNull()
  })

  it('재생 중 다른 오브젝트를 클릭해도 재생이 종료되지 않는다(빈 공간 클릭만 종료 조건)', async () => {
    const { canvas, card } = await createCanvasWithCard()
    const rect = new Rect({ left: 500, top: 500, width: 10, height: 10 })
    canvas.add(rect)
    const result = renderPlayback({ current: canvas })
    act(() => fireMouseUp(canvas, card, playButtonScenePoint(card)))
    expect(result.value.videoId).toBe(VIDEO_ID)

    act(() => fireMouseUp(canvas, rect, rect.getCenterPoint()))

    expect(result.value.videoId).toBe(VIDEO_ID)
  })

  it('재생 중 다른 YoutubeCard의 재생 버튼을 클릭하면 재생 대상이 그 카드로 전환된다', async () => {
    const { canvas, card } = await createCanvasWithCard()
    const otherCard = await YoutubeCard.create('otherVideoId123')
    canvas.add(otherCard)
    const result = renderPlayback({ current: canvas })
    act(() => fireMouseUp(canvas, card, playButtonScenePoint(card)))
    expect(result.value.videoId).toBe(VIDEO_ID)

    act(() => fireMouseUp(canvas, otherCard, playButtonScenePoint(otherCard)))

    expect(result.value.videoId).toBe('otherVideoId123')
  })

  it('카드는 재생 여부와 무관하게 항상 선택·이동 가능하다(hasControls 등을 잠그지 않는다)', async () => {
    const { canvas, card } = await createCanvasWithCard()
    renderPlayback({ current: canvas })
    expect(card.hasControls).toBe(true)
    expect(card.lockMovementX).toBe(false)

    act(() => fireMouseUp(canvas, card, playButtonScenePoint(card)))

    expect(card.hasControls).toBe(true)
    expect(card.lockMovementX).toBe(false)
  })

  it('캔버스 zoom이 바뀌면 재생 중 카드의 화면 크기/위치도 zoom 배율만큼 함께 바뀐다', async () => {
    const { canvas, card } = await createCanvasWithCard()
    const result = renderPlayback({ current: canvas })
    act(() => fireMouseUp(canvas, card, playButtonScenePoint(card)))
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
    act(() => fireMouseUp(canvas, card, playButtonScenePoint(card)))
    const initialLeft = result.value.left

    act(() => {
      card.set({ left: card.left + 500 })
      canvas.fire('after:render')
    })

    expect(result.value.left).not.toBe(initialLeft)
  })
})
