/**
 * Pulse Messenger — app.js
 * Real-time (Supabase) messenger with Media Support
 * ─────────────────────────────────────────────
 */

const SUPABASE_URL = 'https://vkckxborcohmovtogsrn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrY2t4Ym9yY29obW92dG9nc3JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NjAwOTgsImV4cCI6MjA4OTQzNjA5OH0.EUhVHt76SqDRmzBNy7sRCujewUQ6mHi6EVlRHFz7dbU';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let unreads = {}; // username -> count
let recentConvs = []; // list of usernames
let contextMsg = null; // message currently being right-clicked

/* ══════════════════════════════════════════════
   THEME LOGIC
══════════════════════════════════════════════ */
const btnTheme = document.getElementById('btn-theme');
const sunIcon = document.getElementById('sun-icon');
const moonIcon = document.getElementById('moon-icon');

function initTheme() {
  const theme = localStorage.getItem('pulse-theme') || 'dark';
  setTheme(theme);
}

function setTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-mode');
    document.body.classList.remove('dark-mode');
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  } else {
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  }
  localStorage.setItem('pulse-theme', theme);
}

if (btnTheme) {
  btnTheme.addEventListener('click', () => {
    const isLight = document.body.classList.contains('light-mode');
    setTheme(isLight ? 'dark' : 'light');
  });
}

initTheme();

/* ══════════════════════════════════════════════
   STORAGE HELPERS
══════════════════════════════════════════════ */

function getUsers() {
  return JSON.parse(localStorage.getItem('pulse_users') || '[]');
}

function saveUsers(users) {
  localStorage.setItem('pulse_users', JSON.stringify(users));
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('pulse_current') || 'null');
}

function setCurrentUser(user) {
  localStorage.setItem('pulse_current', JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem('pulse_current');
}

function getMessages(key) {
  return JSON.parse(localStorage.getItem('pulse_msgs_' + key) || '[]');
}

function saveMessages(key, msgs) {
  localStorage.setItem('pulse_msgs_' + key, JSON.stringify(msgs));
}

function convKey(a, b) {
  return [a, b].sort().join('::');
}

/* ══════════════════════════════════════════════
   AUTH — TAB SWITCHING
══════════════════════════════════════════════ */

const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const formLogin = document.getElementById('form-login');
const formSignup = document.getElementById('form-signup');

if (tabLogin && tabSignup) {
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    formLogin.style.display = 'block';
    formSignup.style.display = 'none';
  });

  tabSignup.addEventListener('click', () => {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    formSignup.style.display = 'block';
    formLogin.style.display = 'none';
    resetSignupForm();
  });
}

/* ══════════════════════════════════════════════
   AUTH — LOGIN / SIGNUP
══════════════════════════════════════════════ */

const btnLogin = document.getElementById('btn-login');
if (btnLogin) {
  btnLogin.addEventListener('click', async () => {
    const username = document.getElementById('login-username').value.trim().replace(/^@/, '');
    const password = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');

    err.classList.add('hidden');
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !user) {
      err.textContent = 'Invalid username or password.';
      err.classList.remove('hidden');
      return;
    }

    setCurrentUser(user);
    showApp();
  });
}

// Signup Multi-step Logic
let signupData = { username: '', name: '', password: '' };

document.getElementById('btn-step1')?.addEventListener('click', async () => {
  const username = document.getElementById('signup-username').value.trim().replace(/^@/, '');
  const err = document.getElementById('signup-error-1');
  err.classList.add('hidden');

  if (!username) return;

  const { data } = await supabase.from('users').select('username').eq('username', username).single();
  if (data) {
    err.textContent = 'Username already taken.';
    err.classList.remove('hidden');
    return;
  }

  signupData.username = username;
  document.getElementById('signup-step-1').style.display = 'none';
  document.getElementById('signup-step-2').style.display = 'block';
});

