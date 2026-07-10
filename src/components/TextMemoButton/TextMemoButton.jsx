import { useState } from 'react'
import { IText } from 'fabric'

const FONTS = [
  { label: '나눔손글씨 (한글)', value: 'Nanum Pen Script' },
  { label: '개구쟁이 (한글)', value: 'Gaegu' },
  { label: '하이 멜로디 (한글)', value: 'Hi Melody' },
  { label: '가난한 이야기 (한글)', value: 'Poor Story' },
  { label: 'Caveat (영문)', value: 'Caveat' },
  { label: 'Kalam (영문)', value: 'Kalam' },
  { label: 'Gochi Hand (영문)', value: 'Gochi Hand' },
  { label: 'Shadows Into Light (영문)', value: 'Shadows Into Light' },
]

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

/**
 * 폰트를 선택하고 텍스트를 입력해 Fabric 캔버스에 IText 오브젝트로 추가하는 버튼.
 * @param {{ fabricCanvasRef: React.RefObject<import('fabric').Canvas | null> }} props
 */
export function TextMemoButton({ fabricCanvasRef }) {
  const [selectedFont, setSelectedFont] = useState(FONTS[0].value)
  const [inputText, setInputText] = useState('')
  const [isInputVisible, setIsInputVisible] = useState(false)

  function showInput() {
    setIsInputVisible(true)
  }

  function addTextToCanvas() {
    const fc = fabricCanvasRef.current
    if (!fc || inputText.trim() === '') return

    const text = new IText(inputText.trim(), {
      left: CANVAS_WIDTH / 2,
      top: CANVAS_HEIGHT / 2,
      originX: 'center',
      originY: 'center',
      fontFamily: selectedFont,
      fontSize: 32,
    })

    fc.add(text)
    fc.setActiveObject(text)
    fc.renderAll()

    setInputText('')
    setIsInputVisible(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') addTextToCanvas()
    if (e.key === 'Escape') {
      setIsInputVisible(false)
      setInputText('')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {isInputVisible && (
        <>
          <select
            value={selectedFont}
            onChange={(e) => setSelectedFont(e.target.value)}
            style={{
              padding: '6px 8px',
              border: '1px solid #ccc',
              borderRadius: '8px',
              fontSize: '13px',
              width: '100%',
            }}
          >
            {FONTS.map((font) => (
              <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                {font.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            autoFocus
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="텍스트 입력 후 Enter"
            style={{
              padding: '6px 8px',
              border: '1px solid #ccc',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: selectedFont,
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="button"
            onClick={addTextToCanvas}
            style={{
              padding: '8px 16px',
              border: '1px solid #6c63ff',
              borderRadius: '8px',
              background: '#6c63ff',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              width: '100%',
            }}
          >
            추가
          </button>
        </>
      )}
      {!isInputVisible && (
        <button
          type="button"
          onClick={showInput}
          style={{
            padding: '8px 16px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
            width: '100%',
          }}
        >
          텍스트 추가
        </button>
      )}
    </div>
  )
}
