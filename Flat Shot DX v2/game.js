// =====================================================================
//  GUN RUNNER X  —  game.js  (v3: Username · Profiles · In-Game Nav)
// =====================================================================

// ===================== PROFILE / SAVE SYSTEM =====================
const PROFILES_KEY = 'gunrunnerx_profiles';
const ACTIVE_KEY   = 'gunrunnerx_active';

function loadProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY)) || []; } catch(e) { return []; }
}
function saveProfiles(arr) { localStorage.setItem(PROFILES_KEY, JSON.stringify(arr)); }
function getActiveProfile() {
  const id = localStorage.getItem(ACTIVE_KEY);
  const profiles = loadProfiles();
  return profiles.find(p => p.id === id) || profiles[0] || null;
}
function setActiveProfile(id) { localStorage.setItem(ACTIVE_KEY, id); }
function updateActiveProfile(data) {
  const profiles = loadProfiles();
  const idx = profiles.findIndex(p => p.id === data.id);
  if (idx >= 0) { profiles[idx] = data; saveProfiles(profiles); }
}

function createProfile(username, avatar, difficulty) {
  const id = 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
  const profile = {
    id, username, avatar,
    unlockedLevels: [1], scores: {}, rescuedTotal: 0,
    settings: { sfx: true, music: true, volume: 70, difficulty: difficulty || 'normal', fps: false },
    leaderboard: [], createdAt: Date.now()
  };
  const profiles = loadProfiles();
  profiles.push(profile);
  saveProfiles(profiles);
  setActiveProfile(id);
  return profile;
}

