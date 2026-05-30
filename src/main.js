import './style.css';
import { seedSubmissions } from './seedData.js';

// ==========================================
// 1. STATE MANAGEMENT
// ==========================================
let submissions = [];
let upvotedIds = [];
let currentlyGeneratedContent = null;
let activeTab = 'music'; // 'music' or 'video'
let currentSort = 'latest'; // 'latest' or 'voted'

// Local player references to manage single-instance playback
let activeAudioElement = null;
let activeAudioBtn = null;
let activeWaveform = null;
let audioUpdateInterval = null;

// ==========================================
// 2. DOM ELEMENT REFERENCES
// ==========================================
const heroTotalVotes = document.getElementById('heroTotalVotes');

// Tab toggles
const tabBtnMusic = document.getElementById('tabBtnMusic');
const tabBtnVideo = document.getElementById('tabBtnVideo');
const musicTab = document.getElementById('music-tab');
const videoTab = document.getElementById('video-tab');

// Generator forms
const musicPrompt = document.getElementById('musicPrompt');
const musicGenre = document.getElementById('musicGenre');
const btnGenerateMusic = document.getElementById('btnGenerateMusic');
const musicOutputCard = document.getElementById('musicOutputCard');
const musicEmptyState = document.getElementById('musicEmptyState');

const videoPrompt = document.getElementById('videoPrompt');
const videoStyle = document.getElementById('videoStyle');
const btnGenerateVideo = document.getElementById('btnGenerateVideo');
const videoOutputCard = document.getElementById('videoOutputCard');
const videoEmptyState = document.getElementById('videoEmptyState');

// Board elements
const submissionsGrid = document.getElementById('submissionsGrid');
const sortLatestBtn = document.getElementById('sortLatestBtn');
const sortVotedBtn = document.getElementById('sortVotedBtn');

// Upload Modal elements
const uploadModal = document.getElementById('uploadModal');
const uploadModalClose = document.getElementById('uploadModalClose');
const uploadForm = document.getElementById('uploadForm');
const uploadTitle = document.getElementById('uploadTitle');
const uploadNickname = document.getElementById('uploadNickname');
const uploadWallet = document.getElementById('uploadWallet');
const btnCancelUpload = document.getElementById('btnCancelUpload');

// Detail Modal elements
const detailModal = document.getElementById('detailModal');
const detailModalClose = document.getElementById('detailModalClose');
const detailModalContent = document.getElementById('detailModalContent');

// ==========================================
// 3. INITIALIZATION
// ==========================================
function init() {
  // Load submissions from LocalStorage or seed data
  const cachedSubmissions = localStorage.getItem('woori_submissions');
  if (cachedSubmissions) {
    submissions = JSON.parse(cachedSubmissions);
  } else {
    submissions = [...seedSubmissions];
    localStorage.setItem('woori_submissions', JSON.stringify(submissions));
  }

  // Load upvoted tracking
  const cachedVoted = localStorage.getItem('woori_voted');
  if (cachedVoted) {
    upvotedIds = JSON.parse(cachedVoted);
  }

  // Attach Event Listeners
  setupEventListeners();

  // Render submissions board and update metrics
  renderSubmissions();
  updateGlobalMetrics();
}

// ==========================================
// 4. EVENT LISTENERS SETUP
// ==========================================
function setupEventListeners() {
  // Tab Swapping
  tabBtnMusic.addEventListener('click', () => switchTab('music'));
  tabBtnVideo.addEventListener('click', () => switchTab('video'));

  // Music & Video Generation Triggers
  btnGenerateMusic.addEventListener('click', handleMusicGeneration);
  btnGenerateVideo.addEventListener('click', handleVideoGeneration);

  // Board Sorting
  sortLatestBtn.addEventListener('click', () => switchSort('latest'));
  sortVotedBtn.addEventListener('click', () => switchSort('voted'));

  // Upload Modal triggers & handlers
  uploadModalClose.addEventListener('click', closeUploadModal);
  btnCancelUpload.addEventListener('click', closeUploadModal);
  uploadForm.addEventListener('submit', handleUploadSubmit);

  // Close modals on background clicking
  uploadModal.addEventListener('click', (e) => {
    if (e.target === uploadModal) closeUploadModal();
  });
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeDetailModal();
  });
  detailModalClose.addEventListener('click', closeDetailModal);

  // Keyboard navigation (ESC key)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeUploadModal();
      closeDetailModal();
    }
  });
}

