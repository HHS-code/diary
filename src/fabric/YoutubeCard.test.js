import { beforeAll, describe, expect, it } from 'vitest'
import { classRegistry } from 'fabric'
import { YoutubeCard } from './YoutubeCard'

const VIDEO_ID = 'dQw4w9WgXcQ'

// jsdom은 <img>.src를 설정해도 실제로 로드하지 않아 onload가 영영 안 온다.
// FabricImage.fromURL(YoutubeCard.create 내부에서 사용)이 기다리는 onload를
// 이 파일 안에서만 즉시 흉내낸다(AnimatedGif.test.js와 동일 우회).
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

describe('YoutubeCard', () => {
  it('videoId로 인스턴스를 만들면 type이 YoutubeCard이고 이미지 소스에 videoId가 포함된다', async () => {
    const card = await YoutubeCard.create(VIDEO_ID)

    expect(card.constructor.type).toBe('YoutubeCard')
    expect(card.getSrc()).toContain(VIDEO_ID)
  })

  it('toObject는 videoId만 커스텀 속성으로 포함하고 썸네일 URL 전체나 재생 상태는 포함하지 않는다', async () => {
    const card = await YoutubeCard.create(VIDEO_ID)

    const serialized = card.toObject()

    expect(serialized.type).toBe('YoutubeCard')
    expect(serialized.videoId).toBe(VIDEO_ID)
    expect(serialized.thumbnailUrl).toBeUndefined()
    expect(serialized.isPlaying).toBeUndefined()
  })

  it('classRegistry.getClass는 YoutubeCard 모듈을 import하기만 하면 YoutubeCard 클래스를 반환한다', () => {
    expect(classRegistry.getClass('YoutubeCard')).toBe(YoutubeCard)
  })

  it('fromObject는 저장된 videoId로 썸네일 URL을 재조립해 YoutubeCard로 복원한다', async () => {
    const restored = await YoutubeCard.fromObject({
      type: 'YoutubeCard',
      videoId: VIDEO_ID,
      left: 5,
      top: 5,
    })

    expect(restored).toBeInstanceOf(YoutubeCard)
    expect(restored.videoId).toBe(VIDEO_ID)
    expect(restored.getSrc()).toContain(VIDEO_ID)
    expect(restored.left).toBe(5)
  })

  it('16:9 비율이 깨지지 않도록 lockUniScaling이 설정된다', async () => {
    const card = await YoutubeCard.create(VIDEO_ID)

    expect(card.lockUniScaling).toBe(true)
  })
})
