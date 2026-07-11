import { useRef } from 'react'
import { MdPalette, MdWallpaper } from 'react-icons/md'

/**
 * 캔버스 배경을 색상 또는 이미지로 바꾸는 컨트롤 패널.
 * fabric을 직접 다루지 않고, props로 받은 actions 함수만 호출한다.
 * @param {{ actions: { setColor: (hex: string) => void, setImage: (file: File) => void } }} props
 */
export function CanvasBackgroundControl({ actions }) {
  const fileInputRef = useRef(null)

  function handleColorChange(event) {
    actions.setColor(event.target.value)
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    actions.setImage(file)

    // 같은 파일을 다시 선택할 수 있도록 초기화
    event.target.value = ''
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
        배경
      </div>
      <div style={{ display: 'flex', gap: '8px', padding: '8px', alignItems: 'center' }}>
        <MdPalette size={18} title="배경 색상" aria-hidden="true" />
        <input
          type="color"
          defaultValue="#ffffff"
          onChange={handleColorChange}
          aria-label="배경 색상"
          style={{
            width: '44px',
            height: '34px',
            padding: 0,
            border: '1px solid #7d7d64',
            borderRadius: 3,
            background: 'linear-gradient(180deg,#fdfdfa,#dcd9c7)',
            cursor: 'pointer',
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #7d7d64',
            borderRadius: 3,
            background: 'linear-gradient(180deg,#fdfdfa,#dcd9c7)',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <MdWallpaper size={18} /> 배경 이미지
        </button>
      </div>
    </div>
  )
}