// ==========================================
// 5. UX FLOWS: TAB SWAPPING
// ==========================================
function switchTab(tab) {
  if (activeTab === tab) return;
  activeTab = tab;
  stopActivePlayback();

  if (tab === 'music') {
    tabBtnMusic.classList.add('active');
    tabBtnVideo.classList.remove('active');
    musicTab.classList.add('active');
    videoTab.classList.remove('active');
  } else {
    tabBtnMusic.classList.remove('active');
    tabBtnVideo.classList.add('active');
    musicTab.classList.remove('active');
    videoTab.classList.add('active');
  }
}

// ==========================================
// 6. GENERATOR LOGIC (SIMULATED API)
// ==========================================
const mockMusicData = {
  'K-pop': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    thumb: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    titleSuffix: 'Neon Cyberbeat'
  },
  'Ballad': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    thumb: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600&auto=format&fit=crop&q=80',
    titleSuffix: 'Twilight Tears'
  },
  'Hip-hop': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    thumb: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80',
    titleSuffix: 'Seoul Street Rhythm'
  },
  'OST': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    thumb: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    titleSuffix: 'Dynasty Legend'
  }
};

const mockVideoData = {
  'Cinematic': {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumb: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
    titleSuffix: 'Namsan Skylines'
  },
  'Anime': {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumb: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    titleSuffix: 'Cherry Blossom Ripple'
  },
  'Realistic': {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
    titleSuffix: 'Jeju Coastlines'
  }
};

function handleMusicGeneration() {
  const prompt = musicPrompt.value.trim();
  if (!prompt) {
    alert('Please enter a description for your K-Culture music first.');
    return;
  }

  stopActivePlayback();
  btnGenerateMusic.disabled = true;
  musicEmptyState.style.display = 'none';

  // Render Loader
  musicOutputCard.innerHTML = `
    <div class="loader-wrapper">
      <div class="spinner-neon"></div>
      <div class="loader-status" id="musicLoaderStatus">Step 1/3: Analyzing prompt and rhythmic structures...</div>
    </div>
  `;

  // Start Multi-Stage status animations
  const statusTexts = [
    'Step 1/3: Analyzing prompt and K-Culture motifs...',
    'Step 2/3: Synthesizing Gayageum melody layers and bass stems...',
    'Step 3/3: Conducting final audio mastering compression...'
  ];
  let currentStep = 0;

  const interval = setInterval(() => {
    currentStep++;
    const statusElem = document.getElementById('musicLoaderStatus');
    if (statusElem && currentStep < statusTexts.length) {
      statusElem.textContent = statusTexts[currentStep];
    }
  }, 800);

  // Complete Generation after 2.5s
  setTimeout(() => {
    clearInterval(interval);
    btnGenerateMusic.disabled = false;

    const genre = musicGenre.value;
    const choice = mockMusicData[genre] || mockMusicData['K-pop'];
    
    currentlyGeneratedContent = {
      type: 'music',
      prompt: prompt,
      genreOrStyle: genre,
      mediaUrl: choice.url,
      thumbnail: choice.thumb,
      titleSuffix: choice.titleSuffix
    };

    renderMusicResult(currentlyGeneratedContent);
  }, 2500);
}

function handleVideoGeneration() {
  const prompt = videoPrompt.value.trim();
  if (!prompt) {
    alert('Please enter a description for your K-Culture video first.');
    return;
  }

  stopActivePlayback();
  btnGenerateVideo.disabled = true;
  videoEmptyState.style.display = 'none';

  // Render Loader
  videoOutputCard.innerHTML = `
    <div class="loader-wrapper">
      <div class="spinner-neon"></div>
      <div class="loader-status" id="videoLoaderStatus">Step 1/3: Analyzing scene layout and camera prompts...</div>
    </div>
  `;

  const statusTexts = [
    'Step 1/3: Analyzing style aesthetics and scene prompts...',
    'Step 2/3: Rendering realistic keyframes at 60fps...',
    'Step 3/3: Running neural network post-processing filters...'
  ];
  let currentStep = 0;

  const interval = setInterval(() => {
    currentStep++;
    const statusElem = document.getElementById('videoLoaderStatus');
    if (statusElem && currentStep < statusTexts.length) {
      statusElem.textContent = statusTexts[currentStep];
    }
  }, 800);

  setTimeout(() => {
    clearInterval(interval);
    btnGenerateVideo.disabled = false;

    const style = videoStyle.value;
    const choice = mockVideoData[style] || mockVideoData['Cinematic'];

    currentlyGeneratedContent = {
      type: 'video',
      prompt: prompt,
      genreOrStyle: style,
      mediaUrl: choice.url,
      thumbnail: choice.thumb,
      titleSuffix: choice.titleSuffix
    };

    renderVideoResult(currentlyGeneratedContent);
  }, 2500);
}

