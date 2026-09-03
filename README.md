# TEA for ME

개인 차(茶) 블로그. Astro + GitHub Pages. 에디토리얼 매거진 톤(흑백 + 코럴 한 점)으로
2026년 8월 리디자인했습니다. 아래는 앞으로 이 사이트를 운영하면서 필요한 것들만 정리한
사용 설명서입니다. (디자인 값 자체를 바꾸고 싶다면 `design_handoff_tea4me_redesign/README.md`가
원본 명세입니다.)

## 오늘의 차 매일 바꾸기

두 가지 방법이 있습니다.

**1) 어드민 등록 도구 사용(권장)** — `admin/` 폴더의 등록 도구를 켜면(`admin/start-admin.bat`
더블클릭, 또는 `npm --prefix admin start`) 브라우저에서 추천풀(`admin/data/todayTeaPool.xlsx`)
중 하나를 골라 등록할 수 있습니다. 등록하면 `src/content/teas/teas.yaml`에 자동으로 한 줄이
추가됩니다.

**2) 직접 파일 수정** — `src/content/teas/teas.yaml`을 열어 아래 형식으로 한 항목을
추가하면 됩니다. `date`에 적은 날짜에 그 항목이 고정으로 노출되고, 등록을 건너뛴 날은
같은 계절의 과거 등록분에서 자동으로 하나가 뽑힙니다.

```yaml
- slug: tea-2026-08-25
  name: 벽라춘 # 오늘의 차 카드에는 한글 이름 한 줄만 나옵니다
  date: "2026-08-25"
  season: 가을 # 봄 | 여름 | 가을 | 겨울 | 전체
  message: 카드 본문에 보이는 한 문장(차의 특징과 오늘 분위기를 잇는 설명).
  brewingTip: 85℃ 안팎 · 3분 # "BREWING TIP" 자리에 그대로 노출
  pairing: 과일양갱 # "LINGER WITH" 자리에 그대로 노출
  moment: 조용히 마음을 가라앉히고 싶은 오후 # 카드 맨 아래 🌷 인용문
```

## 새 글 쓰기

글 파일은 `src/content/posts/{slug}/index.md`. 프론트매터 필드는 아래와 같습니다.

```yaml
---
title: "글 제목"
slug: "글-슬러그"
pubDate: "2026-08-25"
type: "info" # info(정보) | review(리뷰) | reflection(차후감) 셋 중 하나
category: "홍차" # 차 종류 — /category/[분류] 페이지 기준
tags: ["홍차", "입문"]
excerpt: "카드와 상세 페이지 상단에 보이는 요약. <br>로 줄바꿈 가능."
coverImage: "./cover.jpg"
coverImageAlt: "대체 텍스트"
author: "DANI" # 생략하면 기본값 DANI
featured: true # 이 글을 홈 Latest 자리에 노출. 생략하면(또는 true인 글이 없으면) 최신 글이 자동으로 노출됨
titleBreak: "제목을<br>의미 단위로<br>줄바꿈하고 <em>강조</em>하고 싶을 때만" # 선택. 없으면 title을 그대로 씁니다
brewing: # 선택 — 본문에 "이렇게 우려보세요" 박스가 추가됩니다
  tea: "아쌈 정통 잎차"
  note: "우리는 팁 한 문장"
  temp: "95℃"
  time: "3분"
  leaf: "3g / 200ml"
---
```

- `type: "info"`인 글은 기존 규칙 그대로 `humanNote`(운영자가 직접 쓴 한 문장)와
  `coverImageAttribution`(스톡 이미지 출처)이 반드시 있어야 합니다.
- **본문 안에서 소제목을 쓰고 싶다면 마크다운 `## 소제목` 문법을 쓰세요.** 글 상세
  페이지 왼쪽의 "CONTENTS" 목차는 `##`(H2)로 쓴 소제목만 자동으로 모아 보여줍니다.
  지금까지 쓴 글들은 `##`를 쓰지 않아서 목차가 비어 있는 상태인데, 앞으로 글에 `##`를
  넣기 시작하면 그 글부터 목차가 채워집니다.
