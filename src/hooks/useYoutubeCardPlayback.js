import { useEffect, useRef, useState } from 'react'
import { YoutubeCard } from '../fabric/YoutubeCard'

const CANVAS_READY_POLL_MS = 50

const NOT_PLAYING = { videoId: null, left: 0, top: 0, width: 0, height: 0 }

const PLAYBACK_LOCK_PROPS = ['hasControls', 'lockRotation', 'lockScalingX', 'lockScalingY']

function lockCardForPlayback(card) {
  card._playbackOriginalControls = Object.fromEntries(
    PLAYBACK_LOCK_PROPS.map((prop) => [prop, card[prop]]),
  )
  card.set({ hasControls: false, lockRotation: true, lockScalingX: true, lockScalingY: true })
}

function unlockCardAfterPlayback(card) {
  if (!card._playbackOriginalControls) return
  card.set(card._playbackOriginalControls)
  delete card._playbackOriginalControls
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
 * 캔버스 위 YoutubeCard 클릭으로 시작되는 인라인 재생 상태를 추적하는 훅.
 * 카드를 클릭하면 그 카드를 "재생 중"으로 세팅하고 이동만 허용하도록
 * 회전/크기조절을 잠그며, 카드가 아닌 다른 곳(빈 공간이나 다른 오브젝트)을
 * 클릭하면 재생을 종료하고 잠금을 원복한다(PRD 합의: 카드 밖 클릭 시 자동 종료 —
 * 다른 오브젝트 클릭도 "카드 밖"으로 취급해 동일하게 종료한다).
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
      if (playingCardRef.current === card) return
      if (playingCardRef.current) unlockCardAfterPlayback(playingCardRef.current)
      lockCardForPlayback(card)
      playingCardRef.current = card
      canvas.requestRenderAll()
      setPlayback({ videoId: card.videoId, ...computeScreenRect(canvas, card) })
    }

    function stopPlayback(canvas) {
      if (!playingCardRef.current) return
      unlockCardAfterPlayback(playingCardRef.current)
      playingCardRef.current = null
      canvas.requestRenderAll()
      setPlayback(NOT_PLAYING)
    }

    function subscribeToCanvas(canvas) {
      function handleMouseDown({ target }) {
        if (target instanceof YoutubeCard) {
          startPlayback(canvas, target)
          return
        }
        stopPlayback(canvas)
      }

      function handleAfterRender() {
        if (!playingCardRef.current) return
        setPlayback({ videoId: playingCardRef.current.videoId, ...computeScreenRect(canvas, playingCardRef.current) })
      }

      canvas.on('mouse:down', handleMouseDown)
      canvas.on('after:render', handleAfterRender)
      return () => {
        canvas.off('mouse:down', handleMouseDown)
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
