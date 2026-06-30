/* Podcast Flow V2 原型 — 共享脚本 */

/** 内联 SVG 图标（替代 emoji） */
function icon(name, size = 'md') {
  const cls = size === 'sm' ? 'icon icon-sm' : size === 'lg' ? 'icon icon-lg' : 'icon icon-md';
  const paths = {
    mic: '<path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z"/>',
    music: '<path fill="currentColor" d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z"/>',
    play: '<path fill="currentColor" d="M8 5.14v13.72L19 12 8 5.14Z"/>',
    pause: '<path fill="currentColor" d="M6 5h4v14H6V5Zm8 0h4v14h-4V5Z"/>',
    upload: '<path fill="currentColor" d="M11 16V7.85l-2.6 2.6L7 9l5-5 5 5-1.4 1.45-2.6-2.6V16h-2Zm-7 2h16v2H4v-2Z"/>',
    link: '<path fill="currentColor" d="M3.9 12a5 5 0 0 1 1.46-3.54l2.12-2.12a5 5 0 0 1 7.07 7.07l-1.41 1.41-1.42-1.41 1.41-1.41a3 3 0 1 0-4.24-4.24L5.34 8.76A3 3 0 0 0 4.9 12a3 3 0 0 0 .88 2.12l1.41 1.41-1.42 1.42-1.41-1.41A5 5 0 0 1 3.9 12Zm16.2 0a5 5 0 0 1-1.46 3.54l-2.12 2.12a5 5 0 0 1-7.07-7.07l1.41-1.41 1.42 1.41-1.41 1.41a3 3 0 1 0 4.24 4.24l2.12-2.12A3 3 0 0 0 19.1 12a3 3 0 0 0-.88-2.12l-1.41-1.41 1.42-1.42 1.41 1.41A5 5 0 0 1 20.1 12Z"/>',
    wave: '<path fill="currentColor" d="M2 12h2l1.5-4 2 8 2-6 1.5 2H22v2H13l-1.5-2-2 6-2-8L6 14H2v-2Z"/>',
    save: '<path fill="currentColor" d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4Zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm3-10H5V5h10v4Z"/>',
    refresh: '<path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z"/>',
    volume: '<path fill="currentColor" d="M3 10v4h4l5 5V5L7 10H3Zm13.5 2a4.5 4.5 0 0 0-2.5-4.03v8.05a4.48 4.48 0 0 0 2.5-4.02ZM14 3.23v2.06a7 7 0 0 1 0 13.94v2.06a9 9 0 0 0 0-18.02Z"/>',
    check: '<path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z"/>',
    plus: '<path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z"/>',
  };
  const d = paths[name];
  if (!d) return '';
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
}

const MOCK_USER = { username: '专注听众', email: 'demo@example.com', initial: '专' };

const MOCK_PODCAST = {
  title: '如何建立可持续的专注习惯',
  podcast_name: '效率圆桌',
  duration_label: '53:00',
  description: '本期讨论注意力管理与深度工作方法。',
  cover_color: '#2D6A4F',
  cover_initial: '专',
  source_url: 'https://www.xiaoyuzhoufm.com/episode/demo',
};

const MOCK_BGM = { title: 'Focus Rain', duration_label: '03:00', source_type: 'upload' };