- **본문 안 대조 표**(두 대상을 나란히 비교하는 상자, "글 상세" 예시의 CTC vs Orthodox
  같은 표)를 넣고 싶으면 본문에 아래 HTML을 그대로 붙여넣고 내용만 바꾸세요.

  ```html
  <div class="compare-table">
    <div>
      <p class="compare-table__label">A</p>
      <p class="compare-table__title">이름</p>
      <p class="compare-table__desc">설명 한두 문장</p>
      <p class="compare-table__summary">한 줄 요약</p>
    </div>
    <div>
      <p class="compare-table__label">B</p>
      <p class="compare-table__title">이름</p>
      <p class="compare-table__desc">설명 한두 문장</p>
      <p class="compare-table__summary">한 줄 요약</p>
    </div>
  </div>
  ```

## "차 취향 찾기" 질문·결과 고치기

`src/data/findYourCup.ts` 파일 하나에 질문 5개, 선택지, 추천 차 6종이 모두 들어 있습니다.
- 질문 문구·선택지 문구만 바꾸고 싶다면 `QUESTIONS`의 텍스트만 수정하면 됩니다.
- 추천 차 내용(설명, 우리는 법, 인용문)을 바꾸고 싶다면 `RESULTS`를 수정하세요.
  `category` 값은 `src/content/posts`의 실제 `category`와 같아야 결과 화면 하단에
  "함께 읽어보세요" 관련 글이 붙습니다.
- 어떤 선택지가 어떤 결과에 투표하는지는 각 옵션의 `vote` 값으로 정합니다. 처음 잡아본
  값이라 자유롭게 바꾸셔도 코드는 그대로 동작합니다.

## 문의 폼 연결하기 (Formspree)

지금은 문의·응원글 모달을 제출해도 실제로 어디에도 전달되지 않는 자리표시자 상태입니다.
연결하려면:

1. [formspree.io](https://formspree.io)에서 무료 계정을 만들고 새 폼을 하나 만드세요.
2. 발급된 폼 주소(`https://formspree.io/f/xxxxxxx` 형태)를 복사하세요.
3. `src/components/ContactModal.astro` 맨 위의 `FORMSPREE_ENDPOINT` 상수 값을
   그 주소로 바꾸세요.

## 뉴스레터 배너 켜기

아직 구독 서비스가 없어서 소개 페이지에 뉴스레터 배너를 주석 처리해 두었습니다.
`src/pages/about.astro`에서 `<!-- 뉴스레터 배너 ... -->`로 시작하는 주석 블록을 찾아
그 안의 `<section class="newsletter">...</section>`을 감싼 주석(`<!--`, `-->`)만 지우면
바로 노출됩니다. (실제 구독 처리는 별도 폼 서비스 연결이 필요합니다 — 문의 폼과 같은
방식으로 Formspree 등을 붙이면 됩니다.)

## 실제 사진 올리기

- **글 표지/본문 사진**: 지금처럼 `src/content/posts/{slug}/` 폴더 안에 이미지 파일을
  넣고 프론트매터의 `coverImage`에서 참조하면 됩니다(기존 방식 그대로).
- **프로필 사진**: 소개 페이지의 "쓰는 사람" 카드 왼쪽은 아직 사선 패턴 자리표시자입니다.
  정사각(400×400 이상) 사진을 `src/assets/profile.jpg` 등으로 추가한 뒤,
  `src/pages/about.astro`의 `.writer__photo` 자리를 `astro:assets`의 `<Image>`로
  교체해 주시면 반영해 드릴게요.

## 개발

```sh
astro dev --background   # 로컬 서버 백그라운드 실행
astro dev status          # 상태 확인
astro dev stop             # 중지
astro dev logs              # 로그 보기
npm run build              # 정적 빌드 (GitHub Pages 배포 전 점검용)
```

| Command | Action |
| :------ | :----- |
| `npm run dev` | 로컬 개발 서버 (`localhost:4321`) |
| `npm run build` | `./dist/`에 정적 빌드 |
| `npm run preview` | 빌드 결과 로컬 미리보기 |
