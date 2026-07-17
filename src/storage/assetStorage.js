const DB_NAME = 'diary-assets'
const DB_VERSION = 1
const STORE_NAME = 'assets'

/**
 * @typedef {{
 *   id: string,
 *   type: "image" | "font",
 *   filename: string,
 *   mimeType: string,
 *   fontFamily?: string,
 *   blob: Blob,
 *   createdAt: number,
 * }} AssetRecord
 */

/**
 * "diary-assets" IndexedDB 연결을 열고, 처음 여는 경우 "assets" object store를 만든다.
 * @returns {Promise<IDBDatabase>}
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * "assets" object store에 대한 트랜잭션을 열고, 그 안에서 콜백이 만든 IDBRequest의 결과를 Promise로 감싼다.
 * @param {IDBTransactionMode} mode
 * @param {(store: IDBObjectStore) => IDBRequest} makeRequest
 * @returns {Promise<any>}
 */
async function runTransaction(mode, makeRequest) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    const request = makeRequest(store)
    let result

    request.onsuccess = () => {
      result = request.result
    }
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => {
      db.close()
      resolve(result)
    }
    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

/**
 * 이미지/폰트 에셋을 IndexedDB에 저장한다. id는 내부에서 crypto.randomUUID()로 발급한다.
 * @param {{ type: "image" | "font", filename: string, mimeType: string, blob: Blob, fontFamily?: string }} asset
 * @returns {Promise<string>} 저장된 에셋의 id
 */
export async function saveAsset({ type, filename, mimeType, blob, fontFamily }) {
  const id = crypto.randomUUID()
  /** @type {AssetRecord} */
  const record = { id, type, filename, mimeType, blob, createdAt: Date.now() }
  if (fontFamily) {
    record.fontFamily = fontFamily
  }

  await runTransaction('readwrite', (store) => store.add(record))
  return id
}

/**
 * id로 에셋 하나를 조회한다. 없으면 null을 반환한다.
 * @param {string} id
 * @returns {Promise<AssetRecord | null>}
 */
export async function getAsset(id) {
  const record = await runTransaction('readonly', (store) => store.get(id))
  return record ?? null
}

/**
 * type("image" | "font")으로 필터링한 에셋 목록을 createdAt 오름차순으로 반환한다.
 * @param {"image" | "font"} type
 * @returns {Promise<AssetRecord[]>}
 */
export async function listAssets(type) {
  const records = await runTransaction('readonly', (store) => store.getAll())
  return records
    .filter((record) => record.type === type)
    .sort((a, b) => a.createdAt - b.createdAt)
}

/**
 * id로 에셋을 삭제한다.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteAsset(id) {
  await runTransaction('readwrite', (store) => store.delete(id))
}

/**
 * Blob으로부터 objectURL을 만든다. 이후 step들은 이 함수를 통해서만 objectURL을 생성한다.
 * @param {Blob} blob
 * @returns {string}
 */
export function createAssetObjectURL(blob) {
  return URL.createObjectURL(blob)
}
