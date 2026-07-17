import { useEffect, useRef } from 'react'
import { Canvas } from 'fabric'
import { getAsset, createAssetObjectURL } from '../storage/assetStorage'

// 모든 오브젝트 좌표·저장 데이터가 기준으로 삼는 논리 캔버스 크기.
// 기기·창 크기와 무관하게 고정 — 화면에는 displayScale 배율로 표시만 한다.
export const LOGICAL_CANVAS = { width: 1600, height: 1000 }

const DEBOUNCE_MS = 500
// 배경 이미지(isBackground 태그)와 그 고정 상태(selectable/evented),
// 자유 그리기 획의 박제·지우개 대상 태그(isFreeDrawing/erasable)가
// 새로고침 후에도 유지되도록 표준 직렬화에 추가로 포함하는 속성들.
export const EXTRA_SERIALIZED_PROPS = ['isBackground', 'selectable', 'evented', 'isFreeDrawing', 'erasable']

/**
 * assetId를 가진 오브젝트에 대해 assetStorage에서 Blob을 조회해
 * objectURL을 만들고 src 필드를 채운 새 오브젝트를 반환한다.
 * assetId가 없거나 해당 id의 에셋을 찾을 수 없으면 원본을 그대로 반환한다.
 * @param {object} object
 * @returns {Promise<object>}
 */
async function resolveObjectAssetReference(object) {
  if (!object.assetId) {
    return object
  }
  const record = await getAsset(object.assetId)
  if (!record) {
    return object
  }
  return { ...object, src: createAssetObjectURL(record.blob) }
}

/**
 * canvasJSON.objects 안의 assetId 참조를 실제 objectURL(src)로 채워 넣은
 * 새 canvasJSON을 반환한다. objects가 없으면 원본을 그대로 반환한다.
 * @param {object} canvasJSON
 * @returns {Promise<object>}
 */
export async function resolveCanvasAssetReferences(canvasJSON) {
  if (!canvasJSON?.objects) {
    return canvasJSON
  }
  const objects = await Promise.all(canvasJSON.objects.map(resolveObjectAssetReference))
  return { ...canvasJSON, objects }
}

/**
 * Fabric.js 캔버스 생명주기를 React에 연결하는 커스텀 훅.
 * 마운트 시 fabric.Canvas를 생성하고, 언마운트 시 dispose()로 정리한다.
 * initialCanvasJSON이 있으면 캔버스 생성 직후 loadFromJSON으로 복원한다.
 * onSave가 있으면 캔버스 변경(추가·수정·삭제) 이벤트마다 500ms 디바운스 후
 * (canvasJSON, LOGICAL_CANVAS) 인자로 호출한다 — 저장은 항상 논리 좌표계 기준.
 * 캔버스의 논리 크기는 LOGICAL_CANVAS(1600×1000)로 고정이며,
 * options.displayScale(기본 1)에 따라 화면 표시 크기만 달라진다.
 * options.onLoaded는 loadFromJSON 복원 완료 직후 fabric Canvas를 인자로 1회 호출된다.
 * options는 마운트 시점 값만 사용한다 (이후 변경 무시).
 * @param {React.RefObject<HTMLCanvasElement>} canvasElementRef
 * @param {object | null} [initialCanvasJSON]
 * @param {((canvasJSON: object, canvasSize: { width: number, height: number }) => void) | null} [onSave]
 * @param {{ displayScale?: number, onLoaded?: (canvas: import('fabric').Canvas) => void }} [options]
 * @returns {React.RefObject<import('fabric').Canvas | null>}
 */
export function useFabricCanvas(canvasElementRef, initialCanvasJSON, onSave, options) {
  const fabricCanvasRef = useRef(null)
  const onSaveRef = useRef(onSave)
  const disposePromiseRef = useRef(null)

  useEffect(() => {
    onSaveRef.current = onSave
  })

  useEffect(() => {
    const el = canvasElementRef.current
    if (!el) return

    let cancelled = false
    let debounceTimer = null
    let fabricCanvas = null
    // fabric Canvas#dispose()는 pending requestAnimationFrame이 있으면 그걸
    // 기다리는 비동기 작업(Promise 반환)이다. StrictMode 개발 모드는 같은
    // effect를 mount→unmount→mount로 두 번 실행하는데, dispose 완료 전에
    // 같은 <canvas> DOM 엘리먼트로 new Canvas()를 또 호출하면 fabric 내부
    // 상태가 겹쳐 "Cannot read properties of undefined (reading 'clearRect')"가
    // 난다. 그래서 이전 dispose Promise가 끝난 뒤에만 생성한다.
    const setupPromise = Promise.resolve(disposePromiseRef.current).then(() => {
      if (cancelled) return

      const displayScale = options?.displayScale ?? 1
      fabricCanvas = new Canvas(el, {
        width: LOGICAL_CANVAS.width * displayScale,
        height: LOGICAL_CANVAS.height * displayScale,
        backgroundColor: '#ffffff',
      })
      // 오브젝트 좌표는 논리(1600×1000) 평면 그대로 두고 표시만 축소/확대.
      // zoom이 걸리면 fabric이 마우스 좌표를 논리 좌표로 자동 변환한다.
      fabricCanvas.setZoom(displayScale)

      let isLoading = false

      function scheduleSave() {
        if (isLoading) return
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          if (onSaveRef.current) {
            onSaveRef.current(fabricCanvas.toObject(EXTRA_SERIALIZED_PROPS), LOGICAL_CANVAS)
          }
        }, DEBOUNCE_MS)
      }

      fabricCanvas.on('object:added', scheduleSave)
      fabricCanvas.on('object:modified', scheduleSave)
      fabricCanvas.on('object:removed', scheduleSave)

      if (initialCanvasJSON) {
        isLoading = true
        resolveCanvasAssetReferences(initialCanvasJSON)
          .then((resolvedCanvasJSON) => fabricCanvas.loadFromJSON(resolvedCanvasJSON))
          .then(() => {
            if (cancelled) return
            fabricCanvas.renderAll()
            isLoading = false
            if (options?.onLoaded) {
              options.onLoaded(fabricCanvas)
            }
          })
      }

      fabricCanvasRef.current = fabricCanvas
    })

    return () => {
      cancelled = true
      clearTimeout(debounceTimer)
      fabricCanvasRef.current = null
      disposePromiseRef.current = setupPromise.then(() => fabricCanvas?.dispose())
    }
    // canvasElementRef는 useRef 반환값으로 렌더링 간 동일 참조 — 의존 배열 생략
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return fabricCanvasRef
}
