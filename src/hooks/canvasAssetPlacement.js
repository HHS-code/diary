import { LOGICAL_CANVAS } from './useFabricCanvas'
import { createImageOrAnimatedGifObject } from '../fabric/placeImageOrGif'

/**
 * IndexedDB에 등록된 이미지 에셋을 Fabric 캔버스 중앙에 추가한다.
 * 캔버스보다 큰 이미지는 캔버스 안에 들어오도록 스케일 다운한다(ImageUploadButton과 동일 로직).
 * asset.blob이 애니메이션 GIF(2프레임 이상)이면 AnimatedGif로, 아니면 기존처럼 정지 이미지로 추가한다.
 * 추가된 오브젝트에 assetId를 심어 저장/재로드 시 역참조가 가능하도록 한다.
 * @param {import('fabric').Canvas} canvas
 * @param {{ id: string, blob: Blob, mimeType?: string }} asset
 * @returns {Promise<void>}
 */
export async function addImageAssetToCanvas(canvas, asset) {
  const img = await createImageOrAnimatedGifObject({ blob: asset.blob, assetId: asset.id, mimeType: asset.mimeType })
  const scaleToFit = Math.min(LOGICAL_CANVAS.width / img.width, LOGICAL_CANVAS.height / img.height, 1)
  img.scale(scaleToFit)
  img.set({
    left: (LOGICAL_CANVAS.width - img.getScaledWidth()) / 2,
    top: (LOGICAL_CANVAS.height - img.getScaledHeight()) / 2,
  })

  canvas.add(img)
  canvas.setActiveObject(img)
  canvas.renderAll()
}
