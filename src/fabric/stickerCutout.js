import { FabricImage, util } from 'fabric'

const MIN_LASSO_PATH_SEGMENTS = 2

function isDrawableLassoPath(lassoPath) {
  return Boolean(lassoPath?.path) && lassoPath.path.length >= MIN_LASSO_PATH_SEGMENTS
}

/**
 * 올가미로 그린 lassoPath를 targetImage의 로컬 좌표계로 옮겨 clipPath로 지정해
 * 미리보기한다(ADR-5). 여러 번 호출해 이전 미리보기를 새 올가미로 덮어쓸 수 있다.
 * 곡선이 닫혀있지 않아도(시작점≠끝점) Fabric Path의 fill 규칙에 맡긴다 — 별도 보정 없음.
 * @param {import('fabric').FabricObject | undefined} targetImage
 * @param {import('fabric').Path | undefined} lassoPath
 * @returns {void}
 */
export function previewLassoCutout(targetImage, lassoPath) {
  if (!targetImage || !isDrawableLassoPath(lassoPath)) return
  util.sendObjectToPlane(lassoPath, undefined, targetImage.calcTransformMatrix())
  targetImage.clipPath = lassoPath
  targetImage.canvas?.renderAll()
}

/**
 * targetImage에 적용된 clipPath 미리보기를 실제 픽셀로 구워(rasterize) 새 FabricImage로
 * 캔버스 상에서 교체한다(ADR-5) — clipPath는 오브젝트 트리에 의존하는 "표현"이라, 이후
 * 흰색 테두리 생성 같은 픽셀 단위 처리와 합성하려면 미리 픽셀로 구워둬야 한다.
 * assetId 등 기존 메타데이터는 새 오브젝트로 승계되고, 원래 위치(left/top)를 유지한다.
 * @param {import('fabric').Canvas | undefined} canvas
 * @param {import('fabric').FabricObject | undefined} targetImage
 * @returns {Promise<void>}
 */
export async function commitLassoCutout(canvas, targetImage) {
  if (!canvas || !targetImage) return

  const { left, top, width, height } = targetImage.getBoundingRect()
  const rasterizedElement = canvas.toCanvasElement(1, {
    left,
    top,
    width,
    height,
    filter: (object) => object === targetImage,
  })

  // FabricObject의 기본 origin은 'center'라 left/top이 곧바로 좌상단 좌표가 아니다.
  // getBoundingRect()가 준 좌상단 좌표를 그대로 쓰려면 origin을 'left'/'top'으로 명시해야
  // targetImage가 있던 자리에 새 이미지가 시각적으로 정확히 겹친다.
  const cutoutImage = new FabricImage(rasterizedElement)
  cutoutImage.set({ originX: 'left', originY: 'top', left, top, assetId: targetImage.assetId })

  canvas.remove(targetImage)
  canvas.add(cutoutImage)
  canvas.setActiveObject(cutoutImage)
  canvas.renderAll()
}
