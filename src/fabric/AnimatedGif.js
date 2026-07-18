import { classRegistry, FabricImage } from 'fabric'
import { decodeGifFrames } from './gifFrameDecoder'
import { getAsset } from '../storage/assetStorage'

/**
 * 애니메이션 GIF를 표준 Fabric 오브젝트로 다루기 위한 FabricImage 서브클래스.
 * frames(디코딩된 프레임 canvas 배열)를 들고 있다가 advanceFrame()으로 this._element를
 * 갈아끼우면, FabricImage의 기존 렌더 파이프라인이 그대로 현재 프레임을 그린다.
 */
export class AnimatedGif extends FabricImage {
  static type = 'AnimatedGif'
  static customProperties = ['assetId', 'frameDelays', 'currentFrameIndex']

  constructor(element, options) {
    super(element, options)
    this.assetId = options?.assetId
    this.frames = options?.frames ?? [element]
    this.frameDelays = options?.frameDelays ?? [100]
    this.currentFrameIndex = options?.currentFrameIndex ?? 0
  }

  advanceFrame() {
    if (this.frames.length <= 1) return
    this.currentFrameIndex = (this.currentFrameIndex + 1) % this.frames.length
    this._element = this.frames[this.currentFrameIndex]
  }

  /**
   * assetId로 IndexedDB에서 원본 GIF를 다시 조회해 프레임을 재디코딩한다.
   * 원본이 삭제됐거나(getAsset이 null 반환) 디코딩이 실패하면, 캔버스 전체 로드가
   * 깨지지 않도록 에러를 던지는 대신 일반 FabricImage로 폴백해 반환한다.
   * @param {object} object
   * @param {object} [options]
   * @returns {Promise<AnimatedGif | FabricImage>}
   */
  static async fromObject(object, options) {
    const { assetId, frameDelays: _frameDelays, currentFrameIndex: _currentFrameIndex, ...fabricImageObject } = object

    const record = await getAsset(assetId)
    if (!record) {
      return FabricImage.fromObject(fabricImageObject, options)
    }

    try {
      const { frames, delays } = await decodeGifFrames(record.blob)
      return new AnimatedGif(frames[0], { ...object, frames, frameDelays: delays })
    } catch {
      return FabricImage.fromObject(fabricImageObject, options)
    }
  }
}

classRegistry.setClass(AnimatedGif)