document.getElementById('btn-step2')?.addEventListener('click', () => {
  const name = document.getElementById('signup-name').value.trim();
  if (!name) return;
  signupData.name = name;
  document.getElementById('signup-step-2').style.display = 'none';
  document.getElementById('signup-step-3').style.display = 'block';
});

document.getElementById('btn-step3')?.addEventListener('click', async () => {
  const password = document.getElementById('signup-password').value;
  if (!password) return;
  signupData.password = password;

  const { error } = await supabase.from('users').insert([signupData]);
  if (error) {
    const err = document.getElementById('signup-error-3');
    err.textContent = 'Error creating account. Try again.';
    err.classList.remove('hidden');
    return;
  }

  setCurrentUser(signupData);
  showApp();
});

function resetSignupForm() {
  signupData = { username: '', name: '', password: '' };
  document.getElementById('signup-step-1').style.display = 'block';
  document.getElementById('signup-step-2').style.display = 'none';
  document.getElementById('signup-step-3').style.display = 'none';
  document.getElementById('signup-username').value = '';
  document.getElementById('signup-name').value = '';
  document.getElementById('signup-password').value = '';
}

/* ══════════════════════════════════════════════
   MEDIA & RECORDING LOGIC
══════════════════════════════════════════════ */

const btnAttach = document.getElementById('btn-attach');
const btnCamera = document.getElementById('btn-camera');
const mediaPicker = document.getElementById('media-picker');
const btnRecord = document.getElementById('btn-record');
const recOverlay = document.getElementById('recording-overlay');
const recTime = document.getElementById('recording-time');
const circPreview = document.getElementById('circular-preview');

const micIcon = document.getElementById('mic-icon');
const cameraIcon = document.getElementById('camera-icon');

const captureOverlay = document.getElementById('capture-overlay');
const captureVideo = document.getElementById('capture-video');
const btnSnap = document.getElementById('btn-snap');
const btnCloseCapture = document.getElementById('btn-close-capture');

let mediaRecorder = null;
let chunks = [];
let recTimer = null;
let recSeconds = 0;
let isCircular = false; // Telegram mode: false = voice, true = video
let recordMode = 'voice'; // 'voice' or 'video'

btnAttach?.addEventListener('click', () => mediaPicker.click());
mediaPicker?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const type = file.type.startsWith('image/') ? 'image' : 'video';
    sendMediaMessage(event.target.result, type);
  };
  reader.readAsDataURL(file);
});

// Mode Toggle (Telegram style: Tap to switch)
btnRecord?.addEventListener('click', (e) => {
  if (isRecording) return; // Don't switch while recording
  recordMode = recordMode === 'voice' ? 'video' : 'voice';
  if (recordMode === 'voice') {
    micIcon.classList.remove('hidden');
    cameraIcon.classList.add('hidden');
  } else {
    micIcon.classList.add('hidden');
    cameraIcon.classList.remove('hidden');
  }
});

let isRecording = false;
btnRecord?.addEventListener('mousedown', (e) => {
  // Only start recording if we hold it (wait 200ms)
  this.holdTimeout = setTimeout(() => startRecording(recordMode === 'video'), 200);
});
btnRecord?.addEventListener('mouseup', () => {
  clearTimeout(this.holdTimeout);
  if (isRecording) stopRecording();
});
btnRecord?.addEventListener('mouseleave', () => {
  clearTimeout(this.holdTimeout);
  if (isRecording) stopRecording();
});

