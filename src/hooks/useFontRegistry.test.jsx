import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFontRegistry } from './useFontRegistry'

vi.mock('../storage/assetStorage', () => ({
  listAssets: vi.fn(),
  createAssetObjectURL: vi.fn(() => 'blob:mock-url'),
}))

import { listAssets } from '../storage/assetStorage'

// jsdom은 CSS Font Loading API(FontFace, document.fonts)를 구현하지 않아
// 실제 브라우저의 FontFaceSet과 동일하게 add()/이터레이션이 되는 Set으로 대체한다.
class FakeFontFace {
  constructor(family, source) {
    this.family = family
    this.source = source
  }

  load() {
    if (this.family === 'BrokenFont') return Promise.reject(new Error('decode failed'))
    return Promise.resolve(this)
  }
}

let container
let root
let latestResult

function TestHost({ fontAssets }) {
  latestResult = useFontRegistry(fontAssets)
  return null
}

function renderHost(fontAssets) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<TestHost fontAssets={fontAssets} />)
  })
}

async function flushAsyncWork() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

beforeEach(() => {
  global.FontFace = FakeFontFace
  document.fonts = new Set()
  latestResult = undefined
  listAssets.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('useFontRegistry', () => {
  it('등록된 폰트 레코드가 있으면 document.fonts에 FontFace가 추가되고 customFonts에 나타난다', async () => {
    listAssets.mockResolvedValue([{ id: '1', fontFamily: 'MyFont', blob: {} }])

    renderHost()
    await flushAsyncWork()

    expect([...document.fonts].some((face) => face.family === 'MyFont')).toBe(true)
    expect(latestResult.customFonts).toEqual([{ label: 'MyFont', value: 'MyFont' }])
  })

  it('이미 document.fonts에 등록된 동일 family는 중복 등록하지 않는다', async () => {
    document.fonts.add(new FakeFontFace('MyFont', 'existing'))
    listAssets.mockResolvedValue([{ id: '1', fontFamily: 'MyFont', blob: {} }])

    renderHost()
    await flushAsyncWork()

    const matches = [...document.fonts].filter((face) => face.family === 'MyFont')
    expect(matches).toHaveLength(1)
    expect(matches[0].source).toBe('existing')
    expect(latestResult.customFonts).toEqual([{ label: 'MyFont', value: 'MyFont' }])
  })

  it('한 폰트의 FontFace 로드가 실패해도 나머지 폰트는 customFonts에 정상적으로 나타난다', async () => {
    listAssets.mockResolvedValue([
      { id: '1', fontFamily: 'BrokenFont', blob: {} },
      { id: '2', fontFamily: 'GoodFont', blob: {} },
    ])

    renderHost()
    await flushAsyncWork()

    expect(latestResult.customFonts).toEqual([{ label: 'GoodFont', value: 'GoodFont' }])
  })

  it('fontAssets 인자를 전달하면 자체 listAssets 호출 없이 그 목록으로 로드한다', async () => {
    renderHost([{ id: '1', fontFamily: 'InjectedFont', blob: {} }])
    await flushAsyncWork()

    expect(listAssets).not.toHaveBeenCalled()
    expect(latestResult.customFonts).toEqual([{ label: 'InjectedFont', value: 'InjectedFont' }])
  })
})
