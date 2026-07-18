import { FabricImage } from 'fabric'
import { LOGICAL_CANVAS } from './useFabricCanvas'
import { saveAsset, createAssetObjectURL } from '../storage/assetStorage'

/**
 * 캔버스 배경(색상/이미지)을 다루는 커스텀 훅.
 *
 * 배경 이미지는 fabric의 backgroundImage가 아니라 `isBackground: true`로
 * 태그된 일반 오브젝트로 추가한다 — 사용자가 다른 오브젝트처럼 자유롭게
 * 이동·크기조절한 뒤, lockBackground로 고정(선택 불가)하는 흐름.
 *
 * useFabricCanvas의 오토세이브는 object:added/modified/removed만 구독하므로,
 * 오브젝트를 거치지 않는 변경(배경색 등)은 'object:modified'를 fire해
 * 기존 저장 파이프라인을 그대로 태운다.
 * @param {React.RefObject<import('fabric').Canvas | null>} fabricCanvasRef
 * @returns {{
 *   setColor: (hex: string) => void,
 *   setImage: (file: File) => Promise<void>,
 *   lockBackground: () => void,
 *   clearBackground: () => void,
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

  async function addAdjustableBackgroundImage(canvas, objectURL, assetId) {
    const img = await FabricImage.fromURL(objectURL)
    // 처음엔 캔버스(논리 좌표계)를 덮는 크기로 깔아주되, 이후 조절은 사용자 몫.
    // canvas.getWidth()는 표시(축소된) 크기라 쓰지 않는다.
    const coverScale = Math.max(
      LOGICAL_CANVAS.width / img.width,
      LOGICAL_CANVAS.height / img.height,
    )
    img.set({ left: 0, top: 0, scaleX: coverScale, scaleY: coverScale, isBackground: true, assetId })
    canvas.add(img)
    canvas.sendObjectToBack(img)
    canvas.setActiveObject(img)
    canvas.renderAll()
  }

  async function setImage(file) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const assetId = await saveAsset({ type: 'image', filename: file.name, mimeType: file.type, blob: file })
    const objectURL = createAssetObjectURL(file)
    await addAdjustableBackgroundImage(canvas, objectURL, assetId)
  }

  function lockBackground() {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const backgrounds = canvas.getObjects().filter((object) => object.isBackground)
    backgrounds.forEach((object) => {
      object.set({ selectable: false, evented: false })
      canvas.sendObjectToBack(object)
    })
    canvas.discardActiveObject()
    canvas.renderAll()
    canvas.fire('object:modified')
  }

  function clearBackground() {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const backgrounds = canvas.getObjects().filter((object) => object.isBackground)
    backgrounds.forEach((object) => canvas.remove(object))
    // 구버전(backgroundImage 방식)으로 저장된 배경도 함께 초기화
    canvas.backgroundImage = null
    canvas.renderAll()
    canvas.fire('object:modified')
  }

  return { setColor, setImage, lockBackground, clearBackground }
}
