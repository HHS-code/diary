# 빌드 리포트 — diary (youtube-embed)

각 step이 무엇을 했는지 위에서 아래로 읽으면 프로젝트가 자라는 과정이 보인다.

- [완료] **Step 0: youtube-url-detection** — extractYoutubeVideoId(text: string) -> string | null를 src/fabric/youtubeUrl.js에 구현. watch(youtube.com/m.youtube.com/http/https 변형, &t=30s 등 부가 쿼리 포함), youtu.be, shorts URL의 videoId를 정규식으로 추출. Fabric/DOM/React 의존 없는 순수 함수, 매치 실패·null·undefined·빈 문자열 입력엔 null 반환(예외 없음). 다음 step(YoutubeCard)은 이 함수의 반환값(videoId)을 그대로 썸네일 URL(`https://img.youtube.com/vi/{videoId}/hqdefault.jpg`) 조립에 사용하면 됨. 산출 파일: src/fabric/youtubeUrl.js, src/fabric/youtubeUrl.test.js. ([리포트](step0-youtube-url-detection.md))
- [대기] **Step 1: youtube-card-object** — 
- [대기] **Step 2: youtube-card-placement** — 
- [대기] **Step 3: youtube-card-persistence** — 
- [대기] **Step 4: youtube-card-playback** — 
