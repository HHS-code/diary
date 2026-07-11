import { FabricText } from 'fabric'

const STICKERS = [
  '❤️', '🧡', '💛', '💚', '💙', '💜',
  '⭐', '🌟', '✨', '💫', '🌙', '☀️',
  '🌸', '🌺', '🌻', '🌹', '🍀', '🌈',
  '🐱', '🐶', '🦋', '🐰', '🐸', '🦄',
  '🍓', '🧁', '☕', '🍒', '🍰', '🎀',
]

const CANVAS_CENTER_X = 400
const CANVAS_CENTER_Y = 300
const RANDOM_SPREAD = 200

function randomOffset() {
  return (Math.random() - 0.5) * RANDOM_SPREAD
}

/**
 * 이모지 스티커 팔레트.
 * 이모지를 클릭하면 캔버스 중앙 근처 랜덤 위치에 텍스트 오브젝트로 추가한다.
 * @param {{ fabricCanvasRef: React.RefObject<import('fabric').Canvas | null> }} props
 */
export function StickerPalette({ fabricCanvasRef }) {
  function addStickerToCanvas(emoji) {
    const fc = fabricCanvasRef.current
    if (!fc) return

    const sticker = new FabricText(emoji, {
      left: CANVAS_CENTER_X + randomOffset(),
      top: CANVAS_CENTER_Y + randomOffset(),
      fontSize: 48,
      selectable: true,
    })
    fc.add(sticker)
    fc.setActiveObject(sticker)
    fc.renderAll()
  }

  return (
    <div
      style={{
        width: '240px',
        boxSizing: 'border-box',
        border: '1px solid #7d7d64',
        borderRadius: 3,
        background: '#ece9d8',
        boxShadow: '1px 1px 0 rgba(255,255,255,.7) inset, 2px 2px 5px rgba(0,0,0,.25)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg,#3d84ec,#1657d6)',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: 12,
          padding: '5px 10px',
          textShadow: '1px 1px 1px rgba(0,0,0,.5)',
        }}
      >
        스티커
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '8px', justifyContent: 'flex-start' }}>
        {STICKERS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => addStickerToCanvas(emoji)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              width: '44px',
              height: '44px',
              padding: 0,
              border: '1px solid #7d7d64',
              borderRadius: 3,
              background: 'linear-gradient(180deg,#fdfdfa,#dcd9c7)',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
