import { useRef } from 'react'
import { FabricImage } from 'fabric'
import { MdAddPhotoAlternate } from 'react-icons/md'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

/**
 * 이미지 파일을 선택해 Fabric 캔버스에 추가하는 버튼.
 * 캔버스보다 큰 이미지는 캔버스 안에 들어오도록 스케일 다운 후 중앙에 배치한다.
 * @param {{ fabricCanvasRef: React.RefObject<import('fabric').Canvas | null> }} props
 */
export function ImageUploadButton({ fabricCanvasRef }) {
  const inputRef = useRef(null)

  async function addImageToCanvas(dataUrl) {
    const fc = fabricCanvasRef.current
    if (!fc) return

    const img = await FabricImage.fromURL(dataUrl)
    const scaleToFit = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height, 1)
    img.scale(scaleToFit)
    img.set({
      left: (CANVAS_WIDTH - img.getScaledWidth()) / 2,
      top: (CANVAS_HEIGHT - img.getScaledHeight()) / 2,
    })

    fc.add(img)
    fc.setActiveObject(img)
    fc.renderAll()
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => addImageToCanvas(e.target.result)
    reader.readAsDataURL(file)

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
        <MdAddPhotoAlternate size={18} /> 이미지 추가
      </button>
    </>
  )
}
