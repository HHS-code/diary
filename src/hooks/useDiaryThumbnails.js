import { useEffect, useState } from 'react'
import { StaticCanvas } from 'fabric'
import { loadAllDiaryData, getDatePageData } from '../storage/diaryStorage'

// canvasSize 메타데이터가 없는 구버전 데이터는 이 크기로 저장된 것으로 간주한다.
const LEGACY_CANVAS_SIZE = { width: 800, height: 600 }
const THUMBNAIL_MULTIPLIER = 0.2

/**
 * 전체 다이어리 데이터에서 diary 탭에 canvasJSON이 있는 날짜만 골라
 * 날짜 내림차순으로 반환한다. (순수 함수)
 * @param {import('../storage/diaryStorage').DiaryData} allData
 * @returns {{ dateKey: string, canvasJSON: object, canvasSize: { width: number, height: number } | null }[]}
 */
export function listDiaryEntries(allData) {
  const dateKeysNewestFirst = Object.keys(allData).sort().reverse()
  const entries = []
  for (const dateKey of dateKeysNewestFirst) {
    const { canvasJSON, canvasSize } = getDatePageData(allData, dateKey, 'diary')
    if (canvasJSON) {
      entries.push({ dateKey, canvasJSON, canvasSize })
    }
  }
  return entries
}

/**
 * canvasJSON을 오프스크린 StaticCanvas(DOM 미부착)에 복원해
 * 0.2배로 축소한 PNG data URL을 만들고 캔버스를 dispose한다.
 * @param {object} canvasJSON
 * @param {{ width: number, height: number }} size - 저장 당시 캔버스 크기
 * @returns {Promise<string>}
 */
export async function buildThumbnail(canvasJSON, size) {
  const canvas = new StaticCanvas(undefined, { width: size.width, height: size.height })
  try {
    await canvas.loadFromJSON(canvasJSON)
    canvas.renderAll()
    return canvas.toDataURL({ format: 'png', multiplier: THUMBNAIL_MULTIPLIER })
  } finally {
    canvas.dispose()
  }
}

/**
 * 저장된 전체 다이어리를 읽어 날짜별 썸네일 이미지를 생성하는 커스텀 훅.
 * 읽기 전용 — 저장 함수는 호출하지 않는다.
 * @returns {{ thumbnails: { dateKey: string, dataUrl: string }[], isLoading: boolean }}
 */
export function useDiaryThumbnails() {
  const [thumbnails, setThumbnails] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function generateAllThumbnails() {
      const entries = listDiaryEntries(loadAllDiaryData())
      const generated = []
      for (const entry of entries) {
        if (cancelled) return
        const size = entry.canvasSize ?? LEGACY_CANVAS_SIZE
        const dataUrl = await buildThumbnail(entry.canvasJSON, size)
        generated.push({ dateKey: entry.dateKey, dataUrl })
      }
      if (cancelled) return
      setThumbnails(generated)
      setIsLoading(false)
    }

    generateAllThumbnails()

    return () => {
      cancelled = true
    }
  }, [])

  return { thumbnails, isLoading }
}
