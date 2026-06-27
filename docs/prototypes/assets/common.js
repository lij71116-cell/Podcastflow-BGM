/* Podcast Flow 原型脚本 — 非生产前端源码 */

const MOCK_PODCAST = {
  id: 'podcast_001',
  source_type: 'xiaoyuzhou_episode',
  source_url: 'https://www.xiaoyuzhoufm.com/episode/696f522e109824f9e18a114e',
  episode_id: '696f522e109824f9e18a114e',
  title: '自我进化论｜No.78：情关过后，人生尽是自由',
  podcast_name: '自我进化论',
  cover_color: '#2D6A4F',
  cover_initial: '自',
  duration: 3180,
  duration_label: '53:00',
  description: '探讨情感关系中的成长与自我解放，如何在经历情关后找到内在自由。',
};

const MOCK_BGM = {
  id: 'bgm_001',
  title: 'Focus Rain',
  source_type: 'upload',
  duration: 180,
  duration_label: '03:00',
  format: 'mp3',
};

const MOCK_ASSETS = [
  {
    id: 'mixed_001',
    title: '自我进化论｜No.78 - Focus Mix',
    podcast_name: '自我进化论',
    bgm_name: 'Focus Rain',
    cover_color: '#2D6A4F',
    cover_initial: '自',
    duration_label: '53:00',
    status: 'completed',
    created_at: '2026-06-23 16:20',
    mix_config: { podcast_volume: 1.0, bgm_volume: 0.15, bgm_loop: true },
    source_url: MOCK_PODCAST.source_url,
  },
  {
    id: 'mixed_002',
    title: '文化有限｜Vol.312 - Night Mix',
    podcast_name: '文化有限',
    bgm_name: 'Night Ambient',
    cover_color: '#4A5568',
    cover_initial: '文',
    duration_label: '42:18',
    status: 'completed',
    created_at: '2026-06-22 21:05',
    mix_config: { podcast_volume: 1.0, bgm_volume: 0.12, bgm_loop: true },
    source_url: 'https://www.xiaoyuzhoufm.com/episode/example312',
  },
];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function setAccentColor(color) {
  document.documentElement.style.setProperty('--accent', color);
}

function initHeader(activePage) {
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.page === activePage);
  });
}

function initGlobalPlayer() {
  const player = document.getElementById('globalPlayer');
  if (!player) return;

  const playBtn = player.querySelector('.play-btn');
  const closeBtn = player.querySelector('.close-player');
  const progress = player.querySelector('.player-progress-input');
  let playing = false;
  let timer = null;
  let currentSec = 35;

  window.showGlobalPlayer = (asset) => {
    player.classList.add('visible');
    document.body.classList.add('has-player');
    player.querySelector('.player-title').textContent = asset.title;
    player.querySelector('.player-podcast').textContent = asset.podcast_name;
    const cover = player.querySelector('.cover-xs');
    cover.style.background = asset.cover_color;
    cover.textContent = asset.cover_initial;
    setAccentColor(asset.cover_color);
    currentSec = 35;
    updateTime();
  };

  window.hideGlobalPlayer = () => {
    player.classList.remove('visible');
    document.body.classList.remove('has-player');
    playing = false;
    playBtn.textContent = '▶';
    clearInterval(timer);
  };

  function updateTime() {
    const total = 3180;
    player.querySelector('.time-current').textContent = formatTime(currentSec);
    player.querySelector('.time-total').textContent = assetDurationLabel(total);
    if (progress) progress.value = (currentSec / total) * 100;
  }

  function assetDurationLabel(total) {
    return formatTime(total);
  }

  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? '⏸' : '▶';
    if (playing) {
      timer = setInterval(() => {
        currentSec += 1;
        if (currentSec >= 3180) {
          playing = false;
          playBtn.textContent = '▶';
          clearInterval(timer);
        }
        updateTime();
      }, 1000);
    } else {
      clearInterval(timer);
    }
  });

  closeBtn.addEventListener('click', () => window.hideGlobalPlayer());

  if (progress) {
    progress.addEventListener('input', (e) => {
      currentSec = Math.floor((e.target.value / 100) * 3180);
      updateTime();
    });
  }
}

function showModal(message, onConfirm) {
  const overlay = document.getElementById('confirmModal');
  if (!overlay) return onConfirm?.();
  overlay.querySelector('.modal-message').textContent = message;
  overlay.classList.add('visible');
  const confirmBtn = overlay.querySelector('.modal-confirm');
  const cancelBtn = overlay.querySelector('.modal-cancel');
  const cleanup = () => overlay.classList.remove('visible');
  confirmBtn.onclick = () => { cleanup(); onConfirm?.(); };
  cancelBtn.onclick = cleanup;
}

function getAssetById(id) {
  const stored = JSON.parse(sessionStorage.getItem('pf_assets') || 'null');
  const list = stored || MOCK_ASSETS;
  return list.find((a) => a.id === id) || MOCK_ASSETS[0];
}

function saveNewAsset(asset) {
  const stored = JSON.parse(sessionStorage.getItem('pf_assets') || 'null');
  const list = stored || [...MOCK_ASSETS];
  list.unshift(asset);
  sessionStorage.setItem('pf_assets', JSON.stringify(list));
}

document.addEventListener('DOMContentLoaded', () => {
  initGlobalPlayer();
});
