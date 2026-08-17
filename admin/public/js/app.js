const btn = document.getElementById('test-publish-btn');
const result = document.getElementById('test-publish-result');

btn.addEventListener('click', async () => {
  btn.disabled = true;
  result.textContent = '발행 중...';
  try {
    const res = await fetch('/api/test-publish', { method: 'POST' });
    const json = await res.json();
    if (json.ok) {
      result.textContent = `발행 완료: ${json.slug} (1~2분 후 사이트에 반영됩니다)`;
    } else {
      result.textContent = `실패: ${json.error}`;
    }
  } catch (err) {
    result.textContent = `실패: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});
