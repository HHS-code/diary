import { useEffect, useRef } from 'react'

const CLONE_OFFSET = 10

/**
 * 캔버스 오브젝트에 대한 키보드 단축키(Delete/Ctrl+C/Ctrl+V)를 등록하는 커스텀 훅.
 * 텍스트(IText/Textbox) 편집 중에는 아무 동작도 하지 않는다.
 * Ctrl+V 시 클립보드에 이미지 파일이 있으면 registerImage로 에셋 등록하고,
 * 없거나 클립보드 접근이 불가능하면 기존 오브젝트 붙여넣기로 폴백한다.
 * @param {React.RefObject<import('fabric').Canvas | null>} fabricCanvasRef
 * @param {{ registerImage?: (file: File) => Promise<string> }} [assetLibrary]
 * @returns {void}
 */
export function useCanvasKeyboardShortcuts(fabricCanvasRef, { registerImage } = {}) {
  const clipboardRef = useRef(null)

  useEffect(() => {
    function isEditingText(canvas) {
      return Boolean(canvas.getActiveObject()?.isEditing)
    }

    function removeActiveObject(canvas) {
      const active = canvas.getActiveObject()
      if (!active) return

      if (typeof active.getObjects === 'function') {
        active.getObjects().forEach((object) => canvas.remove(object))
      } else {
        canvas.remove(active)
      }
      canvas.discardActiveObject()
      canvas.renderAll()
    }

    async function copyActiveObject(canvas) {
      const active = canvas.getActiveObject()
      if (!active) return

      clipboardRef.current = await active.clone()
    }

    async function pasteFromClipboard(canvas) {
      if (!clipboardRef.current) return

      const clone = await clipboardRef.current.clone()
      clone.set({
        left: clone.left + CLONE_OFFSET,
        top: clone.top + CLONE_OFFSET,
      })
      canvas.add(clone)
      canvas.setActiveObject(clone)
      canvas.renderAll()
    }

    async function readClipboardImageFile() {
      if (!navigator.clipboard?.read) return null

      try {
        const items = await navigator.clipboard.read()
        for (const item of items) {
          const imageType = item.types.find((type) => type.startsWith('image/'))
          if (!imageType) continue

          const blob = await item.getType(imageType)
          return new File([blob], `clipboard.${imageType.split('/')[1]}`, { type: imageType })
        }
        return null
      } catch {
        return null
      }
    }

    async function pasteImageOrClipboardObject(canvas) {
      const imageFile = await readClipboardImageFile()
      if (imageFile && registerImage) {
        await registerImage(imageFile)
        return
      }
      await pasteFromClipboard(canvas)
    }

    function handleKeyDown(event) {
      const canvas = fabricCanvasRef.current
      if (!canvas) return
      if (isEditingText(canvas)) return

      const isCtrlOrCmd = event.ctrlKey || event.metaKey

      if (event.key === 'Delete') {
        removeActiveObject(canvas)
        return
      }

      if (isCtrlOrCmd && event.key === 'c') {
        copyActiveObject(canvas)
        return
      }

      if (isCtrlOrCmd && event.key === 'v') {
        pasteImageOrClipboardObject(canvas)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fabricCanvasRef, registerImage])
}
