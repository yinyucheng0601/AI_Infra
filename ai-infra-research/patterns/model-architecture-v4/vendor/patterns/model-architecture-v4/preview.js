(async function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  let theme = params.get('theme') === 'light' ? 'light' : 'dark';
  const levels = [...document.querySelectorAll('[data-level]')];
  const output = document.getElementById('selection');
  const legendButton = document.getElementById('legend-toggle');
  const legendPanel = document.getElementById('legend-panel');
  function showLegend(open) { legendPanel.hidden = !open; legendButton.setAttribute('aria-expanded', String(open)); }
  legendButton.addEventListener('click', () => showLegend(legendPanel.hidden));
  document.addEventListener('pointerdown', event => {
    if (!legendPanel.contains(event.target) && !legendButton.contains(event.target)) showLegend(false);
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !legendPanel.hidden) { showLegend(false); legendButton.focus(); } });

  function showLevel(level) { levels.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.level === level))); }
  function onEvent(message) {
    if (message.type === 'csa-semantic-state') showLevel(message.rootFolded ? 'l0' : message.state === 'l1' ? 'l1' : 'l2');
    if (message.type === 'csa-operator-select' || message.type === 'csa-operator-toggle') {
      const refs = (message.sourceRefs || []).map(ref => `${ref.file || ref.path || ''}:${ref.start || ref.line_start || ''}`).join(' · ');
      output.textContent = `${message.label || message.nodeId}${refs ? ' · ' + refs : ''}`;
    }
    if (message.type === 'csa-operator-clear') output.textContent = '点击节点查看名称和来源位置';
  }
  try {
    const controller = await PtoV4ModelArchitecturePattern.render('#v4Graph', {modelGraph:true, level:'l1', initialTheme:theme, onEvent});
    window.v4PatternController = controller;
    const setLevel = level => {
      controller.setRootFolded(level === 'l0');
      if (level !== 'l0') controller.setAllCompounds(level === 'l2');
      controller.fit({whole:true});
      showLevel(level);
    };
    levels.forEach(button => button.addEventListener('click', () => setLevel(button.dataset.level)));
    document.getElementById('fit').addEventListener('click', () => controller.fit({whole:true}));
    const themeButton = document.getElementById('theme');
    function syncTheme() { themeButton.textContent = theme === 'dark' ? '浅色模式' : '深色模式'; }
    themeButton.addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; controller.setTheme(theme); syncTheme(); });
    window.addEventListener('message', event => {
      if (event.source === window.parent && event.data?.type === 'pto-preview-theme') {
        theme = event.data.theme === 'light' ? 'light' : 'dark'; controller.setTheme(theme); syncTheme();
      }
    });
    syncTheme();
    if (['l0','l2'].includes(params.get('level'))) setLevel(params.get('level'));
  } catch (error) { output.setAttribute('role','alert'); output.textContent = `架构图加载失败：${error.message}`; }
})();
