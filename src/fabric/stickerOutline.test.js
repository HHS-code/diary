import { describe, expect, it } from 'vitest'
import { createOutlinedSticker } from './stickerOutline'

function createOffscreenCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

// 20x20 캔버스 중앙에 8x8 불투명 파란 사각형(x:[6,14), y:[6,14))만 그린 소스 이미지.
// 가장자리에 여백을 둬 테두리 스탬프가 캔버스 밖으로 잘리지 않게 한다.
function createSquareSticker() {
  const canvas = createOffscreenCanvas(20, 20)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0000ff'
  ctx.fillRect(6, 6, 8, 8)
  return canvas
}

function getAlpha(canvas, x, y) {
  return canvas.getContext('2d').getImageData(x, y, 1, 1).data[3]
}

describe('createOutlinedSticker', () => {
  it('원본과 같은 크기의 새 캔버스를 반환한다', () => {
    const source = createSquareSticker()

    const result = createOutlinedSticker(source, 0)

    expect(result).toBeInstanceOf(HTMLCanvasElement)
    expect(result.width).toBe(source.width)
    expect(result.height).toBe(source.height)
    expect(result).not.toBe(source)
  })

  it('thicknessPx가 0이면 원본과 동일한 불투명 영역을 유지한다', () => {
    const source = createSquareSticker()

    const result = createOutlinedSticker(source, 0)

    expect(getAlpha(result, 10, 10)).toBe(255) // 사각형 내부
    expect(getAlpha(result, 0, 0)).toBe(0) // 사각형 바깥
  })

  it('thicknessPx가 음수이면 원본을 그대로 복사한 캔버스를 반환한다', () => {
    const source = createSquareSticker()

    const result = createOutlinedSticker(source, -5)

    expect(getAlpha(result, 10, 10)).toBe(255)
    expect(getAlpha(result, 0, 0)).toBe(0)
  })

  it('thicknessPx가 양수이면 원본 경계 바로 바깥 픽셀이 불투명해진다', () => {
    const source = createSquareSticker()
    expect(getAlpha(source, 5, 10)).toBe(0) // 경계(x=6) 바로 바깥은 원본에서 투명

    const result = createOutlinedSticker(source, 4)

    expect(getAlpha(result, 5, 10)).toBeGreaterThan(0)
  })

  it('두께가 커질수록 불투명 영역이 더 넓게 확장된다', () => {
    const source = createSquareSticker()

    const thinOutline = createOutlinedSticker(source, 2)
    const thickOutline = createOutlinedSticker(source, 6)

    // 원본 경계(x=6)에서 6px 떨어진 x=0: 두꺼운 테두리에서만 불투명해야 한다.
    expect(getAlpha(thinOutline, 0, 10)).toBe(0)
    expect(getAlpha(thickOutline, 0, 10)).toBeGreaterThan(0)
  })

  it('원본의 불투명 영역은 테두리 적용 후에도 그대로 불투명하다(원본이 맨 위에 다시 그려짐)', () => {
    const source = createSquareSticker()

    const result = createOutlinedSticker(source, 4)

    expect(getAlpha(result, 10, 10)).toBe(255)
  })
})
