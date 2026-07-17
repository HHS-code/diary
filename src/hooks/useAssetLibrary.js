import { useCallback, useEffect, useState } from 'react'
import { listAssets, saveAsset } from '../storage/assetStorage'

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
const FONT_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2']
const FONT_FAMILY_SUFFIX_LENGTH = 4

/**
 * 파일명 확장자로 에셋 종류를 구분한다. 어느 쪽도 아니면 null.
 * @param {string} filename
 * @returns {"image" | "font" | null}
 */
export function classifyAssetType(filename) {
  const extension = getExtension(filename)
  if (IMAGE_EXTENSIONS.includes(extension)) return 'image'
  if (FONT_EXTENSIONS.includes(extension)) return 'font'
  return null
}

function getExtension(filename) {
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex === -1) return ''
  return filename.slice(dotIndex).toLowerCase()
}

function stripExtension(filename) {
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex === -1) return filename
  return filename.slice(0, dotIndex)
}

/**
 * filename에서 유추한 폰트 패밀리명이 existingFonts와 겹치면 짧은 id suffix를 붙인다.
 * @param {string} filename
 * @param {import('../storage/assetStorage').AssetRecord[]} existingFonts
 * @returns {string}
 */
function buildUniqueFontFamily(filename, existingFonts) {
  const base = stripExtension(filename)
  const isTaken = existingFonts.some((font) => font.fontFamily === base)
  if (!isTaken) return base

  const suffix = crypto.randomUUID().slice(0, FONT_FAMILY_SUFFIX_LENGTH)
  return `${base}-${suffix}`
}

/**
 * IndexedDB에 등록된 이미지/폰트 에셋 목록을 상태로 유지하고, 새 에셋 등록 함수를 제공하는 훅.
 * @returns {{
 *   images: import('../storage/assetStorage').AssetRecord[],
 *   fonts: import('../storage/assetStorage').AssetRecord[],
 *   registerImage: (file: File) => Promise<string>,
 *   registerFont: (file: File) => Promise<string>,
 *   refresh: () => Promise<void>,
 * }}
 */
export function useAssetLibrary() {
  const [images, setImages] = useState([])
  const [fonts, setFonts] = useState([])

  const refresh = useCallback(async () => {
    const [nextImages, nextFonts] = await Promise.all([listAssets('image'), listAssets('font')])
    setImages(nextImages)
    setFonts(nextFonts)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const registerImage = useCallback(
    async (file) => {
      const id = await saveAsset({ type: 'image', filename: file.name, mimeType: file.type, blob: file })
      await refresh()
      return id
    },
    [refresh],
  )

  const registerFont = useCallback(
    async (file) => {
      const fontFamily = buildUniqueFontFamily(file.name, fonts)
      const id = await saveAsset({
        type: 'font',
        filename: file.name,
        mimeType: file.type,
        blob: file,
        fontFamily,
      })
      await refresh()
      return id
    },
    [refresh, fonts],
  )

  return { images, fonts, registerImage, registerFont, refresh }
}
