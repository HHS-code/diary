import { FabricImage } from 'fabric'

/**
 * 캔버스 배경을 색상 또는 이미지로 설정하는 커스텀 훅.
 * useFabricCanvas의 오토세이브는 object:added/modified/removed만 구독하므로,
 * 배경 변경 직후 'object:modified'를 fire해 기존 저장 파이프라인을 그대로 태운다.
 * @param {React.RefObject<import('fabric').Canvas | null>} fabricCanvasRef
 * @returns {{
 *   setColor: (hex: string) => void,
 *   setImage: (file: File) => void,
 * }}
 */
export function useCanvasBackground(fabricCanvasRef) {
  function setColor(hex) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    canvas.backgroundColor = hex
    canvas.renderAll()
    canvas.fire('object:modified')
  }

  async function applyBackgroundImage(canvas, dataUrl) {
    const img = await FabricImage.fromURL(dataUrl)
    img.set({
      scaleX: canvas.getWidth() / img.width,
      scaleY: canvas.getHeight() / img.height,
    })
    canvas.backgroundImage = img
    canvas.renderAll()
    canvas.fire('object:modified')
  }

  function setImage(file) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const reader = new FileReader()
    reader.onload = (e) => applyBackgroundImage(canvas, e.target.result)
    reader.readAsDataURL(file)
  }

  return { setColor, setImage }
}
