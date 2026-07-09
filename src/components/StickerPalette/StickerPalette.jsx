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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px' }}>
      {STICKERS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => addStickerToCanvas(emoji)}
          style={{
            fontSize: '28px',
            width: '44px',
            height: '44px',
            border: '1px solid #eee',
            borderRadius: '8px',
            background: '#fff',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