const MOCK_ASSETS = [
  {
    id: 'mixed_001',
    title: '如何建立可持续的专注习惯',
    subtitle: '效率圆桌 · Mix',
    podcast_name: '效率圆桌',
    bgm_name: 'Focus Rain',
    bgm_icon: 'water_drop',
    duration_label: '53:00',
    created_at: '2026-06-27',
    status: 'completed',
    cover_color: '#2D6A4F',
    cover_initial: '专',
    cover_image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0qMuO302uC8-oEjB1eAlypggbkZh1caZQAVaGDsMt30ZVZILodFKRbt-msJ3vz2s5ccToFjllapsmaPyehgoDHDqMaqE8miwjX4X3NuZlzkJ3Df-gHyFQX32QnqKhb5HA2hpbZohbBtUxWXH2nTYMWfOAzM-lZQ0ZsAmFld7RulKxs_wTYCDSdv06plrpG8vnPH4ql-tRw0e1YBK4v_7IOOF5QpHkDc6E0c8XBKbL8qpj7fnZE44VwvD0TYwQASUnRUPdXTolJOM',
    bgm_cover_image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCc9Z3RrV_1uX6xEIkp5olyWsqwoSsaJX-DGPEYKocYE3TX8_K8djdGzSIC29M8eS-ZTlnnN5uCkbTpUGEKG6Y72vFFom8PK3rKKA3QOGYBXoceDRzMVhYAhDpdWHGzi1y0DGJMjN_ptqgNA2vxq0GFB3EMyl-36JmVB5deCjnLSjBOl7w9oM1WA7gCmrtl567jG6OpDOA0aIL-l_G4eMAZiwuTQ44cGHZsZcMjHg4oaUfjr5mKnZMMXDOSZ9ZnJ7g5X8hE1MVIcU0',
    bgm_subtitle: '自然白噪音 · 持续循环',
    bgm_tag_class: 'bg-secondary',
    mix: {
      podcast_volume: 100,
      podcast_rate: 1.0,
      bgm_volume: 15,
      bgm_rate: 1.0,
      bgm_loop: true,
      fade_in: 3,
      fade_out: 5,
      fade_in_enabled: true,
      fade_out_enabled: true,
    },
  },
  {
    id: 'mixed_002',
    title: '夜间放松漫谈',
    subtitle: '睡前故事 · Mix',
    podcast_name: '睡前故事',
    bgm_name: 'Ocean Waves',
    bgm_icon: 'nights_stay',
    bgm_tag_class: 'bg-[#102A43]',
    duration_label: '28:00',
    created_at: '2026-06-25',
    status: 'completed',
    cover_color: '#457B9D',
    cover_initial: '夜',
    cover_image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcAnjXsM--62iOwg6AkLlx_13oPmxfBVsCDajF-Z4MsLqWIIdWB0fTobRew8qkoEGNJD0NdXpmK1uJU0taC6HTpJUhhRqJwo-aeoVLZR0cr0djORqGy7tgsYvSz5z5Rsf2w4CZv41PaaBZCe8w8SeQ6xL1Qr2dTuM_B958CPz2xpOzSuqhUeIJ3nlKbRZrCngsPFefPTpQ2sk1vlifCtH_8HbShjUYCfcc6eputXYC2W22Y1uLegJPWKWH6mJXhMFUuW5senrNdPE',
    mix: {
      podcast_volume: 100,
      podcast_rate: 1.0,
      bgm_volume: 12,
      bgm_rate: 0.9,
      bgm_loop: true,
      fade_in: 0,
      fade_out: 8,
      fade_in_enabled: false,
      fade_out_enabled: true,
    },
  },
  {
    id: 'mixed_003',
    title: '产品思维入门',
    subtitle: '创造者说 · Mix',
    podcast_name: '创造者说',
    bgm_name: 'Lo-Fi Study',
    bgm_icon: 'design_services',
    bgm_tag_class: 'bg-surface-tint',
    duration_label: '41:00',
    created_at: '2026-06-20',
    status: 'completed',
    cover_color: '#6D597A',
    cover_initial: '产',
    cover_image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4jg-gP2yNdypx_YsXgUapBtu-rhpX32goyc34XRuEFuwuzBcoRdJ0pYt5-jXpKo4SBpMm6fomYVBWUQ0zLAj60NW0MYnTKKPJmQwSacIPJB7vmXvgfOu3sy8knxbhP7QoetcYqlhYUHwsMmXsVYW2zMR9pS3T58CM8m4vosYgDKpP8vbVFWjWsf7v71hdExPS3QdMhuNBJHSbJtKn2obfeD8dhbWZ1bobcwVy-M30Swt_xWuZLIi_v4fA5mPMLLLPNVCF4vLsywU',
    mix: {
      podcast_volume: 95,
      podcast_rate: 1.1,
      bgm_volume: 18,
      bgm_rate: 1.0,
      bgm_loop: true,
      fade_in: 2,
      fade_out: 4,
      fade_in_enabled: true,
      fade_out_enabled: true,
    },
  },
];

