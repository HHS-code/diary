import 'fake-indexeddb/auto'
// jsdom의 Blob은 Node 내장 structuredClone이 인식하는 Blob과 다른 클래스라
// fake-indexeddb를 거치면 내용이 유실된다 — 테스트에서만 Node의 Blob을 사용해 우회한다.
// (실제 브라우저 환경의 structuredClone은 이 문제가 없다: https://github.com/dumbmatter/fakeIndexedDB/issues/88)
import { Blob } from 'node:buffer'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteAsset, getAsset, listAssets, saveAsset } from './assetStorage'

function deleteAssetsDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('diary-assets')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

function createImageBlob() {
  return new Blob(['fake-image-bytes'], { type: 'image/png' })
}

function createFontBlob() {
  return new Blob(['fake-font-bytes'], { type: 'font/ttf' })
}

beforeEach(async () => {
  await deleteAssetsDatabase()
})

describe('assetStorage', () => {
  it('saveAsset으로 저장한 이미지를 getAsset으로 다시 읽으면 blob/filename/mimeType이 일치한다', async () => {
    const blob = createImageBlob()

    const id = await saveAsset({ type: 'image', filename: 'cat.png', mimeType: 'image/png', blob })
    const record = await getAsset(id)

    expect(record.id).toBe(id)
    expect(record.filename).toBe('cat.png')
    expect(record.mimeType).toBe('image/png')
    expect(await record.blob.text()).toBe(await blob.text())
  })

  it('getAsset은 존재하지 않는 id에 대해 null을 반환한다', async () => {
    const record = await getAsset('no-such-id')

    expect(record).toBeNull()
  })

  it('listAssets(type)은 해당 타입의 에셋만 createdAt 오름차순으로 반환한다', async () => {
    const imageId = await saveAsset({ type: 'image', filename: 'a.png', mimeType: 'image/png', blob: createImageBlob() })
    const fontId = await saveAsset({
      type: 'font',
      filename: 'b.ttf',
      mimeType: 'font/ttf',
      blob: createFontBlob(),
      fontFamily: 'b',
    })

    const images = await listAssets('image')
    const fonts = await listAssets('font')

    expect(images.map((asset) => asset.id)).toEqual([imageId])
    expect(fonts.map((asset) => asset.id)).toEqual([fontId])
  })

  it('deleteAsset 후 getAsset은 null을 반환한다', async () => {
    const id = await saveAsset({ type: 'image', filename: 'a.png', mimeType: 'image/png', blob: createImageBlob() })

    await deleteAsset(id)
    const record = await getAsset(id)

    expect(record).toBeNull()
  })
})
