const YOUTUBE_URL_PATTERNS = [
  /(?:^|\/\/)(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{11})/,
  /(?:^|\/\/)youtu\.be\/([\w-]{11})/,
  /(?:^|\/\/)(?:www\.|m\.)?youtube\.com\/shorts\/([\w-]{11})/,
]

export function extractYoutubeVideoId(text) {
  if (typeof text !== 'string' || text === '') {
    return null
  }

  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}