async function startRecording(circular) {
  try {
    const constraints = circular ? { audio: true, video: { width: 400, height: 400 } } : { audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    isRecording = true;
    chunks = [];
    recSeconds = 0;
    isCircular = circular;

    if (isCircular) {
      circPreview.classList.remove('hidden');
      let video = circPreview.querySelector('video');
      if (!video) {
        video = document.createElement('video');
        video.muted = true;
        video.autoplay = true;
        video.setAttribute('playsinline', '');
        circPreview.appendChild(video);
      }
      video.srcObject = stream;
    }

    // Determine supported mime type
    const types = isCircular 
      ? ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4;codecs=h264,aac', 'video/mp4']
      : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    
    const mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    
    mediaRecorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      circPreview.classList.add('hidden');
      
      if (chunks.length === 0) {
        console.warn('No recording data captured.');
        return;
      }

      const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
      const reader = new FileReader();
      reader.onload = (ev) => {
        sendMediaMessage(ev.target.result, isCircular ? 'circular' : 'voice');
      };
      reader.readAsDataURL(blob);
    };

    mediaRecorder.start(100); // Collect data every 100ms
    btnRecord.classList.add('recording');
    recOverlay.classList.remove('hidden');
    document.getElementById('msg-input').classList.add('hidden');

    recTimer = setInterval(() => {
      recSeconds++;
      const m = Math.floor(recSeconds / 60);
      const s = recSeconds % 60;
      recTime.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
    }, 1000);

  } catch (err) {
    console.error('Mic/Camera access denied:', err);
    alert('Could not access microphone or camera. Please check permissions.');
    isRecording = false;
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    btnRecord.classList.remove('recording');
    clearInterval(recTimer);
    recOverlay.classList.add('hidden');
    document.getElementById('msg-input').classList.remove('hidden');
    isRecording = false;
  }
}

// Camera Capture (Take Photo)
btnCamera?.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    captureVideo.srcObject = stream;
    captureOverlay.classList.remove('hidden');
  } catch (err) {
    alert('Could not access camera');
  }
});

btnCloseCapture?.addEventListener('click', () => {
  const stream = captureVideo.srcObject;
  if (stream) stream.getTracks().forEach(t => t.stop());
  captureOverlay.classList.add('hidden');
});

btnSnap?.addEventListener('click', () => {
  const canvas = document.createElement('canvas');
  canvas.width = captureVideo.videoWidth;
  canvas.height = captureVideo.videoHeight;
  const ctx = canvas.getContext('2d');
  // Mirror if front camera
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(captureVideo, 0, 0);
  const dataUrl = canvas.toDataURL('image/jpeg');
  sendMediaMessage(dataUrl, 'image');
  btnCloseCapture.click();
});

async function sendMediaMessage(dataUrl, type) {
  if (!selectedUser) return;
  const current = getCurrentUser();
  const msg = {
    from: current.username,
    to: selectedUser.username,
    text: '',
    ts: Date.now(),
    type: type,
    media_url: dataUrl
  };
  
  const { error } = await supabase.from('messages').insert([msg]);
  if (error) console.error('Error sending media:', error);
  
  // Local rendering is handled by the subscription normally, 
  // but we can optimistic render or wait for sub.
  // For simplicity here, let's rely on the subscription to avoid duplicates.
}

/* ══════════════════════════════════════════════
   APP LOGIC
══════════════════════════════════════════════ */

function showApp() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
  initApp();
}

function showAuth() {
  document.getElementById('app-screen').classList.remove('active');
  document.getElementById('auth-screen').classList.add('active');
}

document.getElementById('btn-logout')?.addEventListener('click', () => {
  clearCurrentUser();
  showAuth();
});

let selectedUser = null;

async function initApp() {
  const current = getCurrentUser();
  if (current) {
    // Initial fetch of recent conversations can be done by querying unique 'to' or 'from' 
    // but for now, we'll just listen for new ones.
    initRealtime();
  }
  await fetchUsersFromSupabase();
  renderUserList('');
}

function initRealtime() {
  const current = getCurrentUser();
  supabase
    .channel('public:messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const msg = payload.new;
      if (msg.to === current.username || msg.from === current.username) {
        handleIncomingMessage(msg);
      }
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, payload => {
      handleDeletedMessage(payload.old.id);
    })
    .subscribe();
}

