# 빌드 리포트 — diary (youtube-embed)

각 step이 무엇을 했는지 위에서 아래로 읽으면 프로젝트가 자라는 과정이 보인다.

- [완료] **Step 0: youtube-url-detection** — extractYoutubeVideoId(text: string) -> string | null를 src/fabric/youtubeUrl.js에 구현. watch(youtube.com/m.youtube.com/http/https 변형, &t=30s 등 부가 쿼리 포함), youtu.be, shorts URL의 videoId를 정규식으로 추출. Fabric/DOM/React 의존 없는 순수 함수, 매치 실패·null·undefined·빈 문자열 입력엔 null 반환(예외 없음). 다음 step(YoutubeCard)은 이 함수의 반환값(videoId)을 그대로 썸네일 URL(`https://img.youtube.com/vi/{videoId}/hqdefault.jpg`) 조립에 사용하면 됨. 산출 파일: src/fabric/youtubeUrl.js, src/fabric/youtubeUrl.test.js. ([리포트](step0-youtube-url-detection.md))
- [완료] **Step 1: youtube-card-object** — src/fabric/YoutubeCard.js에 `class YoutubeCard extends FabricImage` 구현. static type='YoutubeCard', static customProperties=['videoId'] — fabric의 FabricObject.toObject()가 this.constructor.customProperties를 자동 병합하므로 EXTRA_SERIALIZED_PROPS(useFabricCanvas.js) 수정 불필요(AnimatedGif와 동일 메커니즘, architecture.md 합의사항 확인됨). 공개 API: `YoutubeCard.create(videoId, options?) -> Promise<YoutubeCard>`(썸네일 https://img.youtube.com/vi/{videoId}/hqdefault.jpg 로드, FabricImage.fromURL 상속 활용), `YoutubeCard.fromObject(object, options?) -> Promise<YoutubeCard>`(object.videoId로 썸네일 재조립). 재생 버튼(원+삼각형)은 _render 오버라이드로 썸네일 위에 직접 그림(별도 Group 없음). 16:9 유지: lockUniScaling=true. 인스턴스의 deprecated `.type` getter는 소문자('youtubecard')를 반환하니, 타입 확인은 `card.constructor.type`이나 `toObject().type`을 써야 함(fabric 공통 동작, AnimatedGif도 동일). 다음 step(youtube-card-placement)은 YoutubeCard.create(videoId)를 호출해 canvas.add()로 배치하면 됨. 산출 파일: src/fabric/YoutubeCard.js, src/fabric/YoutubeCard.test.js. ([리포트](step1-youtube-card-object.md))
- [대기] **Step 2: youtube-card-placement** — 
- [대기] **Step 3: youtube-card-persistence** — 
- [대기] **Step 4: youtube-card-playback** — 