/** 混音配置只读展示（Stitch 详情页 · 进度条 + 标签） */
function mixConfigDisplayHTML(values) {
  const v = values || getDefaultMixConfig();
  const pv = v.podcast_volume;
  const bv = v.bgm_volume;
  const tags = [];
  if (pv >= 80) tags.push('人声增强');
  if (v.fade_in_enabled && v.fade_out_enabled) tags.push('平滑过渡');
  if (v.bgm_loop) tags.push('持续循环');
  const tagHtml = tags.length
    ? `<div class="mt-2 flex flex-wrap gap-2">${tags.map((t) => `<span class="bg-[#163D35]/10 text-[#163D35] px-3 py-1 rounded-full font-label-sm text-label-sm">${t}</span>`).join('')}</div>`
    : '';

  return `
<div class="flex flex-col gap-4 mix-config-display-stitch" aria-readonly="true">
  <div class="flex flex-col gap-2">
    <div class="flex justify-between font-label-sm text-label-sm">
      <span class="text-on-surface">主干人声 (播客)</span>
      <span class="text-primary-container font-mono-num text-mono-num">${pv}%</span>
    </div>
    <div class="h-1.5 bg-surface-variant rounded-full overflow-hidden">
      <div class="h-full bg-primary-container rounded-full" style="width:${pv}%"></div>
    </div>
  </div>
  <div class="flex flex-col gap-2">
    <div class="flex justify-between font-label-sm text-label-sm">
      <span class="text-on-surface">环境背景音 (BGM)</span>
      <span class="text-primary-container font-mono-num text-mono-num">${bv}%</span>
    </div>
    <div class="h-1.5 bg-surface-variant rounded-full overflow-hidden">
      <div class="h-full bg-primary-container opacity-50 rounded-full" style="width:${bv}%"></div>
    </div>
  </div>
  ${tagHtml}
</div>`;
}

/** 默认混音配置 */
function getDefaultMixConfig() {
  return {
    podcast_volume: 100,
    podcast_rate: 1.0,
    bgm_volume: 15,
    bgm_rate: 1.0,
    bgm_loop: true,
    fade_in: 3,
    fade_out: 5,
    fade_in_enabled: true,
    fade_out_enabled: true,
  };
}

/** 将配置写回表单（用于恢复已保存 / 重置未保存草稿） */
function applyMixConfigToForm(prefix, values) {
  const v = values || getDefaultMixConfig();
  const set = (id, val) => {
    const el = document.getElementById(`${prefix}-${id}`);
    if (el) el.value = val;
  };
  const setCheck = (id, checked) => {
    const el = document.getElementById(`${prefix}-${id}`);
    if (el) el.checked = checked;
  };

  set('pv', v.podcast_volume);
  set('pr', v.podcast_rate);
  set('bv', v.bgm_volume);
  set('br', v.bgm_rate);
  setCheck('loop', v.bgm_loop);
  setCheck('fi-en', v.fade_in_enabled);
  setCheck('fo-en', v.fade_out_enabled);
  set('fi', v.fade_in);
  set('fo', v.fade_out);

  const root = document.querySelector(`.mix-config[data-prefix="${prefix}"]`);
  if (!root) return;

  root.querySelectorAll('.mix-range').forEach((input) => {
    updateRangeFill(input);
    const valEl = root.querySelector(`.mix-val[data-for="${input.id}"]`);
    if (!valEl) return;
    if (input.id.endsWith('-pr') || input.id.endsWith('-br')) {
      valEl.textContent = `${parseFloat(input.value).toFixed(1)}x`;
    } else if (input.id.endsWith('-fi') || input.id.endsWith('-fo')) {
      valEl.textContent = `${input.value} 秒`;
    } else {
      valEl.textContent = `${input.value}%`;
    }
  });

  const fiWrap = document.getElementById(`${prefix}-fi-wrap`);
  const foWrap = document.getElementById(`${prefix}-fo-wrap`);
  if (fiWrap) fiWrap.classList.toggle('hidden', !v.fade_in_enabled);
  if (foWrap) foWrap.classList.toggle('hidden', !v.fade_out_enabled);
}

