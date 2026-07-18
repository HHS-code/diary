import { describe, expect, it } from 'vitest'
import { decodeGifFrames } from './gifFrameDecoder'

// 2x2px, 3프레임 GIF(base64 인라인). 부분 패치(patch)와 disposal method를 섞어
// "완전히 합성된 프레임"을 반환하는지 검증한다.
//
// 팔레트: 0=red(255,0,0), 1=green(0,255,0), 2=blue(0,0,255), 3=white(255,255,255)
// frame0: 전체 2x2를 [red,green,blue,white]로 채움. disposal=1(do not dispose)
//   -> 합성 결과 = [red, green, blue, white]
// frame1: (1,1) 1픽셀만 red로 덮어씀. disposal=2(restore to background)
//   -> 합성 결과 = [red, green, blue, red]
// frame2: (0,0) 1픽셀만 green으로 덮어씀.
//   -> frame2를 그리기 전, frame1의 disposal(restore-to-background)이 적용되어
//      frame1이 그렸던 (1,1) 영역이 투명해진 뒤 frame2가 그려짐
//   -> 합성 결과 = [green, green, blue, transparent(0,0,0,0)]
const COMPOSITING_GIF_BASE64 =
  'R0lGODlhAgACAPEAAP8AAAD/AAAA/////yH5BAQKAAAALAAAAAACAAIAAAIEBENxLAAh+QQICgAAACwBAAEAAQABAAACAgQLACH5BAAKAAAALAAAAAABAAEAAAICDAsAOw=='

// 1프레임짜리 정적 GIF(위 fixture의 frame0과 동일한 2x2 이미지).
const STATIC_GIF_BASE64 = 'R0lGODlhAgACAPEAAP8AAAD/AAAA/////yH5BAAKAAAALAAAAAACAAIAAAIEBENxLAA7'

function base64ToBlob(base64, type) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type })
}

function getPixel(canvas, x, y) {
  const ctx = canvas.getContext('2d')
  const { data } = ctx.getImageData(x, y, 1, 1)
  return Array.from(data)
}

describe('decodeGifFrames', () => {
  it('프레임 2개 이상인 GIF를 디코딩하면 frames와 delays 길이가 같고 각 프레임이 HTMLCanvasElement다', async () => {
    const blob = base64ToBlob(COMPOSITING_GIF_BASE64, 'image/gif')

    const { frames, delays } = await decodeGifFrames(blob)

    expect(frames.length).toBe(3)
    expect(delays.length).toBe(3)
    for (const frame of frames) {
      expect(frame).toBeInstanceOf(HTMLCanvasElement)
    }
  })

  it('프레임마다 이전 프레임 위에 patch를 합성하고 disposal method를 반영한다', async () => {
    const blob = base64ToBlob(COMPOSITING_GIF_BASE64, 'image/gif')

    const { frames } = await decodeGifFrames(blob)
    const [frame0, frame1, frame2] = frames

    expect(getPixel(frame0, 0, 0)).toEqual([255, 0, 0, 255])
    expect(getPixel(frame0, 1, 0)).toEqual([0, 255, 0, 255])
    expect(getPixel(frame0, 0, 1)).toEqual([0, 0, 255, 255])
    expect(getPixel(frame0, 1, 1)).toEqual([255, 255, 255, 255])

    expect(getPixel(frame1, 1, 1)).toEqual([255, 0, 0, 255])
    expect(getPixel(frame1, 0, 0)).toEqual([255, 0, 0, 255])
    expect(getPixel(frame1, 1, 0)).toEqual([0, 255, 0, 255])
    expect(getPixel(frame1, 0, 1)).toEqual([0, 0, 255, 255])

    expect(getPixel(frame2, 0, 0)).toEqual([0, 255, 0, 255])
    expect(getPixel(frame2, 1, 0)).toEqual([0, 255, 0, 255])
    expect(getPixel(frame2, 0, 1)).toEqual([0, 0, 255, 255])
    expect(getPixel(frame2, 1, 1)).toEqual([0, 0, 0, 0])
  })

  it('프레임 1개짜리 정적 GIF를 디코딩하면 frames.length가 1이다', async () => {
    const blob = base64ToBlob(STATIC_GIF_BASE64, 'image/gif')

    const { frames, delays } = await decodeGifFrames(blob)

    expect(frames.length).toBe(1)
    expect(delays.length).toBe(1)
    expect(frames[0]).toBeInstanceOf(HTMLCanvasElement)
  })

  it('GIF가 아닌 바이너리를 넣으면 에러를 던진다', async () => {
    const pngSignatureBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const blob = new Blob([pngSignatureBytes], { type: 'image/png' })

    await expect(decodeGifFrames(blob)).rejects.toThrow()
  })
})
