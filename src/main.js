import './style.css';
import { seedSubmissions } from './seedData.js';

// ==========================================
// 1. STATE & ROUTING MANAGEMENT
// ==========================================
let submissions = [];
let upvotedIds = [];
let currentlyGeneratedContent = null;
let currentSort = 'latest'; // 'latest' or 'voted'

// Local player references to manage single-instance playback
let activeAudioElement = null;
let activeAudioBtn = null;
let activeWaveform = null;
let audioUpdateInterval = null;

// ==========================================
// 2. DOM ELEMENT REFERENCES
// ==========================================
// Routing Elements
const homePage = document.getElementById('homePage');
const aiStudioPage = document.getElementById('aiStudioPage');
const faqPage = document.getElementById('faqPage');
const navHome = document.getElementById('navHome');
const navFaq = document.getElementById('navFaq');
const navStudio = document.getElementById('navStudio');

// Global Metrics
const homeTotalVotes = document.getElementById('homeTotalVotes');

// AI Studio Generators - Music Block
const studioMusicPrompt = document.getElementById('studioMusicPrompt');
const studioMusicGenre = document.getElementById('studioMusicGenre');
const btnGenerateMusicStudio = document.getElementById('btnGenerateMusicStudio');
const studioMusicOutputCard = document.getElementById('studioMusicOutputCard');

// AI Studio Generators - Video Block
const studioVideoPrompt = document.getElementById('studioVideoPrompt');
const studioVideoStyle = document.getElementById('studioVideoStyle');
const btnGenerateVideoStudio = document.getElementById('btnGenerateVideoStudio');
const studioVideoOutputCard = document.getElementById('studioVideoOutputCard');

// Submissions Boards
const homeSubmissionsGrid = document.getElementById('homeSubmissionsGrid');
const studioSubmissionsGrid = document.getElementById('studioSubmissionsGrid');

// Sorting
const homeSortLatestBtn = document.getElementById('homeSortLatestBtn');
const homeSortVotedBtn = document.getElementById('homeSortVotedBtn');
const studioSortLatestBtn = document.getElementById('studioSortLatestBtn');
const studioSortVotedBtn = document.getElementById('studioSortVotedBtn');

// Upload Modal
const uploadModal = document.getElementById('uploadModal');
const uploadModalClose = document.getElementById('uploadModalClose');
const uploadForm = document.getElementById('uploadForm');
const uploadTitle = document.getElementById('uploadTitle');
const uploadNickname = document.getElementById('uploadNickname');
const uploadWallet = document.getElementById('uploadWallet');
const btnCancelUpload = document.getElementById('btnCancelUpload');

// Detail Modal
const detailModal = document.getElementById('detailModal');
const detailModalClose = document.getElementById('detailModalClose');
const detailModalContent = document.getElementById('detailModalContent');

// ==========================================
// 3. INITIALIZATION & ROUTING ENGINE
// ==========================================
function init() {
  // Load submissions from LocalStorage or seed data
  const cachedSubmissions = localStorage.getItem('woori_submissions');
  if (cachedSubmissions) {
    submissions = JSON.parse(cachedSubmissions);
  } else {
    // Add seed data if empty
    submissions = [...seedSubmissions];
    localStorage.setItem('woori_submissions', JSON.stringify(submissions));
  }

  // Load upvoted tracking list
  const cachedVoted = localStorage.getItem('woori_voted');
  if (cachedVoted) {
    upvotedIds = JSON.parse(cachedVoted);
  }

  // Bind router hash changes
  window.addEventListener('hashchange', handleRoute);
  handleRoute(); // Execute routing for initial landing page load

  // Setup generic dynamic handlers
  setupGlobalEventListeners();

  // Draw submissions and counts
  updateGlobalMetrics();
}