/** 从创建页混音配置表单读取当前值 */
function readMixConfigFromForm(prefix) {
  const g = (id) => document.getElementById(`${prefix}-${id}`);
  return {
    podcast_volume: parseInt(g('pv')?.value || '100', 10),
    podcast_rate: parseFloat(g('pr')?.value || '1'),
    bgm_volume: parseInt(g('bv')?.value || '15', 10),
    bgm_rate: parseFloat(g('br')?.value || '1'),
    bgm_loop: g('loop')?.checked ?? true,
    fade_in: parseInt(g('fi')?.value || '3', 10),
    fade_out: parseInt(g('fo')?.value || '5', 10),
    fade_in_enabled: g('fi-en')?.checked ?? false,
    fade_out_enabled: g('fo-en')?.checked ?? false,
  };
}

/** Stitch 风混音滑块行 */
function mixSliderRowStitch(p, id, label, display, attrs, ro = '') {
  return `
  <div class="flex flex-col gap-2">
    <div class="flex justify-between items-center">
      <label class="text-body-md font-body-md text-on-surface">${label}</label>
      <span class="font-mono-num text-mono-num text-primary-container font-bold mix-val" data-for="${p}-${id}">${display}</span>
    </div>
    <div class="mix-range-wrap-stitch">
      <div class="mix-range-fill-stitch"></div>
      <input type="range" id="${p}-${id}" class="stitch-range mix-range" ${attrs}${ro}>
    </div>
  </div>`;
}

function mixFadeRowStitch(p, toggleKey, rangeKey, label, checked, secNum, hiddenClass, ro = '') {
  return `
  <div class="fade-row-stitch flex items-center justify-between p-4 rounded-lg bg-surface hover:bg-surface-elevated border border-transparent hover:border-border-subtle transition-colors gap-4 flex-wrap">
    <label class="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" id="${p}-${toggleKey}" class="custom-checkbox mix-row-checkbox"${checked ? ' checked' : ''}${ro}>
      <span class="text-body-md font-body-md text-on-surface">${label}</span>
    </label>
    <div class="flex items-center gap-3 w-full sm:w-48 ${hiddenClass}" id="${p}-${rangeKey}-wrap">
      <div class="mix-range-wrap-stitch flex-1">
        <div class="mix-range-fill-stitch"></div>
        <input type="range" id="${p}-${rangeKey}" class="stitch-range mix-range" min="1" max="10" value="${secNum}"${ro}>
      </div>
      <span class="font-mono-num text-mono-num text-text-secondary w-8 text-right mix-val" data-for="${p}-${rangeKey}">${secNum}s</span>
    </div>
  </div>`;
}

