import { useDiaryThumbnails } from '../../hooks/useDiaryThumbnails'

/**
 * 작성된 다이어리들을 캔버스 썸네일 그리드로 보여주는 패널.
 * 썸네일 클릭 시 onSelectDate(dateKey)로 해당 날짜 편집 화면 진입을 위임한다.
 * @param {{ onSelectDate: (dateKey: string) => void }} props
 */
export function DiaryGallery({ onSelectDate }) {
  const { thumbnails, isLoading } = useDiaryThumbnails()

  function renderGalleryContent() {
    if (isLoading) {
      return <p style={{ margin: 0, padding: '24px', color: '#666', fontSize: '14px' }}>불러오는 중…</p>
    }
    if (thumbnails.length === 0) {
      return (
        <p style={{ margin: 0, padding: '24px', color: '#666', fontSize: '14px' }}>
          아직 작성된 다이어리가 없습니다
        </p>
      )
    }
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px',
          padding: '12px',
        }}
      >
        {thumbnails.map(({ dateKey, dataUrl }) => (
          <button
            key={dateKey}
            onClick={() => onSelectDate(dateKey)}
            style={{
              padding: '8px',
              border: '1px solid #7d7d64',
              borderRadius: 3,
              background: 'linear-gradient(180deg,#fdfdfa,#dcd9c7)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              alignItems: 'center',
            }}
          >
            <img
              src={dataUrl}
              alt={`${dateKey} 다이어리 썸네일`}
              style={{ width: '100%', border: '1px solid #cfcbb4', background: '#fff' }}
            />
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#333' }}>{dateKey}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        boxSizing: 'border-box',
        border: '1px solid #7d7d64',
        borderRadius: '4px',
        background: '#ece9d8',
        boxShadow: '1px 1px 0 rgba(255,255,255,.7) inset, 2px 2px 5px rgba(0,0,0,.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg,#3d84ec 0%,#1657d6 55%,#0e46bc 100%)',
          borderBottom: '1px solid #04266b',
          padding: '7px 10px',
          flexShrink: 0,
        }}
      >
        <strong style={{ color: '#fff', fontSize: '16px' }}>다이어리 모아보기</strong>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>{renderGalleryContent()}</div>
    </div>
  )
}
