import {
  MdContentCopy,
  MdDelete,
  MdFlipToBack,
  MdFlipToFront,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
} from 'react-icons/md'

const ICON_SIZE = 18

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

const buttonRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px',
  padding: '8px',
}

function buildButtonStyle(isEnabled) {
  return {
    border: '1px solid #7d7d64',
    borderRadius: 3,
    background: 'linear-gradient(180deg,#fdfdfa,#dcd9c7)',
    cursor: isEnabled ? 'pointer' : 'default',
    opacity: isEnabled ? 1 : 0.45,
    padding: '4px 8px',
    fontSize: 12,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
}

/**
 * 캔버스 사이드바에 항상 표시되는 오브젝트 조작 고정 패널.
 * activeObject가 없으면 모든 버튼이 비활성화(disabled)된다.
 * Fabric.js를 직접 다루지 않고, actions에 담긴 함수를 호출만 한다.
 * @param {{
 *   activeObject: import('fabric').FabricObject | null,
 *   actions: {
 *     copy: (target: import('fabric').FabricObject) => void,
 *     remove: (target: import('fabric').FabricObject) => void,
 *     bringToFront: (target: import('fabric').FabricObject) => void,
 *     sendToBack: (target: import('fabric').FabricObject) => void,
 *     bringForward: (target: import('fabric').FabricObject) => void,
 *     sendBackward: (target: import('fabric').FabricObject) => void,
 *   },
 * }} props
 */
export function ObjectToolbar({ activeObject, actions }) {
  const isEnabled = activeObject !== null
  const buttonStyle = buildButtonStyle(isEnabled)

  const buttons = [
    { label: '복사', icon: <MdContentCopy size={ICON_SIZE} />, onClick: () => actions.copy(activeObject) },
    { label: '삭제', icon: <MdDelete size={ICON_SIZE} />, onClick: () => actions.remove(activeObject) },
    { label: '맨 앞으로', icon: <MdFlipToFront size={ICON_SIZE} />, onClick: () => actions.bringToFront(activeObject) },
    { label: '맨 뒤로', icon: <MdFlipToBack size={ICON_SIZE} />, onClick: () => actions.sendToBack(activeObject) },
    { label: '한 단계 앞으로', icon: <MdKeyboardArrowUp size={ICON_SIZE} />, onClick: () => actions.bringForward(activeObject) },
    { label: '한 단계 뒤로', icon: <MdKeyboardArrowDown size={ICON_SIZE} />, onClick: () => actions.sendBackward(activeObject) },
  ]

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>오브젝트</div>
      <div style={buttonRowStyle}>
        {buttons.map(({ label, icon, onClick }) => (
          <button
            key={label}
            type="button"
            style={buttonStyle}
            disabled={!isEnabled}
            onClick={onClick}
            title={label}
            aria-label={label}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  )
}
