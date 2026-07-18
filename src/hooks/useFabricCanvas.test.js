import 'fake-indexeddb/auto'
// jsdom Blob과 Node structuredClone 간 비호환 우회(assetStorage.test.js와 동일 이유).
import { Blob } from 'node:buffer'
import { createElement, useRef } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Canvas } from 'fabric'
import { EXTRA_SERIALIZED_PROPS, resolveCanvasAssetReferences, useFabricCanvas } from './useFabricCanvas'
import { addImageAssetToCanvas } from './canvasAssetPlacement'
import { AnimatedGif } from '../fabric/AnimatedGif'
import { saveAsset } from '../storage/assetStorage'

// 2x2px, 3프레임 GIF(base64 인라인) — gifFrameDecoder.test.js와 동일 fixture.
const ANIMATED_GIF_BASE64 =
  'R0lGODlhAgACAPEAAP8AAAD/AAAA/////yH5BAQKAAAALAAAAAACAAIAAAIEBENxLAAh+QQICgAAACwBAAEAAQABAAACAgQLACH5BAAKAAAALAAAAAABAAEAAAICDAsAOw=='

function base64ToBlob(base64, type) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type })
}

function deleteAssetsDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('diary-assets')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

beforeEach(async () => {
  await deleteAssetsDatabase()
})

describe('resolveCanvasAssetReferences', () => {
  it('assetId를 가진 오브젝트에 assetStorage에서 조회한 objectURL을 src로 채운다', async () => {
    const blob = new Blob(['fake-image-bytes'], { type: 'image/png' })
    const assetId = await saveAsset({ type: 'image', filename: 'bg.png', mimeType: 'image/png', blob })
    const canvasJSON = {
      objects: [{ type: 'image', assetId, left: 0, top: 0, isBackground: true }],
    }

    const resolved = await resolveCanvasAssetReferences(canvasJSON)

    expect(resolved.objects[0].src).toMatch(/^blob:/)
    expect(resolved.objects[0].left).toBe(0)
    expect(resolved.objects[0].isBackground).toBe(true)
  })

  it('assetId가 없는 오브젝트는 변경 없이 그대로 통과시킨다', async () => {
    const canvasJSON = { objects: [{ type: 'rect', left: 5, top: 5 }] }

    const resolved = await resolveCanvasAssetReferences(canvasJSON)

    expect(resolved.objects[0]).toEqual({ type: 'rect', left: 5, top: 5 })
  })

  it('assetId가 가리키는 에셋이 존재하지 않으면 오브젝트를 그대로 통과시킨다', async () => {
    const canvasJSON = { objects: [{ type: 'image', assetId: 'no-such-id' }] }

    const resolved = await resolveCanvasAssetReferences(canvasJSON)

    expect(resolved.objects[0]).toEqual({ type: 'image', assetId: 'no-such-id' })
  })

  it('objects가 없는 canvasJSON은 그대로 반환한다', async () => {
    const canvasJSON = { background: '#ffffff' }

    const resolved = await resolveCanvasAssetReferences(canvasJSON)

    expect(resolved).toEqual(canvasJSON)
  })

  it('type이 AnimatedGif인 오브젝트는 assetId가 있어도 src를 채우지 않고 그대로 통과시킨다', async () => {
    const blob = new Blob(['fake-gif-bytes'], { type: 'image/gif' })
    const assetId = await saveAsset({ type: 'image', filename: 'anim.gif', mimeType: 'image/gif', blob })
    const animatedGifObject = { type: 'AnimatedGif', assetId, frameDelays: [100], currentFrameIndex: 0 }
    const canvasJSON = { objects: [animatedGifObject] }

    const resolved = await resolveCanvasAssetReferences(canvasJSON)

    expect(resolved.objects[0]).toBe(animatedGifObject)
    expect(resolved.objects[0].src).toBeUndefined()
  })
})

function TestHost({ onReady }) {
  const canvasElRef = useRef(null)
  const fabricCanvasRef = useFabricCanvas(canvasElRef, null, null)
  onReady(fabricCanvasRef)
  return createElement('canvas', { ref: canvasElRef })
}

