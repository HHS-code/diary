import { useEffect, useState } from 'react'
import { listAssets, createAssetObjectURL } from '../storage/assetStorage'

/**
 * IndexedDB에 등록된 폰트 에셋을 FontFace API로 document.fonts에 등록하고,
 * TextMemoButton 드롭다운에 이어붙일 수 있는 {label, value} 목록을 제공하는 훅.
 *
 * fontAssets를 전달하면(예: useAssetLibrary().fonts) 그 목록을 그대로 쓰고
 * 배열이 바뀔 때마다 다시 로드한다. 생략하면 마운트 시 1회 assetStorage에서 직접 불러온다.
 * @param {import('../storage/assetStorage').AssetRecord[] | null} [fontAssets]
 * @returns {{ customFonts: { label: string, value: string }[] }}
 */
export function useFontRegistry(fontAssets = null) {
  const [loadedFontAssets, setLoadedFontAssets] = useState([])
  const [customFonts, setCustomFonts] = useState([])

  useEffect(() => {
    if (fontAssets !== null) return
    let isCancelled = false

    listAssets('font').then((assets) => {
      if (!isCancelled) setLoadedFontAssets(assets)
    })

    return () => {
      isCancelled = true
    }
  }, [fontAssets])

  const fontAssetsToRegister = fontAssets ?? loadedFontAssets

  useEffect(() => {
    let isCancelled = false

    async function registerFontAssets() {
      const registered = []
      for (const asset of fontAssetsToRegister) {
        try {
          if (!isFontFamilyRegistered(asset.fontFamily)) {
            await addFontFaceToDocument(asset)
          }
          registered.push({ label: asset.fontFamily, value: asset.fontFamily })
        } catch {
          // 손상되었거나 브라우저가 디코딩할 수 없는 폰트 파일은 건너뛰고 나머지는 계속 등록한다.
        }
      }
      if (!isCancelled) setCustomFonts(registered)
    }

    registerFontAssets()
    return () => {
      isCancelled = true
    }
  }, [fontAssetsToRegister])

  return { customFonts }
}

function isFontFamilyRegistered(fontFamily) {
  for (const face of document.fonts) {
    if (face.family === fontFamily) return true
  }
  return false
}

async function addFontFaceToDocument(asset) {
  const objectURL = createAssetObjectURL(asset.blob)
  const fontFace = new FontFace(asset.fontFamily, `url(${objectURL})`)
  await fontFace.load()
  document.fonts.add(fontFace)
}
