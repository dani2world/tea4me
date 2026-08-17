const { spawn } = require('node:child_process');

const CLAUDE_CLI = process.env.CLAUDE_CLI || 'claude';

// 이 파이프라인이 필요로 하는 건 "이미지/텍스트 읽기 -> 글 생성"뿐이므로,
// 셸 실행이나 파일 쓰기 같은 부작용이 있는 도구는 전부 막아둔다.
const DISALLOWED_TOOLS = ['Bash', 'Edit', 'Write', 'NotebookEdit', 'WebFetch', 'WebSearch', 'Agent'];

/**
 * `claude -p`를 서브프로세스로 실행해 프롬프트를 stdin으로 넘기고 최종 텍스트를 반환한다.
 * API 과금이 아니라 로컬에 로그인된 Claude Code CLI 구독 세션을 사용한다.
 */
function runClaude({ prompt, cwd, timeoutMs = 180000 }) {
  return new Promise((resolve, reject) => {
    const args = [
      '-p',
      '--output-format', 'json',
      '--permission-mode', 'bypassPermissions',
      '--disallowedTools', DISALLOWED_TOOLS.join(' '),
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
        return reject(new Error(`claude -p가 출력 없이 종료됐습니다 (code ${code}): ${stderr.trim()}`));
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

function extractJson(text) {
  const trimmed = String(text).trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

/** claude -p 결과 텍스트가 JSON이라고 기대할 때 사용 (프롬프트에서 JSON만 응답하도록 지시해야 함) */
async function runClaudeJson(opts) {
  const text = await runClaude(opts);
  try {
    return extractJson(text);
  } catch (e) {
    throw new Error(`claude -p 결과를 JSON으로 파싱하지 못했습니다: ${text.slice(0, 500)}`);
  }
}

module.exports = { runClaude, runClaudeJson };