// Router to handle Dynamic SPA transitions
function handleRoute() {
  const hash = window.location.hash || '#/';
  stopActivePlayback();

  // Reset page views & menu items active states
  homePage.classList.remove('active');
  aiStudioPage.classList.remove('active');
  faqPage.classList.remove('active');
  navHome.classList.remove('active');
  navFaq.classList.remove('active');
  navStudio.classList.remove('active');

  if (hash === '#/ai-studio') {
    aiStudioPage.classList.add('active');
    navStudio.classList.add('active');
    renderSubmissions('studio');
  } else if (hash === '#/faq') {
    faqPage.classList.add('active');
    navFaq.classList.add('active');
  } else {
    // Default or '#/' landing page
    homePage.classList.add('active');
    navHome.classList.add('active');
    renderSubmissions('home');
  }

  // Scroll to top upon transition
  window.scrollTo({ top: 0, behavior: 'instant' });
}

// ==========================================
// 4. EVENT LISTENERS
// ==========================================
function setupGlobalEventListeners() {
  // Studio AI Generation Handlers
  btnGenerateMusicStudio.addEventListener('click', () => handleStudioGeneration('music'));
  btnGenerateVideoStudio.addEventListener('click', () => handleStudioGeneration('video'));

  // Sort Triggers
  homeSortLatestBtn.addEventListener('click', () => switchSort('latest', 'home'));
  homeSortVotedBtn.addEventListener('click', () => switchSort('voted', 'home'));
  studioSortLatestBtn.addEventListener('click', () => switchSort('latest', 'studio'));
  studioSortVotedBtn.addEventListener('click', () => switchSort('voted', 'studio'));

  // Modal Closures
  uploadModalClose.addEventListener('click', closeUploadModal);
  btnCancelUpload.addEventListener('click', closeUploadModal);
  uploadForm.addEventListener('submit', handleUploadSubmit);

  detailModalClose.addEventListener('click', closeDetailModal);

  // Close modals on background clicking
  uploadModal.addEventListener('click', (e) => {
    if (e.target === uploadModal) closeUploadModal();
  });
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeDetailModal();
  });

  // ESC Key navigation
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeUploadModal();
      closeDetailModal();
    }
  });
}

// ==========================================
// 5. GENERATIVE API LOGIC (SIMULATED PIPELINE)
// ==========================================
const mockMusicData = {
  'K-pop': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    thumb: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    titleSuffix: 'Neon Idol Synthbeat'
  },
  'Ballad': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    thumb: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600&auto=format&fit=crop&q=80',
    titleSuffix: 'Autumn Sonata Plucks'
  },
  'Hip-hop': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    thumb: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80',
    titleSuffix: 'Hongdae Cypher Beat'
  },
  'OST': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    thumb: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    titleSuffix: 'Historical Dynasty Pluck'
  },
  'R&B': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    thumb: 'https://images.unsplash.com/photo-1487180142328-054b783fc471?w=600&auto=format&fit=crop&q=80',
    titleSuffix: 'Midnight Soul Chillout'
  }
};

const mockVideoData = {
  'Cinematic': {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumb: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
    titleSuffix: 'Seoul Skyline Glow'
  },
  'Anime': {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumb: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    titleSuffix: 'Blossom Petals Portal'
  },
  'Realistic': {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
    titleSuffix: 'Hanok Alleyway Drift'
  },
  'Retro Korean': {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    thumb: 'https://images.unsplash.com/photo-1542204172-e7052809f85e?w=600&auto=format&fit=crop&q=80',
    titleSuffix: 'Vintage Seoul VHS'
  }
};

