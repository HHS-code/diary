import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSharedGifRenderLoop } from './sharedGifRenderLoop'

function createFakeAnimatedGif(frameDelays) {
  return { advanceFrame: vi.fn(), frameDelays, currentFrameIndex: 0 }
}

describe('createSharedGifRenderLoop', () => {
  let rafCallbacksById
  let nextRafId
  let requestAnimationFrameMock
  let cancelAnimationFrameMock

  beforeEach(() => {
    rafCallbacksById = new Map()
    nextRafId = 1
    requestAnimationFrameMock = vi.fn((cb) => {
      const id = nextRafId++
      rafCallbacksById.set(id, cb)
      return id
    })
    cancelAnimationFrameMock = vi.fn((id) => {
      rafCallbacksById.delete(id)
    })
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameMock)
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function runLatestScheduledTick(now) {
    const latestId = Math.max(...rafCallbacksById.keys())
    const callback = rafCallbacksById.get(latestId)
    rafCallbacksById.delete(latestId)
    callback(now)
  }

  it('등록한 오브젝트는 delay 시간이 지난 뒤 틱에서 advanceFrame과 renderAll이 호출된다', () => {
    const fabricCanvas = { renderAll: vi.fn() }
    const loop = createSharedGifRenderLoop(fabricCanvas)
    const gif = createFakeAnimatedGif([10])
    loop.register(gif)
    loop.start()

    runLatestScheduledTick(0)
    expect(gif.advanceFrame).not.toHaveBeenCalled()
    expect(fabricCanvas.renderAll).not.toHaveBeenCalled()

    runLatestScheduledTick(15)
    expect(gif.advanceFrame).toHaveBeenCalledTimes(1)
    expect(fabricCanvas.renderAll).toHaveBeenCalledTimes(1)
  })

  it('한 틱에 여러 오브젝트가 동시에 프레임을 넘겨도 renderAll은 1번만 호출된다', () => {
    const fabricCanvas = { renderAll: vi.fn() }
    const loop = createSharedGifRenderLoop(fabricCanvas)
    const gifA = createFakeAnimatedGif([5])
    const gifB = createFakeAnimatedGif([5])
    loop.register(gifA)
    loop.register(gifB)
    loop.start()

    runLatestScheduledTick(0)
    runLatestScheduledTick(10)

    expect(gifA.advanceFrame).toHaveBeenCalledTimes(1)
    expect(gifB.advanceFrame).toHaveBeenCalledTimes(1)
    expect(fabricCanvas.renderAll).toHaveBeenCalledTimes(1)
  })

  it('unregister한 오브젝트는 이후 틱에서 advanceFrame이 호출되지 않는다', () => {
    const fabricCanvas = { renderAll: vi.fn() }
    const loop = createSharedGifRenderLoop(fabricCanvas)
    const gif = createFakeAnimatedGif([5])
    loop.register(gif)
    loop.start()

    runLatestScheduledTick(0)
    runLatestScheduledTick(10)
    expect(gif.advanceFrame).toHaveBeenCalledTimes(1)

    loop.unregister(gif)
    runLatestScheduledTick(20)
    expect(gif.advanceFrame).toHaveBeenCalledTimes(1)
  })

  it('stop()을 호출하면 cancelAnimationFrame이 호출된다', () => {
    const fabricCanvas = { renderAll: vi.fn() }
    const loop = createSharedGifRenderLoop(fabricCanvas)
    loop.start()

    loop.stop()

    expect(cancelAnimationFrameMock).toHaveBeenCalledTimes(1)
  })
})
