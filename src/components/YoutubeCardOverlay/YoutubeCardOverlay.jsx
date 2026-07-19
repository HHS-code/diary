/**
 * 재생 중인 YoutubeCard 위에 겹쳐지는 실제 유튜브 iframe.
 * position: fixed로 배치한다 — left/top/width/height는 useYoutubeCardPlayback이
 * getBoundingClientRect() 기준(뷰포트 좌표)으로 이미 계산해 넘겨주므로, 부모에
 * position: relative를 추가로 걸지 않아도 화면상 카드 위치와 정확히 겹친다.
 * videoId가 null이면(재생 중이 아니면) null을 반환해 iframe을 완전히 언마운트한다 —
 * src만 비우면 브라우저에 따라 재생이 계속될 수 있어, DOM에서 아예 제거해야 확실히 멈춘다.
 * @param {{ videoId: string | null, left: number, top: number, width: number, height: number }} props
 */
export function YoutubeCardOverlay({ videoId, left, top, width, height }) {
  if (!videoId) return null

  return (
    <iframe
      title="youtube-card-player"
      src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
      allow="autoplay; encrypted-media"
      allowFullScreen
      style={{
        position: 'fixed',
        left,
        top,
        width,
        height,
        border: 'none',
      }}
    />
  )
}