function handleIncomingMessage(msg) {
  const current = getCurrentUser();
  const other = msg.from === current.username ? msg.to : msg.from;
  const key = convKey(current.username, other);
  
  const msgs = getMessages(key);
  msgs.push(msg);
  saveMessages(key, msgs);

  if (!recentConvs.includes(other)) {
    recentConvs.unshift(other);
  }

  if (selectedUser?.username === other) {
    renderMessages();
  } else if (msg.from !== current.username) {
    unreads[msg.from] = (unreads[msg.from] || 0) + 1;
  }
  renderUserList(searchInput.value);
}

function handleDeletedMessage(id) {
  // Logic to remove message locally by checking ID
  // For now, we'll just re-fetch if in active chat
  if (selectedUser) {
     fetchHistory(selectedUser);
  }
}

async function fetchUsersFromSupabase() {
  try {
    const { data: users, error } = await supabase.from('users').select('username, name');
    if (error) throw error;
    saveUsers(users);
  } catch (e) {
    console.error('Error fetching users:', e);
  }
}

const searchInput = document.getElementById('search-input');
searchInput?.addEventListener('input', () => renderUserList(searchInput.value));

function renderUserList(query) {
  const list = document.getElementById('user-list');
  const current = getCurrentUser();
  if (!current) return;
  const q = query.toLowerCase().trim().replace(/^@/, '');
  const all = getUsers().filter(u => u.username !== current.username);

  let filtered = [];
  let title = '';

  if (q) {
    filtered = all.filter(u => u.username.includes(q) || u.name.toLowerCase().includes(q));
    title = 'Search Results';
  } else {
    filtered = all.filter(u => recentConvs.includes(u.username));
    title = filtered.length ? 'Recent Conversations' : '';
  }

  list.innerHTML = (title ? `<div class="list-heading">${title}</div>` : '') +
    filtered.map(u => `
      <div class="user-item ${selectedUser?.username === u.username ? 'active' : ''}" data-username="${u.username}">
        <div class="avatar">${avatarInitials(u.name)}</div>
        <div class="user-item-info">
          <div class="user-item-name">${escapeHtml(u.name)}</div>
          <div class="user-item-username">@${u.username}</div>
        </div>
        ${unreads[u.username] ? `<div class="unread-badge">${unreads[u.username]}</div>` : ''}
      </div>
    `).join('');

  list.querySelectorAll('.user-item').forEach(el => {
    el.addEventListener('click', () => {
      const user = all.find(u => u.username === el.dataset.username);
      if (user) openChat(user);
    });
  });
}

async function openChat(user) {
  selectedUser = user;
  delete unreads[user.username];
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('active-chat').classList.remove('hidden');
  document.getElementById('chat-header-avatar').textContent = avatarInitials(user.name);
  document.getElementById('chat-header-name').textContent = user.name;
  
  await fetchHistory(user);
  
  renderUserList(searchInput.value);
  closeSidebar();
}

