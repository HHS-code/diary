import { describe, expect, it } from 'vitest'
import { extractYoutubeVideoId } from './youtubeUrl'

describe('extractYoutubeVideoId', () => {
  it('watch URL에서 videoId를 추출한다', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    )
  })

  it('watch URL에 다른 쿼리스트링이 붙어도 videoId만 추출한다', () => {
    expect(
      extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s'),
    ).toBe('dQw4w9WgXcQ')
  })

  it('http, youtube.com, m.youtube.com 변형도 watch URL로 인식한다', () => {
    expect(extractYoutubeVideoId('http://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    )
    expect(extractYoutubeVideoId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    )
  })

  it('youtu.be 단축 URL에서 videoId를 추출한다', () => {
    expect(extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('youtu.be 단축 URL에 쿼리스트링이 붙어도 videoId만 추출한다', () => {
    expect(extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=30')).toBe('dQw4w9WgXcQ')
  })

  it('shorts URL에서 videoId를 추출한다', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'dQw4w9WgXcQ',
    )
  })

  it('shorts URL에 쿼리스트링이 붙어도 videoId만 추출한다', () => {
    expect(
      extractYoutubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share'),
    ).toBe('dQw4w9WgXcQ')
  })

  it('유튜브가 아닌 URL에는 null을 반환한다', () => {
    expect(extractYoutubeVideoId('https://vimeo.com/12345678')).toBeNull()
  })

  it('일반 텍스트에는 null을 반환한다', () => {
    expect(extractYoutubeVideoId('오늘 점심 뭐 먹지')).toBeNull()
  })

  it('빈 문자열에는 null을 반환한다', () => {
    expect(extractYoutubeVideoId('')).toBeNull()
  })

  it('null 입력에는 null을 반환한다', () => {
    expect(extractYoutubeVideoId(null)).toBeNull()
  })

  it('undefined 입력에는 null을 반환한다', () => {
    expect(extractYoutubeVideoId(undefined)).toBeNull()
  })
})
