import { FabricImage } from 'fabric'
import { decodeGifFrames } from './gifFrameDecoder'
import { AnimatedGif } from './AnimatedGif'
import { createAssetObjectURL } from '../storage/assetStorage'

const GIF_MIME_TYPE = 'image/gif'

/**
 * asset blob의 MIME 타입에 따라 정지 이미지(FabricImage) 또는 애니메이션 GIF(AnimatedGif)
 * 오브젝트를 만들어 반환한다. 스케일 조정·캔버스 중앙 배치·canvas.add() 호출은 하지 않는다
 * — 호출부(canvasAssetPlacement.js, ImageUploadButton.jsx)가 배치 로직을 담당한다.
 * 프레임이 1개뿐인 GIF는 PRD에 따라 애니메이션 처리 없이 정지 이미지로 반환한다.
 * @param {{ blob: Blob, assetId: string, mimeType?: string }} params
 * @returns {Promise<import('fabric').FabricImage | AnimatedGif>}
 */
export async function createImageOrAnimatedGifObject({ blob, assetId, mimeType }) {
  const type = mimeType ?? blob.type

  if (type !== GIF_MIME_TYPE) {
    return createStaticImageObject(blob, assetId)
  }

  const { frames, delays } = await decodeGifFrames(blob)
  if (frames.length === 1) {
    return createStaticImageObject(blob, assetId)
  }

  return new AnimatedGif(frames[0], { assetId, frames, frameDelays: delays })
}

async function createStaticImageObject(blob, assetId) {
  const img = await FabricImage.fromURL(createAssetObjectURL(blob))
  img.set({ assetId })
  return img
}
