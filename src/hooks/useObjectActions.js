const CLONE_OFFSET = 10

/**
 * 캔버스 위 오브젝트에 대한 복사/삭제/레이어 순서 조작을 제공하는 커스텀 훅.
 * 각 함수는 대상 오브젝트를 인자로 받아 Fabric.js Canvas API를 호출한다.
 * @param {React.RefObject<import('fabric').Canvas | null>} fabricCanvasRef
 * @returns {{
 *   copy: (target: import('fabric').FabricObject) => void,
 *   remove: (target: import('fabric').FabricObject) => void,
 *   bringToFront: (target: import('fabric').FabricObject) => void,
 *   sendToBack: (target: import('fabric').FabricObject) => void,
 *   bringForward: (target: import('fabric').FabricObject) => void,
 *   sendBackward: (target: import('fabric').FabricObject) => void,
 * }}
 */
export function useObjectActions(fabricCanvasRef) {
  async function copy(target) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const clone = await target.clone()
    clone.set({
      left: clone.left + CLONE_OFFSET,
      top: clone.top + CLONE_OFFSET,
    })
    canvas.add(clone)
    canvas.setActiveObject(clone)
    canvas.renderAll()
  }

  function remove(target) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    canvas.remove(target)
    canvas.renderAll()
  }

  function bringToFront(target) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    canvas.bringObjectToFront(target)
    canvas.renderAll()
  }

  function sendToBack(target) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    canvas.sendObjectToBack(target)
    canvas.renderAll()
  }

  function bringForward(target) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    canvas.bringObjectForward(target)
    canvas.renderAll()
  }

  function sendBackward(target) {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    canvas.sendObjectBackwards(target)
    canvas.renderAll()
  }

  return { copy, remove, bringToFront, sendToBack, bringForward, sendBackward }
}