function handleStudioGeneration(type) {
  stopActivePlayback();

  if (type === 'music') {
    const prompt = studioMusicPrompt.value.trim();
    if (!prompt) {
      alert('Please enter a description for your K-Culture music first.');
      return;
    }

    btnGenerateMusicStudio.disabled = true;
    studioMusicOutputCard.innerHTML = `
      <div class="loader-wrapper">
        <div class="spinner-neon"></div>
        <div class="loader-status">Composing your track...</div>
      </div>
    `;

    setTimeout(() => {
      btnGenerateMusicStudio.disabled = false;
      const genre = studioMusicGenre.value;
      const choice = mockMusicData[genre] || mockMusicData['K-pop'];

      currentlyGeneratedContent = {
        type: 'music',
        prompt: prompt,
        genreOrStyle: genre,
        mediaUrl: choice.url,
        thumbnail: choice.thumb,
        titleSuffix: choice.titleSuffix
      };

      renderMusicResultStudio();
    }, 2200);

  } else {
    const prompt = studioVideoPrompt.value.trim();
    if (!prompt) {
      alert('Please enter a description for your K-Culture video first.');
      return;
    }

    btnGenerateVideoStudio.disabled = true;
    studioVideoOutputCard.innerHTML = `
      <div class="loader-wrapper">
        <div class="spinner-neon"></div>
        <div class="loader-status">Rendering your video...</div>
      </div>
    `;

    setTimeout(() => {
      btnGenerateVideoStudio.disabled = false;
      const style = studioVideoStyle.value;
      const choice = mockVideoData[style] || mockVideoData['Cinematic'];

      currentlyGeneratedContent = {
        type: 'video',
        prompt: prompt,
        genreOrStyle: style,
        mediaUrl: choice.url,
        thumbnail: choice.thumb,
        titleSuffix: choice.titleSuffix
      };

      renderVideoResultStudio();
    }, 2200);
  }
}

// ==========================================
// 6. RENDER GENERATION OUTPUTS
// ==========================================
function renderMusicResultStudio() {
  studioMusicOutputCard.classList.add('active-result');
  studioMusicOutputCard.innerHTML = `
    <div class="custom-audio-player" style="animation: fadeIn 0.4s ease;">
      <div class="player-header">
        <img class="mini-thumb" src="${currentlyGeneratedContent.thumbnail}" alt="Audio Cover">
        <div class="track-meta">
          <div class="track-title-mini">${currentlyGeneratedContent.genreOrStyle} - ${currentlyGeneratedContent.titleSuffix}</div>
          <div class="track-creator-mini">Generative AI Music Track</div>
        </div>
      </div>
      
      <!-- Audio Waveform lines -->
      <div class="waveform-container" id="studioWaveformGen">
        ${Array.from({ length: 24 }, () => `<div class="wave-bar"></div>`).join('')}
      </div>

      <div class="player-controls">
        <button class="btn-play-pause" id="btnPlayPauseStudio">
          <svg viewBox="0 0 24 24" id="playIconStudio"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <div class="timeline-wrap">
          <span id="curTimeStudio">0:00</span>
          <input type="range" class="custom-range" id="timelineStudio" min="0" max="100" value="0">
          <span id="durTimeStudio">0:00</span>
        </div>
      </div>
    </div>
    
    <audio id="audioElementStudio" src="${currentlyGeneratedContent.mediaUrl}"></audio>

    <div class="generator-actions">
      <button class="btn-neon btn-mint" style="width: 100%;" id="btnUploadStudioTrigger">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
        <span>Submit to Competition</span>
      </button>
    </div>
  `;

  // Dynamic timelines bindings
  setupStudioAudioPlayer();

  document.getElementById('btnUploadStudioTrigger').addEventListener('click', openUploadModal);
}

function renderVideoResultStudio() {
  studioVideoOutputCard.classList.add('active-result');
  studioVideoOutputCard.innerHTML = `
    <div class="custom-video-player-wrap" style="animation: fadeIn 0.4s ease;">
      <video id="videoElementStudio" src="${currentlyGeneratedContent.mediaUrl}" loop controls playsinline autoplay></video>
    </div>
    <div class="generator-actions">
      <button class="btn-neon btn-mint" style="width: 100%;" id="btnUploadStudioTrigger">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
        <span>Submit to Competition</span>
      </button>
    </div>
  `;

  document.getElementById('btnUploadStudioTrigger').addEventListener('click', openUploadModal);
}

// ==========================================
// 7. STUDIO PLAYER TIMELINES CONTROLLER
// ==========================================
function setupStudioAudioPlayer() {
  const audio = document.getElementById('audioElementStudio');
  const btnPlay = document.getElementById('btnPlayPauseStudio');
  const playIcon = document.getElementById('playIconStudio');
  const timeline = document.getElementById('timelineStudio');
  const curTime = document.getElementById('curTimeStudio');
  const durTime = document.getElementById('durTimeStudio');
  const waveform = document.getElementById('studioWaveformGen');

  audio.addEventListener('loadedmetadata', () => {
    durTime.textContent = formatTime(audio.duration);
  });
  if (audio.readyState >= 1) {
    durTime.textContent = formatTime(audio.duration);
  }

  btnPlay.addEventListener('click', () => {
    toggleAudioPlay(audio, btnPlay, playIcon, waveform, timeline, curTime);
  });

  timeline.addEventListener('input', () => {
    const time = (timeline.value / 100) * audio.duration;
    audio.currentTime = time;
    curTime.textContent = formatTime(time);
  });

  audio.addEventListener('ended', stopActivePlayback);
}

