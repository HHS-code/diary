const MIN_STAMP_DIRECTION_COUNT = 8
const MAX_STAMP_DIRECTION_COUNT = 32
const STAMP_DIRECTIONS_PER_THICKNESS_PX = 2

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
 * sourceCanvasElement의 알파 채널 모양은 유지한 채 흰색으로 단색화한 실루엣 캔버스를
 * 만든다(ADR-6) — source-in 컴포지트 모드로 흰 사각형을 덮어 그리면 그려진 알파 모양은
 * 유지되고 색만 흰색이 된다.
 * @param {HTMLCanvasElement} sourceCanvasElement
 * @returns {HTMLCanvasElement}
 */
function createWhiteSilhouette(sourceCanvasElement) {
  const silhouette = copyCanvas(sourceCanvasElement)
  const ctx = silhouette.getContext('2d')
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, silhouette.width, silhouette.height)
  return silhouette
}

/**
 * 두께가 클수록 스탬프 방향 수를 늘려 테두리 외곽이 다각형처럼 각지지 않게 한다(ADR-6).
 * @param {number} thicknessPx
 * @returns {number}
 */
function resolveStampDirectionCount(thicknessPx) {
  const scaled = Math.round(thicknessPx * STAMP_DIRECTIONS_PER_THICKNESS_PX)
  return Math.min(MAX_STAMP_DIRECTION_COUNT, Math.max(MIN_STAMP_DIRECTION_COUNT, scaled))
}

/**
 * 흰 실루엣을 반지름 thicknessPx의 원 둘레를 따라 여러 방향으로 반복해서 그려
 * 확장된 흰색 테두리를 만든다(ADR-6 다방향 스탬프 기법).
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} silhouette
 * @param {number} thicknessPx
 * @returns {void}
 */
function stampSilhouetteAroundCircle(ctx, silhouette, thicknessPx) {
  const directionCount = resolveStampDirectionCount(thicknessPx)
  for (let i = 0; i < directionCount; i++) {
    const angle = (2 * Math.PI * i) / directionCount
    const dx = Math.cos(angle) * thicknessPx
    const dy = Math.sin(angle) * thicknessPx
    ctx.drawImage(silhouette, dx, dy)
  }
}

/**
 * 스티커 실루엣(불투명 픽셀 경계)을 따라 두께 thicknessPx의 흰색 테두리를 생성한다(PRD 섹션 5).
 * Fabric이나 DOM 상태에 의존하지 않는 순수 함수 — 입력 캔버스와 숫자만 받아 새 캔버스를 반환한다.
 * thicknessPx가 0 이하이면 원본을 그대로 복사한 캔버스를 반환한다(테두리 없음 상태와 동일하게 취급).
 * @param {HTMLCanvasElement} sourceCanvasElement
 * @param {number} thicknessPx
 * @returns {HTMLCanvasElement}
 */
export function createOutlinedSticker(sourceCanvasElement, thicknessPx) {
  if (thicknessPx <= 0) return copyCanvas(sourceCanvasElement)

  const result = createOffscreenCanvas(sourceCanvasElement.width, sourceCanvasElement.height)
  const ctx = result.getContext('2d')
  const silhouette = createWhiteSilhouette(sourceCanvasElement)

  stampSilhouetteAroundCircle(ctx, silhouette, thicknessPx)
  ctx.drawImage(sourceCanvasElement, 0, 0)

  return result
}
