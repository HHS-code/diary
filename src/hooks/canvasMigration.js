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

/**
 * fromSize 좌표계에 저장된 오브젝트들을 toSize 좌표계로 옮기되,
 * 비율을 유지한 채(찌그러짐 없음) 균일 배율로 축소/확대하고 가운데 정렬한다.
 * 구버전 데이터(기기별 크기로 저장됨)를 고정 논리 캔버스로 옮기는 1회 변환용.
 * fromSize와 toSize가 같으면 아무것도 하지 않는다.
 * @param {import('fabric').Canvas} canvas
 * @param {{ width: number, height: number }} fromSize
 * @param {{ width: number, height: number }} toSize
 * @returns {void}
 */
export function fitCanvasObjects(canvas, fromSize, toSize) {
  if (fromSize.width === toSize.width && fromSize.height === toSize.height) return

  const scale = Math.min(toSize.width / fromSize.width, toSize.height / fromSize.height)
  const offsetX = (toSize.width - fromSize.width * scale) / 2
  const offsetY = (toSize.height - fromSize.height * scale) / 2

  for (const obj of canvas.getObjects()) {
    obj.set({
      left: obj.left * scale + offsetX,
      top: obj.top * scale + offsetY,
      scaleX: obj.scaleX * scale,
      scaleY: obj.scaleY * scale,
    })
    obj.setCoords()
  }

  if (canvas.backgroundImage) {
    const background = canvas.backgroundImage
    background.set({
      left: background.left * scale + offsetX,
      top: background.top * scale + offsetY,
      scaleX: background.scaleX * scale,
      scaleY: background.scaleY * scale,
    })
  }

  canvas.renderAll()
}
