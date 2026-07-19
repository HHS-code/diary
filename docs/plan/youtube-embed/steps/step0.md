# Step 0: youtube-url-detection

## 읽을 파일
- docs/plan/youtube-embed/PRD.md (섹션 "1. 유튜브 링크 감지 및 카드 생성")
- docs/plan/youtube-embed/architecture.md (섹션 "1. URL 감지 유틸")

## 작업

`src/fabric/youtubeUrl.js` (신규):

- 공개 함수: `extractYoutubeVideoId(text: string) -> string | null`
- 지원해야 하는 URL 패턴 (PRD 합의):
  - `https://www.youtube.com/watch?v={id}` (및 `youtube.com`, `m.youtube.com`, `http://` 변형)
  - `https://youtu.be/{id}`
  - `https://www.youtube.com/shorts/{id}`
  - 위 URL에 다른 쿼리스트링이 붙어도(`&t=30s` 등) videoId만 정확히 추출한다.
- videoId가 아닌 일반 텍스트, 유튜브가 아닌 URL, 빈 문자열, `null`/`undefined` 입력에는 `null`을 반환한다(예외를 던지지 않는다).
- Fabric.js, DOM, React에 의존하지 않는 순수 함수로 작성한다 — 이 step에서는 이 파일 하나만 만든다.

## AC
- `npm run lint && npm run test` 통과.
- 신규 테스트 `src/fabric/youtubeUrl.test.js`: 위에서 나열한 3가지 URL 패턴(각각 정상 케이스 + 부가 쿼리스트링 붙은 케이스) 모두 올바른 videoId를 반환하는지, 유튜브가 아닌 URL이나 일반 텍스트에는 `null`을 반환하는지 검증한다.

## 금지
- 이 step에서 `YoutubeCard`, Fabric 오브젝트, React 컴포넌트, 붙여넣기 이벤트 처리를 만들지 마라. 이유: 이 step은 URL 파싱 유틸 하나만 담당한다 — 나머지는 step1~4의 범위다.
