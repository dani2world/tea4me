## 블로그 방향 / 콘텐츠 전략

이 블로그("TEA for ME")는 세 가지 축의 콘텐츠로 이야기를 이어간다 — **정보 → 경험 → 감정** 순으로
독자를 데려가는 흐름을 지향한다.

1. **정보** — 차 관련 지식/정보를 다루는 자동생성 글 (`type: info`). 검색 유입을 노리는
   콘텐츠. 현재 `admin/`의 정보성 글 파이프라인으로 이미 구현되어 있음.
2. **경험/리뷰** — 사진·메모 기반으로 직접 겪은 경험을 기록하는 글 (`type: experience`).
   현재 `admin/`의 경험 글 파이프라인으로 이미 구현되어 있음.
3. **차후감** *(계획 단계, 아직 미구현)* — 차를 마신 후의 감정을 기록하는 글. 경험/리뷰보다
   더 개인적이고 정서적인 축으로, 사진·메모 기반이라는 점은 경험/리뷰와 같지만 목적이
   다르다 (리뷰=정보 전달, 차후감=감정 기록). 향후 새로운 콘텐츠 타입으로 스키마·파이프라인을
   추가할 예정.

**콘텐츠 비율 목표**: 향후 수익화(애드센스 등)를 염두에 두고, 검색형 콘텐츠(정보)를
60~70%, 경험형 콘텐츠(경험/리뷰 + 차후감)를 30~40% 비율로 가져간다. 정보성 자동생성 글로
꾸준히 검색 유입 기반을 다지되, 사람이 직접 쓰는 경험/감정 콘텐츠가 블로그의 정체성과
차별점을 담당하는 구조.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
