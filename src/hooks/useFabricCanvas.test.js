import 'fake-indexeddb/auto'
// jsdom Blob과 Node structuredClone 간 비호환 우회(assetStorage.test.js와 동일 이유).
import { Blob } from 'node:buffer'
import { createElement, useRef } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveCanvasAssetReferences, useFabricCanvas } from './useFabricCanvas'
import { saveAsset } from '../storage/assetStorage'

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
