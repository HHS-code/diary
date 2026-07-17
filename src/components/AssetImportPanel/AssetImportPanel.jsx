import { useRef } from 'react'
import { MdFolderOpen, MdUploadFile } from 'react-icons/md'
import { classifyAssetType } from '../../hooks/useAssetLibrary'

/**
 * 파일 목록을 확장자로 분류해 이미지/폰트 각각 등록한다. 그 외 확장자는 조용히 무시한다.
 * @param {FileList | File[]} files
 * @param {{ registerImage: (file: File) => Promise<string>, registerFont: (file: File) => Promise<string> }} library
 */
async function importFiles(files, library) {
  for (const file of files) {
    const assetType = classifyAssetType(file.name)
    if (assetType === 'image') {
      await library.registerImage(file)
    } else if (assetType === 'font') {
      await library.registerFont(file)
    }
  }
}

/**
 * 이미지/폰트 파일을 파일 선택·폴더 선택·드래그앤드롭으로 등록하는 공용 패널.
 * 등록 로직은 갖고 있지 않고, props로 받은 library(useAssetLibrary 반환값)를 그대로 호출한다.
 * @param {{ library: ReturnType<typeof import('../../hooks/useAssetLibrary').useAssetLibrary> }} props
 */
export function AssetImportPanel({ library }) {
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)

  function handleFileInputChange(event) {
    const files = event.target.files
    event.target.value = ''
    if (!files) return
    importFiles(files, library)
  }

  function handleFolderInputChange(event) {
    const files = event.target.files
    event.target.value = ''
    if (!files) return
    importFiles(files, library)
  }

  function handleDragOver(event) {
    event.preventDefault()
  }

  function handleDrop(event) {
    event.preventDefault()
    importFiles(event.dataTransfer.files, library)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
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
        에셋
      </div>
      <div style={{ display: 'flex', gap: '8px', padding: '8px' }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.ttf,.otf,.woff,.woff2"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
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
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <MdUploadFile size={16} /> 파일 선택
        </button>
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory=""
          multiple
          style={{ display: 'none' }}
          onChange={handleFolderInputChange}
        />
        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #7d7d64',
            borderRadius: 3,
            background: 'linear-gradient(180deg,#fdfdfa,#dcd9c7)',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <MdFolderOpen size={16} /> 폴더 선택
        </button>
      </div>
      <div style={{ padding: '0 8px 8px', fontSize: '12px', color: '#333' }}>
        <div>이미지 ({library.images.length})</div>
        <ul style={{ margin: '2px 0 8px', paddingLeft: '16px' }}>
          {library.images.map((asset) => (
            <li key={asset.id}>{asset.filename}</li>
          ))}
        </ul>
        <div>폰트 ({library.fonts.length})</div>
        <ul style={{ margin: '2px 0 0', paddingLeft: '16px' }}>
          {library.fonts.map((asset) => (
            <li key={asset.id}>{asset.filename}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
