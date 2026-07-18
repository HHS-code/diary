import { decompressFrames, parseGIF } from 'gifuct-js'

// GIF Graphic Control Extension의 disposal method 값(GIF89a 스펙).
const DISPOSAL_RESTORE_TO_BACKGROUND = 2
const DISPOSAL_RESTORE_TO_PREVIOUS = 3

// 일부 GIF 인코더가 delay=0을 쓰는 경우를 대비한 최소 표시 시간(ms).
const MIN_FRAME_DELAY_MS = 20

function createCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function drawPatchOntoCanvas(ctx, parsedFrame) {
  const { dims, patch } = parsedFrame
  const patchCanvas = createCanvas(dims.width, dims.height)
  const patchCtx = patchCanvas.getContext('2d')
  const imageData = patchCtx.createImageData(dims.width, dims.height)
  imageData.data.set(patch)
  patchCtx.putImageData(imageData, 0, 0)
  ctx.drawImage(patchCanvas, dims.left, dims.top)
}

function cloneCanvas(sourceCanvas) {
  const clone = createCanvas(sourceCanvas.width, sourceCanvas.height)
  clone.getContext('2d').drawImage(sourceCanvas, 0, 0)
  return clone
}

/**
 * GIF Blob을 디코딩해 "완전히 합성된" 프레임 이미지 배열과 각 프레임의 표시 시간을 반환한다.
 * gifuct-js가 프레임마다 반환하는 patch(변경된 영역만 담은 부분 이미지)를 disposal method에
 * 따라 이전 프레임 위에 겹쳐 그려, 각 프레임이 그 시점에 화면에 보여야 할 전체 픽셀을 담도록 만든다.
 * @param {Blob} blob
 * @returns {Promise<{ frames: HTMLCanvasElement[], delays: number[] }>}
 */
export async function decodeGifFrames(blob) {
  const arrayBuffer = await blob.arrayBuffer()
  const parsedGif = parseGIF(arrayBuffer)

  if (parsedGif.header.signature !== 'GIF') {
    throw new Error('GIF 파일이 아닙니다.')
  }

  const parsedFrames = decompressFrames(parsedGif, true)
  if (parsedFrames.length === 0) {
    throw new Error('GIF에서 프레임을 읽을 수 없습니다.')
  }

  const compositeCanvas = createCanvas(parsedGif.lsd.width, parsedGif.lsd.height)
  const compositeCtx = compositeCanvas.getContext('2d')

  const frames = []
  const delays = []
  let previousParsedFrame = null
  let canvasBeforePreviousFrame = null

  for (const parsedFrame of parsedFrames) {
    if (previousParsedFrame?.disposalType === DISPOSAL_RESTORE_TO_BACKGROUND) {
      const { left, top, width, height } = previousParsedFrame.dims
      compositeCtx.clearRect(left, top, width, height)
    } else if (previousParsedFrame?.disposalType === DISPOSAL_RESTORE_TO_PREVIOUS && canvasBeforePreviousFrame) {
      compositeCtx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height)
      compositeCtx.drawImage(canvasBeforePreviousFrame, 0, 0)
    }

    if (parsedFrame.disposalType === DISPOSAL_RESTORE_TO_PREVIOUS) {
      canvasBeforePreviousFrame = cloneCanvas(compositeCanvas)
    }

    drawPatchOntoCanvas(compositeCtx, parsedFrame)

    frames.push(cloneCanvas(compositeCanvas))
    delays.push(Math.max(parsedFrame.delay, MIN_FRAME_DELAY_MS))

    previousParsedFrame = parsedFrame
  }

  return { frames, delays }
}
