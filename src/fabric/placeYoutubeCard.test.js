import { beforeAll, describe, expect, it } from 'vitest'
import { LOGICAL_CANVAS } from '../hooks/useFabricCanvas'
import { createYoutubeCardObject } from './placeYoutubeCard'

const VIDEO_ID = 'dQw4w9WgXcQ'

// jsdom은 <img>.src를 설정해도 실제로 로드하지 않아 onload가 영영 안 온다.
// FabricImage.fromURL(YoutubeCard.create 내부에서 사용)이 기다리는 onload를
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

describe('createYoutubeCardObject', () => {
  it('videoId로 YoutubeCard 인스턴스를 만들고 캔버스 중앙에 배치할 좌표를 설정한다', async () => {
    const card = await createYoutubeCardObject(VIDEO_ID)

    expect(card.constructor.type).toBe('YoutubeCard')
    expect(card.videoId).toBe(VIDEO_ID)
    expect(card.left).toBe((LOGICAL_CANVAS.width - card.getScaledWidth()) / 2)
    expect(card.top).toBe((LOGICAL_CANVAS.height - card.getScaledHeight()) / 2)
  })
})