describe('useFabricCanvas의 공유 GIF 렌더 루프 생명주기', () => {
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

  it('캔버스가 dispose되면 공유 렌더 루프도 정리되어 이후 rAF 콜백이 실행돼도 renderAll을 호출하지 않는다', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    let fabricCanvasRef

    await act(async () => {
      root.render(createElement(TestHost, { onReady: (ref) => { fabricCanvasRef = ref } }))
    })

    // fabric의 setZoom()도 내부적으로 rAF를 한 번 스케줄하므로, 우리 공유 루프가
    // 스케줄한 마지막 호출(=loop.start()가 만든 것)만 골라 쓴다.
    const ourRafCallIndex = requestAnimationFrameMock.mock.calls.length - 1
    const pendingTickCallback = requestAnimationFrameMock.mock.calls[ourRafCallIndex][0]
    const ourRafId = requestAnimationFrameMock.mock.results[ourRafCallIndex].value
    const renderAllSpy = vi.spyOn(fabricCanvasRef.current, 'renderAll')

    // fabric의 StaticCanvasDOMManager가 <canvas>를 wrapper div로 감싸며 React가
    // 모르는 DOM 구조 변경을 일으켜, root.unmount()의 DOM 제거 단계에서
    // jsdom이 "not a child of this node"를 던진다(React effect cleanup 자체는
    // 그 전에 이미 실행된다) — 이 테스트가 검증하려는 루프 정리와는 무관해 무시한다.
    try {
      await act(async () => {
        root.unmount()
      })
    } catch (error) {
      if (!(error instanceof DOMException)) throw error
    }
    container.remove()

    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(ourRafId)

    // 실제 브라우저라면 cancel된 콜백은 다시 호출되지 않지만, 혹시 호출되더라도
    // dispose된 캔버스를 렌더링하지 않아야 한다는 것을 직접 확인한다.
    pendingTickCallback(1000)
    expect(renderAllSpy).not.toHaveBeenCalled()
  })
})

function TestHostWithOptions({ onSave, options, onReady }) {
  const canvasElRef = useRef(null)
  const fabricCanvasRef = useFabricCanvas(canvasElRef, null, onSave, options)
  onReady(fabricCanvasRef)
  return createElement('canvas', { ref: canvasElRef })
}

// fabric의 StaticCanvasDOMManager가 <canvas>를 wrapper div로 감싸며 React가
// 모르는 DOM 구조 변경을 일으켜, root.unmount()의 DOM 제거 단계에서
// jsdom이 "not a child of this node"를 던진다(위 GIF 생명주기 테스트와 동일 이유).
async function unmountIgnoringKnownDomWrapperError(root) {
  try {
    await act(async () => {
      root.unmount()
    })
  } catch (error) {
    if (!(error instanceof DOMException)) throw error
  }
}

describe('useFabricCanvas의 캔버스 크기/배경색 옵션(logicalSize, backgroundColor)', () => {
  it('logicalSize를 넘기면 fabric 캔버스의 width/height가 해당 크기로 생성된다', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    let fabricCanvasRef

    await act(async () => {
      root.render(createElement(TestHostWithOptions, {
        options: { logicalSize: { width: 300, height: 300 } },
        onReady: (ref) => { fabricCanvasRef = ref },
      }))
    })

    expect(fabricCanvasRef.current.width).toBe(300)
    expect(fabricCanvasRef.current.height).toBe(300)

    await unmountIgnoringKnownDomWrapperError(root)
    container.remove()
  })

  it('backgroundColor를 넘기면 fabric 캔버스의 backgroundColor가 해당 값으로 설정된다', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    let fabricCanvasRef

    await act(async () => {
      root.render(createElement(TestHostWithOptions, {
        options: { backgroundColor: 'transparent' },
        onReady: (ref) => { fabricCanvasRef = ref },
      }))
    })

    expect(fabricCanvasRef.current.backgroundColor).toBe('transparent')

    await unmountIgnoringKnownDomWrapperError(root)
    container.remove()
  })

  it('logicalSize를 넘기지 않으면 onSave 콜백이 두 번째 인자로 기존 LOGICAL_CANVAS(1600x1000)를 받는다', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    const onSave = vi.fn()
    let fabricCanvasRef

    await act(async () => {
      root.render(createElement(TestHostWithOptions, {
        onSave,
        onReady: (ref) => { fabricCanvasRef = ref },
      }))
    })

    await act(async () => {
      fabricCanvasRef.current.add(new (await import('fabric')).Rect({ width: 10, height: 10 }))
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600))
    })

    expect(onSave).toHaveBeenCalled()
    expect(onSave.mock.calls[0][1]).toEqual({ width: 1600, height: 1000 })

    await unmountIgnoringKnownDomWrapperError(root)
    container.remove()
  })

  it('logicalSize를 넘기면 onSave 콜백이 두 번째 인자로 해당 logicalSize를 받는다', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    const onSave = vi.fn()
    let fabricCanvasRef

    await act(async () => {
      root.render(createElement(TestHostWithOptions, {
        onSave,
        options: { logicalSize: { width: 300, height: 300 } },
        onReady: (ref) => { fabricCanvasRef = ref },
      }))
    })

    await act(async () => {
      fabricCanvasRef.current.add(new (await import('fabric')).Rect({ width: 10, height: 10 }))
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600))
    })

    expect(onSave).toHaveBeenCalled()
    expect(onSave.mock.calls[0][1]).toEqual({ width: 300, height: 300 })

    await unmountIgnoringKnownDomWrapperError(root)
    container.remove()
  })
})

