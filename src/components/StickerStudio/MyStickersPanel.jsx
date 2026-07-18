import { useEffect, useState } from 'react'
import { createAssetObjectURL } from '../../storage/assetStorage'

/**
 * 등록된 스티커 목록의 blob마다 objectURL을 만들어 { assetId: url } 맵으로 반환한다.
 * 목록이 바뀔 때마다 이전 objectURL을 해제해 메모리 누수를 막는다.
 * @param {import('../../storage/assetStorage').AssetRecord[]} stickers
 * @returns {Record<string, string>}
 */
function useStickerThumbnailUrls(stickers) {
  const [urls, setUrls] = useState({})

  useEffect(() => {
    const nextUrls = Object.fromEntries(
      stickers.map((asset) => [asset.id, createAssetObjectURL(asset.blob)]),
    )
    setUrls(nextUrls)

    return () => {
      Object.values(nextUrls).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [stickers])

  return urls
}

/**
 * 저장된 스티커 목록을 썸네일 그리드로 보여주는 패널(AssetImportPanel의 이미지 그리드와
 * 동일 패턴). 항목을 클릭하면 onSelectSticker(asset)로 캔버스 로드를 위임한다(PRD 섹션 6).
 * @param {{
 *   stickers: import('../../storage/assetStorage').AssetRecord[],
 *   onSelectSticker: (asset: import('../../storage/assetStorage').AssetRecord) => void,
 * }} props
 */
export function MyStickersPanel({ stickers, onSelectSticker }) {
  const thumbnailUrls = useStickerThumbnailUrls(stickers)

  return (
    <div style={{ fontSize: '12px', color: '#333' }}>
      <div>내 스티커 ({stickers.length})</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '6px',
          margin: '4px 0 0',
        }}
      >
        {stickers.map((asset) => (
          <button
            key={asset.id}
            type="button"
            title={asset.filename}
            onClick={() => onSelectSticker?.(asset)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              padding: '4px',
              border: '1px solid transparent',
              borderRadius: 3,
              background: 'none',
              cursor: 'pointer',
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            <img
              src={thumbnailUrls[asset.id]}
              alt={asset.filename}
              style={{
                width: '100%',
                maxWidth: '48px',
                height: '48px',
                objectFit: 'cover',
                border: '1px solid #7d7d64',
                borderRadius: 2,
                background: '#fff',
              }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
