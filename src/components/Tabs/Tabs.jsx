const TABS = [
  { id: 'diary', label: '다이어리' },
  { id: 'movie', label: '영화리뷰' },
]

/**
 * 다이어리 / 영화리뷰 탭 전환 UI.
 * @param {{ activeTab: 'diary' | 'movie', onTabChange: (tab: 'diary' | 'movie') => void }} props
 */
export function Tabs({ activeTab, onTabChange }) {
  return (
    <div style={{ display: 'flex', borderBottom: '2px solid #ddd', marginBottom: '16px' }}>
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          style={{
            padding: '8px 20px',
            border: 'none',
            borderBottom: activeTab === id ? '2px solid #4a90e2' : '2px solid transparent',
            background: 'transparent',
            fontWeight: activeTab === id ? 'bold' : 'normal',
            color: activeTab === id ? '#4a90e2' : '#666',
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '-2px',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
