const { spawn } = require('node:child_process');

const CLAUDE_CLI = process.env.CLAUDE_CLI || 'claude';

// 이 파이프라인이 필요로 하는 건 "이미지/텍스트 읽기 -> 글 생성"뿐이므로,
// 셸 실행이나 파일 쓰기 같은 부작용이 있는 도구는 전부 막아둔다.
const DISALLOWED_TOOLS = ['Bash', 'Edit', 'Write', 'NotebookEdit', 'WebFetch', 'WebSearch', 'Agent'];

// Windows에서 claude -> claude.cmd -> claude.exe로 두 단계를 거쳐 실행되는데,
// 백신 실시간 검사 등으로 프로세스 생성 자체가 가끔 실패한다 (출력 없이 바로
// 종료, 흔히 0xC0000142 같은 Windows STATUS 코드). Claude의 응답 문제가
// 아니라 OS 레벨의 일시적 오류이므로 재시도하면 대부분 바로 성공한다.
// 다만 실제로 짧은 시간 안에 재시도 전부(3회)가 함께 실패하는 사례가 있었음 —
// 스캔이 몇 초씩 걸리는 경우 고정 1.5초 간격으로는 그 창을 못 피하므로,
// 시도 횟수를 늘리고 지수 백오프(1.5s, 3s, 6s, 12s)로 늘려서 회피 여유를 준다.
const SPAWN_FAILURE_RETRIES = 4;
const SPAWN_FAILURE_RETRY_BASE_DELAY_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runClaudeOnce({ prompt, cwd, timeoutMs }) {
  return new Promise((resolve, reject) => {
    // shell:true(Windows에서 .cmd 실행에 필요)는 Node가 배열 인자를 자동으로
    // 이스케이프해주지 않고 공백으로만 이어붙인다 — 그래서 공백이 든 값은
    // 직접 따옴표로 감싸야 하나의 인자로 전달된다 (안 그러면 disallowedTools
    // 뒤 단어들이 전부 별도의 낱개 인자로 흩어짐).
    const disallowedToolsValue = DISALLOWED_TOOLS.join(' ');
    const args = [
      '-p',
      '--output-format', 'json',
      '--permission-mode', 'bypassPermissions',
      '--disallowedTools',
      process.platform === 'win32' ? `"${disallowedToolsValue}"` : disallowedToolsValue,
    ];

    const child = spawn(CLAUDE_CLI, args, {
      cwd,
      shell: process.platform === 'win32',
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('claude -p 응답이 시간 초과되었습니다.'));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`claude CLI를 실행할 수 없습니다 (PATH에 설치되어 있는지 확인하세요): ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (!stdout.trim()) {
        const err = new Error(`claude -p가 출력 없이 종료됐습니다 (code ${code}): ${stderr.trim()}`);
        err.emptyOutput = true;
        return reject(err);
      }
      let parsed;
      try {
        parsed = JSON.parse(stdout);
      } catch (e) {
        return reject(new Error(`claude -p 출력이 JSON이 아닙니다: ${stdout.slice(0, 500)}`));
      }
      if (parsed.is_error) {
        return reject(new Error(`claude -p 오류: ${parsed.result}`));
      }
      resolve(parsed.result);
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/**
 * `claude -p`를 서브프로세스로 실행해 프롬프트를 stdin으로 넘기고 최종 텍스트를 반환한다.
 * API 과금이 아니라 로컬에 로그인된 Claude Code CLI 구독 세션을 사용한다.
 * 출력 없이 프로세스가 죽는 OS 레벨 스폰 실패는 자동으로 재시도한다.
 */
async function runClaude({ prompt, cwd, timeoutMs = 180000 }) {
  let lastErr;
  for (let attempt = 0; attempt <= SPAWN_FAILURE_RETRIES; attempt++) {
    try {
      return await runClaudeOnce({ prompt, cwd, timeoutMs });
    } catch (err) {
      lastErr = err;
      if (!err.emptyOutput || attempt === SPAWN_FAILURE_RETRIES) throw err;
      const delay = SPAWN_FAILURE_RETRY_BASE_DELAY_MS * 2 ** attempt;
      console.error(`claude -p 스폰 실패, ${delay}ms 후 재시도 (${attempt + 1}/${SPAWN_FAILURE_RETRIES})...`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

function extractJson(text) {
  const trimmed = String(text).trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

const JSON_PARSE_RETRIES = 1;

/** claude -p 결과 텍스트가 JSON이라고 기대할 때 사용 (프롬프트에서 JSON만 응답하도록 지시해야 함) */
async function runClaudeJson(opts) {
  let lastErr;
  for (let attempt = 0; attempt <= JSON_PARSE_RETRIES; attempt++) {
    const text = await runClaude(opts);
    try {
      return extractJson(text);
    } catch (e) {
      lastErr = new Error(`claude -p 결과를 JSON으로 파싱하지 못했습니다: ${text.slice(0, 500)}`);
      if (attempt === JSON_PARSE_RETRIES) throw lastErr;
      console.error('claude -p JSON 파싱 실패, 다시 요청 중...');
    }
  }
  throw lastErr;
}

module.exports = { runClaude, runClaudeJson };