function toggleAudioPlay(audio, btn, playIcon, waveform, timeline, curTime) {
  if (activeAudioElement && activeAudioElement !== audio) {
    stopActivePlayback();
  }

  activeAudioElement = audio;
  activeAudioBtn = btn;
  activeWaveform = waveform;

  if (audio.paused) {
    audio.play();
    btn.classList.add('playing');
    btn.style.background = '#6d28d9'; // Active purple play
    btn.style.boxShadow = 'var(--shadow-neon-purple)';
    playIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`; // Pause SVG
    waveform.classList.add('playing');
    animateWaveformRandomly(waveform, true);

    audioUpdateInterval = setInterval(() => {
      if (!audio.paused) {
        const pct = (audio.currentTime / audio.duration) * 100;
        timeline.value = pct || 0;
        curTime.textContent = formatTime(audio.currentTime);
      }
    }, 250);
  } else {
    audio.pause();
    btn.classList.remove('playing');
    btn.style.background = 'var(--color-mint)';
    btn.style.boxShadow = 'var(--shadow-neon-mint)';
    playIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`; // Play SVG
    waveform.classList.remove('playing');
    animateWaveformRandomly(waveform, false);
    clearInterval(audioUpdateInterval);
  }
}

function stopActivePlayback() {
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
  }
  if (activeAudioBtn) {
    activeAudioBtn.classList.remove('playing');
    activeAudioBtn.style.background = 'var(--color-mint)';
    activeAudioBtn.style.boxShadow = 'var(--shadow-neon-mint)';
    const svg = activeAudioBtn.querySelector('svg');
    if (svg) svg.innerHTML = `<path d="M8 5v14l11-7z"/>`;
  }
  if (activeWaveform) {
    activeWaveform.classList.remove('playing');
    animateWaveformRandomly(activeWaveform, false);
  }
  clearInterval(audioUpdateInterval);

  activeAudioElement = null;
  activeAudioBtn = null;
  activeWaveform = null;
}

function animateWaveformRandomly(waveform, isPlaying) {
  const bars = waveform.querySelectorAll('.wave-bar');
  bars.forEach((bar, idx) => {
    if (isPlaying) {
      const heightVal = Math.sin(idx * 0.5) * 20 + 40;
      bar.style.height = `${heightVal}%`;
      bar.style.animationDelay = `${idx * 0.04}s`;
    } else {
      bar.style.height = '15%';
      bar.style.animationDelay = '0s';
    }
  });
}

