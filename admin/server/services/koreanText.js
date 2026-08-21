// 엑셀 추천풀의 "오늘의 차 한마디"를 카드에 그대로 쓸 수 있게 다듬는 유틸.
//
// 원본 문장에는 두 가지 문제가 섞여 있다:
//  1. Brewing Tip / With 값이 문장 안에 다시 들어가 있다 —
//     카드에서 그 둘을 따로 보여주므로 그대로 두면 같은 말이 두 번 나온다.
//  2. 조사가 받침과 무관하게 붙어 있다 ("약과과", "동방미인를", "약과을").
//
// 두 처리 모두 규칙 기반이라 완벽하지 않다. 어드민에서 운영자가 최종 문구를
// 직접 고칠 수 있게 해두고, 여기서는 손댈 거리를 줄이는 데까지만 한다.

/** 한글 음절의 받침 유무. 한글이 아니면 null (판단 보류). */
function hasFinalConsonant(word) {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  return (code - 0xac00) % 28 !== 0;
}

// 받침 있음 / 받침 없음 짝. 원문에 어느 쪽이 붙어 있든 올바른 쪽으로 바꾼다.
const PARTICLE_PAIRS = [
  ['을', '를'],
  ['과', '와'],
  ['은', '는'],
  ['이', '가'],
  ['으로', '로'],
];

/**
 * text 안에서 word 바로 뒤에 붙은 조사를 받침에 맞게 고친다.
 * word가 여러 번 나오면 전부 고친다.
 */
