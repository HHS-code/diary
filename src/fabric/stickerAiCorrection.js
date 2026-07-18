import { util } from 'fabric'

const MIN_REGION_PATH_SEGMENTS = 2
const REGION_MASK_FILL = '#ffffff'

function isDrawableRegionPath(regionPath) {
  return Boolean(regionPath?.path) && regionPath.path.length >= MIN_REGION_PATH_SEGMENTS
}

function createOffscreenCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function copyCanvas(sourceCanvasElement) {
  const copy = createOffscreenCanvas(sourceCanvasElement.width, sourceCanvasElement.height)
  copy.getContext('2d').drawImage(sourceCanvasElement, 0, 0)
  return copy
}

/**
 * regionPath를 (left, top) 크롭 원점 기준 로컬 좌표계로 옮긴다(stickerCutout.js의
 * previewLassoCutout이 쓰는 util.sendObjectToPlane 패턴 재사용) — regionPath는 스티커
 * 스튜디오 캔버스에 직접 그려져 캔버스 절대 좌표를 갖는데, currentCanvasElement/
 * originalCanvasElement는 대상 이미지의 경계 영역만 크롭한 캔버스(원점이 (left, top)만큼
 * 밀려 있음)라 그 차이를 보정해야 한다. previewLassoCutout과 동일하게 regionPath를 직접
 * 변형한다(제자리 변경).
 * @param {import('fabric').Path} regionPath
 * @param {number} left
 * @param {number} top
 * @returns {void}
 */
function alignRegionPathToCanvasOrigin(regionPath, left, top) {
  util.sendObjectToPlane(regionPath, undefined, util.createTranslateMatrix(left, top))
}

/**
 * regionPath가 덮는 영역만 흰색으로 채운 마스크 캔버스를 만든다. Fabric의 자체 렌더링
 * 파이프라인(FabricObject.render)을 그대로 이용해, 열린 곡선이어도 previewLassoCutout과
 * 동일하게 Canvas fill의 암묵적 닫힘 규칙에 맡긴다(별도 보정 없음).
 * @param {import('fabric').Path} regionPath
 * @param {number} width
 * @param {number} height
 * @returns {HTMLCanvasElement}
 */
function renderRegionMask(regionPath, width, height) {
  const maskCanvasElement = createOffscreenCanvas(width, height)
  regionPath.set({ fill: REGION_MASK_FILL, stroke: null })
  regionPath.render(maskCanvasElement.getContext('2d'))
  return maskCanvasElement
}

/**
 * canvasElement에서 regionPath가 덮지 않는 부분을 투명화해, regionPath 안쪽만 남긴다.
 * @param {HTMLCanvasElement} canvasElement
 * @param {import('fabric').Path} regionPath
 * @returns {void}
 */
function keepOnlyRegion(canvasElement, regionPath) {
  const maskCanvasElement = renderRegionMask(regionPath, canvasElement.width, canvasElement.height)
  const ctx = canvasElement.getContext('2d')
  ctx.globalCompositeOperation = 'destination-in'
  ctx.drawImage(maskCanvasElement, 0, 0)
  ctx.globalCompositeOperation = 'source-over'
}

/**
 * regionPath로 표시된 영역 안에서, originalCanvasElement(AI 배경제거 이전 원본)의 픽셀을
 * currentCanvasElement 위에 되살려 복구한 새 캔버스를 반환한다(architecture.md "AI 보정").
 * currentCanvasElement/originalCanvasElement는 같은 대상 이미지 경계 영역(left, top 기준)을
 * 크롭한 캔버스여야 한다 — 서로 다른 크롭이면 결과가 어긋난다.
 * Fabric 오브젝트를 직접 캔버스에 추가/제거하지 않는 순수 함수다 — regionPath 자체는
 * 정렬을 위해 제자리 변경된다(previewLassoCutout과 동일한 기존 관례).
 * @param {HTMLCanvasElement} currentCanvasElement
 * @param {HTMLCanvasElement} originalCanvasElement
 * @param {import('fabric').Path} regionPath
 * @param {number} left currentCanvasElement/originalCanvasElement가 크롭된 캔버스 좌표계 원점의 left
 * @param {number} top currentCanvasElement/originalCanvasElement가 크롭된 캔버스 좌표계 원점의 top
 * @returns {HTMLCanvasElement}
 */
export function restoreRegion(currentCanvasElement, originalCanvasElement, regionPath, left, top) {
  const result = copyCanvas(currentCanvasElement)
  if (!isDrawableRegionPath(regionPath)) return result

  alignRegionPathToCanvasOrigin(regionPath, left, top)

  const restoredRegion = copyCanvas(originalCanvasElement)
  keepOnlyRegion(restoredRegion, regionPath)

  result.getContext('2d').drawImage(restoredRegion, 0, 0)
  return result
}

/**
 * regionPath로 표시된 영역을 currentCanvasElement에서 투명화한 새 캔버스를 반환한다
 * (architecture.md "AI 보정" — 삭제). Fabric 오브젝트를 직접 캔버스에 추가/제거하지 않는
 * 순수 함수다 — regionPath 자체는 정렬을 위해 제자리 변경된다.
 * @param {HTMLCanvasElement} currentCanvasElement
 * @param {import('fabric').Path} regionPath
 * @param {number} left currentCanvasElement가 크롭된 캔버스 좌표계 원점의 left
 * @param {number} top currentCanvasElement가 크롭된 캔버스 좌표계 원점의 top
 * @returns {HTMLCanvasElement}
 */
export function eraseRegion(currentCanvasElement, regionPath, left, top) {
  const result = copyCanvas(currentCanvasElement)
  if (!isDrawableRegionPath(regionPath)) return result

  alignRegionPathToCanvasOrigin(regionPath, left, top)

  const maskCanvasElement = renderRegionMask(regionPath, result.width, result.height)
  const ctx = result.getContext('2d')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.drawImage(maskCanvasElement, 0, 0)
  return result
}
