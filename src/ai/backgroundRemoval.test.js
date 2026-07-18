import { describe, expect, it, vi, beforeEach } from 'vitest'

const newSessionMock = vi.fn()
const removeMock = vi.fn()

vi.mock('@bunnio/rembg-web', () => ({
  newSession: (...args) => newSessionMock(...args),
  remove: (...args) => removeMock(...args),
}))

async function importFreshBackgroundRemoval() {
  vi.resetModules()
  return import('./backgroundRemoval')
}

describe('removeBackgroundFromImage', () => {
  beforeEach(() => {
    newSessionMock.mockReset()
    removeMock.mockReset()
  })

  it('u2netp 세션을 생성해 이미지를 처리하고 remove()가 반환한 Blob을 그대로 반환한다', async () => {
    const fakeSession = { id: 'session' }
    const fakeBlob = new Blob(['result'])
    newSessionMock.mockResolvedValue(fakeSession)
    removeMock.mockResolvedValue(fakeBlob)
    const { removeBackgroundFromImage } = await importFreshBackgroundRemoval()
    const source = document.createElement('canvas')

    const result = await removeBackgroundFromImage(source)

    expect(newSessionMock).toHaveBeenCalledWith('u2netp', undefined, expect.anything())
    expect(removeMock).toHaveBeenCalledWith(source, expect.objectContaining({ session: fakeSession }))
    expect(result).toBe(fakeBlob)
  })

  it('두 번 호출해도 세션 생성 함수(newSession)는 한 번만 호출된다(ADR-4 캐싱)', async () => {
    newSessionMock.mockResolvedValue({ id: 'session' })
    removeMock.mockResolvedValue(new Blob())
    const { removeBackgroundFromImage } = await importFreshBackgroundRemoval()
    const source = document.createElement('canvas')

    await removeBackgroundFromImage(source)
    await removeBackgroundFromImage(source)

    expect(newSessionMock).toHaveBeenCalledTimes(1)
    expect(removeMock).toHaveBeenCalledTimes(2)
  })

  it('onProgress 콜백을 전달하면 newSession과 remove 호출에 그대로 전달한다', async () => {
    newSessionMock.mockResolvedValue({ id: 'session' })
    removeMock.mockResolvedValue(new Blob())
    const { removeBackgroundFromImage } = await importFreshBackgroundRemoval()
    const source = document.createElement('canvas')
    const onProgress = vi.fn()

    await removeBackgroundFromImage(source, onProgress)

    const [, , sessionOptions] = newSessionMock.mock.calls[0]
    expect(sessionOptions.onProgress).toBe(onProgress)
    const [, removeOptions] = removeMock.mock.calls[0]
    expect(removeOptions.onProgress).toBe(onProgress)
  })
})