// ==========================================
// 7. GENERATOR OUTPUT RENDERING
// ==========================================
function renderMusicResult(content) {
  musicOutputCard.classList.add('active-result');
  musicOutputCard.innerHTML = `
    <div class="custom-audio-player" style="animation: fadeIn 0.4s ease;">
      <div class="player-header">
        <img class="mini-thumb" src="${content.thumbnail}" alt="Audio Cover">
        <div class="track-meta">
          <div class="track-title-mini">${content.genreOrStyle} - ${content.titleSuffix}</div>
          <div class="track-creator-mini">AI generated track</div>
        </div>
      </div>
      
      <!-- Audio Waveform -->
      <div class="waveform-container" id="generatorWaveform">
        ${Array.from({ length: 32 }, () => `<div class="wave-bar"></div>`).join('')}
      </div>

      <div class="player-controls">
        <button class="btn-play-pause" id="btnPlayPauseGenerator">
          <svg viewBox="0 0 24 24" id="playIconGenerator"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <div class="timeline-wrap">
          <span id="currentTimeGen">0:00</span>
          <input type="range" class="custom-range" id="timelineGen" min="0" max="100" value="0">
          <span id="durationTimeGen">0:00</span>
        </div>
      </div>
    </div>
    
    <audio id="audioElementGenerator" src="${content.mediaUrl}"></audio>

    <div class="generator-actions">
      <button class="btn-neon btn-mint" style="width: 100%;" id="btnUploadTrigger">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
        <span>Upload to Competition</span>
      </button>
    </div>
  `;

  // Attach player controls logic
  setupGeneratorAudioPlayer();

  // Attach upload modal trigger
  document.getElementById('btnUploadTrigger').addEventListener('click', openUploadModal);
}

function renderVideoResult(content) {
  videoOutputCard.classList.add('active-result');
  videoOutputCard.innerHTML = `
    <div class="custom-video-player-wrap" style="animation: fadeIn 0.4s ease;">
      <video id="videoElementGenerator" src="${content.mediaUrl}" loop controls playsinline></video>
    </div>
    <div class="generator-actions">
      <button class="btn-neon btn-mint" style="width: 100%;" id="btnUploadTrigger">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
        <span>Upload to Competition</span>
      </button>
    </div>
  `;

  document.getElementById('btnUploadTrigger').addEventListener('click', openUploadModal);
}

// ==========================================
// 8. AUDIO PLAYER CONTROLS IMPLEMENTATION
// ==========================================
function setupGeneratorAudioPlayer() {
  const audio = document.getElementById('audioElementGenerator');
  const btnPlay = document.getElementById('btnPlayPauseGenerator');
  const playIcon = document.getElementById('playIconGenerator');
  const timeline = document.getElementById('timelineGen');
  const curTimeLbl = document.getElementById('currentTimeGen');
  const durTimeLbl = document.getElementById('durationTimeGen');
  const waveform = document.getElementById('generatorWaveform');

  // Load duration when metadata is ready
  audio.addEventListener('loadedmetadata', () => {
    durTimeLbl.textContent = formatTime(audio.duration);
  });

  // Backup in case metadata was loaded before listener attached
  if (audio.readyState >= 1) {
    durTimeLbl.textContent = formatTime(audio.duration);
  }

  btnPlay.addEventListener('click', () => {
    toggleAudioPlay(audio, btnPlay, playIcon, waveform, timeline, curTimeLbl);
  });

  timeline.addEventListener('input', () => {
    const time = (timeline.value / 100) * audio.duration;
    audio.currentTime = time;
    curTimeLbl.textContent = formatTime(time);
  });

  // Track finished playing
  audio.addEventListener('ended', () => {
    stopActivePlayback();
  });
}

