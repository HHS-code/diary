import { MdBlurOn, MdBrush, MdCleaningServices, MdCreate, MdNearMe } from 'react-icons/md'

const ICON_SIZE = 18

// XP 그림판 기본 팔레트 28색 (2행 × 14열)
const PALETTE_COLORS = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080',
  '#800080', '#808040', '#004040', '#0080FF', '#004080', '#8000FF', '#804000',
  '#FFFFFF', '#C0C0C0', '#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF',
  '#FF00FF', '#FFFF80', '#00FF80', '#80FFFF', '#8080FF', '#FF0080', '#FF8040',
]

const WIDTH_OPTIONS = [2, 4, 6, 8]
// 지우개는 전용 굵기 체계 — XP 그림판의 지우개 크기 4단계처럼 브러시보다 굵다.
const ERASER_WIDTH_OPTIONS = [8, 16, 24, 32]

const TOOLS = [
  { tool: 'select', label: '선택', icon: <MdNearMe size={ICON_SIZE} /> },
  { tool: 'pencil', label: '연필', icon: <MdCreate size={ICON_SIZE} /> },
  { tool: 'brush', label: '브러시', icon: <MdBrush size={ICON_SIZE} /> },
  { tool: 'airbrush', label: '에어브러시', icon: <MdBlurOn size={ICON_SIZE} /> },
  { tool: 'eraser', label: '지우개', icon: <MdCleaningServices size={ICON_SIZE} /> },
]

// 굵기 조절이 의미 있는 도구 — select는 그리지 않고, pencil은 굵기 1 고정.
const WIDTH_ADJUSTABLE_TOOLS = ['brush', 'airbrush', 'eraser']

const panelStyle = {
  width: '240px',
  boxSizing: 'border-box',
  border: '1px solid #7d7d64',
  borderRadius: 3,
  background: '#ece9d8',
  boxShadow: '1px 1px 0 rgba(255,255,255,.7) inset, 2px 2px 5px rgba(0,0,0,.25)',
  overflow: 'hidden',
}

const headerStyle = {
  background: 'linear-gradient(180deg,#3d84ec,#1657d6)',
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 12,
  padding: '5px 10px',
  textShadow: '1px 1px 1px rgba(0,0,0,.5)',
}

const toolGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '4px',
  padding: '8px',
}

const widthRowStyle = {
  display: 'flex',
  gap: '4px',
  padding: '0 8px 8px',
}

const colorGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(14, 1fr)',
  gap: '2px',
  flex: 1,
}

function buildToolButtonStyle(isCurrent) {
  const style = {
    border: '1px solid #7d7d64',
    borderRadius: 3,
    background: 'linear-gradient(180deg,#fdfdfa,#dcd9c7)',
    cursor: 'pointer',
    padding: '6px 0',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  if (isCurrent) {
    // XP 그림판의 눌린(sunken) 도구 버튼
    style.background = '#dcd9c7'
    style.boxShadow = 'inset 1px 1px 2px rgba(0,0,0,.35)'
  }
  return style
}

function buildWidthButtonStyle(isEnabled, isCurrent) {
  const style = {
    flex: 1,
    height: '24px',
    border: '1px solid #7d7d64',
    borderRadius: 3,
    background: 'linear-gradient(180deg,#fdfdfa,#dcd9c7)',
    cursor: isEnabled ? 'pointer' : 'default',
    opacity: isEnabled ? 1 : 0.45,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  }
  if (isCurrent) {
    style.background = '#dcd9c7'
    style.boxShadow = 'inset 1px 1px 2px rgba(0,0,0,.35)'
  }
  return style
}

function buildColorButtonStyle(color) {
  return {
    width: '100%',
    aspectRatio: '1',
    padding: 0,
    border: '1px solid #7d7d64',
    background: color,
    cursor: 'pointer',
  }
}

/**
 * XP 그림판식 그리기 도구 패널 — 순수 UI.
 * Fabric.js를 직접 다루지 않고, usePaintTools가 준 상태/함수만 사용한다.
 * @param {{
 *   tool: 'select' | 'pencil' | 'brush' | 'airbrush' | 'eraser',
 *   color: string,
 *   width: number,
 *   onToolChange: (tool: string) => void,
 *   onColorChange: (color: string) => void,
 *   onWidthChange: (width: number) => void,
 * }} props
 */
export function PaintToolbox({ tool, color, width, onToolChange, onColorChange, onWidthChange }) {
  const isWidthEnabled = WIDTH_ADJUSTABLE_TOOLS.includes(tool)
  const isEraser = tool === 'eraser'
  const widthOptions = isEraser ? ERASER_WIDTH_OPTIONS : WIDTH_OPTIONS

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>그리기</div>
      <div style={toolGridStyle}>
        {TOOLS.map((entry) => (
          <button
            key={entry.tool}
            type="button"
            style={buildToolButtonStyle(entry.tool === tool)}
            aria-pressed={entry.tool === tool}
            onClick={() => onToolChange(entry.tool)}
            title={entry.label}
            aria-label={entry.label}
          >
            {entry.icon}
          </button>
        ))}
      </div>
      <div style={widthRowStyle}>
        {widthOptions.map((option) => (
          <button
            key={option}
            type="button"
            style={buildWidthButtonStyle(isWidthEnabled, isWidthEnabled && option === width)}
            disabled={!isWidthEnabled}
            onClick={() => onWidthChange(option)}
            title={`굵기 ${option}`}
            aria-label={`굵기 ${option}`}
          >
            {/* 지우개는 굵기(8~32)가 버튼 높이보다 커서 절반 크기 사각형으로 표시 */}
            {isEraser ? (
              <span style={{ width: `${option / 2}px`, height: `${option / 2}px`, background: '#000' }} />
            ) : (
              <span style={{ width: '70%', height: `${option}px`, background: '#000', borderRadius: option }} />
            )}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px', padding: '0 8px 8px', alignItems: 'flex-start' }}>
        {/* 현재 색 표시 칸 */}
        <div
          aria-label="현재 색"
          style={{
            width: '28px',
            height: '28px',
            flexShrink: 0,
            border: '1px solid #7d7d64',
            background: color,
            boxSizing: 'border-box',
          }}
        />
        <div style={colorGridStyle}>
          {PALETTE_COLORS.map((paletteColor) => (
            <button
              key={paletteColor}
              type="button"
              style={buildColorButtonStyle(paletteColor)}
              onClick={() => onColorChange(paletteColor)}
              title={`색상 ${paletteColor}`}
              aria-label={`색상 ${paletteColor}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
