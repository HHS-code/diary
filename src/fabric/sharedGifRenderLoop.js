/**
 * 캔버스 하나당 하나씩 만들어, 그 캔버스에 올라간 모든 AnimatedGif 오브젝트의
 * 프레임 갱신을 하나의 requestAnimationFrame 루프로 관리한다(ADR-4).
 * 틱마다 프레임이 실제로 바뀐 오브젝트가 하나라도 있을 때만 fabricCanvas.renderAll()을
 * 최대 1회 호출해, GIF 개수가 늘어도 렌더 호출 빈도가 늘지 않도록 한다.
 * @param {import('fabric').Canvas} fabricCanvas
 * @returns {{
 *   register: (obj: import('./AnimatedGif').AnimatedGif) => void,
 *   unregister: (obj: import('./AnimatedGif').AnimatedGif) => void,
 *   start: () => void,
 *   stop: () => void,
 * }}
 */
export function createSharedGifRenderLoop(fabricCanvas) {
  const animatedObjects = new Set()
  const lastFrameChangeAtByObject = new WeakMap()
  let rafId = null

  function tick(now) {
    let hasAdvancedAnyFrame = false

    for (const obj of animatedObjects) {
      const lastFrameChangeAt = lastFrameChangeAtByObject.get(obj) ?? 0
      const delay = obj.frameDelays[obj.currentFrameIndex] ?? 100
      if (now - lastFrameChangeAt < delay) continue

      obj.advanceFrame()
      lastFrameChangeAtByObject.set(obj, now)
      hasAdvancedAnyFrame = true
    }

    if (hasAdvancedAnyFrame) {
      fabricCanvas.renderAll()
    }
    rafId = requestAnimationFrame(tick)
  }

  return {
    register(obj) {
      animatedObjects.add(obj)
    },
    unregister(obj) {
      animatedObjects.delete(obj)
      lastFrameChangeAtByObject.delete(obj)
    },
    start() {
      if (rafId !== null) return
      rafId = requestAnimationFrame(tick)
    },
    stop() {
      cancelAnimationFrame(rafId)
      rafId = null
    },
  }
}
