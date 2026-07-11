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
    <div style={{ display: 'flex', borderBottom: '2px solid #b8b49c', marginBottom: '16px' }}>
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          style={{
            padding: '7px 18px',
            border: 'none',
            borderBottom: activeTab === id ? '2px solid #1657d6' : '2px solid transparent',
            background: 'transparent',
            fontWeight: activeTab === id ? 'bold' : 'normal',
            color: activeTab === id ? '#1657d6' : '#666',
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