/** 创建页 · Stitch 布局（左 2/3 配置 + 右 1/3 试听） */
function mixConfigStackedHTML(p, opts, values, ro, roClass, showPreview, fadeInHidden, fadeOutHidden) {
  const fiHidden = values.fade_in_enabled ? '' : 'hidden';
  const foHidden = values.fade_out_enabled ? '' : 'hidden';

  return `
<div class="mix-config mix-config-stitch${roClass}" data-prefix="${p}">
  <div class="flex flex-col lg:flex-row gap-unit-lg items-start">
    <div class="w-full lg:w-2/3 flex flex-col gap-unit-lg">
      <section class="bg-surface-container-lowest rounded-xl p-unit-lg border border-border-subtle shadow-card hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-300">
        <h2 class="text-headline-md font-headline-md text-primary mb-6 flex items-center gap-2">
          <span class="material-symbols-outlined text-primary-container" style="font-variation-settings:'FILL' 1">mic</span>
          播客
        </h2>
        <div class="space-y-6">
          ${mixSliderRowStitch(p, 'pv', '音量', `${values.podcast_volume}%`, `min="0" max="100" value="${values.podcast_volume}"`, ro)}
          ${mixSliderRowStitch(p, 'pr', '倍速', `${values.podcast_rate.toFixed(1)}x`, `min="0.6" max="2" step="0.1" value="${values.podcast_rate}"`, ro)}
        </div>
      </section>
      <section class="bg-surface-container-lowest rounded-xl p-unit-lg border border-border-subtle shadow-card hover:-translate-y-0.5 hover:shadow-card-hover transition-all duration-300">
        <div class="flex justify-between items-center mb-6 flex-wrap gap-2">
          <h2 class="text-headline-md font-headline-md text-primary flex items-center gap-2">
            <span class="material-symbols-outlined text-primary-container" style="font-variation-settings:'FILL' 1">music_note</span>
            BGM
          </h2>
          <span class="bg-secondary text-surface-container-lowest px-2 py-1 rounded-full text-label-sm font-label-sm">已选择 1 首</span>
        </div>
        <div class="space-y-8">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${mixSliderRowStitch(p, 'bv', '音量', `${values.bgm_volume}%`, `min="0" max="100" value="${values.bgm_volume}"`, ro)}
            ${mixSliderRowStitch(p, 'br', '倍速', `${values.bgm_rate.toFixed(1)}x`, `min="0.6" max="2" step="0.1" value="${values.bgm_rate}"`, ro)}
          </div>
          <hr class="border-border-subtle"/>
          <div class="space-y-4">
            ${mixFadeRowStitch(p, 'fi-en', 'fi', '淡入', values.fade_in_enabled, values.fade_in, fiHidden, ro)}
            ${mixFadeRowStitch(p, 'fo-en', 'fo', '淡出', values.fade_out_enabled, values.fade_out, foHidden, ro)}
            <div class="flex items-center p-4 rounded-lg bg-surface hover:bg-surface-elevated border border-transparent hover:border-border-subtle transition-colors">
              <label class="flex items-center gap-3 cursor-pointer w-full">
                <input type="checkbox" id="${p}-loop" class="custom-checkbox mix-row-checkbox"${values.bgm_loop ? ' checked' : ''}${ro}>
                <span class="text-body-md font-body-md text-on-surface">BGM 自动循环铺满播客</span>
              </label>
            </div>
          </div>
        </div>
      </section>
    </div>
    ${showPreview ? `
    <div class="w-full lg:w-1/3 flex flex-col gap-unit-lg lg:sticky lg:top-[84px]">
      <section class="bg-surface-container-lowest rounded-xl p-unit-lg border border-border-subtle shadow-card flex flex-col items-center text-center">
        <div class="w-24 h-24 rounded-full bg-primary-soft flex items-center justify-center mb-6 relative group cursor-pointer">
          <span class="material-symbols-outlined text-primary-container text-4xl group-hover:scale-110 transition-transform" style="font-variation-settings:'FILL' 1">play_arrow</span>
          <div class="absolute inset-0 rounded-full border-2 border-primary-container opacity-20 animate-ping"></div>
        </div>
        <h3 class="text-headline-md font-headline-md text-primary mb-2">生成试听片段</h3>
        <p class="text-body-md font-body-md text-text-secondary mb-6">按当前音量与倍速叠加试听，播放中可随时调整</p>
        <button type="button" class="w-full bg-primary-container text-surface-container-lowest py-3 px-6 rounded-lg font-bold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"${ro} id="${p}-preview-btn">
          <span class="material-symbols-outlined">headphones</span>
          开始试听
        </button>
        <div class="preview-wave-stitch w-full h-12 mt-6 flex items-end gap-1 justify-center opacity-50 hidden" id="${p}-preview-wave">
          <span class="w-1 h-3 bg-primary-container rounded-full animate-pulse"></span>
          <span class="w-1 h-6 bg-primary-container rounded-full animate-pulse" style="animation-delay:0.1s"></span>
          <span class="w-1 h-4 bg-primary-container rounded-full animate-pulse" style="animation-delay:0.2s"></span>
          <span class="w-1 h-8 bg-primary-container rounded-full animate-pulse" style="animation-delay:0.3s"></span>
          <span class="w-1 h-5 bg-primary-container rounded-full animate-pulse" style="animation-delay:0.4s"></span>
        </div>
      </section>
    </div>` : ''}
  </div>
</div>`;
}