function toggleAudioPlay(audio, btn, playIcon, waveform, timeline, curTimeLbl) {
  if (activeAudioElement && activeAudioElement !== audio) {
    stopActivePlayback();
  }

  activeAudioElement = audio;
  activeAudioBtn = btn;
  activeWaveform = waveform;

  if (audio.paused) {
    audio.play();
    btn.classList.add('playing');
    btn.style.background = '#ff007f'; // Glow pink when playing
    btn.style.boxShadow = '0 0 15px rgba(255, 0, 127, 0.6)';
    playIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`; // Pause SVG
    waveform.classList.add('playing');
    animateWaveformRandomly(waveform, true);

    audioUpdateInterval = setInterval(() => {
      if (!audio.paused) {
        const pct = (audio.currentTime / audio.duration) * 100;
        timeline.value = pct || 0;
        curTimeLbl.textContent = formatTime(audio.currentTime);
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
    if (svg) {
      svg.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    }
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

// Waveform visual animation simulation
function animateWaveformRandomly(waveformElement, isPlaying) {
  const bars = waveformElement.querySelectorAll('.wave-bar');
  bars.forEach((bar, idx) => {
    if (isPlaying) {
      // Custom dynamic baseline to make it look like actual music frequencies
      const multiplier = Math.sin(idx * 0.4) * 20 + 35;
      const pulseDelay = idx * 0.03;
      bar.style.height = `${multiplier}%`;
      bar.style.animationDelay = `${pulseDelay}s`;
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
// 9. UPLOAD MODAL WORKFLOW
// ==========================================
function openUploadModal() {
  if (!currentlyGeneratedContent) return;
  
  // Set default suggested title based on selection
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
    alert('Please fill in the title and creator nickname.');
    return;
  }

  // Create new Submission Object
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
    votes: 1, // Start with their own positive vote!
    timestamp: Date.now()
  };

  // Prepend new submission
  submissions.unshift(newSubmission);
  
  // Automatically mark as upvoted
  upvotedIds.push(newSubmission.id);
  
  // Save states
  localStorage.setItem('woori_submissions', JSON.stringify(submissions));
  localStorage.setItem('woori_voted', JSON.stringify(upvotedIds));

  // Reset generator card visual states
  resetGeneratorOutput();

  closeUploadModal();
  renderSubmissions();
  updateGlobalMetrics();

  // Scroll smoothly to submissions board
  document.getElementById('submissionsBoard').scrollIntoView({ behavior: 'smooth' });
}

function resetGeneratorOutput() {
  currentlyGeneratedContent = null;
  stopActivePlayback();

  // Reset Music tab output
  musicOutputCard.classList.remove('active-result');
  musicOutputCard.innerHTML = `
    <div class="empty-state-visual" id="musicEmptyState">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
      <p>Configure parameters and click generate to synthesize your K-Culture track.</p>
    </div>
  `;
  musicPrompt.value = '';

  // Reset Video tab output
  videoOutputCard.classList.remove('active-result');
  videoOutputCard.innerHTML = `
    <div class="empty-state-visual" id="videoEmptyState">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>
      <p>Configure parameters and click generate to render your K-Culture video.</p>
    </div>
  `;
  videoPrompt.value = '';
}

// ==========================================
// 10. SUBMISSIONS BOARD CONTROLLER
// ==========================================
function switchSort(sort) {
  if (currentSort === sort) return;
  currentSort = sort;

  if (sort === 'latest') {
    sortLatestBtn.classList.add('active');
    sortVotedBtn.classList.remove('active');
  } else {
    sortLatestBtn.classList.remove('active');
    sortVotedBtn.classList.add('active');
  }

  renderSubmissions();
}

function renderSubmissions() {
  // Sort entries clone
  const displayItems = [...submissions];

  if (currentSort === 'latest') {
    displayItems.sort((a, b) => b.timestamp - a.timestamp);
  } else {
    displayItems.sort((a, b) => b.votes - a.votes || b.timestamp - a.timestamp);
  }

  if (displayItems.length === 0) {
    submissionsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted);">
        <p>No submissions uploaded yet. Be the first to create and submit!</p>
      </div>
    `;
    return;
  }

  submissionsGrid.innerHTML = displayItems.map(item => {
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
              <span class="vote-number" id="voteCount-${item.id}">${item.votes}</span>
              <span class="vote-lbl">votes</span>
            </div>
            <button class="btn-vote ${isVoted ? 'voted' : ''}" data-id="${item.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              <span>${isVoted ? 'Voted' : 'Vote'}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card event listeners
  const cards = submissionsGrid.querySelectorAll('.submission-card');
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      // Exclude clicks directed at vote buttons
      if (e.target.closest('.btn-vote')) return;
      
      const id = card.getAttribute('data-id');
      openDetailModal(id);
    });
  });

  // Attach vote button clicks
  const voteBtns = submissionsGrid.querySelectorAll('.btn-vote');
  voteBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Avoid card click opening
      const id = btn.getAttribute('data-id');
      handleVoteToggle(id, btn);
    });
  });
}

