import { describe, expect, it } from 'vitest'
import { Path } from 'fabric'
import { eraseRegion, restoreRegion } from './stickerAiCorrection'

function createOffscreenCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function fillOpaque(canvas) {
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0000ff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return canvas
}

function getAlpha(canvas, x, y) {
  return canvas.getContext('2d').getImageData(x, y, 1, 1).data[3]
}

// 캔버스 절대 좌표 (5,5)~(15,15) 사각형을 덮는 보정 영역.
function createRegionPathCoveringInnerSquare() {
  return new Path('M 5 5 L 15 5 L 15 15 L 5 15 Z')
}

describe('restoreRegion', () => {
  it('regionPath 안쪽만 originalCanvasElement의 불투명 픽셀로 복구하고, 바깥은 currentCanvasElement 그대로 둔다', () => {
    const current = createOffscreenCanvas(20, 20) // 전부 투명(배경 제거된 상태)
    const original = fillOpaque(createOffscreenCanvas(20, 20)) // 배경 제거 이전 원본(전부 불투명)
    const regionPath = createRegionPathCoveringInnerSquare()

    const result = restoreRegion(current, original, regionPath, 0, 0)

    expect(getAlpha(result, 10, 10)).toBe(255) // 영역 안쪽 — 복구됨
    expect(getAlpha(result, 2, 2)).toBe(0) // 영역 바깥 — 여전히 투명
  })

  it('left/top 오프셋만큼 regionPath를 크롭 좌표계로 정렬해 복구한다', () => {
    const current = createOffscreenCanvas(20, 20)
    const original = fillOpaque(createOffscreenCanvas(20, 20))
    // 캔버스 절대좌표 (15,15)~(25,25)를 덮는 영역 — left=10,top=10 크롭 기준으로는 (5,5)~(15,15).
    const regionPath = new Path('M 15 15 L 25 15 L 25 25 L 15 25 Z')

    const result = restoreRegion(current, original, regionPath, 10, 10)

    expect(getAlpha(result, 10, 10)).toBe(255) // 크롭 로컬 (10,10) = 절대 (20,20) — 영역 안쪽
    expect(getAlpha(result, 2, 2)).toBe(0) // 크롭 로컬 (2,2) = 절대 (12,12) — 영역 바깥
  })

  it('그리기 불가능한(점이 2개 미만) regionPath는 currentCanvasElement를 그대로 복사해 반환한다', () => {
    const current = createOffscreenCanvas(20, 20)
    fillOpaque(current)
    const original = createOffscreenCanvas(20, 20) // 전부 투명
    const tooShortPath = new Path('M 5 5')

    const result = restoreRegion(current, original, tooShortPath, 0, 0)

    expect(getAlpha(result, 10, 10)).toBe(255) // current 그대로(불투명 유지)
  })

  it('결과는 currentCanvasElement와 같은 크기의 새 캔버스다(원본을 변형하지 않음)', () => {
    const current = createOffscreenCanvas(20, 20)
    const original = fillOpaque(createOffscreenCanvas(20, 20))
    const regionPath = createRegionPathCoveringInnerSquare()

    const result = restoreRegion(current, original, regionPath, 0, 0)

    expect(result).not.toBe(current)
    expect(result.width).toBe(20)
    expect(result.height).toBe(20)
    expect(getAlpha(current, 10, 10)).toBe(0) // current 자체는 변형되지 않음
  })
})

describe('eraseRegion', () => {
  it('regionPath 안쪽만 투명화하고, 바깥은 그대로 불투명하게 둔다', () => {
    const current = fillOpaque(createOffscreenCanvas(20, 20))
    const regionPath = createRegionPathCoveringInnerSquare()

    const result = eraseRegion(current, regionPath, 0, 0)

    expect(getAlpha(result, 10, 10)).toBe(0) // 영역 안쪽 — 지워짐
    expect(getAlpha(result, 2, 2)).toBe(255) // 영역 바깥 — 그대로 불투명
  })

  it('left/top 오프셋만큼 regionPath를 크롭 좌표계로 정렬해 지운다', () => {
    const current = fillOpaque(createOffscreenCanvas(20, 20))
    const regionPath = new Path('M 15 15 L 25 15 L 25 25 L 15 25 Z')

    const result = eraseRegion(current, regionPath, 10, 10)

    expect(getAlpha(result, 10, 10)).toBe(0) // 크롭 로컬 (10,10) = 절대 (20,20) — 영역 안쪽
    expect(getAlpha(result, 2, 2)).toBe(255) // 크롭 로컬 (2,2) = 절대 (12,12) — 영역 바깥
  })

  it('그리기 불가능한(점이 2개 미만) regionPath는 currentCanvasElement를 그대로 복사해 반환한다', () => {
    const current = fillOpaque(createOffscreenCanvas(20, 20))
    const tooShortPath = new Path('M 5 5')

    const result = eraseRegion(current, tooShortPath, 0, 0)

    expect(getAlpha(result, 10, 10)).toBe(255)
  })

  it('결과는 currentCanvasElement와 같은 크기의 새 캔버스다(원본을 변형하지 않음)', () => {
    const current = fillOpaque(createOffscreenCanvas(20, 20))
    const regionPath = createRegionPathCoveringInnerSquare()

    const result = eraseRegion(current, regionPath, 0, 0)

    expect(result).not.toBe(current)
    expect(result.width).toBe(20)
    expect(result.height).toBe(20)
    expect(getAlpha(current, 10, 10)).toBe(255) // current 자체는 변형되지 않음
  })
})
