import 'fake-indexeddb/auto'
// jsdom Blob과 Node structuredClone 간 비호환 우회(assetStorage.test.js와 동일 이유).
import { Blob } from 'node:buffer'
import { beforeEach, describe, expect, it } from 'vitest'
import { resolveCanvasAssetReferences } from './useFabricCanvas'
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
