import 'fake-indexeddb/auto'
// jsdom의 Blob은 Node 내장 structuredClone이 인식하는 Blob과 다른 클래스라
// fake-indexeddb를 거치면 내용이 유실된다(assetStorage.test.js와 동일 이슈).
// 프로덕션 코드는 스펙대로 실제 fetch(dataUrl)을 그대로 쓰되, 테스트에서만
// fetch가 node:buffer의 Blob을 반환하도록 스텁해 우회한다.
import { Blob as NodeBlob } from 'node:buffer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runAssetMigration } from './assetMigration'
import { loadAllDiaryData, saveAllDiaryData } from './diaryStorage'
import { getAsset } from './assetStorage'

const MIGRATION_DONE_KEY = 'diary-asset-migration-done'
// "hello"의 base64
const BASE64_IMAGE_SRC = 'data:image/png;base64,aGVsbG8='

function deleteAssetsDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('diary-assets')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

function decodeDataUrlToNodeBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',')
  const mimeType = header.match(/data:(.*);base64/)[1]
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
  return new NodeBlob([bytes], { type: mimeType })
}

function buildDiaryDataWithBase64Background() {
  return {
    '2026-07-18': {
      diary: {
        canvasJSON: {
          objects: [
            { type: 'image', src: BASE64_IMAGE_SRC, left: 0, top: 0, isBackground: true },
            { type: 'rect', left: 10, top: 10, width: 20, height: 20 },
          ],
        },
        canvasSize: { width: 1600, height: 1000 },
      },
    },
  }
}

beforeEach(async () => {
  localStorage.clear()
  await deleteAssetsDatabase()
  vi.stubGlobal('fetch', async (dataUrl) => ({ blob: async () => decodeDataUrlToNodeBlob(dataUrl) }))
})

describe('runAssetMigration', () => {
  it('base64 src를 가진 오브젝트를 assetId 참조로 교체하고 원본을 assetStorage에 저장한다', async () => {
    saveAllDiaryData(buildDiaryDataWithBase64Background())

    await runAssetMigration()

    const migratedObjects = loadAllDiaryData()['2026-07-18'].diary.canvasJSON.objects
    const migratedBackground = migratedObjects[0]
    expect(migratedBackground.src).toBeUndefined()
    expect(migratedBackground.assetId).toEqual(expect.any(String))
    expect(migratedBackground.left).toBe(0)
    expect(migratedBackground.isBackground).toBe(true)
    // base64가 아니었던 오브젝트는 그대로 유지된다
    expect(migratedObjects[1]).toEqual({ type: 'rect', left: 10, top: 10, width: 20, height: 20 })

    const record = await getAsset(migratedBackground.assetId)
    expect(record.mimeType).toBe('image/png')
    expect(await record.blob.text()).toBe('hello')

    expect(localStorage.getItem(MIGRATION_DONE_KEY)).toBe('true')
  })

  it('완료 플래그가 이미 설정돼 있으면 재실행해도 데이터를 바꾸지 않는다(멱등성)', async () => {
    saveAllDiaryData(buildDiaryDataWithBase64Background())
    localStorage.setItem(MIGRATION_DONE_KEY, 'true')

    await runAssetMigration()

    const objects = loadAllDiaryData()['2026-07-18'].diary.canvasJSON.objects
    expect(objects[0].src).toBe(BASE64_IMAGE_SRC)
    expect(objects[0].assetId).toBeUndefined()
  })
})