/** 混音配置 HTML（创建页 / 详情重新生成 · 可编辑） */
function mixConfigHTML(prefix, opts = {}) {
  const p = prefix;
  const ro = opts.readonly ? ' disabled' : '';
  const roClass = opts.readonly ? ' mix-config-readonly' : '';
  const stacked = opts.stacked === true;
  const showPreview = opts.showPreview !== false;
  const values = opts.values || {
    podcast_volume: 100,
    podcast_rate: 1.0,
    bgm_volume: 15,
    bgm_rate: 1.0,
    bgm_loop: true,
    fade_in: 3,
    fade_out: 5,
    fade_in_enabled: true,
    fade_out_enabled: true,
  };

  const fadeInHidden = values.fade_in_enabled ? '' : 'hidden';
  const fadeOutHidden = values.fade_out_enabled ? '' : 'hidden';

  if (stacked) {
    return mixConfigStackedHTML(p, opts, values, ro, roClass, showPreview, fadeInHidden, fadeOutHidden);
  }

  return `
<div class="mix-config${roClass}" data-prefix="${p}">
  <div class="mix-module mix-module-podcast">
    <div class="mix-module-head">${icon('mic', 'lg')}<span>播客</span></div>
    <div class="mix-field">
      <div class="mix-field-label"><span>音量</span><strong class="mix-val" data-for="${p}-pv">${values.podcast_volume}%</strong></div>
      <input type="range" id="${p}-pv" class="mix-range accent-range" min="0" max="100" value="${values.podcast_volume}"${ro}>
    </div>
    <div class="mix-field">
      <div class="mix-field-label"><span>倍速</span><strong class="mix-val" data-for="${p}-pr">${values.podcast_rate.toFixed(1)}x</strong></div>
      <input type="range" id="${p}-pr" class="mix-range" min="0.6" max="2" step="0.1" value="${values.podcast_rate}"${ro}>
    </div>
  </div>

  <div class="mix-module mix-module-bgm">
    <div class="mix-module-head">${icon('music', 'lg')}<span>BGM</span></div>
    <div class="mix-field">
      <div class="mix-field-label"><span>音量</span><strong class="mix-val" data-for="${p}-bv">${values.bgm_volume}%</strong></div>
      <input type="range" id="${p}-bv" class="mix-range accent-range" min="0" max="100" value="${values.bgm_volume}"${ro}>
    </div>
    <div class="mix-field">
      <div class="mix-field-label"><span>倍速</span><strong class="mix-val" data-for="${p}-br">${values.bgm_rate.toFixed(1)}x</strong></div>
      <input type="range" id="${p}-br" class="mix-range" min="0.6" max="2" step="0.1" value="${values.bgm_rate}"${ro}>
    </div>
    <div class="mix-check-row">
      <label class="mix-check"><input type="checkbox" id="${p}-fi-en" ${values.fade_in_enabled ? 'checked' : ''}${ro}> 淡入</label>
      <div class="mix-field mix-field-nested ${fadeInHidden}" id="${p}-fi-wrap">
        <div class="mix-field-label"><span>淡入时长</span><strong class="mix-val" data-for="${p}-fi">${values.fade_in} 秒</strong></div>
        <input type="range" id="${p}-fi" class="mix-range" min="1" max="10" value="${values.fade_in}"${ro}>
      </div>
    </div>
    <div class="mix-check-row">
      <label class="mix-check"><input type="checkbox" id="${p}-fo-en" ${values.fade_out_enabled ? 'checked' : ''}${ro}> 淡出</label>
      <div class="mix-field mix-field-nested ${fadeOutHidden}" id="${p}-fo-wrap">
        <div class="mix-field-label"><span>淡出时长</span><strong class="mix-val" data-for="${p}-fo">${values.fade_out} 秒</strong></div>
        <input type="range" id="${p}-fo" class="mix-range" min="1" max="10" value="${values.fade_out}"${ro}>
      </div>
    </div>
    <label class="mix-check mix-check-block"><input type="checkbox" id="${p}-loop" ${values.bgm_loop ? 'checked' : ''}${ro}> BGM 自动循环铺满播客</label>
  </div>

  ${showPreview ? `
  <div class="mix-module mix-module-preview">
    <div class="mix-module-head">${icon('play', 'lg')}<span>试听</span></div>
    <p class="mix-preview-hint">按当前音量与倍速叠加试听，播放中可随时调整</p>
    <button type="button" class="btn btn-accent"${ro} id="${p}-preview-btn">开始试听</button>
    <div class="preview-wave${opts.previewActive ? ' active' : ''}" id="${p}-preview-wave">
      <span></span><span></span><span></span><span></span><span></span>
      <em>试听模拟中…</em>
    </div>
  </div>` : ''}
</div>`;
}

