import 'fake-indexeddb/auto'
// jsdom의 Blob은 Node 내장 structuredClone이 인식하는 Blob과 다른 클래스라
// fake-indexeddb를 거치면 내용이 유실된다(assetStorage.test.js와 동일 이슈).
// File 대신 node:buffer의 Blob에 name/type을 붙여 File을 흉내낸다.
import { Blob as NodeBlob } from 'node:buffer'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAssetLibrary } from './useAssetLibrary'

function deleteAssetsDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('diary-assets')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

function createFakeFile(name, type, content = 'fake-bytes') {
  const blob = new NodeBlob([content], { type })
  blob.name = name
  return blob
}

let container
let root
let latestLibrary

function TestHost() {
  latestLibrary = useAssetLibrary()
  return null
}

function renderHost() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<TestHost />)
  })
}

beforeEach(async () => {
  await deleteAssetsDatabase()
  latestLibrary = undefined
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('useAssetLibrary', () => {
  it('registerImage로 등록한 이미지가 images 상태에 반영된다', async () => {
    renderHost()
    const file = createFakeFile('cat.png', 'image/png')

    await act(async () => {
      await latestLibrary.registerImage(file)
    })

    expect(latestLibrary.images).toHaveLength(1)
    expect(latestLibrary.images[0].filename).toBe('cat.png')
    expect(latestLibrary.images[0].type).toBe('image')
    expect(latestLibrary.fonts).toHaveLength(0)
  })

  it('registerFont로 등록한 폰트가 fonts 상태에 반영되고 파일명을 fontFamily 기본값으로 쓴다', async () => {
    renderHost()
    const file = createFakeFile('MyFont.ttf', 'font/ttf')

    await act(async () => {
      await latestLibrary.registerFont(file)
    })

    expect(latestLibrary.fonts).toHaveLength(1)
    expect(latestLibrary.fonts[0].filename).toBe('MyFont.ttf')
    expect(latestLibrary.fonts[0].fontFamily).toBe('MyFont')
    expect(latestLibrary.images).toHaveLength(0)
  })

  it('같은 이름의 폰트를 두 번 등록하면 두 번째는 suffix가 붙어 충돌하지 않는다', async () => {
    renderHost()

    await act(async () => {
      await latestLibrary.registerFont(createFakeFile('MyFont.ttf', 'font/ttf'))
    })
    await act(async () => {
      await latestLibrary.registerFont(createFakeFile('MyFont.ttf', 'font/ttf'))
    })

    expect(latestLibrary.fonts).toHaveLength(2)
    const [first, second] = latestLibrary.fonts
    expect(first.fontFamily).toBe('MyFont')
    expect(second.fontFamily).not.toBe('MyFont')
    expect(second.fontFamily.startsWith('MyFont-')).toBe(true)
  })
})