function formatTime(secs) {
  if (isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// ==========================================
// 8. COMMUNITY UPLOAD MODAL WORKFLOW
// ==========================================
function openUploadModal() {
  if (!currentlyGeneratedContent) return;

  uploadTitle.value = `${currentlyGeneratedContent.genreOrStyle} ${currentlyGeneratedContent.titleSuffix}`;
  uploadNickname.value = '';
  uploadWallet.value = '';

  uploadModal.classList.add('open');
}

function closeUploadModal() {
  uploadModal.classList.remove('open');
}

function handleUploadSubmit(e) {
  e.preventDefault();

  const title = uploadTitle.value.trim();
  const creator = uploadNickname.value.trim();
  const wallet = uploadWallet.value.trim() || 'No Wallet';

  if (!title || !creator) {
    alert('Please enter a valid title and creator nickname.');
    return;
  }

  // Pre-load new upload card
  const newSubmission = {
    id: `submission-${Date.now()}`,
    title: title,
    creator: creator,
    wallet: wallet.length > 10 ? `${wallet.substring(0, 5)}...${wallet.substring(wallet.length - 4)}` : wallet,
    type: currentlyGeneratedContent.type,
    genre: currentlyGeneratedContent.type === 'music' ? currentlyGeneratedContent.genreOrStyle : undefined,
    style: currentlyGeneratedContent.type === 'video' ? currentlyGeneratedContent.genreOrStyle : undefined,
    prompt: currentlyGeneratedContent.prompt,
    mediaUrl: currentlyGeneratedContent.mediaUrl,
    thumbnail: currentlyGeneratedContent.thumbnail,
    votes: 1, // Start with positive self-vote
    timestamp: Date.now()
  };

  submissions.unshift(newSubmission);
  upvotedIds.push(newSubmission.id);

  // Cache updates
  localStorage.setItem('woori_submissions', JSON.stringify(submissions));
  localStorage.setItem('woori_voted', JSON.stringify(upvotedIds));

  resetCreatorForms();
  closeUploadModal();
  updateGlobalMetrics();

  // Force render current active page submissions board
  const hash = window.location.hash || '#/';
  if (hash === '#/ai-studio') {
    renderSubmissions('studio');
    // Scroll smoothly to submissions board
    document.querySelector('#aiStudioPage .board-section').scrollIntoView({ behavior: 'smooth' });
  } else {
    renderSubmissions('home');
    document.querySelector('#homePage .board-section').scrollIntoView({ behavior: 'smooth' });
  }
}

function resetCreatorForms() {
  currentlyGeneratedContent = null;
  stopActivePlayback();

  // Reset Music panel
  studioMusicOutputCard.classList.remove('active-result');
  studioMusicOutputCard.innerHTML = `
    <div class="empty-state-visual">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      <p>Configure parameters and click generate to synthesize your K-Culture track.</p>
    </div>
  `;
  studioMusicPrompt.value = '';

  // Reset Video panel
  studioVideoOutputCard.classList.remove('active-result');
  studioVideoOutputCard.innerHTML = `
    <div class="empty-state-visual">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><path d="M12 18V6M6 12h12"/></svg>
      <p>Configure parameters and click generate to render your K-Culture video.</p>
    </div>
  `;
  studioVideoPrompt.value = '';
}

// ==========================================
// 9. SUBMISSIONS Leaderboard DISPLAY CONTROLLER
// ==========================================
function switchSort(sort, view) {
  if (currentSort === sort) return;
  currentSort = sort;

  if (view === 'home') {
    if (sort === 'latest') {
      homeSortLatestBtn.classList.add('active');
      homeSortVotedBtn.classList.remove('active');
    } else {
      homeSortLatestBtn.classList.remove('active');
      homeSortVotedBtn.classList.add('active');
    }
  } else {
    if (sort === 'latest') {
      studioSortLatestBtn.classList.add('active');
      studioSortVotedBtn.classList.remove('active');
    } else {
      studioSortLatestBtn.classList.remove('active');
      studioSortVotedBtn.classList.add('active');
    }
  }

  renderSubmissions(view);
}

function renderSubmissions(view = 'home') {
  const gridElement = view === 'home' ? homeSubmissionsGrid : studioSubmissionsGrid;
  if (!gridElement) return;

  // Clone and sort submissions
  const displayItems = [...submissions];
  if (currentSort === 'latest') {
    displayItems.sort((a, b) => b.timestamp - a.timestamp);
  } else {
    displayItems.sort((a, b) => b.votes - a.votes || b.timestamp - a.timestamp);
  }

  if (displayItems.length === 0) {
    gridElement.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted);">
        <p>No submissions uploaded yet. Be the first to create and submit!</p>
      </div>
    `;
    return;
  }

  gridElement.innerHTML = displayItems.map(item => {
    const isVoted = upvotedIds.includes(item.id);
    const badgeText = item.type === 'music' ? `🎵 ${item.genre}` : `🎬 ${item.style}`;
    const badgeClass = item.type === 'music' ? 'badge-music' : 'badge-video';
    
    return `
      <div class="submission-card" data-id="${item.id}">
        <div class="card-media-preview">
          <span class="card-badge ${badgeClass}">${badgeText}</span>
          <img class="card-thumbnail" src="${item.thumbnail}" alt="${item.title}">
          <div class="card-play-overlay">
            <button class="btn-play-circle">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="card-title">${item.title}</div>
          <div class="card-creator">by ${item.creator}</div>
          <div class="card-footer">
            <div class="vote-tally-wrap">
              <span class="vote-number" id="voteCount-${view}-${item.id}">${item.votes}</span>
              <span class="vote-lbl">votes</span>
            </div>
            
            <!-- Heart icon upvote button -->
            <button class="btn-vote ${isVoted ? 'voted' : ''}" data-id="${item.id}">
              <svg class="heart-icon" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span>${isVoted ? 'Liked' : 'Like'}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card click handlers
  const cards = gridElement.querySelectorAll('.submission-card');
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-vote')) return;
      const id = card.getAttribute('data-id');
      openDetailModal(id);
    });
  });

  // Attach upvote toggle clicks
  const voteBtns = gridElement.querySelectorAll('.btn-vote');
  voteBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      handleVoteToggle(id, btn, view);
    });
  });
}

