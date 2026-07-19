import { useEffect, useRef, useState } from 'react'
import { YoutubeCard, PLAY_BUTTON_RADIUS_RATIO } from '../fabric/YoutubeCard'

const CANVAS_READY_POLL_MS = 50

const NOT_PLAYING = { videoId: null, left: 0, top: 0, width: 0, height: 0 }

/**
 * 캔버스(scene) 좌표계 기준 클릭 지점이 card의 재생 버튼(카드 중앙의 원) 반경 안인지 판단한다.
 * card가 회전돼 있어도 정확히 판정할 수 있도록, 카드 중심을 원점으로 하고 -angle만큼
 * 되돌려 회전시킨 로컬 좌표계로 클릭 지점을 역변환한 뒤 원점 기준 거리로 비교한다.
 * scenePoint는 Fabric 이벤트가 제공하는 캔버스 논리 좌표(canvas.getScenePoint(e))다 —
 * getCenterPoint()도 같은 좌표계를 반환하므로 둘을 바로 비교할 수 있다.
 */
function isScenePointOnPlayButton(card, scenePoint) {
  const center = card.getCenterPoint()
  const dx = scenePoint.x - center.x
  const dy = scenePoint.y - center.y
  const angleRad = -card.angle * (Math.PI / 180)
  const localX = dx * Math.cos(angleRad) - dy * Math.sin(angleRad)
  const localY = dx * Math.sin(angleRad) + dy * Math.cos(angleRad)

  const scaledWidth = card.getScaledWidth()
  const scaledHeight = card.getScaledHeight()
  const radius = Math.min(scaledWidth, scaledHeight) * PLAY_BUTTON_RADIUS_RATIO

  return Math.hypot(localX, localY) <= radius
}

/**
 * 캔버스의 화면 좌표계 기준 YoutubeCard 위치/크기를 계산한다.
 * getBoundingRect()는 zoom이 반영되지 않은 scene plane 좌표를 반환하므로
 * (fabric 7 기준 실측 확인), canvas.getZoom()을 곱해 실제 픽셀 크기로 변환하고,
 * <canvas> DOM 엘리먼트의 뷰포트 기준 위치(getBoundingClientRect)를 더한다.
 */
function computeScreenRect(canvas, card) {
  const zoom = canvas.getZoom()
  // getBoundingRect()는 캐시된 aCoords를 쓴다 — fabric은 상호작용(드래그)으로 좌표가
  // 바뀔 때 target.setCoords()를 호출해 캐시를 갱신하지만, 프로그램적으로 위치를
  // 바꾼 직후처럼 아직 갱신 전일 수 있어 매번 명시적으로 갱신해 최신 값을 보장한다.
  card.setCoords()
  const bounding = card.getBoundingRect()
  const canvasRect = canvas.getElement().getBoundingClientRect()
  return {
    left: canvasRect.left + bounding.left * zoom,
    top: canvasRect.top + bounding.top * zoom,
    width: bounding.width * zoom,
    height: bounding.height * zoom,
  }
}

/**
 * 캔버스 위 YoutubeCard의 재생 버튼 클릭으로 시작되는 인라인 재생 상태를 추적하는 훅.
 * 카드 자체(썸네일 몸통)는 항상 일반 Fabric 오브젝트처럼 선택·드래그·크기조절이 가능하다 —
 * 재생 버튼 원 안에서 드래그 없는 클릭(Fabric이 제공하는 mouse:up 이벤트의 isClick)이
 * 완료됐을 때만 재생을 시작한다. "카드를 클릭하면 바로 재생"으로 만들면, 재생 중 카드
 * 위에 iframe이 덮여있어 카드를 다시 클릭해 옮기려는 mousedown 자체가 iframe에 막혀
 * 캔버스가 받지 못하는 문제가 있었다(2026-07-19 실측) — 그래서 재생 시작을 재생 버튼
 * 이라는 별도 대상으로 좁혀, 카드 몸통 클릭/드래그는 항상 순수 선택·이동으로만 동작하게 했다.
 * 캔버스 빈 공간을 클릭하면 재생을 종료한다.
 * 재생 중에는 canvas의 after:render마다 화면 좌표를 다시 계산해 반환값을 갱신한다 —
 * 카드 이동·크기조절·캔버스 zoom 변경이 모두 렌더링을 유발하므로 별도 구독 없이 따라간다.
 * @param {React.RefObject<import('fabric').Canvas | null>} fabricCanvasRef
 * @returns {{ videoId: string | null, left: number, top: number, width: number, height: number }}
 */
export function useYoutubeCardPlayback(fabricCanvasRef) {
  const [playback, setPlayback] = useState(NOT_PLAYING)
  const playingCardRef = useRef(null)

  useEffect(() => {
    function startPlayback(canvas, card) {
      playingCardRef.current = card
      setPlayback({ videoId: card.videoId, ...computeScreenRect(canvas, card) })
    }

    function stopPlayback() {
      if (!playingCardRef.current) return
      playingCardRef.current = null
      setPlayback(NOT_PLAYING)
    }

    function subscribeToCanvas(canvas) {
      function handleMouseUp({ target, isClick, scenePoint }) {
        if (!target) {
          stopPlayback()
          return
        }
        if (isClick && target instanceof YoutubeCard && isScenePointOnPlayButton(target, scenePoint)) {
          startPlayback(canvas, target)
        }
      }

      function handleAfterRender() {
        if (!playingCardRef.current) return
        setPlayback({ videoId: playingCardRef.current.videoId, ...computeScreenRect(canvas, playingCardRef.current) })
      }

      canvas.on('mouse:up', handleMouseUp)
      canvas.on('after:render', handleAfterRender)
      return () => {
        canvas.off('mouse:up', handleMouseUp)
        canvas.off('after:render', handleAfterRender)
      }
    }

    if (fabricCanvasRef.current) {
      return subscribeToCanvas(fabricCanvasRef.current)
    }

    let unsubscribe = null
    const pollTimer = setInterval(() => {
      if (!fabricCanvasRef.current) return
      unsubscribe = subscribeToCanvas(fabricCanvasRef.current)
      clearInterval(pollTimer)
    }, CANVAS_READY_POLL_MS)

    return () => {
      clearInterval(pollTimer)
      if (unsubscribe) unsubscribe()
    }
  }, [fabricCanvasRef])

  return playback
}