function fixParticlesAfter(text, word) {
  if (!word) return text;
  const final = hasFinalConsonant(word);
  if (final === null) return text;

  let out = text;
  for (const [withFinal, withoutFinal] of PARTICLE_PAIRS) {
    const correct = final ? withFinal : withoutFinal;
    const wrong = final ? withoutFinal : withFinal;
    // 조사 뒤가 또 다른 한글이면 조사가 아니라 단어의 일부일 수 있으므로 제외.
    // (예: "약과와인" 같은 경우 — 실제 데이터엔 없지만 안전하게)
    const re = new RegExp(`(${escapeRegExp(word)})${wrong}(?![가-힣])`, 'g');
    out = out.replace(re, `$1${correct}`);
  }
  return out;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 추천풀 문장이 값을 끼워 넣지 않고 그냥 쓰는 말인데도 조사가 틀린 것들.
// 전수 스캔으로 찾았다 ("진한 풍미이", "풍미을 느껴보세요" 등 1000행 중 111건).
// 새 추천풀을 병합할 때 스캔을 다시 돌려 여기에 추가한다.
const KNOWN_NOUNS = ['풍미'];

/**
 * 문장에 끼워 넣어진 값들 뒤의 조사를 바로잡는다.
 * 차 이름·다식뿐 아니라 분위기 구절도 대상 — "해가 길어진 저녁와" 같은 오류가 있다.
 */
function fixParticles(text, { teaName, pairing, mood }) {
  let out = text;
  for (const word of [teaName, pairing, mood, ...KNOWN_NOUNS]) {
    if (word) out = fixParticlesAfter(out, word);
  }
  return out;
}

// 문장을 자르고 나면 연결어미로 끝나 어색해진다 ("...잘 어울리니").
// 관찰된 네 가지 템플릿의 꼬리를 종결형으로 바꿔준다.
const CLAUSE_ENDINGS = [
  [/잘\s*어울리니$/, '잘 어울려요.'],
  [/부드럽게\s*바꿔주니$/, '부드럽게 바꿔줘요.'],
  [/천천히\s*올라오도록$/, '천천히 올라와요.'],
  [/어울리니$/, '어울려요.'],
  [/주니$/, '줘요.'],
  [/도록$/, '좋아요.'],
];

function closeDanglingClause(text) {
  const trimmed = text.trim().replace(/[,·\s]+$/, '');
  for (const [pattern, replacement] of CLAUSE_ENDINGS) {
    if (pattern.test(trimmed)) return trimmed.replace(pattern, replacement);
  }
  // 이미 종결어미로 끝나면 그대로, 아니면 마침표만 보정.
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

/**
 * 한마디에서 Brewing Tip 이후(우리는 법 + 다식 안내)를 덜어낸다.
 * tip 문자열이 문장 안에 없으면 원문을 그대로 돌려준다.
 */
function trimBrewingTail(message, { brewingTip, pairing }) {
  let cutAt = -1;

  if (brewingTip) {
    // "75~80℃ · 2분" 처럼 가운뎃점이 든 값이라 통째로 찾는 게 가장 정확하다.
    cutAt = message.indexOf(brewingTip);
    if (cutAt === -1) {
      // 표기가 미세하게 다를 때를 대비해 온도 부분만으로 한 번 더.
      const temp = brewingTip.split('·')[0].trim();
      if (temp) cutAt = message.indexOf(temp);
    }
  }
  if (cutAt === -1 && pairing) cutAt = message.indexOf(pairing);
  if (cutAt <= 0) return message.trim();

  const head = message.slice(0, cutAt);
  // 자른 자리 바로 앞의 조사/연결어미까지 함께 정리 ("...어울리니 75~80℃" → "...어울리니")
  return closeDanglingClause(head);
}

// 첫 문장을 덜어내면 "…끝맛을 느낄 수 있게."처럼 홀로 설 수 없는 문장이 남는
// 템플릿이 있다. 그런 꼬리만 종결형으로 세워준다.
const ORPHAN_TAILS = [
  [/을\s*느낄\s*수\s*있게\.$/, '을 느껴보세요.'],
  [/를\s*느낄\s*수\s*있게\.$/, '를 느껴보세요.'],
  [/느낄\s*수\s*있게\.$/, '느껴보세요.'],
];

/**
 * 첫 문장이 차 이름을 소개하는 도입부면 통째로 덜어낸다.
 *
 * 카드에는 차 이름이 제목으로 이미 크게 나오므로, 한마디에서 또 부르면 같은 말이
 * 두 번이다. 추천풀의 문장은 전부 "{차}가 생각나는 날이에요." 류로 시작하는데,
 * 그 문장을 빼도 뒤에 분위기나 기분이 남아 있어 맥락이 끊기지 않는다.
 */
function dropTeaNameLead(message, teaName) {
  if (!teaName) return message;

  const split = message.match(/^(.*?[.!?])\s+(.+)$/s);
  if (!split) return message; // 한 문장뿐이면 건드리지 않는다
  const [, first, rest] = split;

  if (!first.includes(teaName)) return message; // 도입부가 아니면 그대로
  if (rest.includes(teaName)) return message; // 뒤에서도 부르면 앞을 지울 이유가 없다
  if (rest.trim().length < 20) return message; // 남는 게 너무 짧으면 원문이 낫다

  let out = rest.trim();
  for (const [pattern, replacement] of ORPHAN_TAILS) {
    if (pattern.test(out)) {
      out = out.replace(pattern, replacement);
      break;
    }
  }
  return out;
}

/**
 * 문장 한가운데서 이름을 부르고 쉼표로 잇는 형태를 덜어낸다.
 * 예: "…차도 조금 다르게 골라보세요. 오늘은 겐마이차, 구수한 현미 향이…"
 *  →  "…차도 조금 다르게 골라보세요. 구수한 현미 향이…"
 * 도입부 문장(dropTeaNameLead)과 달리 앞 문장에 분위기가 담겨 있어 그대로 살린다.
 */
function dropTeaNameAside(message, teaName) {
  if (!teaName || !message.includes(teaName)) return message;
  return message.replace(new RegExp(`오늘은\\s*${escapeRegExp(teaName)}\\s*,\\s*`, 'g'), '');
}

/**
 * 카드에 바로 쓸 수 있는 한마디 초안을 만든다.
 * 원문은 버리지 않고 함께 돌려주어, 어드민에서 되돌릴 수 있게 한다.
 */
function refineMessage(message, { teaName, brewingTip, pairing, mood }) {
  const raw = (message || '').trim();
  if (!raw) return { message: '', rawMessage: '' };

  const trimmed = trimBrewingTail(raw, { brewingTip, pairing });
  const short = dropTeaNameAside(dropTeaNameLead(trimmed, teaName), teaName);
  return {
    message: fixParticles(short, { teaName, pairing, mood }),
    rawMessage: fixParticles(raw, { teaName, pairing, mood }),
  };
}

module.exports = { refineMessage, fixParticles, hasFinalConsonant };