function updateRangeFill(input) {
  const wrap = input.closest('.mix-range-wrap-stitch') || input.closest('.mix-range-wrap');
  if (!wrap) return;
  const fill = wrap.querySelector('.mix-range-fill-stitch') || wrap.querySelector('.mix-range-fill');
  if (!fill) return;
  const min = parseFloat(input.min) || 0;
  const max = parseFloat(input.max) || 100;
  const val = parseFloat(input.value);
  const pct = max === min ? 0 : ((val - min) / (max - min)) * 100;
  fill.style.width = `${pct}%`;
}

function initMixConfig(root) {
  const el = typeof root === 'string' ? document.querySelector(root) : root;
  if (!el) return;

  el.querySelectorAll('.mix-range').forEach((input) => {
    updateRangeFill(input);
    input.addEventListener('input', () => {
      updateRangeFill(input);
      const valEl = el.querySelector(`.mix-val[data-for="${input.id}"]`);
      if (!valEl) return;
      if (input.id.endsWith('-pr') || input.id.endsWith('-br')) {
        valEl.textContent = `${parseFloat(input.value).toFixed(1)}x`;
      } else if (input.id.endsWith('-fi') || input.id.endsWith('-fo')) {
        valEl.textContent = `${input.value}s`;
      } else {
        valEl.textContent = `${input.value}%`;
      }
    });
  });

  const bindFade = (checkId, wrapId) => {
    const check = el.querySelector(`#${checkId}`);
    const wrap = el.querySelector(`#${wrapId}`);
    if (!check || !wrap) return;
    const sync = () => wrap.classList.toggle('hidden', !check.checked);
    check.addEventListener('change', sync);
    sync();
  };

  const prefix = el.dataset.prefix;
  if (prefix) {
    bindFade(`${prefix}-fi-en`, `${prefix}-fi-wrap`);
    bindFade(`${prefix}-fo-en`, `${prefix}-fo-wrap`);
  }

  const previewBtn = el.querySelector('[id$="-preview-btn"]');
  const wave = el.querySelector('.preview-wave-stitch') || el.querySelector('.preview-wave');
  previewBtn?.addEventListener('click', () => {
    wave?.classList.remove('hidden');
    wave?.classList.add('active');
  });
}

function initBgmTabs(container) {
  const root = document.querySelector(container);
  if (!root) return;
  const panels = {
    upload: root.querySelector('#bgmUploadPanel'),
    url: root.querySelector('#bgmUrlPanel'),
    qishui: root.querySelector('#bgmQishuiPanel'),
  };
  root.querySelectorAll('[data-bgm-mode]').forEach((tab) => {
    tab.addEventListener('click', () => {
      root.querySelectorAll('[data-bgm-mode]').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      Object.values(panels).forEach((p) => p?.classList.add('hidden'));
      panels[tab.dataset.bgmMode]?.classList.remove('hidden');
    });
  });
}