function handleVoteToggle(id, btnElement, view) {
  const item = submissions.find(s => s.id === id);
  if (!item) return;

  const idx = upvotedIds.indexOf(id);
  const isLiked = idx === -1;

  if (isLiked) {
    upvotedIds.push(id);
    item.votes++;
  } else {
    upvotedIds.splice(idx, 1);
    item.votes--;
  }

  // Persist State
  localStorage.setItem('woori_submissions', JSON.stringify(submissions));
  localStorage.setItem('woori_voted', JSON.stringify(upvotedIds));

  // Sync vote tallies in both potential grid elements
  const homeCountText = document.getElementById(`voteCount-home-${id}`);
  const studioCountText = document.getElementById(`voteCount-studio-${id}`);
  if (homeCountText) homeCountText.textContent = item.votes;
  if (studioCountText) studioCountText.textContent = item.votes;

  // Toggle CSS active states on the button element clicked
  if (btnElement) {
    if (isLiked) {
      btnElement.classList.add('voted');
      btnElement.querySelector('span').textContent = 'Liked';
    } else {
      btnElement.classList.remove('voted');
      btnElement.querySelector('span').textContent = 'Like';
    }
  }

  // Update Detail modal overlays if open
  const modalVoteBtn = document.getElementById(`modalVoteBtn-${id}`);
  const modalVoteCount = document.getElementById(`modalVoteCount-${id}`);
  if (modalVoteBtn && modalVoteCount) {
    modalVoteCount.textContent = item.votes;
    if (isLiked) {
      modalVoteBtn.classList.add('voted');
      modalVoteBtn.querySelector('span').textContent = 'Liked';
    } else {
      modalVoteBtn.classList.remove('voted');
      modalVoteBtn.querySelector('span').textContent = 'Like';
    }
  }

  updateGlobalMetrics();
}

function updateGlobalMetrics() {
  const total = submissions.reduce((acc, curr) => acc + curr.votes, 0);
  if (homeTotalVotes) homeTotalVotes.textContent = total.toLocaleString();
}

