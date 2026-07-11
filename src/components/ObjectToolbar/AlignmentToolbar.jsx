const TOOLBAR_GAP = 8

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
 * 다중 선택된 캔버스 오브젝트 근처에 뜨는 정렬/등간격 배치 툴바.
 * Fabric.js를 직접 다루지 않고, actions에 담긴 함수를 호출만 한다.
 * @param {{
 *   activeSelection: import('fabric').ActiveSelection,
 *   actions: {
 *     alignLeft: (selection: import('fabric').ActiveSelection) => void,
 *     alignRight: (selection: import('fabric').ActiveSelection) => void,
 *     alignTop: (selection: import('fabric').ActiveSelection) => void,
 *     alignBottom: (selection: import('fabric').ActiveSelection) => void,
 *     alignCenterH: (selection: import('fabric').ActiveSelection) => void,
 *     alignCenterV: (selection: import('fabric').ActiveSelection) => void,
 *     distributeHorizontal: (selection: import('fabric').ActiveSelection) => void,
 *     distributeVertical: (selection: import('fabric').ActiveSelection) => void,
 *   },
 * }} props
 */
export function AlignmentToolbar({ activeSelection, actions }) {
  const boundingRect = activeSelection.getBoundingRect()
  const positionStyle = {
    left: boundingRect.left,
    top: boundingRect.top + boundingRect.height + TOOLBAR_GAP,
  }

  return (
    <div style={{ position: 'absolute', ...positionStyle, ...panelStyle }}>
      <button type="button" style={buttonStyle} onClick={() => actions.alignLeft(activeSelection)}>좌 정렬</button>
      <button type="button" style={buttonStyle} onClick={() => actions.alignRight(activeSelection)}>우 정렬</button>
      <button type="button" style={buttonStyle} onClick={() => actions.alignTop(activeSelection)}>상 정렬</button>
      <button type="button" style={buttonStyle} onClick={() => actions.alignBottom(activeSelection)}>하 정렬</button>
      <button type="button" style={buttonStyle} onClick={() => actions.alignCenterH(activeSelection)}>가운데 정렬(수평)</button>
      <button type="button" style={buttonStyle} onClick={() => actions.alignCenterV(activeSelection)}>가운데 정렬(수직)</button>
      <button type="button" style={buttonStyle} onClick={() => actions.distributeHorizontal(activeSelection)}>가로 등간격</button>
      <button type="button" style={buttonStyle} onClick={() => actions.distributeVertical(activeSelection)}>세로 등간격</button>
    </div>
  )
}
