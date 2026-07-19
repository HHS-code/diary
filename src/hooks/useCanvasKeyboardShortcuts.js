import { useEffect, useRef } from 'react'
import { extractYoutubeVideoId } from '../fabric/youtubeUrl'

const CLONE_OFFSET = 10

/**
 * 캔버스 오브젝트에 대한 키보드 단축키(Delete·Backspace/Ctrl+C/Ctrl+V)를 등록하는 커스텀 훅.
 * 텍스트(IText/Textbox) 편집 중에는 아무 동작도 하지 않는다.
 * Ctrl+V 시 우선순위: (1) 네이티브 paste 이벤트의 clipboardData.files에 이미지가 있으면 그걸 사용
 * (OS 파일탐색기에서 복사한 이미지 파일이 여기로 들어오는 경우가 있음),
 * (2) 없으면 navigator.clipboard.read()로 이미지 MIME 타입 확인,
 * (3) 그마저 없으면 클립보드 텍스트가 유튜브 URL인지 확인해 카드로 붙여넣고,
 * (4) 그마저 아니면 기존 오브젝트 붙여넣기로 폴백한다.
 * 이미지를 찾으면 registerAndPlaceImage(file)로 에셋 등록과 캔버스 배치를 모두 위임하고,
 * 유튜브 URL을 찾으면 registerAndPlaceYoutubeCard(videoId)로 카드 배치를 위임한다.
 * @param {React.RefObject<import('fabric').Canvas | null>} fabricCanvasRef
 * @param {{
 *   registerAndPlaceImage?: (file: File) => Promise<void>,
 *   registerAndPlaceYoutubeCard?: (videoId: string) => Promise<void>,
 * }} [assetLibrary]
 * @returns {void}
 */
export function useCanvasKeyboardShortcuts(
  fabricCanvasRef,
  { registerAndPlaceImage, registerAndPlaceYoutubeCard } = {},
) {
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

    function findImageFileInDataTransfer(dataTransfer) {
      if (!dataTransfer) return null

      const fileFromFiles = Array.from(dataTransfer.files ?? []).find((file) =>
        file.type.startsWith('image/'),
      )
      if (fileFromFiles) return fileFromFiles

      const fileFromItems = Array.from(dataTransfer.items ?? [])
        .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
        ?.getAsFile()
      return fileFromItems ?? null
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

    async function pasteImageOrClipboardObject(canvas, nativeImageFile, clipboardText) {
      const imageFile = nativeImageFile ?? (await readClipboardImageFile())
      if (imageFile && registerAndPlaceImage) {
        await registerAndPlaceImage(imageFile)
        return
      }

      const videoId = extractYoutubeVideoId(clipboardText)
      if (videoId && registerAndPlaceYoutubeCard) {
        await registerAndPlaceYoutubeCard(videoId)
        return
      }

      await pasteFromClipboard(canvas)
    }

    function handleKeyDown(event) {
      const canvas = fabricCanvasRef.current
      if (!canvas) return
      if (isEditingText(canvas)) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removeActiveObject(canvas)
        return
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey
      if (isCtrlOrCmd && event.key === 'c') {
        copyActiveObject(canvas)
      }
    }

    function handlePaste(event) {
      const canvas = fabricCanvasRef.current
      if (!canvas) return
      if (isEditingText(canvas)) return

      const nativeImageFile = findImageFileInDataTransfer(event.clipboardData)
      const clipboardText = event.clipboardData?.getData?.('text')
      pasteImageOrClipboardObject(canvas, nativeImageFile, clipboardText)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('paste', handlePaste)
    }
  }, [fabricCanvasRef, registerAndPlaceImage, registerAndPlaceYoutubeCard])
}
