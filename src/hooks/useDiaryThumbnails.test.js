import { describe, expect, it } from 'vitest'
import { Rect, StaticCanvas } from 'fabric'
import { buildThumbnail, listDiaryEntries } from './useDiaryThumbnails'

function createCanvasJSONWithRect() {
  const canvas = new StaticCanvas(undefined, { width: 800, height: 600 })
  canvas.add(new Rect({ left: 10, top: 10, width: 100, height: 80, fill: '#ff0000' }))
  const json = canvas.toJSON()
  canvas.dispose()
  return json
}

/** PNG 헤더(IHDR)에서 픽셀 크기를 읽는다. 바이트 16~23이 width/height(빅엔디언 uint32). */
function parsePngSize(dataUrl) {
  const base64 = dataUrl.split(',')[1]
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const view = new DataView(bytes.buffer)
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

describe('buildThumbnail', () => {
  it('canvasJSON을 복원해 PNG data URL을 반환한다', async () => {
    const canvasJSON = createCanvasJSONWithRect()

    const dataUrl = await buildThumbnail(canvasJSON, { width: 800, height: 600 })

    expect(dataUrl).toMatch(/^data:image\/png;base64,/)
  })

  it('썸네일 크기는 지정한 캔버스 크기의 0.2배다 (800×600 → 160×120)', async () => {
    const canvasJSON = createCanvasJSONWithRect()

    const dataUrl = await buildThumbnail(canvasJSON, { width: 800, height: 600 })

    expect(parsePngSize(dataUrl)).toEqual({ width: 160, height: 120 })
  })

  it('다른 캔버스 크기(1400×900)를 주면 그 크기 기준으로 축소한다 (280×180)', async () => {
    const canvasJSON = createCanvasJSONWithRect()

    const dataUrl = await buildThumbnail(canvasJSON, { width: 1400, height: 900 })

    expect(parsePngSize(dataUrl)).toEqual({ width: 280, height: 180 })
  })
})

describe('listDiaryEntries', () => {
  it('diary 탭에 canvasJSON이 있는 날짜만 골라 날짜 내림차순으로 반환한다', () => {
    const canvasJSON = { objects: [] }
    const allData = {
      '2026-07-01': { diary: { canvasJSON, canvasSize: { width: 1400, height: 900 } } },
      '2026-07-05': { diary: { canvasJSON } },
      '2026-07-03': { diary: { canvasJSON: null }, todos: [] },
      '2026-07-02': { movie: { canvasJSON } },
    }

    const entries = listDiaryEntries(allData)

    expect(entries).toEqual([
      { dateKey: '2026-07-05', canvasJSON, canvasSize: null },
      { dateKey: '2026-07-01', canvasJSON, canvasSize: { width: 1400, height: 900 } },
    ])
  })

  it('데이터가 비어 있으면 빈 배열을 반환한다', () => {
    expect(listDiaryEntries({})).toEqual([])
  })
})
