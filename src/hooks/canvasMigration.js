/**
 * 캔버스 크기가 fromSize → toSize로 바뀔 때 모든 오브젝트의 좌표·크기를
 * 같은 비율로 재배치한다. 배경 이미지가 있으면 배경도 동일 비율로 스케일한다.
 * 로드 직후 1회만 호출하는 용도 — 저장은 새 크기 기준으로 다시 이루어진다.
 * @param {import('fabric').Canvas} canvas
 * @param {{ width: number, height: number }} fromSize
 * @param {{ width: number, height: number }} toSize
 * @returns {void}
 */
export function scaleCanvasObjects(canvas, fromSize, toSize) {
  const scaleX = toSize.width / fromSize.width
  const scaleY = toSize.height / fromSize.height
  if (scaleX === 1 && scaleY === 1) return

  for (const obj of canvas.getObjects()) {
    obj.set({
      left: obj.left * scaleX,
      top: obj.top * scaleY,
      scaleX: obj.scaleX * scaleX,
      scaleY: obj.scaleY * scaleY,
    })
    obj.setCoords()
  }

  if (canvas.backgroundImage) {
    const background = canvas.backgroundImage
    background.set({
      left: background.left * scaleX,
      top: background.top * scaleY,
      scaleX: background.scaleX * scaleX,
      scaleY: background.scaleY * scaleY,
    })
  }

  canvas.renderAll()
}