async function fetchHistory(user) {
  const current = getCurrentUser();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(from.eq.${current.username},to.eq.${user.username}),and(from.eq.${user.username},to.eq.${current.username})`)
    .order('ts', { ascending: true });

  if (data) {
    const key = convKey(current.username, user.username);
    saveMessages(key, data);
    renderMessages();
  }
}

function renderMessages() {
  const current = getCurrentUser();
  const key = convKey(current.username, selectedUser.username);
  const msgs = getMessages(key);
  const area = document.getElementById('messages-area');

  area.innerHTML = msgs.map(m => {
    const isMe = m.from === current.username;
    const time = new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let content = escapeHtml(m.text);

    if (m.type === 'image') {
      content = `<img src="${m.media_url}" class="bubble-img" onclick="window.open(this.src)">`;
    } else if (m.type === 'video') {
      content = `<video src="${m.media_url}" class="bubble-video" controls></video>`;
    } else if (m.type === 'voice') {
      content = `<div class="bubble-voice">
                   <button class="btn-play" onclick="const a = new Audio('${m.media_url}'); a.play(); this.classList.toggle('playing')">▶</button>
                   <div class="voice-info">
                     <div class="voice-label">Voice Message</div>
                     <div class="voice-duration">${time}</div>
                   </div>
                 </div>`;
    } else if (m.type === 'circular') {
      content = `<div class="circular-container" onclick="const v=this.querySelector('video'); v.muted=!v.muted; this.classList.toggle('unmuted', !v.muted)">
                   <video src="${m.media_url}" class="circular-video" autoplay loop muted playsinline webkit-playsinline></video>
                   <div class="circular-hint">Tap to unmute</div>
                   <div class="circular-sound-icon">🔊</div>
                 </div>`;
    }

    return `
      <div class="msg-row ${isMe ? 'me' : 'them'}" data-ts="${m.ts}">
        <div class="bubble">
          ${content}
          <div class="bubble-time">${time}</div>
        </div>
      </div>
    `;
  }).join('');

  area.querySelectorAll('.bubble').forEach(b => {
    b.addEventListener('contextmenu', e => {
      e.preventDefault();
      const ts = parseInt(b.parentElement.dataset.ts);
      const msg = msgs.find(m => m.ts === ts);
      if (msg && msg.from === current.username) showContextMenu(e.pageX, e.pageY, msg);
    });
  });
  area.scrollTop = area.scrollHeight;
}

const contextMenu = document.getElementById('context-menu');
function showContextMenu(x, y, msg) {
  contextMsg = msg;
  contextMenu.style.left = x + 'px';
  contextMenu.style.top = y + 'px';
  contextMenu.classList.remove('hidden');
}
function hideContextMenu() { contextMenu.classList.add('hidden'); }

document.getElementById('btn-delete-msg')?.addEventListener('click', async () => {
  if (contextMsg) {
    const { error } = await supabase.from('messages').delete().eq('id', contextMsg.id);
    if (error) console.error('Error deleting message:', error);
  }
  hideContextMenu();
});

document.addEventListener('click', hideContextMenu);

// socket.io listeners replaced by initRealtime()

const msgInput = document.getElementById('msg-input');
const btnSend = document.getElementById('btn-send');

function toggleSendRecord() {
  const hasText = msgInput.value.trim().length > 0;
  if (hasText) {
    btnSend.classList.remove('hidden');
    btnRecord.classList.add('hidden');
  } else {
    btnSend.classList.add('hidden');
    btnRecord.classList.remove('hidden');
  }
}

msgInput?.addEventListener('input', toggleSendRecord);

async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !selectedUser) return;
  const msg = { 
    from: getCurrentUser().username, 
    to: selectedUser.username, 
    text: text, 
    ts: Date.now(), 
    type: 'text',
    media_url: null 
  };
  
  msgInput.value = '';
  toggleSendRecord();

  const { error } = await supabase.from('messages').insert([msg]);
  if (error) console.error('Error sending message:', error);
}

btnSend?.addEventListener('click', sendMessage);
msgInput?.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const btnBack = document.getElementById('btn-back');

btnBack?.addEventListener('click', () => {
  selectedUser = null;
  document.getElementById('active-chat').classList.add('hidden');
  document.getElementById('empty-state').style.display = 'flex';
  openSidebar();
});
function openSidebar() { sidebar.classList.add('open'); sidebarOverlay.style.display = 'block'; }
function closeSidebar() { sidebar.classList.remove('open'); sidebarOverlay.style.display = 'none'; }
sidebarOverlay?.addEventListener('click', closeSidebar);

function avatarInitials(name) {
  const p = name.trim().split(' ');
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
}
function escapeHtml(s) {
  return s ? s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
}

// Initial state
toggleSendRecord();

// Auto-login or init
const currentStart = getCurrentUser();
if (currentStart) {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
  initApp();
}