function deleteProfile(id) {
  let profiles = loadProfiles();
  profiles = profiles.filter(p => p.id !== id);
  saveProfiles(profiles);
  if (localStorage.getItem(ACTIVE_KEY) === id) {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

// ===================== ACTIVE GAME STATE =====================
let activeProfile = null;
let currentLevel  = 1;
let settings      = { sfx: true, music: true, volume: 70, difficulty: 'normal', fps: false };

function loadActiveState() {
  activeProfile = getActiveProfile();
  if (activeProfile) {
    settings = Object.assign({}, { sfx:true,music:true,volume:70,difficulty:'normal',fps:false }, activeProfile.settings);
    applySettingsUI();
  }
}

function persistProfile() {
  if (!activeProfile) return;
  activeProfile.settings = settings;
  updateActiveProfile(activeProfile);
}

// ===================== NEW GAME PANEL =====================
let ngSelectedAvatar = '🏃';
let ngSelectedDiff   = 'normal';

function showNewGamePanel() {
  showScreen('newgame-screen');
  initStars('starCanvas2');
  ngSelectedAvatar = '🏃';
  ngSelectedDiff   = 'normal';
  document.getElementById('ng-username').value = '';
  document.getElementById('ng-error').textContent = '';
  document.getElementById('ng-charcount').textContent = '0';
  document.querySelectorAll('.avatar-opt').forEach(el => el.classList.toggle('selected', el.dataset.av === '🏃'));
  document.querySelectorAll('.diff-pick').forEach(el => el.classList.toggle('active', el.id === 'ngd-normal'));
  setTimeout(() => document.getElementById('ng-username').focus(), 200);
}

function pickAvatar(el, av) {
  ngSelectedAvatar = av;
  document.querySelectorAll('.avatar-opt').forEach(e => e.classList.remove('selected'));
  el.classList.add('selected');
}

function pickDiff(d) {
  ngSelectedDiff = d;
  ['easy','normal','hard'].forEach(k => document.getElementById('ngd-' + k).classList.toggle('active', k === d));
  // also sync settings diff buttons
  setDiff(d);
}

function validateNewGame() {
  const val = document.getElementById('ng-username').value.trim();
  document.getElementById('ng-charcount').textContent = val.length;
  const err = document.getElementById('ng-error');
  if (val.length === 0) { err.textContent = ''; return false; }
  if (val.length < 2)   { err.textContent = 'MIN 2 CHARACTERS'; return false; }
  // Check duplicate
  const profiles = loadProfiles();
  if (profiles.some(p => p.username.toLowerCase() === val.toLowerCase())) {
    err.textContent = 'CALLSIGN ALREADY TAKEN!'; return false;
  }
  err.textContent = ''; return true;
}

function confirmNewGame() {
  const val = document.getElementById('ng-username').value.trim().toUpperCase();
  if (!val) { document.getElementById('ng-error').textContent = 'ENTER A CALLSIGN FIRST!'; return; }
  if (val.length < 2) { document.getElementById('ng-error').textContent = 'MIN 2 CHARACTERS'; return; }
  const profiles = loadProfiles();
  if (profiles.some(p => p.username.toLowerCase() === val.toLowerCase())) {
    document.getElementById('ng-error').textContent = 'CALLSIGN ALREADY TAKEN!'; return;
  }
  activeProfile = createProfile(val, ngSelectedAvatar, ngSelectedDiff);
  settings = Object.assign({}, activeProfile.settings);
  applySettingsUI();
  currentLevel = 1;
  showMapScreen();
}

// ===================== CONTINUE / PROFILE SELECT PANEL =====================
let csSelectedId = null;

function showContinuePanel() {
  showScreen('continue-screen');
  initStars('starCanvas3');
  csSelectedId = null;
  document.getElementById('cs-search').value = '';
  document.getElementById('cs-start').style.opacity    = '0.4';
  document.getElementById('cs-start').style.pointerEvents = 'none';
  renderProfileList('');
}

function renderProfileList(query) {
  const profiles = loadProfiles();
  const filtered = query
    ? profiles.filter(p => p.username.toLowerCase().includes(query.toLowerCase()))
    : profiles;

  const list = document.getElementById('profile-list');
  const none = document.getElementById('no-profiles');
  list.innerHTML = '';

  if (filtered.length === 0) {
    none.style.display = 'block';
    return;
  }
  none.style.display = 'none';

  // sort newest first
  [...filtered].sort((a,b) => (b.createdAt||0)-(a.createdAt||0)).forEach(p => {
    const levelsCleared = Object.keys(p.scores||{}).length;
    const bestScore = Object.values(p.scores||{}).reduce((a,b)=>Math.max(a,b),0);
    const card = document.createElement('div');
    card.className = 'profile-card' + (p.id === csSelectedId ? ' active-card' : '');
    card.innerHTML = `
      <div class="p-avatar">${p.avatar || '🏃'}</div>
      <div class="p-info">
        <div class="p-name">${escHtml(p.username)}</div>
        <div class="p-meta">LV ${Math.max(...(p.unlockedLevels||[1]))} REACHED &nbsp;·&nbsp; ${levelsCleared} CLEARED &nbsp;·&nbsp; BEST: ${bestScore.toLocaleString()}</div>
        <div class="p-rescued">🧑 ${p.rescuedTotal||0} RESCUED &nbsp;·&nbsp; DIFF: ${(p.settings?.difficulty||'normal').toUpperCase()}</div>
      </div>
      <div class="p-check">✓</div>
      <button class="p-delete" onclick="event.stopPropagation();deleteProfileUI('${p.id}')">✕</button>
    `;
    card.addEventListener('click', () => selectProfile(p.id));
    list.appendChild(card);
  });
}

function selectProfile(id) {
  csSelectedId = id;
  document.querySelectorAll('.profile-card').forEach(c => c.classList.remove('active-card'));
  const profiles = loadProfiles();
  const p = profiles.find(x => x.id === id);
  if (!p) return;

  // Highlight selected
  event && event.currentTarget && event.currentTarget.classList.add('active-card');
  // re-render to apply class
  const q = document.getElementById('cs-search').value;
  renderProfileList(q);

  // Enable Load button
  const btn = document.getElementById('cs-start');
  btn.style.opacity = '1'; btn.style.pointerEvents = 'all';
}

function confirmContinue() {
  if (!csSelectedId) return;
  const profiles = loadProfiles();
  const p = profiles.find(x => x.id === csSelectedId);
  if (!p) return;
  activeProfile = p;
  setActiveProfile(p.id);
  settings = Object.assign({}, { sfx:true,music:true,volume:70,difficulty:'normal',fps:false }, p.settings);
  applySettingsUI();
  currentLevel = Math.max(...(p.unlockedLevels || [1]));
  showMapScreen();
}

function filterProfiles() {
  const q = document.getElementById('cs-search').value;
  renderProfileList(q);
}

function clearSearch() {
  document.getElementById('cs-search').value = '';
  renderProfileList('');
}

function deleteProfileUI(id) {
  const profiles = loadProfiles();
  const p = profiles.find(x => x.id === id);
  if (!p) return;
  if (!confirm('DELETE profile "' + p.username + '"? This cannot be undone.')) return;
  deleteProfile(id);
  if (csSelectedId === id) {
    csSelectedId = null;
    document.getElementById('cs-start').style.opacity = '0.4';
    document.getElementById('cs-start').style.pointerEvents = 'none';
  }
  const q = document.getElementById('cs-search').value;
  renderProfileList(q);
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ===================== STARS =====================
function initStars(canvasId) {
  const c = document.getElementById(canvasId);
  if (!c || c._running) return;
  c._running = true;
  c.width  = window.innerWidth;
  c.height = window.innerHeight;
  const ctx = c.getContext('2d'), stars = [];
  for (let i = 0; i < 200; i++) stars.push({ x: Math.random()*c.width, y: Math.random()*c.height, r: Math.random()*1.5+0.3, s: Math.random()*0.5+0.1, o: Math.random() });
  function draw() {
    if (!document.getElementById(canvasId)) return;
    ctx.clearRect(0,0,c.width,c.height);
    stars.forEach(s => { s.o += s.s*0.02; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fillStyle=`rgba(255,255,255,${0.3+0.7*Math.abs(Math.sin(s.o))})`; ctx.fill(); });
    requestAnimationFrame(draw);
  }
  draw();
}

// ===================== SCREEN NAVIGATION =====================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('hud').classList.remove('active');
  document.getElementById('game-nav').classList.remove('active');
  document.getElementById('gameCanvas').style.display = 'none';
  stopGame();
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function showTitle() {
  showScreen('title-screen');
  initStars('starCanvas');
  updateTitleStats();
}

function showHowToPlay() {
  showScreen('howtoplay-screen');
  initStars('starCanvas4');
}
function htpGoToGame() {
  if (activeProfile) showMapScreen();
  else showNewGamePanel();
}

function showSettings()    { showScreen('settings-screen'); }
function showLeaderboard() { buildLeaderboard(); showScreen('leaderboard-screen'); }

function showMapScreen() {
  buildMap();
  showScreen('map-screen');
  // Show player badge
  if (activeProfile) {
    document.getElementById('map-player-badge').style.display = 'flex';
    document.getElementById('map-player-avatar').textContent = activeProfile.avatar || '🏃';
    document.getElementById('map-player-name').textContent   = activeProfile.username;
    document.getElementById('map-player-rescued').textContent = '🧑 ' + (activeProfile.rescuedTotal || 0);
  }
}

function updateTitleStats() {
  const profiles = loadProfiles();
  const total = profiles.reduce((s, p) => s + (p.rescuedTotal || 0), 0);
  const el = document.getElementById('rescued-stat');
  if (el) el.textContent = total;
}

// ===================== MAP =====================
const LEVEL_CONFIG = [
  { id:1, name:'SLUM ALLEY',  x:12, y:75, color:'#ffcc00' },
  { id:2, name:'FACTORY',     x:28, y:55, color:'#ffcc00' },
  { id:3, name:'SEWER',       x:44, y:70, color:'#ffcc00' },
  { id:4, name:'ROOFTOP',     x:58, y:42, color:'#ffcc00' },
  { id:5, name:'ALIEN LAB',   x:72, y:60, color:'#ff6600' },
  { id:6, name:'MOTHERSHIP',  x:85, y:38, color:'#ff6600' },
];

function buildMap() {
  const world = document.getElementById('map-world');
  world.querySelectorAll('.level-node, .map-lbl').forEach(e => e.remove());
  const w = world.offsetWidth  || 700;
  const h = world.offsetHeight || 400;
  const mc = document.getElementById('mapCanvas');
  mc.width = w; mc.height = h;
  const ctx = mc.getContext('2d');
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = '#0d2215'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = '#ffffff08'; ctx.lineWidth = 1;
  for (let x=0; x<w; x+=32){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  for (let y=0; y<h; y+=32){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }

  const unlocked = activeProfile ? (activeProfile.unlockedLevels||[1]) : [1];
  const scores   = activeProfile ? (activeProfile.scores||{}) : {};

  for (let i=0; i<LEVEL_CONFIG.length-1; i++) {
    const a=LEVEL_CONFIG[i], b=LEVEL_CONFIG[i+1];
    ctx.beginPath(); ctx.moveTo(a.x/100*w, a.y/100*h); ctx.lineTo(b.x/100*w, b.y/100*h);
    ctx.strokeStyle = unlocked.includes(b.id) ? '#4eff9166' : '#33333388';
    ctx.lineWidth=3; ctx.setLineDash([8,6]); ctx.stroke(); ctx.setLineDash([]);
  }

  LEVEL_CONFIG.forEach(lv => {
    const locked    = !unlocked.includes(lv.id);
    const completed = scores[lv.id] !== undefined;
    const node = document.createElement('div');
    node.className = 'level-node ' + (locked ? 'locked' : completed ? 'completed' : 'available');
    node.style.left = lv.x + '%'; node.style.top = lv.y + '%';
    node.innerHTML = `<span class="lv-num">${locked ? '🔒' : lv.id}</span><span class="lv-star">${completed ? '★★★' : locked ? '' : '▶'}</span>`;
    node.title = lv.name;
    if (!locked) node.onclick = () => { currentLevel = lv.id; launchLevel(lv.id); };
    world.appendChild(node);

    const lbl = document.createElement('div');
    lbl.className = 'map-lbl';
    lbl.style.cssText = `position:absolute;left:${lv.x}%;top:${lv.y+7}%;transform:translate(-50%,12px);color:${locked?'#555':completed?'#4eff91':'#ffcc00'};font-size:7px;text-align:center;pointer-events:none;text-shadow:0 0 6px currentColor;font-family:'Press Start 2P',monospace;`;
    lbl.textContent = lv.name;
    world.appendChild(lbl);
  });
}

// ===================== LEADERBOARD =====================
function addScore(level, sc, kl, rescued) {
  if (!activeProfile) return;
  const name = activeProfile.username;
  activeProfile.leaderboard = activeProfile.leaderboard || [];
  activeProfile.leaderboard.push({ name, level, score:sc, kills:kl, rescued:rescued||0, date:Date.now() });
  activeProfile.leaderboard.sort((a,b) => b.score-a.score);
  activeProfile.leaderboard = activeProfile.leaderboard.slice(0,20);
  persistProfile();
}

function buildLeaderboard() {
  // Aggregate all profiles
  const profiles = loadProfiles();
  let all = [];
  profiles.forEach(p => {
    (p.leaderboard||[]).forEach(e => all.push({ ...e, profileName: p.username, avatar: p.avatar||'🏃' }));
  });
  if (all.length < 5) {
    const bots = ['ACE','NOVA','BLAZE','RAVEN','COBRA','SHADOW','VIPER'];
    for (let i=0; i<8; i++) all.push({ name:bots[i%bots.length], level:Math.ceil(Math.random()*6), score:Math.floor(Math.random()*15000+2000), kills:Math.floor(Math.random()*40+5), rescued:Math.floor(Math.random()*5), profileName:bots[i%bots.length], avatar:'🤖' });
  }
  all.sort((a,b) => b.score-a.score);
  all = all.slice(0,12);

  const rows = document.getElementById('lb-rows');
  rows.innerHTML = '';
  const myName = activeProfile ? activeProfile.username : '';
  all.forEach((e,i) => {
    const isMe = e.name === myName || e.profileName === myName;
    const row = document.createElement('div');
    row.className = 'lb-row' + (isMe?' you':'') + (i===0?' top1':i===1?' top2':i===2?' top3':'');
    row.innerHTML = `<span class="rank">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</span><span>${e.avatar||'🏃'} ${escHtml(e.name)}</span><span>LV${e.level}</span><span>${e.score.toLocaleString()}</span><span>🧑${e.rescued||0}</span>`;
    rows.appendChild(row);
  });
}

// ===================== SETTINGS UI =====================
function toggleSetting(key) {
  settings[key] = !settings[key];
  const btn = document.getElementById(key+'-toggle');
  if (btn) { btn.textContent = settings[key]?'ON':'OFF'; btn.classList.toggle('on', settings[key]); }
  persistProfile();
}
function setDiff(d) {
  settings.difficulty = d;
  ['easy','normal','hard'].forEach(k => { const b=document.getElementById('diff-'+k); if(b) b.classList.toggle('on', k===d); });
  persistProfile();
}
function applySettingsUI() {
  ['sfx','music','fps'].forEach(k => {
    const btn = document.getElementById(k+'-toggle');
    if (btn) { btn.textContent = settings[k]?'ON':'OFF'; btn.classList.toggle('on', settings[k]); }
  });
  const vs = document.getElementById('vol-slider');
  const vv = document.getElementById('vol-val');
  if (vs) vs.value = settings.volume;
  if (vv) vv.textContent = settings.volume;
  setDiff(settings.difficulty);
}
const volSlider = document.getElementById('vol-slider');
if (volSlider) volSlider.addEventListener('input', function() {
  document.getElementById('vol-val').textContent = this.value;
  settings.volume = parseInt(this.value);
  persistProfile();
});

// ===================== AUDIO =====================
let audioCtx = null;
function getAudio() { if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); return audioCtx; }
function playSound(freq, dur, type='square', vol=0.15) {
  if (!settings.sfx) return;
  try {
    const a=getAudio(), o=a.createOscillator(), g=a.createGain();
    o.connect(g); g.connect(a.destination); o.type=type;
    o.frequency.setValueAtTime(freq, a.currentTime);
    g.gain.setValueAtTime(vol*settings.volume/100, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime+dur);
    o.start(); o.stop(a.currentTime+dur);
  } catch(e) {}
}
function playShoot()  { playSound(800,0.08,'sawtooth',0.1); setTimeout(()=>playSound(400,0.05,'square',0.05),50); }
function playJump()   { playSound(300,0.1,'sine',0.12); setTimeout(()=>playSound(500,0.08,'sine',0.08),80); }
function playHit()    { playSound(200,0.15,'sawtooth',0.15); }
function playDie()    { [400,300,200,150,100].forEach((f,i)=>setTimeout(()=>playSound(f,0.1,'sawtooth',0.2),i*60)); }
function playPickup() { playSound(600,0.05,'sine'); setTimeout(()=>playSound(800,0.05,'sine'),60); }
function playWin()    { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playSound(f,0.2,'sine',0.2),i*120)); }
function playRescue() { [400,500,700,900,1100].forEach((f,i)=>setTimeout(()=>playSound(f,0.12,'sine',0.18),i*70)); }
function playAlarm()  { playSound(880,0.05,'sawtooth',0.07); setTimeout(()=>playSound(660,0.05,'sawtooth',0.07),80); }
function playBossHit(){ playSound(150,0.2,'sawtooth',0.18); }

// ===================== ENGINE GLOBALS =====================
let gCanvas, gCtx, gRunning=false, gAnim=null;
let gW, gH, scrollX=0;
let player, bullets, enemies, particles, pickups, prisoners, floatingTexts;
let score=0, kills=0, levelTimer=0, prisonersRescued=0;
let pressedKeys={}, mouseX=0, mouseY=0, lastShot=0;
const shootCooldown=180;
let levelData=null, fpsCounter=0, fpsLast=0, fpsDisplay=0, screenShake=0;
let pauseAction = null; // 'map' | 'title'

// ===================== PAUSE / NAV =====================
function pauseToMap() {
  if (!gRunning) { showMapScreen(); return; }
  pauseAction = 'map';
  gRunning = false;
  document.getElementById('pause-msg').textContent = 'RETURN TO MISSION MAP?';
  document.getElementById('overlay-pause').classList.add('active');
}
function pauseToTitle() {
  if (!gRunning) { showTitle(); return; }
  pauseAction = 'title';
  gRunning = false;
  document.getElementById('pause-msg').textContent = 'RETURN TO MAIN MENU?';
  document.getElementById('overlay-pause').classList.add('active');
}
function resumeGame() {
  document.getElementById('overlay-pause').classList.remove('active');
  gRunning = true;
  gameLoop();
}
function executePauseAction() {
  document.getElementById('overlay-pause').classList.remove('active');
  stopGame();
  if (pauseAction === 'map')   showMapScreen();
  else                         showTitle();
}

// ===================== STOP GAME =====================
function stopGame() {
  gRunning = false;
  if (gAnim) { cancelAnimationFrame(gAnim); gAnim = null; }
  ['overlay-win','overlay-lose','overlay-pause'].forEach(id => {
    const el = document.getElementById(id); if (el) el.classList.remove('active');
  });
}

// ===================== LAUNCH LEVEL =====================
function launchLevel(lvId) {
  currentLevel=lvId; score=0; kills=0; levelTimer=0; prisonersRescued=0; screenShake=0;
  document.getElementById('hud-level').textContent = lvId;

  gCanvas = document.getElementById('gameCanvas');
  gW=window.innerWidth; gH=window.innerHeight;
  gCanvas.width=gW; gCanvas.height=gH; gCanvas.style.display='block';
  gCtx = gCanvas.getContext('2d');

  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('hud').classList.add('active');
  document.getElementById('game-nav').classList.add('active');

  // Update in-game nav player info
  if (activeProfile) {
    document.getElementById('gn-avatar').textContent = activeProfile.avatar || '🏃';
    document.getElementById('gn-name').textContent   = activeProfile.username;
  }

  levelData = generateLevel(lvId); scrollX=0;
  player = { x:100, y:gH-200, w:28, h:40, vx:0, vy:0, hp:100, maxHp:100, ammo:30, maxAmmo:30, onGround:false, facingRight:true, dashing:false, dashTimer:0, dead:false, frame:0, frameTimer:0 };
  bullets=[]; enemies=[]; particles=[]; pickups=[]; prisoners=[]; floatingTexts=[];
  spawnLevelEntities(lvId);
  updateHUD();
  gCanvas.addEventListener('mousemove', onMouseMove);
  gCanvas.addEventListener('click', onShoot);
  gRunning=true; gameLoop();
}

// ===================== INPUT =====================
function onMouseMove(e){ mouseX=e.clientX; mouseY=e.clientY; }
function onShoot(){ shoot(); }
document.addEventListener('keydown', e => {
  pressedKeys[e.code]=true;
  if (['Space','ArrowUp','KeyW'].includes(e.code)) e.preventDefault();
  if (['KeyZ','KeyX'].includes(e.code)) shoot();
  if (e.code==='Escape' && gRunning) pauseToMap();
});
document.addEventListener('keyup', e => { pressedKeys[e.code]=false; });

// ===================== SHOOT =====================
function shoot() {
  if (!gRunning||!player||player.dead) return;
  const now=Date.now();
  if (now-lastShot<shootCooldown) return;
  if (player.ammo<=0){ playSound(100,0.1,'square',0.05); return; }
  lastShot=now; player.ammo--;
  const px=player.x-scrollX+player.w/2, py=player.y+player.h/2;
  let dx=mouseX-px, dy=mouseY-py, len=Math.hypot(dx,dy);
  if (len>0){ dx/=len; dy/=len; } else { dx=player.facingRight?1:-1; dy=0; }
  if (dx>0) player.facingRight=true; else if (dx<0) player.facingRight=false;
  bullets.push({ x:px+scrollX, y:py, vx:dx*14, vy:dy*14, life:65, fromPlayer:true, w:8, h:4 });
  spawnParticles(px+scrollX, py, 3, '#ff9500', 2);
  playShoot(); updateHUD();
}

// ===================== ALIEN BOSS DESIGNS =====================
const ALIEN_BOSS_DEFS = [
  { name:'SLUDGE LURKER', color:'#22cc44', eyeColor:'#ffff00', accentColor:'#006622', w:60, h:68,  attackStyle:'slam',        tentacles:true,  legs:true,  glowColor:'#22cc4488' },
  { name:'FORGE TITAN',   color:'#ff6600', eyeColor:'#ffff00', accentColor:'#993300', w:70, h:78,  attackStyle:'spread',      tentacles:false, legs:true,  glowColor:'#ff660066' },
  { name:'AQUA PHANTOM',  color:'#0066ff', eyeColor:'#00ffff', accentColor:'#003399', w:65, h:74,  attackStyle:'homing',      tentacles:true,  legs:false, glowColor:'#0066ff66' },
  { name:'SHADOW WRAITH', color:'#9900ff', eyeColor:'#ff00ff', accentColor:'#440088', w:60, h:80,  attackStyle:'teleport',    tentacles:true,  legs:false, glowColor:'#9900ff88' },
  { name:'ACID OVERLORD', color:'#aaff00', eyeColor:'#ff4400', accentColor:'#447700', w:80, h:88,  attackStyle:'acid_spread', tentacles:true,  legs:true,  glowColor:'#aaff0066' },
  { name:'VOID EMPEROR',  color:'#220044', eyeColor:'#ff00aa', accentColor:'#8800ff', w:96, h:108, attackStyle:'void',        tentacles:true,  legs:true,  glowColor:'#8800ffaa' },
];

// ===================== LEVEL GENERATION =====================
function generateLevel(lvId) {
  const diffMult = { easy:0.7, normal:1, hard:1.5 }[settings.difficulty]||1;
  const configs = [
    { width:3200, bgColor:['#1a0d00','#2d1500'], groundColor:'#4a3520', platformColor:'#6b4f2e', enemyCount:Math.ceil(8 *diffMult), flyerCount:Math.ceil(2*diffMult), prisonerCount:3, theme:'slum'       },
    { width:3600, bgColor:['#0d1a00','#1a2d00'], groundColor:'#3a4a25', platformColor:'#556b2f', enemyCount:Math.ceil(11*diffMult), flyerCount:Math.ceil(3*diffMult), prisonerCount:4, theme:'factory'    },
    { width:4000, bgColor:['#000d1a','#001a2d'], groundColor:'#254a3a', platformColor:'#2f7a5a', enemyCount:Math.ceil(13*diffMult), flyerCount:Math.ceil(4*diffMult), prisonerCount:4, theme:'sewer'      },
    { width:4400, bgColor:['#1a001a','#2d002d'], groundColor:'#3a1540', platformColor:'#6b2f8b', enemyCount:Math.ceil(15*diffMult), flyerCount:Math.ceil(5*diffMult), prisonerCount:5, theme:'rooftop'    },
    { width:4800, bgColor:['#001a1a','#002d2d'], groundColor:'#154040', platformColor:'#2a7070', enemyCount:Math.ceil(17*diffMult), flyerCount:Math.ceil(6*diffMult), prisonerCount:5, theme:'alien_lab'  },
    { width:5200, bgColor:['#0a0015','#1a0030'], groundColor:'#1a0a30', platformColor:'#4a2080', enemyCount:Math.ceil(20*diffMult), flyerCount:Math.ceil(8*diffMult), prisonerCount:6, theme:'mothership', finalBoss:true },
  ];
  const cfg=configs[Math.min(lvId-1,5)];
  const plats=[], groundY=gH-80;
  plats.push({ x:0, y:groundY, w:cfg.width, h:80, isGround:true, color:cfg.groundColor });
  const gapChance=0.15+lvId*0.03;
  for (let gx=400; gx<cfg.width-300; gx+=200+Math.random()*100)
    if (Math.random()<gapChance) plats.push({ x:gx, y:groundY-60-Math.random()*80, w:80+Math.random()*60, h:18, color:cfg.platformColor });
  for (let i=0; i<22+lvId*3; i++)
    plats.push({ x:200+i*200+Math.random()*100, y:groundY-80-Math.random()*220, w:80+Math.random()*80, h:18, color:cfg.platformColor });
  for (let c=0; c<cfg.prisonerCount; c++) {
    const cx=600+c*Math.floor((cfg.width-1200)/cfg.prisonerCount)+Math.random()*200;
    const cy=groundY-110-Math.random()*140;
    plats.push({ x:cx, y:cy, w:64, h:18, color:'#886600', isCage:true, cageX:cx, cageY:cy });
  }

  // ── LEVEL 6 FINAL BOSS ARENA ──
  // Place the VOID EMPEROR on a high throne platform at the top.
  // Build a staircase of STAR BOUNCE pads so the player must leap up to stomp it.
  if (cfg.finalBoss) {
    const arenaX = cfg.width - 1400;
    const bossThrone = groundY - 380; // boss sits way up high
    // Boss throne platform
    plats.push({ x:arenaX+300, y:bossThrone, w:220, h:24, color:'#8800ff', isBossThrone:true });
    // Bouncy star pads — zigzag staircase up
    const starPositions = [
      { x:arenaX+20,  y:groundY-120 },
      { x:arenaX+140, y:groundY-210 },
      { x:arenaX+50,  y:groundY-290 },
      { x:arenaX+200, y:groundY-360 }, // near throne level
      { x:arenaX+400, y:groundY-120 },
      { x:arenaX+520, y:groundY-220 },
      { x:arenaX+440, y:groundY-320 },
    ];
    starPositions.forEach(sp => {
      plats.push({ x:sp.x, y:sp.y, w:70, h:18, color:'#ffcc00', isStarBounce:true, starX:sp.x, starY:sp.y, animT:Math.random()*Math.PI*2 });
    });
    // Warning sign
    plats.push({ x:arenaX-60, y:groundY-80, w:4, h:80, color:'#ff4500', isWarningPost:true });
  }

  const endX=cfg.width-200;
  plats.push({ x:endX, y:groundY-120, w:80, h:18, color:'#4eff91', isEnd:true });
  cfg.platforms=plats; cfg.groundY=groundY; cfg.endX=endX;
  const bossHpTable=[200,280,360,440,550,900];
  cfg.bossHp=Math.ceil(bossHpTable[Math.min(lvId-1,5)]*diffMult);
  return cfg;
}

// ===================== SPAWN ENTITIES =====================
function spawnLevelEntities(lvId) {
  const cfg=levelData, groundY=cfg.groundY;
  const diffMult={ easy:0.7, normal:1, hard:1.5 }[settings.difficulty]||1;
  for (let i=0; i<cfg.enemyCount; i++) {
    const ex=400+Math.random()*(cfg.width-700);
    enemies.push({ x:ex, y:groundY-48, w:28, h:40, vx:(Math.random()<0.5?1:-1)*(1+lvId*0.18), vy:0, hp:Math.ceil((28+lvId*10)*diffMult), maxHp:Math.ceil((28+lvId*10)*diffMult), type:Math.random()<0.3?'shooter':'walker', onGround:false, shootTimer:Math.random()*100+40, dead:false, isFlyer:false });
  }
  for (let i=0; i<cfg.flyerCount; i++) {
    const fx=500+Math.random()*(cfg.width-900), fy=groundY-160-Math.random()*180;
    enemies.push({ x:fx, y:fy, w:34, h:28, vx:(Math.random()<0.5?1:-1)*(1.6+lvId*0.22), vy:0, hp:Math.ceil((22+lvId*8)*diffMult), maxHp:Math.ceil((22+lvId*8)*diffMult), type:'flyer', onGround:false, shootTimer:Math.random()*80+40, floatTimer:Math.random()*Math.PI*2, floatAmp:40+Math.random()*40, baseY:fy, dead:false, isFlyer:true });
  }
  const bossDef=ALIEN_BOSS_DEFS[Math.min(lvId-1,5)];
  // Level 6: final boss spawns on throne platform high above
  let bossSpawnX = cfg.width-500, bossSpawnY = cfg.groundY-bossDef.h;
  if (lvId === 6) {
    const throne = cfg.platforms.find(p=>p.isBossThrone);
    if (throne) { bossSpawnX = throne.x + throne.w/2 - bossDef.w/2; bossSpawnY = throne.y - bossDef.h; }
  }
  enemies.push({ x:bossSpawnX, y:bossSpawnY, w:bossDef.w, h:bossDef.h, vx:-1.2, vy:0, hp:cfg.bossHp, maxHp:cfg.bossHp, type:'alien_boss', onGround:false, shootTimer:55, enraged:false, enrageThreshold:0.4, attackStyle:bossDef.attackStyle, bossDef:bossDef, teleportTimer:0, dead:false, isBoss:true, name:bossDef.name,
    isFinalBoss: lvId===6, stompHitsNeeded: Math.ceil(9*({easy:0.7,normal:1,hard:1.5}[settings.difficulty]||1)), stompHits:0 });
  const cagePlats=cfg.platforms.filter(p=>p.isCage);
  cagePlats.forEach((cp,idx)=>{
    prisoners.push({ x:cp.cageX+12, y:cp.cageY-36, w:20, h:30, freed:false, cageX:cp.cageX, cageY:cp.cageY, animTimer:Math.random()*100, id:idx });
  });
  for (let i=0; i<12; i++)
    pickups.push({ x:300+Math.random()*(cfg.width-600), y:cfg.groundY-30, w:20, h:20, type:Math.random()<0.5?'ammo':'health', collected:false });
}

// ===================== PHYSICS =====================
function resolveCollision(obj) {
  if (obj.isFlyer) return;
  obj.onGround=false;
  levelData.platforms.forEach(p=>{
    if (obj.x+obj.w>p.x && obj.x<p.x+p.w && obj.y+obj.h>p.y && obj.y<p.y+p.h) {
      const fL=obj.x+obj.w-p.x, fR=p.x+p.w-obj.x, fT=obj.y+obj.h-p.y, fB=p.y+p.h-obj.y;
      const m=Math.min(fL,fR,fT,fB);
      if (m===fT && obj.vy>=0) {
        obj.y=p.y-obj.h; obj.vy=0; obj.onGround=true;
        // ── STAR BOUNCE: launch player UP ──
        if (p.isStarBounce && obj===player) {
          obj.vy = -26; obj.onGround = false;
          spawnParticles(obj.x+obj.w/2, obj.y+obj.h, 18, '#ffff00', 6);
          spawnParticles(obj.x+obj.w/2, obj.y+obj.h, 12, '#ff9500', 4);
          addFloatText(obj.x+obj.w/2-scrollX, obj.y-10, '⭐ BOUNCE!', '#ffff00');
          playJump();
        }
      }
      else if (m===fB && obj.vy<0) { obj.y=p.y+p.h;   obj.vy=0; }
      else if (m===fL)             { obj.x=p.x-obj.w;  obj.vx*=-0.5; }
      else if (m===fR)             { obj.x=p.x+p.w;    obj.vx*=-0.5; }
    }
  });
}
function rectsOverlap(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }
function spawnParticles(x,y,n,color,spd){
  for (let i=0;i<n;i++){ const a=Math.random()*Math.PI*2, s=Math.random()*spd; particles.push({ x,y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:20+Math.random()*20, maxLife:40, color, alpha:1, size:2+Math.random()*3 }); }
}
function addFloatText(x,y,text,color){ floatingTexts.push({ x,y,text, color:color||'#fff', life:80, maxLife:80 }); }

// ===================== RESCUE =====================
function freePrisoner(pr){
  if (pr.freed) return;
  pr.freed=true; prisonersRescued++;
  score+=300;
  if (activeProfile){ activeProfile.rescuedTotal=(activeProfile.rescuedTotal||0)+1; persistProfile(); }
  for (let i=0;i<28;i++){ const a=Math.random()*Math.PI*2,s=Math.random()*5+2; particles.push({ x:pr.x+10,y:pr.y+15, vx:Math.cos(a)*s,vy:Math.sin(a)*s, life:45,maxLife:45, color:i%2===0?'#ffff00':'#00ffcc', alpha:1, size:3+Math.random()*3 }); }
  addFloatText(pr.x-scrollX, pr.y-15, '🧑 RESCUED! +300', '#00ffcc');
  playRescue(); updateHUD();
}

// ===================== GAME LOOP =====================
function gameLoop(){
  if (!gRunning) return;
  const now=Date.now(); fpsCounter++;
  if (now-fpsLast>=1000){ fpsDisplay=fpsCounter; fpsCounter=0; fpsLast=now; }
  update(); render();
  gAnim=requestAnimationFrame(gameLoop);
}

// ===================== UPDATE =====================
function update(){
  if (!player||player.dead) return;
  levelTimer++;
  if (screenShake>0) screenShake-=0.6;
  const spd=5+(player.dashing?5:0);
  if (pressedKeys['ArrowLeft']||pressedKeys['KeyA'])       { player.vx=-spd; player.facingRight=false; }
  else if (pressedKeys['ArrowRight']||pressedKeys['KeyD']) { player.vx= spd; player.facingRight=true; }
  else player.vx*=0.8;
  if ((pressedKeys['Space']||pressedKeys['ArrowUp']||pressedKeys['KeyW']) && player.onGround){ player.vy=-15; playJump(); }
  if ((pressedKeys['ShiftLeft']||pressedKeys['ShiftRight']) && !player.dashing){ player.dashing=true; player.dashTimer=14; }
  if (player.dashTimer>0){ player.dashTimer--; if(player.dashTimer<=0) player.dashing=false; }
  if (player.ammo<=0 && levelTimer%280===0){ player.ammo=Math.min(player.maxAmmo,player.ammo+10); playPickup(); updateHUD(); }
  player.vy+=0.7; player.x+=player.vx; player.y+=player.vy;
  player.x=Math.max(0,Math.min(levelData.width-player.w,player.x));
  if (player.y>gH+100) player.hp=0;
  resolveCollision(player);
  prisoners.forEach(pr=>{ if (!pr.freed && Math.hypot((pr.x+10)-(player.x+14),(pr.y+15)-(player.y+20))<44) freePrisoner(pr); });
  const tSX=player.x-gW*0.35; scrollX+=(tSX-scrollX)*0.1; scrollX=Math.max(0,Math.min(levelData.width-gW,scrollX));

  bullets=bullets.filter(b=>{
    b.x+=b.vx; b.y+=b.vy; b.life--;
    if (b.life<=0) return false;
    if (b.homing){ const tx=player.x+14,ty=player.y+20,hl=Math.hypot(tx-b.x,ty-b.y); if(hl>0){b.vx+=(tx-b.x)/hl*0.35;b.vy+=(ty-b.y)/hl*0.35;} const sp=Math.hypot(b.vx,b.vy); if(sp>7){b.vx=b.vx/sp*7;b.vy=b.vy/sp*7;} }
    if (!b.homing) for(const p of levelData.platforms){ if(b.x>p.x&&b.x<p.x+p.w&&b.y>p.y&&b.y<p.y+p.h){ spawnParticles(b.x,b.y,4,'#ffcc00',3); return false; } }
    return true;
  });
  bullets.filter(b=>!b.fromPlayer).forEach(b=>{ if(!player.dead&&rectsOverlap(b,player)){ player.hp-=b.dmg||8; spawnParticles(player.x+14,player.y+20,6,'#ff3344',3); playHit(); updateHUD(); b.life=0; } });
  bullets=bullets.filter(b=>b.life>0);

  enemies.forEach(e=>{
    if (e.dead) return;
    if      (e.type==='alien_boss') updateAlienBoss(e);
    else if (e.isFlyer)             updateFlyer(e);
    else                            updateGroundEnemy(e);
    bullets.filter(b=>b.fromPlayer).forEach(b=>{
      if (!rectsOverlap(b,e)) return;
      const dmg=settings.difficulty==='hard'?10:settings.difficulty==='easy'?22:15;
      e.hp-=dmg; b.life=0; score+=10;
      spawnParticles(b.x,b.y,5,e.isBoss?'#ff00ff':'#ff6600',3);
      if (e.isBoss){ playBossHit(); screenShake=6; }
      addFloatText(e.x+e.w/2-scrollX, e.y-10, '-'+dmg, e.isBoss?'#ff00ff':'#ffaa00');
      if (e.hp<=0){
        e.dead=true; kills++;
        const bonus=e.isBoss?(1000+currentLevel*500):e.isFlyer?120:60;
        score+=bonus; screenShake=e.isBoss?22:5;
        spawnParticles(e.x+e.w/2,e.y+e.h/2,e.isBoss?55:14,e.isBoss?'#ff00ff':'#ff4400',e.isBoss?9:4);
        addFloatText(e.x+e.w/2-scrollX,e.y-30,e.isBoss?'👾 BOSS DOWN! +'+bonus:'+'+bonus,'#ffff00');
        if (e.isBoss){ playWin(); doExplosions(e); }
        updateHUD();
      }
    });
  });

  pickups.filter(p=>!p.collected).forEach(p=>{
    if(rectsOverlap(p,player)){ p.collected=true; if(p.type==='ammo'){player.ammo=Math.min(player.maxAmmo,player.ammo+15);score+=20;}else{player.hp=Math.min(player.maxHp,player.hp+25);score+=20;} spawnParticles(p.x+10,p.y+10,8,'#4eff91',4); playPickup(); updateHUD(); }
  });
  particles.forEach(p=>{ p.x+=p.vx;p.y+=p.vy;p.vy+=0.15;p.life--;p.alpha=p.life/p.maxLife; });
  particles=particles.filter(p=>p.life>0);
  floatingTexts.forEach(t=>{t.y-=0.6;t.life--;});
  floatingTexts=floatingTexts.filter(t=>t.life>0);
  prisoners.filter(pr=>pr.freed).forEach(pr=>{pr.x+=2.5;pr.animTimer++;});

  // ── STAR BOUNCE PLATFORMS ──
  levelData.platforms.filter(p=>p.isStarBounce).forEach(p=>{ p.animT = (p.animT||0) + 0.05; });

  // ── FINAL BOSS STOMP DETECTION (Level 6) ──
  if (currentLevel === 6) {
    const fb = enemies.find(e=>e.isBoss&&e.isFinalBoss&&!e.dead);
    if (fb && player && !player.dead) {
      // Player must be falling (vy > 2) and landing on top of boss
      const stomped = player.vy > 2
        && player.x + player.w > fb.x + 8
        && player.x < fb.x + fb.w - 8
        && player.y + player.h > fb.y
        && player.y + player.h < fb.y + fb.h * 0.45;
      if (stomped) {
        player.vy = -16; // bounce player back up
        fb.stompHits = (fb.stompHits||0) + 1;
        const stompDmg = Math.ceil(fb.maxHp / (fb.stompHitsNeeded||9));
        fb.hp -= stompDmg;
        score += 250;
        screenShake = 14;
        spawnParticles(fb.x+fb.w/2, fb.y, 30, '#ffff00', 8);
        spawnParticles(fb.x+fb.w/2, fb.y, 20, '#ff00aa', 6);
        addFloatText(fb.x+fb.w/2-scrollX, fb.y-30, '⭐ STOMP! -'+stompDmg, '#ffff00');
        playBossHit();
        updateHUD();
        if (!fb.enraged && fb.hp < fb.maxHp * fb.enrageThreshold) {
          fb.enraged = true; screenShake=22;
          addFloatText(fb.x+fb.w/2-scrollX, fb.y-60, '⚡ ENRAGED!','#ff0000');
          spawnParticles(fb.x+fb.w/2,fb.y+fb.h/2,55,fb.bossDef.color,9);
        }
        if (fb.hp <= 0) {
          fb.dead = true; kills++;
          const bonus = 2500 + currentLevel*500;
          score += bonus; screenShake = 30;
          spawnParticles(fb.x+fb.w/2,fb.y+fb.h/2,80,'#ffff00',12);
          spawnParticles(fb.x+fb.w/2,fb.y+fb.h/2,60,'#ff00aa',9);
          addFloatText(fb.x+fb.w/2-scrollX, fb.y-50, '🌟 FINAL BOSS DESTROYED! +'+bonus, '#ffff00');
          playWin(); doExplosions(fb); updateHUD();
        }
      }
    }
  }

  const boss=enemies.find(e=>e.isBoss);
  const bossAlive=boss&&!boss.dead;
  if (!bossAlive){
    const allDead=enemies.filter(e=>!e.isBoss&&!e.dead).length===0;
    const endPlat=levelData.platforms.find(p=>p.isEnd);
    const onEnd=endPlat&&rectsOverlap(player,endPlat);
    if (allDead||onEnd||player.x>levelData.width*0.75){ levelComplete(); return; }
  }
  if (player.hp<=0) playerDie();
}

function updateFlyer(e){
  e.floatTimer+=0.032; e.y=e.baseY+Math.sin(e.floatTimer)*e.floatAmp; e.x+=e.vx;
  if(e.x<=80||e.x+e.w>=levelData.width-80) e.vx*=-1;
  if(e.baseY>levelData.groundY-180) e.baseY-=0.5;
  e.shootTimer--;
  if(e.shootTimer<=0){ e.shootTimer=65+Math.random()*45; const ex=e.x+e.w/2,ey=e.y+e.h/2,px=player.x+14,py=player.y+20; let dx=px-ex,dy=py-ey,l=Math.hypot(dx,dy); if(l>0){dx/=l;dy/=l;} bullets.push({x:ex,y:ey,vx:dx*5.5,vy:dy*5.5,life:100,fromPlayer:false,w:8,h:8,dmg:7,color:'#dd44ff'}); }
  if(rectsOverlap(e,player)){player.hp-=0.2;updateHUD();}
}
function updateGroundEnemy(e){
  e.vy+=0.6; e.x+=e.vx; e.y+=e.vy; resolveCollision(e);
  if(e.x<=50||e.x+e.w>=levelData.width-50) e.vx*=-1;
  if(e.type==='shooter'){ e.shootTimer--; if(e.shootTimer<=0){ e.shootTimer=75+Math.random()*30; const ex=e.x+e.w/2,ey=e.y+e.h/2,px=player.x+14,py=player.y+20; let dx=px-ex,dy=py-ey,l=Math.hypot(dx,dy); if(l>0){dx/=l;dy/=l;} bullets.push({x:ex,y:ey,vx:dx*5,vy:dy*5,life:80,fromPlayer:false,w:6,h:6,dmg:8}); } }
  if(e.type==='walker'&&rectsOverlap(e,player)){player.hp-=0.25;updateHUD();}
}
function updateAlienBoss(e){
  e.shootTimer--;
  if(!e.enraged&&e.hp<e.maxHp*e.enrageThreshold){ e.enraged=true; screenShake=18; addFloatText(e.x+e.w/2-scrollX,e.y-40,'⚡ ENRAGED!','#ff0000'); spawnParticles(e.x+e.w/2,e.y+e.h/2,45,e.bossDef.color,7); }
  const spd=e.enraged?2.6:1.5;
  if(e.attackStyle==='teleport'||e.attackStyle==='void'){
    e.teleportTimer=(e.teleportTimer||0)-1;
    if(e.teleportTimer<=0){ e.teleportTimer=e.enraged?80:140; const side=Math.random()<0.5?-1:1; e.x=Math.max(80,Math.min(levelData.width-e.w-80,player.x+side*(160+Math.random()*80))); e.y=levelData.groundY-e.h-Math.random()*160; spawnParticles(e.x+e.w/2,e.y+e.h/2,22,e.bossDef.color,6); }
    else{ e.x+=e.vx; e.vy+=0.4; e.y+=e.vy; }
  } else {
    const dx=(player.x+14)-(e.x+e.w/2); if(Math.abs(dx)>90) e.vx=dx>0?spd:-spd; else e.vx*=0.9; e.x+=e.vx; e.vy+=0.5; e.y+=e.vy; resolveCollision(e);
  }
  e.x=Math.max(80,Math.min(levelData.width-e.w-80,e.x));
  if(rectsOverlap(e,player)){player.hp-=0.5;screenShake=3;updateHUD();}
  if(e.shootTimer<=0){ e.shootTimer=e.enraged?28:50; fireBossAttack(e); }
}
function fireBossAttack(e){
  const ex=e.x+e.w/2,ey=e.y+e.h/2,px=player.x+14,py=player.y+20;
  let dx=px-ex,dy=py-ey,l=Math.hypot(dx,dy); if(l>0){dx/=l;dy/=l;}
  const spd=e.enraged?8:5.5;
  const mk=(vx,vy,w,dmg,homing)=>bullets.push({x:ex,y:ey,vx,vy,life:110,fromPlayer:false,w,h:w,dmg,color:e.bossDef.color,homing:!!homing});
  switch(e.attackStyle){
    case 'slam':        mk(dx*spd,dy*spd,14,15); break;
    case 'spread':      for(let i=-2;i<=2;i++){const a=Math.atan2(dy,dx)+i*0.3; mk(Math.cos(a)*spd,Math.sin(a)*spd,10,10);} break;
    case 'homing':      mk(dx*4,dy*4,12,12,true); if(e.enraged) mk(dx*3.5+dy,dy*3.5-dx,10,10,true); break;
    case 'teleport':    for(let a=0;a<Math.PI*2;a+=Math.PI/4) mk(Math.cos(a)*spd,Math.sin(a)*spd,9,11); break;
    case 'acid_spread': for(let i=-3;i<=3;i++){const a=Math.atan2(dy,dx)+i*0.24; bullets.push({x:ex,y:ey,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,life:100,fromPlayer:false,w:12,h:12,dmg:13,color:'#aaff00'});} break;
    case 'void':        for(let a=0;a<Math.PI*2;a+=Math.PI/6) mk(Math.cos(a)*5,Math.sin(a)*5,10,10); bullets.push({x:ex,y:ey,vx:dx*10,vy:dy*10,life:70,fromPlayer:false,w:20,h:20,dmg:24,color:'#ff00aa'}); break;
  }
  playAlarm();
}
function doExplosions(e){ for(let i=0;i<7;i++) setTimeout(()=>{ spawnParticles(e.x+Math.random()*e.w,e.y+Math.random()*e.h,22,['#ff4400','#ffcc00','#ff00ff','#00ffcc'][i%4],9); },i*120); }

// ===================== LEVEL BACKGROUND THEMES =====================
const LEVEL_THEMES = [
  // Level 1 - Slum Alley: dirty orange dusk city
  { sky: ['#1a0d00','#2d1500','#3d2000'], fog: 'rgba(60,20,0,0.18)', stars: false,
    buildingColor: ['#2a1500','#1f0e00'], windowColor: '#ff8800', groundDetail: 'slum' },
  // Level 2 - Factory: industrial smog green
  { sky: ['#0d1a00','#0e1e00','#1a2500'], fog: 'rgba(20,40,0,0.22)', stars: false,
    buildingColor: ['#1a2200','#141b00'], windowColor: '#aaff00', groundDetail: 'factory' },
  // Level 3 - Sewer: dark deep teal
  { sky: ['#000d1a','#001120','#001a2d'], fog: 'rgba(0,30,50,0.28)', stars: false,
    buildingColor: ['#001525','#00101c'], windowColor: '#00aaff', groundDetail: 'sewer' },
  // Level 4 - Rooftop: purple night city
  { sky: ['#0d001a','#1a002d','#260040'], fog: 'rgba(40,0,60,0.20)', stars: true,
    buildingColor: ['#1a0030','#110022'], windowColor: '#cc44ff', groundDetail: 'rooftop' },
  // Level 5 - Alien Lab: cyberpunk teal
  { sky: ['#001a1a','#002626','#003030'], fog: 'rgba(0,80,80,0.18)', stars: true,
    buildingColor: ['#002222','#001a1a'], windowColor: '#00ffcc', groundDetail: 'alien_lab' },
  // Level 6 - Mothership: deep space void purple
  { sky: ['#050008','#0a0015','#0d0020'], fog: 'rgba(80,0,120,0.15)', stars: true,
    buildingColor: ['#0d0022','#080015'], windowColor: '#ff00aa', groundDetail: 'mothership' },
];

function drawLevelBackground(ctx) {
  const th = LEVEL_THEMES[Math.min((currentLevel||1)-1, 5)];
  // Sky gradient
  const bg = ctx.createLinearGradient(0, 0, 0, gH);
  bg.addColorStop(0, th.sky[0]);
  bg.addColorStop(0.5, th.sky[1]);
  bg.addColorStop(1, th.sky[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, gW, gH);

  // Stars on space/night levels
  if (th.stars) {
    const seed = currentLevel * 777;
    for (let i = 0; i < 80; i++) {
      const sx = ((seed * (i+1) * 131) % gW + gW) % gW;
      const sy = ((seed * (i+1) * 97) % (gH * 0.65));
      const br = 0.4 + 0.6 * Math.abs(Math.sin(levelTimer * 0.015 + i));
      ctx.fillStyle = `rgba(255,255,255,${br * 0.85})`;
      ctx.beginPath(); ctx.arc(sx, sy, 0.8 + (i%3)*0.5, 0, Math.PI*2); ctx.fill();
    }
    // Nebula glow
    const nebX = gW * 0.65, nebY = gH * 0.2;
    const nebG = ctx.createRadialGradient(nebX, nebY, 10, nebX, nebY, 180);
    nebG.addColorStop(0, th.windowColor + '22');
    nebG.addColorStop(1, 'transparent');
    ctx.fillStyle = nebG; ctx.fillRect(0, 0, gW, gH);
  }

  // Parallax background buildings/structures
  const numBg = 12;
  for (let i = 0; i < numBg; i++) {
    const bx = ((i * 290 - scrollX * 0.18) % (gW + 80) + gW + 80) % (gW + 80) - 40;
    const bh = 60 + (i % 5) * 35;
    const bw = 28 + (i % 4) * 12;
    ctx.fillStyle = th.buildingColor[i % 2];
    ctx.fillRect(bx, gH - 80 - bh, bw, bh);
    // Windows
    for (let wy = gH - 80 - bh + 8; wy < gH - 85; wy += 16) {
      for (let wx = bx + 4; wx < bx + bw - 6; wx += 10) {
        const lit = Math.sin(levelTimer * 0.01 + wx * 0.3 + wy * 0.2) > 0.2;
        ctx.fillStyle = lit ? th.windowColor + '99' : th.windowColor + '22';
        ctx.fillRect(wx, wy, 5, 7);
      }
    }
  }

  // Mid-distance structures
  for (let i = 0; i < 8; i++) {
    const mx = ((i * 420 - scrollX * 0.35) % (gW + 120) + gW + 120) % (gW + 120) - 60;
    const mh = 40 + (i % 3) * 25;
    const mw = 40 + (i % 4) * 18;
    ctx.fillStyle = th.buildingColor[0] + 'cc';
    ctx.fillRect(mx, gH - 80 - mh, mw, mh);
    // Chimneys / pipes / antennas
    if (th.groundDetail === 'factory') {
      ctx.fillStyle = '#cc440044';
      ctx.fillRect(mx + mw/2 - 4, gH - 80 - mh - 22, 8, 22);
      // Smoke puff
      const puffAlpha = 0.12 + 0.08 * Math.sin(levelTimer * 0.03 + i);
      ctx.fillStyle = `rgba(120,80,20,${puffAlpha})`;
      ctx.beginPath(); ctx.arc(mx + mw/2, gH - 80 - mh - 30, 14, 0, Math.PI*2); ctx.fill();
    }
    if (th.groundDetail === 'alien_lab' || th.groundDetail === 'mothership') {
      // Pulsing orbs
      const orbAlpha = 0.2 + 0.15 * Math.sin(levelTimer * 0.04 + i * 1.3);
      ctx.fillStyle = th.windowColor.slice(0,7) + Math.floor(orbAlpha * 255).toString(16).padStart(2,'0');
      ctx.beginPath(); ctx.arc(mx + mw/2, gH - 80 - mh - 10, 7, 0, Math.PI*2); ctx.fill();
    }
  }

  // Fog layer at ground
  const fog = ctx.createLinearGradient(0, gH - 160, 0, gH - 75);
  fog.addColorStop(0, 'transparent');
  fog.addColorStop(1, th.fog);
  ctx.fillStyle = fog; ctx.fillRect(0, gH - 160, gW, 85);
}
function render(){
  const ctx=gCtx; ctx.clearRect(0,0,gW,gH);
  const sx=screenShake>0?(Math.random()-0.5)*screenShake:0, sy=screenShake>0?(Math.random()-0.5)*screenShake:0;
  drawLevelBackground(ctx);
  drawBgDetails(ctx);
  ctx.save(); ctx.translate(-scrollX+sx,sy);
  levelData.platforms.forEach(p=>{
    if(p.isCage){drawCage(ctx,p);return;}
    if(p.isStarBounce){drawStarBouncePad(ctx,p);return;}
    if(p.isBossThrone){drawBossThrone(ctx,p);return;}
    if(p.isWarningPost){
      // Glowing warning pillar
      ctx.save(); ctx.shadowBlur=12; ctx.shadowColor='#ff4500';
      ctx.fillStyle='#ff4500'; ctx.fillRect(p.x,p.y,p.w,p.h);
      ctx.restore();
      ctx.fillStyle='#ffcc00'; ctx.font='bold 9px monospace';
      ctx.fillText('⚠',p.x-8,p.y-8);
      return;
    }
    ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,p.w,p.h);
    if(p.isGround){ctx.fillStyle='#2d1a0a';ctx.fillRect(p.x,p.y,p.w,8);}
    if(p.isEnd) drawEndFlag(ctx,p);
  });
  prisoners.forEach(pr=>drawPrisoner(ctx,pr));
  pickups.filter(p=>!p.collected).forEach(p=>{ const bob=Math.sin(levelTimer*0.05+p.x)*4; ctx.fillStyle=p.type==='ammo'?'#ffcc00':'#ff4488'; ctx.beginPath(); ctx.arc(p.x+10,p.y+10+bob,10,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.font='8px monospace'; ctx.fillText(p.type==='ammo'?'A':'H',p.x+6,p.y+14+bob); });
  enemies.forEach(e=>{ if(!e.dead){ if(e.type==='alien_boss') drawAlienBoss(ctx,e); else if(e.isFlyer) drawFlyer(ctx,e); else drawGroundEnemy(ctx,e); } });
  bullets.filter(b=>!b.fromPlayer).forEach(b=>{ ctx.save(); ctx.shadowBlur=12; ctx.shadowColor=b.color||'#ff3344'; ctx.fillStyle=b.color||'#ff3344'; ctx.beginPath(); ctx.arc(b.x,b.y,(b.w||6)/2,0,Math.PI*2); ctx.fill(); ctx.restore(); ctx.fillStyle=(b.color||'#ff3344')+'44'; ctx.beginPath(); ctx.arc(b.x-b.vx,b.y-b.vy,(b.w||6)/3,0,Math.PI*2); ctx.fill(); });
  bullets.filter(b=>b.fromPlayer).forEach(b=>{ ctx.fillStyle='#ffaa00'; ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(Math.atan2(b.vy,b.vx)); ctx.fillRect(-b.w/2,-b.h/2,b.w,b.h); ctx.restore(); ctx.fillStyle='#ff660044'; ctx.beginPath(); ctx.arc(b.x-b.vx,b.y-b.vy,3,0,Math.PI*2); ctx.fill(); });
  drawPlayer(ctx);
  particles.forEach(p=>{ ctx.globalAlpha=p.alpha; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); });
  ctx.globalAlpha=1;
  ctx.restore();
  floatingTexts.forEach(t=>{ ctx.globalAlpha=t.life/t.maxLife; ctx.fillStyle=t.color; ctx.font='bold 11px monospace'; ctx.fillText(t.text,t.x,t.y); });
  ctx.globalAlpha=1;
  if(settings.fps){ ctx.fillStyle='#ffffff88'; ctx.font='10px monospace'; ctx.fillText('FPS:'+fpsDisplay,10,60); }
  drawMinimap(ctx); drawBossBar(ctx);
}

function drawStarBouncePad(ctx, p) {
  const t = p.animT || 0;
  const pulse = Math.sin(t * 2) * 0.3 + 0.7;
  // Glowing star platform base
  ctx.save();
  ctx.shadowBlur = 20 + Math.sin(t*3)*8;
  ctx.shadowColor = '#ffcc00';
  ctx.fillStyle = `rgba(40,30,0,${0.9})`;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  // Glowing border
  ctx.strokeStyle = `rgba(255,204,0,${pulse})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(p.x, p.y, p.w, p.h);
  ctx.restore();
  // Draw ⭐ stars on pad
  const numStars = 3;
  const spacing = p.w / numStars;
  for (let i = 0; i < numStars; i++) {
    const sx = p.x + spacing * i + spacing/2;
    const sy = p.y + p.h/2 + Math.sin(t * 2.5 + i) * 3;
    ctx.save();
    ctx.shadowBlur = 14; ctx.shadowColor = '#ffff00';
    ctx.fillStyle = `rgba(255,220,0,${0.7 + Math.sin(t*3+i)*0.3})`;
    ctx.font = 'bold 14px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⭐', sx, sy - p.h/2 - 2);
    ctx.restore();
  }
  // Arrow hint pointing up
  ctx.save();
  ctx.globalAlpha = 0.5 + Math.sin(t*3)*0.3;
  ctx.fillStyle = '#ffff00';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('▲', p.x + p.w/2, p.y - 14);
  ctx.restore();
}

function drawBossThrone(ctx, p) {
  const t = levelTimer * 0.04;
  // Throne platform
  ctx.save();
  ctx.shadowBlur = 30; ctx.shadowColor = '#8800ff';
  ctx.fillStyle = '#1a0040';
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = '#8800ff'; ctx.lineWidth = 3;
  ctx.strokeRect(p.x, p.y, p.w, p.h);
  // Pulsing runes
  for (let i=0; i<4; i++) {
    const rx = p.x + 20 + i*(p.w-20)/4;
    const ra = 0.6 + 0.4*Math.sin(t + i*1.5);
    ctx.globalAlpha = ra;
    ctx.fillStyle = '#ff00aa';
    ctx.font = '10px serif';
    ctx.textAlign = 'center';
    ctx.fillText(['✦','✧','⬡','✦'][i], rx, p.y - 6);
  }
  ctx.globalAlpha = 1;
  // Crown decoration
  ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 18px serif'; ctx.textAlign = 'center';
  ctx.fillText('👑', p.x + p.w/2, p.y - 12);
  ctx.restore();
  // STOMP hint text if boss alive
  const fb = enemies && enemies.find(e=>e.isBoss&&!e.dead&&e.isFinalBoss);
  if (fb) {
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.35*Math.sin(t*2);
    ctx.fillStyle = '#ffff00'; ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⭐ JUMP ON STARS → STOMP BOSS!', p.x + p.w/2, p.y - 32);
    ctx.restore();
  }
}

function drawCage(ctx,p){
  ctx.fillStyle='#554400'; ctx.fillRect(p.x,p.y,p.w,p.h);
  ctx.strokeStyle='#ffcc00'; ctx.lineWidth=2;
  for(let bx=p.x+4;bx<=p.x+p.w-4;bx+=10){ ctx.beginPath(); ctx.moveTo(bx,p.y-36); ctx.lineTo(bx,p.y); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(p.x,p.y-36); ctx.lineTo(p.x+p.w,p.y-36); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p.x,p.y-18); ctx.lineTo(p.x+p.w,p.y-18); ctx.stroke();
  const has=prisoners.some(pr=>!pr.freed&&Math.abs(pr.cageX-p.cageX)<5);
  if(has){ ctx.save(); ctx.shadowBlur=14; ctx.shadowColor='#ffcc00'; ctx.strokeStyle='#ffcc0066'; ctx.strokeRect(p.x,p.y-37,p.w,37); ctx.restore(); }
}
function drawPrisoner(ctx,pr){
  pr.animTimer++;
  if(pr.freed){ ctx.fillStyle='#88ffcc'; ctx.fillRect(pr.x,pr.y+6,16,22); ctx.fillStyle='#ffddaa'; ctx.fillRect(pr.x+2,pr.y,12,14); ctx.save(); ctx.fillStyle='#ffff00'; ctx.font='bold 9px monospace'; ctx.fillText('FREE!',pr.x-4,pr.y-8); ctx.restore(); return; }
  const bob=Math.sin(pr.animTimer*0.06)*2;
  ctx.fillStyle='#cc6600'; ctx.fillRect(pr.x+2,pr.y+9+bob,15,19);
  ctx.fillStyle='#ffddaa'; ctx.fillRect(pr.x+4,pr.y+bob,11,12);
  ctx.fillStyle='#000'; ctx.fillRect(pr.x+6,pr.y+3+bob,3,3); ctx.fillRect(pr.x+11,pr.y+3+bob,3,3);
  ctx.save(); ctx.globalAlpha=0.7+0.3*Math.sin(pr.animTimer*0.1); ctx.fillStyle='#ffff00'; ctx.font='bold 8px monospace'; ctx.fillText('HELP!',pr.x-2,pr.y-5+bob); ctx.restore();
  const dist=Math.hypot((pr.x+10)-(player.x+14),(pr.y+15)-(player.y+20));
  if(dist<130){ ctx.save(); ctx.fillStyle='#00ffcc'; ctx.font='7px monospace'; ctx.fillText('→ WALK NEAR TO RESCUE',pr.x-40,pr.y-20); ctx.restore(); }
}
function drawGroundEnemy(ctx,e){
  ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(e.x+4,e.y+e.h-4,e.w-8,5);
  ctx.fillStyle=e.type==='shooter'?'#cc4400':'#884400'; ctx.fillRect(e.x,e.y+8,e.w,e.h-8);
  ctx.fillStyle=e.type==='shooter'?'#ff6600':'#cc6600'; ctx.fillRect(e.x+2,e.y,e.w-4,14);
  ctx.fillStyle='#ffcc00'; ctx.fillRect(e.x+6,e.y+4,5,5); ctx.fillRect(e.x+e.w-11,e.y+4,5,5);
  ctx.fillStyle='#000'; ctx.fillRect(e.x+8,e.y+5,3,3); ctx.fillRect(e.x+e.w-9,e.y+5,3,3);
  if(e.type==='shooter'){ctx.fillStyle='#555'; ctx.fillRect(e.vx>0?e.x+e.w:e.x-14,e.y+14,14,5);}
  if(e.hp<e.maxHp){ctx.fillStyle='#300';ctx.fillRect(e.x,e.y-8,e.w,5);ctx.fillStyle='#f00';ctx.fillRect(e.x,e.y-8,e.w*(e.hp/e.maxHp),5);}
}
function drawFlyer(ctx,e){
  const wFlap=Math.sin(e.floatTimer*9)*10;
  ctx.save(); ctx.shadowBlur=14; ctx.shadowColor='#cc44ff'; ctx.fillStyle='#bb33ee';
  ctx.beginPath(); ctx.ellipse(e.x+4,e.y+12,14,7+Math.abs(wFlap)/5,-0.35,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(e.x+e.w-4,e.y+12,14,7+Math.abs(wFlap)/5,0.35,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#880099'; ctx.beginPath(); ctx.ellipse(e.x+e.w/2,e.y+14,12,10,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.fillStyle='#ff0'; ctx.fillRect(e.x+9,e.y+8,5,5); ctx.fillRect(e.x+e.w-14,e.y+8,5,5);
  ctx.fillStyle='#000'; ctx.fillRect(e.x+11,e.y+10,2,2); ctx.fillRect(e.x+e.w-12,e.y+10,2,2);
  if(e.hp<e.maxHp){ctx.fillStyle='#300';ctx.fillRect(e.x,e.y-6,e.w,4);ctx.fillStyle='#f0f';ctx.fillRect(e.x,e.y-6,e.w*(e.hp/e.maxHp),4);}
}
function drawAlienBoss(ctx,e){
  const bd=e.bossDef, t=levelTimer*0.05, pulse=Math.sin(t*3)*3;
  const cx=e.x+e.w/2, cy=e.y+e.h/2;
  ctx.save(); ctx.shadowBlur=e.enraged?45:24; ctx.shadowColor=e.enraged?'#ff0000':bd.glowColor;
  ctx.fillStyle=e.enraged?'#ff2200':bd.color; ctx.beginPath(); ctx.ellipse(cx,cy,e.w/2+pulse,e.h/2+pulse,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=bd.accentColor; ctx.beginPath(); ctx.ellipse(cx,cy+12,e.w/3,e.h/4,0,0,Math.PI*2); ctx.fill();
  if(bd.tentacles){ ctx.strokeStyle=bd.accentColor; ctx.lineWidth=4; for(let i=0;i<4;i++){ const side=i<2?-1:1,slot=i%2,tx1=cx+side*e.w/2,ty1=cy+10+slot*20,tx2=tx1+side*(30+Math.sin(t*2+i)*15),ty2=ty1+26+Math.cos(t*2+i)*12; ctx.beginPath(); ctx.moveTo(tx1,ty1); ctx.quadraticCurveTo(tx1+side*14,ty2-10,tx2,ty2); ctx.stroke(); } }
  if(bd.legs){ ctx.fillStyle=bd.accentColor; const ls=Math.sin(t*4)*8; ctx.fillRect(cx-e.w/2+8,cy+e.h/2-8,10,22+ls); ctx.fillRect(cx-5,cy+e.h/2-8,10,18); ctx.fillRect(cx+e.w/2-18,cy+e.h/2-8,10,22-ls); }
  const pdx=(player.x+14)-cx,pdy=(player.y+20)-cy,plen=Math.hypot(pdx,pdy),pupX=plen>0?pdx/plen*3:0,pupY=plen>0?pdy/plen*3:0;
  [[-16,-10],[16,-10]].forEach(([ox,oy])=>{ ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(cx+ox,cy+oy,12,14,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle=bd.eyeColor; ctx.beginPath(); ctx.ellipse(cx+ox*0.85,cy+oy,7,9,0,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#000'; ctx.beginPath(); ctx.ellipse(cx+ox*0.85+pupX,cy+oy+pupY,4,5,0,0,Math.PI*2); ctx.fill(); });
  ctx.strokeStyle=bd.eyeColor; ctx.lineWidth=3;
  if(e.enraged){ ctx.beginPath(); ctx.moveTo(cx-16,cy+20); for(let tx=-16;tx<=16;tx+=8) ctx.lineTo(cx+tx,cy+14+(tx%16===0?9:0)); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(cx,cy+15,14,0.15,Math.PI-0.15); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle=e.enraged?'#ff2200':bd.eyeColor; ctx.font='bold 9px monospace';
  const nw=ctx.measureText(bd.name).width; ctx.fillText(bd.name,cx-nw/2,e.y-22);
  const bw=Math.min(e.w+24,120),pct=e.hp/e.maxHp;
  ctx.fillStyle='#300'; ctx.fillRect(cx-bw/2,e.y-14,bw,8);
  ctx.fillStyle=pct>0.5?'#ff6600':pct>0.25?'#ff9900':'#ff0000'; ctx.fillRect(cx-bw/2,e.y-14,bw*pct,8);
  if(e.enraged){ctx.save();ctx.globalAlpha=0.35+0.25*Math.sin(t*5);ctx.fillStyle='#ff0000';ctx.fillRect(cx-bw/2,e.y-14,bw*pct,8);ctx.restore();}
}
function drawEndFlag(ctx,p){
  ctx.fillStyle='#4eff91'; ctx.fillRect(p.x,p.y,p.w,p.h);
  ctx.fillStyle='#ff4500';
  for(let fx=p.x;fx<p.x+p.w;fx+=20){ ctx.fillRect(fx,p.y-40,3,40); ctx.fillStyle='#ffcc00'; ctx.fillRect(fx+3,p.y-40,16,12); ctx.fillStyle='#ff4500'; }
  ctx.font='bold 10px monospace'; ctx.fillStyle='#4eff91'; ctx.fillText('FINISH',p.x+8,p.y-50);
}
function drawPlayer(ctx){
  if(!player||player.dead) return;
  const px=player.x,py=player.y;
  ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(px+4,py+player.h-4,player.w-8,5);
  ctx.fillStyle=player.dashing?'#00ccff':'#2255ff'; ctx.fillRect(px,py+12,player.w,player.h-12);
  ctx.fillStyle='#ffcc99'; ctx.fillRect(px+2,py,player.w-4,16);
  ctx.fillStyle='#000';
  if(player.facingRight) ctx.fillRect(px+player.w-8,py+5,4,4); else ctx.fillRect(px+4,py+5,4,4);
  const angle=Math.atan2(mouseY-(py+player.h/2),mouseX-(px-scrollX+player.w/2));
  ctx.save(); ctx.translate(px+player.w/2,py+player.h/2); ctx.rotate(angle);
  ctx.fillStyle='#888'; ctx.fillRect(8,-3,18,6); ctx.fillStyle='#555'; ctx.fillRect(24,-2,7,4);
  ctx.restore();
  const lf=Math.abs(player.vx)>0.5?Math.floor(levelTimer/6)%2:0;
  ctx.fillStyle='#1a3acc'; ctx.fillRect(px+2,py+player.h-14,10,14); ctx.fillRect(px+player.w-12,py+player.h-14,10,14);
  if(lf===1&&player.onGround){ctx.fillRect(px,py+player.h-10,10,10);ctx.fillRect(px+player.w-10,py+player.h-18,10,10);}
  if(player.dashing){ctx.save();ctx.globalAlpha=0.3;ctx.fillStyle='#00ccff';ctx.fillRect(px-player.vx*3,py,player.w,player.h);ctx.restore();}
}
function drawBgDetails(ctx){
  const theme=levelData.theme;
  for(let i=0;i<15;i++){
    const bx=((i*280-scrollX*0.3)%gW+gW)%gW,bh=50+i%5*30;
    if(theme==='slum'||theme==='rooftop'){ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(bx,gH-80-bh,30+i%3*10,bh);}
    else if(theme==='factory'){ctx.fillStyle='rgba(40,20,0,0.4)';ctx.fillRect(bx,gH-80-bh,40,bh);ctx.fillStyle='rgba(255,80,0,0.3)';ctx.fillRect(bx+15,gH-80-bh-20,10,20);}
    else if(theme==='alien_lab'||theme==='mothership'){ctx.fillStyle='rgba(80,0,120,0.25)';ctx.fillRect(bx,gH-80-bh,30+i%3*10,bh);ctx.fillStyle='rgba(0,200,255,0.08)';ctx.fillRect(bx+5,gH-80-bh-14,8,14);}
  }
  if(theme==='alien_lab'||theme==='mothership'){
    for(let i=0;i<6;i++){const ox=((i*400-scrollX*0.15)%gW+gW)%gW,oy=80+i*55+Math.sin(levelTimer*0.02+i)*18; ctx.save();ctx.shadowBlur=22;ctx.shadowColor='#8800ff';ctx.fillStyle='#8800ff33';ctx.beginPath();ctx.arc(ox,oy,16,0,Math.PI*2);ctx.fill();ctx.restore();}
  }
}
function drawMinimap(ctx){
  const mw=140,mh=30,mx=gW-150,my=54;
  ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(mx,my,mw,mh);
  ctx.strokeStyle='#ffffff33'; ctx.strokeRect(mx,my,mw,mh);
  const sc=mw/levelData.width;
  ctx.fillStyle='#4a3520'; ctx.fillRect(mx,my+mh-6,mw,6);
  ctx.fillStyle='#00aaff'; ctx.fillRect(mx+player.x*sc,my+5,3,mh-12);
  ctx.fillStyle='#ff4400'; enemies.filter(e=>!e.dead&&!e.isBoss).forEach(e=>ctx.fillRect(mx+e.x*sc,my+5,2,mh-12));
  const boss=enemies.find(e=>e.isBoss&&!e.dead);
  if(boss){ctx.fillStyle='#ff00ff';ctx.fillRect(mx+boss.x*sc,my+2,5,mh-4);}
  ctx.fillStyle='#ffff00'; prisoners.filter(p=>!p.freed).forEach(p=>ctx.fillRect(mx+p.x*sc,my+5,3,mh-12));
  ctx.fillStyle='#4eff91'; ctx.fillRect(mx+levelData.endX*sc,my,3,mh);
}
function drawBossBar(ctx){
  const boss=enemies.find(e=>e.isBoss&&!e.dead); if(!boss) return;
  const bw=Math.min(gW*0.5,400),bh=14,bx=gW/2-bw/2,by=gH-52,pct=boss.hp/boss.maxHp;
  ctx.fillStyle='#00000099'; ctx.fillRect(bx-12,by-26,bw+24,bh+34);
  ctx.fillStyle='#fff'; ctx.font='bold 9px monospace'; ctx.fillText('👾 '+boss.name+(boss.enraged?'  ⚡ ENRAGED':''),bx,by-9);
  ctx.fillStyle='#300'; ctx.fillRect(bx,by,bw,bh);
  ctx.fillStyle=pct>0.5?'#ff4400':pct>0.25?'#ff9900':'#ff0000'; ctx.fillRect(bx,by,bw*pct,bh);
  if(boss.enraged){ctx.save();ctx.globalAlpha=0.3+0.3*Math.sin(levelTimer*0.22);ctx.fillStyle='#ff0000';ctx.fillRect(bx,by,bw*pct,bh);ctx.restore();}
  ctx.strokeStyle='#ffffff44';ctx.lineWidth=1;ctx.strokeRect(bx,by,bw,bh);
  // Final boss stomp counter
  if (boss.isFinalBoss) {
    const stompsLeft = Math.max(0, (boss.stompHitsNeeded||9) - (boss.stompHits||0));
    ctx.fillStyle='#ffff00'; ctx.font='bold 8px monospace';
    ctx.fillText('⭐ STOMPS LEFT: '+stompsLeft+'  |  USE STAR PADS TO JUMP ON BOSS!', bx, by+bh+14);
  }
}

// ===================== LEVEL COMPLETE =====================
function levelComplete(){
  if(!gRunning) return;
  gRunning=false; playWin();
  if(activeProfile){
    if(!activeProfile.unlockedLevels.includes(currentLevel+1) && currentLevel<6) activeProfile.unlockedLevels.push(currentLevel+1);
    if(!activeProfile.scores[currentLevel]||activeProfile.scores[currentLevel]<score) activeProfile.scores[currentLevel]=score;
  }
  const bonus=Math.floor(3000/Math.max(1,levelTimer/60)), rescueBonus=prisonersRescued*300;
  score+=bonus+rescueBonus;
  addScore(currentLevel,score,kills,prisonersRescued);
  document.getElementById('win-score').textContent   = score.toLocaleString();
  document.getElementById('win-kills').textContent   = kills;
  document.getElementById('win-rescued').textContent = prisonersRescued;
  document.getElementById('win-bonus').textContent   = '+'+rescueBonus.toLocaleString();
  document.getElementById('overlay-win').classList.add('active');
}

// ===================== PLAYER DEATH =====================
function playerDie(){
  if(player.dead) return;
  player.dead=true; gRunning=false; playDie();
  spawnParticles(player.x+14,player.y+20,30,'#ff3344',6);
  addScore(currentLevel,score,kills,prisonersRescued);
  setTimeout(()=>{ document.getElementById('lose-score').textContent=score.toLocaleString(); document.getElementById('overlay-lose').classList.add('active'); },800);
}

function nextLevel(){ document.getElementById('overlay-win').classList.remove('active'); if(currentLevel<6){currentLevel++;launchLevel(currentLevel);}else showMapScreen(); }
function restartLevel(){ document.getElementById('overlay-lose').classList.remove('active'); launchLevel(currentLevel); }

// ===================== HUD =====================
function updateHUD(){
  document.getElementById('hud-score').textContent = score.toLocaleString();
  document.getElementById('hp-val').textContent    = Math.max(0,Math.floor(player.hp));
  const pct=Math.max(0,player.hp/player.maxHp*100);
  document.getElementById('health-fill').style.width      = pct+'%';
  document.getElementById('health-fill').style.background = player.hp>50?'linear-gradient(90deg,#00cc44,#44ff00)':player.hp>25?'linear-gradient(90deg,#cc8800,#ffcc00)':'linear-gradient(90deg,#cc0000,#ff3344)';
  document.getElementById('ammo-count').textContent  = player.ammo+'/'+player.maxAmmo;
  document.getElementById('hud-rescued').textContent = prisonersRescued;
  const ammoDiv=document.getElementById('ammo-display'); ammoDiv.innerHTML='';
  for(let i=0;i<player.maxAmmo;i+=3){ const pip=document.createElement('span'); pip.className='ammo-pip'+(i<player.ammo?'':' empty'); ammoDiv.appendChild(pip); }
}

// ===================== INIT =====================
loadActiveState();
initStars('starCanvas');
updateTitleStats();

// Dim continue button if no profiles
const profiles0 = loadProfiles();
if (profiles0.length === 0) document.getElementById('continue-btn').classList.add('dim');

window.addEventListener('resize',()=>{
  ['starCanvas','starCanvas2','starCanvas3'].forEach(id=>{ const c=document.getElementById(id); if(c){c.width=window.innerWidth;c.height=window.innerHeight;} });
  if(gRunning){gW=window.innerWidth;gH=window.innerHeight;gCanvas.width=gW;gCanvas.height=gH;}
});

applySettingsUI();
console.log('%cGUN RUNNER X v3 | WASD=move | Space=jump | Click/Z=shoot | Shift=dash | Esc=pause | Walk near cage=rescue', 'color:#ff4500;font-size:13px;font-weight:bold;');
// ===================== MOBILE VIRTUAL JOYSTICK =====================
(function() {
  const isTouchDevice = () => ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  function showMobileControls(show) {
    const mc = document.getElementById('mobile-controls');
    if (mc) mc.style.display = show ? 'block' : 'none';
  }

  // --- Joystick state ---
  let joyActive = false, joyId = null;
  let joyBaseX = 0, joyBaseY = 0;
  const JOY_RADIUS = 50; // max knob travel
  const DEAD_ZONE = 0.18;

  function setupJoystick() {
    const base  = document.getElementById('joystick-base');
    const knob  = document.getElementById('joystick-knob');
    if (!base || !knob) return;

    function getCenter() {
      const r = base.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    }

    function onJoyStart(e) {
      e.preventDefault();
      const t = e.changedTouches[0];
      joyActive = true; joyId = t.identifier;
      const c = getCenter(); joyBaseX = c.x; joyBaseY = c.y;
      moveKnob(t.clientX, t.clientY);
    }
    function onJoyMove(e) {
      e.preventDefault();
      if (!joyActive) return;
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) { moveKnob(t.clientX, t.clientY); break; }
      }
    }
    function onJoyEnd(e) {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) { joyActive = false; joyId = null; resetKnob(); break; }
      }
    }
    function moveKnob(cx, cy) {
      let dx = cx - joyBaseX, dy = cy - joyBaseY;
      const dist = Math.hypot(dx, dy);
      const clamped = Math.min(dist, JOY_RADIUS);
      if (dist > 0) { dx = dx/dist*clamped; dy = dy/dist*clamped; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      // Normalize -1..1
      const nx = dx / JOY_RADIUS, ny = dy / JOY_RADIUS;
      // Apply to pressedKeys
      pressedKeys['KeyA']      = nx < -DEAD_ZONE;
      pressedKeys['ArrowLeft'] = nx < -DEAD_ZONE;
      pressedKeys['KeyD']      = nx >  DEAD_ZONE;
      pressedKeys['ArrowRight']= nx >  DEAD_ZONE;
      // Up direction on joystick = jump trigger (only if was not active)
      if (ny < -0.6 && player && player.onGround && !pressedKeys['_joyJump']) {
        pressedKeys['Space'] = true;
        pressedKeys['_joyJump'] = true;
        setTimeout(() => { pressedKeys['Space'] = false; }, 120);
      }
      if (ny >= -0.6) pressedKeys['_joyJump'] = false;
    }
    function resetKnob() {
      knob.style.transform = 'translate(0px,0px)';
      pressedKeys['KeyA'] = pressedKeys['ArrowLeft'] = false;
      pressedKeys['KeyD'] = pressedKeys['ArrowRight'] = false;
      pressedKeys['_joyJump'] = false;
    }

    base.addEventListener('touchstart', onJoyStart, { passive: false });
    base.addEventListener('touchmove',  onJoyMove,  { passive: false });
    base.addEventListener('touchend',   onJoyEnd,   { passive: false });
    base.addEventListener('touchcancel',onJoyEnd,   { passive: false });
  }

  // Jump button
  window.mbJumpPress = function(e) {
    e.preventDefault();
    pressedKeys['Space'] = true; pressedKeys['ArrowUp'] = true; pressedKeys['KeyW'] = true;
  };
  window.mbJumpRelease = function(e) {
    e.preventDefault();
    pressedKeys['Space'] = false; pressedKeys['ArrowUp'] = false; pressedKeys['KeyW'] = false;
  };

  // Shoot button — hold to auto-shoot
  let shootInterval = null;
  window.mbShootPress = function(e) {
    e.preventDefault();
    mbFireShot();
    shootInterval = setInterval(mbFireShot, 200);
  };
  window.mbShootRelease = function(e) {
    e.preventDefault();
    clearInterval(shootInterval); shootInterval = null;
  };
  function mbFireShot() {
    if (!player || !gRunning) return;
    const px = player.x - scrollX + player.w / 2;
    const py = player.y + player.h / 2;
    mouseX = player.facingRight ? px + 120 : px - 120;
    mouseY = py;
    shoot();
  }

  // Dash button
  window.mbDashPress = function(e) {
    e.preventDefault();
    pressedKeys['ShiftLeft'] = true; pressedKeys['ShiftRight'] = true;
  };
  window.mbDashRelease = function(e) {
    e.preventDefault();
    pressedKeys['ShiftLeft'] = false; pressedKeys['ShiftRight'] = false;
  };

  // Show/hide when level launches/stops
  const origLaunch = window.launchLevel;
  if (origLaunch) {
    window.launchLevel = function(lvId) {
      origLaunch(lvId);
      if (isTouchDevice()) { showMobileControls(true); setupJoystick(); }
    };
  }
  const origStop = window.stopGame;
  window.stopGame = function() {
    origStop();
    showMobileControls(false);
    if (shootInterval) { clearInterval(shootInterval); shootInterval = null; }
  };

  // Initial setup if already touch device
  if (isTouchDevice()) {
    document.addEventListener('DOMContentLoaded', setupJoystick);
    setupJoystick();
  }
})();