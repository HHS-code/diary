const TOP_SPACE_THRESHOLD = 40
const TOOLBAR_GAP = 8
const TOOLBAR_HEIGHT = 36

const panelStyle = {
  border: '1px solid #7d7d64',
  borderRadius: 3,
  background: '#ece9d8',
  boxShadow: '1px 1px 0 rgba(255,255,255,.7) inset, 2px 2px 5px rgba(0,0,0,.25)',
  display: 'flex',
  gap: '4px',
  padding: '4px',
}

const buttonStyle = {
  border: '1px solid #7d7d64',
  borderRadius: 3,
  background: 'linear-gradient(180deg,#fdfdfa,#dcd9c7)',
  cursor: 'pointer',
  padding: '4px 8px',
  fontSize: 12,
}

/**
 * 선택된 캔버스 오브젝트 근처에 뜨는 플로팅 미니 툴바.
 * Fabric.js를 직접 다루지 않고, actions에 담긴 함수를 호출만 한다.
 * @param {{
 *   activeObject: import('fabric').FabricObject,
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
  const boundingRect = activeObject.getBoundingRect()
  const hasSpaceAbove = boundingRect.top >= TOP_SPACE_THRESHOLD

  const positionStyle = hasSpaceAbove
    ? { left: boundingRect.left, top: boundingRect.top - TOOLBAR_HEIGHT - TOOLBAR_GAP }
    : { left: boundingRect.left, top: boundingRect.top + boundingRect.height + TOOLBAR_GAP }

  return (
    <div style={{ position: 'absolute', ...positionStyle, ...panelStyle }}>
      <button type="button" style={buttonStyle} onClick={() => actions.copy(activeObject)}>복사</button>
      <button type="button" style={buttonStyle} onClick={() => actions.remove(activeObject)}>삭제</button>
      <button type="button" style={buttonStyle} onClick={() => actions.bringToFront(activeObject)}>맨 앞으로</button>
      <button type="button" style={buttonStyle} onClick={() => actions.sendToBack(activeObject)}>맨 뒤로</button>
      <button type="button" style={buttonStyle} onClick={() => actions.bringForward(activeObject)}>한 단계 앞으로</button>
      <button type="button" style={buttonStyle} onClick={() => actions.sendBackward(activeObject)}>한 단계 뒤로</button>
    </div>
  )
}