function initHeader(activePage, loggedIn = true) {
  document.documentElement.style.setProperty('--accent', MOCK_PODCAST.cover_color);
  const header = document.querySelector('.app-header');
  if (!header || header.dataset.stitchInit) return;
  header.dataset.stitchInit = '1';

  const createCls = activePage === 'create'
    ? 'text-primary font-bold border-b-2 border-primary pb-1 h-full flex items-center text-label-sm font-label-sm px-3'
    : 'text-text-secondary hover:text-primary transition-colors text-label-sm font-label-sm px-3 py-1 rounded-md hover:bg-primary-soft';
  const libraryCls = activePage === 'library'
    ? 'text-primary font-bold border-b-2 border-primary pb-1 h-full flex items-center text-label-sm font-label-sm px-3'
    : 'text-text-secondary hover:text-primary transition-colors text-label-sm font-label-sm px-3 py-1 rounded-md hover:bg-primary-soft';

  const navHtml = loggedIn ? `
    <nav class="hidden md:flex items-center gap-6 h-full pt-1">
      <a href="index.html" class="${createCls}">创建</a>
      <a href="library.html" class="${libraryCls}">我的音频库</a>
    </nav>` : '';

  const rightHtml = loggedIn
    ? `<div class="relative" id="accountTrigger">
        <button type="button" class="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-primary-soft transition-colors">
          <span class="w-8 h-8 rounded-full bg-primary-container text-white text-sm font-bold flex items-center justify-center">${MOCK_USER.initial}</span>
          <span class="text-label-sm font-label-sm text-text-primary hidden sm:inline">${MOCK_USER.username}</span>
          <span class="material-symbols-outlined text-text-secondary text-[18px]">expand_more</span>
        </button>
        <div class="hidden absolute top-full right-0 mt-2 min-w-[168px] bg-white border border-border-subtle rounded-lg shadow-card py-1 z-50" id="accountDropdown">
          <a href="auth.html?tab=password" class="block px-4 py-2 text-sm text-text-primary hover:bg-primary-soft">修改密码</a>
          <button type="button" class="block w-full text-left px-4 py-2 text-sm text-error hover:bg-error-container/30" onclick="location.href='auth.html?tab=login'">退出登录</button>
        </div>
      </div>`
    : `<a href="auth.html?tab=login" class="text-label-sm font-label-sm text-text-secondary hover:text-primary px-3">登录</a>
       <a href="auth.html?tab=register" class="text-label-sm font-label-sm bg-primary-container text-white px-4 py-1.5 rounded-full hover:bg-primary-hover">注册</a>`;

  header.innerHTML = `
    <div class="flex justify-between items-center px-margin-edge w-full max-w-container-max mx-auto h-full">
      <a href="index.html" class="text-headline-md font-headline-md font-bold text-primary flex items-center gap-1 before:content-[''] before:w-2 before:h-2 before:bg-primary before:rounded-full">Podcast Flow</a>
      ${navHtml}
      <div class="flex items-center gap-4">${rightHtml}</div>
    </div>`;

  const trigger = document.getElementById('accountTrigger');
  const dropdown = document.getElementById('accountDropdown');
  if (trigger && dropdown) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', () => dropdown.classList.add('hidden'));
  }
}

function showGlobalPlayer(title, podcast, coverColor, coverInitial) {
  const player = document.getElementById('globalPlayer');
  if (!player) return;
  player.classList.add('visible');
  document.body.classList.add('has-player');
  player.querySelector('.player-title').textContent = title;
  player.querySelector('.player-podcast').textContent = podcast;
  player.querySelectorAll('.cover').forEach((c) => {
    c.textContent = coverInitial;
    c.style.background = coverColor;
  });
}

function initPwaBar() {
  if (window.innerWidth >= 1024) return;
  const bar = document.getElementById('pwaBar');
  if (!bar || sessionStorage.getItem('pwa_dismissed')) return;
  bar.classList.add('visible');
  bar.querySelector('.pwa-dismiss')?.addEventListener('click', () => {
    bar.classList.remove('visible');
    sessionStorage.setItem('pwa_dismissed', '1');
  });
}

window.getDefaultMixConfig = getDefaultMixConfig;
window.applyMixConfigToForm = applyMixConfigToForm;
window.mixConfigDisplayHTML = mixConfigDisplayHTML;
window.readMixConfigFromForm = readMixConfigFromForm;
window.MOCK_ASSETS = MOCK_ASSETS;
window.MOCK_PODCAST = MOCK_PODCAST;
window.mixConfigHTML = mixConfigHTML;
window.initMixConfig = initMixConfig;
window.initBgmTabs = initBgmTabs;
window.initHeader = initHeader;
window.showGlobalPlayer = showGlobalPlayer;
window.initPwaBar = initPwaBar;
window.updateRangeFill = updateRangeFill;
window.icon = icon;
