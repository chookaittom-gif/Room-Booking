(function () {
  'use strict';

  if (window.__CLASSROOM_BOOKING_LOADED__) return;
  window.__CLASSROOM_BOOKING_LOADED__ = true;

  let currentRoom = null;
  let currentDate = null;
  let currentSession = null;
  let roomsData = [];
  let configData = {};
  let currentStep = 1;
  let bookingChart = null;
  let loadingModalInstance = null;
  let scheduleController = new AbortController();
  let allRecentBookings = [];
  let currentRecentPage = 1;
  let cancelSuggestBound = false;
  let cancelSuggestTimer = null;

  let combinedCalendarInstance = null;

  const combinedState = {
    loading: false,
    token: 0,
    lastCall: 0,
    lastSuccess: 0,
    cache: { slots: [], fetchedAt: 0 },
    controller: new AbortController()
  };

  const RECENT_ITEMS_PER_PAGE = 10;

  // document.addEventListener('DOMContentLoaded', initializeApplication);


// ANCHOR:CLIENT.initializeApplication:REPLACE
function initializeApplication() {
  try {
    console.log('\uD83D\uDE80 Initializing application (Berry Version)...');

    if (typeof window.__INITIAL__ === 'undefined') {
      throw new Error('Initial data not found');
    }
    const initData = window.__INITIAL__;

    window.roomsData = initData.rooms ||[];
    window.configData = initData.config || {};
    window.currentDate = initData.currentDate || new Date().toISOString().split('T')[0];

    // Globals Fallback
    if (typeof roomsData !== 'undefined') roomsData = window.roomsData;
    if (typeof currentDate !== 'undefined') currentDate = window.currentDate;

    console.log(`\u2705 Globals Initialized: ${window.roomsData.length} Rooms, Date: ${window.currentDate}`);

    // Binding Functions
    window.toggleTheme = (typeof toggleTheme === 'function') ? toggleTheme : () => {};
    window.showBookingForm = (typeof showBookingForm === 'function') ? showBookingForm : () => {};
    window.switchTimetableView = (typeof switchTimetableView === 'function') ? switchTimetableView : () => {};
    window.openGlobalCancelModal = (typeof openGlobalCancelModal === 'function') ? openGlobalCancelModal : () => {};
    window.showLoginModal = (typeof showLoginModal === 'function') ? showLoginModal : () => {};
    window.performLogin = (typeof performLogin === 'function') ? performLogin : () => {};
    window.performLogout = (typeof performLogout === 'function') ? performLogout : () => {};

    if (typeof initializeUI === 'function') initializeUI();
    // \u2705 \u0E40\u0E23\u0E35\u0E22\u0E01\u0E43\u0E0A\u0E49 Event Listeners \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E42\u0E04\u0E49\u0E14\u0E01\u0E32\u0E23\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E17\u0E33\u0E07\u0E32\u0E19
    if (typeof setupEventListeners === 'function') setupEventListeners(); 
    
    if (typeof initializeTabs === 'function') initializeTabs();
    if (typeof renderRooms === 'function') renderRooms(window.roomsData);
    if (typeof window.updateRoomOptions === 'function') {
        window.updateRoomOptions(window.roomsData);
    }
    if (typeof initBookingSummary === 'function') initBookingSummary();

    // \u2705 CHANGE: Setup Session (\u0E04\u0E23\u0E2D\u0E1A\u0E04\u0E25\u0E38\u0E21\u0E17\u0E31\u0E49\u0E07 User \u0E41\u0E25\u0E30 Guest)
    if (initData.session) {
      window.currentSession = initData.session;
      if (typeof setSession === 'function') setSession(window.currentSession);
      if (typeof startSessionTimer === 'function') startSessionTimer();
      if (typeof checkSessionTimeout === 'function') checkSessionTimeout();
    } else {
      if (typeof setSession === 'function') setSession(null);
    }

    // Tab Switching
    setTimeout(() => {
      window.currentActiveTab = null;
      if (typeof showTab === 'function') {
        showTab('schedule');
      } else {
        const scheduleTab = document.getElementById('schedule-tab');
        if (scheduleTab) scheduleTab.click();
      }
      if (typeof updateBookingSummary === 'function') updateBookingSummary();
    }, 150);

    if (typeof handleCoachmarks === 'function') handleCoachmarks();

    requestAnimationFrame(() => {
      document.body.classList.add('app-loaded');
      if (typeof removeLoadingModal === 'function') removeLoadingModal();
    });

  } catch (error) {
    console.error('\u274C Init Error:', error);
    if (typeof removeLoadingModal === 'function') removeLoadingModal();
  }
}
// ANCHOR:CLIENT.initializeApplication:END



// Helper function to remove loading modal safely
function removeLoadingModal() {
    const modal = document.getElementById('loadingModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.style.display = 'none', 300);
    }
}

// ANCHOR:CLIENT.loadInitialData:REPLACE
function loadInitialData() {
  console.log('\uD83D\uDCE5 Loading initial data (Universal Compatibility)...');

  // 1. \u0E41\u0E2B\u0E25\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25
  const source = window.__INITIAL__ || window.initialData || {};
  
  // 2. \u0E1E\u0E22\u0E32\u0E22\u0E32\u0E21\u0E2B\u0E32 rooms \u0E08\u0E32\u0E01\u0E17\u0E38\u0E01\u0E0B\u0E2D\u0E01\u0E17\u0E38\u0E01\u0E21\u0E38\u0E21
  let rooms = source.rooms || source.Rooms || (source.data && source.data.rooms);
  
  if (!rooms && source.payload && source.payload.rooms) {
      rooms = source.payload.rooms;
  }

  // 3. \u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15 Global
  if (Array.isArray(rooms)) {
      window.roomsData = rooms;
  } else {
      window.roomsData = window.roomsData || []; // \u0E43\u0E0A\u0E49\u0E02\u0E2D\u0E07\u0E40\u0E14\u0E34\u0E21\u0E16\u0E49\u0E32\u0E21\u0E35
  }

  // 4. \u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15 Config & Session & Date
  const config = source.config || (source.data && source.data.config) || {};
  const session = source.session || (source.data && source.data.session) || null;
  const dateVal = source.currentDate || (source.data && source.data.currentDate) || source.date;

  window.configData = config;
  window.currentSession = session;
  if (dateVal) window.currentDate = String(dateVal).split('T')[0];

  console.log(`\u2705 Data Loaded: ${window.roomsData.length} Rooms, User: ${session ? session.username : 'Guest'}`);

  // 5. \u0E27\u0E32\u0E14 UI \u0E17\u0E31\u0E19\u0E17\u0E35
  if (typeof renderRooms === 'function') renderRooms(window.roomsData);
  if (typeof updateRoomOptions === 'function') updateRoomOptions(window.roomsData);
  
  // Fallback: \u0E16\u0E49\u0E32\u0E2B\u0E49\u0E2D\u0E07\u0E22\u0E31\u0E07\u0E40\u0E1B\u0E47\u0E19 0 \u0E43\u0E2B\u0E49\u0E40\u0E23\u0E35\u0E22\u0E01 API \u0E43\u0E2B\u0E21\u0E48 (Last Resort)
  if (window.roomsData.length === 0) {
      console.warn('\u26A0\uFE0F Rooms empty. Triggering API Fallback...');
      if(typeof apiCall === 'function') {
          apiCall('getRooms').then(res => {
              const newRooms = (res.data && res.data.rooms) || res.data || [];
              if(Array.isArray(newRooms) && newRooms.length > 0) {
                  window.roomsData = newRooms;
                  renderRooms(newRooms);
                  updateRoomOptions(newRooms);
                  console.log('\u2705 API Fallback Recovered:', newRooms.length);
              }
          });
      }
  }
}

// ANCHOR:CLIENT.initializeUI:REPLACE
function initializeUI() {
    const dateInput = document.getElementById('selectedDate');
    if (dateInput) {
        dateInput.value = currentDate;
        // \u0E41\u0E2A\u0E14\u0E07 Badge \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 \u0E1E.\u0E28. \u0E15\u0E31\u0E49\u0E07\u0E41\u0E15\u0E48\u0E42\u0E2B\u0E25\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E23\u0E01
        if (typeof updateDateInputDisplay === 'function') {
            updateDateInputDisplay(dateInput);
        }
    }
    initializeTheme();
}
// ANCHOR:CLIENT.initializeUI:END

function filterRooms() {
    const searchInput = document.getElementById('searchRoom');
    if (!searchInput) return;
    
    const query = searchInput.value.toLowerCase().trim();
    const roomList = document.getElementById('roomList');
    
    // 1. Filter Room Cards
    const cards = roomList.querySelectorAll('.room-card');
    let hasVisibleRoom = false;
    
    cards.forEach(card => {
        const title = card.querySelector('.room-card-title').textContent.toLowerCase();
        // \u0E16\u0E49\u0E32\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E40\u0E08\u0E2D \u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E2D\u0E30\u0E44\u0E23\u0E40\u0E25\u0E22 \u0E43\u0E2B\u0E49\u0E41\u0E2A\u0E14\u0E07
        if (title.includes(query) || query === '') {
            card.style.display = 'flex';
            hasVisibleRoom = true;
        } else {
            card.style.display = 'none';
        }
    });

    // 2. Manage Group Titles (\u0E0B\u0E48\u0E2D\u0E19\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D\u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2B\u0E49\u0E2D\u0E07\u0E43\u0E19\u0E01\u0E25\u0E38\u0E48\u0E21\u0E19\u0E31\u0E49\u0E19\u0E41\u0E2A\u0E14\u0E07)
    const groups = roomList.querySelectorAll('.room-group-title');
    groups.forEach(group => {
        let next = group.nextElementSibling;
        let groupHasVisible = false;
        
        // \u0E27\u0E19\u0E14\u0E39\u0E25\u0E39\u0E01\u0E19\u0E49\u0E2D\u0E07 (Room Cards) \u0E08\u0E19\u0E01\u0E27\u0E48\u0E32\u0E08\u0E30\u0E40\u0E08\u0E2D Group Title \u0E16\u0E31\u0E14\u0E44\u0E1B
        while(next && !next.classList.contains('room-group-title')) {
            if (next.classList.contains('room-card') && next.style.display !== 'none') {
                groupHasVisible = true;
                break;
            }
            next = next.nextElementSibling;
        }
        
        // \u0E16\u0E49\u0E32\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E2D\u0E22\u0E39\u0E48 \u0E43\u0E2B\u0E49\u0E0B\u0E48\u0E2D\u0E19\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D\u0E01\u0E25\u0E38\u0E48\u0E21\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E40\u0E01\u0E35\u0E48\u0E22\u0E27\u0E02\u0E49\u0E2D\u0E07
        // \u0E41\u0E15\u0E48\u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E04\u0E49\u0E19\u0E2B\u0E32 (query\u0E27\u0E48\u0E32\u0E07) \u0E43\u0E2B\u0E49\u0E42\u0E0A\u0E27\u0E4C\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D\u0E01\u0E25\u0E38\u0E48\u0E21\u0E40\u0E2A\u0E21\u0E2D
        if (query !== '') {
             group.style.display = groupHasVisible ? 'flex' : 'none';
        } else {
             group.style.display = 'flex';
        }
    });
}

// ANCHOR:CLIENT.setupEventListeners:REPLACE
function setupEventListeners() {
  const roomList = document.getElementById('roomList');
  if (roomList) {
    roomList.addEventListener('click', (evt) => {
      const card = evt.target.closest('.room-card[data-room-id]');
      if (!card) return;
      const roomId = card.dataset.roomId;
      if (!roomId) return;
      if (typeof handleRoomCardClick === 'function') {
        handleRoomCardClick(roomId);
      } else if (typeof selectRoom === 'function') {
        selectRoom(roomId);
      } else {
        window.currentRoom = roomId;
      }
    });
  }

  const dateEl = document.getElementById('selectedDate');
  if (dateEl) {
    dateEl.addEventListener('change', function () {
      currentDate = this.value;
      // \u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15 Badge \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 \u0E1E.\u0E28. \u0E17\u0E31\u0E19\u0E17\u0E35\u0E17\u0E35\u0E48\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E27\u0E31\u0E19
      if (typeof updateDateInputDisplay === 'function') updateDateInputDisplay(this);
      
      if (typeof updateSelectedRoomInfo === 'function') updateSelectedRoomInfo();
      if (window.currentActiveTab === 'timetable' && window.currentRoom && typeof loadScheduleForRoom === 'function') {
        loadScheduleForRoom(window.currentRoom, currentDate);
      }
      if (window.currentActiveTab === 'schedule' && typeof loadCombinedSchedule === 'function') {
        loadCombinedSchedule();
      }
      if (window.currentActiveTab === 'dashboard' && typeof loadDashboard === 'function') {
        loadDashboard({ force: true });
      }
    });
  }

  const searchEl = document.getElementById('searchRoom');
  if (searchEl) {
    let t;
    searchEl.addEventListener('input', function () {
      clearTimeout(t);
      const q = this.value.toLowerCase();
      t = setTimeout(() => filterRooms?.(q), 300);
    });
  }

  const uploadEl = document.getElementById('fileUpload');
  if (uploadEl) {
    uploadEl.addEventListener('change', handleFileUpload);
  }
}
// ANCHOR:CLIENT.setupEventListeners:END

 function renderInitialContent() {
  renderRooms(roomsData);
  updateRoomCount();
}

  
  function showInitializationError(error) {
    const roomList = document.getElementById('roomList');
    if (roomList) {
      roomList.innerHTML = `
        <div class="empty-rooms text-center py-4">
          <div class="empty-icon mb-3">
            <i class="fas fa-exclamation-triangle fa-2x text-danger"></i>
          </div>
          <h6 class="text-danger mb-2">\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E42\u0E2B\u0E25\u0E14\u0E23\u0E30\u0E1A\u0E1A</h6>
          <p class="text-muted small">${error.message}</p>
          <button class="btn btn-outline-primary btn-sm" onclick="window.location.reload()">
            <i class="fas fa-sync me-1"></i>\u0E23\u0E35\u0E42\u0E2B\u0E25\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E40\u0E1E\u0E08
          </button>
        </div>`;
    }
  }

  function escapeHtml(value) {
  const s = String(value == null ? '' : value);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/'/g, '&#39;');
}

function toDisplayableRoomThumbUrl(uRaw) {
  const u = String(uRaw || '').trim();
  if (!/^https?:\/\//i.test(u)) return '';
  const mFile = u.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (mFile && mFile[1]) return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(mFile[1]) + '&sz=w200';
  const mOpen = u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (mOpen && mOpen[1] && /drive\.google\.com/i.test(u)) {
    return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(mOpen[1]) + '&sz=w200';
  }
  return u;
}

function getRoomThumbnailUrl(r) {
  if (!r) return '';
  const direct = String(r.ImageURL || r.imageURL || r.RoomImage || r.roomImage || r.PhotoURL || r.photoURL || r.PictureURL || '').trim();
  if (direct) return toDisplayableRoomThumbUrl(direct);
  const iconField = String(r.IconName || r.icon || '').trim();
  if (iconField && /^https?:\/\//i.test(iconField)) return toDisplayableRoomThumbUrl(iconField);
  return '';
}

function getRoomFaIconClasses(r) {
  const raw = String((r && (r.IconName || r.icon)) || '').trim();
  if (!raw || /^https?:\/\//i.test(raw)) return 'fas fa-door-open';
  // \u0E44\u0E21\u0E48\u0E2A\u0E23\u0E49\u0E32\u0E07 class \u0E08\u0E32\u0E01 emoji/\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21 \u2014 \u0E04\u0E48\u0E32\u0E40\u0E2B\u0E25\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19\u0E41\u0E2A\u0E14\u0E07\u0E1C\u0E48\u0E32\u0E19 getRoomEmojiIcon + buildRoomCardIconInner
  if (!raw.includes('fa-') && !/^(fa-solid|fa-regular|fa-brands|fas|far|fab)\s+/i.test(raw)) {
    return 'fas fa-door-open';
  }
  if (raw.includes('fa-')) {
    if (/^(fa-solid|fa-regular|fa-brands|fas|far|fab)\s+/i.test(raw)) return raw;
    if (raw.startsWith('fa-')) return 'fas ' + raw;
    return raw;
  }
  const glyph = raw.replace(/^fa-/, '');
  if (!glyph) return 'fas fa-door-open';
  return 'fas fa-' + glyph.replace(/^fa-/, '');
}

// ANCHOR:CLIENT.getRoomEmojiIcon:START (placed after getRoomFaIconClasses per spec)
function getRoomEmojiIcon(r) {
  const raw = String((r && (r.IconName || r.icon)) || '').trim();
  if (!raw || /^https?:\/\//i.test(raw) || raw.includes('fa-')) return '';
  return raw;
}
// ANCHOR:CLIENT.getRoomEmojiIcon:END

// ANCHOR:CLIENT.buildRoomCardIconInner:REPLACE
function buildRoomCardIconInner(r, variant) {
  const thumb = getRoomThumbnailUrl(r);
  const emoji = getRoomEmojiIcon(r);
  const faCls = getRoomFaIconClasses(r);
  const imgCls = variant === 'pill' ? 'room-thumb-img room-thumb-img--pill' : 'room-thumb-img';

  if (thumb) {
    return '<img class="' + escapeAttr(imgCls) + '" src="' + escapeAttr(thumb) + '" alt="" loading="lazy" referrerpolicy="no-referrer" decoding="async" ' +
      'onerror="this.classList.add(\'d-none\');var n=this.nextElementSibling;if(n)n.classList.remove(\'d-none\');">' +
      (emoji
        ? '<span class="room-emoji-icon d-none" aria-hidden="true">' + escapeHtml(emoji) + '</span>'
        : '<i class="' + escapeAttr(faCls) + ' d-none" aria-hidden="true"></i>');
  }

  if (emoji) {
    return '<span class="room-emoji-icon" aria-hidden="true">' + escapeHtml(emoji) + '</span>';
  }

  return '<i class="' + escapeAttr(faCls) + '" aria-hidden="true"></i>';
}
// ANCHOR:CLIENT.buildRoomCardIconInner:END

function renderRooms(rooms) {
  const sidebarList = document.getElementById('roomList');
  const mobileList = document.getElementById('mobileRoomList');
  
  if (!sidebarList && !mobileList) return;

  const list = Array.isArray(rooms) ? rooms.slice() : [];
  const activeId = String(window.currentRoom || '').trim();
  
  const safe = (v) => (typeof sanitizeText === 'function') ? sanitizeText(v) : String(v || '');
  const getRoomId = (r) => String(r.RoomID || r.roomId || r.id || '').trim();
  const getName = (r) => String(r.RoomName || r.name || r.roomName || '').trim();
  const getLocation = (r) => String(r.Location || r.location || '').trim();

  // ------------------------------------------------
  // \uD83D\uDDA5\uFE0F 1. Sidebar (Desktop)
  // ------------------------------------------------
  if (sidebarList) {
    if (list.length === 0) {
      sidebarList.innerHTML = `<div class="text-center py-4 text-muted">\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2B\u0E49\u0E2D\u0E07</div>`;
    } else {
      const groups = {};
      list.forEach(r => {
        const loc = getLocation(r) || '\u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B';
        if (!groups[loc]) groups[loc] = [];
        groups[loc].push(r);
      });

      const sortedLocs = Object.keys(groups).sort();
      let sidebarHtml = '';
      
      sortedLocs.forEach(loc => {
        const items = groups[loc].sort((a, b) => getName(a).localeCompare(getName(b)));
        
        sidebarHtml += `
          <div class="room-group-title d-flex align-items-center justify-content-between px-2 mt-3 mb-2">
            <div class="d-flex align-items-center gap-2 small text-uppercase fw-bold text-muted">
              <i class="fas fa-map-marker-alt"></i> <span>${safe(loc)}</span>
            </div>
          </div>`;
          
        items.forEach(r => {
          const id = getRoomId(r);
          const isActive = (id === activeId) ? 'active' : '';
          
          sidebarHtml += `
            <div class="room-card ${isActive}" onclick="handleRoomCardClick('${id}')" onkeydown="handleRoomCardKeydown(event, '${id}')" data-room-id="${id}" role="button" tabindex="0">
              <div class="d-flex align-items-center gap-3">
                <div class="room-card-icon align-self-start mt-1">
                   ${buildRoomCardIconInner(r)}
                </div>
                <div class="flex-grow-1 overflow-hidden">
                   <!-- \u274C \u0E25\u0E1A text-truncate \u0E2D\u0E2D\u0E01 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49 CSS \u0E17\u0E33\u0E07\u0E32\u0E19 -->
                   <div class="room-card-title">${safe(getName(r))}</div>
                   <div class="room-card-meta text-muted small">
                      ${r.Capacity ? `<i class="fas fa-users me-1"></i>${r.Capacity}` : ''}
                   </div>
                </div>
                ${isActive ? '<div class="text-primary align-self-center"><i class="fas fa-check-circle"></i></div>' : ''}
              </div>
            </div>`;
        });
      });
      sidebarList.innerHTML = sidebarHtml;
    }
  }

  // ------------------------------------------------
  // \uD83D\uDCF1 2. Topbar (Mobile)
  // ------------------------------------------------
  if (mobileList) {
    if (list.length === 0) {
      mobileList.innerHTML = `<span class="text-muted small p-2">\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2B\u0E49\u0E2D\u0E07</span>`;
    } else {
      const sortedList = list.sort((a, b) => getName(a).localeCompare(getName(b)));
      let mobileHtml = '';
      
      sortedList.forEach(r => {
        const id = getRoomId(r);
        const isActive = (id === activeId) ? 'active' : '';
        // \u0E40\u0E2D\u0E32\u0E04\u0E33\u0E27\u0E48\u0E32 "\u0E2B\u0E49\u0E2D\u0E07" \u0E2D\u0E2D\u0E01\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E23\u0E30\u0E2B\u0E22\u0E31\u0E14\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48 (Optional)
        const nameDisplay = getName(r).replace(/^\u0E2B\u0E49\u0E2D\u0E07\s*/, ''); 
        
        mobileHtml += `
          <div class="modern-room-pill ${isActive}" 
               onclick="handleRoomCardClick('${id}')" 
               data-room-id="${id}">
              <span class="modern-room-pill-media">${buildRoomCardIconInner(r, 'pill')}</span>
              <span>${safe(nameDisplay)}</span>
          </div>`;
      });
      
      mobileList.innerHTML = mobileHtml;

      // Auto Scroll
      setTimeout(() => {
        const activeItem = mobileList.querySelector('.modern-room-pill.active');
        if (activeItem) {
          activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 300);
    }
  }
}

function handleRoomCardClick(roomOrId) {
  const rid = String(
    (typeof roomOrId === 'object' && roomOrId)
      ? (roomOrId.RoomID || roomOrId.roomID || roomOrId.roomId || '')
      : roomOrId
  ).trim();

  const activeTab = String(window.currentActiveTab || '').trim();
  const currentId = String(window.currentRoom || '').trim();

  if (!rid) return;

  if (rid === currentId) {
    if (activeTab === 'timetable' && typeof loadScheduleForRoom === 'function' && window.currentRoom) {
      loadScheduleForRoom(window.currentRoom, currentDate);
    }
    return;
  }

  if (typeof selectRoom === 'function') selectRoom(rid);

  if (activeTab === 'timetable' && typeof loadScheduleForRoom === 'function') {
    const resolved = window.currentRoom || rid;
    loadScheduleForRoom(resolved, currentDate);
  }

  if (activeTab === 'schedule' && typeof loadCombinedSchedule === 'function') {
    loadCombinedSchedule();
  }
}

function handleRoomCardKeydown(event, roomId) {
  if (!event) return;
  const key = event.key;
  if (key === 'Enter' || key === ' ') {
    event.preventDefault();
    if (typeof window.handleRoomCardClick === 'function') {
      window.handleRoomCardClick(roomId);
      return;
    }
    if (typeof handleRoomCardClick === 'function') handleRoomCardClick(roomId);
  }
}

window.handleRoomCardKeydown = handleRoomCardKeydown;

function handleActivateKeydown(event, callbackName, ...payload) {
  if (!event) return;
  const key = event.key;
  if (key !== 'Enter' && key !== ' ') return;
  event.preventDefault();
  const fn = window[callbackName];
  if (typeof fn === 'function') fn(...payload);
}

// ANCHOR:CLIENT.selectRoom:REPLACE
window.selectRoom = function(room) {
  if (!room) return;

  // Normalize ID
  let roomId = null;
  let roomObj = null;

  if (typeof room === 'object') {
      roomId = String(room.RoomID || room.roomId || room.id).trim();
      roomObj = room;
  } else {
      roomId = String(room).trim();
      // \u0E04\u0E49\u0E19\u0E2B\u0E32 Object \u0E2B\u0E49\u0E2D\u0E07\u0E08\u0E32\u0E01 ID
      if (window.roomsData) {
          roomObj = window.roomsData.find(r => String(r.RoomID || r.roomId) === roomId);
      }
  }

  if (!roomId) return;

  console.log('\uD83C\uDFAF Room Selected (Global):', roomId);

  // \uD83D\uDD25 \u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E15\u0E31\u0E27\u0E41\u0E1B\u0E23 Global
  window.currentRoom = roomId;
  
  // Highlight \u0E01\u0E32\u0E23\u0E4C\u0E14\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01
  const cards = document.querySelectorAll('.room-card');
  cards.forEach(el => {
    const elId = String(el.getAttribute('data-room-id') || '').trim();
    if (elId === roomId) el.classList.add('active');
    else el.classList.remove('active');
  });

  // \u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2B\u0E49\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E2A\u0E48\u0E27\u0E19\u0E2B\u0E31\u0E27
  if (typeof updateSelectedRoomInfo === 'function' && roomObj) {
    updateSelectedRoomInfo(roomObj);
  }
};




  function getRoomErrorHtml(customMessage = null) {
    if (customMessage && typeof customMessage === 'string' && customMessage.length < 100) {
      return `<div class="empty-rooms text-center py-4"><p class="text-warning">${customMessage}</p></div>`;
    }
    
    return `
      <div class="empty-rooms text-center py-4">
        <div class="empty-icon mb-3">
          <i class="fas fa-exclamation-triangle fa-2x text-warning"></i>
        </div>
        <h6 class="text-muted mb-2">\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19</h6>
        <p class="text-muted small mb-3">\u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A:</p>
        <ul class="text-muted small text-start" style="max-width: 300px; margin: 0 auto;">
          <li>\u0E0A\u0E35\u0E15 "Rooms" \u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E30\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25</li>
          <li>Headers: RoomID, RoomName, Capacity, IconName, Location</li>
          <li>\u0E21\u0E35\u0E41\u0E16\u0E27\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 1 \u0E41\u0E16\u0E27</li>
        </ul>
        <div class="mt-3">
          <button class="btn btn-outline-primary btn-sm" onclick="window.debugRoomsData()">
            <i class="fas fa-bug me-1"></i>Debug \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25
          </button>
          <button class="btn btn-outline-secondary btn-sm ms-2" onclick="window.location.reload()">
            <i class="fas fa-sync me-1"></i>\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A
          </button>
        </div>
      </div>`;
  }

  function updateRoomCount() {
    const count = Array.isArray(roomsData) ? roomsData.length : 0;
    
    // Update any room count displays
    const countElements = document.querySelectorAll('[data-room-count]');
    countElements.forEach(el => {
      el.textContent = count;
    });
    
    // Update page subtitle if needed
    const subtitle = document.getElementById('roomSubtitle');
    if (subtitle) {
      if (count === 0) {
        subtitle.textContent = '\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19 - \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A Rooms';
        subtitle.className = 'header-subtitle text-warning';
      } else {
        subtitle.textContent = '\u0E21\u0E2B\u0E32\u0E27\u0E34\u0E17\u0E22\u0E32\u0E25\u0E31\u0E22\u0E2A\u0E27\u0E19\u0E14\u0E38\u0E2A\u0E34\u0E15 \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E25\u0E33\u0E1B\u0E32\u0E07';
        subtitle.className = 'header-subtitle';
      }
    }
  }

  // Debug function - must be defined before DOM ready
  async function debugRoomsData() {
    console.log('\uD83D\uDD27 Manual debug rooms data...');
    
    try {
      showNotification('\u0E01\u0E33\u0E25\u0E31\u0E07\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2B\u0E49\u0E2D\u0E07...', 'info');
      
      // Call backend test function
      const result = await apiCall('testRoomsData', {}, { timeoutMs: 15000 });
      
      console.log('Debug result:', result);
      
      if (result?.success) {
        showNotification(`\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2B\u0E49\u0E2D\u0E07 ${result.roomCount} \u0E2B\u0E49\u0E2D\u0E07`, 'success');
        
        // Force reload from backend
        const initialData = await apiCall('getInitialData');
        if (initialData?.ok && initialData.data) {
          window.__INITIAL__ = initialData;
          loadInitialData();
          renderRooms();
          showNotification('\u0E23\u0E35\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2B\u0E49\u0E2D\u0E07\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08', 'success');
        }
      } else {
        showNotification(result?.message || '\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E14\u0E35\u0E1A\u0E31\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E14\u0E49', 'error');
      }
      
    } catch (error) {
      console.error('Debug error:', error);
      showNotification('\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E14\u0E35\u0E1A\u0E31\u0E01: ' + error.message, 'error');
    }
  }

  // Cache clear function
  async function clearRoomsCache() {
    if (!confirm('\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E25\u0E49\u0E32\u0E07 cache \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2B\u0E49\u0E2D\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48?')) return;
    
    try {
      showNotification('\u0E01\u0E33\u0E25\u0E31\u0E07\u0E25\u0E49\u0E32\u0E07 cache...', 'info');
      
      await apiCall('MANUAL_CLEAR_ROOMS_CACHE');
      
      showNotification('\u0E25\u0E49\u0E32\u0E07 cache \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A\u0E2B\u0E19\u0E49\u0E32\u0E40\u0E1E\u0E08', 'success');
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Clear cache error:', error);
      showNotification('\u0E25\u0E49\u0E32\u0E07 cache \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08: ' + error.message, 'error');
    }
  }

 function callServer(fnName, payload = {}, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    let isDone = false;

    // 1. ตั้งเวลาจับ Timeout
    const timer = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        reject(new Error(`Timeout: Server took longer than ${timeoutMs}ms`));
      }
    }, timeoutMs);

    const url = window.APP_CONFIG && window.APP_CONFIG.API_URL
      ? window.APP_CONFIG.API_URL
      : 'https://script.google.com/macros/s/AKfycby2Zk6Cl6vTr1YTf8zCRjAodngMz9SwlqzyHM4Ygt-cDtYF8nCQWiJlGshQVCkGX-pvAA/exec';

    const requestBody = {
      action: fnName,
      payload: payload
    };

    fetch(url, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      }
    })
    .then(response => {
      if (isDone) return;
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(res => {
      if (isDone) return;
      isDone = true;
      clearTimeout(timer);
      
      // ✅ LOG RESPONSE FOR DEBUGGING ENCODING
      console.log(`📡 API Response [${fnName}]:`, JSON.stringify(res));

      if (typeof berryTouchOnApiSuccess === 'function') {
        berryTouchOnApiSuccess();
      }

      // พยายามแปลง JSON String กลับเป็น Object
      try {
        const parsed = (typeof res === 'string') ? JSON.parse(res) : res;
        resolve(parsed);
      } catch (e) {
        resolve(res);
      }
    })
    .catch(err => {
      if (isDone) return;
      isDone = true;
      clearTimeout(timer);
      reject(new Error(err.message || 'Unknown Server Error'));
    });
  });
 }



function gas(fnName, payload, timeoutMs) {
  return callServer(fnName, payload, timeoutMs);
}

window.showLoading = function(isLoading, message = '\u0E01\u0E33\u0E25\u0E31\u0E07\u0E1B\u0E23\u0E30\u0E21\u0E27\u0E25\u0E1C\u0E25...') {
  // 1. \u0E2B\u0E32\u0E2B\u0E23\u0E37\u0E2D\u0E2A\u0E23\u0E49\u0E32\u0E07 Overlay
  let overlay = document.getElementById('berryLoadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'berryLoadingOverlay';
    overlay.className = 'loading-overlay-glass';
    // Inject Styles \u0E41\u0E1A\u0E1A Inline \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E0A\u0E31\u0E27\u0E23\u0E4C (\u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E41\u0E01\u0E49 CSS)
    overlay.style.cssText = `
      position: fixed; inset: 0;
      background: linear-gradient(180deg, rgba(255,255,255,0.72), rgba(248,250,252,0.84));
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      z-index: 99999; display: none;
      flex-direction: column; align-items: center; justify-content: center;
      transition: opacity 0.2s ease; opacity: 0;
    `;
    overlay.innerHTML = `
      <div class="loading-card-glass d-flex flex-column align-items-center justify-content-center px-4 py-4 rounded-4 shadow-lg bg-white bg-opacity-75 border border-white">
        <div class="spinner-border text-primary" role="status" style="width: 3.5rem; height: 3.5rem; border-width: 0.25em;"></div>
        <div id="berryLoadingMessage" class="mt-3 fw-bold text-dark fs-5 text-center" style="text-shadow: 0 2px 10px rgba(255,255,255,0.8);"></div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const msgEl = document.getElementById('berryLoadingMessage');
  
  if (isLoading) {
    if (msgEl) msgEl.innerText = message;
    overlay.style.display = 'flex';
    // Force reflow
    void overlay.offsetWidth;
    overlay.style.opacity = '1';
    document.body.style.overflow = 'hidden'; // \u0E01\u0E31\u0E19 Scroll
  } else {
    overlay.style.opacity = '0';
    setTimeout(() => {
      // \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E27\u0E48\u0E32\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E23\u0E2D timeout \u0E21\u0E35\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E01 showLoading(true) \u0E2A\u0E27\u0E19\u0E21\u0E32\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48
      if (overlay.style.opacity === '0') {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
      }
    }, 200);
  }
};

// Helper \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1B\u0E34\u0E14 Loading Modal \u0E41\u0E1A\u0E1A\u0E40\u0E01\u0E48\u0E32 (Cleanup Legacy)
function hideLegacyLoadingModal() {
  const oldModal = document.getElementById('loadingModal');
  if (oldModal && typeof bootstrap !== 'undefined') {
    try {
      const instance = bootstrap.Modal.getInstance(oldModal);
      if (instance) instance.hide();
    } catch(e) {}
  }
}

async function apiCall(fnName, payload = {}, options = {}) {
    const { timeoutMs = 25000, signal = null } = options;

    // \u0E16\u0E49\u0E32\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E15\u0E31\u0E49\u0E07\u0E41\u0E15\u0E48\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E23\u0E35\u0E22\u0E01 \u0E01\u0E47\u0E08\u0E1A\u0E40\u0E25\u0E22
    if (signal?.aborted) {
        return Promise.reject(new DOMException('Aborted', 'AbortError'));
    }

    return new Promise((resolve, reject) => {
        // \u0E15\u0E31\u0E27\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E21\u0E35\u0E01\u0E32\u0E23\u0E2A\u0E31\u0E48\u0E07\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01 (Abort)
        const abortHandler = () => {
            reject(new DOMException('Aborted', 'AbortError'));
        };

        // \u0E40\u0E23\u0E34\u0E48\u0E21\u0E1F\u0E31\u0E07\u0E04\u0E33\u0E2A\u0E31\u0E48\u0E07\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01
        if (signal) {
            signal.addEventListener('abort', abortHandler, { once: true });
        }

        // \u0E40\u0E23\u0E35\u0E22\u0E01 Server \u0E08\u0E23\u0E34\u0E07
        callServer(fnName, payload, timeoutMs)
            .then(resolve)
            .catch(reject)
            .finally(() => {
                // \u0E17\u0E33\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E30\u0E2D\u0E32\u0E14\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E08\u0E1A\u0E07\u0E32\u0E19
                if (signal) {
                    signal.removeEventListener('abort', abortHandler);
                }
            });
    });
}


// Export for global usage
window.callServer = callServer;
window.apiCall = apiCall;
window._combinedScheduleAbort = null;
window._timetableAbort = null;


console.log('\u2705 Enhanced API wrapper loaded with message channel protection');
// [ANCHOR:JS:END]
  

  function getRoomIcon(iconName) {
  const iconMap = {
    'classroom': 'fas fa-chalkboard-teacher',
    'lab': 'fas fa-flask',
    'meeting': 'fas fa-users',
    'computer': 'fas fa-desktop',
    'auditorium': 'fas fa-theater-masks',
    'library': 'fas fa-book'
  };
  
  const key = String(iconName || '').toLowerCase().trim();
  return iconMap[key] || 'fas fa-door-open'; // default icon
}

 
  function updateSelectedRoomInfo(room = null) {
    const card = document.getElementById('selectedRoomCard');
    const title = document.getElementById('roomTitle');
    const subtitle = document.getElementById('roomSubtitle');
    
    if (!room && window.currentRoom) room = roomsData.find(r => r.RoomID == window.currentRoom);
    if (room) {
      title.textContent = `${sanitizeText(room.RoomName)}`;
      subtitle.textContent = `มหาวิทยาลัยสวนดุสิต ศูนย์การศึกษาลำปาง`;
      const rName = sanitizeText(room.RoomName);
      document.getElementById('selectedRoomName').textContent = rName.startsWith('ห้อง') ? rName : `ห้อง ${rName}`;
      document.getElementById('selectedRoomCapacity').innerHTML = `<i class="fas fa-users me-1"></i>${sanitizeText(room.Capacity)} ที่นั่ง`;
      document.getElementById('selectedRoomLocation').innerHTML = `<i class="fas fa-map-marker-alt me-1"></i>${sanitizeText(room.Location) || '\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38'}`;
      const selectedRoomIcon = document.getElementById('selectedRoomIcon');
      if (selectedRoomIcon) {
        const iconClasses = getRoomFaIconClasses(room);
        selectedRoomIcon.className = `${iconClasses} fa-2x`;
      }
      
      // \u0E41\u0E2A\u0E14\u0E07\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E1B\u0E47\u0E19 \u0E1E.\u0E28. (9/12/2568)
      const selectedDateInput = document.getElementById('selectedDate');
      if (selectedDateInput && selectedDateInput.value) {
        try {
          const displayDate = formatDateBE(selectedDateInput.value);
          document.getElementById('selectedRoomDate').innerHTML = `<i class="fas fa-calendar me-1"></i>${displayDate}`;
        } catch (e) {
          console.error('Date display error:', e);
          document.getElementById('selectedRoomDate').innerHTML = `<i class="fas fa-calendar me-1"></i>\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48`;
        }
      } else {
        document.getElementById('selectedRoomDate').innerHTML = `<i class="fas fa-calendar me-1"></i>\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48`;
      }
      
      card.style.display = 'block';
    } else {
      title.textContent = '\u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E2D\u0E07\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19';
      subtitle.textContent = '\u0E21\u0E2B\u0E32\u0E27\u0E34\u0E17\u0E22\u0E32\u0E25\u0E31\u0E22\u0E2A\u0E27\u0E19\u0E14\u0E38\u0E2A\u0E34\u0E15 \u0E28\u0E39\u0E19\u0E22\u0E4C\u0E01\u0E32\u0E23\u0E28\u0E36\u0E01\u0E29\u0E32\u0E25\u0E33\u0E1B\u0E32\u0E07';
      card.style.display = 'none';
    }
}



function normalizeDateISOFrontend(dateValue) {
  if (!dateValue) return null;

  if (typeof dateValue === 'string') {
    const s = dateValue.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }

  const d = (typeof parseFlexibleDateFrontend === 'function')
    ? parseFlexibleDateFrontend(dateValue)
    : new Date(dateValue);

  if (!d || isNaN(d.getTime())) return null;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}


function formatThaiDateFrontend(dateValue) {
  if (!dateValue) return '\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48';
  
  let date;
  if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    date = new Date(dateValue);
    if (isNaN(date.getTime())) return '\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07';
    
    // \u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19\u0E1B\u0E35 \u0E1E.\u0E28. \u0E0B\u0E49\u0E33 (\u0E40\u0E0A\u0E48\u0E19 2568 \u2192 2025)
    if (date.getFullYear() > 2400) {
      date.setFullYear(date.getFullYear() - 543);
    }
  }

  const thaiMonths = ['\u0E21\u0E01\u0E23\u0E32\u0E04\u0E21','\u0E01\u0E38\u0E21\u0E20\u0E32\u0E1E\u0E31\u0E19\u0E18\u0E4C','\u0E21\u0E35\u0E19\u0E32\u0E04\u0E21','\u0E40\u0E21\u0E29\u0E32\u0E22\u0E19','\u0E1E\u0E24\u0E29\u0E20\u0E32\u0E04\u0E21','\u0E21\u0E34\u0E16\u0E38\u0E19\u0E32\u0E22\u0E19',
                      '\u0E01\u0E23\u0E01\u0E0E\u0E32\u0E04\u0E21','\u0E2A\u0E34\u0E07\u0E2B\u0E32\u0E04\u0E21','\u0E01\u0E31\u0E19\u0E22\u0E32\u0E22\u0E19','\u0E15\u0E38\u0E25\u0E32\u0E04\u0E21','\u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19','\u0E18\u0E31\u0E19\u0E27\u0E32\u0E04\u0E21'];
  
  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
}

window.currentViewMode = 'day';

function updateBookingSummary() {
  const roomSelect = document.getElementById('roomSelect');
  const bookingDate = document.getElementById('bookingDate');
  const startTime = document.getElementById('startTime');
  const endTime = document.getElementById('endTime');

  const summaryRoom = document.getElementById('summaryRoom');
  const summaryDate = document.getElementById('summaryDate');
  const summaryTime = document.getElementById('summaryTime');

  if (!roomSelect || !bookingDate || !startTime || !endTime || !summaryRoom || !summaryDate || !summaryTime) return;

  const roomText = roomSelect.value
    ? (roomSelect.options[roomSelect.selectedIndex]?.text || '\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E41\u0E25\u0E49\u0E27')
    : '\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01';

  const dateText = bookingDate.value ? formatThaiDate(bookingDate.value) : '-';
  const timeText = (startTime.value && endTime.value)
    ? `${startTime.value} - ${endTime.value}`
    : '-';

  summaryRoom.textContent = `\u0E2B\u0E49\u0E2D\u0E07: ${roomText}`;
  summaryDate.textContent = `\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48: ${dateText}`;
  summaryTime.textContent = `\u0E40\u0E27\u0E25\u0E32: ${timeText}`;
}

function initBookingSummary() {
  const roomSelect = document.getElementById('roomSelect');
  const bookingDate = document.getElementById('bookingDate');
  const startTime = document.getElementById('startTime');
  const endTime = document.getElementById('endTime');
  const bookingModal = document.getElementById('bookingModal');

  if (!roomSelect || !bookingDate || !startTime || !endTime) return;

  const handler = () => updateBookingSummary();

  roomSelect.addEventListener('change', handler);
  bookingDate.addEventListener('change', handler);
  startTime.addEventListener('input', handler);
  endTime.addEventListener('input', handler);

  if (bookingModal) {
    bookingModal.addEventListener('shown.bs.modal', handler);
  }

  handler();
}


function switchTimetableView(mode) {
    console.log('\uD83D\uDCC5 Switch View Mode:', mode);
    window.currentViewMode = mode;
    
    // 1. \u0E1B\u0E23\u0E31\u0E1A\u0E1B\u0E38\u0E48\u0E21\u0E01\u0E14
    ['viewDayBtn', 'viewWeekBtn', 'viewMonthBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if(btn) {
            btn.classList.remove('active', 'btn-primary');
            btn.classList.add('text-secondary');
        }
    });
    
    const activeMap = { day: 'viewDayBtn', week: 'viewWeekBtn', month: 'viewMonthBtn' };
    const activeBtn = document.getElementById(activeMap[mode]);
    if(activeBtn) {
        activeBtn.classList.add('active', 'btn-primary');
        activeBtn.classList.remove('text-secondary');
    }

    // 2. \uD83D\uDD25 BERRY FIX: \u0E1A\u0E31\u0E07\u0E04\u0E31\u0E1A\u0E40\u0E1B\u0E34\u0E14 Grid Container
    const grids = ['timetableGrid', 'weeklyScheduleGrid', 'monthlyScheduleGrid'];
    grids.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.style.display = 'none'; // \u0E0B\u0E48\u0E2D\u0E19\u0E14\u0E49\u0E27\u0E22 Inline Style \u0E0A\u0E31\u0E27\u0E23\u0E4C\u0E2A\u0E38\u0E14
            el.classList.add('d-none');
        }
    });
    
    const targetId = mode === 'day' ? 'timetableGrid' : (mode === 'week' ? 'weeklyScheduleGrid' : 'monthlyScheduleGrid');
    const targetEl = document.getElementById(targetId);
    
    if (targetEl) {
        targetEl.classList.remove('d-none');
        targetEl.style.display = 'block'; // \u0E1A\u0E31\u0E07\u0E04\u0E31\u0E1A\u0E42\u0E0A\u0E27\u0E4C
        targetEl.style.opacity = '1';
    }

    // 3. \u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 (\u0E16\u0E49\u0E32\u0E21\u0E35\u0E2B\u0E49\u0E2D\u0E07\u0E41\u0E25\u0E30\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48)
    if (window.currentRoom && window.currentDate) {
        loadScheduleForRoom(window.currentRoom, window.currentDate);
    }
}

// ANCHOR:CLIENT.loadScheduleForRoom:REPLACE
function loadScheduleForRoom(roomOrId, dateParam) {
    // 1. Resolve Room ID
    let roomId = roomOrId;
    if (typeof roomOrId === 'object' && roomOrId !== null) {
        roomId = roomOrId.RoomID || roomOrId.roomID || roomOrId.id;
        if(typeof updateSelectedRoomInfo === 'function') updateSelectedRoomInfo(roomOrId); 
    } else {
        roomId = String(roomOrId);
        // Update Info UI (\u0E16\u0E49\u0E32\u0E2B\u0E32\u0E40\u0E08\u0E2D\u0E43\u0E19 cache)
        if (window.roomsData && typeof updateSelectedRoomInfo === 'function') {
            const roomObj = window.roomsData.find(r => String(r.RoomID) === roomId);
            if(roomObj) updateSelectedRoomInfo(roomObj);
        }
    }
    
    // \uD83D\uDD25 BERRY FIX: Logic \u0E01\u0E32\u0E23\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 (Priority: Param > Sidebar > Today)
    let targetDateInput = dateParam;
    
    // \u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E21\u0E35\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07 dateParam \u0E21\u0E32 (\u0E40\u0E0A\u0E48\u0E19\u0E01\u0E14\u0E08\u0E32\u0E01 Sidebar) \u0E43\u0E2B\u0E49\u0E43\u0E0A\u0E49\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E08\u0E32\u0E01 Sidebar
    if (!targetDateInput) {
        const dateEl = document.getElementById('selectedDate');
        if (dateEl && dateEl.value) {
            targetDateInput = dateEl.value;
            window.currentDate = dateEl.value; // Sync global \u0E40\u0E09\u0E1E\u0E32\u0E30\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E21\u0E32\u0E08\u0E32\u0E01 Sidebar
        } else {
            targetDateInput = window.currentDate || new Date().toISOString().split('T')[0];
        }
    }

    // 2. Date Object Handling
    let targetDate;
    try {
        targetDate = new Date(targetDateInput);
        if (isNaN(targetDate.getTime())) throw new Error('Invalid Date');
    } catch(e) {
        console.warn('\u26A0\uFE0F Invalid date, fallback to today.');
        targetDate = new Date();
    }

    // Helper: Local ISO (YYYY-MM-DD)
    const getLocalISO = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };
    const dateISO = getLocalISO(targetDate);

    console.log(`\uD83D\uDCC5 Loading Schedule for Room: ${roomId} on ${dateISO} (${window.currentViewMode || 'day'})`);

    // 3. Abort Controller (Cancel request \u0E40\u0E01\u0E48\u0E32)
    if (window._timetableAbort) {
        try { window._timetableAbort.abort(); } catch(e) {}
    }
    window._timetableAbort = new AbortController();
    const currentAbortId = Date.now(); 
    window._lastReqId = currentAbortId;

    // UI Helper: Prepare Grid Container
    const setupGrid = (activeId, msg) => {
        const ids = ['timetableGrid', 'weeklyScheduleGrid', 'monthlyScheduleGrid'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === activeId) {
                    el.classList.remove('d-none');
                    el.style.display = 'block';
                    
                    // Show Loading Spinner
                    const roomName = (window.roomsData && window.roomsData.find(r => String(r.RoomID) === roomId)?.RoomName) || roomId;
                    el.innerHTML = `
                        <div class="alert alert-info border-0 shadow-sm rounded-4 mb-3 d-flex align-items-center animate-fade-in">
                            <div class="bg-white text-info rounded-circle p-2 me-3 shadow-sm">
                                <i class="fas fa-hand-pointer fa-lg"></i>
                            </div>
                            <div>
                                <h6 class="fw-bold mb-0 text-dark">\u0E2B\u0E49\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01: <span class="text-primary">${roomName}</span></h6>
                                <p class="mb-0 small text-muted">\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25...</p>
                            </div>
                        </div>
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary"></div>
                            <p class="mt-2 text-muted">${msg}</p>
                        </div>`;
                } else {
                    el.classList.add('d-none');
                    el.style.display = 'none';
                }
            }
        });
        return document.getElementById(activeId);
    };

    // ==========================================
    // Switch Loading Logic based on View Mode
    // ==========================================
    
    // 1. DAY VIEW
    if (!window.currentViewMode || window.currentViewMode === 'day') {
        const grid = setupGrid('timetableGrid', '\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E23\u0E32\u0E22\u0E27\u0E31\u0E19...');
        google.script.run
            .withSuccessHandler((res) => {
                if (window._lastReqId !== currentAbortId) return; 
                if (res.ok) {
                    if (typeof renderTimetable === 'function') {
                        renderTimetable(res.data.slots || []);
                    } else if (typeof renderTimetableDayGrid === 'function') {
                        renderTimetableDayGrid(res.data.slots || []);
                    }
                } else {
                    if(grid) grid.innerHTML = `<div class="alert alert-warning m-3 text-center">${res.error || '\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25'}</div>`;
                }
            })
            .withFailureHandler((err) => {
                if(grid) grid.innerHTML = `<div class="alert alert-danger m-3 text-center">\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14: ${err.message}</div>`;
            })
            .getRoomSchedule({ roomId: roomId, dateISO: dateISO }); 
        return;
    }

    // 2. WEEK VIEW
    if (window.currentViewMode === 'week') {
        const weekGrid = setupGrid('weeklyScheduleGrid', '\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E23\u0E32\u0E22\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C...');
        
        // Calculate Monday - Sunday
        const current = new Date(targetDate);
        const day = current.getDay(); // 0=Sun, 1=Mon
        const diff = current.getDate() - day + (day == 0 ? -6 : 1); // Adjust to Monday
        const monday = new Date(current);
        monday.setDate(diff);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        if (weekGrid) weekGrid.setAttribute('aria-busy', 'true');
        const finishWeekLoad = () => {
            if (weekGrid) weekGrid.removeAttribute('aria-busy');
        };

        google.script.run
            .withSuccessHandler((res) => {
                if (window._lastReqId !== currentAbortId) return;
                finishWeekLoad();
                if (res.ok) {
                    if (isMonthAgendaViewport() && typeof renderTimetableWeekAgenda === 'function') {
                        renderTimetableWeekAgenda(res.data.slots || [], monday);
                    } else if (typeof renderWeeklyGridV2 === 'function') {
                        renderWeeklyGridV2(monday, res.data.slots || []);
                    } else if (typeof renderTimetableWeekGrid === 'function') {
                        renderTimetableWeekGrid(res.data.slots || [], monday);
                    }
                } else {
                    if(weekGrid) weekGrid.innerHTML = `<div class="alert alert-warning m-3 text-center">${res.error}</div>`;
                }
            })
            .withFailureHandler((err) => {
                if (window._lastReqId !== currentAbortId) return;
                finishWeekLoad();
                if(weekGrid) weekGrid.innerHTML = `<div class="alert alert-danger m-3 text-center">เกิดข้อผิดพลาด: ${err.message || err}</div>`;
            })
            .getRoomScheduleRange({ 
                roomId: roomId, 
                startDate: getLocalISO(monday), 
                endDate: getLocalISO(sunday) 
            });
        return;
    }

    // 3. MONTH VIEW (Target Fix)
    if (window.currentViewMode === 'month') {
        const monthGrid = setupGrid('monthlyScheduleGrid', '\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E23\u0E32\u0E22\u0E40\u0E14\u0E37\u0E2D\u0E19...');
        
        // Calculate 1st and Last Day of Month
        const y = targetDate.getFullYear();
        const m = targetDate.getMonth();
        const firstDay = new Date(y, m, 1);
        const lastDay = new Date(y, m + 1, 0); // Day 0 of next month = Last day of this month
        
        google.script.run
            .withSuccessHandler((res) => {
                if (window._lastReqId !== currentAbortId) return;
                if (res.ok) {
                    // Render with firstDay to ensure grid is correct
                    if (isMonthAgendaViewport() && typeof window.renderTimetableMonthAgenda === 'function') {
                        window.renderTimetableMonthAgenda(res.data.slots || [], firstDay);
                    } else if (typeof window.renderTimetableMonthGrid === 'function') {
                        window.renderTimetableMonthGrid(res.data.slots || [], firstDay);
                    } else if (typeof renderTimetableMonthGrid === 'function') {
                        renderTimetableMonthGrid(res.data.slots || [], firstDay);
                    } else if (typeof renderMonthlyGrid === 'function') {
                        // Fallback alias
                        renderMonthlyGrid(firstDay, res.data.slots || []);
                    }
                } else {
                    if(monthGrid) monthGrid.innerHTML = `<div class="alert alert-warning m-3 text-center">${res.error}</div>`;
                }
            })
            .withFailureHandler((err) => {
                if (window._lastReqId !== currentAbortId) return;
                if (monthGrid) {
                    monthGrid.innerHTML = `<div class="alert alert-danger m-3 text-center">เกิดข้อผิดพลาด: ${(err && err.message) || err}</div>`;
                }
            })
            .getRoomScheduleRange({ 
                roomId: roomId, 
                startDate: getLocalISO(firstDay), 
                endDate: getLocalISO(lastDay) 
            });
    }
}
// ANCHOR:CLIENT.loadScheduleForRoom:END

// Helper Function: Inject Helper Message (Re-inject after render)
function injectHelperMessage(containerId, roomId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Check duplicate
    if (container.querySelector('.alert-info-helper')) return;

    const roomName = (window.roomsData && window.roomsData.find(r => String(r.RoomID) === roomId)?.RoomName) || roomId;
    const alertDiv = document.createElement('div');
    alertDiv.className = "alert alert-info border-0 shadow-sm rounded-4 mb-3 d-flex align-items-center animate-fade-in alert-info-helper";
    alertDiv.innerHTML = `
        <div class="bg-white text-info rounded-circle p-2 me-3 shadow-sm" style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-hand-pointer fa-lg"></i>
        </div>
        <div>
            <h6 class="fw-bold mb-0 text-dark">\u0E2B\u0E49\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01: <span class="text-primary">${roomName}</span></h6>
            <p class="mb-0 small text-muted">\u0E41\u0E2A\u0E14\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2B\u0E49\u0E2D\u0E07\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19 \u0E04\u0E25\u0E34\u0E01\u0E17\u0E35\u0E48 <strong>"\u0E2B\u0E19\u0E49\u0E32\u0E2B\u0E25\u0E31\u0E01 (\u0E08\u0E2D\u0E07\u0E2B\u0E49\u0E2D\u0E07)"</strong> \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E14\u0E39\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14</p>
        </div>`;
        
    // Insert at top
    container.insertBefore(alertDiv, container.firstChild);
}
// ANCHOR:CLIENT.loadScheduleForRoom:END
// ============================================================
// 1. ฟังก์ชันหลัก: เปิดฟอร์มจอง (Core Function)
// ============================================================
window.showBookingForm = function(roomIdParam = null) {
    // 1. หาห้องที่จะจอง (Priority: Parameter > Global Variable)
    const targetRoomId = roomIdParam || window.currentRoom;
    console.log('📝 Opening Booking Form. Target Room:', targetRoomId);
    
    // 2. เตรียมฟอร์ม (Reset ค่าเก่า)
    const form = document.getElementById('bookingForm');
    if(form) {
        form.reset();
        form.classList.remove('was-validated');
    }
    if (typeof clearFileList === 'function') clearFileList();
    
    // Setup pre-validation conflict listeners
    const conflictInputs = ['roomSelect', 'bookingDate', 'startTime', 'endTime'];
    conflictInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.removeEventListener('change', window.checkBookingConflicts);
            el.addEventListener('change', window.checkBookingConflicts);
            
            el.removeEventListener('input', window.checkBookingConflicts);
            el.addEventListener('input', window.checkBookingConflicts);
        }
    });
    // Hide conflict alert initially
    const alertEl = document.getElementById('bookingConflictAlert');
    if (alertEl) alertEl.classList.add('d-none');

    // 3. 🔥 เรียก Update Dropdown พร้อมส่ง Target Room ไปเลย! (สำคัญมาก)
    if (typeof window.updateRoomOptions === 'function') {
        window.updateRoomOptions(null, targetRoomId);
    }
    
    // 4. จัดการวันที่ (ใช้วันที่ปัจจุบันถ้าไม่มีค่า)
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) {
        if (!dateInput.value && window.currentDate) {
            dateInput.value = window.currentDate;
        }
        
        // Hack: Clone เพื่อล้าง Event Listener เก่า และกระตุ้นการแสดงผล Badge พ.ศ.
        const newDateInput = dateInput.cloneNode(true);
        dateInput.parentNode.replaceChild(newDateInput, dateInput);
        
        // ผูกฟังก์ชันแสดง พ.ศ.
        newDateInput.addEventListener('change', function() {
            if(typeof updateDateInputDisplay === 'function') updateDateInputDisplay(this);
        });
        
        // แสดงผลทันที
        if(typeof updateDateInputDisplay === 'function') updateDateInputDisplay(newDateInput);
    }

    // 5. เปิด Modal
    const modalEl = document.getElementById('bookingModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    } else {
        console.warn('bookingModal not found');
        return false;
    }

    return true;
};
// 2. \u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19\u0E40\u0E2A\u0E23\u0E34\u0E21: \u0E40\u0E1B\u0E34\u0E14\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E23\u0E30\u0E1A\u0E38\u0E27\u0E31\u0E19\u0E40\u0E27\u0E25\u0E32 (Helper for Calendar)
// ============================================================
// [ANCHOR:CLIENT.showBookingFormWithDate:REPLACE]
window.showBookingFormWithDate = function(dateISO, startTime = '', endTime = '', roomId = '') {
  console.log('\uD83D\uDCC5 Quick Booking Triggered:', { dateISO, startTime, endTime, roomId });

  // \u2705 fallback room
  const targetRoom = roomId || window.currentRoom || '';

  // 1) \u0E40\u0E1B\u0E34\u0E14 Modal \u0E1C\u0E48\u0E32\u0E19\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19\u0E2B\u0E25\u0E31\u0E01
  if (typeof window.showBookingForm === 'function') {
    window.showBookingForm(targetRoom);
  } else {
    console.warn('\u26A0\uFE0F showBookingForm() not found');
    return false;
  }

  // 2) \u0E23\u0E2D DOM \u0E1E\u0E23\u0E49\u0E2D\u0E21 (retry \u0E40\u0E1A\u0E32 \u0E46 \u0E01\u0E31\u0E19\u0E21\u0E37\u0E2D\u0E16\u0E37\u0E2D/\u0E42\u0E2B\u0E25\u0E14\u0E0A\u0E49\u0E32)
  let tries = 0;
  const maxTries = 10;      // ~2s
  const intervalMs = 200;

  const timer = setInterval(() => {
    tries++;

    const dateEl = document.getElementById('bookingDate');
    const startEl = document.getElementById('startTime');
    const endEl = document.getElementById('endTime');

    // \u2705 modal \uC544\uC9C1\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21
    if (!dateEl || !startEl || !endEl) {
      if (tries >= maxTries) {
        clearInterval(timer);
        console.warn('\u26A0\uFE0F Quick booking: form elements not ready', { tries });
      }
      return;
    }

    // \u2705 set values
    if (dateISO) {
      dateEl.value = dateISO;
      // \u0E01\u0E23\u0E30\u0E15\u0E38\u0E49\u0E19 format / \u0E1E.\u0E28.
      dateEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (startTime) startEl.value = startTime;
    if (endTime) endEl.value = endTime;

    // 3) \u0E22\u0E49\u0E33\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2B\u0E49\u0E2D\u0E07\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07 (\u0E01\u0E31\u0E19 dropdown \u0E42\u0E2B\u0E25\u0E14\u0E0A\u0E49\u0E32)
    if (targetRoom && typeof window.updateRoomOptions === 'function') {
      try {
        window.updateRoomOptions(window.roomsData, targetRoom);
      } catch (e) {
        try { window.updateRoomOptions(null, targetRoom); } catch (e2) {}
      }
    }

    clearInterval(timer);
    console.log('\u2705 Quick booking: form prefilled', { dateISO, startTime, endTime, targetRoom });

  }, intervalMs);

  return true;
};


// --- Weekly Grid V2 (\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E0A\u0E37\u0E48\u0E2D\u0E2D\u0E32\u0E08\u0E32\u0E23\u0E22\u0E4C & \u0E04\u0E25\u0E34\u0E01\u0E08\u0E2D\u0E07) ---
function renderWeeklyGrid_V2(mondayDate, slots) {
    const container = document.getElementById('weeklyScheduleGrid');
    const startHour = 8;
    const endHour = 18;
    const hourHeight = 60;
    
    // Generate Dates
    const weekDates = [];
    for(let i=0; i<5; i++) {
        const d = new Date(mondayDate);
        d.setDate(mondayDate.getDate() + i);
        weekDates.push({ date: formatDateISO_JS(d), day: d.getDate(), name: ['\u0E08.','\u0E2D.','\u0E1E.','\u0E1E\u0E24.','\u0E28.'][i] });
    }

    let html = `<div class="weekly-calendar-wrapper"><div class="weekly-calendar">
        <div class="cal-header text-muted small">\u0E40\u0E27\u0E25\u0E32</div>`;
    
    // Headers
    weekDates.forEach(d => {
        const isToday = formatDateISO_JS(new Date()) === d.date;
        html += `<div class="cal-header ${isToday ? 'today' : ''}">
                    <div class="small opacity-75">${d.name}</div>
                    <div class="fs-5">${d.day}</div>
                 </div>`;
    });

    // Time Column
    html += `<div class="cal-time-col">`;
    for(let h=startHour; h<=endHour; h++) html += `<div class="cal-time-label" style="height:${hourHeight}px"><span>${h}:00</span></div>`;
    html += `</div>`;

    // Days Columns
    weekDates.forEach(dayObj => {
        html += `<div class="cal-day-col" onclick="handleEmptyClickWeek(event, '${dayObj.date}')">`;
        
        // Lines
        for(let h=startHour; h<=endHour; h++) html += `<div class="cal-grid-line" style="top:${(h-startHour)*hourHeight}px"></div>`;

        // Slots
        const daySlots = slots.filter(s => s.date === dayObj.date);
        daySlots.forEach(slot => {
            const [sh, sm] = slot.start.split(':').map(Number);
            const [eh, em] = slot.end.split(':').map(Number);
            const startVal = sh + sm/60;
            const endVal = eh + em/60;
            const top = (startVal - startHour) * hourHeight;
            const height = (endVal - startVal) * hourHeight;
            
            // Style Class
            let cls = 'class';
            if(slot.type === 'booking') cls = slot.status === 'approved' ? 'approved' : 'pending';

            html += `<div class="cal-event ${cls}" style="top:${top}px; height:${height}px;"
                          onclick="event.stopPropagation(); showEventDetail('${slot.type}', '${sanitizeText(slot.title)}', '${slot.start}-${slot.end}', '${slot.bookingId||''}', '${sanitizeText(slot.teacherName || slot.instructor || slot.booker || '')}')"
                          title="${slot.title}">
                        <div class="cal-event-time">${slot.start}-${slot.end}</div>
                        <div class="cal-event-title">${sanitizeText(slot.title)}</div>
                        <div class="cal-event-instructor booking-teacher"><i class="fas fa-chalkboard-teacher me-1 opacity-60"></i>👨‍🏫 ${sanitizeText(slot.teacherName || slot.instructor || slot.booker || '-')}
                     </div>`;
        });
        html += `</div>`;
    });
    html += `</div></div>`;
    container.innerHTML = html;
}

// --- Monthly Grid ---
function renderMonthlyGrid(firstDate, slots) {
    // 📱 MOBILE FALLBACK: เปลี่ยนเส้นทางไปใช้ renderTimetableMonthGrid เพื่อแสดง Agenda Card View บนมือถือ
    if (isMonthAgendaViewport() && typeof window.renderTimetableMonthAgenda === 'function') {
        window.renderTimetableMonthAgenda(slots, firstDate);
        return;
    }
    const container = document.getElementById('monthlyScheduleGrid');
    const monthNames = ['\u0E21\u0E01\u0E23\u0E32\u0E04\u0E21','\u0E01\u0E38\u0E21\u0E20\u0E32\u0E1E\u0E31\u0E19\u0E18\u0E4C','\u0E21\u0E35\u0E19\u0E32\u0E04\u0E21','\u0E40\u0E21\u0E29\u0E32\u0E22\u0E19','\u0E1E\u0E24\u0E29\u0E20\u0E32\u0E04\u0E21','\u0E21\u0E34\u0E16\u0E38\u0E19\u0E32\u0E22\u0E19','\u0E01\u0E23\u0E01\u0E0E\u0E32\u0E04\u0E21','\u0E2A\u0E34\u0E07\u0E2B\u0E32\u0E04\u0E21','\u0E01\u0E31\u0E19\u0E22\u0E32\u0E22\u0E19','\u0E15\u0E38\u0E25\u0E32\u0E04\u0E21','\u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19','\u0E18\u0E31\u0E19\u0E27\u0E32\u0E04\u0E21'];
    const y = firstDate.getFullYear();
    const m = firstDate.getMonth();
    
    let html = `<div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="fw-bold text-primary mb-0">${monthNames[m]} ${y+543}</h5>
                </div>`;
    
    html += `<div class="monthly-calendar">`;
    ['\u0E2D\u0E32.','\u0E08.','\u0E2D.','\u0E1E.','\u0E1E\u0E24.','\u0E28.','\u0E2A.'].forEach(d => html += `<div class="month-header">${d}</div>`);

    const startDay = firstDate.getDay(); 
    const prevMonthLastDate = new Date(y, m, 0).getDate();
    for(let i=0; i<startDay; i++) {
        const prevDateNum = prevMonthLastDate - startDay + 1 + i;
        html += `<div class="month-cell disabled"><div class="month-date text-muted opacity-40">${prevDateNum}</div></div>`;
    }

    const lastDate = new Date(y, m+1, 0).getDate();
    for(let d=1; d<=lastDate; d++) {
        const currentIso = formatDateISO_JS(new Date(y, m, d));
        const daySlots = slots.filter(s => s.date === currentIso);
        const isToday = formatDateISO_JS(new Date()) === currentIso;
        
        daySlots.sort((a,b) => a.start.localeCompare(b.start));

        html += `<div class="month-cell ${isToday?'today':''}" onclick="showBookingFormWithDate('${currentIso}')">
                    <div class="month-date">${d}</div>
                    <div class="month-events">`;
        
        daySlots.forEach(s => {
            const isClass = (s.type === 'class');
            const isApproved = (s.status === 'approved');
            const colorClass = isClass ? 'bg-dark text-white' : (isApproved ? 'bg-success text-white' : 'bg-warning text-dark');
            const timeText = `${s.start || '-'} - ${s.end || '-'}`;
            const typeLabel = isClass ? 'ตารางสอน' : (isApproved ? 'อนุมัติแล้ว' : 'รออนุมัติ');
            const instructorText = s.teacherName || s.instructor || s.booker || '-';
            const tooltipContent = `[${typeLabel}] ${sanitizeText(s.title)}\nเวลา: ${timeText} น.\nผู้สอน/ผู้จอง: ${sanitizeText(instructorText)}`;
            
            html += `<div class="month-event-bar d-flex align-items-center justify-content-center gap-1 rounded-2 px-2 py-1 ${colorClass}" 
                          style="font-size: 0.72rem; font-weight: 600; margin: 1px 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; border: 1px solid rgba(0,0,0,0.08);"
                          title="${tooltipContent}"
                          onclick="event.stopPropagation(); showEventDetail('${s.type}', '${sanitizeText(s.title)}', '${s.start}-${s.end}', '${s.bookingId||''}', '${sanitizeText(s.teacherName || s.instructor || s.booker || '')}')">
                        <i class="far fa-clock" style="font-size:0.65rem; opacity:0.85;"></i>
                        <span class="font-monospace">${formatShortTimeRange(s.start, s.end)}</span>
                     </div>`;
        });
        html += `</div></div>`;
    }
    
    const totalCellsUsed = startDay + lastDate;
    const totalCellsNeeded = Math.ceil(totalCellsUsed / 7) * 7;
    const nextMonthDaysNeeded = totalCellsNeeded - totalCellsUsed;
    for (let d = 1; d <= nextMonthDaysNeeded; d++) {
        html += `<div class="month-cell disabled"><div class="month-date text-muted opacity-40">${d}</div></div>`;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

// Helpers
function formatDateISO_JS(date) {
    const offset = date.getTimezoneOffset();
    date = new Date(date.getTime() - (offset*60*1000));
    return date.toISOString().split('T')[0];
}

function formatShortTimeRange(start, end) {
    if (!start || !end) return '';
    const formatTime = (t) => {
        const parts = String(t).trim().split(':');
        const h = parts[0].padStart(2, '0');
        const m = parts[1] || '00';
        if (m === '00') return h;
        return `${h}:${m}`;
    };
    return `${formatTime(start)}-${formatTime(end)} น.`;
}

function handleEmptyClickWeek(e, dateIso) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hourHeight = 60;
    const startHour = 8;
    const clickHour = Math.floor(y / hourHeight) + startHour;
    
    showBookingFormWithDate(dateIso, `${String(clickHour).padStart(2,'0')}:00`, `${String(clickHour+1).padStart(2,'0')}:00`);
}


// ANCHOR:CLIENT.Logic:END
  
  // ANCHOR:CLIENT.coachmarks:START
function handleCoachmarks() {
  const COACHMARK_ID = 'timetableCardCoachmarkDismissed';
  
  if (localStorage.getItem(COACHMARK_ID)) {
    return; // User has already dismissed this
  }

  // Use an observer to wait until the timetable is rendered
  const timetableGrid = document.getElementById('timetableGrid');
  if (!timetableGrid) return;

  const observer = new MutationObserver((mutationsList, obs) => {
    const firstSlot = timetableGrid.querySelector('.time-slot[data-booking-id]');
    if (firstSlot) {
      // Create and show the coachmark bubble
      const bubble = document.createElement('div');
      bubble.className = 'coachmark-bubble';
      bubble.innerHTML = `
        <div class="coachmark-content">
          <p class="coachmark-text"><strong>\u0E40\u0E04\u0E25\u0E47\u0E14\u0E25\u0E31\u0E1A:</strong> \u0E01\u0E32\u0E23\u0E4C\u0E14\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E15\u0E48\u0E32\u0E07\u0E46 \u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E04\u0E25\u0E34\u0E01\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E14\u0E39\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21\u0E44\u0E14\u0E49</p>
          <button class="btn btn-primary btn-sm">\u0E23\u0E31\u0E1A\u0E17\u0E23\u0E32\u0E1A</button>
        </div>
      `;
      document.body.appendChild(bubble);

      // Position the bubble relative to the first slot
      const rect = firstSlot.getBoundingClientRect();
      bubble.style.top = `${rect.bottom + 10}px`;
      bubble.style.left = `${rect.left}px`;
      
      bubble.querySelector('button').addEventListener('click', () => {
        localStorage.setItem(COACHMARK_ID, 'true');
        bubble.remove();
      });

      obs.disconnect(); // We're done, stop observing
    }
  });

  observer.observe(timetableGrid, { childList: true, subtree: true });
}
// ANCHOR:CLIENT.coachmarks:END

// ANCHOR:CLIENT.renderTimetableGrids:NEW

// 1. Day View (Timeline 08:00 - 18:00)
// ANCHOR:CLIENT.renderTimetableGrids:NEW
// 1. Day View (Timeline 08:00 - 18:00) with Navigation
function renderTimetableDayGrid(slots) {
    // Cache slots for resizing
    window._daySlotsCache = slots;

    if (isMonthAgendaViewport() && typeof renderTimetableDayAgenda === 'function') {
        return renderTimetableDayAgenda(slots);
    }

    const container = document.getElementById('timetableGrid');
    if (!container) return;

    // 1. Prepare Date Header
    let currentIso = window.currentDate || new Date().toISOString().split('T')[0];
    let dateObj = new Date(currentIso);
    if(isNaN(dateObj.getTime())) dateObj = new Date(); // Fallback

    const dateLabel = dateObj.toLocaleDateString('th-TH', { 
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
    });

    // 2. Build HTML Header
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3 px-3 bg-white rounded-pill shadow-sm py-2 border">
            <button class="btn btn-sm btn-outline-primary rounded-circle border-0" 
                    onclick="changeTimetableDay(-1)" title="\u0E27\u0E31\u0E19\u0E01\u0E48\u0E2D\u0E19\u0E2B\u0E19\u0E49\u0E32">
                <i class="fas fa-chevron-left"></i>
            </button>
            
            <h5 class="fw-bold text-primary mb-0 user-select-none text-center" style="font-size: 1rem;">
                <i class="fas fa-calendar-day me-2 opacity-50"></i>${dateLabel}
            </h5>
            
            <button class="btn btn-sm btn-outline-primary rounded-circle border-0" 
                    onclick="changeTimetableDay(1)" title="\u0E27\u0E31\u0E19\u0E16\u0E31\u0E14\u0E44\u0E1B">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;

    // 3. Render Slots or Empty State
    if (!slots || slots.length === 0) {
        html += `
            <div class="text-center py-5 text-muted opacity-50 bg-white rounded-4 border border-dashed">
                <i class="fas fa-calendar-check fa-4x mb-3 text-secondary bg-light rounded-circle p-3"></i>
                <h5 class="fw-bold">\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49\u0E2B\u0E49\u0E2D\u0E07\u0E27\u0E48\u0E32\u0E07\u0E15\u0E25\u0E2D\u0E14\u0E27\u0E31\u0E19</h5>
                <p class="small">\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E15\u0E32\u0E23\u0E32\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19</p>
                <button class="btn btn-primary rounded-pill mt-2 btn-sm px-4 shadow-sm" onclick="showBookingForm()">
                    <i class="fas fa-plus-circle me-2"></i>\u0E08\u0E2D\u0E07\u0E2B\u0E49\u0E2D\u0E07\u0E19\u0E35\u0E49
                </button>
            </div>`;
    } else {
        // Sort by Time
        slots.sort((a,b) => String(a.start).localeCompare(String(b.start)));

        html += `<div class="timeline-container d-flex flex-column gap-3">`;
        slots.forEach(s => {
            const isClass = s.type === 'class';
            // \u0E1B\u0E23\u0E31\u0E1A\u0E2A\u0E35\u0E43\u0E2B\u0E49\u0E0A\u0E31\u0E14\u0E40\u0E08\u0E19\u0E02\u0E36\u0E49\u0E19\u0E15\u0E32\u0E21 Theme Berry
            const colorClass = isClass 
                ? 'border-start border-4 border-dark bg-light' 
                : (s.status === 'approved' 
                    ? 'border-start border-4 border-success bg-success bg-opacity-10 text-success-emphasis' 
                    : 'border-start border-4 border-warning bg-warning bg-opacity-10');
            
            const badge = isClass 
                ? '<span class="badge bg-secondary text-white">\u0E15\u0E32\u0E23\u0E32\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19</span>' 
                : (s.status === 'approved' 
                    ? '<span class="badge bg-success">\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34</span>' 
                    : '<span class="badge bg-warning text-dark">\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34</span>');

            html += `
            <div class="card border-0 shadow-sm ${colorClass} cursor-pointer hover-up transition-all" tabindex="0" 
                 onclick="showEventDetail('${s.type}', '${sanitizeText(s.title)}', '${s.start}-${s.end}', '${s.bookingId||''}', '${sanitizeText(s.teacherName || s.instructor || s.booker || '')}')"
                 onkeydown="handleActivateKeydown(event, 'showEventDetail', '${s.type}', '${sanitizeText(s.title)}', '${s.start}-${s.end}', '${s.bookingId||''}', '${sanitizeText(s.teacherName || s.instructor || s.booker || '')}')">
                <div class="card-body p-3 d-flex align-items-center">
                    <div class="me-3 pe-3 border-end text-center" style="min-width: 85px;">
                        <div class="fw-bold fs-5 font-monospace text-dark">${s.start}</div>
                        <div class="text-muted small font-monospace">${s.end}</div>
                    </div>
                    <div class="flex-grow-1 min-w-0">
                        <div class="d-flex align-items-center gap-2 mb-1">
                            ${badge}
                            <h6 class="mb-0 fw-bold text-dark text-truncate booking-title">${sanitizeText(s.title)}</h6>
                        </div>
                        <div class="text-muted small text-truncate">
                            👨‍🏫 ${sanitizeText(s.teacherName || s.instructor || s.booker || '-')}
                        </div>
                    </div>
                    <div class="ms-2 text-secondary opacity-50">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            </div>`;
        });
        html += `</div>`;
    }

    container.innerHTML = html;
}

// =============================================================
// 📱 MOBILE: Day Agenda Card View (< 768px)
// Mirrors Month Agenda style — reuses .month-agenda-* classes
// =============================================================
function renderTimetableDayAgenda(slots) {
    // Cache slots for resizing
    window._daySlotsCache = slots;

    const container = document.getElementById('timetableGrid');
    if (!container) return;

    const safeText = (v) => (typeof sanitizeText === 'function') ? sanitizeText(v) : String(v || '');
    const safeJsArg = (v) => JSON.stringify(String(v == null ? '' : v))
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Date header
    let currentIso = window.currentDate || new Date().toISOString().split('T')[0];
    let dateObj = new Date(currentIso);
    if (isNaN(dateObj.getTime())) dateObj = new Date();
    const dateLabel = dateObj.toLocaleDateString('th-TH', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3 px-2 bg-white rounded-pill shadow-sm py-2 border">
            <button class="btn btn-sm btn-outline-primary rounded-circle border-0 ms-1"
                    onclick="changeTimetableDay(-1)" style="min-width:44px;min-height:44px;">
                <i class="fas fa-chevron-left"></i>
            </button>
            <h5 class="fw-bold text-primary mb-0 user-select-none text-center" style="font-size:0.9rem;">
                <i class="fas fa-calendar-day me-2 opacity-50"></i>${dateLabel}
            </h5>
            <button class="btn btn-sm btn-outline-primary rounded-circle border-0 me-1"
                    onclick="changeTimetableDay(1)" style="min-width:44px;min-height:44px;">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div class="month-agenda-view">`;

    const safeslots = Array.isArray(slots) ? slots : [];
    if (safeslots.length === 0) {
        html += `
            <div class="month-agenda-empty">
                <i class="fas fa-calendar-check fa-2x mb-2" style="opacity:0.4;"></i>
                <h6>\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49\u0E2B\u0E49\u0E2D\u0E07\u0E27\u0E48\u0E32\u0E07\u0E15\u0E25\u0E2D\u0E14\u0E27\u0E31\u0E19</h6>
                <p>\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E15\u0E32\u0E23\u0E32\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19</p>
                <button class="btn btn-primary btn-sm rounded-pill px-4 fw-bold mt-2 shadow-sm"
                        style="min-height:44px;" onclick="showBookingForm()">
                    <i class="fas fa-plus-circle me-1"></i>\u0E08\u0E2D\u0E07\u0E2B\u0E49\u0E2D\u0E07\u0E19\u0E35\u0E49
                </button>
            </div>`;
    } else {
        safeslots.sort((a,b) => String(a.start||'').localeCompare(String(b.start||'')));
        // Day agenda uses a single section (already scoped to one day)
        html += `
            <section class="month-agenda-day-card">
                <div class="month-agenda-day-header">
                    <span class="month-agenda-day-icon">📅</span>
                    <span class="month-agenda-day-title">${dateLabel}</span>
                </div>
                <div class="month-agenda-event-list">`;
        safeslots.forEach((s) => {
            const timeText = `${s.start||'-'} - ${s.end||'-'}`;
            const rawTimeRange = `${s.start||''}-${s.end||''}`;
            const hour = parseInt(String(s.start||'0').split(':')[0], 10);
            const icon = hour < 12 ? '🕘' : '🕐';
            const displayTeacher = s.teacherName || s.instructor || s.booker || '-';
            const instructorLine = `<span class="d-block booking-teacher" style="font-size:0.82rem;color:#64748b;margin-top:0.2rem;">👨‍🏫 ${safeText(displayTeacher)}</span>`;
            const isClass = s.type === 'class';
            const statusClass = isClass ? 'month-schedule-event-bar--class' : (s.status === 'approved' ? 'month-schedule-event-bar--approved' : 'month-schedule-event-bar--pending');
            html += `
                <button type="button" class="month-agenda-event ${statusClass}"
                        onclick="showEventDetail(${safeJsArg(s.type)}, ${safeJsArg(s.title)}, ${safeJsArg(rawTimeRange)}, ${safeJsArg(s.bookingId||'')}, ${safeJsArg(s.teacherName || s.instructor || s.booker || '')})">
                    <span class="month-agenda-event-time">${icon} ${safeText(timeText)}</span>
                    <span class="month-agenda-event-title">${safeText(s.title||'\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E0A\u0E37\u0E48\u0E2D\u0E27\u0E34\u0E0A\u0E32')}</span>
                    ${instructorLine}
                </button>`;
        });
        html += `
                </div>
            </section>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}

// --- Helper: สร้าง Date String แบบ Local (ไม่เปลี่ยนตาม Timezone) ---
function toLocalISOString(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

window.renderTimetableWeekGrid = function(arg1, arg2) {
    // Smart Args Check
    let slots, mondayDateInput;
    if (Array.isArray(arg1)) { slots = arg1; mondayDateInput = arg2; }
    else if (Array.isArray(arg2)) { slots = arg2; mondayDateInput = arg1; }
    else { slots = []; mondayDateInput = arg1 || arg2 || new Date(); }
    if (!slots) slots = [];

    let mondayDate = (mondayDateInput instanceof Date) ? mondayDateInput : new Date(mondayDateInput);
    if (isNaN(mondayDate.getTime())) mondayDate = new Date();

    // Cache slots and mondayDate
    window._weekSlotsCache = slots;
    window._weekMondayCache = mondayDate;
    window._currentWeekDisplayDate = new Date(mondayDate);

    if (isMonthAgendaViewport() && typeof renderTimetableWeekAgenda === 'function') {
        return renderTimetableWeekAgenda(slots, mondayDate);
    }

    const container = document.getElementById('weeklyScheduleGrid');
    if (!container) return;

    const startHour = 8;
    const endHour = 18;
    const daysTh = ['\u0E08.', '\u0E2D.', '\u0E1E.', '\u0E1E\u0E24.', '\u0E28.', '\u0E2A.', '\u0E2D\u0E32.'];
    const dayColors = ['text-warning', 'text-pink', 'text-success', 'text-orange', 'text-info', 'text-purple', 'text-danger'];
    
    const toLocalISO = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${da}`;
    };
    
    const formatDateShort = (d) => {
        const mNames = ['\u0E21.\u0E04.', '\u0E01.\u0E1E.', '\u0E21\u0E35.\u0E04.', '\u0E40\u0E21.\u0E22.', '\u0E1E.\u0E04.', '\u0E21\u0E34.\u0E22.', '\u0E01.\u0E04.', '\u0E2A.\u0E04.', '\u0E01.\u0E22.', '\u0E15.\u0E04.', '\u0E1E.\u0E22.', '\u0E18.\u0E04.'];
        return `${d.getDate()} ${mNames[d.getMonth()]} ${d.getFullYear()+543}`;
    };

    const todayISO = toLocalISO(new Date());
    const dateKeys = [];

    for(let i=0; i<7; i++) {
        const d = new Date(mondayDate); 
        d.setDate(mondayDate.getDate() + i);
        const iso = toLocalISO(d);
        dateKeys.push({ 
            iso: iso, label: daysTh[i], date: d.getDate(), fullDate: d,
            isToday: iso === todayISO, colorClass: dayColors[i]
        });
    }

    const rangeText = `${formatDateShort(dateKeys[0].fullDate)} - ${formatDateShort(dateKeys[6].fullDate)}`;

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3 px-2 bg-white rounded-pill shadow-sm py-2 border">
            <button class="btn btn-sm btn-outline-primary rounded-circle border-0 ms-1" onclick="changeTimetableWeek(-1)"><i class="fas fa-chevron-left"></i></button>
            <h5 class="fw-bold text-primary mb-0 user-select-none" style="font-size: 1rem;"><i class="fas fa-calendar-week me-2 opacity-50"></i>${rangeText}</h5>
            <button class="btn btn-sm btn-outline-primary rounded-circle border-0 me-1" onclick="changeTimetableWeek(1)"><i class="fas fa-chevron-right"></i></button>
        </div>
        <div class="table-responsive rounded-4 shadow-sm border bg-white">
            <table class="table table-bordered mb-0 text-center align-middle small" style="table-layout: fixed; min-width: 1000px;">
                <thead class="bg-light">
                    <tr><th style="width: 70px;" class="py-3 text-secondary align-middle">\u0E40\u0E27\u0E25\u0E32</th>`;
    
    dateKeys.forEach(d => {
        const activeBg = d.isToday ? 'bg-primary bg-opacity-10' : '';
        const badge = d.isToday ? '<span class="badge bg-primary rounded-pill mb-1" style="font-size:0.6rem">\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49</span><br>' : '';
        html += `<th style="width: 13.2%;" class="${activeBg}">${badge}<span class="fw-bold ${d.colorClass}" style="font-size:0.9rem;">${d.label}</span><div class="mt-1 fw-bold text-dark fs-5">${d.date}</div></th>`;
    });
    html += `</tr></thead><tbody>`;

    for(let h=startHour; h<=endHour; h++) {
        const timeLabel = `${String(h).padStart(2,'0')}:00`;
        html += `<tr><td class="fw-bold text-secondary bg-light bg-opacity-50 font-monospace">${timeLabel}</td>`;
        
        dateKeys.forEach(d => {
            const slot = slots.find(s => {
                const sDate = String(s.date || '').split('T')[0].trim();
                const dIso = String(d.iso).trim();
                const slotStartH = parseInt(String(s.start).split(':')[0], 10);
                return sDate === dIso && slotStartH === h;
            });

            const cellStyle = d.isToday ? 'background-color: rgba(13, 110, 253, 0.03);' : '';
            
            if(slot) {
                const isClass = (slot.type === 'class' || slot.status === 'class');
                
                const rawTitle = slot.title || slot.Title || slot.subject || slot.Subject || slot.Purpose || slot.purpose || (isClass ? '\u0E27\u0E34\u0E0A\u0E32\u0E40\u0E23\u0E35\u0E22\u0E19' : '\u0E08\u0E2D\u0E07\u0E2B\u0E49\u0E2D\u0E07');
                const rawSub = slot.teacherName || slot.instructor || slot.Instructor || slot.booker || slot.BookerName || '';
                
                // \uD83D\uDD25 COLOR THEME FIX: \u0E1B\u0E23\u0E31\u0E1A\u0E2A\u0E35\u0E43\u0E2B\u0E49\u0E15\u0E31\u0E14\u0E01\u0E31\u0E19\u0E0A\u0E31\u0E14\u0E40\u0E08\u0E19 (High Contrast)
                let cardClass = 'bg-warning bg-opacity-10 border-start border-4 border-warning text-dark'; 
                let iconClass = 'text-warning';
                let icon = 'fa-clock';
                
                if (isClass) {
                    // Class: พื้นหลังสีขาวเทา + ขอบดำหนา + ตัวหนังสือดำเข้ม
                    cardClass = 'bg-light border-start border-4 border-dark text-dark shadow-sm';
                    iconClass = 'text-dark';
                    icon = 'fa-book';
                } else if (slot.status === 'approved') {
                    // Approved: พื้นเขียวจาง + ขอบเขียว + ตัวหนังสือเขียวเข้ม
                    cardClass = 'bg-success bg-opacity-10 border-start border-4 border-success text-success-emphasis';
                    iconClass = 'text-success';
                    icon = 'fa-check-circle';
                }
                
                const startH = parseInt(slot.start.split(':')[0], 10);
                const endH = parseInt(slot.end.split(':')[0], 10);
                let duration = endH - startH;
                if (duration < 1) duration = 1; 
                
                html += `<td class="p-1" rowspan="${duration}" style="${cellStyle} vertical-align: top;">
                            <div class="rounded-3 p-2 h-100 d-flex flex-column justify-content-start text-start hover-up transition-all ${cardClass}" 
                                 style="font-size:0.82rem; cursor:pointer; min-height: 100%; box-shadow: 0 2px 4px rgba(0,0,0,0.05);"
                                 title="${sanitizeText(rawTitle)}"
                                 tabindex="0"
                                 onclick="showEventDetail('${slot.type}', '${sanitizeText(rawTitle)}', '${slot.start}-${slot.end}', '${slot.bookingId||''}', '${sanitizeText(slot.teacherName || slot.instructor || slot.booker || '')}')"
                                 onkeydown="handleActivateKeydown(event, 'showEventDetail', '${slot.type}', '${sanitizeText(rawTitle)}', '${slot.start}-${slot.end}', '${slot.bookingId||''}', '${sanitizeText(slot.teacherName || slot.instructor || slot.booker || '')}')">
                                
                                <div class="d-flex justify-content-between align-items-center pb-1 mb-1 border-bottom border-secondary border-opacity-10">
                                    <span class="fw-bold font-monospace" style="font-size:0.78rem; opacity: 0.9;">${slot.start}-${slot.end}</span>
                                    <i class="fas ${icon} ${iconClass}"></i>
                                </div>
                                
                                <div class="fw-bold text-dark booking-title" style="line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; font-size: 0.82rem;">
                                    ${sanitizeText(rawTitle)}
                                </div>
                                
                                ${rawSub ? `
                                <div class="mt-auto pt-1 text-secondary text-truncate booking-teacher" style="font-size:0.75rem; font-weight:500;">
                                    👨‍🏫 ${sanitizeText(rawSub)}
                                </div>` : ''}
                            </div>
                         </td>`;
            } else {
                const isOccupied = slots.some(s => {
                    const sDate = String(s.date || '').split('T')[0].trim();
                    if (sDate !== d.iso) return false;
                    const sStart = parseInt(s.start.split(':')[0], 10);
                    const sEnd = parseInt(s.end.split(':')[0], 10);
                    return sStart < h && sEnd > h; 
                });

                if (!isOccupied) {
                    const nextH = h + 1;
                    const timeEnd = `${String(nextH).padStart(2,'0')}:00`;
                    html += `<td class="p-0 position-relative group-hover-visible ${cellStyle}" style="height: 60px;">
                                <div class="w-100 h-100 d-flex align-items-center justify-content-center cursor-pointer text-primary opacity-0 hover-opacity-100 transition-all"
                                     onclick="showBookingFormWithDate('${d.iso}', '${timeLabel}', '${timeEnd}')">
                                    <i class="fas fa-plus-circle fa-lg"></i>
                                </div>
                             </td>`;
                }
            }
        });
        html += `</tr>`;
    }
    html += `</tbody></table></div>`;
    
    html += `<style>
        .hover-up:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.15) !important; z-index: 5; }
        .hover-opacity-100:hover { opacity: 1 !important; background-color: rgba(13, 110, 253, 0.05); }
        .transition-all { transition: transform 0.2s ease, opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease; }
        .text-pink { color: #e83e8c; }
        .text-orange { color: #fd7e14; }
        .text-purple { color: #6f42c1; }
    </style>`;

    container.innerHTML = html;
};

// Map V2 Backup
window.renderWeeklyGridV2 = window.renderTimetableWeekGrid;

// =============================================================
// 📱 MOBILE: Week Agenda Card View (< 768px)
// Grouped by date — reuses .month-agenda-* CSS design system
// =============================================================
function renderTimetableWeekAgenda(slots, mondayDateInput) {
    const container = document.getElementById('weeklyScheduleGrid');
    if (!container) return;

    const safeText = (v) => (typeof sanitizeText === 'function') ? sanitizeText(v) : String(v || '');
    const safeJsArg = (v) => JSON.stringify(String(v == null ? '' : v))
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const toLocalISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    let mondayDate = (mondayDateInput instanceof Date) ? mondayDateInput : new Date(mondayDateInput);
    if (isNaN(mondayDate.getTime())) mondayDate = new Date();
    window._weekSlotsCache = slots;
    window._weekMondayCache = mondayDate;
    window._currentWeekDisplayDate = new Date(mondayDate);

    const monthNames = ['\u0E21\u0E01\u0E23\u0E32\u0E04\u0E21','\u0E01\u0E38\u0E21\u0E20\u0E32\u0E1E\u0E31\u0E19\u0E18\u0E4C','\u0E21\u0E35\u0E19\u0E32\u0E04\u0E21','\u0E40\u0E21\u0E29\u0E32\u0E22\u0E19','\u0E1E\u0E24\u0E29\u0E20\u0E32\u0E04\u0E21','\u0E21\u0E34\u0E16\u0E38\u0E19\u0E32\u0E22\u0E19','\u0E01\u0E23\u0E01\u0E0E\u0E32\u0E04\u0E21','\u0E2A\u0E34\u0E07\u0E2B\u0E32\u0E04\u0E21','\u0E01\u0E31\u0E19\u0E22\u0E32\u0E22\u0E19','\u0E15\u0E38\u0E25\u0E32\u0E04\u0E21','\u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19','\u0E18\u0E31\u0E19\u0E27\u0E32\u0E04\u0E21'];
    const monthNamesShort = ['\u0E21.\u0E04.','\u0E01.\u0E1E.','\u0E21\u0E35.\u0E04.','\u0E40\u0E21.\u0E22.','\u0E1E.\u0E04.','\u0E21\u0E34.\u0E22.','\u0E01.\u0E04.','\u0E2A.\u0E04.','\u0E01.\u0E22.','\u0E15.\u0E04.','\u0E1E.\u0E22.','\u0E18.\u0E04.'];
    const todayISO = toLocalISO(new Date());

    // Build 7-day date array (Mon-Sun)
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(mondayDate);
        d.setDate(mondayDate.getDate() + i);
        weekDates.push({ iso: toLocalISO(d), dateObj: d });
    }
    const rangeStart = weekDates[0].dateObj;
    const rangeEnd   = weekDates[6].dateObj;
    const fmtShort = (d) => `${d.getDate()} ${monthNamesShort[d.getMonth()]} ${d.getFullYear()+543}`;

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3 px-2 bg-white rounded-pill shadow-sm py-2 border">
            <button class="btn btn-sm btn-outline-primary rounded-circle border-0 ms-1"
                    onclick="changeTimetableWeek(-1)" style="min-width:40px;min-height:40px;width:40px;height:40px;padding:0;">
                <i class="fas fa-chevron-left"></i>
            </button>
            <h5 class="fw-bold text-primary mb-0 user-select-none" style="font-size:15px;font-weight:600;text-align:center;">
                <i class="fas fa-calendar-week me-1 opacity-50"></i>${fmtShort(rangeStart)} – ${fmtShort(rangeEnd)}
            </h5>
            <button class="btn btn-sm btn-outline-primary rounded-circle border-0 me-1"
                    onclick="changeTimetableWeek(1)" style="min-width:40px;min-height:40px;width:40px;height:40px;padding:0;">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div class="month-agenda-view">`;

    const safeslots = Array.isArray(slots) ? slots : [];
    const weekHasAny = weekDates.some(({ iso }) =>
        safeslots.some(s => String(s.date||'').split('T')[0].trim() === iso)
    );

    if (weekHasAny) weekDates.forEach(({ iso, dateObj }) => {
        const daySlots = safeslots
            .filter(s => String(s.date||'').split('T')[0].trim() === iso)
            .sort((a,b) => String(a.start||'').localeCompare(String(b.start||'')));

        const isToday = iso === todayISO;
        const dayLabel = `${dateObj.getDate()} ${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()+543}`;
        const todayBadge = isToday
            ? ` <span class="badge bg-primary rounded-pill" style="font-size:0.6rem;vertical-align:middle;">\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49</span>`
            : '';

        html += `
            <section class="month-agenda-day-card" data-date="${safeText(iso)}">
                <div class="month-agenda-day-header">
                    <span class="month-agenda-day-icon">📅</span>
                    <span class="month-agenda-day-title">${dayLabel}${todayBadge}</span>
                </div>
                <div class="month-agenda-event-list">`;

        if (daySlots.length === 0) {
            html += `
                <div class="month-agenda-event week-agenda-empty-day" aria-disabled="true">
                    <span class="month-agenda-event-title">ไม่มีรายการวันนี้</span>
                </div>`;
        } else daySlots.forEach((s) => {
            const timeText = `${s.start||'-'} - ${s.end||'-'}`;
            const rawTimeRange = `${s.start||''}-${s.end||''}`;
            const hour = parseInt(String(s.start||'0').split(':')[0], 10);
            const icon = hour < 12 ? '🕘' : '🕐';
            const displayTeacher = s.teacherName || s.instructor || s.booker || '-';
            const instructorLine = `<span class="d-block booking-teacher" style="font-size:0.82rem;color:#64748b;margin-top:0.2rem;">👨‍🏫 ${safeText(displayTeacher)}</span>`;
            const isClass = s.type === 'class';
            const statusClass = isClass ? 'month-schedule-event-bar--class' : (s.status === 'approved' ? 'month-schedule-event-bar--approved' : 'month-schedule-event-bar--pending');
            html += `
                <button type="button" class="month-agenda-event ${statusClass}"
                        onclick="showEventDetail(${safeJsArg(s.type)}, ${safeJsArg(s.title)}, ${safeJsArg(rawTimeRange)}, ${safeJsArg(s.bookingId||'')}, ${safeJsArg(s.teacherName || s.instructor || s.booker || '')})">
                    <span class="month-agenda-event-time">${icon} ${safeText(timeText)}</span>
                    <span class="month-agenda-event-title">${safeText(s.title||'\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E0A\u0E37\u0E48\u0E2D\u0E27\u0E34\u0E0A\u0E32')}</span>
                    ${instructorLine}
                </button>`;
        });

        html += `
                </div>
            </section>`;
    });

    if (!weekHasAny) {
        html += `
            <div class="month-agenda-empty">
                <i class="fas fa-calendar-week fa-2x mb-2" style="opacity:0.4;"></i>
                <h6>\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E19\u0E35\u0E49\u0E2B\u0E49\u0E2D\u0E07\u0E27\u0E48\u0E32\u0E07</h6>
                <p>\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E15\u0E32\u0E23\u0E32\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E43\u0E19\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E19\u0E35\u0E49</p>
                <button class="btn btn-primary btn-sm rounded-pill px-4 fw-bold mt-2 shadow-sm"
                        style="min-height:44px;" onclick="showBookingForm()">
                    <i class="fas fa-plus-circle me-1"></i>\u0E08\u0E2D\u0E07\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19
                </button>
            </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}
// =============================================================




function isMonthAgendaViewport() {
    return window.innerWidth < 992;
}

// 📱 Mobile Agenda breakpoint (< 768px) — Week card list only on phone width
function isMobileAgendaViewport() {
    return window.innerWidth < 768;
}


function bindMonthAgendaViewportWatcher() {
    if (window.__monthAgendaViewportWatcherBound) return;
    window.__monthAgendaViewportWatcherBound = true;

    let timer = null;
    const rerenderMonth = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            if (window.currentViewMode !== 'month') return;
            const slots = Array.isArray(window._monthSlotsCache) ? window._monthSlotsCache : null;
            const firstDate = window._monthFirstDateCache || window._currentMonthDisplayDate;
            const firstDateObj = firstDate ? new Date(firstDate) : null;
            if (!slots || !firstDateObj || isNaN(firstDateObj.getTime())) return;
            if (typeof window.renderTimetableMonthGrid === 'function') {
                window.renderTimetableMonthGrid(slots, firstDateObj);
            }
        }, 120);
    };

    window.addEventListener('resize', rerenderMonth);
    window.addEventListener('orientationchange', rerenderMonth);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', rerenderMonth);
    }
}


bindMonthAgendaViewportWatcher();


function bindWeekAgendaViewportWatcher() {
    if (window.__weekAgendaViewportWatcherBound) return;
    window.__weekAgendaViewportWatcherBound = true;

    let timer = null;
    const rerenderWeek = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            if (window.currentViewMode !== 'week') return;
            const slots = Array.isArray(window._weekSlotsCache) ? window._weekSlotsCache : null;
            const monday = window._weekMondayCache || window._currentWeekDisplayDate;
            const mondayObj = monday ? new Date(monday) : null;
            if (!slots || !mondayObj || isNaN(mondayObj.getTime())) return;
            if (typeof window.renderTimetableWeekGrid === 'function') {
                window.renderTimetableWeekGrid(slots, mondayObj);
            }
        }, 120);
    };

    window.addEventListener('resize', rerenderWeek);
    window.addEventListener('orientationchange', rerenderWeek);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', rerenderWeek);
    }
}

bindWeekAgendaViewportWatcher();


function bindDayAgendaViewportWatcher() {
    if (window.__dayAgendaViewportWatcherBound) return;
    window.__dayAgendaViewportWatcherBound = true;

    let timer = null;
    const rerenderDay = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            if (window.currentViewMode && window.currentViewMode !== 'day') return;
            const slots = Array.isArray(window._daySlotsCache) ? window._daySlotsCache : null;
            if (!slots) return;
            if (typeof window.renderTimetableDayGrid === 'function') {
                window.renderTimetableDayGrid(slots);
            }
        }, 120);
    };

    window.addEventListener('resize', rerenderDay);
    window.addEventListener('orientationchange', rerenderDay);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', rerenderDay);
    }
}

bindDayAgendaViewportWatcher();


window.renderTimetableMonthAgenda = function(slots, firstDate) {
    const container = document.getElementById('monthlyScheduleGrid');
    if (!container) return;

    window._currentMonthDisplayDate = new Date(firstDate);
    window._monthFirstDateCache = new Date(firstDate);
    window._monthSlotsCache = Array.isArray(slots) ? slots : [];

    const monthNames = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    const y = firstDate.getFullYear();
    const m = firstDate.getMonth();
    const safeText = (v) => (typeof sanitizeText === 'function') ? sanitizeText(v) : String(v || '');
    const safeJsArg = (v) => JSON.stringify(String(v == null ? '' : v))
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const getSlotTitle = (s) => String((s && (s.title || s.subject || s.SubjectName || s.purpose || s.Purpose)) || 'ไม่ระบุชื่อวิชา').trim();
    const getSlotPerson = (s) => String((s && (s.teacherName || s.instructor || s.teacher || s.booker || s.BookerName)) || '').trim();
    const getSlotTone = (s) => {
        const type = String((s && s.type) || '').toLowerCase();
        const status = String((s && s.status) || '').toLowerCase();
        if (type === 'class') return { className: 'month-schedule-event-bar--class', label: 'เรียน' };
        if (status === 'approved' || status === 'อนุมัติ') return { className: 'month-schedule-event-bar--approved', label: 'อนุมัติ' };
        if (status === 'cancelled' || status === 'canceled' || status === 'rejected' || status === 'ยกเลิก' || status === 'ไม่อนุมัติ') {
            return { className: 'month-schedule-event-bar--danger', label: 'ยกเลิก' };
        }
        return { className: 'month-schedule-event-bar--pending', label: 'รออนุมัติ' };
    };
    const toLocalISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const normalizeSlotDate = (value) => {
        const raw = String(value || '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
        const parsed = new Date(raw);
        return isNaN(parsed.getTime()) ? '' : toLocalISO(parsed);
    };

    const byDate = {};
    (Array.isArray(slots) ? slots : []).forEach((slot) => {
        if (!slot || !slot.date) return;
        const dateISO = normalizeSlotDate(slot.date);
        if (!dateISO) return;
        const d = new Date(dateISO);
        if (isNaN(d.getTime()) || d.getFullYear() !== y || d.getMonth() !== m) return;
        if (!byDate[dateISO]) byDate[dateISO] = [];
        byDate[dateISO].push(slot);
    });

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3 px-2 bg-white rounded-pill shadow-sm py-2 border">
            <button class="btn btn-sm btn-outline-primary rounded-circle border-0 ms-1" onclick="changeTimetableMonth(-1)" title="เดือนก่อนหน้า">
                <i class="fas fa-chevron-left"></i>
            </button>
            <h5 class="fw-bold text-primary mb-0 user-select-none">
                <i class="fas fa-calendar-alt me-2 opacity-50"></i>${monthNames[m]} ${y + 543}
            </h5>
            <button class="btn btn-sm btn-outline-primary rounded-circle border-0 me-1" onclick="changeTimetableMonth(1)" title="เดือนถัดไป">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        <div class="month-agenda-view">`;

    const dates = Object.keys(byDate).sort();

    if (dates.length === 0) {
        html += `
            <div class="month-agenda-empty">
                <i class="fas fa-calendar-check"></i>
                <h6>ไม่มีรายการในเดือนนี้</h6>
                <p>ยังไม่มีตารางเรียนหรือการจองในเดือน${monthNames[m]}</p>
            </div>`;
    }

    dates.forEach((dateISO) => {
        const d = new Date(dateISO);
        const day = d.getDate();
        const items = byDate[dateISO].sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')));

        html += `
            <section class="month-agenda-day-card" data-date="${safeText(dateISO)}">
                <div class="month-agenda-day-header">
                    <span class="month-agenda-day-icon">📅</span>
                    <span class="month-agenda-day-title">${day} ${monthNames[m]} ${y + 543}</span>
                </div>
                <div class="month-agenda-event-list">`;

        items.forEach((s) => {
            const timeText = `${s.start || '-'} - ${s.end || '-'}`;
            const rawTimeRange = `${s.start || ''}-${s.end || ''}`;
            const tone = getSlotTone(s);
            const titleText = getSlotTitle(s);
            const personText = getSlotPerson(s);
            const detailLabel = `ดูรายละเอียด ${titleText} เวลา ${timeText}`;

            html += `
                <button type="button" class="month-agenda-event ${tone.className}"
                        title="${safeText(detailLabel)}"
                        aria-label="${safeText(detailLabel)}"
                        onclick="showEventDetail(${safeJsArg(s.type)}, ${safeJsArg(titleText)}, ${safeJsArg(rawTimeRange)}, ${safeJsArg(s.bookingId || '')}, ${safeJsArg(s.teacherName || s.instructor || s.booker || '')})">
                    <span class="month-agenda-event-time"><i class="far fa-clock"></i> ${safeText(timeText)}</span>
                    <span class="month-agenda-event-title">${safeText(titleText)}</span>
                    <span class="month-agenda-event-meta">
                        <span class="month-event-status">${safeText(tone.label)}</span>
                        ${personText ? `<span>👨‍🏫 ${safeText(personText)}</span>` : ''}
                    </span>
                </button>`;
        });

        html += `
                </div>
            </section>`;
    });

    html += `</div>`;
    container.innerHTML = html;
};


window.renderTimetableMonthGrid = function(slots, firstDate) {
    const container = document.getElementById('monthlyScheduleGrid');
    if (!container) return;

    // ✅ STATE: จำค่าเดือนที่กำลังแสดงผลไว้สำหรับการเปลี่ยนเดือน
    window._currentMonthDisplayDate = new Date(firstDate);
    window._monthFirstDateCache = new Date(firstDate);
    window._monthSlotsCache = Array.isArray(slots) ? slots : [];

    const monthNames = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    const y = firstDate.getFullYear();
    const m = firstDate.getMonth();
    
    // Ensure Helper exists locally
    const toLocalISO = (d) => {
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yy}-${mm}-${dd}`;
    };
    const safeText = (v) => (typeof sanitizeText === 'function') ? sanitizeText(v) : String(v || '');
    const safeJsArg = (v) => JSON.stringify(String(v == null ? '' : v))
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const getSlotTitle = (s) => String((s && (s.title || s.subject || s.SubjectName || s.purpose || s.Purpose)) || 'ไม่ระบุชื่อวิชา').trim();
    const getSlotPerson = (s) => String((s && (s.teacherName || s.instructor || s.teacher || s.booker || s.BookerName)) || '').trim();
    const getSlotTone = (s) => {
        const type = String((s && s.type) || '').toLowerCase();
        const status = String((s && s.status) || '').toLowerCase();
        if (type === 'class') return { className: 'month-schedule-event-bar--class', label: 'เรียน' };
        if (status === 'approved' || status === 'อนุมัติ') return { className: 'month-schedule-event-bar--approved', label: 'อนุมัติ' };
        if (status === 'cancelled' || status === 'canceled' || status === 'rejected' || status === 'ยกเลิก' || status === 'ไม่อนุมัติ') {
            return { className: 'month-schedule-event-bar--danger', label: 'ยกเลิก' };
        }
        return { className: 'month-schedule-event-bar--pending', label: 'รออนุมัติ' };
    };
    
    const todayISO = toLocalISO(new Date());

    if (isMonthAgendaViewport()) {
        return window.renderTimetableMonthAgenda(slots, firstDate);
    }
    const isMobile = false;

    // ===================================================================
    // 📱 MOBILE: Agenda Card View (แสดงรายการเรียงตามวัน)
    // ===================================================================
    if (isMobile) {
        window._monthSlotsCache = slots;

        const thaiDayNames = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];

        let html = `
        <div class="d-flex justify-content-between align-items-center mb-3 px-2 bg-white rounded-pill shadow-sm py-2 border">
            <button class="btn btn-sm btn-outline-primary rounded-circle border-0 ms-1" 
                    onclick="changeTimetableMonth(-1)" title="เดือนก่อนหน้า" style="min-width:44px;min-height:44px;">
                <i class="fas fa-chevron-left"></i>
            </button>
            
            <h5 class="fw-bold text-primary mb-0 user-select-none" style="font-size:1rem;">
                <i class="fas fa-calendar-alt me-2 opacity-50"></i>${monthNames[m]} ${y+543}
            </h5>
            
            <button class="btn btn-sm btn-outline-primary rounded-circle border-0 me-1" 
                    onclick="changeTimetableMonth(1)" title="เดือนถัดไป" style="min-width:44px;min-height:44px;">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>

        <div class="mobile-agenda-month-view">`;

        // Group slots by date
        const lastDate = new Date(y, m+1, 0).getDate();
        let hasAnySlots = false;

        for(let d=1; d<=lastDate; d++) {
            const currentDate = new Date(y, m, d);
            const currentIso = toLocalISO(currentDate);
            const daySlots = slots.filter(s => s.date === currentIso);

            if (daySlots.length === 0) continue;
            hasAnySlots = true;

            daySlots.sort((a,b) => String(a.start).localeCompare(String(b.start)));

            const isToday = (currentIso === todayISO);
            const dayName = thaiDayNames[currentDate.getDay()];
            const todayBadge = isToday ? '<span class="badge bg-primary rounded-pill ms-2" style="font-size:0.65rem;vertical-align:middle;">วันนี้</span>' : '';

            html += `
            <div class="mobile-agenda-day-group ${isToday ? 'mobile-agenda-today' : ''}" data-date="${currentIso}">
                <div class="mobile-agenda-day-header">
                    <span class="mobile-agenda-day-icon">📅</span>
                    <span class="mobile-agenda-day-label">${d} ${monthNames[m]} ${y+543}</span>
                    <span class="mobile-agenda-day-name">${dayName}</span>
                    ${todayBadge}
                </div>
                <div class="mobile-agenda-day-events">`;

            daySlots.forEach(s => {
                const isClass = (s.type === 'class');
                const isApproved = (s.status === 'approved');

                const accentClass = isClass 
                    ? 'mobile-agenda-accent-class' 
                    : (isApproved ? 'mobile-agenda-accent-approved' : 'mobile-agenda-accent-pending');

                const badge = isClass 
                    ? '<span class="badge bg-secondary" style="font-size:0.65rem;">เรียน</span>' 
                    : (isApproved 
                        ? '<span class="badge bg-success" style="font-size:0.65rem;">อนุมัติ</span>' 
                        : '<span class="badge bg-warning text-dark" style="font-size:0.65rem;">รออนุมัติ</span>');

                const timeIcon = parseInt(s.start.split(':')[0], 10) < 12 ? '🕘' : '🕐';

                html += `
                    <div class="mobile-agenda-event-card ${accentClass}" 
                         role="button" tabindex="0"
                         onclick="showEventDetail('${s.type}', '${sanitizeText(s.title)}', '${s.start}-${s.end}', '${s.bookingId||''}')"
                         onkeydown="handleActivateKeydown(event, 'showEventDetail', '${s.type}', '${sanitizeText(s.title)}', '${s.start}-${s.end}', '${s.bookingId||''}')">
                        <div class="mobile-agenda-event-time">
                            <span class="mobile-agenda-time-icon">${timeIcon}</span>
                            <span class="mobile-agenda-time-text">${s.start}</span>
                            <span class="mobile-agenda-time-sep">-</span>
                            <span class="mobile-agenda-time-text">${s.end}</span>
                        </div>
                        <div class="mobile-agenda-event-body">
                            <div class="mobile-agenda-event-title">${sanitizeText(s.title)}</div>
                            <div class="mobile-agenda-event-meta">
                                ${badge}
                                ${s.instructor || s.booker ? `<span class="mobile-agenda-event-instructor"><i class="fas fa-user-circle me-1"></i>${sanitizeText(s.instructor || s.booker)}</span>` : ''}
                            </div>
                        </div>
                        <div class="mobile-agenda-event-arrow">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>`;
            });

            html += `
                </div>
            </div>`;
        }

        if (!hasAnySlots) {
            html += `
            <div class="text-center py-5 text-muted bg-white rounded-4 border" style="border-style:dashed !important;">
                <i class="fas fa-calendar-check fa-3x mb-3 text-secondary opacity-50"></i>
                <h6 class="fw-bold text-dark mb-1">ไม่มีรายการในเดือนนี้</h6>
                <p class="small text-muted mb-3" style="font-size:0.85rem;">ยังไม่มีตารางเรียนหรือการจองในเดือน${monthNames[m]}</p>
                <button class="btn btn-primary btn-sm rounded-pill px-4 py-2 shadow-sm fw-bold" style="min-height:44px;" onclick="showBookingForm()">
                    <i class="fas fa-plus-circle me-1"></i>จองห้องเรียน
                </button>
            </div>`;
        }

        html += `
        </div>`;

        // Mobile Agenda CSS
        html += `<style>
        .mobile-agenda-month-view {
            display: flex;
            flex-direction: column;
            gap: 0;
        }
        .mobile-agenda-day-group {
            margin-bottom: 0.25rem;
        }
        .mobile-agenda-day-group:last-child {
            margin-bottom: 0;
        }
        .mobile-agenda-today {
            position: relative;
        }
        .mobile-agenda-today .mobile-agenda-day-header {
            background: linear-gradient(135deg, rgba(102,126,234,0.10), rgba(118,75,162,0.06));
        }
        .mobile-agenda-day-header {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.6rem 0.75rem;
            background: #f8f9fa;
            border-bottom: 1px solid rgba(148,163,184,0.18);
            position: sticky;
            top: 0;
            z-index: 5;
        }
        .mobile-agenda-day-icon {
            font-size: 0.9rem;
            flex-shrink: 0;
        }
        .mobile-agenda-day-label {
            font-weight: 700;
            font-size: 0.9rem;
            color: #1e293b;
        }
        .mobile-agenda-day-name {
            font-size: 0.78rem;
            color: #64748b;
            font-weight: 500;
        }
        .mobile-agenda-day-events {
            display: flex;
            flex-direction: column;
            gap: 0;
        }
        .mobile-agenda-event-card {
            display: flex;
            align-items: stretch;
            gap: 0;
            padding: 0.75rem;
            background: #fff;
            border-bottom: 1px solid rgba(148,163,184,0.12);
            cursor: pointer;
            min-height: 60px;
            border-left: 4px solid transparent;
            transition: background-color 180ms ease;
            -webkit-tap-highlight-color: rgba(102,126,234,0.08);
        }
        .mobile-agenda-event-card:active {
            background-color: rgba(102,126,234,0.06);
        }
        .mobile-agenda-accent-class {
            border-left-color: #343a40;
        }
        .mobile-agenda-accent-approved {
            border-left-color: #198754;
        }
        .mobile-agenda-accent-pending {
            border-left-color: #ffc107;
        }
        .mobile-agenda-event-time {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 0.2rem;
            min-width: 90px;
            flex-shrink: 0;
            padding-right: 0.6rem;
            border-right: 1px solid rgba(148,163,184,0.15);
            margin-right: 0.6rem;
        }
        .mobile-agenda-time-icon {
            font-size: 0.85rem;
            margin-right: 0.15rem;
        }
        .mobile-agenda-time-text {
            font-family: 'SF Mono', 'Roboto Mono', monospace;
            font-weight: 700;
            font-size: 0.88rem;
            color: #1e293b;
        }
        .mobile-agenda-time-sep {
            color: #94a3b8;
            font-size: 0.75rem;
        }
        .mobile-agenda-event-body {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 0.25rem;
        }
        .mobile-agenda-event-title {
            font-size: 0.88rem;
            font-weight: 600;
            color: #1e293b;
            line-height: 1.35;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
        }
        .mobile-agenda-event-meta {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            flex-wrap: wrap;
        }
        .mobile-agenda-event-instructor {
            font-size: 0.75rem;
            color: #64748b;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 160px;
        }
        .mobile-agenda-event-arrow {
            display: flex;
            align-items: center;
            padding-left: 0.4rem;
            color: #cbd5e1;
            font-size: 0.7rem;
            flex-shrink: 0;
        }

        @media (prefers-reduced-motion: reduce) {
            .mobile-agenda-event-card {
                transition: none;
            }
        }
        </style>`;

        container.innerHTML = html;
        return; // ⛔ Mobile path ends here — Desktop code below is NOT reached
    }

    // ===================================================================
    // 🖥️ DESKTOP: Calendar Grid (ไม่เปลี่ยนแปลง)
    // ===================================================================

    // ✅ UI: เพิ่มปุ่ม Navigation (< เดือน >)
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3 px-2 bg-white rounded-pill shadow-sm py-2 border">
            <button class="btn btn-sm btn-outline-primary rounded-circle border-0 ms-1" 
                    onclick="changeTimetableMonth(-1)" title="เดือนก่อนหน้า">
                <i class="fas fa-chevron-left"></i>
            </button>
            
            <h5 class="fw-bold text-primary mb-0 user-select-none">
                <i class="fas fa-calendar-alt me-2 opacity-50"></i>${monthNames[m]} ${y+543}
            </h5>
            
            <button class="btn btn-sm btn-outline-primary rounded-circle border-0 me-1" 
                    onclick="changeTimetableMonth(1)" title="เดือนถัดไป">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>

        <!-- Header Days -->
        <div class="row g-2 mb-2 text-center fw-bold text-secondary small">
            <div class="col text-danger" style="width:14.28%">อา.</div>
            <div class="col text-warning" style="width:14.28%">จ.</div>
            <div class="col text-pink" style="width:14.28%">อ.</div>
            <div class="col text-success" style="width:14.28%">พ.</div>
            <div class="col text-orange" style="width:14.28%">พฤ.</div>
            <div class="col text-info" style="width:14.28%">ศ.</div>
            <div class="col text-purple" style="width:14.28%">ส.</div>
        </div>
        <div class="row g-2">`;

    // Empty slots before 1st day (Previous Month Days)
    const startDay = firstDate.getDay(); 
    const prevMonthLastDate = new Date(y, m, 0).getDate();
    for(let i=0; i<startDay; i++) {
        const prevDateNum = prevMonthLastDate - startDay + 1 + i;
        html += `<div class="col" style="width:14.28%">
                    <div class="month-schedule-cell disabled border rounded-3 p-1 h-100 d-flex flex-column" 
                          style="min-height:110px;">
                        <div class="text-end mb-1 px-1">
                            <span class="text-muted" style="width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center;">
                                ${prevDateNum}
                            </span>
                        </div>
                    </div>
                 </div>`;
    }

    const lastDate = new Date(y, m+1, 0).getDate();
    for(let d=1; d<=lastDate; d++) {
        const currentDate = new Date(y, m, d);
        const currentIso = toLocalISO(currentDate);
        const daySlots = slots.filter(s => s.date === currentIso);
        const isToday = (currentIso === todayISO);
        
        // Style variables
        const borderClass = isToday ? 'month-schedule-cell-today' : 'border-light-subtle';
        const bgClass = 'bg-white';
        const textClass = isToday ? 'month-schedule-date-badge-today' : 'text-dark opacity-75';

        // Sort events by time
        daySlots.sort((a,b) => String(a.start).localeCompare(String(b.start)));
        
        const cellAction = daySlots.length > 0 ? 'showMonthDaySlots' : 'showBookingFormWithDate';
        const cellAriaLabel = daySlots.length > 0
            ? `ดูรายละเอียดวันที่ ${d} ${monthNames[m]} ${y + 543} มี ${daySlots.length} รายการ`
            : `จองห้องเรียนวันที่ ${d} ${monthNames[m]} ${y + 543}`;

        html += `
        <div class="col" style="width:14.28%">
            <div class="month-schedule-cell border rounded-3 p-1 h-100 d-flex flex-column ${bgClass} ${borderClass} hover-shadow transition-all" 
                  style="min-height:110px; cursor:pointer; font-size:0.8rem;"
                  data-date="${currentIso}"
                  tabindex="0"
                  aria-label="${safeText(cellAriaLabel)}"
                  onclick="${cellAction}('${currentIso}')"
                  onkeydown="handleActivateKeydown(event, '${cellAction}', '${currentIso}')">
                
                <!-- Date Number -->
                <div class="text-end mb-1 px-1">
                    <span class="${textClass}" 
                          style="width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center;">
                        ${d}
                    </span>
                </div>`;

        html += `
                <div class="month-schedule-events d-flex flex-column gap-1 overflow-hidden" style="max-height:95px;">
                    ${daySlots.slice(0,3).map(s => {
                        const tone = getSlotTone(s);
                        const timeText = `${s.start || '-'} - ${s.end || '-'}`;
                        const titleText = getSlotTitle(s);
                        const personText = getSlotPerson(s) || '-';
                        const rawTimeRange = `${s.start || ''}-${s.end || ''}`;
                        const tooltipContent = `[${tone.label}] ${safeText(titleText)}\nเวลา: ${safeText(timeText)} น.\nผู้สอน/ผู้จอง: ${safeText(personText)}`;
                        
                        return `
                        <button type="button" class="month-schedule-event-bar ${tone.className}" 
                             title="${tooltipContent}"
                             tabindex="0"
                             onclick="event.stopPropagation(); showEventDetail(${safeJsArg(s.type)}, ${safeJsArg(titleText)}, ${safeJsArg(rawTimeRange)}, ${safeJsArg(s.bookingId || '')}, ${safeJsArg(s.teacherName || s.instructor || s.booker || '')})"
                             onkeydown="handleActivateKeydown(event, 'showEventDetail', ${safeJsArg(s.type)}, ${safeJsArg(titleText)}, ${safeJsArg(rawTimeRange)}, ${safeJsArg(s.bookingId || '')}, ${safeJsArg(s.teacherName || s.instructor || s.booker || '')})">
                            <span class="month-schedule-event-time"><i class="far fa-clock"></i>${formatShortTimeRange(s.start, s.end)}</span>
                            <span class="month-schedule-event-title">${safeText(titleText)}</span>
                            <span class="month-schedule-event-status">${safeText(tone.label)}</span>
                        </button>`;
                    }).join('')}
                    ${daySlots.length > 3 ? `<button type="button" class="month-more-btn" data-date="${currentIso}" aria-label="ดูรายการทั้งหมดของวันที่ ${d} ${monthNames[m]} ${y + 543}" onclick="event.stopPropagation(); window.showMonthDaySlots('${currentIso}')">ดูอีก +${daySlots.length-3} รายการ</button>` : ''}
                </div>`;

        html += `
            </div>
        </div>`;
        
        if ((startDay + d) % 7 === 0) html += `</div><div class="row g-2 mt-2">`;
    }
    
    const remainingDays = 7 - ((startDay + lastDate) % 7);
    if (remainingDays < 7) {
        for(let i=0; i<remainingDays; i++) {
            const nextDateNum = i + 1;
            html += `<div class="col" style="width:14.28%">
                        <div class="month-schedule-cell disabled border rounded-3 p-1 h-100 d-flex flex-column" 
                             style="min-height:110px;">
                            <div class="text-end mb-1 px-1">
                                <span class="text-muted" style="width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center;">
                                    ${nextDateNum}
                                </span>
                            </div>
                        </div>
                     </div>`;
        }
    }
    
    html += `</div>`;
    
    html += `<style>
        .text-pink { color: #e83e8c; }
        .text-orange { color: #fd7e14; }
        .text-purple { color: #6f42c1; }
        .hover-shadow:hover { transform: translateY(-2px); box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important; z-index:10; }
        .transition-all { transition: transform 0.2s ease, opacity 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease; }
    </style>`;

    container.innerHTML = html;
};

window.selectMonthGridDate = function(dateISO) {
    const cells = document.querySelectorAll('.month-schedule-cell');
    cells.forEach(cell => {
        if (cell.getAttribute('data-date') === dateISO) {
            cell.classList.add('selected');
        } else {
            cell.classList.remove('selected');
        }
    });

    const agendaContainer = document.getElementById('monthlyAgendaContainer');
    if (!agendaContainer) return;

    const dObj = new Date(dateISO);
    let thaiDateLabel = dateISO;
    if (!isNaN(dObj.getTime())) {
        thaiDateLabel = dObj.toLocaleDateString('th-TH', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    const slots = window._monthSlotsCache || [];
    const daySlots = slots.filter(s => {
        const sDate = String(s.date || '').split('T')[0].trim();
        return sDate === dateISO;
    });

    daySlots.sort((a,b) => String(a.start).localeCompare(String(b.start)));

    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
            <h6 class="fw-bold text-dark mb-0" style="font-size:0.95rem;">
                <i class="fas fa-calendar-day text-primary me-2"></i>ตารางเวลา: <span class="text-primary">${thaiDateLabel}</span>
            </h6>
        </div>
    `;

    if (daySlots.length === 0) {
        html += `
            <div class="text-center py-4 text-muted bg-light rounded-3 border border-dashed">
                <i class="fas fa-calendar-check fa-2x mb-2 text-secondary opacity-50"></i>
                <div class="fw-bold text-dark mb-1" style="font-size:0.95rem;">ไม่มีตารางสอนหรือการจอง</div>
                <p class="small text-muted mb-3" style="font-size:0.8rem;">สามารถจองเพื่อใช้งานห้องเรียนในช่วงเวลานี้ได้</p>
                <button class="btn btn-primary btn-sm rounded-pill px-4 py-2 shadow-sm fw-bold" style="min-height:44px;" onclick="showBookingFormWithDate('${dateISO}')">
                    <i class="fas fa-plus-circle me-1"></i>จองห้องเรียนวันนี้
                </button>
            </div>
        `;
    } else {
        html += `<div class="vstack gap-2 mb-3">`;
        daySlots.forEach(s => {
            const isClass = (s.type === 'class');
            const borderClass = isClass 
                ? 'border-start border-4 border-dark bg-light' 
                : (s.status === 'approved' 
                    ? 'border-start border-4 border-success bg-success bg-opacity-10' 
                    : 'border-start border-4 border-warning bg-warning bg-opacity-10');
            
            const badge = isClass 
                ? '<span class="badge bg-secondary text-white" style="font-size:0.7rem;">ตารางเรียน</span>' 
                : (s.status === 'approved' 
                    ? '<span class="badge bg-success" style="font-size:0.7rem;">อนุมัติ</span>' 
                    : '<span class="badge bg-warning text-dark" style="font-size:0.7rem;">รออนุมัติ</span>');

            html += `
                <div class="card border-0 shadow-sm ${borderClass} agenda-item-card cursor-pointer" 
                     onclick="showEventDetail('${s.type}', '${sanitizeText(s.title)}', '${s.start}-${s.end}', '${s.bookingId||''}')">
                    <div class="card-body p-3 d-flex align-items-center justify-content-between">
                        <div class="me-3 text-center border-end pe-3" style="min-width: 80px;">
                            <div class="fw-bold font-monospace text-dark" style="font-size:0.95rem;">${s.start}</div>
                            <div class="text-muted small font-monospace" style="font-size:0.75rem;">${s.end}</div>
                        </div>
                        <div class="flex-grow-1 min-w-0">
                            <div class="d-flex align-items-center gap-2 mb-1">
                                ${badge}
                                <h6 class="mb-0 fw-bold text-dark text-truncate booking-title" style="font-size:0.9rem;">${sanitizeText(s.title)}</h6>
                            </div>
                            <div class="booking-teacher text-muted small text-truncate" style="font-size:0.8rem;">
                                👨‍🏫 ${sanitizeText(s.teacherName || s.instructor || s.booker || '-')}
                            </div>
                        </div>
                        <div class="ms-2 text-secondary opacity-50">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        html += `
            <div class="text-center mt-2">
                <button class="btn btn-outline-primary btn-sm rounded-pill px-4 fw-bold w-100" style="min-height:44px;" onclick="showBookingFormWithDate('${dateISO}')">
                    <i class="fas fa-plus-circle me-1"></i>ต้องการส่งคำขอจองในวันนี้?
                </button>
            </div>
        `;
    }

    agendaContainer.innerHTML = html;
};

// ANCHOR:CLIENT.showEventDetail:REPLACE
function showEventDetail(type, title, timeStr, id, teacherName) {
    // ตรวจสอบว่า monthDaySlotsModal กำลังเปิดอยู่ไหม
    const dayModalEl = document.getElementById('monthDaySlotsModal');
    const bsDayModal = dayModalEl ? bootstrap.Modal.getInstance(dayModalEl) : null;
    const isDayModalOpen = dayModalEl && dayModalEl.classList.contains('show');

    // ฟังก์ชัน inner สำหรับเปิด modal จริงๆ (เรียกหลัง day modal ปิดสนิทแล้ว)
    const _doShowEventDetail = () => {
        if (type === 'booking' && id) {
            openBookingDetail(id);
            return;
        }

        // กรณีเป็น Class (ตารางสอน) -> แสดง Modal พร้อมปุ่ม "จองทับ"
        const bodyEl = document.getElementById('bookingDetailsContent');
        const footerEl = document.getElementById('bookingDetailsFooter');
        const modalEl = document.getElementById('bookingDetailsModal');

        // แปลงเวลา "09:00-12:00" ให้เป็นค่าพร้อมใช้งาน
        const [start, end] = String(timeStr || '').split('-');

        if (bodyEl) {
            bodyEl.innerHTML = `
                <div class="p-4 text-center">
                    <div class="mb-3">
                        <span class="badge bg-dark rounded-pill px-3 py-2 shadow-sm">
                            <i class="fas fa-chalkboard-teacher me-2"></i>ตารางสอน
                        </span>
                    </div>
                    <h4 class="fw-bold text-dark mb-2 booking-detail-title">${sanitizeText(title)}</h4>
                    <div class="booking-teacher booking-detail-teacher justify-content-center mb-2" style="font-size:0.9rem; color:#64748b;">
                        👨‍🏫 อ.ผู้สอน: <span class="fw-bold text-dark">${sanitizeText(teacherName || '-')}</span>
                    </div>
                    <div class="text-muted mb-4 small booking-detail-meta">
                        <i class="fas fa-clock me-1"></i> ${sanitizeText(timeStr)} น.
                    </div>
                    <div class="alert alert-warning border-0 bg-warning bg-opacity-10 small text-start">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <strong>คำเตือน:</strong> ช่วงเวลานี้มีการเรียนการสอน หากต้องการใช้ห้อง กรุณาตรวจสอบให้แน่ใจว่าได้ขออนุญาตอาจารย์ผู้สอนแล้ว
                    </div>
                </div>
            `;
        }

        if (footerEl) {
            footerEl.innerHTML = `
                <div class="d-flex gap-2 w-100">
                    <button type="button" class="btn btn-light text-secondary rounded-pill flex-grow-1" data-bs-dismiss="modal">ปิด</button>
                    <button type="button" class="btn btn-primary rounded-pill flex-grow-1 shadow-sm fw-bold"
                            onclick="bookOverClass('${start || ''}', '${end || ''}')">
                        <i class="fas fa-calendar-plus me-2"></i>จองทับเวลานี้
                    </button>
                </div>
            `;
        }

        if (modalEl) bootstrap.Modal.getOrCreateInstance(modalEl).show();
    };

    // ถ้า monthDaySlotsModal เปิดอยู่ ต้องรอให้ปิดสนิทก่อน (ป้องกัน Bootstrap race condition)
    if (isDayModalOpen && bsDayModal) {
        // ลงทะเบียน one-time listener รอ hidden event
        const onHidden = () => {
            dayModalEl.removeEventListener('hidden.bs.modal', onHidden);
            _doShowEventDetail();
        };
        dayModalEl.addEventListener('hidden.bs.modal', onHidden);
        bsDayModal.hide();
    } else {
        // ไม่มี day modal เปิดอยู่ เรียกได้เลย
        _doShowEventDetail();
    }
}

function showMonthDaySlots(dateISO) {
    let modalEl = document.getElementById('monthDaySlotsModal');
    let bodyEl = document.getElementById('monthDaySlotsModalBody');

    if (!modalEl || !bodyEl) {
        if (modalEl && !bodyEl) modalEl.remove();

        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="monthDaySlotsModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content rounded-4 border-0 shadow">
                        <div class="modal-header border-bottom-0 pb-0">
                            <h5 class="modal-title fw-bold text-primary" id="monthDaySlotsModalTitle">
                                <i class="fas fa-calendar-day me-2"></i>รายละเอียดรายการ
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="ปิดหน้าต่าง"></button>
                        </div>
                        <div class="modal-body">
                            <div id="monthDaySlotsModalBody" class="vstack gap-2"></div>
                        </div>
                        <div class="modal-footer border-top-0 bg-light rounded-bottom-4">
                            <button type="button" class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">ปิด</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
        modalEl = document.getElementById('monthDaySlotsModal');
        bodyEl = document.getElementById('monthDaySlotsModalBody');
    }

    if (!modalEl || !bodyEl) {
        console.error('showMonthDaySlots: modal elements missing', { modal: !!modalEl, body: !!bodyEl });
        return false;
    }

    if (!window.bootstrap || !bootstrap.Modal) {
        console.error('showMonthDaySlots: Bootstrap Modal not ready');
        return false;
    }

    const dObj = new Date(dateISO);
    let thaiDateLabel = dateISO;
    if (!isNaN(dObj.getTime())) {
        const monthNames = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
        thaiDateLabel = `${dObj.getDate()} ${monthNames[dObj.getMonth()]} ${dObj.getFullYear() + 543}`;
    }

    const titleEl = document.getElementById('monthDaySlotsModalTitle');
    if (titleEl) {
        titleEl.innerHTML = `<i class="fas fa-calendar-day me-2"></i>${thaiDateLabel}`;
    }

    const slots = window._monthSlotsCache || [];
    const daySlots = slots.filter(s => {
        if (!s) return false;
        const sDate = String(s.date || '').split('T')[0].trim();
        return sDate === dateISO;
    });

    daySlots.sort((a,b) => String(a.start).localeCompare(String(b.start)));

    let html = '';
    if (daySlots.length === 0) {
        html = '<div class="text-center py-4 text-muted">ไม่มีรายการวันนี้</div>';
    } else {
        const safeJsArg = (v) => JSON.stringify(String(v == null ? '' : v))
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        daySlots.forEach(s => {
            const isClass = (s.type === 'class');
            const borderClass = isClass 
                ? 'border-start border-4 border-dark bg-light' 
                : (s.status === 'approved' 
                    ? 'border-start border-4 border-success bg-success bg-opacity-10' 
                    : 'border-start border-4 border-warning bg-warning bg-opacity-10');
            
            const badge = isClass 
                ? '<span class="badge bg-secondary text-white" style="font-size:0.7rem;">ตารางเรียน</span>' 
                : (s.status === 'approved' 
                    ? '<span class="badge bg-success" style="font-size:0.7rem;">อนุมัติ</span>' 
                    : '<span class="badge bg-warning text-dark" style="font-size:0.7rem;">รออนุมัติ</span>');

            const rawTimeRange = `${s.start || ''}-${s.end || ''}`;

            html += `
                <div class="card border-0 shadow-sm ${borderClass} agenda-item-card cursor-pointer" 
                     onclick="showEventDetail(${safeJsArg(s.type)}, ${safeJsArg(s.title)}, ${safeJsArg(rawTimeRange)}, ${safeJsArg(s.bookingId||'')}, ${safeJsArg(s.teacherName || s.instructor || s.booker || '')})"
                     onkeydown="handleActivateKeydown(event, 'showEventDetail', ${safeJsArg(s.type)}, ${safeJsArg(s.title)}, ${safeJsArg(rawTimeRange)}, ${safeJsArg(s.bookingId||'')}, ${safeJsArg(s.teacherName || s.instructor || s.booker || '')})">
                    <div class="card-body p-3 d-flex align-items-center justify-content-between">
                        <div class="me-3 text-center border-end pe-3" style="min-width: 90px;">
                            <div class="fw-bold font-monospace text-dark" style="font-size:0.95rem;">${s.start}</div>
                            <div class="text-muted small font-monospace" style="font-size:0.75rem;">${s.end}</div>
                        </div>
                        <div class="flex-grow-1 min-w-0">
                            <div class="d-flex align-items-center gap-2 mb-1">
                                ${badge}
                                <h6 class="mb-0 fw-bold text-dark text-truncate" style="font-size:0.9rem;">${sanitizeText(s.title)}</h6>
                            </div>
                            <div class="text-muted small text-truncate" style="font-size:0.8rem;">
                                👨‍🏫 ${sanitizeText(s.teacherName || s.instructor || s.booker || '-')}
                            </div>
                        </div>
                        <div class="ms-2 text-secondary opacity-50">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    bodyEl.innerHTML = html;

    try {
        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
        return true;
    } catch (e) {
        console.error('Error showing monthDaySlotsModal:', e);
        return false;
    }
};

// ฟังก์ชันสำหรับกดปุ่มจองทับ
function bookOverClass(start, end) {
    // ปิด Modal รายละเอียดก่อน
    const modalEl = document.getElementById('bookingDetailsModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if(modalInstance) modalInstance.hide();

    // ดึงวันปัจจุบันที่เลือกใน Sidebar
    const selectedDateVal = document.getElementById('bookingDate')?.value || window.currentDate;
    
    // เรียกฟังก์ชันเปิดฟอร์ม (หน่วงเวลาเดียวรอ Modal เก่าปิด)
    setTimeout(() => {
        showBookingFormWithDate(selectedDateVal, start.trim(), end.trim());
    }, 200);
}
// ANCHOR:CLIENT.showEventDetail:END
  
  // 🔥 FIX: เพิ่ม event handlers แยกออกมา
  function handleTimeSlotClick(event) {
    const timeSlot = event.target.closest('.time-slot');
    if (!timeSlot) return;
    
    const bookingId = timeSlot.getAttribute('data-booking-id');
    if (bookingId) {
      console.log('Opening booking detail for:', bookingId);
      openBookingDetail(bookingId);
    }
  }
  
  function handleTimeSlotKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTimeSlotClick(event);
    }
  }

async function submitBooking() {
    console.log('🚀 Submitting Booking (Safe Mode)...');
    
    const form = document.getElementById('bookingForm');
    if (!form.checkValidity()) {
        form.classList.add('was-validated');
        form.reportValidity();
        return;
    }

    // 1. ดึงค่าและ Validate เบื้องต้น
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    if (startTime >= endTime) { showToast('Warning', 'เวลาเลิกต้องหลังเวลาเริ่ม', 'warning'); return; }

    const isMultiDay = document.getElementById('isMultiDay')?.checked;
    let datesPayload = [];
    let primaryDate = '';
    
    if (isMultiDay) {
        if (!window.selectedMultiDates || window.selectedMultiDates.length === 0) {
            showToast('Warning', 'กรุณาระบุวันที่จองอย่างน้อย 1 วัน', 'warning');
            return;
        }
        datesPayload = window.selectedMultiDates;
        primaryDate = window.selectedMultiDates[0];
    } else {
        const bookingDate = document.getElementById('bookingDate').value;
        if (!bookingDate) {
            showToast('Warning', 'กรุณาเลือกวันที่', 'warning');
            return;
        }
        datesPayload = [bookingDate];
        primaryDate = bookingDate;
    }

    // 2. เตรียม Payload
    const equipment = Array.from(document.querySelectorAll('#bookingForm input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    const otherEq = document.getElementById('otherEquipment')?.value?.trim();
    if (otherEq) equipment.push(otherEq);

    const payload = {
        bookerName: document.getElementById('bookerName').value.trim(),
        phoneNumber: document.getElementById('phoneNumber').value.trim(),
        roomId: document.getElementById('roomSelect').value,
        attendees: document.getElementById('attendees').value || '1',
        bookingDate: primaryDate,
        bookingDates: datesPayload,
        startTime: startTime,
        endTime: endTime,
        purpose: document.getElementById('purpose').value.trim(),
        equipment: equipment,
        software: document.getElementById('software')?.value || '',
        meetingLink: document.getElementById('meetingLink')?.value || '',
        remarks: document.getElementById('remarks')?.value || ''
    };

    // 3. UI Interaction Control (กันกดรัว)
    const btnSubmit = document.querySelector('#bookingModal .btn-primary'); // ปุ่มยืนยัน
    const btnCancel = document.querySelector('#bookingModal .booking-cancel-btn'); // ปุ่มยกเลิก
    const originalBtnText = btnSubmit ? btnSubmit.innerHTML : 'ยืนยัน';

    if(btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-circle-notch fa-spin me-2"></i>กำลังบันทึก...';
    }
    if(btnCancel) btnCancel.classList.add('disabled');

    // 4. Show Overlay Loading
    showLoading(true, 'กำลังบันทึกการจอง...');

    try {
        // Hide Modal เพื่อให้ Loading Overlay เด่นชัด
        const bookingModalEl = document.getElementById('bookingModal');
        const bookingModal = bootstrap.Modal.getInstance(bookingModalEl);
        if(bookingModal) bookingModal.hide();

        // 5. Call Server
        const res = await apiCall('createBooking', payload);
        if (!res.ok) throw new Error(res.error || res.message || 'บันทึกไม่สำเร็จ');

        // 6. Handle File Upload (Sequential)
        const fileInput = document.getElementById('fileUpload');
        if (fileInput && fileInput.files.length > 0) {
             showLoading(true, `บันทึกข้อมูลแล้ว... กำลังอัปโหลด ${fileInput.files.length} ไฟล์`);
             const files = await Promise.all(Array.from(fileInput.files).map(f => new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve({ name: f.name, mimeType: f.type, base64Data: reader.result.split(',')[1] });
                reader.readAsDataURL(f);
             })));
             await apiCall('saveUploads', { bookingId: res.data.bookingId, files: files });
        }

        // [MODIFIED] Success State Handling with Conflict Check
        // \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E27\u0E48\u0E32\u0E40\u0E1B\u0E47\u0E19\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E0A\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48 (Conflict Request)
        if (res.data && res.data.isConflict) {
            showNotification('\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E04\u0E33\u0E02\u0E2D\u0E41\u0E25\u0E49\u0E27 (\u0E21\u0E35\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E0A\u0E19)', '\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E02\u0E2D\u0E07\u0E17\u0E48\u0E32\u0E19\u0E16\u0E39\u0E01\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E43\u0E19\u0E2A\u0E16\u0E32\u0E19\u0E30 "\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34 (\u0E0A\u0E19)" \u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E2D\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E41\u0E25\u0E30\u0E1E\u0E34\u0E08\u0E32\u0E23\u0E13\u0E32', 'warning');
        } else {
            showNotification('\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08!', '\u0E08\u0E2D\u0E07\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27\u0E04\u0E48\u0E30 \uD83D\uDE3A', 'success');
        }
        
        resetBookingForm();
        
        // Refresh Data
        if (window.currentRoom) loadScheduleForRoom(window.currentRoom, bookingDate);
        if (typeof loadDashboard === 'function') loadDashboard({force: true});
        if (typeof loadCombinedSchedule === 'function') loadCombinedSchedule(true);

    } catch (e) {
        console.error('Submit Error:', e);
        showToast('\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14', e.message, 'error');
        // \u0E40\u0E1B\u0E34\u0E14 Modal \u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E41\u0E01\u0E49\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25
        const bookingModalEl = document.getElementById('bookingModal');
        if(bookingModalEl) {
            const modal = new bootstrap.Modal(bookingModalEl);
            modal.show();
        }
    } finally {
        // 7. Cleanup & Restore UI
        showLoading(false);
        if(btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = originalBtnText;
        }
        if(btnCancel) btnCancel.classList.remove('disabled');
    }
}

function resetBookingForm() { 
    const form = document.getElementById('bookingForm');
    if (form) {
        form.reset(); 
        form.classList.remove('was-validated');
    }
    
    // เคลียร์รายการไฟล์ UI
    const listEl = document.getElementById('fileUploadList');
    if (listEl) listEl.innerHTML = '';
    
    // รีเซ็ตค่า Date Picker ให้เป็นวันที่ปัจจุบัน
    const dateInput = document.getElementById('bookingDate');
    if (dateInput && window.currentDate) {
        dateInput.value = window.currentDate;
        // กระตุ้น event change เพื่อให้ตัวแสดง พ.ศ. ทำงาน
        dateInput.dispatchEvent(new Event('change'));
    }
    
    // รีเซ็ตการจองหลายวัน
    window.selectedMultiDates = [];
    const isMultiDay = document.getElementById('isMultiDay');
    if (isMultiDay) {
        isMultiDay.checked = false;
        isMultiDay.dispatchEvent(new Event('change'));
    }
    window.renderSelectedMultiDates();
    
    // รีเซ็ต Step
    if (typeof currentStep !== 'undefined') currentStep = 1;
}

// ==========================================
// 🛠️ MULTI-DAY BOOKING UI LOGIC
// ==========================================
window.selectedMultiDates = [];

window.initMultiDayBookingUI = function() {
    const isMultiDay = document.getElementById('isMultiDay');
    const singleDateContainer = document.getElementById('singleDateContainer');
    const multiDayContainer = document.getElementById('multiDayContainer');
    const bookingDate = document.getElementById('bookingDate');
    
    const modeIndividual = document.getElementById('modeIndividual');
    const modeRange = document.getElementById('modeRange');
    const divIndividualMode = document.getElementById('divIndividualMode');
    const divRangeMode = document.getElementById('divRangeMode');
    
    const addSingleDate = document.getElementById('addSingleDate');
    const addRangeStart = document.getElementById('addRangeStart');
    const addRangeEnd = document.getElementById('addRangeEnd');
    
    const btnAddSingleDate = document.getElementById('btnAddSingleDate');
    const btnAddRangeDate = document.getElementById('btnAddRangeDate');
    
    if (!isMultiDay || !multiDayContainer) return;
    
    // 1. สลับโหมดการจอง ปกติ vs หลายวัน
    isMultiDay.addEventListener('change', function() {
        if (this.checked) {
            singleDateContainer.classList.add('d-none');
            multiDayContainer.classList.remove('d-none');
            bookingDate.removeAttribute('required');
            
            const todayISO = window.currentDate || new Date().toISOString().split('T')[0];
            if (addSingleDate) addSingleDate.value = todayISO;
            if (addRangeStart) addRangeStart.value = todayISO;
            if (addRangeEnd) addRangeEnd.value = todayISO;
        } else {
            singleDateContainer.classList.remove('d-none');
            multiDayContainer.classList.add('d-none');
            bookingDate.setAttribute('required', '');
        }
    });
    
    // 2. สลับวิทยุเลือกโหมด
    if (modeIndividual && modeRange) {
        const toggleRadioMode = () => {
            if (modeIndividual.checked) {
                divIndividualMode.classList.remove('d-none');
                divRangeMode.classList.add('d-none');
            } else {
                divIndividualMode.classList.add('d-none');
                divRangeMode.classList.remove('d-none');
            }
        };
        modeIndividual.addEventListener('change', toggleRadioMode);
        modeRange.addEventListener('change', toggleRadioMode);
    }
    
    // 3. ปุ่มเพิ่มวันที่ทีละวัน
    if (btnAddSingleDate && addSingleDate) {
        btnAddSingleDate.addEventListener('click', function() {
            const val = addSingleDate.value;
            if (!val) {
                showToast('Warning', 'กรุณาเลือกวันที่ก่อนกดเพิ่ม', 'warning');
                return;
            }
            if (window.selectedMultiDates.includes(val)) {
                showToast('Warning', 'วันที่นี้อยู่ในรายการแล้ว', 'warning');
                return;
            }
            window.selectedMultiDates.push(val);
            window.selectedMultiDates.sort();
            window.renderSelectedMultiDates();
            showToast('Success', 'เพิ่มวันที่สำเร็จ', 'success');
        });
    }
    
    // 4. ปุ่มเพิ่มช่วงวันต่อเนื่อง
    if (btnAddRangeDate && addRangeStart && addRangeEnd) {
        btnAddRangeDate.addEventListener('click', function() {
            const startVal = addRangeStart.value;
            const endVal = addRangeEnd.value;
            if (!startVal || !endVal) {
                showToast('Warning', 'กรุณาระบุช่วงวันที่เริ่มและสิ้นสุด', 'warning');
                return;
            }
            const startD = new Date(startVal);
            const endD = new Date(endVal);
            if (startD > endD) {
                showToast('Warning', 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่ม', 'warning');
                return;
            }
            
            let addedCount = 0;
            const tempD = new Date(startD);
            while (tempD <= endD) {
                const isoStr = tempD.toISOString().split('T')[0];
                if (!window.selectedMultiDates.includes(isoStr)) {
                    window.selectedMultiDates.push(isoStr);
                    addedCount++;
                }
                tempD.setDate(tempD.getDate() + 1);
            }
            
            if (addedCount > 0) {
                window.selectedMultiDates.sort();
                window.renderSelectedMultiDates();
                showToast('Success', `เพิ่มช่วงวันที่สำเร็จ (${addedCount} วัน)`, 'success');
            } else {
                showToast('Warning', 'วันที่ในช่วงทั้งหมดอยู่ในรายการอยู่แล้ว', 'warning');
            }
        });
    }
};

window.renderSelectedMultiDates = function() {
    const list = document.getElementById('selectedDatesList');
    const countEl = document.getElementById('multiDayCount');
    const noDatesText = document.getElementById('noDatesText');
    if (!list) return;
    
    const dates = window.selectedMultiDates || [];
    if (countEl) countEl.textContent = dates.length;
    
    if (dates.length === 0) {
        if (noDatesText) noDatesText.classList.remove('d-none');
        list.innerHTML = `<span class="text-muted small my-auto mx-auto" id="noDatesText">ยังไม่ได้เลือกวันที่</span>`;
        return;
    }
    
    if (noDatesText) noDatesText.classList.add('d-none');
    
    const getThaiText = (iso) => {
        return typeof formatThaiDate === 'function' ? formatThaiDate(iso) : iso;
    };
    
    list.innerHTML = dates.map(d => {
        return `
            <span class="badge bg-primary text-white d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm" style="font-size: 0.8rem;">
                <span><i class="far fa-calendar-alt me-1"></i>${getThaiText(d)}</span>
                <i class="fas fa-times cursor-pointer ms-1 text-white opacity-75 hover-opacity-100" onclick="window.removeMultiDate('${d}')" style="cursor: pointer;" title="ลบออก"></i>
            </span>
        `;
    }).join('');
};

window.removeMultiDate = function(dateStr) {
    window.selectedMultiDates = window.selectedMultiDates.filter(d => d !== dateStr);
    window.renderSelectedMultiDates();
};

document.addEventListener('DOMContentLoaded', function() {
    window.initMultiDayBookingUI();
});

function afterBookingSaved(bookingDateISO) {
    console.log('\u267B\uFE0F Refreshing view after booking...');
    if (window.currentRoom) {
        loadScheduleForRoom(window.currentRoom, bookingDateISO);
    }
}
// ANCHOR:CLIENT.submitBooking:END
       
window.updateRoomOptions = function(data = null, forceSelectId = null) {
  const sel = document.getElementById('roomSelect');
  if (!sel) return;

  const src = data || window.roomsData || [];
  const rooms = Array.isArray(src) ? src : [];

  // --- \u0E2A\u0E48\u0E27\u0E19\u0E17\u0E35\u0E48\u0E1B\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E38\u0E07: \u0E01\u0E32\u0E23\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34 ---
  if (!rooms.length) {
    console.warn('\u26A0\uFE0F Room data missing! Reloading.');
    sel.innerHTML = '<option value="" disabled selected>\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25...</option>';

    if (typeof apiCall === 'function') {
      apiCall('getRooms').then(res => {
        // \u2705 FIX: \u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E31\u0E49\u0E07 2 \u0E41\u0E1A\u0E1A (Array \u0E15\u0E23\u0E07\u0E46 \u0E2B\u0E23\u0E37\u0E2D Nested Object)
        let newRooms = [];
        if (res && res.ok) {
            if (Array.isArray(res.data)) {
                newRooms = res.data;
            } else if (res.data && Array.isArray(res.data.rooms)) {
                newRooms = res.data.rooms;
            }
        }

        if (newRooms.length > 0) {
          window.roomsData = newRooms;
          // \u0E40\u0E23\u0E35\u0E22\u0E01\u0E15\u0E31\u0E27\u0E40\u0E2D\u0E07\u0E0B\u0E49\u0E33\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E21\u0E48
          window.updateRoomOptions(newRooms, forceSelectId);
        } else {
          sel.innerHTML = '<option value="" disabled selected>\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19</option>';
        }
      }).catch(err => {
        console.error('getRooms error:', err);
        sel.innerHTML = '<option value="" disabled selected>\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2B\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08</option>';
      });
    }
    return;
  }
  // ---------------------------------------------

  const getRoomId = (r) => String(r?.RoomID ?? r?.roomId ?? r?.roomID ?? r?.id ?? '').trim();
  const getRoomName = (r) => String(r?.RoomName ?? r?.roomName ?? r?.name ?? '').trim();
  const getCap = (r) => String(r?.Capacity ?? r?.capacity ?? '').trim();

  sel.innerHTML = '<option value="">\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19</option>';

  const sortedRooms = rooms.slice().sort((a, b) => {
    const an = getRoomName(a);
    const bn = getRoomName(b);
    return an.localeCompare(bn, 'th');
  });

  sortedRooms.forEach(r => {
    const rid = getRoomId(r);
    const rname = getRoomName(r);
    if (!rid || !rname) return;

    const el = document.createElement('option');
    el.value = rid;

    const cap = getCap(r);
    el.textContent = cap ? `${rname} (${cap} \u0E17\u0E35\u0E48\u0E19\u0E31\u0E48\u0E07)` : rname;

    sel.appendChild(el);
  });

  const target = String(forceSelectId || window.currentRoom || sel.value || '').trim();
  if (target) {
    sel.value = target;
    // Double check: \u0E16\u0E49\u0E32\u0E04\u0E48\u0E32\u0E17\u0E35\u0E48 set \u0E44\u0E1B\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E19 option \u0E43\u0E2B\u0E49\u0E40\u0E04\u0E25\u0E35\u0E22\u0E23\u0E4C\u0E17\u0E34\u0E49\u0E07
    if (sel.value !== target) sel.value = '';
  }

  // Populate chartRoomFilter dropdown if it exists
  const chartRoomSel = document.getElementById('chartRoomFilter');
  if (chartRoomSel) {
    const activeVal = chartRoomSel.value;
    chartRoomSel.innerHTML = '<option value="">\u0E17\u0E38\u0E01\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19</option>';
    sortedRooms.forEach(r => {
      const rid = getRoomId(r);
      const rname = getRoomName(r);
      if (!rid || !rname) return;
      const el = document.createElement('option');
      el.value = rid;
      el.textContent = rname;
      chartRoomSel.appendChild(el);
    });
    if (activeVal) chartRoomSel.value = activeVal;
  }
};

/* ========== Enhanced File Upload Functions ========== */

function handleFileUpload(event) {
    const input = event.target;
    // \u0E40\u0E23\u0E35\u0E22\u0E01\u0E43\u0E0A\u0E49\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19\u0E41\u0E2A\u0E14\u0E07\u0E1C\u0E25
    renderFileList(input);
}

function renderFileList(input) {
    const listEl = document.getElementById('fileUploadList');
    if (!listEl) return;

    listEl.innerHTML = ''; // \u0E25\u0E49\u0E32\u0E07\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E01\u0E48\u0E32

    if (!input.files || input.files.length === 0) {
        // \u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E21\u0E35\u0E44\u0E1F\u0E25\u0E4C \u0E43\u0E2B\u0E49\u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E27\u0E48\u0E32\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E41\u0E2A\u0E14\u0E07\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21
        return; 
    }

    Array.from(input.files).forEach((file, index) => {
        const li = document.createElement('li');
        // \u0E43\u0E0A\u0E49 CSS Class \u0E17\u0E35\u0E48\u0E40\u0E23\u0E32\u0E1B\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E38\u0E07\u0E44\u0E1B\u0E41\u0E25\u0E49\u0E27
        li.className = 'd-flex justify-content-between align-items-center bg-white border rounded px-3 py-2 mb-2 shadow-sm';
        
        // \u0E04\u0E33\u0E19\u0E27\u0E13\u0E02\u0E19\u0E32\u0E14\u0E44\u0E1F\u0E25\u0E4C
        const sizeString = formatFileSize(file.size);
        const isTooBig = file.size > 5 * 1024 * 1024; // 5MB limit check for visual
        const sizeBadge = isTooBig 
            ? `<span class="badge bg-danger ms-2">\u0E40\u0E01\u0E34\u0E19\u0E02\u0E19\u0E32\u0E14</span>` 
            : `<span class="text-muted small ms-2">(${sizeString})</span>`;

        li.innerHTML = `
            <div class="d-flex align-items-center text-truncate me-2">
                <div class="bg-light rounded-circle p-2 me-2 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
                    <i class="fas fa-file-alt text-primary"></i>
                </div>
                <div class="d-flex flex-column text-truncate">
                    <span class="text-truncate fw-medium" style="max-width: 200px;">${sanitizeText(file.name)}</span>
                    <div class="d-flex align-items-center">
                        ${sizeBadge}
                    </div>
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger border-0 rounded-circle" 
                    onclick="removeFileFromList(${index})" title="\u0E25\u0E1A\u0E44\u0E1F\u0E25\u0E4C">
                <i class="fas fa-times"></i>
            </button>`;
            
        listEl.appendChild(li);
    });
}

function removeFileFromList(index) {
    const input = document.getElementById('fileUpload');
    if (!input || !input.files) return;

    // \u0E2A\u0E23\u0E49\u0E32\u0E07 DataTransfer \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23 FileList (\u0E40\u0E1E\u0E23\u0E32\u0E30 input.files \u0E40\u0E1B\u0E47\u0E19 Read-only \u0E42\u0E14\u0E22\u0E15\u0E23\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49)
    const dt = new DataTransfer();
    const files = Array.from(input.files);
    
    // \u0E01\u0E23\u0E2D\u0E07\u0E40\u0E2D\u0E32\u0E44\u0E1F\u0E25\u0E4C\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E16\u0E39\u0E01\u0E25\u0E1A\u0E40\u0E01\u0E47\u0E1A\u0E44\u0E27\u0E49
    files.forEach((file, i) => { 
        if (i !== index) dt.items.add(file); 
    });
    
    // \u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15 input \u0E14\u0E49\u0E27\u0E22\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E21\u0E48
    input.files = dt.files;
    
    // \u0E41\u0E2A\u0E14\u0E07\u0E1C\u0E25\u0E43\u0E2B\u0E21\u0E48
    renderFileList(input);
}

function clearFileList() {
    const input = document.getElementById('fileUpload');
    if (input) input.value = ''; // Reset input value
    
    const listEl = document.getElementById('fileUploadList');
    if (listEl) listEl.innerHTML = ''; // Clear visual list
}

// --- Helper Functions (\u0E43\u0E2A\u0E48\u0E44\u0E27\u0E49\u0E01\u0E31\u0E19\u0E40\u0E2B\u0E19\u0E35\u0E22\u0E27 \u0E40\u0E1C\u0E37\u0E48\u0E2D\u0E40\u0E08\u0E49\u0E32\u0E19\u0E32\u0E22\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35) ---

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== 1. SANITIZE TEXT (\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22 + \u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A null) =====
function sanitizeText(str) {
    if (str === null || str === undefined || str === '') return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

// ===== 4. OPEN BOOKING DETAIL + RENDER MODAL (\u0E41\u0E01\u0E49\u0E44\u0E02\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14) =====
async function openBookingDetail(bookingId) {
  const id = String(bookingId || '').trim();

  const modalEl = document.getElementById('bookingDetailsModal');
  const bodyEl = document.getElementById('bookingDetailsContent');
  const footerEl = document.getElementById('bookingDetailsFooter');

  if (!modalEl || !bodyEl || !footerEl) {
    console.error('Modal elements not found');
    return;
  }

  footerEl.innerHTML = `
    <div class="d-flex w-100 align-items-center justify-content-end">
      <button type="button" class="btn btn-light text-secondary rounded-pill fw-medium" data-bs-dismiss="modal">\u0E1B\u0E34\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07</button>
    </div>
  `;

  if (!id) {
    bodyEl.innerHTML = `
      <div class="alert alert-warning text-center mb-0">
        <i class="fas fa-info-circle fa-2x mb-2"></i><br>
        \u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07
      </div>
    `;
    try {
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.show();
    } catch (e) {}
    return;
  }

  bodyEl.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border text-primary"></div>
      <p class="mt-3 mb-0">\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14...</p>
    </div>
  `;

  let modalInstance = null;
  try {
    modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modalInstance.show();
  } catch (e) {
    console.warn('Bootstrap modal not ready:', e);
  }

  try {
    const res = await callServer('getBookingById', { bookingId: id }, 20000);

    if (!res || res.ok !== true || !res.data) {
      const msg = (res && (res.error || res.message)) ? (res.error || res.message) : '\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07';
      throw new Error(msg);
    }

    renderBookingDetailsModal(res.data);

  } catch (err) {
    const msg = (err && err.message) ? err.message : '\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14';
    bodyEl.innerHTML = `
      <div class="alert alert-danger text-center mb-0">
        <i class="fas fa-exclamation-triangle fa-2x mb-3"></i><br>
        ${sanitizeText(msg)}
        <div class="mt-3">
          <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">
            \u0E1B\u0E34\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07
          </button>
        </div>
      </div>
    `;

    footerEl.innerHTML = `
      <div class="d-flex w-100 align-items-center justify-content-end">
        <button type="button" class="btn btn-light text-secondary rounded-pill fw-medium" data-bs-dismiss="modal">\u0E1B\u0E34\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07</button>
      </div>
    `;

    // \u0E01\u0E31\u0E19\u0E40\u0E04\u0E2A\u0E04\u0E49\u0E32\u0E07: \u0E16\u0E49\u0E32\u0E2D\u0E22\u0E32\u0E01\u0E43\u0E2B\u0E49\u0E1B\u0E34\u0E14\u0E40\u0E2D\u0E07\u0E2D\u0E31\u0E15\u0E42\u0E19\u0E21\u0E31\u0E15\u0E34\u0E40\u0E21\u0E37\u0E48\u0E2D not found \u0E43\u0E2B\u0E49\u0E40\u0E1B\u0E34\u0E14\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14\u0E19\u0E35\u0E49
    // setTimeout(() => { try { (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)).hide(); } catch(e){} }, 1200);
  }
}

function renderBookingDetailsModal(detail) {
  if (!detail) return;

  const bodyEl = document.getElementById('bookingDetailsContent');
  const footerEl = document.getElementById('bookingDetailsFooter');
  if (!bodyEl || !footerEl) return;

  const session = window.currentSession || {};
  const userRole = String(session.role || 'user').toLowerCase().trim();
  const isAdmin = ['admin', 'superadmin', 'super_admin'].includes(userRole);

  const statusRaw = String(detail.Status || '\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38').trim();
  const statusLower = statusRaw.toLowerCase();

  const safe = (v) => (v ? String(v).replace(/</g, "&lt;").replace(/>/g, "&gt;") : '');
  const formatTime = (t) => t ? String(t).substring(0, 5) : '-';
  const displayDate = detail.formattedDate || (detail.BookingDate ? (typeof formatDateBE === 'function' ? formatDateBE(detail.BookingDate) : detail.BookingDate) : 'ไม่ระบุวันที่');
  const bookingId = String(detail.BookingID || '').trim();
  window.currentBookingId = bookingId;


  const roomId = String(detail.RoomID || '').trim();
  let roomLabel = safe(roomId || '-');
  if (roomId && Array.isArray(window.roomsData)) {
    const found = window.roomsData.find(r => String(r.RoomID || r.roomId || '').trim() === roomId);
    if (found) roomLabel = `${safe(found.RoomName || '')} <span class="text-muted small">(${safe(roomId)})</span>`;
  }

  const phone = String(detail.PhoneNumber || '').trim();
  const cleanPhone = phone.replace(/\D/g, '');
  const phoneHtml = cleanPhone.length >= 9
    ? `<a href="tel:${cleanPhone}" class="text-primary fw-bold text-decoration-none"><i class="fas fa-phone-alt me-1"></i>${safe(phone)}</a>`
    : (safe(phone) || '-');

  let filesHtml = '<span class="text-muted fst-italic small">\u0E44\u0E21\u0E48\u0E21\u0E35\u0E44\u0E1F\u0E25\u0E4C\u0E41\u0E19\u0E1A</span>';
  const fileLinks = [];
  if (Array.isArray(detail.fileLinks)) fileLinks.push(...detail.fileLinks);
  else if (typeof detail.UploadedFiles === 'string') {
    const raw = String(detail.UploadedFiles).trim();
    const parts = raw.includes(' | ') ? raw.split(/\s*\|\s*/) : raw.split('|');
    parts.forEach(u => { const t = String(u || '').trim(); if (t) fileLinks.push(t); });
  }
  // ANCHOR:CLIENT.renderBookingDetailsModal_ApprovedBy:REPLACE
  if (fileLinks.length > 0) {
    filesHtml = fileLinks.map((url, i) =>
      `<a href="${url}" target="_blank" class="badge bg-light text-primary border me-1 mb-1 text-decoration-none"><i class="fas fa-paperclip me-1"></i>\u0E44\u0E1F\u0E25\u0E4C ${i + 1}</a>`
    ).join('');
  }

  // \u2705 V-BERRY FIX: \u0E1B\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E41\u0E2A\u0E14\u0E07\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34 (Smart Display)
  const rawApprovedBy = String(detail.ApprovedBy || '').trim();
  const displayApprovedBy = rawApprovedBy ? (isAdmin ? rawApprovedBy : '\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A') : '';

  bodyEl.innerHTML = `
    <div class="p-2">
      <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
        <div>
          <h5 class="fw-bold text-dark mb-1 booking-detail-title"><i class="fas fa-bookmark text-primary me-2"></i>${safe(detail.Purpose)}</h5>
          <div class="booking-teacher booking-detail-teacher text-muted small mt-1">👨‍🏫 อ.ผู้สอน: <span class="fw-bold text-dark">${safe(detail.teacherName || '-')}</span></div>
          <div class="text-muted small booking-detail-meta mt-1">ID: <span class="font-monospace text-dark select-all">${safe(bookingId)}</span></div>
          ${displayApprovedBy ? `<div class="text-muted small mt-1"><i class="fas fa-user-check me-1"></i>\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E42\u0E14\u0E22: <span class="fw-bold text-dark">${safe(displayApprovedBy)}</span></div>` : ``}
        </div>
        <div class="text-end">
          ${typeof getStatusBadge === 'function' ? getStatusBadge(statusRaw) : `<span class="badge bg-secondary">${safe(statusRaw)}</span>`}
        </div>
      </div>

      <div class="row g-3">
        <div class="col-md-6">
          <div class="p-3 bg-light rounded-3 h-100 border border-light">
            <h6 class="fw-bold text-secondary mb-3"><i class="fas fa-user me-2"></i>\u0E1C\u0E39\u0E49\u0E08\u0E2D\u0E07</h6>
            <ul class="list-unstyled mb-0 small">
              <li class="mb-2"><strong>\u0E0A\u0E37\u0E48\u0E2D:</strong> ${safe(detail.BookerName)}</li>
              <li class="mb-2"><strong>\u0E42\u0E17\u0E23:</strong> ${phoneHtml}</li>
              <li><strong>\u0E08\u0E33\u0E19\u0E27\u0E19:</strong> ${safe(detail.Attendees)} \u0E17\u0E48\u0E32\u0E19</li>
            </ul>
          </div>
        </div>

        <div class="col-md-6">
          <div class="p-3 bg-light rounded-3 h-100 border border-light">
            <h6 class="fw-bold text-secondary mb-3"><i class="fas fa-clock me-2"></i>\u0E27\u0E31\u0E19\u0E40\u0E27\u0E25\u0E32</h6>
            <ul class="list-unstyled mb-0 small">
              <li class="mb-2"><strong>\u0E2B\u0E49\u0E2D\u0E07:</strong> <span class="text-primary fw-bold">${roomLabel}</span></li>
              <li class="mb-2"><strong>\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48:</strong> ${safe(displayDate)}</li>
              <li><strong>\u0E40\u0E27\u0E25\u0E32:</strong> ${safe(formatTime(detail.StartTime))} - ${safe(formatTime(detail.EndTime))} \u0E19.</li>
            </ul>
          </div>
        </div>

        <div class="col-12">
          <div class="p-3 bg-white border rounded-3">
            <div class="mb-2"><small class="fw-bold text-secondary">\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C:</small> <span class="small">${safe(detail.Equipment || '-')}</span></div>
            <div class="mb-2"><small class="fw-bold text-secondary">\u0E44\u0E1F\u0E25\u0E4C:</small> <div>${filesHtml}</div></div>
            <div><small class="fw-bold text-secondary">\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38:</small> <span class="small text-muted">${safe(detail.Remark || '-')}</span></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const isPending = ['\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34', 'pending'].includes(statusLower);
  const isApproved = ['\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34', 'approved', '\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E41\u0E25\u0E49\u0E27'].includes(statusLower);

  let actionsHtml = `
    <button type="button" class="btn btn-light text-secondary rounded-pill fw-medium" data-bs-dismiss="modal">
      \u0E1B\u0E34\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07
    </button>
  `;

  if (isAdmin && isPending) {
    actionsHtml = `
      <button type="button" class="btn btn-outline-secondary rounded-pill fw-medium" data-bs-dismiss="modal">\u0E1B\u0E34\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07</button>
      <button type="button" class="btn btn-danger rounded-pill px-4 ms-auto shadow-sm" id="btnRejectBooking">
        <i class="fas fa-times me-2"></i>\u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34
      </button>
      <button type="button" class="btn btn-success rounded-pill px-4 ms-2 shadow-sm" id="btnApproveBooking">
        <i class="fas fa-check me-2"></i>\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34
      </button>
    `;
  }

  let showCancel = false;
  if (isAdmin) {
    if (isPending || isApproved) showCancel = true;
  } else {
    if (isPending) showCancel = true;
  }

  if (showCancel) {
    actionsHtml += `
      <button type="button" class="btn btn-danger rounded-pill px-4 ms-2 shadow-sm" id="btnCancelBooking">
        <i class="fas fa-times-circle me-2"></i>\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07
      </button>
    `;
  }

  footerEl.innerHTML = `<div class="d-flex w-100 align-items-center">${actionsHtml}</div>`;

  const btnCancel = document.getElementById('btnCancelBooking');
  if (btnCancel) {
    btnCancel.onclick = function () {
      const currentModalEl = document.getElementById('bookingDetailsModal');
      try {
        if (currentModalEl && typeof bootstrap !== 'undefined') {
          const currentModal = bootstrap.Modal.getInstance(currentModalEl);
          if (currentModal) currentModal.hide();
        }
      } catch (e) {}

      if (typeof window.openCancelModal === 'function') {
        window.openCancelModal(bookingId);
      } else {
        alert('\u0E23\u0E30\u0E1A\u0E1A\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19');
      }
    };
  }

  const btnApprove = document.getElementById('btnApproveBooking');
  if (btnApprove) {
    btnApprove.onclick = function () {
      performBookingAction('approve', bookingId);
    };
  }

  const btnReject = document.getElementById('btnRejectBooking');
  if (btnReject) {
    btnReject.onclick = function () {
      performBookingAction('reject', bookingId);
    };
  }
}

async function handleConfirmCancel(bookingId) {
  try {
    const id = String(bookingId || '').trim() || String(window.currentBookingId || '').trim();
    if (!id) {
      alert('\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07');
      return;
    }

    window.currentBookingId = id;

    const currentModalEl = document.getElementById('bookingDetailsModal');
    try {
      if (currentModalEl && typeof bootstrap !== 'undefined') {
        const inst = bootstrap.Modal.getInstance(currentModalEl);
        if (inst) inst.hide();
      }
    } catch (e) {}

    if (typeof window.openCancelModal === 'function') {
      window.openCancelModal(id);
      return;
    }

    alert('\u0E23\u0E30\u0E1A\u0E1A\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19');
  } catch (e) {
    alert(e && e.message ? e.message : '\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14');
  }
}





// ===== 5. \u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19\u0E0A\u0E48\u0E27\u0E22\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 =====
// ANCHOR:CLIENT.updateDateInputDisplay:REPLACE
function updateDateInputDisplay(inputElement) {
    if (!inputElement) return;

    // \u0E2B\u0E32\u0E2B\u0E23\u0E37\u0E2D\u0E2A\u0E23\u0E49\u0E32\u0E07 Element \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E41\u0E2A\u0E14\u0E07\u0E1C\u0E25
    let displayEl = inputElement.parentNode.querySelector('.date-be-display');
    if (!displayEl) {
        displayEl = document.createElement('div');
        
        // \u0E08\u0E31\u0E14\u0E43\u0E2B\u0E49\u0E0A\u0E34\u0E14\u0E02\u0E27\u0E32 (text-end) \u0E21\u0E35\u0E23\u0E30\u0E22\u0E30\u0E2B\u0E48\u0E32\u0E07\u0E14\u0E49\u0E32\u0E19\u0E1A\u0E19 (mt-1) \u0E41\u0E25\u0E30\u0E43\u0E0A\u0E49\u0E2A\u0E35 Primary \u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E18\u0E35\u0E21
        displayEl.className = 'date-be-display text-end mt-1 fade-in';
        displayEl.style.cssText = `
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--primary);
            padding-right: 0.5rem; /* \u0E02\u0E22\u0E31\u0E1A\u0E40\u0E02\u0E49\u0E32\u0E21\u0E32\u0E44\u0E21\u0E48\u0E43\u0E2B\u0E49\u0E0A\u0E34\u0E14\u0E02\u0E2D\u0E1A\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B */
            letter-spacing: 0.2px;
        `;
        
        // \u0E41\u0E17\u0E23\u0E01\u0E25\u0E07\u0E43\u0E19 .form-floating (\u0E08\u0E30\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E15\u0E49 input \u0E1E\u0E2D\u0E14\u0E35)
        inputElement.parentNode.appendChild(displayEl);
    }

    if (inputElement.value) {
        // \u0E43\u0E0A\u0E49\u0E44\u0E2D\u0E04\u0E2D\u0E19\u0E15\u0E34\u0E4A\u0E01\u0E16\u0E39\u0E01 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E37\u0E48\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E2B\u0E21\u0E32\u0E22\u0E27\u0E48\u0E32 "\u0E23\u0E30\u0E1A\u0E1A\u0E23\u0E31\u0E1A\u0E23\u0E39\u0E49\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E19\u0E35\u0E49\u0E41\u0E25\u0E49\u0E27"
        displayEl.innerHTML = `<i class="fas fa-check-circle me-1 opacity-75"></i>\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A \u0E1E.\u0E28. ${formatDateBE(inputElement.value)}`;
        displayEl.style.display = 'block';
    } else {
        displayEl.style.display = 'none';
    }
}
// ANCHOR:CLIENT.updateDateInputDisplay:END

window.showToast = function(title, message, type) {
    // \u0E16\u0E49\u0E32\u0E21\u0E35 showNotification \u0E43\u0E2B\u0E49\u0E40\u0E23\u0E35\u0E22\u0E01\u0E43\u0E0A\u0E49
    if (typeof showNotification === 'function') {
        // \u0E1B\u0E23\u0E31\u0E1A\u0E08\u0E39\u0E19 Parameter \u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E01\u0E31\u0E19
        if (!type && (message === 'success' || message === 'error' || message === 'info' || message === 'warning')) {
             showNotification(title, message); // \u0E01\u0E23\u0E13\u0E35\u0E2A\u0E48\u0E07\u0E21\u0E32\u0E41\u0E04\u0E48 (msg, type)
        } else {
             showNotification(message || title, type || 'info'); 
        }
    } else {
        console.warn('Toast System Missing:', title, message);
        // Fallback \u0E16\u0E49\u0E32\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E30\u0E1A\u0E1A Toast
        if(title || message) alert(`${title}: ${message}`);
    }
};


// \uD83C\uDF1F Berry Fix: showNotification \u0E15\u0E31\u0E27\u0E08\u0E23\u0E34\u0E07 (\u0E1B\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E38\u0E07\u0E43\u0E2B\u0E49 Robust)
function showNotification(msg, type = 'info') {
    const toastEl = document.getElementById('notificationToast');
    if (!toastEl) {
        console.log(`[${type}] ${msg}`);
        return;
    }
    
    // Map Title \u0E15\u0E32\u0E21 Type
    const titles = {
        success: '\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08',
        error: '\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14',
        warning: '\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19',
        info: '\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25'
    };
    
    const icons = {
        success: 'fas fa-check-circle text-success',
        error: 'fas fa-times-circle text-danger',
        warning: 'fas fa-exclamation-triangle text-warning',
        info: 'fas fa-info-circle text-info'
    };
    
    document.getElementById('toastTitle').textContent = titles[type] || '\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19';
    document.getElementById('toastMessage').textContent = msg;
    
    const iconEl = document.getElementById('toastIcon');
    if(iconEl) iconEl.className = icons[type] || icons.info;
    
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
}



// Helper \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E2A\u0E23\u0E49\u0E32\u0E07 Badge \u0E2A\u0E16\u0E32\u0E19\u0E30
function getStatusBadge(status) {
    const map = {
        '\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34': '<span class="badge bg-success"><i class="fas fa-check me-1"></i>\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34</span>',
        '\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34': '<span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i>\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34</span>',
        '\u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34': '<span class="badge bg-danger"><i class="fas fa-times me-1"></i>\u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34</span>',
        '\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01': '<span class="badge bg-secondary"><i class="fas fa-ban me-1"></i>\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01</span>'
    };
    return map[status] || `<span class="badge bg-secondary">${status}</span>`;
}

function formatDateBE(dateValue) {
  if (!dateValue) return '\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48';
  
  let dateObj = (typeof parseFlexibleDateFrontend === 'function') 
      ? parseFlexibleDateFrontend(dateValue) 
      : new Date(dateValue);
  
  if (!dateObj || isNaN(dateObj.getTime())) {
    return '\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07';
  }
  
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();
  
  // \u0E41\u0E1B\u0E25\u0E07 \u0E04.\u0E28. \u0E40\u0E1B\u0E47\u0E19 \u0E1E.\u0E28. (\u0E16\u0E49\u0E32\u0E04\u0E48\u0E32\u0E22\u0E31\u0E07\u0E40\u0E1B\u0E47\u0E19 \u0E04.\u0E28. \u0E2D\u0E22\u0E39\u0E48\u0E04\u0E37\u0E2D < 2400)
  // \u0E1B\u0E01\u0E15\u0E34 Date Object \u0E08\u0E30\u0E40\u0E01\u0E47\u0E1A\u0E40\u0E1B\u0E47\u0E19 \u0E04.\u0E28.
  const yearBE = year < 2400 ? year + 543 : year; 
  
  // Format: 10/12/2568
  // \u0E40\u0E15\u0E34\u0E21 0 \u0E02\u0E49\u0E32\u0E07\u0E2B\u0E19\u0E49\u0E32\u0E43\u0E2B\u0E49\u0E2A\u0E27\u0E22\u0E07\u0E32\u0E21 (Optional: \u0E16\u0E49\u0E32\u0E0A\u0E2D\u0E1A\u0E41\u0E1A\u0E1A\u0E21\u0E35 0)
  const dayStr = day.toString().padStart(2, '0');
  const monthStr = month.toString().padStart(2, '0');
  
  return `${dayStr}/${monthStr}/${yearBE}`;
}

function parseFlexibleDateFrontend(dateInput) {
  if (!dateInput) return null;
  
  // 1. \u0E16\u0E49\u0E32\u0E40\u0E1B\u0E47\u0E19 Object Date \u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27
  if (dateInput instanceof Date) return dateInput;
  
  // 2. \u0E16\u0E49\u0E32\u0E40\u0E1B\u0E47\u0E19 Timestamp (\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02)
  if (typeof dateInput === 'number') return new Date(dateInput);
  
  // 3. \u0E16\u0E49\u0E32\u0E40\u0E1B\u0E47\u0E19 String
  if (typeof dateInput === 'string') {
    const str = dateInput.trim();
    if (str === '') return null;

    // \u0E01\u0E23\u0E13\u0E35 ISO String (\u0E40\u0E0A\u0E48\u0E19 2023-12-25T...)
    // \u0E2B\u0E23\u0E37\u0E2D YYYY-MM-DD
    if (str.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(str);
    }
    
    // \u0E01\u0E23\u0E13\u0E35 DD/MM/YYYY (Format \u0E44\u0E17\u0E22\u0E17\u0E35\u0E48\u0E40\u0E08\u0E49\u0E32\u0E19\u0E32\u0E22\u0E2D\u0E32\u0E08\u0E08\u0E30\u0E43\u0E0A\u0E49)
    const parts = str.split('/');
    if (parts.length === 3) {
      // [DD, MM, YYYY]
      let day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10) - 1; // \u0E40\u0E14\u0E37\u0E2D\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E17\u0E35\u0E48 0
      let year = parseInt(parts[2], 10);
      
      // \u0E40\u0E0A\u0E47\u0E04\u0E27\u0E48\u0E32\u0E40\u0E1B\u0E47\u0E19 \u0E1E.\u0E28. \u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48 (\u0E16\u0E49\u0E32\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32 2400 \u0E40\u0E14\u0E32\u0E27\u0E48\u0E32\u0E40\u0E1B\u0E47\u0E19 \u0E1E.\u0E28.)
      if (year > 2400) {
        year -= 543;
      }
      
      const d = new Date(year, month, day);
      // \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E27\u0E48\u0E32\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E08\u0E23\u0E34\u0E07 (\u0E40\u0E0A\u0E48\u0E19 \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48 32/13/2023)
      if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return d;
      }
    }
  }
  
  // Fallback: \u0E43\u0E2B\u0E49 JS \u0E25\u0E2D\u0E07\u0E1E\u0E22\u0E32\u0E22\u0E32\u0E21 Parse \u0E40\u0E2D\u0E07
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? null : d;
}

// ANCHOR:CLIENT.UTILS.toMs:NEW
// \u0E41\u0E16\u0E21\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19 Helper \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A Sort \u0E43\u0E2B\u0E49\u0E14\u0E49\u0E27\u0E22\u0E04\u0E48\u0E30 \u0E40\u0E1C\u0E37\u0E48\u0E2D\u0E40\u0E08\u0E49\u0E32\u0E19\u0E32\u0E22\u0E2B\u0E32\u0E44\u0E21\u0E48\u0E40\u0E08\u0E2D
function toMs(dateStr) {
    const d = parseFlexibleDateFrontend(dateStr);
    return d ? d.getTime() : 0;
}



  async function copyToClipboard(text, button) {
      try {
          await navigator.clipboard.writeText(text);
          if (button) {
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check me-1"></i>\u0E04\u0E31\u0E14\u0E25\u0E2D\u0E01\u0E41\u0E25\u0E49\u0E27!';
            button.classList.add('btn-success');
            button.classList.remove('btn-outline-secondary');
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('btn-success');
                button.classList.add('btn-outline-secondary');
            }, 2000);
          }
          showNotification('\u0E04\u0E31\u0E14\u0E25\u0E2D\u0E01\u0E25\u0E34\u0E07\u0E01\u0E4C\u0E41\u0E25\u0E49\u0E27', 'success');
      } catch (err) {
          console.error('Failed to copy text: ', err);
          showNotification('\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E04\u0E31\u0E14\u0E25\u0E2D\u0E01\u0E44\u0E14\u0E49', 'error');
      }
  }

function handleCancelFromDetails(bookingId) {
  try {
    const id = String(bookingId || '').trim();
    if (!id) {
      alert('\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07');
      return;
    }
    if (typeof window.openCancelModal !== 'function') {
      alert('\u0E23\u0E30\u0E1A\u0E1A\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19');
      return;
    }
    window.openCancelModal(id);
  } catch (e) {
    alert(e && e.message ? e.message : '\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14');
  }
}

function bindCancelPhoneSuggestion() {
  const phoneEl = document.getElementById('cancelPhone');
  const suggestBox = document.getElementById('cancelBookingSuggestions');
  const idInput = document.getElementById('cancelBookingIdInput');

  if (!phoneEl || !suggestBox || !idInput) return;

  let debounceTimer = null;

  const triggerSearch = () => {
    const phone = String(phoneEl.value || '').trim();
    if (phone.replace(/\D/g, '').length < 9) {
      suggestBox.innerHTML = '';
      return;
    }

    suggestBox.innerHTML = '<div class="text-muted small">\u0E01\u0E33\u0E25\u0E31\u0E07\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14...</div>';

    callServer('getRecentBookingsByPhone', phone)
      .then(res => {
        const list = (res && res.ok && Array.isArray(res.data)) ? res.data : [];
        if (!list.length) {
          suggestBox.innerHTML = '<div class="text-muted small">\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E02\u0E2D\u0E07\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E19\u0E35\u0E49</div>';
          return;
        }

        suggestBox.innerHTML = `
          <div class="small fw-bold mb-1">\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14</div>
          ${list.map(b => `
            <button type="button"
                    class="btn btn-outline-secondary btn-sm w-100 text-start mb-1"
                    onclick="selectCancelBookingId('${String(b.bookingId || '').trim()}')">
              <strong>${String(b.bookingId || '').trim()}</strong>
              <div class="small text-muted">
                \u0E2B\u0E49\u0E2D\u0E07 ${String(b.roomId || '-') } | ${typeof formatThaiDate === 'function' ? formatThaiDate(b.bookingDate) : (b.bookingDate || '-') } | ${String(b.startTime || '')}
              </div>
            </button>
          `).join('')}
        `;
      })
      .catch(err => {
        suggestBox.innerHTML = '<div class="text-danger small">\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E04\u0E49\u0E19\u0E2B\u0E32</div>';
        console.error(err);
      });
  };

  phoneEl.onblur = triggerSearch;
  phoneEl.oninput = function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(triggerSearch, 400);
  };
}

function selectCancelBookingId(id) {
  const idInput = document.getElementById('cancelBookingIdInput');
  if (idInput) {
    idInput.value = String(id || '').trim();
  }

  // Highlight selected suggestion button
  const suggestBox = document.getElementById('cancelBookingSuggestions');
  if (suggestBox) {
    const buttons = suggestBox.querySelectorAll('button');
    buttons.forEach(btn => {
      const btnIdEl = btn.querySelector('strong');
      const btnId = btnIdEl ? btnIdEl.innerText.trim() : '';
      if (btnId && btnId === String(id || '').trim()) {
        btn.classList.remove('btn-outline-secondary');
        btn.classList.add('btn-danger', 'text-white');
      } else {
        btn.classList.remove('btn-danger', 'text-white');
        btn.classList.add('btn-outline-secondary');
      }
    });
  }
}



function showManualBookingId() {
  const manualBox = document.getElementById('manualBookingIdContainer');
  if (manualBox) {
    manualBox.classList.remove('d-none');
  }

  const modalEl = document.getElementById('cancelBookingModal');
  if (modalEl) {
    modalEl.removeAttribute('data-booking-id');
  }

  const input = document.getElementById('cancelBookingIdInput');
  if (input) {
    input.focus();
  }
}

async function confirmCancel() {
  const btn = document.querySelector('#cancelBookingModal .btn-danger'); // \u0E1B\u0E38\u0E48\u0E21\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E43\u0E19 Modal
  const originalText = btn ? btn.innerHTML : '\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19';

  try {
    const bookingIdEl = document.getElementById('cancelBookingIdInput');
    const phoneEl = document.getElementById('cancelPhone');
    const reasonEl = document.getElementById('cancelReason');

    const bookingId = String(bookingIdEl ? bookingIdEl.value : '').trim();
    const phoneNumber = String(phoneEl ? phoneEl.value : '').trim();
    const reason = String(reasonEl ? reasonEl.value : '').trim();

    if (!bookingId) { alert('\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07'); return; }
    if (!reason) { alert('\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01'); return; }

    const role = String((window.currentSession && window.currentSession.role) || '').trim().toLowerCase();
    const actor = String((window.currentSession && (window.currentSession.displayName || window.currentSession.username)) || '').trim() || 'user';
    const isAdmin = (role === 'admin' || role === 'superadmin');

    if (!isAdmin && !phoneNumber) {
       alert('\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C'); return;
    }

    const payload = { bookingId, phoneNumber, reason, role, actor };

    // UI Busy State
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>\u0E01\u0E33\u0E25\u0E31\u0E07\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01...';
    }
    
    // Hide Modal & Show Loading Overlay
    const modalEl = document.getElementById('cancelBookingModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if(modalInstance) modalInstance.hide();
    
    showLoading(true, '\u0E01\u0E33\u0E25\u0E31\u0E07\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01...');

    // Server Call
    const res = await apiCall('cancelBookingUnified', payload);

    if (res && res.ok) {
        showNotification('\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08', '\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22', 'success');
        
        // Refresh Everything
        if (typeof refreshDashboard === 'function') refreshDashboard();
        if (typeof loadLatestBookings === 'function') loadLatestBookings();
        if (typeof loadCombinedSchedule === 'function') loadCombinedSchedule(true);
        if (window.currentRoom && window.currentDate && typeof loadScheduleForRoom === 'function') {
            loadScheduleForRoom(window.currentRoom, window.currentDate);
        }
    } else {
        throw new Error((res && (res.error || res.message)) || '\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08');
    }

  } catch (e) {
    // Error Handling
    alert('\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14: ' + e.message);
    // Re-open modal if error
    const modalEl = document.getElementById('cancelBookingModal');
    if(modalEl) new bootstrap.Modal(modalEl).show();
    
  } finally {
    // Cleanup
    showLoading(false);
    if(btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
  }
}

window.openCancelModal = function (bookingId) {
  const modalEl = document.getElementById('cancelBookingModal');
  if (!modalEl) {
    alert('\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01 (cancelBookingModal)');
    return;
  }

  const idWrap = document.getElementById('manualBookingIdContainer');
  const idInput = document.getElementById('cancelBookingIdInput');
  const phoneEl = document.getElementById('cancelPhone');
  const reasonEl = document.getElementById('cancelReason');
  const suggestBox = document.getElementById('cancelBookingSuggestions');

  const id = String(bookingId == null ? '' : bookingId).trim();

  if (idInput) idInput.value = id;
  if (phoneEl) phoneEl.value = '';
  if (reasonEl) reasonEl.value = '';
  if (suggestBox) suggestBox.innerHTML = '';

  if (id) {
    modalEl.setAttribute('data-booking-id', id);
    if (idWrap) idWrap.classList.add('d-none');
    if (idInput) idInput.disabled = true;
  } else {
    modalEl.setAttribute('data-booking-id', '');
    if (idWrap) idWrap.classList.add('d-none'); // Hide the manual Booking ID input container completely when opened generally
    if (idInput) idInput.disabled = false;
  }

  const role = String((window.currentSession && window.currentSession.role) || '').trim().toLowerCase();
  const isAdmin = ['admin', 'superadmin', 'super_admin'].includes(role);

  if (phoneEl) {
    if (isAdmin) {
      phoneEl.value = '';
      phoneEl.disabled = true;
    } else {
      phoneEl.disabled = false;
    }
  }

  try {
    if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
      console.error('bootstrap.Modal not available');
      alert('\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E1B\u0E34\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E44\u0E14\u0E49 (bootstrap \u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21)');
      return;
    }

    // \u0E01\u0E31\u0E19 instance \u0E04\u0E49\u0E32\u0E07: \u0E43\u0E0A\u0E49\u0E2D\u0E31\u0E19\u0E40\u0E14\u0E34\u0E21\u0E16\u0E49\u0E32\u0E21\u0E35 \u0E44\u0E21\u0E48\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E0B\u0E49\u0E2D\u0E19
    const inst = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true, focus: true });

    // bind suggestion \u0E15\u0E2D\u0E19 modal \u0E40\u0E1B\u0E34\u0E14\u0E08\u0E23\u0E34\u0E07 (\u0E01\u0E31\u0E19\u0E01\u0E23\u0E13\u0E35 element \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48 ready)
    const onShown = () => {
      try {
        if (typeof window.bindCancelPhoneSuggestion === 'function') {
          window.bindCancelPhoneSuggestion();
        }
      } catch (e) {
        console.error('bindCancelPhoneSuggestion error:', e);
      } finally {
        modalEl.removeEventListener('shown.bs.modal', onShown);
      }
    };
    modalEl.addEventListener('shown.bs.modal', onShown);

    inst.show();
  } catch (e) {
    console.error('openCancelModal error:', e);
    alert('\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E1B\u0E34\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E44\u0E14\u0E49: ' + (e && e.message ? e.message : e));
  }
};

// \u0E43\u0E2B\u0E49 window \u0E21\u0E2D\u0E07\u0E40\u0E2B\u0E47\u0E19\u0E41\u0E19\u0E48 \u0E46 \u0E41\u0E21\u0E49 exportClientApi \u0E23\u0E31\u0E19\u0E01\u0E48\u0E2D\u0E19/\u0E2B\u0E25\u0E31\u0E07
window.openCancelModal = window.openCancelModal;
window.runBerryDiagnostics = window.runBerryDiagnostics;

function clearDashboardBookingDetails() {
  const candidates = [
    'bookingDetailsPanel',
    'bookingDetailsContainer',
    'bookingDetailsBox',
    'dashboardBookingDetails',
    'bookingDetailsArea'
  ];

  for (let i = 0; i < candidates.length; i++) {
    const el = document.getElementById(candidates[i]);
    if (el) {
      el.innerHTML = '';
      el.classList.add('d-none');
      return true;
    }
  }

  const card = document.querySelector('[data-role="booking-details"]');
  if (card) {
    card.innerHTML = '';
    card.classList.add('d-none');
    return true;
  }

  return false;
}

async function refreshDashboardAfterAdminAction() {
  try {
    if (typeof clearDashboardBookingDetails === 'function') {
      clearDashboardBookingDetails();
    }

    if (typeof loadStats === 'function') await loadStats();

    if (typeof loadDashboard === 'function') {
      await loadDashboard(true);
    }

    if (typeof loadRecentBookings === 'function') {
      await loadRecentBookings(true);
    }

  } catch (e) {
    console.warn('refreshDashboardAfterAdminAction error:', e);
  }
}

// \u2705 Secure Admin Action with Loading State
async function performBookingAction(action, bookingId) {
  const id = String(bookingId || '').trim();
  if (!id) {
    showToast('\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14', '\u0E44\u0E21\u0E48\u0E1E\u0E1A Booking ID', 'error');
    return;
  }

  const session = window.currentSession || {};
  const role = String(session.role || '').toLowerCase();

  if (!role || role === 'guest') {
    showToast('\u0E2B\u0E21\u0E14\u0E40\u0E27\u0E25\u0E32', '\u0E40\u0E0B\u0E2A\u0E0A\u0E31\u0E19\u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E43\u0E2B\u0E21\u0E48', 'warning');
    return;
  }

  const adminName = String(session.displayName || session.username || session.user || 'Admin').trim();
  const act = String(action || '').trim().toLowerCase();

  let actionText = '';
  const payload = {
    bookingId: id,
    action: act,
    actor: adminName,
    ApprovedBy: adminName,
    remark: ''
  };

  // UI & Logic Prep
  if (act === 'approve') {
    actionText = '\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34';
    if (!confirm(`\u0E22\u0E37\u0E19\u0E22\u0E31\u0E19\u0E01\u0E32\u0E23 "${actionText}" \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E19\u0E35\u0E49?`)) return;
  } else if (act === 'reject') {
    actionText = '\u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34';
    const reason = prompt(`\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E01\u0E32\u0E23 "${actionText}" (\u0E16\u0E49\u0E32\u0E21\u0E35):`, '');
    if (reason === null) return; // User cancelled prompt
    payload.remark = String(reason || '').trim();
  } else {
    showToast('\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14', 'Unknown action: ' + act, 'error');
    return;
  }

  // Hide Details Modal First
  const modalEl = document.getElementById('bookingDetailsModal');
  if (modalEl) {
      const inst = bootstrap.Modal.getInstance(modalEl);
      if(inst) inst.hide();
  }

  // Start Loading
  showLoading(true, `\u0E01\u0E33\u0E25\u0E31\u0E07\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23 ${actionText}...`);

  try {
    const res = await callServer('processBookingAction', payload, 25000);

    const ok = !!(res && (res.ok === true || res.success === true));
    if (!ok) throw new Error(res?.message || res?.error || `${actionText} \u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08`);

    showNotification('\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08', `\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23 ${actionText} \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`, 'success');

    // Refresh Data
    await refreshDashboardAfterAdminAction();
    if (typeof loadCombinedSchedule === 'function') loadCombinedSchedule(true);
    if (window.currentRoom && typeof loadScheduleForRoom === 'function') {
        loadScheduleForRoom(window.currentRoom, window.currentDate);
    }

  } catch (e) {
    console.error('performBookingAction error:', e);
    showToast('\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14', e.message || '\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D', 'error');
    // Re-open details modal if failed (optional, but good UX)
    if(modalEl && typeof openBookingDetail === 'function') openBookingDetail(id);

  } finally {
    showLoading(false);
  }
}



// ==========================================
// \uD83D\uDD11 Login Functions
// ==========================================
async function performLogin(event) {
  if (event) event.preventDefault();
  
  // 1. \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A Element ID (\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A\u0E17\u0E31\u0E49\u0E07\u0E0A\u0E37\u0E48\u0E2D\u0E40\u0E01\u0E48\u0E32\u0E41\u0E25\u0E30\u0E0A\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E21\u0E48)
  const usernameEl = document.getElementById('loginUsername') || document.getElementById('username');
  const passwordEl = document.getElementById('loginPassword') || document.getElementById('password');
  
  if (!usernameEl || !passwordEl) {
    console.error("\u274C \u0E2B\u0E32 Input \u0E44\u0E21\u0E48\u0E40\u0E08\u0E2D! \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E0A\u0E47\u0E04 ID \u0E43\u0E19 HTML");
    return;
  }
  
  const username = usernameEl.value.trim();
  const password = passwordEl.value.trim();

  if (!username || !password) {
    showToast('\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19', '\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E41\u0E25\u0E30\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19', 'warning');
    return;
  }

  // \u0E40\u0E23\u0E35\u0E22\u0E01\u0E43\u0E0A\u0E49 UI Loading (\u0E16\u0E49\u0E32\u0E21\u0E35)
  if(typeof showLoading === 'function') showLoading(true, '\u0E01\u0E33\u0E25\u0E31\u0E07\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25...');

  try {
    // 2. \u0E2A\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E1B Server
    const result = await callServer('loginUser', { username, password });
    
    if(typeof showLoading === 'function') showLoading(false);
    
    // 3. \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E1C\u0E25\u0E25\u0E31\u0E1E\u0E18\u0E4C (\u0E41\u0E01\u0E49\u0E43\u0E2B\u0E49\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A Server: \u0E43\u0E0A\u0E49 .status)
    if (result && result.status === true) {
      
      // \u2705 \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 Session
      window.currentSession = result.user;
      
      // \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E40\u0E27\u0E25\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21 Login \u0E41\u0E25\u0E30\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 User \u0E2A\u0E33\u0E23\u0E2D\u0E07
      const sessionStart = new Date().getTime();
      localStorage.setItem('berry_session_start', sessionStart); 
      localStorage.setItem('berry_user_session', JSON.stringify(result.user)); 
      
      // \u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15 UI \u0E2B\u0E19\u0E49\u0E32\u0E08\u0E2D\u0E2B\u0E25\u0E31\u0E01
      if (typeof updateUIForLoggedInUser === 'function') updateUIForLoggedInUser();
      
      // \u0E1B\u0E34\u0E14 Modal Login
      const loginModalEl = document.getElementById('loginModal');
      if (loginModalEl) {
        // \u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A\u0E17\u0E31\u0E49\u0E07 Bootstrap 5 \u0E41\u0E25\u0E30 JQuery \u0E2B\u0E23\u0E37\u0E2D Vanilla JS
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
           const modalInstance = bootstrap.Modal.getInstance(loginModalEl) || new bootstrap.Modal(loginModalEl);
           modalInstance.hide();
        } else {
           // Fallback \u0E1B\u0E34\u0E14\u0E14\u0E37\u0E49\u0E2D\u0E46
           loginModalEl.classList.remove('show'); 
           loginModalEl.style.display = 'none';
           const backdrop = document.querySelector('.modal-backdrop');
           if(backdrop) backdrop.remove();
        }
      }
      
      // \u0E41\u0E2A\u0E14\u0E07\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E19\u0E23\u0E31\u0E1A (\u0E43\u0E0A\u0E49 displayName \u0E15\u0E32\u0E21 Server)
      const showName = result.user.displayName || result.user.name || username;
      showToast('\u0E22\u0E34\u0E19\u0E14\u0E35\u0E15\u0E49\u0E2D\u0E19\u0E23\u0E31\u0E1A', `\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E38\u0E13 ${showName} \u0E40\u0E1A\u0E2D\u0E23\u0E35\u0E48\u0E04\u0E34\u0E14\u0E16\u0E36\u0E07\u0E08\u0E31\u0E07\u0E40\u0E25\u0E22!`, 'success');
      
      // \uD83D\uDE80 \u0E40\u0E23\u0E34\u0E48\u0E21\u0E08\u0E31\u0E1A\u0E40\u0E27\u0E25\u0E32\u0E19\u0E31\u0E1A\u0E16\u0E2D\u0E22\u0E2B\u0E25\u0E31\u0E07\u0E17\u0E31\u0E19\u0E17\u0E35
      startSessionTimer();

    } else {
      // \u0E01\u0E23\u0E13\u0E35 Login \u0E44\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19
      showToast('\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08', result.message || '\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07', 'danger');
    }
  } catch (err) {
    if(typeof showLoading === 'function') showLoading(false);
    console.error(err);
    showToast('\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14', 'Login Error: ' + err.message, 'danger');
  }
}

// ==========================================
// \u23F3 Session Management (Auto Logout) - REPLACE ALL
// \u0E43\u0E0A\u0E49 expiry + sliding timeout (\u0E15\u0E48\u0E2D\u0E2D\u0E32\u0E22\u0E38\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E21\u0E35 activity)
// ==========================================

const BERRY_SESSION_KEY = 'berry_user_session';
const BERRY_EXPIRY_KEY = 'berry_session_expiry';
const BERRY_SESSION_TTL_MS = 60 * 60 * 1000; // 1 \u0E0A\u0E31\u0E48\u0E27\u0E42\u0E21\u0E07
const BERRY_ACTIVITY_THROTTLE_MS = 15000; // \u0E15\u0E48\u0E2D\u0E2D\u0E32\u0E22\u0E38\u0E16\u0E35\u0E48\u0E2A\u0E38\u0E14\u0E17\u0E38\u0E01 15 \u0E27\u0E34

let berryLastTouchAt = 0;

function isUserLoggedIn() {
  const s = window.currentSession || {};
  const role = String(s.role || '').toLowerCase().trim();
  const hasUser = !!(s.username || s.user || s.displayName);
  return hasUser && role !== 'guest';
}

function readExpiry() {
  const raw = localStorage.getItem(BERRY_EXPIRY_KEY);
  const n = Number(String(raw || '').trim());
  return Number.isFinite(n) ? n : 0;
}

function writeExpiry(expiryTs) {
  try { localStorage.setItem(BERRY_EXPIRY_KEY, String(expiryTs)); } catch (e) {}
}

function touchSessionExpiry(force = false) {
  if (!isUserLoggedIn()) return false;

  const now = Date.now();
  if (!force && (now - berryLastTouchAt) < BERRY_ACTIVITY_THROTTLE_MS) return true;

  berryLastTouchAt = now;
  const nextExpiry = now + BERRY_SESSION_TTL_MS;
  writeExpiry(nextExpiry);
  return true;
}

function bindSessionActivityOnce() {
  if (window.__BERRY_SESSION_ACTIVITY_BOUND__) return;
  window.__BERRY_SESSION_ACTIVITY_BOUND__ = true;

  const handler = () => touchSessionExpiry(false);

  // activity \u0E17\u0E35\u0E48\u0E1E\u0E1A\u0E1A\u0E48\u0E2D\u0E22
  ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, handler, { passive: true });
  });

  // \u0E42\u0E1F\u0E01\u0E31\u0E2A\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E17\u0E35\u0E48\u0E41\u0E17\u0E47\u0E1A \u2192 \u0E15\u0E48\u0E2D\u0E2D\u0E32\u0E22\u0E38 + \u0E40\u0E0A\u0E47\u0E04 timeout
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      touchSessionExpiry(true);
      checkSessionTimeout();
    }
  });

  // \u0E2B\u0E25\u0E32\u0E22\u0E41\u0E17\u0E47\u0E1A: \u0E16\u0E49\u0E32\u0E41\u0E17\u0E47\u0E1A\u0E2D\u0E37\u0E48\u0E19\u0E15\u0E48\u0E2D\u0E2D\u0E32\u0E22\u0E38 expiry \u2192 \u0E41\u0E17\u0E47\u0E1A\u0E19\u0E35\u0E49\u0E15\u0E32\u0E21
  window.addEventListener('storage', (e) => {
    if (e && e.key === BERRY_EXPIRY_KEY) {
      // \u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E17\u0E33\u0E2D\u0E30\u0E44\u0E23 \u0E41\u0E04\u0E48\u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E43\u0E2B\u0E49 checkSessionTimeout \u0E2D\u0E48\u0E32\u0E19\u0E04\u0E48\u0E32\u0E43\u0E2B\u0E21\u0E48\u0E23\u0E2D\u0E1A\u0E16\u0E31\u0E14\u0E44\u0E1B
    }
    if (e && e.key === BERRY_SESSION_KEY && !e.newValue) {
      // \u0E2D\u0E35\u0E01\u0E41\u0E17\u0E47\u0E1A logout \u0E41\u0E25\u0E49\u0E27 \u2192 \u0E41\u0E17\u0E47\u0E1A\u0E19\u0E35\u0E49 logout \u0E15\u0E32\u0E21
      if (isUserLoggedIn()) performLogout(false);
    }
  });
}

function startSessionTimer() {
  bindSessionActivityOnce();

  if (window.sessionTimer) clearInterval(window.sessionTimer);

  // \u0E15\u0E48\u0E2D\u0E2D\u0E32\u0E22\u0E38\u0E17\u0E31\u0E19\u0E17\u0E35\u0E15\u0E2D\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21 (\u0E01\u0E31\u0E19\u0E40\u0E04\u0E2A\u0E42\u0E2B\u0E25\u0E14\u0E21\u0E32\u0E41\u0E25\u0E49\u0E27\u0E42\u0E14\u0E19\u0E40\u0E14\u0E49\u0E07)
  if (isUserLoggedIn()) touchSessionExpiry(true);

  window.sessionTimer = setInterval(() => {
    checkSessionTimeout();
  }, 60000);

  console.log('\u23F0 Session Timer Started (expiry mode)...');
}

function checkSessionTimeout() {
  // \u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 login \u0E2D\u0E22\u0E39\u0E48 \u0E01\u0E47\u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E17\u0E33\u0E2D\u0E30\u0E44\u0E23
  if (!isUserLoggedIn()) return;

  const expiry = readExpiry();

  // \u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E21\u0E35 expiry (\u0E40\u0E0A\u0E48\u0E19 storage \u0E16\u0E39\u0E01\u0E25\u0E49\u0E32\u0E07) \u2192 \u0E2A\u0E23\u0E49\u0E32\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E41\u0E1A\u0E1A\u0E01\u0E31\u0E19\u0E2B\u0E25\u0E38\u0E14
  if (!expiry || expiry <= 0) {
    touchSessionExpiry(true);
    return;
  }

  const now = Date.now();

  // \u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38\u0E08\u0E23\u0E34\u0E07
  if (now > expiry) {
    console.log('\u23F3 Session Expired: \u0E40\u0E01\u0E34\u0E19\u0E40\u0E27\u0E25\u0E32\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14');
    try { localStorage.removeItem(BERRY_EXPIRY_KEY); } catch (e) {}
    performLogout(true);
  }
}

function performLogout(isTimeout = false) {
  console.log('\uD83D\uDC4B Performing Logout...');

  window.currentSession = null;

  try { localStorage.removeItem(BERRY_SESSION_KEY); } catch (e) {}
  try { localStorage.removeItem(BERRY_EXPIRY_KEY); } catch (e) {}

  try { localStorage.removeItem('berry_user_session'); } catch (e) {}
  try { localStorage.removeItem('berry_session_start'); } catch (e) {}

  if (window.sessionTimer) {
    clearInterval(window.sessionTimer);
    window.sessionTimer = null;
  }

  if (typeof updateUIForLoggedOutUser === 'function') {
    updateUIForLoggedOutUser();
  }

  if (isTimeout) {
    if (typeof showLoginModal === 'function') showLoginModal();
    alert('\u0E2B\u0E21\u0E14\u0E40\u0E27\u0E25\u0E32\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19... \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E43\u0E2B\u0E21\u0E48');
  } else {
    if (typeof showToast === 'function') showToast('\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A', '\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27', 'info');
  }
}


// \u2705 \u0E41\u0E19\u0E30\u0E19\u0E33: \u0E15\u0E48\u0E2D\u0E2D\u0E32\u0E22\u0E38\u0E17\u0E38\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48\u0E40\u0E23\u0E35\u0E22\u0E01 apiCall \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E14\u0E49\u0E27\u0E22 (\u0E01\u0E31\u0E19\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E40\u0E07\u0E35\u0E22\u0E1A \u0E46 \u0E41\u0E25\u0E49\u0E27\u0E2B\u0E25\u0E38\u0E14)
// \u0E43\u0E2A\u0E48\u0E17\u0E49\u0E32\u0E22 function apiCall(...) \u0E01\u0E48\u0E2D\u0E19 resolve \u0E01\u0E47\u0E44\u0E14\u0E49 \u0E2B\u0E23\u0E37\u0E2D\u0E43\u0E2A\u0E48\u0E43\u0E19 callServer successHandler \u0E01\u0E47\u0E44\u0E14\u0E49
function berryTouchOnApiSuccess() {
  try { touchSessionExpiry(false); } catch (e) {}
}

/* ==========================================
   \uD83C\uDFA8 UI STATE MANAGEMENT (BERRY UPDATED)
   \u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A: Sidebar Desktop + Mobile Navbar + Admin Features
   ========================================== */
// ANCHOR:CLIENT.updateUIForLoggedInUser:REPLACE
function updateUIForLoggedInUser() {
  const session = window.currentSession;
  if (!session) return;

  console.log('\uD83C\uDFA8 Updating UI for User:', session.username || session.displayName);

  const role = String(session.role || 'user').toLowerCase();
  const isAdmin = (role === 'admin' || role === 'superadmin' || role === 'super_admin');
  const displayName = session.displayName || session.username || 'User';

  // --- 1. \u0E08\u0E31\u0E14\u0E01\u0E32\u0E23 Sidebar (Desktop) ---
  const guestSec = document.getElementById('guest-section');
  const userSec = document.getElementById('user-section');

  if (guestSec) {
    guestSec.classList.remove('d-block');
    guestSec.classList.add('d-none');
  }

  if (userSec) {
    userSec.classList.remove('d-none');
    userSec.classList.add('d-block');
  }

  // \u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E19 Sidebar
  const nameEl = document.getElementById('user-display-name');
  const phoneEl = document.getElementById('user-phone-display');
  const roleEl = document.getElementById('user-role-badge');

  if (nameEl) nameEl.innerText = displayName;
  if (phoneEl) phoneEl.innerText = session.phone ? `Tel: ${session.phone}` : '';

  if (roleEl) {
    if (isAdmin) {
      roleEl.style.display = 'inline-block';
      roleEl.classList.remove('d-none');
      roleEl.innerText = role.replace('_', '').toUpperCase();
      roleEl.className = 'badge rounded-pill px-3 bg-danger shadow-sm mb-1';
    } else {
      roleEl.style.display = 'none';
    }
  }

  // --- 2. \u0E08\u0E31\u0E14\u0E01\u0E32\u0E23 Admin Features ---
  const debugMenu = document.getElementById('adminDebugMenu');
  if (debugMenu) {
    if (isAdmin) debugMenu.classList.remove('d-none');
    else debugMenu.classList.add('d-none');
  }

  const dashboardBtn = document.getElementById('dashboard-tab');
  if (dashboardBtn) dashboardBtn.style.display = isAdmin ? '' : 'none';

  const dashboardNavItem = dashboardBtn ? dashboardBtn.closest('li') : null;
  if (dashboardNavItem) dashboardNavItem.style.display = isAdmin ? '' : 'none';

  // --- 3. [CHANGE] \u0E08\u0E31\u0E14\u0E01\u0E32\u0E23 Mobile Auth (Navbar) ---
  // \u0E41\u0E2A\u0E14\u0E07 Profile \u0E22\u0E48\u0E2D + \u0E1B\u0E38\u0E48\u0E21 Logout \u0E43\u0E19 Navbar \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E21\u0E37\u0E2D\u0E16\u0E37\u0E2D
  const mobileAuth = document.getElementById('mobileAuthContainer');
  if (mobileAuth) {
    const roleBadgeHtml = isAdmin 
        ? '<span class="badge bg-danger ms-2" style="font-size: 0.7rem;">ADMIN</span>' 
        : '<span class="badge bg-success ms-2" style="font-size: 0.7rem;">USER</span>';
        
    mobileAuth.innerHTML = `
        <div class="d-flex align-items-center justify-content-between px-2 bg-white bg-opacity-10 rounded-3 py-2 border border-white border-opacity-25">
            <div class="text-white fw-bold d-flex align-items-center overflow-hidden me-2">
                <div class="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center me-2 flex-shrink-0 shadow-sm" style="width:36px; height:36px;">
                    <i class="fas fa-user"></i>
                </div>
                <div class="d-flex flex-column" style="min-width: 0;">
                    <div class="d-flex align-items-center text-truncate">
                        <span class="text-truncate" style="max-width: 120px;">${displayName}</span>
                        ${roleBadgeHtml}
                    </div>
                    <small class="opacity-75 fw-normal text-truncate" style="font-size: 0.75rem;">
                        ${session.phone || '\u0E22\u0E34\u0E19\u0E14\u0E35\u0E15\u0E49\u0E2D\u0E19\u0E23\u0E31\u0E1A'}
                    </small>
                </div>
            </div>
            <button id="btn-mobile-logout" class="btn btn-sm btn-light text-danger fw-bold rounded-pill px-3 flex-shrink-0 shadow-sm" onclick="performLogout()">
                <i class="fas fa-sign-out-alt me-1"></i> \u0E2D\u0E2D\u0E01
            </button>
        </div>
    `;
  }
}

// ANCHOR:CLIENT.updateUIForLoggedOutUser:REPLACE
function updateUIForLoggedOutUser() {
  console.log('\uD83C\uDFA8 UI: Switching to GUEST mode');

  // --- 1. \u0E08\u0E31\u0E14\u0E01\u0E32\u0E23 Sidebar (Desktop) ---
  const guestSec = document.getElementById('guest-section');
  const userSec = document.getElementById('user-section');

  if (guestSec) {
    guestSec.classList.remove('d-none');
    guestSec.classList.add('d-block');
  }

  if (userSec) {
    userSec.classList.remove('d-block');
    userSec.classList.add('d-none');
  }

  // \u0E0B\u0E48\u0E2D\u0E19 Badge \u0E43\u0E19 Sidebar
  const roleEl = document.getElementById('user-role-badge');
  if (roleEl) roleEl.style.display = 'none';

  // --- 2. \u0E0B\u0E48\u0E2D\u0E19 Admin Features ---
  const debugMenu = document.getElementById('adminDebugMenu');
  if (debugMenu) debugMenu.classList.add('d-none');

  const dashboardBtn = document.getElementById('dashboard-tab');
  if (dashboardBtn) dashboardBtn.style.display = 'none';

  const dashboardNavItem = dashboardBtn ? dashboardBtn.closest('li') : null;
  if (dashboardNavItem) dashboardNavItem.style.display = 'none';

  // \u0E40\u0E04\u0E25\u0E35\u0E22\u0E23\u0E4C\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 Dashboard \u0E40\u0E01\u0E48\u0E32
  if (typeof clearDashboardBookingDetails === 'function') {
    clearDashboardBookingDetails();
  }

  // \u0E16\u0E49\u0E32\u0E04\u0E49\u0E32\u0E07\u0E2B\u0E19\u0E49\u0E32 Dashboard \u0E43\u0E2B\u0E49\u0E14\u0E35\u0E14\u0E01\u0E25\u0E31\u0E1A\u0E44\u0E1B\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E32\u0E23\u0E32\u0E07
  const activeTab = document.querySelector('.nav-link.active');
  if (activeTab && activeTab.id === 'dashboard-tab') {
    if (typeof showTab === 'function') showTab('schedule');
  }

  // --- 3. [CHANGE] \u0E08\u0E31\u0E14\u0E01\u0E32\u0E23 Mobile Auth (Navbar) ---
  // \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E38\u0E48\u0E21 Login \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E21\u0E37\u0E2D\u0E16\u0E37\u0E2D\u0E42\u0E14\u0E22\u0E40\u0E09\u0E1E\u0E32\u0E30
  const mobileAuth = document.getElementById('mobileAuthContainer');
  if (mobileAuth) {
    mobileAuth.innerHTML = `
        <button id="btn-mobile-login" class="btn btn-light w-100 text-primary fw-bold rounded-pill shadow-sm py-2" onclick="showLoginModal()">
            <i class="fas fa-sign-in-alt me-2"></i>\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A (\u0E40\u0E08\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E35\u0E48)
        </button>
    `;
  }
}

function showLoginModal() {
  // 1. \u0E40\u0E0A\u0E47\u0E04\u0E27\u0E48\u0E32 Login \u0E04\u0E49\u0E32\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E44\u0E2B\u0E21
  if (window.currentSession && window.currentSession.username) {
    // \u0E43\u0E0A\u0E49 showToast \u0E2B\u0E23\u0E37\u0E2D showNotification \u0E15\u0E32\u0E21\u0E17\u0E35\u0E48\u0E40\u0E08\u0E49\u0E32\u0E19\u0E32\u0E22\u0E21\u0E35
    if (typeof showToast === 'function') {
      showToast('\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27', `\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E48\u0E30 ${window.currentSession.displayName || window.currentSession.username}`, 'info');
    } else {
      alert(`\u0E04\u0E38\u0E13\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27\u0E43\u0E19\u0E0A\u0E37\u0E48\u0E2D ${window.currentSession.username}`);
    }
    return;
  }

  // 2. \u0E40\u0E23\u0E35\u0E22\u0E01 Modal
  const modalEl = document.getElementById('loginModal');
  if (modalEl) {
    // \u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A Bootstrap 5
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.show();
    } else {
      // Fallback
      console.warn('Bootstrap not found, forcing display block');
      modalEl.style.display = 'block';
      modalEl.classList.add('show');
    }
  } else {
    console.error('\u274C Error: \u0E44\u0E21\u0E48\u0E1E\u0E1A Element id="loginModal" \u0E43\u0E19\u0E2B\u0E19\u0E49\u0E32\u0E40\u0E27\u0E47\u0E1A');
  }
}

function setSession(sessionData) {
  console.log('\uD83D\uDC64 Setting Session:', sessionData);

  const infoEl = document.getElementById('sessionInfo');
  const debugMenu = document.getElementById('adminDebugMenu');

  // Extract Session Data
  const ses = sessionData || {};
  const userName = String(ses.displayName || ses.username || ses.user || ses.name || '').trim();
  const username = String(ses.username || ses.user || userName || '').trim();
  const roleRaw = String(ses.role || ses.userRole || 'guest').trim().toLowerCase();

  const isLoggedIn = Boolean(username) && roleRaw !== 'guest';
  const isAdmin = isLoggedIn && (roleRaw === 'admin' || roleRaw === 'superadmin' || roleRaw === 'super_admin');

  // Update Global State
  window.currentSession = isLoggedIn ? {
    username: username,
    displayName: userName || username,
    role: roleRaw,
    phone: String(ses.phone || '')
  } : null;

  // Handle Logic & UI Switching
  if (isLoggedIn) {
    try { localStorage.setItem('berry_user_session', JSON.stringify(window.currentSession)); } catch (e) {}
    
    // Trigger System Events
    if (typeof touchSessionStart === 'function') touchSessionStart();
    if (typeof startSessionTimer === 'function') startSessionTimer();
    
    // \u2705 Update UI Elements (Correct Way)
    if (typeof updateUIForLoggedInUser === 'function') updateUIForLoggedInUser();
  } else {
    try { localStorage.removeItem('berry_session_start'); } catch (e) {}
    
    // \u2705 Update UI Elements (Correct Way)
    if (typeof updateUIForLoggedOutUser === 'function') updateUIForLoggedOutUser();
  }

  // Update Navbar Info Bubble (Top Right)
  if (infoEl) {
    if (isLoggedIn) {
      infoEl.style.display = 'inline-flex';
      infoEl.className = isAdmin
        ? 'ms-lg-2 fw-medium text-dark badge bg-warning bg-opacity-25 border border-warning px-3 py-2 rounded-pill'
        : 'ms-lg-2 fw-medium text-success badge bg-success bg-opacity-10 border border-success px-3 py-2 rounded-pill';

      const icon = isAdmin ? '<i class="fas fa-user-shield me-2"></i>' : '<i class="fas fa-user me-2"></i>';
      // Sanitize check
      const safeName = (typeof sanitizeText === 'function') ? sanitizeText(userName || username) : (userName || username);
      infoEl.innerHTML = `${icon}${safeName}`;
    } else {
      infoEl.style.display = 'none';
      infoEl.innerHTML = '';
    }
  }

  // Update Debug Menu Visibility
  if (debugMenu) {
    if (isAdmin) debugMenu.classList.remove('d-none');
    else debugMenu.classList.add('d-none');
  }
}

  function refreshSession() {
    google.script.run.withSuccessHandler(res => setSession(res?.data || null)).getSession();
  }

  function updateSessionUI(s) {
      const infoEl = document.getElementById('sessionInfo');
      const authBtnText = document.getElementById('authButtonText');
      const authBtn = document.querySelector('.auth-btn');
      const debugMenu = document.getElementById('adminDebugMenu'); // \u0E1B\u0E38\u0E48\u0E21 Debug
      
      if (!infoEl) return;
      
      if (s && s.username) {
          // --- \u0E01\u0E23\u0E13\u0E35\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27 ---
          const roleLower = (s.role || '').toLowerCase();
          const isAdmin = roleLower === 'admin' || roleLower === 'superadmin';
          
          // 1. \u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E1B\u0E38\u0E48\u0E21 Debug (\u0E42\u0E0A\u0E27\u0E4C\u0E40\u0E09\u0E1E\u0E32\u0E30 Admin/Superadmin)
          if (debugMenu) {
              if (isAdmin) debugMenu.classList.remove('d-none');
              else debugMenu.classList.add('d-none');
          }

          // 2. \u0E41\u0E2A\u0E14\u0E07\u0E0A\u0E37\u0E48\u0E2D\u0E41\u0E25\u0E30 Role
          const roleBadge = isAdmin ? 'bg-danger' : 'bg-success';
          infoEl.innerHTML = `<span class="badge ${roleBadge} me-2">${s.role}</span>${s.displayName}`;
          
          // 3. \u0E1B\u0E23\u0E31\u0E1A\u0E1B\u0E38\u0E48\u0E21 Login \u0E40\u0E1B\u0E47\u0E19 Logout
          if (authBtnText) authBtnText.textContent = '\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A';
          if (authBtn) authBtn.onclick = performLogout;
      } else {
          // --- \u0E01\u0E23\u0E13\u0E35\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A ---
          infoEl.innerHTML = '';
          
          // \u0E0B\u0E48\u0E2D\u0E19\u0E1B\u0E38\u0E48\u0E21 Debug \u0E40\u0E2A\u0E21\u0E2D
          if (debugMenu) debugMenu.classList.add('d-none');
          
          // \u0E1B\u0E23\u0E31\u0E1A\u0E1B\u0E38\u0E48\u0E21\u0E40\u0E1B\u0E47\u0E19 Login
          if (authBtnText) authBtnText.textContent = '\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A';
          if (authBtn) authBtn.onclick = showLoginModal;
      }
  }

  // ===============================
  // 🔥 FIX: Enhanced Tab Management
  // ===============================

function initializeTabs() {
  // 1. Helper สำหรับแปลง ID (เอาไว้แค่ return ชื่อ tab พอค่ะ)
  const mapTargetToTab = (targetId) => {
    if (targetId === '#schedule' || targetId === '#nav-schedule') return 'schedule';
    if (targetId === '#timetable' || targetId === '#nav-home') return 'timetable';
    if (targetId === '#dashboard' || targetId === '#nav-dashboard') return 'dashboard';
    return null;
  };

  const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"]');
  tabEls.forEach(btn => {
    if (btn.dataset.tabsBound === '1') return;
    btn.dataset.tabsBound = '1';

    btn.addEventListener('click', (evt) => {
      const targetId = btn.getAttribute('data-bs-target');
      const tabId = mapTargetToTab(targetId);
      if (!tabId) return;

      if (typeof showTab === 'function') {
        evt.preventDefault();
        evt.stopPropagation();
        
        // 1. สั่งเปลี่ยน Tab
        showTab(tabId);

        // 2. ✨ ย้าย Logic มาไว้ตรงนี้ (ทำงานหลังจากกดปุ่ม)
        // ถ้าเป็น Tab 'schedule' และปฏิทินถูกสร้างแล้ว ให้ปรับขนาด
        if (tabId === 'schedule' && typeof combinedCalendarInstance !== 'undefined' && combinedCalendarInstance) {
             console.log('📅 Updating Calendar Size...');
             setTimeout(() => combinedCalendarInstance.updateSize(), 200); 
        }
      }
    }, true);
  });
}

// ANCHOR:CLIENT.waitTabVisible:REPLACE
window.waitTabVisible = async function (tabId, maxFrames = 40, delayMs = 60) {
  const contentId = tabId + 'Content';
  const el = document.getElementById(contentId);
  if (!el) return false;

  for (let i = 0; i < maxFrames; i++) {
    const rect = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);

    const visible =
      cs.display !== 'none' &&
      cs.visibility !== 'hidden' &&
      rect.width > 10 &&
      rect.height > 10;

    const opacityOk = Number(cs.opacity || 1) >= 0.98;

    if (visible && opacityOk) return true;

    await new Promise(r => setTimeout(r, delayMs));
  }
  return false;
};


window.forceShowTabContent = function (tabId) {
  const el = document.getElementById(tabId + 'Content');
  if (!el) return false;

  el.classList.remove('d-none');

  el.style.display = 'block';
  el.style.visibility = 'visible';
  el.style.opacity = '1';
  el.style.height = 'auto';
  el.style.minHeight = '200px';

  return true;
};

window.loadCombinedSchedule = async function (forceReload = false, targetDate) {
  console.log('📅 loadCombinedSchedule() -> start', { forceReload, targetDate });

  let overlayOpened = false;

  try {
    if (typeof apiCall !== 'function') {
      console.error('❌ FAIL loadCombinedSchedule: apiCall() not found');
      if (typeof renderCombinedError === 'function') renderCombinedError('apiCall() not found');
      return { ok: false, error: 'apiCall not found', slots: [] };
    }

    // ✅ init state
    if (!window.combinedState || typeof window.combinedState !== 'object') window.combinedState = {};
    if (!window.combinedState.cache || typeof window.combinedState.cache !== 'object') {
      window.combinedState.cache = { slots: null, fetchedAt: 0, dateKey: '', weekKey: '' };
    }
    if (!window.combinedLoadToken) window.combinedLoadToken = 0;

    // ✅ 1) Resolve date (timezone-safe)
    const dateObj = targetDate
      ? new Date(targetDate)
      : (window.currentDate ? new Date(window.currentDate) : new Date());

    const dateKey = (typeof toThaiDateKey === 'function')
      ? toThaiDateKey(dateObj)
      : dateObj.toISOString().slice(0, 10);

    // Update range label and start loading state
    if (typeof window.updateCombinedWeekLabel === 'function') {
      window.updateCombinedWeekLabel(dateKey);
    }
    if (typeof window.setCombinedNavButtonsLoading === 'function') {
      window.setCombinedNavButtonsLoading(true);
    }

    if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey))) {
      console.error('❌ FAIL loadCombinedSchedule: invalid dateKey ->', dateKey);
      if (typeof renderCombinedError === 'function') renderCombinedError('ข้อมูลไม่แสดง: dateISO ไม่ถูกต้อง');
      return { ok: false, error: 'invalid dateISO', slots: [] };
    }

    console.log('📅 Fetching Combined Schedule for:', dateKey);

    // ✅ 2) Token guard (anti race)
    window.combinedLoadToken++;
    const myToken = window.combinedLoadToken;

    // ✅ 3) Loading UI shell/spinner (ทำก่อน เพื่อกันวูบ)
    const currentView = (typeof getCombinedView === 'function')
      ? getCombinedView()
      : (window.combinedViewMode || 'summary');

    if (typeof setCombinedView === 'function') setCombinedView(currentView, null);

    // ✅ 4) Cache TTL (ตรวจ cache ก่อนเปิด overlay)
    const cache = window.combinedState.cache;
    const now = Date.now();
    const ttlMs = 60 * 1000; // 1 นาที
    const isFresh = cache.fetchedAt && (now - cache.fetchedAt < ttlMs) && cache.dateKey === dateKey;
    const hasData = Array.isArray(cache.slots);

    if (!forceReload && isFresh && hasData) {
      console.log('♻️ Using fresh cache', { count: cache.slots.length, dateKey });
      if (typeof setCombinedView === 'function') setCombinedView(currentView, cache.slots);
      return { ok: true, cached: true, count: cache.slots.length, slots: cache.slots, dateISO: dateKey };
    }

    // \u2705 5) Overlay \u0E40\u0E09\u0E1E\u0E32\u0E30\u0E15\u0E2D\u0E19\u0E08\u0E30\u0E22\u0E34\u0E07 API \u0E08\u0E23\u0E34\u0E07 (UX \u0E14\u0E35\u0E02\u0E36\u0E49\u0E19\u0E21\u0E32\u0E01)
    if (typeof showLoading === 'function') {
      showLoading(true, '\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E15\u0E32\u0E23\u0E32\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E27\u0E21...');
      overlayOpened = true;
    }

    // \u2705 6) Call API
    const t0 = Date.now();
    const rawRes = await apiCall('getCombinedScheduleWeek', { date: dateKey, forceReload: !!forceReload });

    // \u2705 7) Cancel if newer request exists
    if (myToken !== window.combinedLoadToken) {
      console.warn('\uD83D\uDED1 loadCombinedSchedule: cancelled by newer request');
      return { ok: false, cancelled: true, slots: [] };
    }

    const res = (typeof normalizeApiResult === 'function') ? normalizeApiResult(rawRes) : rawRes;

    if (!res || !res.ok) {
      const msg = (res && (res.error || res.message)) ? (res.error || res.message) : '\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08';
      console.error('\u274C FAIL API:', msg);
      if (typeof renderCombinedError === 'function') renderCombinedError(msg);
      return { ok: false, error: msg, slots: [] };
    }

    // \u2705 8) Normalize Data
    const data = res.data || {};
    const slots = Array.isArray(data.slots) ? data.slots : (Array.isArray(data) ? data : []);
    console.log(`\u2705 API Success (${Date.now() - t0}ms): Loaded ${slots.length} slots`);

    // \u2705 9) Update Cache
    window.combinedState.cache = {
      slots: slots,
      fetchedAt: Date.now(),
      dateKey: dateKey,
      weekKey: data.weekKey || ''
    };
    window.combinedScheduleSlots = slots;

    // \u2705 10) Render with latest view
    const latestView = (typeof getCombinedView === 'function')
      ? getCombinedView()
      : (window.combinedViewMode || currentView);

    if (typeof setCombinedView === 'function') {
      setCombinedView(latestView, slots);
    } else if (typeof renderCombinedSummary === 'function') {
      renderCombinedSummary(slots);
    } else if (typeof renderCombinedCalendarGrid === 'function') {
      renderCombinedCalendarGrid(slots);
    }

    // \u2705 11) Mark rendered flag
    try {
      const summaryGrid = document.getElementById('combinedSummaryGrid');
      const calGrid = document.getElementById('combinedCalendarGrid');
      if (summaryGrid) summaryGrid.dataset.hasRendered = '1';
      if (calGrid) calGrid.dataset.hasRendered = '1';
    } catch (e) {}

    return { ok: true, count: slots.length, slots: slots, dateISO: dateKey };

  } catch (err) {
    console.error('\u274C FAIL loadCombinedSchedule exception:', err);
    if (typeof renderCombinedError === 'function') renderCombinedError(err.message || String(err));
    return { ok: false, error: err.message || String(err), slots: [] };

  } finally {
    // \u2705 \u0E1B\u0E34\u0E14 Overlay \u0E40\u0E09\u0E1E\u0E32\u0E30\u0E15\u0E2D\u0E19\u0E17\u0E35\u0E48\u0E40\u0E23\u0E32\u0E40\u0E1B\u0E34\u0E14\u0E40\u0E2D\u0E07\u0E08\u0E23\u0E34\u0E07 \u0E46
    try {
      if (overlayOpened && typeof showLoading === 'function') showLoading(false);
      if (typeof window.setCombinedNavButtonsLoading === 'function') {
        window.setCombinedNavButtonsLoading(false);
      }
    } catch (e) {}
  }
};

window.showTab = async function (tabId, forceReload = false) {
  try {
    console.log(`\uD83D\uDD04 Switching to tab: ${tabId}`, { forceReload });

    // =====================================================
    // \u2705 0) Token Guard (\u0E01\u0E31\u0E19\u0E2A\u0E25\u0E31\u0E1A\u0E40\u0E23\u0E47\u0E27 / click \u0E23\u0E31\u0E27 / async \u0E17\u0E31\u0E1A\u0E01\u0E31\u0E19)
    // =====================================================
    if (!window.tabSwitchToken) window.tabSwitchToken = 0;
    window.tabSwitchToken++;
    const myToken = window.tabSwitchToken;

    // =====================================================
    // \u2705 1) Resolve Target Content (\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A scheduleContent + fallback schedule)
    // =====================================================
    const contentId = tabId + 'Content';
    let target = document.getElementById(contentId);
    if (!target) target = document.getElementById(tabId);

    if (!target) {
      console.error('\u274C FAIL showTab: missing tab content ->', {
        tabId,
        expectedId: contentId,
        fallbackId: tabId
      });

      // Debug list available contents
      try {
        const ids = Array.from(document.querySelectorAll('.tab-content'))
          .map(el => el.id)
          .filter(Boolean);
        console.warn('\uD83D\uDCCC Available .tab-content ids:', ids);
      } catch (e) {}
      return;
    }

    // =====================================================
    // \u2705 2) Sync Nav Active (\u0E44\u0E21\u0E48\u0E1E\u0E31\u0E07\u0E41\u0E21\u0E49\u0E44\u0E21\u0E48\u0E21\u0E35\u0E1B\u0E38\u0E48\u0E21)
    // =====================================================
    try {
      document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
      const navBtn = document.getElementById(tabId + '-tab');
      if (navBtn) navBtn.classList.add('active');
    } catch (e) {}

    // =====================================================
    // \u2705 3) Hide Other Tabs (Soft) + Show Target First (\u0E01\u0E31\u0E19\u0E27\u0E39\u0E1A)
    // =====================================================
    const allContents = document.querySelectorAll('.tab-content');

    // Hide others (soft)
    allContents.forEach(el => {
      if (el === target) return;
      el.classList.remove('active', 'show');

      // delay d-none \u0E40\u0E25\u0E47\u0E01\u0E19\u0E49\u0E2D\u0E22\u0E43\u0E2B\u0E49 CSS transition \u0E21\u0E35\u0E42\u0E2D\u0E01\u0E32\u0E2A\u0E17\u0E33\u0E07\u0E32\u0E19
      setTimeout(() => {
        if (myToken !== window.tabSwitchToken) return;
        el.classList.add('d-none');
      }, 80);
    });

    // Show target immediately
    target.classList.remove('d-none');
    target.classList.add('active', 'show');

    // save current
    window.currentActiveTab = tabId;

    // =====================================================
    // \u2705 4) Wait Visible (\u0E43\u0E0A\u0E49\u0E02\u0E2D\u0E07\u0E40\u0E14\u0E34\u0E21\u0E40\u0E08\u0E49\u0E32\u0E19\u0E32\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E2B\u0E25\u0E31\u0E01)
    // =====================================================
    let okVisible = true;

    if (typeof window.waitTabVisible === 'function') {
      okVisible = await window.waitTabVisible(tabId, 40, 60);
    } else {
      await new Promise(r => requestAnimationFrame(() => r()));
    }

    if (!okVisible) console.log('\u26A0\uFE0F showTab: tab not fully visible yet ->', tabId);

    // token guard
    if (myToken !== window.tabSwitchToken) {
      console.log('\uD83D\uDED1 showTab: cancelled by newer tab switch');
      return;
    }

    // =====================================================
    // \u2705 helper: check combined cache freshness
    // =====================================================
    const isCombinedCacheFresh = (dateISO, ttlMs) => {
      try {
        const cache = window.combinedState && window.combinedState.cache ? window.combinedState.cache : null;
        if (!cache) return false;

        const now = Date.now();
        const fresh = cache.fetchedAt && (now - cache.fetchedAt < (ttlMs || 60 * 1000));
        const sameDate = cache.dateKey === dateISO;
        const hasData = Array.isArray(cache.slots);

        return !!(fresh && sameDate && hasData);
      } catch (e) {
        return false;
      }
    };

    // =====================================================
    // \u2705 5) Tab-specific: SCHEDULE
    // =====================================================
    if (tabId === 'schedule') {
      // --- dateISO \u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19 error "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 dateISO"
      const dateISO = (typeof window.getCurrentDateISO === 'function')
        ? window.getCurrentDateISO()
        : (window.currentDate ? String(window.currentDate).slice(0, 10) : new Date().toISOString().slice(0, 10));

      if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateISO))) {
        console.error('\u274C showTab(schedule): invalid dateISO ->', dateISO);
        try { if (typeof showToast === 'function') showToast('\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E41\u0E2A\u0E14\u0E07: dateISO \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07', 'danger'); } catch (e) {}
        return;
      }

      // --- view mode
      const currentView = (typeof getCombinedView === 'function')
        ? getCombinedView()
        : (window.combinedViewMode || 'summary');

      // --- spinner (\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E15\u0E2D\u0E19\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E04\u0E22 render)
      const spinnerHtml = `
        <div class="text-center py-5">
          <div class="spinner-border text-secondary"></div>
          <p class="mt-2 text-muted mb-0">\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E15\u0E32\u0E23\u0E32\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E27\u0E21...</p>
        </div>`;

      if (currentView === 'summary') {
        const grid = document.getElementById('combinedSummaryGrid');
        if (grid && grid.dataset.hasRendered !== '1') grid.innerHTML = spinnerHtml;
      } else {
        const calGrid = document.getElementById('combinedCalendarGrid');
        if (calGrid && calGrid.dataset.hasRendered !== '1') calGrid.innerHTML = spinnerHtml;
      }

      // token guard \u0E01\u0E48\u0E2D\u0E19\u0E42\u0E2B\u0E25\u0E14
      if (myToken !== window.tabSwitchToken) return;

      // \u2705 \u0E40\u0E1B\u0E34\u0E14 overlay \u0E16\u0E49\u0E32\u0E21\u0E35 (UX \u0E0A\u0E31\u0E14)
      try {
        if (typeof showLoading === 'function') showLoading(true, '\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E15\u0E32\u0E23\u0E32\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E27\u0E21...');
      } catch (e) {}

      try {
        // \u2705 \u0E16\u0E49\u0E32 cache fresh \u0E41\u0E25\u0E30\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 forceReload -> \u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E43\u0E2B\u0E21\u0E48
        const cacheFresh = isCombinedCacheFresh(dateISO, 60 * 1000);

        if (!forceReload && cacheFresh) {
          console.log('\u267B\uFE0F showTab(schedule): using fresh cache, skip API load', { dateISO });
        } else {
          if (typeof window.loadCombinedSchedule === 'function') {
            const res = await window.loadCombinedSchedule(forceReload, dateISO);

            // token guard \u0E2B\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14
            if (myToken !== window.tabSwitchToken) return;

            if (!res || res.ok === false) {
              console.warn('\u26A0\uFE0F showTab(schedule): loadCombinedSchedule failed ->', res);
              try { if (typeof showToast === 'function') showToast('\u0E42\u0E2B\u0E25\u0E14\u0E15\u0E32\u0E23\u0E32\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08', 'warning'); } catch (e) {}
            } else {
              console.log(
                '\u2705 showTab(schedule): loaded slots ->',
                (res.count != null ? res.count : (Array.isArray(res.slots) ? res.slots.length : '-')),
                'dateISO:',
                res.dateISO,
                'cached:',
                !!res.cached
              );
            }
          } else {
            console.warn('\u26A0\uFE0F showTab(schedule): loadCombinedSchedule() not found');
            try { if (typeof showToast === 'function') showToast('\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19 loadCombinedSchedule', 'danger'); } catch (e) {}
          }
        }

        // --- Bind Controls \u0E2B\u0E25\u0E31\u0E07 render (\u0E01\u0E31\u0E19 binding \u0E0B\u0E49\u0E2D\u0E19)
        try {
          if (typeof window.bindCombinedControls === 'function') window.bindCombinedControls();
          else if (typeof bindCombinedControls === 'function') bindCombinedControls();
          console.log('\u2705 Combined controls bound (schedule tab)');
        } catch (e) {
          console.warn('\u26A0\uFE0F bindCombinedControls failed:', e);
        }

        // --- Calendar resize \u0E40\u0E09\u0E1E\u0E32\u0E30\u0E15\u0E2D\u0E19 calendar view
        try {
          const latestView = (typeof getCombinedView === 'function')
            ? getCombinedView()
            : (window.combinedViewMode || currentView);

          if (
            latestView === 'calendar' &&
            typeof combinedCalendarInstance !== 'undefined' &&
            combinedCalendarInstance &&
            typeof combinedCalendarInstance.updateSize === 'function'
          ) {
            setTimeout(() => combinedCalendarInstance.updateSize(), 180);
          }
        } catch (e) {}

      } finally {
        // \u2705 \u0E1B\u0E34\u0E14 overlay \u0E17\u0E38\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07
        try {
          if (typeof showLoading === 'function') showLoading(false);
        } catch (e) {}
      }
    }

    // =====================================================
    // \u2705 6) Other tabs (\u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E02\u0E2D\u0E07\u0E40\u0E14\u0E34\u0E21\u0E17\u0E33\u0E07\u0E32\u0E19)
    // =====================================================
    if (tabId === 'dashboard') {
      try {
        if (typeof window.loadDashboard === 'function') await window.loadDashboard();
        if (typeof window.repairBookingChartLayout === 'function') {
          window.repairBookingChartLayout('showTab-dashboard');
        }
      } catch (e) {}
    }

    if (tabId === 'timetable') {
      try {
        if (window.currentRoom && window.currentDate && typeof loadScheduleForRoom === 'function') {
          loadScheduleForRoom(window.currentRoom, window.currentDate);
        }
      } catch (e) {}
    }

    console.log(`\u2705 Tab ${tabId} is now visible and active.`);

  } catch (e) {
    console.error('\u274C FAIL showTab Exception:', e);
  }
};


function isCombinedCacheFresh(dateISO, ttlMs) {
  try {
    const cache = window.combinedState && window.combinedState.cache ? window.combinedState.cache : null;
    if (!cache) return false;

    const now = Date.now();
    const fresh = cache.fetchedAt && (now - cache.fetchedAt < (ttlMs || 60 * 1000));
    const sameDate = cache.dateKey === dateISO;
    const hasData = Array.isArray(cache.slots);

    return !!(fresh && sameDate && hasData);
  } catch (e) {
    return false;
  }
}


// ANCHOR:CLIENT.getCombinedView:REPLACE
window.getCombinedView = function () {
  try {
    const v = (window.combinedState && window.combinedState.view)
      ? window.combinedState.view
      : (window.combinedViewMode || 'summary');

    return (v === 'calendar') ? 'calendar' : 'summary';
  } catch (e) {
    return 'summary';
  }
};
// ANCHOR:CLIENT.getCombinedView:END

// ANCHOR:CLIENT.setCombinedView:REPLACE
window.setCombinedView = function (view, slotsInput) {
  try {
    // \u2705 Render token guard (\u0E01\u0E31\u0E19\u0E2A\u0E25\u0E31\u0E1A\u0E23\u0E31\u0E27\u0E41\u0E25\u0E49\u0E27 render \u0E17\u0E31\u0E1A)
    if (!window.combinedRenderToken) window.combinedRenderToken = 0;
    window.combinedRenderToken++;
    const myRenderToken = window.combinedRenderToken;

    const safeView = (view === 'calendar') ? 'calendar' : 'summary';

    // \u2705 Resolve slots (Input > Cache > Global > null)
    let slots = slotsInput;
    if (!Array.isArray(slots)) {
      if (window.combinedState && window.combinedState.cache && Array.isArray(window.combinedState.cache.slots)) {
        slots = window.combinedState.cache.slots;
      } else if (Array.isArray(window.combinedScheduleSlots)) {
        slots = window.combinedScheduleSlots;
      } else {
        slots = null; // \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E08\u0E23\u0E34\u0E07
      }
    }

    console.log(`\uD83D\uDC41\uFE0F setCombinedView: ${safeView}, slotsType=${Array.isArray(slots) ? 'array' : typeof slots}, count=${Array.isArray(slots) ? slots.length : '-'}`);

    // \u2705 Root
    const root = document.getElementById('combinedScheduleGrid');
    if (!root) {
      console.error('\u274C Missing #combinedScheduleGrid');
      return false;
    }

    // \u2705 Save state
    if (!window.combinedState) window.combinedState = {};
    window.combinedState.view = safeView;
    window.combinedViewMode = safeView;

    // \u2705 Toggle button
    const btnToggle = document.getElementById('btnCombinedToggleView');
    if (btnToggle) {
      btnToggle.innerHTML = (safeView === 'calendar')
        ? `<i class="fas fa-list me-1"></i>\u0E14\u0E39\u0E41\u0E1A\u0E1A\u0E2A\u0E23\u0E38\u0E1B`
        : `<i class="fas fa-calendar-alt me-1"></i>\u0E14\u0E39\u0E41\u0E1A\u0E1A\u0E15\u0E32\u0E23\u0E32\u0E07`;
      btnToggle.disabled = false;
      btnToggle.classList.remove('disabled');
    }

    // \u2705 Spinner template
    const spinnerHtml = `
      <div class="text-center py-5 animate-fade-in">
        <div class="spinner-border text-primary"></div>
        <p class="mt-2 text-muted mb-0">\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14...</p>
      </div>`;

    // =====================================================
    // \u2705 Ensure shell exists (\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E16\u0E49\u0E32\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35)
    // =====================================================
    const ensureSummaryShell = () => {
      if (!document.getElementById('combinedSummaryGrid')) {
        root.innerHTML = `<div id="combinedSummaryGrid"></div>`;
      }
      return document.getElementById('combinedSummaryGrid');
    };

    const ensureCalendarShell = () => {
      if (!document.getElementById('combinedCalendarGrid')) {
        root.innerHTML = `<div id="combinedCalendarWrap" class="p-2"><div id="combinedCalendarGrid"></div></div>`;
      }
      return document.getElementById('combinedCalendarGrid');
    };

    // =====================================================
    // \u2705 Switch view + show spinner first (\u0E01\u0E31\u0E19\u0E08\u0E2D\u0E27\u0E39\u0E1A)
    // =====================================================
    if (safeView === 'calendar') {
      const calGrid = ensureCalendarShell();
      if (calGrid) {
        calGrid.innerHTML = spinnerHtml;
        calGrid.dataset.hasRendered = '0';
      }
    } else {
      const sumGrid = ensureSummaryShell();
      if (sumGrid) {
        sumGrid.innerHTML = spinnerHtml;
        sumGrid.dataset.hasRendered = '0';
      }
    }

    // \u2705 \u0E16\u0E49\u0E32 slots \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21 \u0E43\u0E2B\u0E49\u0E2B\u0E22\u0E38\u0E14\u0E41\u0E04\u0E48 spinner
    if (!Array.isArray(slots)) {
      console.log('\u23F3 setCombinedView: slots not ready -> show spinner only');
      return true;
    }

    // =====================================================
    // \u2705 Render after DOM settle (better than Promise.then)
    // =====================================================
    requestAnimationFrame(() => {
      if (myRenderToken !== window.combinedRenderToken) {
        console.warn('\uD83D\uDED1 setCombinedView: render skipped (newer render requested)');
        return;
      }

      if (safeView === 'calendar') {
        const calGrid = document.getElementById('combinedCalendarGrid');
        if (typeof window.renderCombinedCalendarGrid === 'function') {
          const ok = window.renderCombinedCalendarGrid(slots);
          if (calGrid) calGrid.dataset.hasRendered = ok ? '1' : '0';
        } else {
          if (calGrid) {
            calGrid.innerHTML = '<div class="alert alert-warning m-3 text-center">Calendar Renderer not found</div>';
            calGrid.dataset.hasRendered = '0';
          }
        }
      } else {
        const sumGrid = document.getElementById('combinedSummaryGrid');
        if (typeof window.renderCombinedSummary === 'function') {
          const ok = window.renderCombinedSummary(slots);
          if (sumGrid) sumGrid.dataset.hasRendered = ok ? '1' : '0';
        } else {
          if (sumGrid) {
            sumGrid.innerHTML = '<div class="alert alert-warning m-3 text-center">Summary Renderer not found</div>';
            sumGrid.dataset.hasRendered = '0';
          }
        }
      }
    });

    return true;

  } catch (e) {
    console.error('\u274C FAIL setCombinedView:', e);
    return false;
  }
};
// ANCHOR:CLIENT.setCombinedView:END



function toThaiDateKey(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeHm(timeVal) {
  if (timeVal == null) return null;
  let s = String(timeVal).trim();
  if (!s) return null;

  // remove Thai suffix and spaces
  s = s.replace(/\u0E19\./g, '').replace(/\s+/g, '');

  // convert dot to colon
  s = s.replace('.', ':');

  // match H:mm or HH:mm
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;

  let hh = Number(m[1]);
  let mm = Number(m[2]);
  if (isNaN(hh) || isNaN(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;

  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

function makeIsoDateTime(dateISO, hm) {
  const t = normalizeHm(hm);
  if (!t) return null;
  return `${dateISO}T${t}:00`;
}


function renderCombinedCalendar(slots) {
  const wrap = document.getElementById('combinedCalendarWrap');
  const calEl = document.getElementById('combinedCalendar');
  if (!calEl) return;

  if (wrap && wrap.classList.contains('d-none')) {
    wrap.classList.remove('d-none');
  }

  // 1) Loading state
  if (!Array.isArray(slots)) {
    if (window.combinedCalendarInstance) {
      try { window.combinedCalendarInstance.destroy(); } catch (e) {}
      window.combinedCalendarInstance = null;
    }
    calEl.innerHTML = `
      <div class="text-center py-5 h-100 d-flex flex-column align-items-center justify-content-center fade-in">
        <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
        <p class="text-muted fw-medium animate-pulse">\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25...</p>
      </div>`;
    return;
  }

  // 2) Map slots -> events (sanitize time!)
  let dropped = 0;
  const events = slots.map(s => {
    const dateISO = String(s.date || '').slice(0, 10);
    if (!dateISO) { dropped++; return null; }

    const startIso = makeIsoDateTime(dateISO, s.start);
    const endIso = makeIsoDateTime(dateISO, s.end);

    if (!startIso || !endIso) { dropped++; return null; }

    let bgColor = '#6c757d';
    let txtColor = '#ffffff';

    if (s.status === 'approved') {
      bgColor = '#198754';
    } else if (s.status === 'pending') {
      bgColor = '#ffc107';
      txtColor = '#000000';
    }

    return {
      title: `${s.roomId || ''}: ${s.subject || '\u0E15\u0E32\u0E23\u0E32\u0E07\u0E2A\u0E2D\u0E19'}`,
      start: startIso,
      end: endIso,
      backgroundColor: bgColor,
      borderColor: bgColor,
      textColor: txtColor,
      extendedProps: { ...s }
    };
  }).filter(Boolean);

  console.log('\uD83D\uDCC6 renderCombinedCalendar events:', { slots: slots.length, events: events.length, dropped });

  // 3) Init or update FullCalendar
  if (!window.combinedCalendarInstance) {
    calEl.innerHTML = '';

    window.combinedCalendarInstance = new FullCalendar.Calendar(calEl, {
      initialView: 'listWeek',
      locale: 'th',
      height: 'auto',
      headerToolbar: {
        left: 'title',
        center: '',
        right: 'dayGridMonth,timeGridWeek,listWeek prev,next today'
      },
      buttonText: {
        today: '\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49',
        month: '\u0E40\u0E14\u0E37\u0E2D\u0E19',
        week: '\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C',
        list: '\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23'
      },

      // \u2705 correct no-events rendering (cross-version safe)
      noEventsContent: function() {
        return { html: '<div class="text-muted py-4 text-center">\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E43\u0E19\u0E0A\u0E48\u0E27\u0E07\u0E19\u0E35\u0E49</div>' };
      },

      events: events,

      eventClick: (info) => {
        const p = info.event.extendedProps;
        if (typeof showEventDetail === 'function') {
          showEventDetail(p.type, p.title || p.subject || info.event.title, `${p.start}-${p.end}`, p.bookingId, p.teacherName || p.instructor || p.booker || '');
        }
      },

      // \u26A0\uFE0F dayHeaderContent may not apply to listWeek; keep but fix dateKey
      dayHeaderContent: (arg) => {
        const dateISO = toThaiDateKey(arg.date); // \u2705 no UTC shift
        return {
          html: `
            <div class="d-flex align-items-center justify-content-between w-100 py-1 pe-2">
              <span class="fw-bold text-dark">${arg.text}</span>
              <button class="btn btn-sm btn-outline-primary border-0 rounded-pill px-3 shadow-sm d-flex align-items-center gap-1"
                      style="font-size: 0.75rem; height: 28px; z-index:10;"
                      onclick="showBookingFormWithDate('${dateISO}', '08:00', '12:00'); event.stopPropagation();"
                      title="\u0E08\u0E2D\u0E07\u0E2B\u0E49\u0E2D\u0E07\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 ${arg.text}">
                <i class="fas fa-plus-circle"></i> \u0E08\u0E2D\u0E07
              </button>
            </div>`
        };
      },

      viewDidMount: (arg) => {
        try { arg.view.calendar.updateSize(); } catch (e) {}
      }
    });

    window.combinedCalendarInstance.render();
  } else {
    // update without recreate
    try {
      window.combinedCalendarInstance.removeAllEvents();
      window.combinedCalendarInstance.addEventSource(events);
    } catch (e) {
      console.log('\u26A0\uFE0F WARN calendar update failed, recreate...', e);
      try { window.combinedCalendarInstance.destroy(); } catch (e2) {}
      window.combinedCalendarInstance = null;
      renderCombinedCalendar(slots);
      return;
    }
  }

  requestAnimationFrame(() => {
    if (window.combinedCalendarInstance) {
      try { window.combinedCalendarInstance.updateSize(); } catch (e) {}
    }
  });
}

function formatThaiShortDate(dateISO) {
  if (!dateISO) return '-';
  const [y, m, d] = String(dateISO).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '-';
  const thMonths = ['\u0E21.\u0E04.', '\u0E01.\u0E1E.', '\u0E21\u0E35.\u0E04.', '\u0E40\u0E21.\u0E22.', '\u0E1E.\u0E04.', '\u0E21\u0E34.\u0E22.', '\u0E01.\u0E04.', '\u0E2A.\u0E04.', '\u0E01.\u0E22.', '\u0E15.\u0E04.', '\u0E1E.\u0E22.', '\u0E18.\u0E04.'];
  return `${d} ${thMonths[m - 1]} ${y + 543}`;
}

function getThaiDayName(dateISO) {
  const dt = new Date(dateISO);
  const days = ['\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C', '\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C', '\u0E2D\u0E31\u0E07\u0E04\u0E32\u0E23', '\u0E1E\u0E38\u0E18', '\u0E1E\u0E24\u0E2B\u0E31\u0E2A\u0E1A\u0E14\u0E35', '\u0E28\u0E38\u0E01\u0E23\u0E4C', '\u0E40\u0E2A\u0E32\u0E23\u0E4C'];
  return days[dt.getDay()] || '';
}

function startOfWeekMonday(dateISO) {
  const dt = new Date(dateISO);
  dt.setHours(0, 0, 0, 0);
  const d = dt.getDay(); // 0-6
  const diffToMon = (d === 0) ? -6 : (1 - d);
  dt.setDate(dt.getDate() + diffToMon);
  return toThaiDateKey(dt);
}

function addDaysISO(dateISO, n) {
  const dt = new Date(dateISO);
  dt.setDate(dt.getDate() + n);
  return toThaiDateKey(dt);
}

function formatThaiWeekRange(baseDateISO) {
  const mondayISO = startOfWeekMonday(baseDateISO);
  const sundayISO = addDaysISO(mondayISO, 6);
  return `${formatThaiShortDate(mondayISO)} \u2013 ${formatThaiShortDate(sundayISO)}`;
}

// ANCHOR:CLIENT.renderCombinedCalendarGrid:REPLACE
window.renderCombinedCalendarGrid = function(slots) {
  try {
    const grid = document.getElementById('combinedCalendarGrid');
    if (!grid) return false;

    // 1. Helpers & Setup
    const escapeHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // \u0E04\u0E33\u0E19\u0E27\u0E13\u0E27\u0E31\u0E19\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C
    let baseDateStr = window.currentDate || new Date().toISOString().split('T')[0];
    const baseDate = new Date(baseDateStr);
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(baseDate);
    monday.setDate(diff);

    // \u0E27\u0E31\u0E19\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19\u0E40\u0E1E\u0E37\u0E48\u0E2D Highlight
    const todayISO = new Date().toISOString().split('T')[0];

    // 2. Prepare Time Rows (08:00 - 18:00, 30 min step)
    const timeSlots = [];
    for (let h = 8; h <= 18; h++) {
        const hh = String(h).padStart(2, '0');
        timeSlots.push(`${hh}:00`);
        if (h < 18) timeSlots.push(`${hh}:30`);
    }

    // 3. Prepare Days Headers
    const days = [];
    const dayNames = ['\u0E08.', '\u0E2D.', '\u0E1E.', '\u0E1E\u0E24.', '\u0E28.', '\u0E2A.', '\u0E2D\u0E32.'];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        const isToday = (iso === todayISO);
        days.push({ iso, label: dayNames[i], dateLabel: d.getDate(), isToday });
    }

    // 4. Map Slots to Buckets
    // Bucket Key: "YYYY-MM-DD|HH:MM"
    const bucketMap = {};
    if (Array.isArray(slots)) {
        slots.forEach(s => {
            // Normalize Date
            const dKey = String(s.date || '').split('T')[0];
            // Normalize Time (\u0E15\u0E31\u0E14\u0E27\u0E34\u0E19\u0E32\u0E17\u0E35)
            let tKey = String(s.start || '').trim().substring(0, 5); 
            // \u0E1B\u0E31\u0E14\u0E40\u0E27\u0E25\u0E32\u0E43\u0E2B\u0E49\u0E25\u0E07\u0E25\u0E47\u0E2D\u0E04 00 \u0E2B\u0E23\u0E37\u0E2D 30
            const [hh, mm] = tKey.split(':').map(Number);
            const mmRound = mm >= 30 ? '30' : '00';
            tKey = `${String(hh).padStart(2,'0')}:${mmRound}`;

            const key = `${dKey}|${tKey}`;
            if (!bucketMap[key]) bucketMap[key] = [];
            bucketMap[key].push(s);
        });
    }

    // 5. Build HTML
    let html = `<div class="table-responsive rounded-4 shadow-sm border">
        <table class="table table-bordered mb-0 text-center align-middle" style="min-width: 800px;">
            <thead class="bg-light sticky-top" style="z-index: 10;">
                <tr>
                    <th class="py-3 text-secondary small" style="width: 80px;">\u0E40\u0E27\u0E25\u0E32</th>`;
    
    days.forEach(d => {
        const activeClass = d.isToday ? 'bg-primary text-white shadow-sm' : 'text-dark';
        const badge = d.isToday ? '<span class="badge bg-white text-primary ms-1 rounded-pill" style="font-size:0.6rem;">\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49</span>' : '';
        html += `<th class="${d.isToday ? 'bg-primary bg-opacity-10' : ''}">
                    <div class="d-flex flex-column align-items-center">
                        <span class="small fw-bold ${d.isToday ? 'text-primary' : 'text-muted'}">${d.label}</span>
                        <div class="fs-5 fw-bold ${activeClass} rounded-circle d-flex align-items-center justify-content-center mt-1" 
                             style="width: 36px; height: 36px;">
                            ${d.dateLabel}
                        </div>
                        ${badge}
                    </div>
                 </th>`;
    });
    html += `</tr></thead><tbody>`;

    timeSlots.forEach(time => {
        html += `<tr>
                    <td class="bg-light text-muted small fw-bold font-monospace align-middle">${time}</td>`;
        
        days.forEach(d => {
            const key = `${d.iso}|${time}`;
            const cellSlots = bucketMap[key] || [];
            const count = cellSlots.length;
            const isToday = d.isToday ? 'bg-primary bg-opacity-10' : '';
            
            // Cell Content
            let cellContent = '';
            let cellClass = 'cursor-pointer hover-bg-gray transition-all';
            let clickAttr = '';

            if (count > 0) {
                // \u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23 -> \u0E41\u0E2A\u0E14\u0E07\u0E08\u0E33\u0E19\u0E27\u0E19\u0E41\u0E25\u0E30\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07
                const first = cellSlots[0];
                const typeClass = first.type === 'class' ? 'bg-secondary' : (first.status === 'approved' ? 'bg-success' : 'bg-warning text-dark');
                const title = escapeHtml(first.title || first.subject || '\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23');
                
                cellContent = `
                    <div class="d-flex flex-column align-items-center gap-1">
                        <span class="badge ${typeClass} rounded-pill px-2" style="max-width: 100%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                            ${count > 1 ? `${count} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23` : title}
                        </span>
                        ${count > 1 ? '<small class="text-xs text-muted">\u0E04\u0E25\u0E34\u0E01\u0E14\u0E39\u0E23\u0E27\u0E21</small>' : ''}
                    </div>
                `;
                // \u0E04\u0E25\u0E34\u0E01 -> \u0E40\u0E1B\u0E34\u0E14 Modal \u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E02\u0E2D\u0E07\u0E27\u0E31\u0E19/\u0E40\u0E27\u0E25\u0E32\u0E19\u0E31\u0E49\u0E19
                clickAttr = `onclick="openCombinedDayDetail('${d.iso}', null, '${time}')"`;
                
            } else {
                // \u0E27\u0E48\u0E32\u0E07 -> \u0E41\u0E2A\u0E14\u0E07\u0E1B\u0E38\u0E48\u0E21\u0E1A\u0E27\u0E01\u0E08\u0E32\u0E07\u0E46 (Hover \u0E16\u0E36\u0E07\u0E40\u0E2B\u0E47\u0E19)
                cellClass += ' position-relative group-hover-visible';
                cellContent = `
                    <div class="opacity-0 hover-opacity-100 transition-all text-primary">
                        <i class="fas fa-plus-circle"></i>
                    </div>
                `;
                // \u0E04\u0E25\u0E34\u0E01 -> \u0E40\u0E1B\u0E34\u0E14\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E08\u0E2D\u0E07
                // \u0E04\u0E33\u0E19\u0E27\u0E13\u0E40\u0E27\u0E25\u0E32\u0E40\u0E25\u0E34\u0E01 (default +1 \u0E0A\u0E21. \u0E2B\u0E23\u0E37\u0E2D +30 \u0E19\u0E32\u0E17\u0E35)
                const [hh, mm] = time.split(':').map(Number);
                let endH = hh, endM = mm + 30;
                if(endM >= 60) { endH++; endM = 0; }
                const endTime = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
                
                clickAttr = `onclick="showBookingFormWithDate('${d.iso}', '${time}', '${endTime}')"`;
            }

            html += `<td class="${isToday} ${cellClass}" ${clickAttr} style="height: 50px;">
                        ${cellContent}
                     </td>`;
        });
        html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    
    // Add Hover Style Helper
    if (!document.getElementById('cal-hover-style')) {
        const s = document.createElement('style');
        s.id = 'cal-hover-style';
        s.innerHTML = `.hover-bg-gray:hover { background-color: rgba(0,0,0,0.03) !important; } .hover-opacity-100:hover { opacity: 1 !important; }`;
        document.head.appendChild(s);
    }

    grid.innerHTML = html;
    return true;

  } catch (e) {
    console.error('\u274C renderCombinedCalendarGrid Error:', e);
    return false;
  }
};
// ANCHOR:CLIENT.renderCombinedCalendarGrid:END

// ANCHOR:CLIENT.renderCombinedSummary:REPLACE
window.renderCombinedSummary = function(slots) {
  try {
    const grid = document.getElementById('combinedSummaryGrid');
    if (!grid) return false;

    // 1. Loading / Empty Checks
    if (!Array.isArray(slots)) {
      grid.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
      return false;
    }
    if (slots.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-calendar-times"></i></div><h5 class="fw-bold mb-2">\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E43\u0E19\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E19\u0E35\u0E49</h5><p class="small text-muted mb-0">\u0E01\u0E14\u0E1B\u0E38\u0E48\u0E21\u0E08\u0E2D\u0E07\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E21\u0E48 \u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48/\u0E2B\u0E49\u0E2D\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19\u0E2D\u0E37\u0E48\u0E19\u0E43\u0E19\u0E40\u0E21\u0E19\u0E39</p></div>';
      return true;
    }

    // 2. Helpers
    const escapeHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const pick = (obj, ...keys) => { for(let k of keys) if(obj[k]) return obj[k]; return ''; };
    
    // \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E27\u0E48\u0E32\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E19\u0E35\u0E49\u0E21\u0E35\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E15\u0E34\u0E21\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48
    const hasDetailContent = (s) => {
        const remark = pick(s, 'Remark', 'remark');
        const equip = pick(s, 'Equipment', 'equipment');
        const files = pick(s, 'UploadedFiles', 'uploadedFiles');
        const soft = pick(s, 'Software', 'software');
        const link = pick(s, 'MeetingLink', 'meetingLink');
        const rejectedReason = (s.status === 'rejected' || s.status === '\u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34') ? pick(s, 'Remark', 'remark') : '';
        
        return !!(remark || equip || files || soft || link || rejectedReason);
    };

    // \u0E04\u0E33\u0E19\u0E27\u0E13\u0E27\u0E31\u0E19\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C\u0E02\u0E2D\u0E07\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C
    let baseDateStr = window.currentDate || new Date().toISOString().split('T')[0];
    const baseDate = new Date(baseDateStr);
    const day = baseDate.getDay(); 
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(baseDate);
    monday.setDate(diff);

    // 3. Build Day List
    const dayISOList = [];
    const dayColors = ['day-mon', 'day-tue', 'day-wed', 'day-thu', 'day-fri', 'day-sat', 'day-sun'];
    
    for (let i = 0; i < 7; i++) {
       const d = new Date(monday);
       d.setDate(monday.getDate() + i);
       const iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
       dayISOList.push({ iso, colorClass: dayColors[i] });
    }

    // 4. Group Data
    const groups = {};
    dayISOList.forEach(d => groups[d.iso] = []);
    slots.forEach(s => {
       const dKey = String(s.date || '').split('T')[0];
       if (groups[dKey]) groups[dKey].push(s);
    });

    let html = '';
    
    // 5. Render Loop
    dayISOList.forEach(dayObj => {
        const { iso, colorClass } = dayObj;
        const list = groups[iso];
        const dateObj = new Date(iso);
        const dayLabel = dateObj.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short' });
        
        // --- \u0E2A\u0E48\u0E27\u0E19\u0E2B\u0E31\u0E27\u0E01\u0E32\u0E23\u0E4C\u0E14 (\u0E2A\u0E35\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E27\u0E31\u0E19 + \u0E1B\u0E38\u0E48\u0E21\u0E08\u0E2D\u0E07) ---
        html += `
        <div class="combined-daycard mb-3 shadow-sm border-0 rounded-4 overflow-hidden">
            <div class="combined-dayheader p-3 border-bottom d-flex justify-content-between align-items-center ${colorClass}" 
                 style="background: var(--bg-${iso})"> 
                <div class="d-flex align-items-center gap-2">
                    <span class="fw-bold text-dark fs-5">${dayLabel}</span>
                    ${list.length > 0 ? `<span class="badge bg-white text-dark border shadow-sm rounded-pill">${list.length} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23</span>` : ''}
                </div>
                <button class="btn btn-sm btn-light rounded-pill px-3 shadow-sm fw-bold text-primary" 
                        onclick="showBookingFormWithDate('${iso}', '08:00', '12:00')">
                    <i class="fas fa-plus-circle me-1"></i> \u0E08\u0E2D\u0E07\u0E2B\u0E49\u0E2D\u0E07
                </button>
            </div>
            <div class="bg-white">`;

        if (list.length === 0) {
            html += `<div class="p-4 text-center text-muted small bg-light bg-opacity-50">
                        <i class="fas fa-coffee me-2 opacity-50"></i>\u0E27\u0E48\u0E32\u0E07\u0E15\u0E25\u0E2D\u0E14\u0E27\u0E31\u0E19
                     </div>`;
        } else {
            // Table Header
            html += `
            <div class="table-responsive">
                <table class="table table-hover mb-0 align-middle combined-table combined-summary-table">
                    <thead class="table-light small text-secondary">
                        <tr>
                            <th class="ps-4 combined-time-cell">\u0E40\u0E27\u0E25\u0E32</th>
                            <th class="combined-room-cell">\u0E2B\u0E49\u0E2D\u0E07</th>
                            <th class="combined-title-cell">\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23</th>
                            <th class="combined-status-cell text-center">\u0E2A\u0E16\u0E32\u0E19\u0E30</th>
                            <th class="combined-detail-cell text-center">\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14</th>
                        </tr>
                    </thead>
                    <tbody>`;
            
            // Sort by Time
            list.sort((a,b) => String(a.start).localeCompare(String(b.start)));

            list.forEach(item => {
                const time = `${item.start} - ${item.end}`;
                const title = escapeHtml(pick(item, 'subject', 'title', 'Purpose'));
                const room = escapeHtml(pick(item, 'roomId', 'RoomID'));
                const who = escapeHtml(pick(item, 'instructor', 'booker', 'BookerName'));
                const isClass = item.type === 'class';
                const bookingId = pick(item, 'bookingId', 'BookingID');
                
                // Status Badge
                let statusBadge = '';
                if(isClass) statusBadge = '<span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary-subtle">\u0E40\u0E23\u0E35\u0E22\u0E19</span>';
                else if(item.status === 'approved') statusBadge = '<span class="badge bg-success bg-opacity-10 text-success border border-success-subtle">\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34</span>';
                else statusBadge = '<span class="badge bg-warning bg-opacity-10 text-dark border border-warning-subtle">\u0E23\u0E2D</span>';

                // --- \u0E1B\u0E38\u0E48\u0E21\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14 (Logic \u0E43\u0E2B\u0E21\u0E48) ---
                let detailBtn = '';
                if (bookingId && hasDetailContent(item)) {
                    detailBtn = `
                    <button class="btn btn-sm btn-outline-primary border-0 rounded-circle w-44px h-44px p-0 d-flex align-items-center justify-content-center mx-auto hover-scale"
                            onclick="openBookingDetail('${bookingId}')" 
                            title="\u0E14\u0E39\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14">
                        <i class="fas fa-file-alt"></i>
                    </button>`;
                }

                // Row Click (Optional: \u0E04\u0E25\u0E34\u0E01\u0E41\u0E16\u0E27\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E14\u0E39\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E44\u0E14\u0E49\u0E40\u0E2B\u0E21\u0E37\u0E2D\u0E19\u0E01\u0E31\u0E19)
                const rowClick = bookingId ? `style="cursor:pointer" onclick="openBookingDetail('${bookingId}')"` : '';

                html += `
                <tr ${rowClick}>
                    <td class="ps-4 fw-bold text-secondary font-monospace combined-time-cell">${time}</td>
                    <td class="combined-room-cell"><span class="badge bg-light text-dark border">${room}</span></td>
                    <td class="combined-title-cell">
                        <div class="fw-bold text-dark combined-subject-title">${title}</div>
                        <div class="small text-muted"><i class="fas fa-user me-1 opacity-50"></i>${who}</div>
                    </td>
                    <td class="text-center combined-status-cell">${statusBadge}</td>
                    <td class="text-center combined-detail-cell" onclick="event.stopPropagation()">
                        ${detailBtn}
                    </td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
        }
        
        html += `</div></div>`; 
    });

    // \u0E40\u0E1E\u0E34\u0E48\u0E21 CSS \u0E2A\u0E35\u0E1B\u0E23\u0E30\u0E08\u0E33\u0E27\u0E31\u0E19 (Inject Inline \u0E2B\u0E23\u0E37\u0E2D\u0E43\u0E2A\u0E48\u0E43\u0E19 CSS)
    const styleId = 'day-colors-style';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .combined-dayheader.day-mon { background: linear-gradient(135deg, #FFF9C4 0%, #FFF176 100%); color: #5D4037 !important; }
            .combined-dayheader.day-tue { background: linear-gradient(135deg, #F8BBD0 0%, #F06292 100%); color: #880E4F !important; }
            .combined-dayheader.day-wed { background: linear-gradient(135deg, #C8E6C9 0%, #81C784 100%); color: #1B5E20 !important; }
            .combined-dayheader.day-thu { background: linear-gradient(135deg, #FFE0B2 0%, #FFB74D 100%); color: #E65100 !important; }
            .combined-dayheader.day-fri { background: linear-gradient(135deg, #BBDEFB 0%, #64B5F6 100%); color: #0D47A1 !important; }
            .combined-dayheader.day-sat { background: linear-gradient(135deg, #E1BEE7 0%, #BA68C8 100%); color: #4A148C !important; }
            .combined-dayheader.day-sun { background: linear-gradient(135deg, #FFCDD2 0%, #E57373 100%); color: #B71C1C !important; }
            .w-44px { width: 44px; } .h-44px { height: 44px; }
            .hover-scale { transition: transform 0.2s ease, background-color 0.2s ease, color 0.2s ease; }
            .hover-scale:hover { transform: scale(1.1); background: var(--bs-primary); color: white; }
        `;
        document.head.appendChild(style);
    }

    grid.innerHTML = html;
    return true;

  } catch (e) {
    console.error('\u274C renderCombinedSummary Error:', e);
    return false;
  }
};
// ANCHOR:CLIENT.renderCombinedSummary:END

function quickBookForDay(dateISO) {
  try {
    console.log('\uD83D\uDCC5 Quick Booking Triggered:', dateISO);

    // \u0E43\u0E0A\u0E49 room \u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19 \u0E16\u0E49\u0E32\u0E21\u0E35
    const room = window.selectedRoomId || window.selectedRoom || window.currentRoom || undefined;

    // \u0E16\u0E49\u0E32\u0E21\u0E35\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19\u0E40\u0E14\u0E34\u0E21 \u0E43\u0E2B\u0E49\u0E43\u0E0A\u0E49\u0E15\u0E48\u0E2D
    if (typeof showBookingFormWithDate === 'function') {
      // \u0E40\u0E27\u0E25\u0E32\u0E21\u0E32\u0E15\u0E23\u0E10\u0E32\u0E19 (\u0E41\u0E01\u0E49\u0E15\u0E32\u0E21\u0E43\u0E08)
      showBookingFormWithDate(dateISO, '08:00', '12:00');
      console.log('\uD83D\uDCDD Opening Booking Form. Target Room:', room);
      return true;
    }

    console.log('\u274C FAIL quickBookForDay: showBookingFormWithDate not found');
    if (typeof showToast === 'function') showToast('\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19\u0E40\u0E1B\u0E34\u0E14\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E08\u0E2D\u0E07', 'warning');
    return false;

  } catch (e) {
    console.error('\u274C quickBookForDay error:', e);
    return false;
  }
}

// ANCHOR:CLIENT.openCombinedDayDetail:REPLACE
window.openCombinedDayDetail = function (dateISO, slotsInput, timeBucket) {
  try {
    console.log('\uD83D\uDD0D openCombinedDayDetail ->', { dateISO, timeBucket });

    // ===== helpers =====
    const escapeHtml = (s) => String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const pick = (obj, ...keys) => {
      for (const k of keys) {
        if (obj && obj[k] != null && String(obj[k]).trim() !== '') return obj[k];
      }
      return '';
    };

    const toIsoDateKey = (v) => {
      if (!v) return '';
      const s = String(v);
      if (s.includes('T')) return s.split('T')[0].slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      return '';
    };

    const timeShort = (t) => {
      if (!t) return '';
      if (t instanceof Date && !isNaN(t.getTime())) {
        const hh = String(t.getHours()).padStart(2, '0');
        const mm = String(t.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      }
      const s = String(t).trim();
      const m = s.match(/^(\d{1,2})[:.](\d{2})$/);
      if (m) return `${String(m[1]).padStart(2, '0')}:${m[2]}`;
      return s.slice(0, 5);
    };

    const normalizeBucket = (hhmm) => {
      const s = timeShort(hhmm);
      if (!/^\d{2}:\d{2}$/.test(s)) return '';
      const hh = s.slice(0, 2);
      const mm = (Number(s.slice(3, 5)) >= 30) ? '30' : '00';
      return `${hh}:${mm}`;
    };

    const badgeHtml = (slot) => {
      const type = String(pick(slot, 'type', 'status') || '').toLowerCase();
      const statusRaw = String(pick(slot, 'Status', 'status') || '').toLowerCase();

      if (type === 'class' || statusRaw === 'class') {
        return `<span class="badge bg-secondary bg-opacity-10 text-secondary">\u0E15\u0E32\u0E23\u0E32\u0E07\u0E2A\u0E2D\u0E19</span>`;
      }
      if (statusRaw === 'approved' || statusRaw === '\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34') {
        return `<span class="badge bg-success">\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34</span>`;
      }
      if (statusRaw === 'pending' || statusRaw === '\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34') {
        return `<span class="badge bg-warning text-dark">\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34</span>`;
      }
      return `<span class="badge bg-light text-dark border">\u0E08\u0E2D\u0E07</span>`;
    };

    const buildMetaLine = (icon, text) => {
      const s = String(text || '').trim();
      if (!s) return '';
      return `<div class="small text-muted text-truncate"><i class="${icon} me-1 opacity-75"></i>${escapeHtml(s)}</div>`;
    };

    // ===== 1) Resolve slots =====
    let slots = slotsInput;
    if (!Array.isArray(slots)) {
      if (window.combinedState && window.combinedState.cache && Array.isArray(window.combinedState.cache.slots)) {
        slots = window.combinedState.cache.slots;
      } else if (Array.isArray(window.combinedScheduleSlots)) {
        slots = window.combinedScheduleSlots;
      } else {
        slots = [];
      }
    }

    // ===== 2) Filter by date =====
    const dayKey = String(dateISO || '').slice(0, 10);

    let daySlots = slots.filter(s => {
      const rawDate = pick(s, 'date', 'BookingDate', 'DayKey', 'dayKey', 'Date');
      return toIsoDateKey(rawDate) === dayKey;
    });

    // ===== 3) Filter by time bucket (optional) =====
    const bucket = timeBucket ? normalizeBucket(timeBucket) : '';
    if (bucket) {
      daySlots = daySlots.filter(s => {
        const st = timeShort(pick(s, 'start', 'StartTime'));
        return normalizeBucket(st) === bucket;
      });
    }

    // sort by start time
    daySlots.sort((a, b) => {
      const sa = timeShort(pick(a, 'start', 'StartTime')) || '';
      const sb = timeShort(pick(b, 'start', 'StartTime')) || '';
      if (sa !== sb) return sa.localeCompare(sb);

      const ra = String(pick(a, 'roomId', 'RoomID') || '');
      const rb = String(pick(b, 'roomId', 'RoomID') || '');
      return ra.localeCompare(rb);
    });

    console.log('\uD83E\uDDFE openCombinedDayDetail split:', {
      day: dayKey,
      bucket: bucket || '(all day)',
      total: daySlots.length,
      booking: daySlots.filter(x => (x.bookingId || x.BookingID)).length,
      class: daySlots.filter(x => !(x.bookingId || x.BookingID)).length
    });

    // ===== 4) Ensure modal exists =====
    if (!document.getElementById('combinedDayModal')) {
      const modalHtml = `
        <div class="modal fade" id="combinedDayModal" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-lg modal-dialog-scrollable modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div class="modal-header border-0 pb-0">
                <h5 class="modal-title fw-bold"></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body p-4" id="combinedDayModalBody"></div>
              <div class="modal-footer border-0 pt-0">
                <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">\u0E1B\u0E34\u0E14</button>
              </div>
            </div>
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    const modalEl = document.getElementById('combinedDayModal');
    const bodyEl = document.getElementById('combinedDayModalBody');
    const titleEl = modalEl ? modalEl.querySelector('.modal-title') : null;

    if (!modalEl || !bodyEl || !titleEl) {
      console.error('\u274C openCombinedDayDetail: modal elements missing');
      return false;
    }

    // ===== 5) Header =====
    const dateObj = new Date(dayKey);
    const dateTh = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : dayKey;

    const bucketTitle = bucket ? ` \u2022 <span class="text-muted fw-normal">\u0E0A\u0E48\u0E27\u0E07 ${escapeHtml(bucket)}</span>` : '';
    titleEl.innerHTML = `<i class="fas fa-calendar-day me-2"></i>${escapeHtml(dateTh)}${bucketTitle}`;

    // ===== 6) Render content =====
    const renderEmpty = () => {
      const st = bucket || '08:00';
      const en = bucket ? (bucket.endsWith(':00') ? bucket.slice(0, 2) + ':30' : bucket.slice(0, 2) + ':59') : '12:00';

      bodyEl.innerHTML = `
        <div class="text-center py-5 opacity-75">
          <i class="fas fa-mug-hot fa-3x mb-3 text-secondary"></i>
          <h5 class="fw-bold">${bucket ? '\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E27\u0E25\u0E32\u0E19\u0E35\u0E49\u0E27\u0E48\u0E32\u0E07' : '\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49\u0E27\u0E48\u0E32\u0E07'}</h5>
          <p class="small text-muted">${bucket ? '\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E43\u0E19\u0E0A\u0E48\u0E27\u0E07\u0E19\u0E35\u0E49' : '\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E23\u0E35\u0E22\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07'}</p>
          ${typeof showBookingFormWithDate === 'function'
            ? `<button class="btn btn-primary rounded-pill mt-2"
                 onclick="try{showBookingFormWithDate('${escapeHtml(dayKey)}','${escapeHtml(st)}','${escapeHtml(en)}');}catch(e){}">
                 <i class="fas fa-plus-circle me-1"></i> \u0E08\u0E2D\u0E07\u0E0A\u0E48\u0E27\u0E07\u0E19\u0E35\u0E49
               </button>`
            : ''
          }
        </div>`;
    };

    if (daySlots.length === 0) {
      renderEmpty();
    } else {
      const cards = daySlots.map(s => {
        const start = timeShort(pick(s, 'start', 'StartTime'));
        const end = timeShort(pick(s, 'end', 'EndTime'));
        const timeText = `${escapeHtml(start || '--:--')} - ${escapeHtml(end || '--:--')}`;

        const title = pick(s, 'title', 'subject', 'Purpose', 'SubjectName') || '\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23';
        const room = pick(s, 'roomId', 'RoomID', 'RoomName') || '';
        const who = pick(s, 'instructor', 'Instructor', 'booker', 'BookerName') || '';

        const bookingId = pick(s, 'bookingId', 'BookingID');
        const isBooking = !!bookingId;

        // "\u0E21\u0E35\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14" = bookingId + \u0E21\u0E35 openBookingDetail()
        const canOpenDetail = isBooking && (typeof openBookingDetail === 'function');

        // \u2705 Bonus UX: \u0E40\u0E09\u0E1E\u0E32\u0E30\u0E17\u0E35\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14 -> \u0E04\u0E25\u0E34\u0E01\u0E40\u0E1B\u0E34\u0E14 detail \u0E44\u0E14\u0E49\u0E40\u0E25\u0E22
        const clickAttr = canOpenDetail
          ? `role="button" tabindex="0" style="cursor:pointer;"
             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}"
             onclick="try{
                openBookingDetail('${escapeHtml(bookingId)}');
                try{
                  const el=document.getElementById('combinedDayModal');
                  if(window.bootstrap && bootstrap.Modal){
                    const m=bootstrap.Modal.getInstance(el);
                    if(m) m.hide();
                  }else if(window.jQuery){
                    jQuery(el).modal('hide');
                  }
                }catch(e){}
             }catch(e){}"`
          : '';

        // \u2705 \u0E16\u0E49\u0E32\u0E27\u0E48\u0E32\u0E07 -> \u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E42\u0E0A\u0E27\u0E4C\u0E2D\u0E30\u0E44\u0E23 (\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48 "-")
        const metaRoom = room ? `<span class="badge bg-white text-primary border booking-room-name">${escapeHtml(room)}</span>` : '';
        const metaWho = who ? `<small class="text-muted text-truncate"><i class="fas fa-user me-1"></i>${escapeHtml(who)}</small>` : '';

        // Optional detail fields (only if exists)
        const phone = pick(s, 'PhoneNumber');
        const remark = pick(s, 'Remark');
        const meeting = pick(s, 'MeetingLink');

        const extraLines = [
          buildMetaLine('fas fa-phone', phone),
          buildMetaLine('fas fa-comment-dots', remark),
          buildMetaLine('fas fa-link', meeting)
        ].filter(Boolean).join('');

        return `
          <div class="card mb-2 border-0 shadow-sm bg-light ${canOpenDetail ? 'hover-shadow' : ''}" ${clickAttr}>
            <div class="card-body p-3">
              <div class="d-flex justify-content-between align-items-center mb-1 gap-2 booking-header">
                ${metaRoom}
                <div class="d-flex align-items-center gap-2 min-w-0 booking-meta-row">
                  <span class="small text-muted flex-shrink-0 booking-time"><i class="fas fa-clock me-1"></i>${timeText}</span>
                  ${badgeHtml(s)}
                </div>
              </div>

              <h6 class="fw-bold mb-1 text-truncate booking-title">${escapeHtml(title)}</h6>

              <div class="d-flex justify-content-between align-items-end gap-2">
                ${metaWho || '<span></span>'}
                ${canOpenDetail ? `<span class="small text-primary fw-semibold"><i class="fas fa-up-right-from-square me-1"></i>\u0E40\u0E1B\u0E34\u0E14\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14</span>` : ''}
              </div>

              ${extraLines ? `<div class="mt-2">${extraLines}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');

      const headerRightBtn = (typeof showBookingFormWithDate === 'function')
        ? `<button class="btn btn-sm btn-outline-primary rounded-pill"
             onclick="try{showBookingFormWithDate('${escapeHtml(dayKey)}','${escapeHtml(bucket || '08:00')}','${escapeHtml(bucket ? (bucket.endsWith(':00') ? bucket.slice(0, 2) + ':30' : bucket.slice(0, 2) + ':59') : '12:00')}');}catch(e){}">
             <i class="fas fa-plus me-1"></i> \u0E08\u0E2D\u0E07\u0E40\u0E1E\u0E34\u0E48\u0E21
           </button>`
        : '';

      bodyEl.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <span class="text-muted small">\u0E23\u0E27\u0E21 ${daySlots.length} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23</span>
          ${headerRightBtn}
        </div>
        <div style="max-height:60vh; overflow-y:auto;">${cards}</div>
      `;
    }

    // ===== 7) Show modal =====
    try {
      if (window.bootstrap && bootstrap.Modal) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
      } else if (window.jQuery) {
        jQuery(modalEl).modal('show');
      } else {
        console.warn('\u26A0\uFE0F openCombinedDayDetail: bootstrap/jQuery not found');
        alert('\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E1B\u0E34\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E44\u0E14\u0E49 (Bootstrap/jQuery \u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21)');
      }
    } catch (e) {
      console.error('\u274C openCombinedDayDetail: modal show error', e);
      alert('\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E40\u0E1B\u0E34\u0E14\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14: ' + (e.message || e));
    }

    return true;

  } catch (e) {
    console.error('\u274C openCombinedDayDetail error:', e);
    alert('\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E40\u0E1B\u0E34\u0E14\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14: ' + (e.message || e));
    return false;
  }
};
// ANCHOR:CLIENT.openCombinedDayDetail:END



function ensureCombinedDayModal() {
  if (document.getElementById('combinedDayModal')) return;

  const div = document.createElement('div');
  div.innerHTML = `
    <div class="modal fade" id="combinedDayModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content rounded-4 shadow">
          <div class="modal-header">
            <h5 class="modal-title fw-extrabold">
              <i class="fas fa-calendar-day text-primary me-2"></i>\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E23\u0E32\u0E22\u0E27\u0E31\u0E19
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="combinedDayModalBody">
            <div class="text-center py-4 text-muted">\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14...</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">
              \u0E1B\u0E34\u0E14
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div.firstElementChild);
}

// ✅ Helper: updateCombinedWeekLabel
window.updateCombinedWeekLabel = function(date) {
  let d;
  if (date instanceof Date) {
    d = new Date(date);
  } else if (typeof date === 'string' && date.includes('-')) {
    const parts = date.split('-');
    d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else {
    d = date ? new Date(date) : new Date();
  }
  
  if (isNaN(d.getTime())) {
    d = new Date();
  }

  const day = d.getDay(); // 0 = Sun, 1 = Mon
  const dayAdjusted = (day === 0) ? 7 : day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() - dayAdjusted + 1);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const thaiMonthsShort = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];

  const startDay = monday.getDate();
  const startMonth = thaiMonthsShort[monday.getMonth()];
  const startYear = monday.getFullYear() + 543;

  const endDay = sunday.getDate();
  const endMonth = thaiMonthsShort[sunday.getMonth()];
  const endYear = sunday.getFullYear() + 543;

  // Desktop:
  // Same year: "8 มิ.ย. - 14 มิ.ย. 2569" or "29 มิ.ย. - 5 ก.ค. 2569"
  // Cross year: "29 ธ.ค. 2569 - 4 ม.ค. 2570"
  let desktopStr = "";
  if (monday.getFullYear() !== sunday.getFullYear()) {
    desktopStr = `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`;
  } else {
    desktopStr = `${startDay} ${startMonth} - ${endDay} ${endMonth} ${endYear}`;
  }

  // Mobile:
  // Same month: "8 - 14 มิ.ย."
  // Cross month: "29 มิ.ย. - 5 ก.ค."
  // Cross year: "29 ธ.ค. 69 - 4 ม.ค. 70"
  let mobileStr = "";
  if (monday.getFullYear() !== sunday.getFullYear()) {
    const startYearShort = String(startYear).slice(-2);
    const endYearShort = String(endYear).slice(-2);
    mobileStr = `${startDay} ${startMonth} ${startYearShort} - ${endDay} ${endMonth} ${endYearShort}`;
  } else if (monday.getMonth() !== sunday.getMonth()) {
    mobileStr = `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
  } else {
    mobileStr = `${startDay} - ${endDay} ${endMonth}`;
  }

  const desktopEl = document.getElementById('combinedWeekRangeDesktop');
  const mobileEl = document.getElementById('combinedWeekRangeMobile');
  if (desktopEl) desktopEl.textContent = desktopStr;
  if (mobileEl) mobileEl.textContent = mobileStr;

  // Update "สัปดาห์นี้" active/disabled state
  const today = new Date();
  const todayDay = today.getDay();
  const todayDayAdjusted = (todayDay === 0) ? 7 : todayDay;
  const todayMonday = new Date(today);
  todayMonday.setDate(today.getDate() - todayDayAdjusted + 1);
  todayMonday.setHours(0,0,0,0);

  const currentMonday = new Date(monday);
  currentMonday.setHours(0,0,0,0);

  const isCurrentWeek = todayMonday.getTime() === currentMonday.getTime();
  const thisBtn = document.getElementById('combinedThisWeekBtn');
  if (thisBtn) {
    if (isCurrentWeek) {
      thisBtn.classList.remove('btn-primary');
      thisBtn.classList.add('btn-outline-primary', 'disabled');
      thisBtn.disabled = true;
    } else {
      thisBtn.classList.add('btn-primary');
      thisBtn.classList.remove('btn-outline-primary', 'disabled');
      thisBtn.disabled = false;
    }
  }
};

// ✅ Helper: setCombinedNavButtonsLoading
window.setCombinedNavButtonsLoading = function(isLoading) {
  const prevBtn = document.getElementById('combinedPrevWeekBtn');
  const thisBtn = document.getElementById('combinedThisWeekBtn');
  const nextBtn = document.getElementById('combinedNextWeekBtn');
  
  [prevBtn, thisBtn, nextBtn].forEach(btn => {
    if (!btn) return;
    btn.disabled = isLoading;
    if (isLoading) {
      btn.classList.add('disabled');
    } else {
      // Check if it's "สัปดาห์นี้" button and it should remain disabled if we are currently on the current week
      if (btn.id === 'combinedThisWeekBtn') {
        const currentIso = window.currentDate || new Date().toISOString().split('T')[0];
        let dateObj;
        if (typeof currentIso === 'string' && currentIso.includes('-')) {
          const parts = currentIso.split('-');
          dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else {
          dateObj = new Date(currentIso);
        }
        if (isNaN(dateObj.getTime())) dateObj = new Date();

        const day = dateObj.getDay();
        const dayAdjusted = (day === 0) ? 7 : day;
        const monday = new Date(dateObj);
        monday.setDate(dateObj.getDate() - dayAdjusted + 1);
        monday.setHours(0,0,0,0);

        const today = new Date();
        const todayDay = today.getDay();
        const todayDayAdjusted = (todayDay === 0) ? 7 : todayDay;
        const todayMonday = new Date(today);
        todayMonday.setDate(today.getDate() - todayDayAdjusted + 1);
        todayMonday.setHours(0,0,0,0);

        if (todayMonday.getTime() === monday.getTime()) {
          btn.classList.remove('btn-primary');
          btn.classList.add('btn-outline-primary', 'disabled');
          btn.disabled = true;
          return;
        }
      }
      btn.classList.remove('disabled');
    }
  });
};

// ✅ Helper: changeCombinedWeek
window.changeCombinedWeek = async function(delta) {
  let currentIso = window.currentDate || new Date().toISOString().split('T')[0];
  let dateObj;
  if (typeof currentIso === 'string' && currentIso.includes('-')) {
    const parts = currentIso.split('-');
    dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  } else {
    dateObj = new Date(currentIso);
  }
  if (isNaN(dateObj.getTime())) dateObj = new Date();

  dateObj.setDate(dateObj.getDate() + (delta * 7));

  const yy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const newDateISO = `${yy}-${mm}-${dd}`;

  console.log(`📅 Navigating Combined Week: ${delta} -> ${newDateISO}`);

  window.currentDate = newDateISO;
  const dateInput = document.getElementById('selectedDate');
  if (dateInput) {
    dateInput.value = newDateISO;
    dateInput.dispatchEvent(new Event('change', { bubbles: false }));
  }

  if (typeof window.loadCombinedSchedule === 'function') {
    await window.loadCombinedSchedule(true, newDateISO);
  }
};

// ✅ Helper: changeCombinedToCurrentWeek
window.changeCombinedToCurrentWeek = async function() {
  const today = new Date();
  const yy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const newDateISO = `${yy}-${mm}-${dd}`;

  console.log(`📅 Navigating Combined Week to Current: ${newDateISO}`);

  window.currentDate = newDateISO;
  const dateInput = document.getElementById('selectedDate');
  if (dateInput) {
    dateInput.value = newDateISO;
    dateInput.dispatchEvent(new Event('change', { bubbles: false }));
  }

  if (typeof window.loadCombinedSchedule === 'function') {
    await window.loadCombinedSchedule(true, newDateISO);
  }
};

function bindCombinedControls() {
  console.log('\uD83D\uDD27 bindCombinedControls() -> start');

  try {
    // \u2705 Prevent double bind (global flag)
    if (window.combinedControlsBound === true) {
      console.log('\u267B\uFE0F bindCombinedControls: already bound');
      return true;
    }

    const refreshBtn = document.getElementById('btnCombinedRefresh');
    const toggleBtn  = document.getElementById('btnCombinedToggleView');

    if (!refreshBtn) {
      console.log('\u274C FAIL bindCombinedControls: btnCombinedRefresh not found');
      return false;
    }
    if (!toggleBtn) {
      console.log('\u274C FAIL bindCombinedControls: btnCombinedToggleView not found');
      return false;
    }

    console.log('\u2705 PASS: buttons exist');

    // \u2705 store handlers globally (so removeEventListener works)
    window.combinedHandlers = (window.combinedHandlers && typeof window.combinedHandlers === 'object')
      ? window.combinedHandlers
      : {};

    // \u2705 helper: lock/unlock buttons (anti spam click)
    const setBtnLoading = (btn, isLoading, loadingHtml) => {
      if (!btn) return;

      if (isLoading) {
        if (btn.dataset.loading === '1') return;
        btn.dataset.loading = '1';
        btn.dataset.prevHtml = btn.innerHTML;
        btn.disabled = true;
        btn.classList.add('disabled');
        if (loadingHtml) btn.innerHTML = loadingHtml;
      } else {
        btn.dataset.loading = '0';
        btn.disabled = false;
        btn.classList.remove('disabled');
        if (btn.dataset.prevHtml) btn.innerHTML = btn.dataset.prevHtml;
      }
    };

    // \u2705 REFRESH handler
    window.combinedHandlers.onCombinedRefresh = async function (e) {
      try {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();

        if (refreshBtn.dataset.loading === '1') {
          console.log('\u26A0\uFE0F Refresh blocked: already loading');
          return;
        }

        setBtnLoading(
          refreshBtn,
          true,
          '<i class="fas fa-sync-alt fa-spin me-1"></i>\u0E01\u0E33\u0E25\u0E31\u0E07\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A...'
        );

        // \u2705 Prefer refreshCombinedSchedule (new) else fallback to loadCombinedSchedule(true)
        if (typeof window.refreshCombinedSchedule === 'function') {
          await window.refreshCombinedSchedule();
          console.log('\u2705 PASS: refreshCombinedSchedule done');
          return;
        }

        if (typeof window.loadCombinedSchedule !== 'function') {
          console.log('\u274C FAIL: loadCombinedSchedule() not found');
          if (typeof renderCombinedError === 'function') renderCombinedError('\u0E23\u0E30\u0E1A\u0E1A\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49: loadCombinedSchedule() \u0E44\u0E21\u0E48\u0E1E\u0E1A');
          return;
        }

        await window.loadCombinedSchedule(true);
        console.log('\u2705 PASS: loadCombinedSchedule(forceReload) done');

      } catch (err) {
        console.log('\u274C FAIL: refresh exception', err);
        if (typeof renderCombinedError === 'function') {
          renderCombinedError(err && err.message ? err.message : String(err));
        }
      } finally {
        setBtnLoading(refreshBtn, false);
      }
    };

    // \u2705 TOGGLE handler
    window.combinedHandlers.onCombinedToggle = async function (e) {
      try {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();

        if (toggleBtn.dataset.loading === '1') {
          console.log('\u26A0\uFE0F Toggle blocked: already loading');
          return;
        }

        setBtnLoading(
          toggleBtn,
          true,
          '<i class="fas fa-circle-notch fa-spin me-1"></i>\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2A\u0E25\u0E31\u0E1A...'
        );

        // \u2705 Prefer existing toggle if system already has it
        if (typeof window.toggleCombinedView === 'function') {
          window.toggleCombinedView();
          return;
        }

        const current = (typeof getCombinedView === 'function')
          ? getCombinedView()
          : (window.combinedViewMode || 'summary');

        const next = (current === 'calendar') ? 'summary' : 'calendar';

        // \u2705 save view state
        if (!window.combinedState || typeof window.combinedState !== 'object') window.combinedState = {};
        window.combinedState.view = next;
        window.combinedViewMode = next;

        const cacheSlots =
          (window.combinedState.cache && Array.isArray(window.combinedState.cache.slots))
            ? window.combinedState.cache.slots
            : (Array.isArray(window.combinedScheduleSlots) ? window.combinedScheduleSlots : null);

        // \u2705 render shell first
        if (typeof setCombinedView === 'function') {
          setCombinedView(next, cacheSlots);
        }

        // \u2705 if no cache -> fetch real
        if (!Array.isArray(cacheSlots) && typeof window.loadCombinedSchedule === 'function') {
          await window.loadCombinedSchedule(false);
        }

        console.log(`\u2705 PASS: view changed ${current} -> ${next}`);

      } catch (err) {
        console.log('\u274C FAIL: toggle exception', err);
      } finally {
        setBtnLoading(toggleBtn, false);
      }
    };

    // \u2705 Remove old listeners then add once
    refreshBtn.removeEventListener('click', window.combinedHandlers.onCombinedRefresh);
    toggleBtn.removeEventListener('click', window.combinedHandlers.onCombinedToggle);

    refreshBtn.addEventListener('click', window.combinedHandlers.onCombinedRefresh);

    // Bind Week Navigation Buttons
    const prevWeekBtn = document.getElementById('combinedPrevWeekBtn');
    const thisWeekBtn = document.getElementById('combinedThisWeekBtn');
    const nextWeekBtn = document.getElementById('combinedNextWeekBtn');

    if (prevWeekBtn) {
      if (!window.combinedHandlers.onCombinedPrevWeek) {
        window.combinedHandlers.onCombinedPrevWeek = async function(e) {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          if (prevWeekBtn.disabled || prevWeekBtn.dataset.loading === '1') return;
          await window.changeCombinedWeek(-1);
        };
      }
      prevWeekBtn.removeEventListener('click', window.combinedHandlers.onCombinedPrevWeek);
      prevWeekBtn.addEventListener('click', window.combinedHandlers.onCombinedPrevWeek);
      prevWeekBtn.dataset.bound = '1';
    }
    
    if (thisWeekBtn) {
      if (!window.combinedHandlers.onCombinedThisWeek) {
        window.combinedHandlers.onCombinedThisWeek = async function(e) {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          if (thisWeekBtn.disabled || thisWeekBtn.dataset.loading === '1') return;
          await window.changeCombinedToCurrentWeek();
        };
      }
      thisWeekBtn.removeEventListener('click', window.combinedHandlers.onCombinedThisWeek);
      thisWeekBtn.addEventListener('click', window.combinedHandlers.onCombinedThisWeek);
      thisWeekBtn.dataset.bound = '1';
    }

    if (nextWeekBtn) {
      if (!window.combinedHandlers.onCombinedNextWeek) {
        window.combinedHandlers.onCombinedNextWeek = async function(e) {
          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          if (nextWeekBtn.disabled || nextWeekBtn.dataset.loading === '1') return;
          await window.changeCombinedWeek(1);
        };
      }
      nextWeekBtn.removeEventListener('click', window.combinedHandlers.onCombinedNextWeek);
      nextWeekBtn.addEventListener('click', window.combinedHandlers.onCombinedNextWeek);
      nextWeekBtn.dataset.bound = '1';
    }

    const currentIso = window.currentDate || new Date().toISOString().split('T')[0];
    if (typeof window.updateCombinedWeekLabel === 'function') {
      window.updateCombinedWeekLabel(currentIso);
    }
    toggleBtn.addEventListener('click', window.combinedHandlers.onCombinedToggle);

    // \u2705 Mark as bound
    window.combinedControlsBound = true;
    refreshBtn.dataset.bound = '1';
    toggleBtn.dataset.bound  = '1';

    console.log('\u2705 \u2705 bindCombinedControls() -> success');
    return true;

  } catch (err) {
    console.log('\u274C FAIL bindCombinedControls() exception', err);
    return false;
  }
}

    
// ANCHOR:CLIENT.CombinedControls:REPLACE
async function refreshCombinedSchedule() {
  console.log('\uD83D\uDD04 Force Refreshing Combined Schedule...');

  try {
    // \u2705 0) Guard: prevent refresh spam (even if called from elsewhere)
    if (!window.combinedState || typeof window.combinedState !== 'object') {
      window.combinedState = {};
    }
    if (window.combinedState.refreshing === true) {
      console.log('\u26A0\uFE0F refreshCombinedSchedule blocked: already refreshing');
      return { ok: true, skipped: true, reason: 'alreadyRefreshing' };
    }
    window.combinedState.refreshing = true;

    // \u2705 1) Reset cache + globals
    window.combinedState.cache = { slots: null, fetchedAt: 0, dateKey: '', weekKey: '' };
    window.combinedState.lastCall = 0;
    window.combinedScheduleSlots = null;

    // \u2705 2) Reset rendered flags (prevent stale UI logic)
    try {
      const summaryGrid = document.getElementById('combinedSummaryGrid');
      const calGrid = document.getElementById('combinedCalendarGrid');
      if (summaryGrid && summaryGrid.dataset) summaryGrid.dataset.hasRendered = '0';
      if (calGrid && calGrid.dataset) calGrid.dataset.hasRendered = '0';
    } catch (e) {}

    // \u2705 3) Show loading shell immediately (use current view)
    const currentView = (typeof getCombinedView === 'function')
      ? getCombinedView()
      : (window.combinedViewMode || 'summary');

    if (typeof setCombinedView === 'function') {
      // shell + spinner (\u0E15\u0E32\u0E21\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E14\u0E34\u0E21)
      setCombinedView(currentView, null);
    }

    // \u2705 4) Resolve current dateISO (same logic with system)
    const dateISO = (typeof window.getCurrentDateISO === 'function')
      ? window.getCurrentDateISO()
      : (window.currentDate ? String(window.currentDate).slice(0, 10) : new Date().toISOString().slice(0, 10));

    // \u2705 5) Force fetch
    if (typeof window.loadCombinedSchedule !== 'function') {
      console.log('\u274C FAIL refreshCombinedSchedule: loadCombinedSchedule() not found');
      if (typeof renderCombinedError === 'function') {
        renderCombinedError('\u0E23\u0E30\u0E1A\u0E1A\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49: loadCombinedSchedule() \u0E44\u0E21\u0E48\u0E1E\u0E1A');
      }
      return { ok: false, error: 'loadCombinedSchedule not found' };
    }

    const res = await window.loadCombinedSchedule(true, dateISO);

    // \u2705 6) If failed -> show error banner
    if (!res || res.ok !== true) {
      const msg = (res && (res.error || res.message)) ? (res.error || res.message) : '\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08';
      console.log('\u274C FAIL refreshCombinedSchedule: ', msg);
      if (typeof renderCombinedError === 'function') renderCombinedError(msg);
      return { ok: false, error: msg, raw: res };
    }

    console.log('\u2705 PASS refreshCombinedSchedule: done', res);
    return { ok: true, result: res };

  } catch (err) {
    console.log('\u274C FAIL refreshCombinedSchedule exception:', err);
    if (typeof renderCombinedError === 'function') {
      renderCombinedError(err && err.message ? err.message : String(err));
    }
    return { ok: false, error: err && err.message ? err.message : String(err) };

  } finally {
    if (window.combinedState && typeof window.combinedState === 'object') {
      window.combinedState.refreshing = false;
    }
  }
}

function updateMobileActiveRoom(roomId) {
    const pills = document.querySelectorAll('.modern-room-pill');
    pills.forEach(p => {
        if(p.dataset.roomId === roomId) {
            p.classList.add('active');
            p.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        } else {
            p.classList.remove('active');
        }
    });
}

// Override \u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19 selectRoom \u0E40\u0E14\u0E34\u0E21 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49 update mobile pill \u0E14\u0E49\u0E27\u0E22
const originalSelectRoom = window.selectRoom;
window.selectRoom = function(roomId) {
    if(typeof originalSelectRoom === 'function') originalSelectRoom(roomId);
    updateMobileActiveRoom(roomId);
};

  // \u2705 BERRY FIX: \u0E1B\u0E23\u0E30\u0E01\u0E32\u0E28\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19\u0E43\u0E2B\u0E49\u0E40\u0E1B\u0E47\u0E19 Global \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49 HTML \u0E40\u0E23\u0E35\u0E22\u0E01\u0E43\u0E0A\u0E49\u0E44\u0E14\u0E49
function formatThaiDateShort(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return String(dateStr);

  const d = parseInt(parts[2], 10);
  const m = parseInt(parts[1], 10) - 1;
  const y = parseInt(parts[0], 10);

  const months = ['\u0E21.\u0E04.', '\u0E01.\u0E1E.', '\u0E21\u0E35.\u0E04.', '\u0E40\u0E21.\u0E22.', '\u0E1E.\u0E04.', '\u0E21\u0E34.\u0E22.', '\u0E01.\u0E04.', '\u0E2A.\u0E04.', '\u0E01.\u0E22.', '\u0E15.\u0E04.', '\u0E1E.\u0E22.', '\u0E18.\u0E04.'];
  if (isNaN(d) || isNaN(m) || isNaN(y) || m < 0 || m > 11) return String(dateStr);

  const yearBE2 = (y + 543) % 100;
  return `${d} ${months[m]} ${yearBE2}`;
}

window.formatThaiDateShort = formatThaiDateShort;


window.formatThaiDate = function(dateValue) {
    // \u0E16\u0E49\u0E32\u0E21\u0E35\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19 formatThaiDateFrontend \u0E43\u0E2B\u0E49\u0E40\u0E23\u0E35\u0E22\u0E01\u0E43\u0E0A\u0E49 
    if (typeof formatThaiDateFrontend === 'function') {
        return formatThaiDateFrontend(dateValue);
    }
    // \u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E21\u0E35 \u0E43\u0E2B\u0E49\u0E43\u0E0A\u0E49 formatDateBE \u0E41\u0E17\u0E19 (Priority 2)
    if (typeof formatDateBE === 'function') {
        return formatDateBE(dateValue);
    }
    // \u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E21\u0E35\u0E40\u0E25\u0E22 \u0E43\u0E2B\u0E49\u0E04\u0E37\u0E19\u0E04\u0E48\u0E32\u0E40\u0E14\u0E34\u0E21\u0E01\u0E25\u0E31\u0E1A\u0E44\u0E1B
    return dateValue; 
};

console.log('\u2705 Fixed: formatThaiDate alias registered.');


// ANCHOR:CLIENT.openCombinedModal:REPLACE
window.openCombinedModal = function(dateISO, bandKey, bucket) {
    console.log('\uD83D\uDD0D Opening Modal for:', dateISO, bandKey); // \u0E40\u0E1E\u0E34\u0E48\u0E21 Log \u0E40\u0E0A\u0E47\u0E04
    
    const modalEl = document.getElementById('combinedSummaryModal');
    const titleEl = document.getElementById('combinedSummaryModalTitle');
    const bodyEl = document.getElementById('combinedSummaryModalBody');
    
    if (!modalEl || !titleEl || !bodyEl) {
        console.error('\u274C Modal elements not found!');
        return;
    }

    const map = { morning: '\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E0A\u0E49\u0E32 (08:00 - 12:00)', noon: '\u0E0A\u0E48\u0E27\u0E07\u0E1A\u0E48\u0E32\u0E22 (12:00 - 16:00)', eve: '\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E22\u0E47\u0E19 (16:00 - 20:00)' };
    
    // \u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E08\u0E32\u0E01 Bucket (\u0E16\u0E49\u0E32\u0E2A\u0E48\u0E07\u0E21\u0E32) \u0E2B\u0E23\u0E37\u0E2D\u0E08\u0E32\u0E01 Global Cache
    const dataBucket = bucket || window._bucketCache || {};
    const list = dataBucket[dateISO] && dataBucket[dateISO][bandKey] ? dataBucket[dateISO][bandKey] : [];

    // \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E41\u0E1A\u0E1A\u0E44\u0E17\u0E22 (21 \u0E18.\u0E04. 68)
    const dateThai = window.formatThaiDateShort(dateISO);
    
    // \u0E1B\u0E23\u0E31\u0E1A\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D
    titleEl.innerHTML = `
        <div class="d-flex align-items-center gap-2">
            <span class="text-primary fw-bold">${dateThai}</span>
            <span class="text-muted mx-1">\u2022</span>
            <span class="text-dark" style="font-size: 0.9em;">${map[bandKey] || bandKey}</span>
            <span class="badge bg-secondary bg-opacity-10 text-secondary rounded-pill ms-2 px-3">${list.length} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23</span>
        </div>
    `;

    // Render \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23
    const lines = list.slice().sort((a, b) => String(a.start || '').localeCompare(String(b.start || ''))).map(s => {
      const room = escapeHtml(String(s.roomId || ''));
      const subject = escapeHtml(String(s.subject || s.title || ''));
      const instructor = escapeHtml(String(s.instructor || ''));
      const start = escapeHtml(String(s.start || ''));
      const end = escapeHtml(String(s.end || ''));
      
      const badgeColor = 'bg-info text-dark border-info-subtle'; 

      return `
        <div class="card border-0 shadow-sm mb-3 overflow-hidden" style="border-radius: 12px; transition: transform 0.2s;">
          <div class="card-body p-3">
            <div class="d-flex gap-3">
                <div class="flex-shrink-0 pt-1">
                    <span class="badge ${badgeColor} border px-2 py-1 rounded-2 shadow-sm" 
                          style="min-width: 50px; font-size: 0.85rem; font-weight: 700;">
                        ${room || '?'}
                    </span>
                </div>
                <div class="flex-grow-1 min-w-0">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <h6 class="fw-bold text-dark mb-0 text-truncate pe-2" style="font-size: 0.95rem; line-height: 1.4;">
                            ${subject || '-'}
                        </h6>
                        <div class="d-flex align-items-center text-secondary small fw-medium bg-light px-2 py-1 rounded-pill flex-shrink-0">
                            <i class="far fa-clock me-1"></i> ${start} - ${end}
                        </div>
                    </div>
                    ${instructor ? `
                    <div class="d-flex align-items-center text-muted small mt-2">
                        <div class="d-flex align-items-center bg-secondary bg-opacity-10 px-2 py-1 rounded-2" style="font-size: 0.8rem;">
                            <i class="fas fa-user-tie me-2 opacity-50"></i>${instructor}
                        </div>
                    </div>` : ''}
                </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    bodyEl.innerHTML = list.length ? 
        `<div class="px-1 py-2">${lines}</div>` : 
        `<div class="text-center py-5 text-muted opacity-50">
            <i class="fas fa-box-open fa-3x mb-3"></i><br>\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23
         </div>`;

    // \u0E40\u0E1B\u0E34\u0E14 Modal
    try {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    } catch (e) {
      console.error('Bootstrap Modal Error:', e);
    }
};


function normalizeApiResult(res) {
  if (!res) return { ok: false, error: 'No response' };

  if (res.ok === true) return res;

  if (res.success === true && res.result !== undefined) {
    return { ok: true, data: res.result };
  }

  if (res.status === 'success' && res.data !== undefined) {
    return { ok: true, data: res.data };
  }

  if (res.ok === false) return res;

  if (res.success === false) {
    return { ok: false, error: res.error || 'API failed' };
  }

  return { ok: false, error: res.error || 'Unknown API response', raw: res };
}

function renderCombinedError(msg) {
  const grid = document.getElementById('combinedSummaryGrid');
  if (grid) {
    grid.innerHTML = `
      <div class="alert alert-danger">
        <b>\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08</b><br>
        ${msg ? msg : 'Unknown error'}
      </div>`;
  }
}

window.getCurrentDateISO = function () {
  // \u0E43\u0E0A\u0E49\u0E04\u0E48\u0E32\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E15\u0E31\u0E49\u0E07\u0E44\u0E27\u0E49\u0E01\u0E48\u0E2D\u0E19 (\u0E16\u0E49\u0E32\u0E21\u0E35)
  let d = window.currentDate;

  // \u0E16\u0E49\u0E32\u0E40\u0E1B\u0E47\u0E19 Date object
  if (d instanceof Date) {
    return d.toISOString().slice(0, 10);
  }

  // \u0E16\u0E49\u0E32\u0E40\u0E1B\u0E47\u0E19 string \u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    return d.slice(0, 10);
  }

  // fallback: \u0E27\u0E31\u0E19\u0E19\u0E35\u0E49
  return new Date().toISOString().slice(0, 10);
};

async function loadDashboardStats() {
  try {
    console.log('\uD83D\uDCCA Fetching stats...');

    const res = await apiCall('getBookings');
    const bookingsRaw = (res && res.data && Array.isArray(res.data.bookings)) ? res.data.bookings : [];

    const bookings = bookingsRaw.filter(b => b && b.BookingID);

    const normalizeStatus = (s) => {
      return String(s || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
    };

    const isPending = (st) => ['\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34', 'pending'].includes(st);
    const isApproved = (st) => ['\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34', 'approved', 'approve'].includes(st);
    const isRejected = (st) => ['\u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34', 'rejected', 'reject'].includes(st);
    const isCancelled = (st) => ['\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01', 'cancelled', 'canceled', 'cancel'].includes(st);

    const stats = {
      total: bookings.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      rooms: Array.isArray(window.roomsData) ? window.roomsData.length : 0
    };

    bookings.forEach(b => {
      const st = normalizeStatus(b.Status);
      if (isPending(st)) stats.pending += 1;
      else if (isApproved(st)) stats.approved += 1;
      else if (isRejected(st)) stats.rejected += 1;
      else if (isCancelled(st)) stats.cancelled += 1;
    });

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
      else console.log('\u26A0\uFE0F loadDashboardStats: missing DOM id ->', id);
    };

    setText('totalBookings', stats.total);
    setText('pendingBookings', stats.pending);
    setText('approvedBookings', stats.approved);
    setText('rejectedBookings', stats.rejected);
    setText('cancelledBookings', stats.cancelled);
    setText('totalRooms', stats.rooms);

    console.log('\u2705 Dashboard Stats:', stats);
    return stats;

  } catch (error) {
    console.error('\u274C Stats Error:', error);
    return null;
  }
}

async function loadDashboard(opts) {
  const options = (opts && typeof opts === 'object') ? opts : {};
  const force = !!options.force;

  try {
    console.log('\uD83D\uDCCA Loading dashboard data...', { force });

    if (!window.dashboardState || typeof window.dashboardState !== 'object') {
      window.dashboardState = { loading: false, loadedAt: 0, lastError: null };
    }

    const st = window.dashboardState;
    if (st.loading) {
      console.log('\u26A0\uFE0F Dashboard already loading (skip)');
      return { ok: true, skipped: true, reason: 'loading' };
    }

    const dateEl = document.getElementById('selectedDate');
    const baseDateStr = (dateEl && dateEl.value)
      ? String(dateEl.value).trim()
      : (window.currentDate ? String(window.currentDate).trim() : new Date().toISOString().slice(0, 10));

    const now = Date.now();
    const ageMs = now - (st.loadedAt || 0);
    if (!force && st.loadedAt && st.dateKey === baseDateStr && ageMs < 30 * 1000) {
      console.log('\u267B\uFE0F Dashboard using fresh cache (skip reload)', { ageMs });
      return { ok: true, skipped: true, reason: 'freshCache', ageMs };
    }

    st.loading = true;
    st.lastError = null;

    const loadingEl = document.getElementById('dashboardLoading');
    if (loadingEl) loadingEl.classList.remove('d-none');

    let statsOk = false;
    if (typeof loadDashboardStats === 'function') {
      await loadDashboardStats();
      statsOk = true;
      console.log('\u2705 PASS: loadDashboardStats done');
    } else {
      console.log('\u274C FAIL: loadDashboardStats missing');
    }

    let chartOk = false;
    if (typeof loadBookingChart === 'function') {
      const chartResult = await loadBookingChart();
      chartOk = Array.isArray(chartResult);
      console.log('\u2705 PASS: loadBookingChart done', { chartOk });
    } else if (typeof updateChart === 'function') {
      await updateChart();
      chartOk = true;
      console.log('\u2705 PASS: updateChart fallback done');
    } else {
      console.log('\u274C FAIL: loadBookingChart/updateChart missing');
    }

    let recentOk = false;
    if (typeof loadRecentBookings === 'function') {
      await loadRecentBookings();
      recentOk = true;
      console.log('\u2705 PASS: loadRecentBookings done');
    } else {
      console.log('\u274C FAIL: loadRecentBookings missing');
    }

    st.loadedAt = chartOk ? Date.now() : 0;
    st.dateKey = baseDateStr;
    st.loading = false;

    if (loadingEl) loadingEl.classList.add('d-none');

    const result = { ok: true, statsOk, chartOk, recentOk, loadedAt: st.loadedAt };
    console.log('\u2705 Dashboard loaded successfully', result);
    return result;

  } catch (err) {
    console.error('\u274C Dashboard load error:', err);

    if (!window.dashboardState || typeof window.dashboardState !== 'object') {
      window.dashboardState = { loading: false, loadedAt: 0, lastError: null };
    }

    window.dashboardState.loading = false;
    window.dashboardState.lastError = err ? (err.message || String(err)) : 'unknown';

    const loadingEl = document.getElementById('dashboardLoading');
    if (loadingEl) loadingEl.classList.add('d-none');

    if (typeof showToast === 'function') {
      showToast('Dashboard \u0E42\u0E2B\u0E25\u0E14\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08: ' + window.dashboardState.lastError, 'danger');
    }

    return { ok: false, error: window.dashboardState.lastError };
  }
}




  function animateNumber(elementId, targetNumber) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const duration = 1000;
    const startNumber = parseInt(element.textContent) || 0;
    if (startNumber === targetNumber) return;
    const increment = (targetNumber - startNumber) / (duration / 16);
    let currentNumber = startNumber;
    const timer = setInterval(() => {
      currentNumber += increment;
      if ((increment > 0 && currentNumber >= targetNumber) || (increment < 0 && currentNumber <= targetNumber)) {
        currentNumber = targetNumber;
        clearInterval(timer);
      }
      element.textContent = Math.floor(currentNumber);
    }, 16);
  }

// [ANCHOR:CLIENT.ChartLogic:REPLACE]

// --- Chart Helper Functions ---

function getDashboardChartState() {
    if (!window.dashboardChartState || typeof window.dashboardChartState !== 'object') {
        window.dashboardChartState = { loading: false, token: 0, lastError: null };
    }
    return window.dashboardChartState;
}

function isBookingChartCanvasReady(canvas) {
    if (!canvas || !canvas.isConnected) return false;
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
    const wrap = canvas.parentElement;
    const width = rect ? rect.width : canvas.clientWidth;
    const height = rect ? rect.height : canvas.clientHeight;
    return !!(wrap && width > 20 && height > 20 && getComputedStyle(wrap).display !== 'none');
}

function waitForBookingChartCanvas(canvas, maxFrames) {
    const limit = Number.isFinite(maxFrames) ? maxFrames : 12;
    return new Promise(resolve => {
        let frame = 0;
        const tick = () => {
            if (isBookingChartCanvasReady(canvas)) return resolve(true);
            frame += 1;
            if (frame >= limit) return resolve(false);
            requestAnimationFrame(tick);
        };
        tick();
    });
}

function repairBookingChartLayout(source) {
    if (!window.bookingChart || typeof window.bookingChart.resize !== 'function') {
        if (window.chartAllZero && typeof showChartEmptyState === 'function') {
            showChartEmptyState(window.lastChartMessage || 'ไม่พบข้อมูลการจองในช่วงเวลานี้');
        }
        return;
    }
    requestAnimationFrame(() => {
        try {
            window.bookingChart.resize();
            if (typeof window.bookingChart.update === 'function') window.bookingChart.update('none');
            console.log('✅ repairBookingChartLayout:', source || 'manual');
        } catch (e) {
            console.warn('⚠️ repairBookingChartLayout failed:', e);
        }
    });
}

window.repairBookingChartLayout = repairBookingChartLayout;

function getChartPeriod() {
    const el = document.getElementById('chartPeriod'); 
    // \u0E16\u0E49\u0E32\u0E2B\u0E32\u0E44\u0E21\u0E48\u0E40\u0E08\u0E2D \u0E43\u0E2B\u0E49\u0E25\u0E2D\u0E07\u0E2B\u0E32 statsPeriod \u0E40\u0E1C\u0E37\u0E48\u0E2D\u0E44\u0E27\u0E49 (\u0E01\u0E31\u0E19\u0E40\u0E2B\u0E19\u0E35\u0E22\u0E27)
    const fallback = document.getElementById('statsPeriod');
    const target = el || fallback;
    
    const v = target && target.value ? String(target.value).trim() : '';
    return (v === 'week' || v === 'month' || v === 'year') ? v : 'week';
}

function normalizeStatisticsResponse(res) {
    if (!res) return [];
    const root = (res && res.ok && res.data) ? res.data : res;
    if (Array.isArray(root)) return root;
    if (root && Array.isArray(root.chartData)) return root.chartData;
    if (root && Array.isArray(root.items)) return root.items;
    if (root && root.data) {
        if (Array.isArray(root.data.chartData)) return root.data.chartData;
        if (Array.isArray(root.data.items)) return root.data.items;
    }
    return [];
}

// --- Empty State Helpers ---
function showChartEmptyState(msg) {
    const canvas = document.getElementById('bookingChart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        // \u0E40\u0E04\u0E25\u0E35\u0E22\u0E23\u0E4C\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E02\u0E35\u0E22\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        ctx.font = "14px 'Prompt', sans-serif";
        ctx.fillStyle = "#6c757d";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(msg || "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25", canvas.width / 2, canvas.height / 2);
    }
}

function hideChartEmptyState() {
    // \u0E43\u0E19 Canvas \u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E48\u0E19\u0E19\u0E35\u0E49 \u0E01\u0E32\u0E23\u0E27\u0E32\u0E14\u0E17\u0E31\u0E1A\u0E08\u0E30\u0E40\u0E04\u0E25\u0E35\u0E22\u0E23\u0E4C\u0E02\u0E2D\u0E07\u0E40\u0E01\u0E48\u0E32\u0E40\u0E2D\u0E07 \u0E41\u0E15\u0E48\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19\u0E44\u0E27\u0E49\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E4C
    // \u0E43\u0E19 Canvas \u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E48\u0E19\u0E19\u0E35\u0E49 \u0E01\u0E32\u0E23\u0E27\u0E32\u0E14\u0E17\u0E31\u0E1A\u0E08\u0E30\u0E40\u0E04\u0E25\u0E35\u0E22\u0E23\u0E4C\u0E02\u0E2D\u0E07\u0E40\u0E01\u0E48\u0E32\u0E40\u0E2D\u0E07 \u0E41\u0E15\u0E48\u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19\u0E44\u0E27\u0E49\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E21\u0E1A\u0E39\u0E23\u0E13\u0E49
}

// --- Main Chart Functions ---
async function loadBookingChart(period) {
  const p = period || (typeof getChartPeriod === 'function' ? getChartPeriod() : 'week');
  console.log('\uD83D\uDCCA Loading Chart for Period:', p);
  const chartState = getDashboardChartState();
  const requestToken = (chartState.token || 0) + 1;
  chartState.token = requestToken;
  chartState.loading = true;
  chartState.lastError = null;

  const dateEl = document.getElementById('selectedDate');
  const baseDate = (dateEl && dateEl.value)
    ? String(dateEl.value).trim()
    : (window.currentDate ? String(window.currentDate).trim() : new Date().toISOString().slice(0, 10));

  const roomFilterEl = document.getElementById('chartRoomFilter');
  const roomId = roomFilterEl ? String(roomFilterEl.value).trim() : '';

  try {
    const canvas = document.getElementById('bookingChart');
    if (!canvas) {
      chartState.lastError = 'bookingChart canvas not found';
      console.log('\u274C FAIL loadBookingChart: bookingChart canvas not found');
      return null;
    }

    if (typeof apiCall !== 'function') {
      console.log('\u274C FAIL loadBookingChart: apiCall not found');
      if (typeof showChartEmptyState === 'function') showChartEmptyState('\u0E23\u0E30\u0E1A\u0E1A\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21 (apiCall \u0E44\u0E21\u0E48\u0E1E\u0E1A)');
      return null;
    }

    const res = await apiCall('getStatistics', { period: p, baseDate, roomId });
    if (requestToken !== chartState.token) {
      console.log('\uD83D\uDED1 loadBookingChart: stale response ignored', { period: p, baseDate, roomId });
      return null;
    }

    if (typeof normalizeStatisticsResponse !== 'function') {
      console.log('\u274C FAIL loadBookingChart: normalizeStatisticsResponse not found');
      if (typeof showChartEmptyState === 'function') showChartEmptyState('\u0E23\u0E30\u0E1A\u0E1A\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21 (normalize \u0E44\u0E21\u0E48\u0E1E\u0E1A)');
      return null;
    }

    const chartData = normalizeStatisticsResponse(res);
    const canvasReady = await waitForBookingChartCanvas(canvas, 12);
    if (!canvasReady) {
      chartState.lastError = 'bookingChart canvas not visible';
      console.warn('\u26A0\uFE0F loadBookingChart: canvas not visible yet, skip render', { period: p, baseDate });
      return null;
    }

    if (typeof renderBookingChart !== 'function') {
      console.log('\u274C FAIL loadBookingChart: renderBookingChart not found');
      if (typeof showChartEmptyState === 'function') showChartEmptyState('\u0E23\u0E30\u0E1A\u0E1A\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21 (renderBookingChart \u0E44\u0E21\u0E48\u0E1E\u0E1A)');
      return null;
    }

    renderBookingChart(p, chartData);
    console.log('\u2705 PASS loadBookingChart: rendered', { period: p, baseDate, points: Array.isArray(chartData) ? chartData.length : undefined });

    return chartData;

  } catch (e) {
    chartState.lastError = e ? (e.message || String(e)) : 'unknown';
    console.error('\u274C Chart Load Error:', e);
    if (typeof showChartEmptyState === 'function') {
      showChartEmptyState('\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25');
    }
    return null;
  } finally {
    if (requestToken === chartState.token) {
      chartState.loading = false;
    }
  }
}



// [ANCHOR:CLIENT.createEnhancedBookingChart:REPLACE]
function createEnhancedBookingChart(chartData, period) {
  const canvas = document.getElementById('bookingChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 1. \u0E17\u0E33\u0E25\u0E32\u0E22\u0E01\u0E23\u0E32\u0E1F\u0E40\u0E01\u0E48\u0E32\u0E41\u0E1A\u0E1A\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22
  if (window.bookingChart) {
    if (typeof window.bookingChart.destroy === 'function') {
      try { 
        window.bookingChart.destroy(); 
      } catch (e) { 
        console.warn('Chart destroy warning:', e); 
      }
    }
    window.bookingChart = null;
  }

  // 2. \u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 (Extract Data)
  const pickY = (item) => {
    const raw = (item && item.bookingCount != null) ? item.bookingCount : 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  };

  const labels = chartData.map(item => {
    // \u0E01\u0E23\u0E13\u0E35\u0E14\u0E39 "\u0E23\u0E32\u0E22\u0E1B\u0E35" -> \u0E41\u0E1B\u0E25\u0E07 \u0E04.\u0E28. \u0E40\u0E1B\u0E47\u0E19 \u0E1E.\u0E28.
    if (period === 'year') {
        // \u0E1E\u0E22\u0E32\u0E22\u0E32\u0E21\u0E43\u0E0A\u0E49 Label \u0E08\u0E32\u0E01 Server \u0E01\u0E48\u0E2D\u0E19 (\u0E16\u0E49\u0E32\u0E21\u0E35)
        let yearVal = parseInt(item.label || new Date(item.date).getFullYear());
        
        // \u0E16\u0E49\u0E32\u0E04\u0E48\u0E32\u0E22\u0E31\u0E07\u0E40\u0E1B\u0E47\u0E19 \u0E04.\u0E28. (\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32 2400) \u0E43\u0E2B\u0E49\u0E1A\u0E27\u0E01 543 \u0E40\u0E1B\u0E47\u0E19 \u0E1E.\u0E28.
        if (yearVal < 2400) yearVal += 543; 
        
        return '\u0E1B\u0E35 ' + yearVal; 
    }
 
    let d;
    if (typeof item.date === 'string' && item.date.includes('-')) {
        const parts = item.date.split('-');
        // \u0E2A\u0E23\u0E49\u0E32\u0E07 Date \u0E41\u0E1A\u0E1A Local (\u0E1B\u0E35, \u0E40\u0E14\u0E37\u0E2D\u0E19-1, \u0E27\u0E31\u0E19)
        d = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
        d = new Date(item.date);
    }
    
    return d.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
  });

  const dataValues = chartData.map(pickY);
  const allZero = dataValues.every(v => v === 0);

  // 3. \u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E25\u0E22 \u0E43\u0E2B\u0E49\u0E41\u0E2A\u0E14\u0E07\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E17\u0E19\u0E01\u0E23\u0E32\u0E1F
  if (allZero) {
    window.chartAllZero = true;
    window.lastChartMessage = '\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E43\u0E19\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E27\u0E25\u0E32\u0E19\u0E35\u0E49';
    if (typeof showChartEmptyState === 'function') {
      showChartEmptyState('\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07\u0E43\u0E19\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E27\u0E25\u0E32\u0E19\u0E35\u0E49');
    }
    return; 
  } else {
    window.chartAllZero = false;
    if (typeof hideChartEmptyState === 'function') hideChartEmptyState();
  }

  console.log('\uD83D\uDCC8 Rendering Chart:', { period, labels, dataValues });

  // 4. Config \u0E01\u0E23\u0E32\u0E1F (Dynamic Type & Color)
  const chartType = (period === 'year' || period === 'week') ? 'bar' : 'line'; // year and week use bar, month uses line
  const isBar = chartType === 'bar';
  
  // background color: bar uses darker, line uses lighter
  const bgColor = isBar ? 'rgba(13, 110, 253, 0.85)' : 'rgba(13, 110, 253, 0.1)';
  const borderColor = '#0d6efd';

  // 5. \u0E2A\u0E23\u0E49\u0E32\u0E07\u0E01\u0E23\u0E32\u0E1F\u0E43\u0E2B\u0E21\u0E48
  try {
    window.bookingChart = new Chart(ctx, {
      type: chartType,
      data: {
        labels: labels,
        datasets: [{
          label: '\u0E08\u0E33\u0E19\u0E27\u0E19\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07',
          data: dataValues,
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: 2,
          borderRadius: isBar ? 6 : 0, // border radius only for bar chart
          tension: 0.35,                // smooth line for line chart
          fill: !isBar,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#0d6efd',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // \uD83D\uDD25 \u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E21\u0E32\u0E01: \u0E0A\u0E48\u0E27\u0E22\u0E43\u0E2B\u0E49\u0E01\u0E23\u0E32\u0E1F\u0E22\u0E37\u0E14\u0E40\u0E15\u0E47\u0E21 Container
        plugins: { 
          legend: { display: false }, // \u0E0B\u0E48\u0E2D\u0E19 Legend \u0E40\u0E1E\u0E23\u0E32\u0E30\u0E21\u0E35\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D\u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27
          tooltip: {
            backgroundColor: 'rgba(33, 37, 41, 0.95)',
            padding: 12,
            cornerRadius: 8,
            titleFont: { family: "'Prompt', sans-serif", size: 14 },
            bodyFont: { family: "'Prompt', sans-serif", size: 13 },
            displayColors: false,
            callbacks: {
              label: function(context) {
                return '\u0E08\u0E33\u0E19\u0E27\u0E19: ' + context.parsed.y + ' \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23';
              }
            }
          }
        },
        scales: { 
          y: { 
            beginAtZero: true, 
            ticks: { 
              precision: 0, // \u0E44\u0E21\u0E48\u0E41\u0E2A\u0E14\u0E07\u0E17\u0E28\u0E19\u0E34\u0E22\u0E21
              font: { family: "'Prompt', sans-serif" }
            }, 
            grid: { borderDash: [4, 4], color: '#f0f0f0' }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Prompt', sans-serif" } }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        animation: {
          duration: 800,
          easing: 'easeOutQuart'
        }
      }
    });
    if (typeof repairBookingChartLayout === 'function') {
      repairBookingChartLayout('createEnhancedBookingChart');
      setTimeout(() => repairBookingChartLayout('createEnhancedBookingChart-delayed'), 120);
    }
  } catch (err) {
    console.error('Error creating chart instance:', err);
  }
}
// [ANCHOR:CLIENT.createEnhancedBookingChart:END]

function renderBookingChart(period, chartData) {
    const p = (period === 'week' || period === 'month' || period === 'year') ? period : 'week';
    const arr = Array.isArray(chartData) ? chartData : [];

    const canvas = document.getElementById('bookingChart');
    if (!canvas) {
        console.error('renderBookingChart: missing #bookingChart canvas');
        return;
    }

    // \u0E1B\u0E23\u0E31\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E39\u0E07 Canvas
    const wrap = canvas.parentElement;
    if (wrap) {
        // \u0E1A\u0E31\u0E07\u0E04\u0E31\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E2A\u0E39\u0E07\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E01\u0E23\u0E32\u0E1F\u0E41\u0E2A\u0E14\u0E07\u0E1C\u0E25\u0E2A\u0E27\u0E22\u0E07\u0E32\u0E21
        wrap.style.height = '300px'; 
    }

    if (!arr.length) {
        // \u0E25\u0E49\u0E32\u0E07\u0E01\u0E23\u0E32\u0E1F\u0E40\u0E01\u0E48\u0E32\u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E21\u0E48
        if (window.bookingChart) {
            if (typeof window.bookingChart.destroy === 'function') window.bookingChart.destroy();
            window.bookingChart = null;
        }
        window.chartAllZero = true;
        window.lastChartMessage = '\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25';
        showChartEmptyState('\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25');
        return;
    }

    createEnhancedBookingChart(arr, p);
}

function updateChart(period) {
  const p = period || (typeof getChartPeriod === 'function' ? getChartPeriod() : 'week');
  console.log('\uD83D\uDCCA updateChart ->', p);
  if (typeof loadBookingChart === 'function') {
    loadBookingChart(p);
  } else {
    console.log('\u274C FAIL updateChart: loadBookingChart not found');
  }
}


async function loadRecentBookings() {
  try {
    console.log('\uD83E\uDDFE Loading recent bookings...');

    if (typeof apiCall !== 'function') {
      console.log('\u274C FAIL loadRecentBookings: apiCall not found');
      return { ok: false, error: 'apiCall not found' };
    }

    const res = await apiCall('getBookings');
    const bookings = (res && res.data && Array.isArray(res.data.bookings)) ? res.data.bookings : [];

    if (typeof renderRecentBookings === 'function') {
      renderRecentBookings(bookings);
      console.log('\u2705 PASS loadRecentBookings: rendered', { count: bookings.length });
    } else {
      console.log('\u274C FAIL loadRecentBookings: renderRecentBookings not found');
    }

    return { ok: true, count: bookings.length };

  } catch (e) {
    console.error('\u274C loadRecentBookings Error:', e);
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}


function renderRecentBookings(bookings) {
  const list = document.getElementById('recentBookingsList');
  const pagination = document.getElementById('recentPagination');
  if (!list) return;

  const safeText = (v) => {
    const s = (typeof sanitizeText === 'function') ? sanitizeText(v) : String(v == null ? '' : v);
    return String(s).trim();
  };

  const safeStatus = (v) => String(v == null ? '' : v).trim();

  const isValidBookingId = (v) => String(v || '').trim().length > 0;

  const parseDateAny = (v) => {
    if (!v) return null;
    if (v instanceof Date && !isNaN(v.getTime())) return v;

    if (typeof parseFlexibleDateFrontend === 'function') {
      const d = parseFlexibleDateFrontend(v);
      if (d && !isNaN(d.getTime())) return d;
    }

    const d2 = new Date(v);
    if (d2 && !isNaN(d2.getTime())) return d2;

    return null;
  };

  const timeToHm = (t) => {
    if (t == null || t === '') return null;

    if (t instanceof Date && !isNaN(t.getTime())) {
      return { hh: t.getHours(), mm: t.getMinutes() };
    }

    const s = String(t).trim();
    const m = s.match(/^(\d{1,2})[:.](\d{2})$/);
    if (m) {
      const hh = Number(m[1]);
      const mm = Number(m[2]);
      if (!isNaN(hh) && !isNaN(mm)) return { hh, mm };
    }

    const d = new Date(s);
    if (!isNaN(d.getTime())) return { hh: d.getHours(), mm: d.getMinutes() };

    return null;
  };

  const formatTimeForUi = (t) => {
    if (typeof formatTimeFromSheet === 'function') {
      const out = formatTimeFromSheet(t);
      const s = String(out || '').trim();
      if (s) return s;
    }

    if (t instanceof Date && !isNaN(t.getTime())) {
      const hh = String(t.getHours()).padStart(2, '0');
      const mm = String(t.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }

    const s = String(t || '').trim();
    const m = s.match(/^(\d{1,2})[:.](\d{2})$/);
    if (m) return `${String(m[1]).padStart(2, '0')}:${m[2]}`;
    return s || '-';
  };

  const msFromBookingId = (bookingId) => {
    const s = String(bookingId || '').trim();
    const m = s.match(/^BK-(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (!m) return 0;

    const yyyy = Number(m[1]);
    const MM = Number(m[2]);
    const dd = Number(m[3]);
    const hh = Number(m[4]);
    const mm = Number(m[5]);
    const ss = Number(m[6]);

    if ([yyyy, MM, dd, hh, mm, ss].some(n => isNaN(n))) return 0;
    return new Date(yyyy, MM - 1, dd, hh, mm, ss).getTime();
  };

  const scoreMs = (b) => {
    const dTs = parseDateAny(b && b.Timestamp);
    if (dTs) return dTs.getTime();

    const dBd = parseDateAny(b && b.BookingDate);
    const hm = timeToHm(b && b.StartTime);
    if (dBd) {
      const base = new Date(dBd.getTime());
      base.setHours(0, 0, 0, 0);
      if (hm) base.setHours(hm.hh, hm.mm, 0, 0);
      return base.getTime();
    }

    return msFromBookingId(b && b.BookingID);
  };

  let items = Array.isArray(bookings) ? bookings.slice() : [];

  const okSet = new Set([
    '\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34', '\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34', '\u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34', '\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01',
    'pending', 'approved', 'approve', 'reject', 'rejected', 'cancel', 'cancelled'
  ]);

  items = items.filter(b => {
    if (!b) return false;
    if (!isValidBookingId(b.BookingID)) return false;
    const stLower = safeStatus(b.Status).toLowerCase();
    const stRaw = safeStatus(b.Status);
    return okSet.has(stLower) || okSet.has(stRaw);
  });

  // Group by BookingID for multi-day booking
  const groups = {};
  items.forEach(b => {
    const bid = String(b.BookingID || '').trim();
    if (!groups[bid]) {
      groups[bid] = {
        ...b,
        _allRows: [b]
      };
    } else {
      groups[bid]._allRows.push(b);
    }
  });

  items = Object.values(groups).map(g => {
    const dates = g._allRows.map(r => r.BookingDate).filter(Boolean);
    const uniqueDates = Array.from(new Set(dates));
    
    uniqueDates.sort((a, b) => {
      const dA = parseDateAny(a);
      const dB = parseDateAny(b);
      if (!dA) return 1;
      if (!dB) return -1;
      return dA.getTime() - dB.getTime();
    });

    g.bookingDatesList = uniqueDates;

    let isConsecutive = true;
    if (uniqueDates.length > 1) {
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = parseDateAny(uniqueDates[i - 1]);
        const currDate = parseDateAny(uniqueDates[i]);
        if (prevDate && currDate) {
          const prevMs = new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate()).getTime();
          const currMs = new Date(currDate.getFullYear(), currDate.getMonth(), currDate.getDate()).getTime();
          const diffDays = Math.round((currMs - prevMs) / (1000 * 60 * 60 * 24));
          if (diffDays !== 1) {
            isConsecutive = false;
            break;
          }
        } else {
          isConsecutive = false;
          break;
        }
      }
    } else {
      isConsecutive = false;
    }

    if (uniqueDates.length > 1) {
      const formattedDates = uniqueDates.map(d => {
        return (typeof formatDateBE === 'function') ? formatDateBE(d) : String(d);
      });
      if (isConsecutive) {
        g.formattedGroupDate = `${formattedDates[0]} - ${formattedDates[formattedDates.length - 1]}`;
      } else {
        g.formattedGroupDate = formattedDates.join(', ');
      }
    } else if (uniqueDates.length === 1) {
      g.formattedGroupDate = (typeof formatDateBE === 'function') ? formatDateBE(uniqueDates[0]) : String(uniqueDates[0]);
    } else {
      g.formattedGroupDate = '-';
    }

    return g;
  });

  items.sort((a, b) => scoreMs(b) - scoreMs(a));

  window.allRecentBookings = items;
  window.currentRecentPage = 1;

  if (!items.length) {
    list.innerHTML =
      `<div class="text-center py-5 text-muted opacity-50">
        <i class="fas fa-clipboard-list fa-2x mb-2"></i>
        <p class="small mb-0">\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07</p>
      </div>`;
    if (pagination) pagination.classList.add('d-none');
    return;
  }

  if (typeof renderRecentBookingsPage === 'function') {
    renderRecentBookingsPage();
    return;
  }

  const session = window.currentSession || {};
  const isAdmin = ['admin', 'superadmin'].includes(String(session.role || '').toLowerCase());

  list.innerHTML = items.slice(0, 6).map(b => {
    const id = safeText(b.BookingID);
    const room = safeText(b.RoomID || b.RoomName || '\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E2B\u0E49\u0E2D\u0E07');
    const title = safeText(b.Purpose || b.SubjectName || '\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07');

    const rawStatus = safeStatus(b.Status || '\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34');
    const rawLower = String(rawStatus).toLowerCase();

    const badge = (typeof getStatusBadge === 'function')
      ? getStatusBadge(rawStatus)
      : `<span class="badge bg-light text-secondary border">${safeText(rawStatus)}</span>`;

    const dateText = b.formattedGroupDate || (b.BookingDate
      ? (typeof formatDateBE === 'function' ? formatDateBE(b.BookingDate) : safeText(b.BookingDate))
      : '-');

    const startText = formatTimeForUi(b.StartTime);
    const endText = formatTimeForUi(b.EndTime);

    let actionButtons = '';
    if (isAdmin && (rawStatus === '\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34' || rawLower === 'pending')) {
      actionButtons = `
        <div class="mt-2 mt-md-0 ms-md-3 d-flex gap-2 justify-content-end">
          <button class="btn btn-sm btn-outline-success rounded-pill px-3"
                  onclick="event.stopPropagation(); performBookingAction('approve','${id}')">
            <i class="fas fa-check me-1"></i>\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34
          </button>
          <button class="btn btn-sm btn-outline-danger rounded-pill px-3"
                  onclick="event.stopPropagation(); performBookingAction('reject','${id}')">
            <i class="fas fa-times me-1"></i>\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18
          </button>
        </div>
      `;
    }

    return `
      <div class="recent-item p-3 border-bottom position-relative hover-bg-light transition-all"
           data-booking-id="${id}" onclick="openBookingDetail('${id}')" onkeydown="handleActivateKeydown(event, 'openBookingDetail', '${id}')" role="button" tabindex="0">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
          <div class="me-2 overflow-hidden mb-2 mb-md-0">
            <div class="d-flex align-items-center mb-1">
              <span class="fw-bold text-dark text-truncate me-2" style="font-size: 0.95rem;">${title}</span>
              <span class="badge bg-light text-secondary border rounded-pill" style="font-size: 0.7rem;">
                ${safeText(b.BookerName || '')}
              </span>
            </div>
            <div class="text-muted small d-flex align-items-center text-truncate flex-wrap">
              <span class="me-3"><i class="fas fa-door-open me-1 text-primary opacity-75"></i>${room}</span>
              <span><i class="fas fa-calendar-alt me-1 text-secondary opacity-75"></i>${safeText(dateText)}</span>
              <span class="mx-2 d-none d-md-inline opacity-25">|</span>
              <span class="d-none d-md-inline text-truncate" style="max-width: 150px;">
                <i class="fas fa-clock me-1 text-muted opacity-75"></i>${safeText(startText)} - ${safeText(endText)}
              </span>
            </div>
          </div>

          <div class="d-flex flex-column align-items-end flex-shrink-0">
            <div class="mb-1">${badge}</div>
            ${actionButtons}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderRecentBookingsPage() {
  const list = document.getElementById('recentBookingsList');
  const pagination = document.getElementById('recentPagination');
  const label = document.getElementById('recentPageLabel');
  const btnPrev = document.getElementById('btnPrevRecent');
  const btnNext = document.getElementById('btnNextRecent');

  if (!list) return;

  const all = window.allRecentBookings;

  if (!Array.isArray(all) || all.length === 0) {
    list.innerHTML = `<div class="text-center py-5 text-muted opacity-50"><i class="fas fa-clipboard-list fa-2x mb-2"></i><p class="small mb-0">\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07</p></div>`;
    if (pagination) pagination.classList.add('d-none');
    return;
  }

  const perPage = (typeof RECENT_ITEMS_PER_PAGE === 'number' && RECENT_ITEMS_PER_PAGE > 0) ? RECENT_ITEMS_PER_PAGE : 6;

  let totalPages = Math.ceil(all.length / perPage);
  if (totalPages < 1) totalPages = 1;

  if (typeof window.currentRecentPage !== 'number') window.currentRecentPage = 1;
  if (window.currentRecentPage > totalPages) window.currentRecentPage = totalPages;
  if (window.currentRecentPage < 1) window.currentRecentPage = 1;

  const startIdx = (window.currentRecentPage - 1) * perPage;
  const endIdx = startIdx + perPage;
  const pageItems = all.slice(startIdx, endIdx);

  const session = window.currentSession || {};
  const isAdmin = ['admin', 'superadmin'].includes(String(session.role || '').toLowerCase());

  list.innerHTML = pageItems.map(b => {
    const id = (typeof sanitizeText === 'function') ? sanitizeText(b.BookingID) : String(b.BookingID || '');
    const room = (typeof sanitizeText === 'function') ? sanitizeText(b.RoomID || '\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E2B\u0E49\u0E2D\u0E07') : String(b.RoomID || '\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E2B\u0E49\u0E2D\u0E07');
    const title = (typeof sanitizeText === 'function') ? sanitizeText(b.Purpose || b.SubjectName || '\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07') : String(b.Purpose || b.SubjectName || '\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07');

    const rawStatus = String(b.Status || '\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34').trim();
    const rawLower = rawStatus.toLowerCase();

    const badge = (typeof getStatusBadge === 'function') ? getStatusBadge(rawStatus) : `<span class="badge bg-light text-secondary border">${rawStatus}</span>`;
    const dateText = b.formattedGroupDate || (b.BookingDate ? (typeof formatDateBE === 'function' ? formatDateBE(b.BookingDate) : String(b.BookingDate)) : '-');

    let actionButtons = '';
    if (isAdmin && (rawStatus === '\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34' || rawLower === 'pending')) {
      actionButtons = `
        <div class="mt-2 mt-md-0 ms-md-3 d-flex gap-2 justify-content-end">
          <button class="btn btn-sm btn-outline-success rounded-pill px-3"
                  onclick="event.stopPropagation(); performBookingAction('approve','${id}')"
                  title="\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34">
            <i class="fas fa-check me-1"></i>\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34
          </button>
          <button class="btn btn-sm btn-outline-danger rounded-pill px-3"
                  onclick="event.stopPropagation(); performBookingAction('reject','${id}')"
                  title="\u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34">
            <i class="fas fa-times me-1"></i>\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18
          </button>
        </div>
      `;
    }

    return `
      <div class="recent-item p-3 border-bottom position-relative hover-bg-light transition-all"
           data-booking-id="${id}" onclick="openBookingDetail('${id}')" onkeydown="handleActivateKeydown(event, 'openBookingDetail', '${id}')" role="button" tabindex="0">
        <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
          <div class="me-2 overflow-hidden mb-2 mb-md-0">
            <div class="d-flex align-items-center mb-1">
              <span class="fw-bold text-dark text-truncate me-2" style="font-size: 0.95rem;">${title}</span>
              <span class="badge bg-light text-secondary border rounded-pill" style="font-size: 0.7rem;">${(typeof sanitizeText === 'function') ? sanitizeText(b.BookerName) : (b.BookerName || '')}</span>
            </div>
            <div class="text-muted small d-flex align-items-center text-truncate flex-wrap">
              <span class="me-3"><i class="fas fa-door-open me-1 text-primary opacity-75"></i>${room}</span>
              <span><i class="fas fa-calendar-alt me-1 text-secondary opacity-75"></i>${dateText}</span>
              <span class="mx-2 d-none d-md-inline opacity-25">|</span>
              <span class="d-none d-md-inline text-truncate" style="max-width: 150px;">
                <i class="fas fa-clock me-1 text-muted opacity-75"></i>${b.StartTime || '-'} - ${b.EndTime || '-'}
              </span>
            </div>
          </div>

          <div class="d-flex flex-column align-items-end flex-shrink-0">
            <div class="mb-1">${badge}</div>
            ${actionButtons}
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (pagination) {
    pagination.classList.remove('d-none');
    if (label) label.textContent = `\u0E2B\u0E19\u0E49\u0E32 ${window.currentRecentPage} / ${totalPages}`;
    if (btnPrev) btnPrev.disabled = (window.currentRecentPage === 1);
    if (btnNext) btnNext.disabled = (window.currentRecentPage === totalPages);
  }
}


function showLoading(isLoading, message = '\u0E01\u0E33\u0E25\u0E31\u0E07\u0E1B\u0E23\u0E30\u0E21\u0E27\u0E25\u0E1C\u0E25...') {
  // 1. \u0E25\u0E2D\u0E07\u0E2B\u0E32 Element \u0E40\u0E14\u0E34\u0E21\u0E01\u0E48\u0E2D\u0E19
  let overlay = document.getElementById('berryLoadingOverlay');
  
  // 2. \u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E21\u0E35 \u0E43\u0E2B\u0E49\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E43\u0E2B\u0E21\u0E48 (Dynamic Creation)
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'berryLoadingOverlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background-color: rgba(255, 255, 255, 0.85); z-index: 10000;
      display: none; align-items: center; justify-content: center; flex-direction: column;
      backdrop-filter: blur(2px); transition: opacity 0.3s;
    `;
    overlay.innerHTML = `
      <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div id="berryLoadingMessage" class="mt-3 fw-bold text-dark fs-5 animate-pulse"></div>
      <style>.animate-pulse { animation: pulse 1.5s infinite; } @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }</style>
    `;
    document.body.appendChild(overlay);
  }

  // 3. \u0E04\u0E27\u0E1A\u0E04\u0E38\u0E21\u0E01\u0E32\u0E23\u0E41\u0E2A\u0E14\u0E07\u0E1C\u0E25
  const msgEl = document.getElementById('berryLoadingMessage');
  if (msgEl) msgEl.innerText = message;

  if (isLoading) {
    overlay.style.display = 'flex';
    // \u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19\u0E01\u0E32\u0E23\u0E01\u0E14\u0E0B\u0E49\u0E33
    document.body.style.pointerEvents = 'none'; 
  } else {
    overlay.style.display = 'none';
    document.body.style.pointerEvents = 'auto';
  }
}

function showToast(title, message, type = 'info') {
  const toastEl = document.getElementById('notificationToast');
  if (!toastEl) {
    console.warn('\u26A0\uFE0F \u0E44\u0E21\u0E48\u0E1E\u0E1A Element #notificationToast \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E41\u0E2A\u0E14\u0E07\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19');
    alert(title + ': ' + message); // Fallback
    return;
  }

  // Map \u0E2A\u0E35\u0E41\u0E25\u0E30\u0E44\u0E2D\u0E04\u0E2D\u0E19
  const config = {
    success: { icon: 'fa-check-circle', color: 'text-success' },
    danger:  { icon: 'fa-times-circle', color: 'text-danger' },
    warning: { icon: 'fa-exclamation-triangle', color: 'text-warning' },
    info:    { icon: 'fa-info-circle', color: 'text-primary' }
  };
  const theme = config[type] || config.info;

  // \u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E2B\u0E32
  const toastTitle = document.getElementById('toastTitle');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');

  if (toastTitle) toastTitle.textContent = title;
  if (toastMessage) toastMessage.textContent = message;
  if (toastIcon) {
    toastIcon.className = `fas ${theme.icon} fa-lg ${theme.color}`;
  }

  // \u0E41\u0E2A\u0E14\u0E07\u0E1C\u0E25\u0E14\u0E49\u0E27\u0E22 Bootstrap Toast
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}

function confirmAdminAction(bookingId, action, remark = '') {
  console.log('Admin Action:', { bookingId, action, remark });

  if (!bookingId) {
    showToast('\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14', '\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E23\u0E2B\u0E31\u0E2A\u0E01\u0E32\u0E23\u0E08\u0E2D\u0E07', 'danger');
    return;
  }

  showLoading(true, '\u0E01\u0E33\u0E25\u0E31\u0E07\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25...');

  // \u0E40\u0E15\u0E23\u0E35\u0E22\u0E21\u0E0A\u0E37\u0E48\u0E2D Admin
  let adminName = 'Admin'; 
  if (typeof currentSession !== 'undefined' && currentSession) {
    adminName = currentSession.user || currentSession.name || currentSession.email || 'Admin';
  }

  const payload = {
    bookingId: String(bookingId),
    action: action,
    remark: remark,
    adminName: adminName 
  };

  google.script.run
    .withSuccessHandler(function(response) {
      showLoading(false); // \u0E1B\u0E34\u0E14 Loading
      
      if (response && response.ok) {
        showToast('\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08', response.message, 'success');
        
        // ==================================================
        // \uD83E\uDDE8 START: FORCE CLOSE MODAL (\u0E17\u0E48\u0E32\u0E44\u0E21\u0E49\u0E15\u0E32\u0E22)
        // ==================================================
        
        const modalEl = document.getElementById('bookingDetailsModal');
        
        // 1. \u0E25\u0E2D\u0E07\u0E2A\u0E31\u0E48\u0E07\u0E1B\u0E34\u0E14\u0E14\u0E35\u0E46 \u0E01\u0E48\u0E2D\u0E19 (\u0E40\u0E1C\u0E37\u0E48\u0E2D\u0E1F\u0E25\u0E38\u0E4A\u0E04)
        if (modalEl) {
          if (modalEl.contains(document.activeElement)) {
            try { document.activeElement.blur(); } catch(e) {}
          }
          const btnClose = modalEl.querySelector('[data-bs-dismiss="modal"]');
          if(btnClose) btnClose.click(); // \u0E25\u0E2D\u0E07\u0E01\u0E14\u0E1B\u0E38\u0E48\u0E21\u0E1B\u0E34\u0E14\u0E08\u0E33\u0E25\u0E2D\u0E07
          
          try {
             // \u0E16\u0E49\u0E32\u0E21\u0E35 Instance \u0E04\u0E49\u0E32\u0E07\u0E2D\u0E22\u0E39\u0E48 \u0E43\u0E2B\u0E49\u0E2A\u0E31\u0E48\u0E07 hide
             var modalInstance = bootstrap.Modal.getInstance(modalEl);
             if (modalInstance) modalInstance.hide();
          } catch(e) { console.log('Instance not found, skipping standard hide'); }
        }

        // 2. \u0E2A\u0E31\u0E48\u0E07\u0E25\u0E1A\u0E41\u0E1A\u0E1A Hardcore (\u0E44\u0E21\u0E48\u0E2A\u0E19 API \u0E41\u0E25\u0E49\u0E27)
        // \u0E23\u0E2D\u0E40\u0E2A\u0E35\u0E49\u0E22\u0E27\u0E27\u0E34\u0E19\u0E32\u0E17\u0E35\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49 Animation \u0E08\u0E1A\u0E01\u0E48\u0E2D\u0E19\u0E04\u0E48\u0E2D\u0E22\u0E23\u0E37\u0E49\u0E2D
        setTimeout(() => {
          if (modalEl) {
            modalEl.classList.remove('show');           // \u0E25\u0E1A\u0E04\u0E25\u0E32\u0E2A\u0E41\u0E2A\u0E14\u0E07\u0E1C\u0E25
            modalEl.style.display = 'none';             // \u0E0B\u0E48\u0E2D\u0E19\u0E17\u0E31\u0E19\u0E17\u0E35
            modalEl.setAttribute('aria-hidden', 'true'); // \u0E1A\u0E2D\u0E01 Accessibility \u0E27\u0E48\u0E32\u0E1B\u0E34\u0E14\u0E41\u0E25\u0E49\u0E27
            modalEl.removeAttribute('role');
            modalEl.removeAttribute('aria-modal');
          }

          // 3. \u0E01\u0E27\u0E32\u0E14\u0E25\u0E49\u0E32\u0E07\u0E09\u0E32\u0E01\u0E2B\u0E25\u0E31\u0E07\u0E2A\u0E35\u0E40\u0E17\u0E32 (Backdrop) \u0E43\u0E2B\u0E49\u0E40\u0E01\u0E25\u0E35\u0E49\u0E22\u0E07
          const backdrops = document.querySelectorAll('.modal-backdrop');
          backdrops.forEach(bd => bd.remove()); // \u0E25\u0E1A\u0E17\u0E34\u0E49\u0E07\u0E08\u0E32\u0E01 DOM \u0E40\u0E25\u0E22

          // 4. \u0E04\u0E37\u0E19\u0E04\u0E48\u0E32 Body \u0E43\u0E2B\u0E49\u0E40\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E14\u0E49 (\u0E41\u0E01\u0E49\u0E1B\u0E31\u0E0D\u0E2B\u0E32\u0E08\u0E2D\u0E25\u0E47\u0E2D\u0E01)
          document.body.classList.remove('modal-open');
          document.body.style.overflow = 'auto'; // \u0E1A\u0E31\u0E07\u0E04\u0E31\u0E1A\u0E43\u0E2B\u0E49 Scroll \u0E44\u0E14\u0E49
          document.body.style.paddingRight = '';
          
          console.log('\uD83E\uDDF9 Cleanup Modal Completed');
        }, 100); 
        // ==================================================
        // \uD83E\uDDE8 END: FORCE CLOSE
        // ==================================================

        // \u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A\u0E15\u0E32\u0E23\u0E32\u0E07
        if (typeof refreshAfterAction === 'function') {
           refreshAfterAction();
        }

      } else {
        showToast('\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19', response.message || '\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14', 'warning');
      }
    })
    .withFailureHandler(function(err) {
      showLoading(false);
      showToast('\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E23\u0E30\u0E1A\u0E1A', err.message, 'danger');
    })
    .processBookingAction(payload);
}

function changeRecentPage(delta) {
  const all = Array.isArray(window.allRecentBookings) ? window.allRecentBookings : [];
  const perPage = (typeof RECENT_ITEMS_PER_PAGE === 'number' && RECENT_ITEMS_PER_PAGE > 0)
    ? RECENT_ITEMS_PER_PAGE
    : 6;

  const totalPages = Math.max(1, Math.ceil(all.length / perPage));
  const cur = (typeof window.currentRecentPage === 'number') ? window.currentRecentPage : 1;
  const newPage = cur + delta;

  if (newPage >= 1 && newPage <= totalPages) {
    window.currentRecentPage = newPage;
    if (typeof renderRecentBookingsPage === 'function') {
      renderRecentBookingsPage();
    }
  }
}

async function refreshRecentBookings() {
  const icon = document.getElementById('refreshIcon');
  try {
    if (icon) icon.classList.add('fa-spin');
    if (typeof loadRecentBookings === 'function') {
      await loadRecentBookings();
    }
  } catch (e) {
    console.error('\u274C refreshRecentBookings error:', e);
  } finally {
    if (icon) setTimeout(() => icon.classList.remove('fa-spin'), 300);
  }
}

async function updateBookingRemarkClient(bookingId, remark) {
  try {
    const res = await callServer('updateBookingRemark', { bookingId, remark: String(remark || '') }, 20000);
    if (!res || !res.ok) throw new Error(res && res.error ? res.error : '\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08');
    showNotification && showNotification('\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38\u0E41\u0E25\u0E49\u0E27', 'success');
    // \u0E42\u0E2B\u0E25\u0E14\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E43\u0E2B\u0E21\u0E48\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E43\u0E19\u0E42\u0E21\u0E14\u0E2D\u0E25
    await openBookingDetail(bookingId);
  } catch (err) {
    console.error('updateBookingRemarkClient error:', err);
    showNotification && showNotification(err.message || '\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E2B\u0E21\u0E32\u0E22\u0E40\u0E2B\u0E15\u0E38\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08', 'error');
  }
}
// ANCHOR: CLIENT.actions.approveRejectCancel:END


// ANCHOR: CLIENT.utils.refreshAfterAction:START
/** refresh \u0E15\u0E32\u0E23\u0E32\u0E07 + \u0E42\u0E2B\u0E25\u0E14\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22\u0E2B\u0E25\u0E31\u0E07 action */
async function refreshAfterAction(bookingId) {
  try {
    // refresh \u0E15\u0E32\u0E23\u0E32\u0E07\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E2B\u0E49\u0E2D\u0E07/\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19 (\u0E2A\u0E21\u0E21\u0E15\u0E34\u0E27\u0E48\u0E32\u0E21\u0E35\u0E15\u0E31\u0E27\u0E41\u0E1B\u0E23 currentRoom/currentDate)
    if (window.currentRoom && window.currentDate) {
      const res = await callServer('getRoomSchedule', { roomId: window.currentRoom, dateISO: window.currentDate }, 20000);
      if (res && res.ok && res.data) {
        renderTimetable && renderTimetable(res.data.slots || []);
      }
    }
    // refresh \u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E43\u0E19\u0E42\u0E21\u0E14\u0E2D\u0E25
    await openBookingDetail(bookingId);
  } catch (e) {
    console.warn('refreshAfterAction warning:', e);
  }
}

function handleRecentBookingClick(event) {
  const item = event.target.closest('.recent-item');
  if (item && item.dataset.bookingId) {
    openBookingDetail(item.dataset.bookingId);
  }
}

  

  function initializeTheme() {
    applyTheme('light');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
  }

  function toggleTheme() {
    // Disabled
  }

// ============================================
// \u2705 PDF REPORT FEATURES (Client Side)
// ============================================

window.openReportModal = function() {
    const modalEl = document.getElementById('reportModal');
    if (!modalEl) return;

    // 1. \u0E2A\u0E23\u0E49\u0E32\u0E07 Dropdown \u0E40\u0E14\u0E37\u0E2D\u0E19 (\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22)
    const mSelect = document.getElementById('reportMonth');
    const thaiMonths = ['\u0E21\u0E01\u0E23\u0E32\u0E04\u0E21','\u0E01\u0E38\u0E21\u0E20\u0E32\u0E1E\u0E31\u0E19\u0E18\u0E4C','\u0E21\u0E35\u0E19\u0E32\u0E04\u0E21','\u0E40\u0E21\u0E29\u0E32\u0E22\u0E19','\u0E1E\u0E24\u0E29\u0E20\u0E32\u0E04\u0E21','\u0E21\u0E34\u0E16\u0E38\u0E19\u0E32\u0E22\u0E19','\u0E01\u0E23\u0E01\u0E0E\u0E32\u0E04\u0E21','\u0E2A\u0E34\u0E07\u0E2B\u0E32\u0E04\u0E21','\u0E01\u0E31\u0E19\u0E22\u0E32\u0E22\u0E19','\u0E15\u0E38\u0E25\u0E32\u0E04\u0E21','\u0E1E\u0E24\u0E28\u0E08\u0E34\u0E01\u0E32\u0E22\u0E19','\u0E18\u0E31\u0E19\u0E27\u0E32\u0E04\u0E21'];
    
    if (mSelect && mSelect.options.length === 0) {
        thaiMonths.forEach((m, i) => {
            const opt = document.createElement('option');
            opt.value = i + 1;
            opt.text = m;
            mSelect.appendChild(opt);
        });
    }

    // 2. \u0E2A\u0E23\u0E49\u0E32\u0E07 Dropdown \u0E1B\u0E35 (\u0E1E.\u0E28.) - \u0E22\u0E49\u0E2D\u0E19\u0E2B\u0E25\u0E31\u0E07 2 \u0E1B\u0E35 \u0E16\u0E36\u0E07\u0E1B\u0E35\u0E2B\u0E19\u0E49\u0E32
    const ySelect = document.getElementById('reportYear');
    if (ySelect && ySelect.options.length === 0) {
        const currYear = new Date().getFullYear();
        for (let y = currYear - 2; y <= currYear + 1; y++) {
            const opt = document.createElement('option');
            opt.value = y; // \u0E2A\u0E48\u0E07\u0E04\u0E48\u0E32 \u0E04.\u0E28. \u0E44\u0E1B Server
            opt.text = `\u0E1E.\u0E28. ${y + 543}`;
            ySelect.appendChild(opt);
        }
    }

    // 3. \u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32 Default \u0E40\u0E1B\u0E47\u0E19\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19
    const now = new Date();
    if (mSelect) mSelect.value = now.getMonth() + 1;
    if (ySelect) ySelect.value = now.getFullYear();

    // 4. \u0E40\u0E1B\u0E34\u0E14 Modal
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
};

window.confirmDownloadReport = async function() {
    const mSelect = document.getElementById('reportMonth');
    const ySelect = document.getElementById('reportYear');
    const btn = document.querySelector('#reportModal .btn-danger');
    
    if (!mSelect || !ySelect) return;

    const month = parseInt(mSelect.value);
    const year = parseInt(ySelect.value);
    const monthName = mSelect.options[mSelect.selectedIndex].text;
    const yearTh = ySelect.options[ySelect.selectedIndex].text;

    // UI Loading State
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> \u0E01\u0E33\u0E25\u0E31\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07 PDF...';

    try {
        // \u0E43\u0E0A\u0E49 Overlay Loading \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E0A\u0E31\u0E14\u0E40\u0E08\u0E19
        if(typeof showLoading === 'function') showLoading(true, '\u0E01\u0E33\u0E25\u0E31\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E23\u0E32\u0E22\u0E07\u0E32\u0E19 PDF...');
        
        // Call Server
        const res = await apiCall('generatePdfReport', { month, year });
        
        if (res.ok && res.data) {
            // Convert Base64 to Blob & Download
            const byteCharacters = atob(res.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `\u0E23\u0E32\u0E22\u0E07\u0E32\u0E19\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E2B\u0E49\u0E2D\u0E07_${year}-${String(month).padStart(2,'0')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            if(typeof showNotification === 'function') {
                showNotification('\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08', '\u0E14\u0E32\u0E27\u0E19\u0E4C\u0E42\u0E2B\u0E25\u0E14\u0E23\u0E32\u0E22\u0E07\u0E32\u0E19\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27', 'success');
            }
            
            // \u0E1B\u0E34\u0E14 Modal
            const modalEl = document.getElementById('reportModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        } else {
            throw new Error(res.error || '\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E44\u0E1F\u0E25\u0E4C\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08');
        }

    } catch (e) {
        console.error('Report Error:', e);
        alert('\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14: ' + e.message);
    } finally {
        if(typeof showLoading === 'function') showLoading(false);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
};


/* =========================================
   7. DEBUG & DIAGNOSTICS TOOL (Enhanced Version)
   ========================================= */
window.runFullSystemTest = async function () {
  // \u2705 Prevent double-run
  if (window.__berrySystemTestRunning) {
    console.warn('\u26A0\uFE0F System test already running.');
    return;
  }
  window.__berrySystemTestRunning = true;

  console.clear();
  console.log('%c\uD83D\uDE80 STARTING FULL SYSTEM TEST (REAL DB + ONE SERVER TEST)...', 'color:white; background:#0d6efd; padding:4px; font-weight:bold;');

  const reportId = 'system-test-modal';
  let modalEl = document.getElementById(reportId);

  // ===== UI Logger =====
  const logUI = (msg, type = 'info') => {
    const box = document.getElementById('test-log-box');
    if (!box) return;

    let icon = '\uD83D\uDD39';
    let cls = 'text-light';
    if (type === 'success') { icon = '\u2705'; cls = 'text-success fw-bold'; }
    if (type === 'error') { icon = '\u274C'; cls = 'text-danger fw-bold'; }
    if (type === 'warn') { icon = '\u26A0\uFE0F'; cls = 'text-warning fw-bold'; }

    const div = document.createElement('div');
    div.className = `mb-1 small ${cls} border-bottom border-secondary pb-1`;
    div.style.borderColor = 'rgba(255,255,255,0.1) !important';
    div.innerHTML = `${icon} ${escapeHtml(String(msg))}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  };

  const pass = (m, extra) => { logUI(m, 'success'); if (extra) console.log('\u2705', m, extra); };
  const fail = (m, extra) => { logUI(m, 'error'); if (extra) console.error('\u274C', m, extra); };
  const warn = (m, extra) => { logUI(m, 'warn'); if (extra) console.warn('\u26A0\uFE0F', m, extra); };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const escapeHtml = (s) => {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  };

  // ===== Create modal if missing =====
  if (!modalEl) {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="modal fade" id="${reportId}" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <div class="modal-content shadow-lg border-0 rounded-4 overflow-hidden">
            <div class="modal-header bg-dark text-white border-bottom border-secondary">
              <h5 class="modal-title fs-6">
                <i class="fas fa-microchip me-2 text-warning"></i>System Diagnostics
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-0 bg-dark">
              <div class="px-3 pt-3 pb-2 border-bottom border-secondary">
                <div id="test-status-banner" class="small text-light">
                  \u23F3 Preparing...
                </div>
              </div>
              <div id="test-log-box" class="p-3 font-monospace"
                   style="height: 420px; overflow-y: auto; font-size: 0.82rem; background-color: #1e1e1e; color: #d4d4d4;"></div>
            </div>
            <div class="modal-footer bg-dark border-top border-secondary">
              <button class="btn btn-outline-light btn-sm rounded-pill px-3" id="btn-copy-logs">
                <i class="fas fa-copy me-1"></i> Copy Logs
              </button>
              <button class="btn btn-primary btn-sm rounded-pill px-3" id="btn-rerun-test">
                <i class="fas fa-sync-alt me-1"></i> Rerun
              </button>
              <button class="btn btn-secondary btn-sm rounded-pill px-3" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div.firstElementChild);
    modalEl = document.getElementById(reportId);

    // Copy logs
    document.getElementById('btn-copy-logs').onclick = async function () {
      try {
        await navigator.clipboard.writeText(document.getElementById('test-log-box').innerText);
        this.innerHTML = '\u2705 Copied!';
        setTimeout(() => this.innerHTML = '<i class="fas fa-copy me-1"></i> Copy Logs', 2000);
      } catch (e) {
        alert(e);
      }
    };

    // Rerun
    document.getElementById('btn-rerun-test').onclick = function () {
      window.runFullSystemTest();
    };
  }

  const setBanner = (text, type = 'info') => {
    const el = document.getElementById('test-status-banner');
    if (!el) return;

    let prefix = '\uD83D\uDD39';
    if (type === 'success') prefix = '\u2705';
    if (type === 'error') prefix = '\u274C';
    if (type === 'warn') prefix = '\u26A0\uFE0F';
    if (type === 'loading') prefix = '\u23F3';

    el.className = 'small';
    if (type === 'success') el.classList.add('text-success', 'fw-bold');
    else if (type === 'error') el.classList.add('text-danger', 'fw-bold');
    else if (type === 'warn') el.classList.add('text-warning', 'fw-bold');
    else el.classList.add('text-light');

    el.textContent = `${prefix} ${text}`;
  };

  const disableRerun = (disabled) => {
    const btn = document.getElementById('btn-rerun-test');
    if (!btn) return;
    btn.disabled = !!disabled;
  };

  const bsModal = (window.bootstrap && bootstrap.Modal)
    ? bootstrap.Modal.getOrCreateInstance(modalEl)
    : null;

  if (bsModal) bsModal.show();

  // Reset UI
  document.getElementById('test-log-box').innerHTML = '';
  setBanner('Starting test...', 'loading');
  disableRerun(true);

  const normalize = (res) => {
    if (typeof normalizeApiResult === 'function') return normalizeApiResult(res);
    return res;
  };

  const getTodayISO = () => {
    if (typeof window.getCurrentDateISO === 'function') return window.getCurrentDateISO();
    return (window.currentDate ? String(window.currentDate).slice(0, 10) : new Date().toISOString().slice(0, 10));
  };

  const makeHiddenTestContainer = () => {
    const root = document.createElement('div');
    root.id = 'berry-test-root';
    root.style.cssText = 'position:fixed; left:-99999px; top:-99999px; width:1200px; height:auto; overflow:hidden;';
    root.innerHTML = `<div id="combinedCalendarGrid"></div><div id="combinedSummaryGrid"></div><div id="weeklyScheduleGrid"></div>`;
    document.body.appendChild(root);
    return root;
  };

  const removeHiddenTestContainer = (el) => {
    try { if (el && el.parentNode) el.parentNode.removeChild(el); } catch (e) {}
  };

  try {
    logUI(`System Time: ${new Date().toLocaleString()}`);
    setBanner('Running client checks...', 'loading');

    // ============================================
    // TEST 1: Date Alignment & Helper Check
    // ============================================
    logUI('1. Date Alignment Logic...');
    const mondayDec29 = new Date(2025, 11, 29);

    if (typeof toLocalISOString === 'function') {
      const iso = toLocalISOString(mondayDec29);
      if (iso === '2025-12-29') pass('toLocalISOString() OK: 2025-12-29');
      else fail(`toLocalISOString() FAIL: got ${iso}, expected 2025-12-29`);
    } else {
      warn('toLocalISOString() helper not found');
    }

    // ============================================
    // TEST 2: Server selfTest (ONE CALL)
    // ============================================
    setBanner('Calling server selfTest (REAL DB, Log-only)...', 'loading');
    logUI('2. Server selfTest (ONE CALL)...');

    if (typeof apiCall !== 'function') throw new Error('apiCall is not available');

    const serverResRaw = await apiCall('selfTest');
    const serverRes = normalize(serverResRaw);

   if (!serverRes || !serverRes.ok) {
  const errText =
    (serverRes && (serverRes.error || serverRes.message)) ||
    (serverResRaw && (serverResRaw.error || serverResRaw.message)) ||
    JSON.stringify(serverResRaw || serverRes || {});
  throw new Error('Server selfTest returned fail: ' + errText);
}


    pass('Server selfTest OK');

    // Print server logs to UI
    const serverLogs = serverRes.data && Array.isArray(serverRes.data.logs) ? serverRes.data.logs : [];
    if (!serverLogs.length) warn('No logs returned from server selfTest');

    serverLogs.forEach(line => {
      const s = String(line);
      const isOk = s.includes('\u2705');
      const isFail = s.includes('\u274C');
      logUI(`[SERVER] ${s}`, isOk ? 'success' : (isFail ? 'error' : 'info'));
    });

    // Print server outputs (daily summary, IDs)
    if (serverRes.data && serverRes.data.outputs) {
      console.log('\uD83E\uDDFE selfTest outputs:', serverRes.data.outputs);

      // Daily summary outputs (if exists)
      const out = serverRes.data.outputs;
      if (out.dailySummaryHas && out.dailySummaryHas.message) {
        console.log('\u2600\uFE0F Daily Summary (HAS WORK):\n' + out.dailySummaryHas.message);
        logUI('Daily Summary (HAS WORK) -> logged to console', 'info');
      }
      if (out.dailySummaryNo && out.dailySummaryNo.message) {
        console.log('\uD83C\uDF05 Daily Summary (NO WORK):\n' + out.dailySummaryNo.message);
        logUI('Daily Summary (NO WORK) -> logged to console', 'info');
      }
    } else {
      warn('No outputs returned from server selfTest');
    }

    // ============================================
    // TEST 3: Real Data Load + Renderers
    // ============================================
    setBanner('Fetching real schedule data + rendering...', 'loading');
    logUI('3. Real Data Load (getCombinedScheduleWeek)...');

    const todayISO = getTodayISO();
    const weekResRaw = await apiCall('getCombinedScheduleWeek', { date: todayISO });
    const weekRes = normalize(weekResRaw);

    if (!weekRes || !weekRes.ok) throw new Error('getCombinedScheduleWeek failed');

    const slots = (weekRes.data && Array.isArray(weekRes.data.slots)) ? weekRes.data.slots : [];
    pass(`Fetched ${slots.length} slots for week of ${todayISO}`);

    logUI('4. Renderer Integrity...');
    const root = makeHiddenTestContainer();

    try {
      if (typeof window.renderCombinedCalendarGrid === 'function') {
        const ok1 = window.renderCombinedCalendarGrid(slots);
        if (!ok1) throw new Error('renderCombinedCalendarGrid returned false');
        pass('renderCombinedCalendarGrid OK');
      } else {
        warn('renderCombinedCalendarGrid not found');
      }

      if (typeof window.renderCombinedSummary === 'function') {
        const ok2 = window.renderCombinedSummary(slots);
        if (!ok2) throw new Error('renderCombinedSummary returned false');
        pass('renderCombinedSummary OK');
      } else {
        warn('renderCombinedSummary not found');
      }
    } finally {
      removeHiddenTestContainer(root);
    }

    // ============================================
    // TEST 4: Loading Overlay
    // ============================================
    logUI('5. UI States (Loading Overlay)...');
    if (typeof showLoading === 'function') {
      showLoading(true, 'SYSTEM TEST: Overlay check...');
      await sleep(350);

      const overlay = document.getElementById('berryLoadingOverlay');
      const visible = overlay && (getComputedStyle(overlay).display !== 'none') && (getComputedStyle(overlay).opacity !== '0');
      if (visible) pass('Loading Overlay visible');
      else fail('Loading Overlay not visible');

      showLoading(false);
      await sleep(250);
    } else {
      warn('showLoading() not found');
    }

    // ============================================
    // FINISH
    // ============================================
    setBanner('All tests completed.', 'success');
    disableRerun(false);
    pass('\uD83C\uDF89 FULL SYSTEM TEST COMPLETED');

  } catch (e) {
    try { if (typeof showLoading === 'function') showLoading(false); } catch (x) {}
    setBanner('Test failed: ' + (e.message || e), 'error');
    disableRerun(false);
    fail('TEST FAILED: ' + (e.message || e));
    console.error(e);
  } finally {
    window.__berrySystemTestRunning = false;
  }
};

// ANCHOR:CLIENT.windowLoad:REPLACE
window.addEventListener('load', () => {
  console.log("\uD83D\uDE80 Application Loaded (Berry System)");

  // \u0E16\u0E49\u0E32 initData.session \u0E15\u0E31\u0E49\u0E07 session \u0E41\u0E25\u0E49\u0E27 \u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07 restore \u0E08\u0E32\u0E01 localStorage
  if (window.currentSession && typeof isUserLoggedIn === 'function' && isUserLoggedIn()) {
    try {
      localStorage.setItem('berry_user_session', JSON.stringify(window.currentSession));
    } catch (e) {}
    if (typeof touchSessionStart === 'function') touchSessionStart();
    if (typeof startSessionTimer === 'function') startSessionTimer();
    return;
  }

  // 1) \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A Session \u0E40\u0E01\u0E48\u0E32\u0E08\u0E32\u0E01 LocalStorage (\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E01\u0E23\u0E13\u0E35\u0E44\u0E21\u0E48\u0E21\u0E35 session \u0E08\u0E32\u0E01 server)
  const savedUser = localStorage.getItem('berry_user_session');
  const savedTime = localStorage.getItem('berry_session_start');

  if (savedUser && savedTime) {
    console.log("\u267B\uFE0F Restoring Session...");
    try {
      const userObj = JSON.parse(savedUser);

      const now = new Date().getTime();
      const oneHour = 60 * 60 * 1000;

      if (now - parseInt(savedTime, 10) > oneHour) {
        console.log("\u23F3 Saved session expired.");
        try { localStorage.removeItem('berry_user_session'); } catch (e) {}
        try { localStorage.removeItem('berry_session_start'); } catch (e) {}
        performLogout(false);
      } else {
        if (typeof setSession === 'function') setSession(userObj);
      }
    } catch (e) {
      console.error("\u274C Error restoring session:", e);
      try { localStorage.removeItem('berry_user_session'); } catch (e2) {}
      try { localStorage.removeItem('berry_session_start'); } catch (e2) {}
      performLogout(false);
    }
  } else {
    // \uD83D\uDD25 FIX: \u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2D\u0E30\u0E44\u0E23\u0E40\u0E25\u0E22 \u0E43\u0E2B\u0E49\u0E22\u0E49\u0E33\u0E2A\u0E16\u0E32\u0E19\u0E30 Guest \u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07 (\u0E40\u0E1C\u0E37\u0E48\u0E2D Init \u0E1E\u0E25\u0E32\u0E14)
    if (!window.currentSession) {
        if (typeof updateUIForLoggedOutUser === 'function') updateUIForLoggedOutUser();
    }
  }
});


  document.addEventListener('DOMContentLoaded', function () {
  const btn = document.querySelector('button[onclick="openCancelModal()"]');
  if (!btn) return;

  btn.addEventListener('click', function (e) {
    e.preventDefault();
    if (typeof window.openCancelModal === 'function') {
      window.openCancelModal('');
    }
  });
});

(function bindTopCancelButton() {
  const bind = () => {
    const btn = document.getElementById('btnTopCancelBooking');
    if (!btn) return;

    btn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('\uD83E\uDDEA Top Cancel Clicked');

      if (typeof window.openCancelModal === 'function') {
        window.openCancelModal('');
      } else {
        console.error('\u274C openCancelModal is missing');
        alert('\u0E23\u0E30\u0E1A\u0E1A\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19');
      }
    };
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();

// ANCHOR:CLIENT.changeTimetableDay:NEW
// \u2705 Helper: \u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E27\u0E31\u0E19 (\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A Day View)
window.changeTimetableDay = function(delta) {
    if (!window.currentRoom) {
        showToast('\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19', '\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2B\u0E49\u0E2D\u0E07\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48', 'warning');
        return;
    }

    // 1. \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19
    let currentIso = window.currentDate || new Date().toISOString().split('T')[0];
    let dateObj = new Date(currentIso);
    if(isNaN(dateObj.getTime())) dateObj = new Date();

    // 2. \u0E04\u0E33\u0E19\u0E27\u0E13\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E43\u0E2B\u0E21\u0E48
    dateObj.setDate(dateObj.getDate() + delta);
    
    // 3. \u0E41\u0E1B\u0E25\u0E07\u0E40\u0E1B\u0E47\u0E19 ISO String (YYYY-MM-DD)
    const yy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const newDateISO = `${yy}-${mm}-${dd}`;
    
    console.log(`\uD83D\uDCC5 Navigating Day: ${delta} -> ${newDateISO}`);
    
    // 4. Update Global State & Sidebar Input (Sync)
    window.currentDate = newDateISO;
    const dateInput = document.getElementById('selectedDate');
    if (dateInput) {
        dateInput.value = newDateISO;
        // Trigger event \u0E40\u0E1E\u0E37\u0E48\u0E2D update \u0E01\u0E32\u0E23\u0E41\u0E2A\u0E14\u0E07\u0E1C\u0E25 \u0E1E.\u0E28. (\u0E16\u0E49\u0E32\u0E21\u0E35 handler)
        dateInput.dispatchEvent(new Event('change', { bubbles: false })); 
    }

    // 5. \u0E40\u0E23\u0E35\u0E22\u0E01\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 (\u0E43\u0E0A\u0E49 loadScheduleForRoom \u0E15\u0E32\u0E21\u0E1B\u0E01\u0E15\u0E34)
    if (typeof loadScheduleForRoom === 'function') {
        loadScheduleForRoom(window.currentRoom, newDateISO);
    }
};

// ANCHOR:CLIENT.changeTimetableWeek:NEW
// \u2705 Helper: \u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C (\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A Week View)
window.changeTimetableWeek = function(delta) {
    if (!window.currentRoom) {
        showToast('\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19', '\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2B\u0E49\u0E2D\u0E07\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C', 'warning');
        return;
    }

    // 1. \u0E2B\u0E32\u0E27\u0E31\u0E19\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C\u0E02\u0E2D\u0E07\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19 (\u0E2B\u0E23\u0E37\u0E2D\u0E43\u0E0A\u0E49\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49\u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E21\u0E35)
    let currentMonday = window._currentWeekDisplayDate;
    if (!currentMonday || isNaN(currentMonday.getTime())) {
        const today = new Date();
        const day = today.getDay(); // 0=Sun
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        currentMonday = new Date(today);
        currentMonday.setDate(diff);
    }
    
    // 2. \u0E04\u0E33\u0E19\u0E27\u0E13\u0E27\u0E31\u0E19\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C\u0E43\u0E2B\u0E21\u0E48 (+/- 7 \u0E27\u0E31\u0E19)
    const targetDate = new Date(currentMonday);
    targetDate.setDate(targetDate.getDate() + (delta * 7));
    
    // 3. \u0E41\u0E1B\u0E25\u0E07\u0E40\u0E1B\u0E47\u0E19 ISO String
    const yy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const newDateISO = `${yy}-${mm}-${dd}`;
    
    console.log(`\uD83D\uDCC5 Navigating Week: ${delta} -> ${newDateISO}`);
    
    // 4. \u0E40\u0E23\u0E35\u0E22\u0E01\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25 (\u0E43\u0E0A\u0E49 loadScheduleForRoom \u0E15\u0E32\u0E21\u0E1B\u0E01\u0E15\u0E34)
    if (typeof loadScheduleForRoom === 'function') {
        loadScheduleForRoom(window.currentRoom, newDateISO);
    }
};

// ANCHOR:CLIENT.changeTimetableMonth:NEW
// \u2705 Helper: \u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E40\u0E14\u0E37\u0E2D\u0E19 (\u0E43\u0E0A\u0E49\u0E43\u0E19\u0E2B\u0E19\u0E49\u0E32 Month View)
window.changeTimetableMonth = function(delta) {
    if (!window.currentRoom) {
        showToast('\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19', '\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2B\u0E49\u0E2D\u0E07\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E40\u0E14\u0E37\u0E2D\u0E19', 'warning');
        return;
    }

    // 1. \u0E2B\u0E32\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19\u0E17\u0E35\u0E48\u0E41\u0E2A\u0E14\u0E07\u0E1C\u0E25\u0E2D\u0E22\u0E39\u0E48 (\u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E2B\u0E49\u0E43\u0E0A\u0E49\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19)
    let currentDisplay = window._currentMonthDisplayDate || new Date();
    
    // 2. \u0E04\u0E33\u0E19\u0E27\u0E13\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E43\u0E2B\u0E21\u0E48
    // \u0E15\u0E31\u0E49\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 1 \u0E02\u0E2D\u0E07\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19\u0E01\u0E48\u0E2D\u0E19 \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19\u0E1B\u0E31\u0E0D\u0E2B\u0E32\u0E02\u0E49\u0E32\u0E21\u0E40\u0E14\u0E37\u0E2D\u0E19 (\u0E40\u0E0A\u0E48\u0E19 31 \u0E21.\u0E04. + 1 \u0E40\u0E14\u0E37\u0E2D\u0E19 -> \u0E21\u0E35.\u0E04.)
    const targetDate = new Date(currentDisplay.getFullYear(), currentDisplay.getMonth(), 1);
    targetDate.setMonth(targetDate.getMonth() + delta);
    
    // 3. \u0E41\u0E1B\u0E25\u0E07\u0E40\u0E1B\u0E47\u0E19 ISO String (YYYY-MM-DD)
    // \u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49 loadScheduleForRoom \u0E21\u0E31\u0E19\u0E08\u0E30\u0E23\u0E31\u0E1A\u0E04\u0E48\u0E32 dateISO \u0E41\u0E25\u0E49\u0E27\u0E44\u0E1B\u0E04\u0E33\u0E19\u0E27\u0E13 Start/End \u0E02\u0E2D\u0E07\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E19\u0E31\u0E49\u0E19\u0E40\u0E2D\u0E07\u0E43\u0E19 Server
    // \u0E14\u0E31\u0E07\u0E19\u0E31\u0E49\u0E19\u0E2A\u0E48\u0E07\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 1 \u0E02\u0E2D\u0E07\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E44\u0E1B\u0E44\u0E14\u0E49\u0E40\u0E25\u0E22
    const yy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = '01';
    const newDateISO = `${yy}-${mm}-${dd}`;
    
    console.log(`\uD83D\uDCC5 Navigating Month: ${delta} -> ${newDateISO}`);
    
    // 4. \u0E40\u0E23\u0E35\u0E22\u0E01\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E21\u0E48
    if (typeof loadScheduleForRoom === 'function') {
        loadScheduleForRoom(window.currentRoom, newDateISO);
    }
    
    // Note: \u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07 update window.currentDate (sidebar) \u0E01\u0E47\u0E44\u0E14\u0E49 
    // \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49 user \u0E23\u0E39\u0E49\u0E27\u0E48\u0E32\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E08\u0E23\u0E34\u0E07\u0E46 \u0E04\u0E37\u0E2D\u0E27\u0E31\u0E19\u0E44\u0E2B\u0E19 \u0E41\u0E15\u0E48\u0E15\u0E32\u0E23\u0E32\u0E07\u0E14\u0E39\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E2D\u0E37\u0E48\u0E19\u0E44\u0E14\u0E49
};

// ANCHOR:CLIENT.bindDashboardApis:REPLACE
function bindDashboardApis() {
  try {
    if (!window.__dashBindState) {
      window.__dashBindState = { bound: false, lastMissing: [], rounds: 0 };
    }

    const st = window.__dashBindState;

    // \u2705 \u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19 spam: \u0E16\u0E49\u0E32\u0E1C\u0E39\u0E01\u0E04\u0E23\u0E1A\u0E41\u0E25\u0E49\u0E27 \u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E17\u0E33\u0E0B\u0E49\u0E33
    if (st.bound) {
      console.log('\u2705 PASS bindDashboardApis: already bound -> loadDashboard');
      return true;
    }

    const mustHave = ['loadDashboard', 'loadDashboardStats', 'loadBookingChart', 'loadRecentBookings'];
    const missing = mustHave.filter(fn => typeof window[fn] !== 'function');

    // \u2705 \u0E16\u0E49\u0E32\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E23\u0E49\u0E2D\u0E21 \u0E43\u0E2B\u0E49 retry \u0E41\u0E1A\u0E1A\u0E21\u0E35 limit
    if (missing.length > 0) {
      st.rounds += 1;

      // log \u0E40\u0E09\u0E1E\u0E32\u0E30\u0E15\u0E2D\u0E19 missing \u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19
      const changed = (missing.join('|') !== st.lastMissing.join('|'));
      if (changed) {
        console.warn('\u26A0\uFE0F bindDashboardApis: waiting for functions...', { missing, round: st.rounds });
        st.lastMissing = missing.slice();
      }

      // retry 20 \u0E23\u0E2D\u0E1A
      if (st.rounds <= 20) {
        setTimeout(bindDashboardApis, 200);
        return false;
      }

      console.error('\u274C FAIL bindDashboardApis: giving up. Missing:', missing);
      return false;
    }

    // \u2705 Mark as bound
    st.bound = true;
    console.log('\u2705 PASS bindDashboardApis: dashboard functions are ready');
    return true;

  } catch (e) {
    console.error('\u274C FAIL bindDashboardApis exception:', e);
    return false;
  }
}
// ANCHOR:CLIENT.bindDashboardApis:END

// ANCHOR:CLIENT.exportDashboardGlobals:REPLACE
function exportDashboardGlobals() {
  try {
    const map = {
      loadDashboardStats: (typeof loadDashboardStats === 'function') ? loadDashboardStats : null,
      loadBookingChart: (typeof loadBookingChart === 'function') ? loadBookingChart : null,
      loadRecentBookings: (typeof loadRecentBookings === 'function') ? loadRecentBookings : null,
      loadDashboard: (typeof loadDashboard === 'function') ? loadDashboard : null,
      refreshRecentBookings: (typeof refreshRecentBookings === 'function') ? refreshRecentBookings : null,
      changeRecentPage: (typeof changeRecentPage === 'function') ? changeRecentPage : null
    };

    const missing = [];
    Object.keys(map).forEach(k => {
      if (typeof map[k] === 'function') {
        window[k] = map[k];
      } else {
        missing.push(k);
      }
    });

    if (missing.length > 0) {
      console.warn('\u26A0\uFE0F exportDashboardGlobals: some functions missing (will retry)', missing);
      // retry soft
      setTimeout(exportDashboardGlobals, 200);
      return false;
    }

    console.log('\u2705 exportDashboardGlobals: dashboard functions exported to window');
    return true;

  } catch (e) {
    console.error('\u274C exportDashboardGlobals error:', e);
    return false;
  }
}

// \u2705 run once (safe)
setTimeout(exportDashboardGlobals, 0);
// ANCHOR:CLIENT.exportDashboardGlobals:END


// [ANCHOR:CLIENT.handleRoomCardClick:REPLACE]
// \u2705 3. ENHANCE: Smart Room Click (Auto-Switch Tab)
window.handleRoomCardClick = function(roomOrId) {
    const rid = String(
      (typeof roomOrId === 'object' && roomOrId)
        ? (roomOrId.RoomID || roomOrId.roomID || roomOrId.roomId || '')
        : roomOrId
    ).trim();

    if (!rid) return;

    console.log('\uD83D\uDC46 User clicked room:', rid);

    // 1. \u0E2D\u0E31\u0E1B\u0E40\u0E14\u0E15\u0E15\u0E31\u0E27\u0E41\u0E1B\u0E23 Global \u0E41\u0E25\u0E30 UI (Sidebar/Mobile Pill) \u0E17\u0E31\u0E19\u0E17\u0E35
    window.currentRoom = rid;
    if (typeof selectRoom === 'function') {
        // selectRoom \u0E08\u0E30\u0E0A\u0E48\u0E27\u0E22 highlight \u0E1B\u0E38\u0E48\u0E21\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E01\u0E14\u0E43\u0E2B\u0E49\u0E40\u0E1B\u0E47\u0E19\u0E2A\u0E35 active
        selectRoom(rid); 
    }

    // 2. \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E27\u0E48\u0E32\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E44\u0E2B\u0E19?
    const activeTab = String(window.currentActiveTab || getActiveTabId_() || '').trim();

    // 3. Logic \u0E01\u0E32\u0E23\u0E2A\u0E25\u0E31\u0E1A\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E25\u0E30\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25
    if (activeTab === 'timetable') {
        // \u0E01\u0E23\u0E13\u0E35: \u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E08\u0E2D\u0E07\u0E2B\u0E49\u0E2D\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27 -> \u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E2B\u0E21\u0E48\u0E40\u0E25\u0E22
        console.log('\uD83D\uDCC5 Already on timetable, reloading...');
        if (typeof loadScheduleForRoom === 'function') {
            loadScheduleForRoom(rid, window.currentDate);
        }
    } else {
        // \u0E01\u0E23\u0E13\u0E35: \u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E2D\u0E37\u0E48\u0E19 (\u0E40\u0E0A\u0E48\u0E19 Dashboard, \u0E15\u0E32\u0E23\u0E32\u0E07\u0E23\u0E27\u0E21) -> \u0E2A\u0E25\u0E31\u0E1A\u0E2B\u0E19\u0E49\u0E32\u0E43\u0E2B\u0E49\u0E40\u0E2D\u0E07
        console.log('\uD83D\uDD00 Switching to timetable tab automatically...');
        
        // \u0E2A\u0E25\u0E31\u0E1A\u0E41\u0E17\u0E47\u0E1A
        if (typeof showTab === 'function') {
            showTab('timetable');
        } else {
            // Fallback: \u0E01\u0E14\u0E1B\u0E38\u0E48\u0E21 Tab \u0E14\u0E49\u0E27\u0E22 JS
            const tabBtn = document.getElementById('timetable-tab');
            if (tabBtn) tabBtn.click();
        }

        // \u0E2B\u0E19\u0E48\u0E27\u0E07\u0E40\u0E27\u0E25\u0E32\u0E19\u0E34\u0E14\u0E19\u0E36\u0E07\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E41\u0E17\u0E47\u0E1A\u0E41\u0E2A\u0E14\u0E07\u0E1C\u0E25\u0E40\u0E2A\u0E23\u0E47\u0E08 \u0E41\u0E25\u0E49\u0E27\u0E04\u0E48\u0E2D\u0E22\u0E42\u0E2B\u0E25\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25
        setTimeout(() => {
            if (typeof loadScheduleForRoom === 'function') {
                loadScheduleForRoom(rid, window.currentDate);
            }
        }, 100);
    }
};

// Helper \u0E40\u0E25\u0E47\u0E01\u0E46 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E2B\u0E32 Tab \u0E1B\u0E31\u0E08\u0E08\u0E38\u0E1A\u0E31\u0E19 (\u0E40\u0E1C\u0E37\u0E48\u0E2D window.currentActiveTab \u0E2B\u0E25\u0E38\u0E14)
function getActiveTabId_() {
    const activeBtn = document.querySelector('.nav-link.active');
    if (!activeBtn) return '';
    if (activeBtn.id === 'schedule-tab') return 'schedule';
    if (activeBtn.id === 'timetable-tab') return 'timetable';
    if (activeBtn.id === 'dashboard-tab') return 'dashboard';
    return '';
}
// [ANCHOR:CLIENT.handleRoomCardClick:END]

// [ANCHOR:CLIENT.exportClientApi:REPLACE]
(function exportClientApi() {
  // \u2705 1. PATCH: Create Aliases for missing functions (Fixes "Missing functions" error)
  if (typeof window.renderTimetable === 'undefined') {
      window.renderTimetable = (typeof renderTimetableDayGrid === 'function') ? renderTimetableDayGrid : function(){};
  }
  if (typeof window.renderWeeklyGridV2 === 'undefined') {
      window.renderWeeklyGridV2 = (typeof renderWeeklyGrid_V2 === 'function') ? renderWeeklyGrid_V2 : function(){};
  }

    const state = {
    rounds: 0,
    maxRounds: 120,
    delayMs: 200,
    lastMissingKey: '',
    stableRounds: 0,
    stableStopAfter: 12, 
    startedAt: Date.now()
  };

  if (typeof window.runServerFunction === 'undefined' && typeof window.apiCall === 'function') {
    window.runServerFunction = window.apiCall;
  }

  const safeLogMissing = (missing) => {
    const key = missing.join('|');
    if (key !== state.lastMissingKey) {
      state.lastMissingKey = key;
      console.warn('\u26A0\uFE0F exportClientApi: missing functions ->', missing);
      state.stableRounds = 0;
    } else {
      state.stableRounds += 1;
    }
  };

  const getFn = (name) => {
    if (typeof window[name] === 'function') return window[name];
    if (typeof globalThis[name] === 'function') return globalThis[name];
    try {
      if (name === 'initializeApplication' && typeof initializeApplication === 'function') return initializeApplication;
      if (name === 'initializeUI' && typeof initializeUI === 'function') return initializeUI;
      if (name === 'initializeTabs' && typeof initializeTabs === 'function') return initializeTabs;
      if (name === 'showTab' && typeof showTab === 'function') return showTab;
      if (name === 'toggleTheme' && typeof toggleTheme === 'function') return toggleTheme;
      if (name === 'switchTimetableView' && typeof switchTimetableView === 'function') return switchTimetableView;
      if (name === 'loadScheduleForRoom' && typeof loadScheduleForRoom === 'function') return loadScheduleForRoom;
      if (name === 'renderTimetable' && typeof renderTimetable === 'function') return renderTimetable;
      if (name === 'renderTimetableDayGrid' && typeof renderTimetableDayGrid === 'function') return renderTimetableDayGrid; 
      if (name === 'renderTimetableWeekGrid' && typeof renderTimetableWeekGrid === 'function') return renderTimetableWeekGrid; 
      if (name === 'renderTimetableMonthAgenda' && typeof window.renderTimetableMonthAgenda === 'function') return window.renderTimetableMonthAgenda;
      if (name === 'renderTimetableMonthGrid' && typeof renderTimetableMonthGrid === 'function') return renderTimetableMonthGrid; 
      if (name === 'renderMonthlyGrid' && typeof renderMonthlyGrid === 'function') return renderMonthlyGrid;
      if (name === 'handleEmptyClickWeek' && typeof handleEmptyClickWeek === 'function') return handleEmptyClickWeek;
      if (name === 'showBookingFormWithDate' && typeof showBookingFormWithDate === 'function') return showBookingFormWithDate;
      if (name === 'showEventDetail' && typeof showEventDetail === 'function') return showEventDetail;
      if (name === 'showMonthDaySlots' && typeof showMonthDaySlots === 'function') return showMonthDaySlots;
      if (name === 'renderWeeklyGridV2' && typeof renderWeeklyGridV2 === 'function') return renderWeeklyGridV2;
      if (name === 'loadCombinedSchedule' && typeof loadCombinedSchedule === 'function') return loadCombinedSchedule;
      if (name === 'renderCombinedCalendarGrid' && typeof renderCombinedCalendarGrid === 'function') return renderCombinedCalendarGrid;
      if (name === 'renderCombinedSummary' && typeof renderCombinedSummary === 'function') return renderCombinedSummary;
      if (name === 'setCombinedView' && typeof setCombinedView === 'function') return setCombinedView;
      if (name === 'openCombinedDayDetail' && typeof openCombinedDayDetail === 'function') return openCombinedDayDetail;
      if (name === 'loadDashboard' && typeof loadDashboard === 'function') return loadDashboard;
      if (name === 'updateChart' && typeof updateChart === 'function') return updateChart;
      if (name === 'refreshRecentBookings' && typeof refreshRecentBookings === 'function') return refreshRecentBookings;
      if (name === 'changeRecentPage' && typeof changeRecentPage === 'function') return changeRecentPage;
      if (name === 'renderRooms' && typeof renderRooms === 'function') return renderRooms;
      if (name === 'selectRoom' && typeof selectRoom === 'function') return selectRoom;
      if (name === 'filterRooms' && typeof filterRooms === 'function') return filterRooms;
      if (name === 'updateSelectedRoomInfo' && typeof updateSelectedRoomInfo === 'function') return updateSelectedRoomInfo;
      if (name === 'showBookingForm' && typeof showBookingForm === 'function') return showBookingForm;
      if (name === 'submitBooking' && typeof submitBooking === 'function') return submitBooking;
      if (name === 'resetBookingForm' && typeof resetBookingForm === 'function') return resetBookingForm;
      if (name === 'updateRoomOptions' && typeof updateRoomOptions === 'function') return updateRoomOptions;
      if (name === 'bookOverClass' && typeof bookOverClass === 'function') return bookOverClass;
      if (name === 'handleRoomCardClick' && typeof handleRoomCardClick === 'function') return handleRoomCardClick;
      if (name === 'openBookingDetail' && typeof openBookingDetail === 'function') return openBookingDetail;
      if (name === 'performBookingAction' && typeof performBookingAction === 'function') return performBookingAction;
      if (name === 'openCancelModal' && typeof openCancelModal === 'function') return openCancelModal;
      if (name === 'confirmCancel' && typeof confirmCancel === 'function') return confirmCancel;
      if (name === 'renderBookingDetailsModal' && typeof renderBookingDetailsModal === 'function') return renderBookingDetailsModal;
      if (name === 'showManualBookingId' && typeof showManualBookingId === 'function') return showManualBookingId;
      if (name === 'handleCancelFromDetails' && typeof handleCancelFromDetails === 'function') return handleCancelFromDetails;
      if (name === 'bindCancelPhoneSuggestion' && typeof bindCancelPhoneSuggestion === 'function') return bindCancelPhoneSuggestion;
      if (name === 'showNotification' && typeof showNotification === 'function') return showNotification;
      if (name === 'showToast' && typeof showToast === 'function') return showToast;
      if (name === 'formatDateBE' && typeof formatDateBE === 'function') return formatDateBE;
      if (name === 'formatThaiDateFrontend' && typeof formatThaiDateFrontend === 'function') return formatThaiDateFrontend;
      if (name === 'parseFlexibleDateFrontend' && typeof parseFlexibleDateFrontend === 'function') return parseFlexibleDateFrontend;
      if (name === 'getStatusBadge' && typeof getStatusBadge === 'function') return getStatusBadge;
      if (name === 'copyToClipboard' && typeof copyToClipboard === 'function') return copyToClipboard;
      if (name === 'sanitizeText' && typeof sanitizeText === 'function') return sanitizeText;
      if (name === 'handleFileUpload' && typeof handleFileUpload === 'function') return handleFileUpload;
      if (name === 'removeFileFromList' && typeof removeFileFromList === 'function') return removeFileFromList;
      if (name === 'renderFileList' && typeof renderFileList === 'function') return renderFileList;
      if (name === 'performLogin' && typeof performLogin === 'function') return performLogin;
      if (name === 'performLogout' && typeof performLogout === 'function') return performLogout;
      if (name === 'showLoginModal' && typeof showLoginModal === 'function') return showLoginModal;
      if (name === 'callServer' && typeof callServer === 'function') return callServer;
      if (name === 'apiCall' && typeof apiCall === 'function') return apiCall;
      if (name === 'debugRoomsData' && typeof debugRoomsData === 'function') return debugRoomsData;
      if (name === 'clearRoomsCache' && typeof clearRoomsCache === 'function') return clearRoomsCache;
      if (name === 'refreshAfterAction' && typeof refreshAfterAction === 'function') return refreshAfterAction;
      if (name === 'updateBookingRemarkClient' && typeof updateBookingRemarkClient === 'function') return updateBookingRemarkClient;
      if (name === 'confirmAdminAction' && typeof confirmAdminAction === 'function') return confirmAdminAction;
      if (name === 'runFullSystemTest' && typeof runFullSystemTest === 'function') return runFullSystemTest;
    } catch (e) {}
    return undefined;
  };

  const bindOne = (name) => {
    const fn = getFn(name);
    if (typeof fn !== 'function') return false;
    if (typeof window[name] === 'function') return true;
    window[name] = fn;
    return true;
  };

  const list = [
    'initializeApplication',
    'initializeUI', 'initializeTabs', 'showTab', 'toggleTheme',
    'switchTimetableView', 'loadScheduleForRoom', 'renderTimetable', 
    'renderTimetableDayGrid', 'renderTimetableWeekGrid', 'renderTimetableMonthAgenda', 'renderTimetableMonthGrid',
    'renderMonthlyGrid', 'handleEmptyClickWeek', 'showBookingFormWithDate', 'showEventDetail', 'showMonthDaySlots', 'renderWeeklyGridV2',
    'loadCombinedSchedule', 'renderCombinedCalendarGrid', 'renderCombinedSummary',
    'setCombinedView', 'openCombinedDayDetail',
    'loadDashboard', 'updateChart', 'refreshRecentBookings', 'changeRecentPage',
    'renderRooms', 'selectRoom', 'filterRooms', 'updateSelectedRoomInfo',
    'showBookingForm', 'submitBooking', 'resetBookingForm', 'updateRoomOptions',
    'bookOverClass', 'handleRoomCardClick',
    'openBookingDetail', 'performBookingAction', 'openCancelModal', 'confirmCancel',
    'renderBookingDetailsModal', 'showManualBookingId', 'handleCancelFromDetails',
    'bindCancelPhoneSuggestion',
    'showNotification', 'showToast', 'formatDateBE', 'formatThaiDateFrontend',
    'parseFlexibleDateFrontend', 'getStatusBadge', 'copyToClipboard', 'sanitizeText',
    'handleFileUpload', 'removeFileFromList', 'renderFileList',
    'performLogin', 'performLogout', 'showLoginModal',
    'callServer', 'apiCall', 'debugRoomsData', 'clearRoomsCache',
    'refreshAfterAction', 'updateBookingRemarkClient', 'confirmAdminAction',
    'runFullSystemTest',
    // CHANGE: \u0E40\u0E1E\u0E34\u0E48\u0E21 Binding \u0E1F\u0E31\u0E07\u0E01\u0E4C\u0E0A\u0E31\u0E19\u0E43\u0E2B\u0E21\u0E48
    'openReportModal',
    'confirmDownloadReport'
  ];

  const doBind = () => {
    state.rounds += 1;
    const missing = [];
    let boundCount = 0;
    for (const name of list) {
      const ok = bindOne(name);
      if (!ok) missing.push(name);
      else boundCount += 1;
    }
    try { if (typeof bindDashboardApis === 'function') bindDashboardApis(); } catch (e) {}

    if (missing.length === 0) {
      console.log('\u2705 exportClientApi: all functions bound successfully', { round: state.rounds, boundCount, tookMs: Date.now() - state.startedAt });
      return true;
    }
    safeLogMissing(missing);
    const tooStable = state.stableRounds >= state.stableStopAfter;
    const tooLong = state.rounds >= state.maxRounds;
    if (tooStable || tooLong) {
      console.warn('\u26A0\uFE0F exportClientApi: stopped retry (non-fatal).', { round: state.rounds, stableRounds: state.stableRounds, missing });
      return false;
    }
    setTimeout(doBind, state.delayMs);
    return false;
  };

  const start = () => { setTimeout(doBind, 0); console.log('\u2705 exportClientApi: binder started'); };
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', start, { once: true }); } else { start(); }
})();
// [ANCHOR:CLIENT.exportClientApi:END]



try {
  window.renderCombinedCalendarGrid = renderCombinedCalendarGrid;
  console.log('\u2705 Bound renderCombinedCalendarGrid to window');
} catch (e) {}

// Export functions to global window scope for inline onclick handlers
window.confirmCancel = typeof confirmCancel === 'function' ? confirmCancel : window.confirmCancel;
window.selectCancelBookingId = typeof selectCancelBookingId === 'function' ? selectCancelBookingId : window.selectCancelBookingId;
window.showManualBookingId = typeof showManualBookingId === 'function' ? showManualBookingId : window.showManualBookingId;
window.openGlobalCancelModal = typeof openGlobalCancelModal === 'function' ? openGlobalCancelModal : (typeof openCancelModal === 'function' ? openCancelModal : window.openGlobalCancelModal);

})(); 