// ==========================================
// 10. DETAIL OVERLAY & PLAYBACK INSPECTION
// ==========================================
function openDetailModal(id) {
  const item = submissions.find(s => s.id === id);
  if (!item) return;

  stopActivePlayback();
  const isVoted = upvotedIds.includes(item.id);
  const badgeText = item.type === 'music' ? `🎵 ${item.genre}` : `🎬 ${item.style}`;

  let mediaMarkup = '';
  if (item.type === 'music') {
    mediaMarkup = `
      <div class="custom-audio-player">
        <div class="player-header">
          <img class="mini-thumb" src="${item.thumbnail}" alt="Audio Cover">
          <div class="track-meta">
            <div class="track-title-mini">${item.title}</div>
            <div class="track-creator-mini">by ${item.creator}</div>
          </div>
        </div>
        
        <!-- Waveform lines visualizer -->
        <div class="waveform-container" id="modalWaveform">
          ${Array.from({ length: 24 }, () => `<div class="wave-bar"></div>`).join('')}
        </div>

        <div class="player-controls">
          <button class="btn-play-pause" id="modalPlayBtn">
            <svg viewBox="0 0 24 24" id="modalPlayIcon"><path d="M8 5v14l11-7z"/></svg>
          </button>
          <div class="timeline-wrap">
            <span id="currentTimeModal">0:00</span>
            <input type="range" class="custom-range" id="timelineModal" min="0" max="100" value="0">
            <span id="durationTimeModal">0:00</span>
          </div>
        </div>
      </div>
      <audio id="audioElementModal" src="${item.mediaUrl}"></audio>
    `;
  } else {
    mediaMarkup = `
      <div class="custom-video-player-wrap">
        <video id="videoElementModal" src="${item.mediaUrl}" loop controls playsinline autoplay></video>
      </div>
    `;
  }

  detailModalContent.innerHTML = `
    <div class="detail-media-wrap">
      ${mediaMarkup}
    </div>
    <div class="detail-content-wrap">
      <div class="detail-tag-row">
        <span class="detail-meta-pill" style="color: var(--color-mint); border-color: rgba(0, 245, 196, 0.25); background: rgba(0, 245, 196, 0.05);">${badgeText}</span>
        <span class="detail-meta-pill">Submission ID: ${item.id.substring(11)}</span>
      </div>
      
      <h2 class="detail-title">${item.title}</h2>
      <div class="detail-creator">Created by <strong>${item.creator}</strong></div>
      
      <div class="detail-wallet-row">
        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.9 6 10 6.9 10 8V16C10 17.1 10.9 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z"/></svg>
        <span>Airdrop Wallet Address: ${item.wallet}</span>
      </div>
      
      <div class="detail-prompt-box">
        <span class="prompt-tag">AI Studio Prompt Details</span>
        ${item.prompt}
      </div>
      
      <div class="detail-footer-row">
        <div class="vote-tally-wrap">
          <span class="vote-number" style="font-size: 20px;" id="modalVoteCount-${item.id}">${item.votes}</span>
          <span class="vote-lbl" style="font-size: 10px;">total votes</span>
        </div>
        <button class="btn-vote ${isVoted ? 'voted' : ''}" style="padding: 10px 20px; font-size: 13px;" id="modalVoteBtn-${item.id}">
          <svg class="heart-icon" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span>${isVoted ? 'Liked' : 'Like Work'}</span>
        </button>
      </div>
    </div>
  `;

  detailModal.classList.add('open');

  // Modal heart upvote trigger
  const voteBtn = document.getElementById(`modalVoteBtn-${item.id}`);
  voteBtn.addEventListener('click', () => {
    // Detect active hash route to choose correct board grid updating
    const hash = window.location.hash || '#/';
    const activeView = hash === '#/ai-studio' ? 'studio' : 'home';
    handleVoteToggle(item.id, voteBtn, activeView);
    renderSubmissions(activeView); // Redraw list
  });

  // Modal Audio timelines
  if (item.type === 'music') {
    const audio = document.getElementById('audioElementModal');
    const playBtn = document.getElementById('modalPlayBtn');
    const playIcon = document.getElementById('modalPlayIcon');
    const timeline = document.getElementById('timelineModal');
    const curTime = document.getElementById('currentTimeModal');
    const durTime = document.getElementById('durationTimeModal');
    const waveform = document.getElementById('modalWaveform');

    audio.addEventListener('loadedmetadata', () => {
      durTime.textContent = formatTime(audio.duration);
    });
    if (audio.readyState >= 1) {
      durTime.textContent = formatTime(audio.duration);
    }

    playBtn.addEventListener('click', () => {
      toggleAudioPlay(audio, playBtn, playIcon, waveform, timeline, curTime);
    });

    timeline.addEventListener('input', () => {
      const time = (timeline.value / 100) * audio.duration;
      audio.currentTime = time;
      curTime.textContent = formatTime(time);
    });

    audio.addEventListener('ended', stopActivePlayback);
  }
}

function closeDetailModal() {
  detailModal.classList.remove('open');
  stopActivePlayback();
}

// ==========================================
// 11. BOOTSTRAPPER
// ==========================================
window.addEventListener('DOMContentLoaded', init);