function TestHostWithLoad({ initialCanvasJSON, onReady, onLoaded }) {
  const canvasElRef = useRef(null)
  const fabricCanvasRef = useFabricCanvas(canvasElRef, initialCanvasJSON, null, { onLoaded })
  onReady(fabricCanvasRef)
  return createElement('canvas', { ref: canvasElRef })
}

describe('저장 후 재로드해도 애니메이션 GIF가 유지된다(gif-persistence)', () => {
  let rafCallbacksById
  let nextRafId

  beforeEach(() => {
    rafCallbacksById = new Map()
    nextRafId = 1
    vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => {
      const id = nextRafId++
      rafCallbacksById.set(id, cb)
      return id
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id) => {
      rafCallbacksById.delete(id)
    }))
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

  it('AnimatedGif를 직렬화한 JSON에는 frames 키가 포함되지 않는다', async () => {
    const blob = base64ToBlob(ANIMATED_GIF_BASE64, 'image/gif')
    const assetId = await saveAsset({ type: 'image', filename: 'anim.gif', mimeType: 'image/gif', blob })
    const sourceCanvas = new Canvas(document.createElement('canvas'))
    await addImageAssetToCanvas(sourceCanvas, { id: assetId, blob, mimeType: 'image/gif' })

    const serialized = sourceCanvas.toObject(EXTRA_SERIALIZED_PROPS)

    expect(JSON.stringify(serialized)).not.toContain('"frames"')
  })

  it('직렬화된 캔버스를 새 useFabricCanvas 인스턴스에 로드하면 AnimatedGif로 복원되고 공유 렌더 루프에 등록되어 계속 재생된다', async () => {
    const blob = base64ToBlob(ANIMATED_GIF_BASE64, 'image/gif')
    const assetId = await saveAsset({ type: 'image', filename: 'anim.gif', mimeType: 'image/gif', blob })
    const sourceCanvas = new Canvas(document.createElement('canvas'))
    await addImageAssetToCanvas(sourceCanvas, { id: assetId, blob, mimeType: 'image/gif' })
    const serialized = sourceCanvas.toObject(EXTRA_SERIALIZED_PROPS)

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    let fabricCanvasRef
    let onLoadedResolve
    const onLoadedPromise = new Promise((resolve) => { onLoadedResolve = resolve })

    await act(async () => {
      root.render(createElement(TestHostWithLoad, {
        initialCanvasJSON: serialized,
        onReady: (ref) => { fabricCanvasRef = ref },
        onLoaded: onLoadedResolve,
      }))
    })
    await onLoadedPromise

    const [restored] = fabricCanvasRef.current.getObjects()
    expect(restored).toBeInstanceOf(AnimatedGif)
    expect(restored.assetId).toBe(assetId)
    expect(restored.frames.length).toBeGreaterThanOrEqual(2)

    const renderAllSpy = vi.spyOn(fabricCanvasRef.current, 'renderAll')
    const frameIndexBeforeTick = restored.currentFrameIndex
    runLatestScheduledTick(1000)

    expect(restored.currentFrameIndex).not.toBe(frameIndexBeforeTick)
    expect(renderAllSpy).toHaveBeenCalledTimes(1)

    container.remove()
  })
})
