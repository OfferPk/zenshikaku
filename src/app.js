/**
 * ZenShikaku: Main Game Controller & Interactive UI
 */

(function () {
  'use strict';

  // Traditional Japanese Tatami Room Color Palette
  const ROOM_PALETTE = [
    { fill: 'rgba(90, 138, 97, 0.42)', stroke: '#73a97e' },   // Matcha green
    { fill: 'rgba(186, 122, 71, 0.42)', stroke: '#d89252' },  // Cedar wood
    { fill: 'rgba(59, 114, 158, 0.42)', stroke: '#5fa3d6' },  // Indigo Aizome
    { fill: 'rgba(199, 154, 52, 0.42)', stroke: '#dfb450' },  // Golden Yamabuki
    { fill: 'rgba(132, 94, 168, 0.42)', stroke: '#ab81d6' },  // Wisteria Fujiiro
    { fill: 'rgba(48, 144, 142, 0.42)', stroke: '#4fc2bf' },  // Teal Asagi
    { fill: 'rgba(196, 88, 68, 0.42)', stroke: '#db745a' },   // Persimmon Kaki
    { fill: 'rgba(179, 90, 120, 0.42)', stroke: '#d47f9e' },  // Rose Sakura
    { fill: 'rgba(110, 125, 142, 0.42)', stroke: '#92a3b8' }  // River Pebble Sumi
  ];

  // State
  let currentLevelId = 1;
  let currentLevel = null;
  let gameState = null;
  let completedLevels = new Set();
  let selectedPackIndex = 0;
  let activeHint = null;

  // Interaction State
  let isPointerDown = false;
  let dragStart = null;
  let dragCurrent = null;
  let didMove = false;
  let tapCorner = null;

  // DOM Elements
  const boardSvg = document.getElementById('board-svg');
  const packNameEl = document.getElementById('pack-name');
  const levelNameEl = document.getElementById('level-name');
  const statCoveredEl = document.getElementById('stat-covered');
  const statRoomsEl = document.getElementById('stat-rooms');
  const statCluesEl = document.getElementById('stat-clues');
  const dragPillEl = document.getElementById('drag-pill');
  const dragDimEl = document.getElementById('drag-dimension');
  const dragAreaEl = document.getElementById('drag-area');
  const dragStatusEl = document.getElementById('drag-status');
  const hintBannerEl = document.getElementById('hint-banner');
  const hintTextEl = document.getElementById('hint-text');

  // Modals
  const modalLevels = document.getElementById('modal-levels');
  const modalRules = document.getElementById('modal-rules');
  const modalWin = document.getElementById('modal-win');
  const packTabsContainer = document.getElementById('pack-tabs');
  const levelGridContainer = document.getElementById('level-grid');
  const winLevelNameEl = document.getElementById('win-level-name');
  const winRoomsCountEl = document.getElementById('win-rooms-count');

  // Storage
  function loadPersistedData() {
    try {
      const savedLevel = localStorage.getItem('zenshikaku_current_level');
      if (savedLevel) {
        const parsed = parseInt(savedLevel, 10);
        if (parsed >= 1 && parsed <= ShikakuLevels.TOTAL_LEVELS) {
          currentLevelId = parsed;
        }
      }

      const savedCompleted = localStorage.getItem('zenshikaku_completed_levels');
      if (savedCompleted) {
        const arr = JSON.parse(savedCompleted);
        completedLevels = new Set(arr);
      }
    } catch (e) {
      console.warn('Storage unavailable:', e);
    }
  }

  function savePersistedData() {
    try {
      localStorage.setItem('zenshikaku_current_level', currentLevelId.toString());
      localStorage.setItem('zenshikaku_completed_levels', JSON.stringify(Array.from(completedLevels)));
    } catch (e) {}
  }

  // Audio helper
  const audio = window.ZenAudio || {
    toggleMute: () => false,
    isAudioMuted: () => false,
    playDragTick: () => {},
    playRoomPlace: () => {},
    playRoomClear: () => {},
    playBambooSatisfied: () => {},
    playHintChime: () => {},
    playTempleGong: () => {}
  };

  function updateSoundButton() {
    const btn = document.getElementById('btn-sound');
    if (btn) {
      const muted = audio.isAudioMuted();
      btn.textContent = muted ? '🔇' : '🔊';
      btn.setAttribute('aria-label', muted ? 'Enable sound' : 'Mute sound');
      btn.setAttribute('aria-pressed', muted.toString());
      btn.title = muted ? 'Turn Sound On (M)' : 'Turn Sound Off (M)';
    }
  }

  // Load Level
  function loadLevel(id) {
    currentLevelId = id;
    currentLevel = ShikakuLevels.getLevel(id);
    if (!currentLevel) return;

    gameState = ShikakuEngine.createGameState(currentLevel);
    activeHint = null;
    tapCorner = null;
    dragStart = null;
    dragCurrent = null;
    isPointerDown = false;

    if (hintBannerEl) hintBannerEl.classList.add('hidden');
    if (dragPillEl) dragPillEl.classList.add('hidden');

    savePersistedData();
    updateHeaderUI();
    renderBoard();
  }

  function updateHeaderUI() {
    if (!currentLevel) return;
    packNameEl.textContent = currentLevel.pack;
    levelNameEl.textContent = `Level ${currentLevel.id} (${currentLevel.width}×${currentLevel.height})`;
    updateStatsUI();
  }

  function updateStatsUI() {
    if (!gameState || !currentLevel) return;

    const boardCheck = ShikakuEngine.checkBoardState(gameState, currentLevel);
    statCoveredEl.textContent = `${Math.round(boardCheck.coveragePercent)}%`;
    statRoomsEl.textContent = gameState.rooms.length.toString();
    statCluesEl.textContent = `${boardCheck.satisfiedClues}/${currentLevel.clues.length}`;
  }

  // Coordinate Conversion
  function getGridCoords(evt) {
    const rect = boardSvg.getBoundingClientRect();
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const svgSize = 500;
    const padding = 20;
    const boardArea = svgSize - padding * 2;

    const cellW = boardArea / currentLevel.width;
    const cellH = boardArea / currentLevel.height;

    const c = Math.floor((x - padding) / cellW);
    const r = Math.floor((y - padding) / cellH);

    const clampedC = Math.max(0, Math.min(currentLevel.width - 1, c));
    const clampedR = Math.max(0, Math.min(currentLevel.height - 1, r));

    return { r: clampedR, c: clampedC };
  }

  // SVG Rendering
  function renderBoard() {
    if (!currentLevel || !gameState) return;

    const svgSize = 500;
    const padding = 20;
    const boardArea = svgSize - padding * 2;
    const cellW = boardArea / currentLevel.width;
    const cellH = boardArea / currentLevel.height;

    // Check board state for clue statuses
    const boardCheck = ShikakuEngine.checkBoardState(gameState, currentLevel);
    const satisfiedSet = new Set(boardCheck.details.filter(d => d.status === 'SATISFIED').map(d => `${d.clue.r},${d.clue.c}`));
    const violatedSet = new Set(boardCheck.details.filter(d => d.status === 'VIOLATED' || d.status === 'CONFLICT').map(d => `${d.clue.r},${d.clue.c}`));

    let html = '';

    // Board Frame
    html += `<rect x="${padding - 4}" y="${padding - 4}" width="${boardArea + 8}" height="${boardArea + 8}" rx="12" fill="#1b231d" stroke="#2c382f" stroke-width="3" />`;

    // Tatami Grid Lines
    for (let i = 0; i <= currentLevel.width; i++) {
      const x = padding + i * cellW;
      html += `<line x1="${x}" y1="${padding}" x2="${x}" y2="${padding + boardArea}" class="grid-line" stroke-width="1.2" />`;
    }
    for (let j = 0; j <= currentLevel.height; j++) {
      const y = padding + j * cellH;
      html += `<line x1="${padding}" y1="${y}" x2="${padding + boardArea}" y2="${y}" class="grid-line" stroke-width="1.2" />`;
    }

    // Placed Rooms
    gameState.rooms.forEach((room, index) => {
      const rx = padding + room.c1 * cellW + 2;
      const ry = padding + room.r1 * cellH + 2;
      const rw = (room.c2 - room.c1 + 1) * cellW - 4;
      const rh = (room.r2 - room.r1 + 1) * cellH - 4;

      const palette = ROOM_PALETTE[index % ROOM_PALETTE.length];
      const roomStatus = ShikakuEngine.getRoomStatus(currentLevel, room);
      const stroke = roomStatus.valid ? palette.stroke : '#e06c75';
      const fill = roomStatus.valid ? palette.fill : 'rgba(224, 108, 117, 0.35)';

      html += `<rect class="room-rect" data-room-id="${room.id}" x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2.5" />`;

      // Subtle tatami inner woven line
      if (rw > 30 && rh > 30) {
        html += `<rect x="${rx + 4}" y="${ry + 4}" width="${rw - 8}" height="${rh - 8}" rx="4" fill="none" stroke="${stroke}" stroke-width="1" stroke-dasharray="3 3" opacity="0.4" />`;
      }
    });

    // Tap-corner indicator if active
    if (tapCorner && !isPointerDown) {
      const tx = padding + tapCorner.c * cellW + 3;
      const ty = padding + tapCorner.r * cellH + 3;
      html += `<rect x="${tx}" y="${ty}" width="${cellW - 6}" height="${cellH - 6}" rx="4" fill="rgba(226, 176, 83, 0.3)" stroke="#e2b053" stroke-width="2" stroke-dasharray="4 2" />`;
    }

    // Dragging / Active Selection Preview
    if (dragStart && dragCurrent) {
      const norm = ShikakuEngine.normalizeRect(currentLevel.width, currentLevel.height, dragStart.r, dragStart.c, dragCurrent.r, dragCurrent.c);
      const px = padding + norm.c1 * cellW + 1;
      const py = padding + norm.r1 * cellH + 1;
      const pw = (norm.c2 - norm.c1 + 1) * cellW - 2;
      const ph = (norm.r2 - norm.r1 + 1) * cellH - 2;

      const testStatus = ShikakuEngine.getRoomStatus(currentLevel, norm);
      const pStroke = testStatus.valid ? '#78b885' : (testStatus.reason === 'WRONG_AREA' ? '#e2b053' : '#e06c75');
      const pFill = testStatus.valid ? 'rgba(120, 184, 133, 0.38)' : 'rgba(226, 176, 83, 0.22)';

      html += `<rect class="preview-rect" x="${px}" y="${py}" width="${pw}" height="${ph}" rx="6" fill="${pFill}" stroke="${pStroke}" stroke-width="3" />`;
    }

    // Hint Target Highlight
    if (activeHint && activeHint.rect) {
      const hr = activeHint.rect;
      const hx = padding + hr.c1 * cellW;
      const hy = padding + hr.r1 * cellH;
      const hw = (hr.c2 - hr.c1 + 1) * cellW;
      const hh = (hr.r2 - hr.r1 + 1) * cellH;

      html += `<rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" rx="8" fill="rgba(226, 176, 83, 0.25)" stroke="#e2b053" stroke-width="3.5" stroke-dasharray="6 3" pointer-events="none" />`;
    }

    // Clues
    currentLevel.clues.forEach(clue => {
      const cx = padding + clue.c * cellW + cellW / 2;
      const cy = padding + clue.r * cellH + cellH / 2;
      const radius = Math.min(cellW, cellH) * 0.34;
      const key = `${clue.r},${clue.c}`;

      let clueClass = 'clue-pending';
      if (satisfiedSet.has(key)) {
        clueClass = 'clue-satisfied';
      } else if (violatedSet.has(key)) {
        clueClass = 'clue-violated';
      }

      html += `<g class="${clueClass}" data-clue-r="${clue.r}" data-clue-c="${clue.c}">`;
      html += `<circle class="clue-circle" cx="${cx}" cy="${cy}" r="${radius}" />`;
      html += `<text class="clue-text" x="${cx}" y="${cy}" font-size="${Math.round(radius * 1.15)}">${clue.val}</text>`;
      html += `</g>`;
    });

    boardSvg.innerHTML = html;
  }

  // Drag Pill Status
  function updateDragPill(r1, c1, r2, c2) {
    if (!currentLevel) return;
    const norm = ShikakuEngine.normalizeRect(currentLevel.width, currentLevel.height, r1, c1, r2, c2);
    const status = ShikakuEngine.getRoomStatus(currentLevel, norm);

    dragDimEl.textContent = `${norm.width} × ${norm.height}`;
    dragAreaEl.textContent = norm.area.toString();

    dragPillEl.classList.remove('valid', 'invalid', 'needs-area', 'needs-clue');
    if (status.valid) {
      dragPillEl.classList.add('valid');
      dragStatusEl.textContent = '✓ Matches clue';
    } else if (status.reason === 'NO_CLUE') {
      dragPillEl.classList.add('needs-clue');
      dragStatusEl.textContent = 'Needs a number';
    } else if (status.reason === 'MULTIPLE_CLUES') {
      dragPillEl.classList.add('invalid');
      dragStatusEl.textContent = 'Too many numbers';
    } else if (status.reason === 'WRONG_AREA') {
      dragPillEl.classList.add('needs-area');
      dragStatusEl.textContent = `Needs ${status.targetArea}`;
    }

    dragPillEl.classList.remove('hidden');
  }

  // Pointer Interaction Handlers
  function onPointerDown(e) {
    if (!currentLevel || !gameState) return;
    const coords = getGridCoords(e);
    isPointerDown = true;
    didMove = false;
    dragStart = coords;
    dragCurrent = coords;

    updateDragPill(coords.r, coords.c, coords.r, coords.c);
    renderBoard();
  }

  function onPointerMove(e) {
    if (!isPointerDown || !dragStart) return;
    const coords = getGridCoords(e);

    if (coords.r !== dragCurrent.r || coords.c !== dragCurrent.c) {
      didMove = true;
      dragCurrent = coords;
      audio.playDragTick();
      updateDragPill(dragStart.r, dragStart.c, dragCurrent.r, dragCurrent.c);
      renderBoard();
    }
  }

  function onPointerUp(e) {
    if (!isPointerDown) return;
    isPointerDown = false;
    dragPillEl.classList.add('hidden');

    if (!dragStart || !dragCurrent) return;

    if (!didMove) {
      // Tap detected on cell (dragStart.r, dragStart.c)
      const targetR = dragStart.r;
      const targetC = dragStart.c;

      // 1. If tapped cell is inside an existing room, remove that room!
      const existingRoom = ShikakuEngine.getRoomAt(gameState.rooms, targetR, targetC);
      if (existingRoom) {
        ShikakuEngine.removeRoomAt(gameState, targetR, targetC);
        audio.playRoomClear();
        tapCorner = null;
        activeHint = null;
        updateHeaderUI();
        renderBoard();
        checkVictoryCondition();
        return;
      }

      // 2. Otherwise handle two-tap corner selection
      if (!tapCorner) {
        tapCorner = { r: targetR, c: targetC };
        audio.playDragTick();
        renderBoard();
        return;
      } else {
        // Complete two-tap rectangle
        const r1 = tapCorner.r;
        const c1 = tapCorner.c;
        const r2 = targetR;
        const c2 = targetC;
        tapCorner = null;
        finalizeRoomPlacement(r1, c1, r2, c2);
        return;
      }
    } else {
      // Drag completed
      tapCorner = null;
      finalizeRoomPlacement(dragStart.r, dragStart.c, dragCurrent.r, dragCurrent.c);
    }
  }

  function finalizeRoomPlacement(r1, c1, r2, c2) {
    const norm = ShikakuEngine.normalizeRect(currentLevel.width, currentLevel.height, r1, c1, r2, c2);
    const status = ShikakuEngine.getRoomStatus(currentLevel, norm);

    const room = ShikakuEngine.addRoom(gameState, currentLevel, norm.r1, norm.c1, norm.r2, norm.c2);
    audio.playRoomPlace(status.valid);

    if (status.valid) {
      audio.playBambooSatisfied();
    }

    dragStart = null;
    dragCurrent = null;
    activeHint = null;

    updateHeaderUI();
    renderBoard();
    checkVictoryCondition();
  }

  function checkVictoryCondition() {
    if (!gameState || !currentLevel) return;
    const boardCheck = ShikakuEngine.checkBoardState(gameState, currentLevel);

    if (boardCheck.solved) {
      completedLevels.add(currentLevel.id);
      savePersistedData();
      audio.playTempleGong();

      setTimeout(() => {
        showVictoryModal();
      }, 350);
    }
  }

  function showVictoryModal() {
    winLevelNameEl.textContent = `Level ${currentLevel.id} (${currentLevel.pack})`;
    winRoomsCountEl.textContent = `${gameState.rooms.length} rooms placed`;
    modalWin.classList.add('active');
  }

  // Modals Management
  function openLevelModal() {
    const packs = ShikakuLevels.getPacks();

    // Render pack tabs
    packTabsContainer.innerHTML = packs.map((pack, idx) => `
      <button type="button" class="pack-tab ${idx === selectedPackIndex ? 'active' : ''}" aria-pressed="${idx === selectedPackIndex}" data-pack-idx="${idx}">
        ${pack.name} (${pack.size})
      </button>
    `).join('');

    renderLevelGrid();
    modalLevels.classList.add('active');
  }

  function renderLevelGrid() {
    const packs = ShikakuLevels.getPacks();
    const pack = packs[selectedPackIndex];
    if (!pack) return;

    let html = '';
    for (let id = pack.levels[0]; id <= pack.levels[1]; id++) {
      const isCompleted = completedLevels.has(id);
      const isCurrent = id === currentLevelId;

      html += `
        <button type="button" class="level-card ${isCurrent ? 'current' : ''} ${isCompleted ? 'completed' : ''}" aria-label="Level ${id}${isCompleted ? ', completed' : ''}${isCurrent ? ', current level' : ''}" aria-pressed="${isCurrent}" data-level-id="${id}">
          <span class="level-card-num">${id}</span>
          ${isCompleted ? '<span class="level-card-star">★</span>' : ''}
        </button>
      `;
    }
    levelGridContainer.innerHTML = html;
  }

  // Event Listeners Binding
  function initEvents() {
    // Board pointer events
    boardSvg.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // Header buttons
    document.getElementById('btn-sound').addEventListener('click', () => {
      audio.toggleMute();
      updateSoundButton();
    });

    document.getElementById('btn-rules').addEventListener('click', () => {
      modalRules.classList.add('active');
    });

    document.getElementById('btn-levels').addEventListener('click', openLevelModal);

    // Modal close buttons
    document.getElementById('close-levels').addEventListener('click', () => {
      modalLevels.classList.remove('active');
    });
    document.getElementById('close-rules').addEventListener('click', () => {
      modalRules.classList.remove('active');
    });
    document.getElementById('btn-rules-start').addEventListener('click', () => {
      modalRules.classList.remove('active');
    });

    // Pack tabs click
    packTabsContainer.addEventListener('click', e => {
      const tab = e.target.closest('.pack-tab');
      if (!tab) return;
      selectedPackIndex = parseInt(tab.dataset.packIdx, 10);
      document.querySelectorAll('.pack-tab').forEach((t, i) => {
        t.classList.toggle('active', i === selectedPackIndex);
        t.setAttribute('aria-pressed', (i === selectedPackIndex).toString());
      });
      renderLevelGrid();
    });

    // Level select click
    levelGridContainer.addEventListener('click', e => {
      const card = e.target.closest('.level-card');
      if (!card) return;
      const id = parseInt(card.dataset.levelId, 10);
      modalLevels.classList.remove('active');
      loadLevel(id);
    });

    // Victory modal buttons
    document.getElementById('btn-replay').addEventListener('click', () => {
      modalWin.classList.remove('active');
      loadLevel(currentLevelId);
    });

    document.getElementById('btn-win-next').addEventListener('click', () => {
      modalWin.classList.remove('active');
      const nextId = currentLevelId < ShikakuLevels.TOTAL_LEVELS ? currentLevelId + 1 : 1;
      loadLevel(nextId);
    });

    // Controls Bar Action Buttons
    document.getElementById('btn-undo').addEventListener('click', () => {
      if (ShikakuEngine.undo(gameState)) {
        audio.playRoomClear();
        tapCorner = null;
        activeHint = null;
        updateHeaderUI();
        renderBoard();
      }
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      if (gameState.rooms.length > 0) {
        ShikakuEngine.resetRooms(gameState);
        audio.playRoomClear();
        tapCorner = null;
        activeHint = null;
        updateHeaderUI();
        renderBoard();
      }
    });

    document.getElementById('btn-hint').addEventListener('click', () => {
      const hint = ShikakuEngine.getDeductiveHint(gameState, currentLevel);
      if (hint && hint.type !== 'NO_HINT' && hint.type !== 'ALL_COMPLETED') {
        activeHint = hint;
        hintTextEl.textContent = hint.message;
        hintBannerEl.classList.remove('hidden');
        audio.playHintChime();
        renderBoard();
      } else if (hint) {
        hintTextEl.textContent = hint.message;
        hintBannerEl.classList.remove('hidden');
      }
    });

    document.getElementById('btn-close-hint').addEventListener('click', () => {
      hintBannerEl.classList.add('hidden');
      activeHint = null;
      renderBoard();
    });

    document.getElementById('btn-prev').addEventListener('click', () => {
      const prevId = currentLevelId > 1 ? currentLevelId - 1 : ShikakuLevels.TOTAL_LEVELS;
      loadLevel(prevId);
    });

    document.getElementById('btn-next').addEventListener('click', () => {
      const nextId = currentLevelId < ShikakuLevels.TOTAL_LEVELS ? currentLevelId + 1 : 1;
      loadLevel(nextId);
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'u' || e.key === 'U') {
        document.getElementById('btn-undo').click();
      } else if (e.key === 'r' || e.key === 'R') {
        document.getElementById('btn-reset').click();
      } else if (e.key === 'h' || e.key === 'H') {
        document.getElementById('btn-hint').click();
      } else if (e.key === 'm' || e.key === 'M') {
        document.getElementById('btn-sound').click();
      } else if (e.key === 'ArrowRight') {
        document.getElementById('btn-next').click();
      } else if (e.key === 'ArrowLeft') {
        document.getElementById('btn-prev').click();
      } else if (e.key === 'Escape') {
        modalLevels.classList.remove('active');
        modalRules.classList.remove('active');
        modalWin.classList.remove('active');
        hintBannerEl.classList.add('hidden');
        activeHint = null;
        renderBoard();
      }
    });

    // Close modals on overlay backdrop tap
    [modalLevels, modalRules, modalWin].forEach(m => {
      m.addEventListener('click', e => {
        if (e.target === m) {
          m.classList.remove('active');
        }
      });
    });

    // Service Worker Registration for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  }

  // Initialization
  function init() {
    loadPersistedData();
    updateSoundButton();
    initEvents();
    loadLevel(currentLevelId);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
