import { useRef } from 'react'
import { MdAddPhotoAlternate } from 'react-icons/md'
import { FabricImage } from 'fabric'
import { createAssetObjectURL } from '../../storage/assetStorage'

/**
 * 이미지 파일을 선택해 스티커 스튜디오 캔버스에 추가하는 버튼.
 * ImageUploadButton(다이어리)과 달리 assetStorage에 저장하지 않는다 — 스티커 스튜디오는
 * "완성" 버튼을 눌렀을 때만 저장하므로(ADR-4), 여기서는 편집 중인 임시 오브젝트로만 추가한다.
 * 캔버스보다 큰 이미지는 비율을 유지한 채 스케일 다운해 캔버스 안에 들어오도록 한다.
 * @param {{ fabricCanvasRef: React.RefObject<import('fabric').Canvas | null> }} props
 */
export function StickerImageUpload({ fabricCanvasRef }) {
  const inputRef = useRef(null)

  async function addImageToCanvas(file) {
    const fc = fabricCanvasRef.current
    if (!fc) return

    const img = await FabricImage.fromURL(createAssetObjectURL(file))
    const scaleToFit = Math.min(fc.getWidth() / img.width, fc.getHeight() / img.height, 1)
    img.scale(scaleToFit)
    img.set({
      left: (fc.getWidth() - img.getScaledWidth()) / 2,
      top: (fc.getHeight() - img.getScaledHeight()) / 2,
    })

    fc.add(img)
    fc.setActiveObject(img)
    fc.renderAll()
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    addImageToCanvas(file)

    // 같은 파일을 다시 선택할 수 있도록 초기화
    event.target.value = ''
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          padding: '8px 16px',
          border: '1px solid #7d7d64',
          borderRadius: 3,
          background: 'linear-gradient(180deg,#fdfdfa,#dcd9c7)',
          cursor: 'pointer',
          fontSize: '14px',
          width: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}
      >
        <MdAddPhotoAlternate size={18} /> 이미지 업로드
      </button>
    </>
  )
}