function handleVoteToggle(id, btnElement = null) {
  const item = submissions.find(s => s.id === id);
  if (!item) return;

  const idx = upvotedIds.indexOf(id);
  const isAdding = idx === -1;

  if (isAdding) {
    upvotedIds.push(id);
    item.votes++;
  } else {
    upvotedIds.splice(idx, 1);
    item.votes--;
  }

  // Save changes
  localStorage.setItem('woori_submissions', JSON.stringify(submissions));
  localStorage.setItem('woori_voted', JSON.stringify(upvotedIds));

  // Sync details in grid
  const voteNumText = document.getElementById(`voteCount-${id}`);
  if (voteNumText) voteNumText.textContent = item.votes;

  // Toggle active styling
  if (btnElement) {
    if (isAdding) {
      btnElement.classList.add('voted');
      btnElement.querySelector('span').textContent = 'Voted';
    } else {
      btnElement.classList.remove('voted');
      btnElement.querySelector('span').textContent = 'Vote';
    }
  }

  // Update Detail modal vote button if it happens to be open
  const modalVoteBtn = document.getElementById(`modalVoteBtn-${id}`);
  const modalVoteCount = document.getElementById(`modalVoteCount-${id}`);
  if (modalVoteBtn && modalVoteCount) {
    modalVoteCount.textContent = item.votes;
    if (isAdding) {
      modalVoteBtn.classList.add('voted');
      modalVoteBtn.querySelector('span').textContent = 'Voted';
    } else {
      modalVoteBtn.classList.remove('voted');
      modalVoteBtn.querySelector('span').textContent = 'Vote';
    }
  }

  updateGlobalMetrics();
}

function updateGlobalMetrics() {
  const total = submissions.reduce((acc, curr) => acc + curr.votes, 0);
  heroTotalVotes.textContent = total.toLocaleString();
}

// ==========================================
// 11. DETAIL WORK INSPECTOR (PLAYBACK & DETAIL MODAL)
// ==========================================
function openDetailModal(id) {
  const item = submissions.find(s => s.id === id);
  if (!item) return;

  stopActivePlayback();
  const isVoted = upvotedIds.includes(item.id);
  const badgeText = item.type === 'music' ? `🎵 ${item.genre}` : `🎬 ${item.style}`;

  // Populate dynamic elements
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
        
        <!-- Waveform visualizer -->
        <div class="waveform-container" id="modalWaveform">
          ${Array.from({ length: 32 }, () => `<div class="wave-bar"></div>`).join('')}
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
        <span class="detail-meta-pill" style="color: var(--color-mint); border-color: rgba(0, 245, 212, 0.25); background: rgba(0, 245, 212, 0.05);">${badgeText}</span>
        <span class="detail-meta-pill">ID: ${item.id.substring(0, 14)}</span>
      </div>
      
      <h2 class="detail-title">${item.title}</h2>
      <div class="detail-creator">Created by <strong>${item.creator}</strong></div>
      
      <div class="detail-wallet-row">
        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.9 6 10 6.9 10 8V16C10 17.1 10.9 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z"/></svg>
        <span>Wallet: ${item.wallet}</span>
      </div>
      
      <div class="detail-prompt-box">
        <span class="prompt-tag">AI Generation Prompt</span>
        ${item.prompt}
      </div>
      
      <div class="detail-footer-row">
        <div class="vote-tally-wrap">
          <span class="vote-number" style="font-size: 20px;" id="modalVoteCount-${item.id}">${item.votes}</span>
          <span class="vote-lbl" style="font-size: 10px;">total votes</span>
        </div>
        <button class="btn-vote ${isVoted ? 'voted' : ''}" style="padding: 10px 20px; font-size: 13px;" id="modalVoteBtn-${item.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          <span>${isVoted ? 'Voted' : 'Vote for Work'}</span>
        </button>
      </div>
    </div>
  `;

  detailModal.classList.add('open');

  // Hook details triggers
  const voteBtn = document.getElementById(`modalVoteBtn-${item.id}`);
  voteBtn.addEventListener('click', () => {
    handleVoteToggle(item.id, voteBtn);
    // Re-render board below so the grid remains updated in parallel
    renderSubmissions();
  });

  // Setup dynamic audio playback for modal if music type
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

    audio.addEventListener('ended', () => {
      stopActivePlayback();
    });
  }
}

function closeDetailModal() {
  detailModal.classList.remove('open');
  stopActivePlayback();
}

// ==========================================
// 12. RUN INITIALIZER
// ==========================================
window.addEventListener('DOMContentLoaded', init);
