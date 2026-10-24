// Focus Timer: a focus and break timer with tasks and daily statistics, stored in localStorage.

// ---------- helpers ----------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function detectLang() {
  return (navigator.language || '').toLowerCase().match(/^(nb|nn|no)/) ? 'nb' : 'en';
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 2200);
}

async function copyText(text, okMsg, promptMsg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg);
  } catch {
    prompt(promptMsg, text);
  }
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// Shared links carry their data in the #fragment, which browsers never send to a server.
function encodeHash(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeHash(str) {
  try {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0))));
  } catch {
    return null;
  }
}

// ---------- texts ----------

const T = {
  en: {
    appName: 'Focus Timer', tagline: 'Free. No sign-up. Nothing leaves your browser.', settings: 'Settings',
    m_focus: 'Focus', m_short: 'Short break', m_long: 'Long break',
    p_focus: 'Time to focus', p_short: 'Take a short break', p_long: 'Take a long break', paused: 'Paused',
    start: 'Start', pause: 'Pause', resume: 'Resume', reset: 'Reset', skip: 'Skip',
    keys: 'Tip: press Space to start or pause.',
    working: 'Working on: {task}', noTask: 'Pick a task on the right, or just start.',
    tasksTitle: 'Tasks', taskPh: 'What are you working on?', est: 'Blocks', add: 'Add',
    clearDone: 'Clear finished', taskSum: '{done} of {total} blocks done · about {time} left',
    noTasks: 'Add what you want to get done today. Click a task to work on it.',
    remove: 'Remove', markDone: 'Done', active: 'Now',
    statsTitle: 'Your focus', today: 'Today', blocks: 'Blocks today', streak: 'Days in a row', week: 'Last 7 days',
    focusMin: 'Focus (minutes)', shortMin: 'Short break (minutes)', longMin: 'Long break (minutes)',
    every: 'Long break after (focus blocks)', autoBreak: 'Start breaks by themselves',
    autoFocus: 'Start the next focus block by itself', sound: 'Play a sound when time is up',
    clearStats: 'Clear statistics', cancel: 'Cancel', save: 'Save',
    confirmClearStats: 'Clear all focus statistics?', confirmReset: 'Stop and reset this block?',
    privacy: 'Everything stays in this browser. There is no server, no account and no tracking.',
    madeBy: 'An example app by the Kodeby team.', source: 'Source code',
    doneFocus: 'Focus block done. Time for a break.', doneBreak: 'Break is over. Ready to focus?',
    ex1: 'Reply to customer emails', ex2: 'Write the project proposal', ex3: 'Plan next week',
  },
  nb: {
    appName: 'Fokustimer', tagline: 'Gratis. Ingen konto. Ingenting forlater nettleseren.', settings: 'Innstillinger',
    m_focus: 'Fokus', m_short: 'Kort pause', m_long: 'Lang pause',
    p_focus: 'Tid for å fokusere', p_short: 'Ta en kort pause', p_long: 'Ta en lang pause', paused: 'På pause',
    start: 'Start', pause: 'Pause', resume: 'Fortsett', reset: 'Nullstill', skip: 'Hopp over',
    keys: 'Tips: trykk mellomrom for å starte eller pause.',
    working: 'Jobber med: {task}', noTask: 'Velg en oppgave til høyre, eller bare start.',
    tasksTitle: 'Oppgaver', taskPh: 'Hva jobber du med?', est: 'Økter', add: 'Legg til',
    clearDone: 'Fjern ferdige', taskSum: '{done} av {total} økter gjort · omtrent {time} igjen',
    noTasks: 'Legg inn det du vil få gjort i dag. Klikk på en oppgave for å jobbe med den.',
    remove: 'Fjern', markDone: 'Ferdig', active: 'Nå',
    statsTitle: 'Fokuset ditt', today: 'I dag', blocks: 'Økter i dag', streak: 'Dager på rad', week: 'Siste 7 dager',
    focusMin: 'Fokus (minutter)', shortMin: 'Kort pause (minutter)', longMin: 'Lang pause (minutter)',
    every: 'Lang pause etter (fokusøkter)', autoBreak: 'Start pausene av seg selv',
    autoFocus: 'Start neste fokusøkt av seg selv', sound: 'Spill en lyd når tiden er ute',
    clearStats: 'Nullstill statistikk', cancel: 'Avbryt', save: 'Lagre',
    confirmClearStats: 'Nullstille all fokusstatistikk?', confirmReset: 'Stoppe og nullstille denne økten?',
    privacy: 'Alt blir i denne nettleseren. Det er ingen server, ingen konto og ingen sporing.',
    madeBy: 'En eksempelapp fra Kodeby-teamet.', source: 'Kildekode',
    doneFocus: 'Fokusøkten er ferdig. Tid for pause.', doneBreak: 'Pausen er over. Klar for å fokusere?',
    ex1: 'Svare på e-post fra kunder', ex2: 'Skrive prosjekttilbudet', ex3: 'Planlegge neste uke',
  },
};

const LOCALES = { en: 'en-GB', nb: 'nb-NO' };
const STORAGE_KEY = 'focus-timer-v1';
const RING = 2 * Math.PI * 118;

// ---------- state ----------

function freshState(lang) {
  const ex = (key, est) => ({ id: uid(), title: T[lang][key], est, count: 0, done: false });
  const tasks = [ex('ex1', 1), ex('ex2', 3), ex('ex3', 1)];
  return {
    version: 1, lang,
    settings: { focus: 25, short: 5, long: 15, every: 4, autoBreak: true, autoFocus: false, sound: true },
    tasks, activeTask: tasks[1].id,
    timer: { mode: 'focus', running: false, endsAt: 0, left: 25 * 60, round: 0 },
    log: {},
  };
}

function clampInt(v, min, max, d) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!d || d.version !== 1) return null;
    const base = freshState(d.lang === 'nb' ? 'nb' : 'en');
    const s = d.settings || {};
    base.settings = {
      focus: clampInt(s.focus, 1, 180, 25), short: clampInt(s.short, 1, 60, 5), long: clampInt(s.long, 1, 90, 15),
      every: clampInt(s.every, 2, 12, 4), autoBreak: s.autoBreak !== false, autoFocus: !!s.autoFocus, sound: s.sound !== false,
    };
    if (Array.isArray(d.tasks)) {
      base.tasks = d.tasks.slice(0, 200).filter(x => x && typeof x.title === 'string').map(x => ({
        id: typeof x.id === 'string' ? x.id.slice(0, 20) : uid(), title: x.title.slice(0, 120),
        est: clampInt(x.est, 1, 20, 1), count: clampInt(x.count, 0, 999, 0), done: !!x.done,
      }));
    }
    base.activeTask = base.tasks.some(x => x.id === d.activeTask) ? d.activeTask : '';
    const tm = d.timer || {};
    base.timer = {
      mode: ['focus', 'short', 'long'].includes(tm.mode) ? tm.mode : 'focus', running: !!tm.running,
      endsAt: Number(tm.endsAt) || 0, left: clampInt(tm.left, 0, 180 * 60, base.settings.focus * 60), round: clampInt(tm.round, 0, 12, 0),
    };
    if (d.log && typeof d.log === 'object') {
      for (const [k, v] of Object.entries(d.log)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v) base.log[k] = { min: clampInt(v.min, 0, 1440, 0), n: clampInt(v.n, 0, 200, 0) };
      }
    }
    return base;
  } catch {
    return null;
  }
}

let state = load() || freshState(detectLang());

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage blocked: the timer still works */ }
}

function t(key, vars) {
  let s = (T[state.lang] && T[state.lang][key]) ?? T.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function modeSeconds(mode) {
  return state.settings[mode] * 60;
}

function secondsLeft() {
  const tm = state.timer;
  return tm.running ? Math.max(0, Math.ceil((tm.endsAt - Date.now()) / 1000)) : tm.left;
}

function mmss(sec) {
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}

function durationText(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${m ? `${m} min` : ''}`.trim() : `${m} min`;
}

// ---------- sound ----------

let audio = null;
function unlockAudio() {
  try { audio ||= new AudioContext(); audio.resume(); } catch { /* no sound */ }
}

function chime() {
  if (!state.settings.sound || !audio) return;
  [0, 0.22, 0.44].forEach((at, i) => {
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = 'sine';
    o.frequency.value = [660, 880, 990][i];
    g.gain.setValueAtTime(0.0001, audio.currentTime + at);
    g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + at + 0.5);
    o.connect(g).connect(audio.destination);
    o.start(audio.currentTime + at);
    o.stop(audio.currentTime + at + 0.55);
  });
}

// ---------- timer ----------

function logFocus(minutes, finished) {
  if (minutes <= 0 && !finished) return;
  const k = dayKey();
  state.log[k] ||= { min: 0, n: 0 };
  state.log[k].min += minutes;
  if (finished) state.log[k].n += 1;
}

function setMode(mode, autoStart) {
  state.timer = { ...state.timer, mode, running: false, left: modeSeconds(mode), endsAt: 0 };
  if (autoStart) start();
}

function start() {
  unlockAudio();
  const tm = state.timer;
  if (tm.running) return;
  tm.running = true;
  tm.endsAt = Date.now() + tm.left * 1000;
  save();
  render();
}

function pause() {
  const tm = state.timer;
  if (!tm.running) return;
  tm.left = secondsLeft();
  tm.running = false;
  save();
  render();
}

function finish(silent) {
  const tm = state.timer;
  if (tm.mode === 'focus') {
    logFocus(state.settings.focus, true);
    const task = state.tasks.find(x => x.id === state.activeTask);
    if (task) task.count += 1;
    tm.round += 1;
    const long = tm.round >= state.settings.every;
    if (long) tm.round = 0;
    setMode(long ? 'long' : 'short', state.settings.autoBreak && !silent);
    if (!silent) { chime(); toast(t('doneFocus')); }
  } else {
    setMode('focus', state.settings.autoFocus && !silent);
    if (!silent) { chime(); toast(t('doneBreak')); }
  }
  save();
  render();
}

function skip() {
  const tm = state.timer;
  if (tm.mode === 'focus') {
    // Count the minutes you did focus, but not as a finished block.
    logFocus(Math.floor((modeSeconds('focus') - secondsLeft()) / 60), false);
    tm.round = (tm.round + 1) % state.settings.every;
    setMode(tm.round === 0 ? 'long' : 'short', false);
  } else {
    setMode('focus', false);
  }
  save();
  render();
}

function tick() {
  if (state.timer.running && secondsLeft() <= 0) finish(false);
  renderClock();
}

// ---------- rendering ----------

function renderClock() {
  const tm = state.timer;
  const left = secondsLeft();
  const total = modeSeconds(tm.mode);
  $('#clock').textContent = mmss(left);
  $('#ring').style.strokeDashoffset = String(RING * (1 - left / total));
  $('#phase').textContent = tm.running ? t('p_' + tm.mode) : left < total ? t('paused') : t('p_' + tm.mode);
  document.title = tm.running || left < total ? `${mmss(left)} · ${t('m_' + tm.mode)}` : t('appName');
}

function renderTimer() {
  const tm = state.timer;
  document.body.dataset.mode = tm.mode;
  $$('.modes button').forEach(b => { b.classList.toggle('on', b.dataset.mode === tm.mode); b.setAttribute('aria-selected', b.dataset.mode === tm.mode); });
  $('#btn-start').textContent = tm.running ? t('pause') : tm.left < modeSeconds(tm.mode) ? t('resume') : t('start');
  $('#dots').innerHTML = Array.from({ length: state.settings.every }, (_, i) => `<span class="${i < tm.round ? 'on' : ''}"></span>`).join('');
  const task = state.tasks.find(x => x.id === state.activeTask && !x.done);
  $('#working').innerHTML = task ? esc(t('working', { task: task.title })).replace(esc(task.title), `<strong>${esc(task.title)}</strong>`) : esc(t('noTask'));
  renderClock();
}

function renderTasks() {
  const list = state.tasks;
  $('#tasks').innerHTML = list.length ? list.map(x => `
    <li class="task ${x.done ? 'done' : ''} ${x.id === state.activeTask && !x.done ? 'active' : ''}" data-id="${x.id}">
      <input type="checkbox" ${x.done ? 'checked' : ''} aria-label="${esc(t('markDone'))}">
      <button type="button" class="task-title">${esc(x.title)}${x.id === state.activeTask && !x.done ? ` <span class="now">${esc(t('active'))}</span>` : ''}</button>
      <span class="count" title="${x.count}/${x.est}">${Array.from({ length: Math.max(x.est, x.count) }, (_, i) => `<i class="${i < x.count ? 'on' : ''}"></i>`).join('')}</span>
      <button type="button" class="icon" data-remove aria-label="${esc(t('remove'))}">×</button>
    </li>`).join('') : `<li class="empty">${esc(t('noTasks'))}</li>`;
  const open = list.filter(x => !x.done);
  const total = list.reduce((s, x) => s + x.est, 0);
  const done = list.reduce((s, x) => s + Math.min(x.count, x.est) + (x.done ? Math.max(0, x.est - x.count) : 0), 0);
  const leftBlocks = open.reduce((s, x) => s + Math.max(0, x.est - x.count), 0);
  $('#task-sum').textContent = list.length ? t('taskSum', { done, total, time: durationText(leftBlocks * state.settings.focus) }) : '';
  $('#btn-clear-done').hidden = !list.some(x => x.done);
}

function renderStats() {
  const k = dayKey();
  const today = state.log[k] || { min: 0, n: 0 };
  let streak = 0;
  const d = new Date();
  if (!state.log[k] || !state.log[k].n) d.setDate(d.getDate() - 1);
  while (state.log[dayKey(d)] && state.log[dayKey(d)].n) { streak++; d.setDate(d.getDate() - 1); }
  $('#stats').innerHTML = `
    <div class="stat"><span>${esc(t('today'))}</span><strong>${esc(durationText(today.min))}</strong></div>
    <div class="stat"><span>${esc(t('blocks'))}</span><strong>${today.n}</strong></div>
    <div class="stat"><span>${esc(t('streak'))}</span><strong>${streak}</strong></div>`;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const x = new Date();
    x.setDate(x.getDate() - i);
    days.push({ d: x, min: (state.log[dayKey(x)] || { min: 0 }).min });
  }
  const max = Math.max(60, ...days.map(x => x.min));
  const fmt = new Intl.DateTimeFormat(LOCALES[state.lang], { weekday: 'short' });
  $('#week').innerHTML = `<p>${esc(t('week'))}</p><div class="bars">` + days.map((x, i) => `
    <div class="bar-col ${i === 6 ? 'today' : ''}" title="${esc(durationText(x.min))}">
      <span class="bar-val">${x.min ? esc(durationText(x.min)) : ''}</span>
      <span class="bar" data-h="${Math.round((x.min / max) * 100)}"></span>
      <span class="bar-day">${esc(fmt.format(x.d))}</span>
    </div>`).join('') + '</div>';
  // Heights are set through the DOM, since the Content Security Policy blocks inline style attributes.
  $$('#week .bar').forEach(b => { b.style.height = `${Math.max(2, b.dataset.h)}%`; });
}

function applyLanguage() {
  document.documentElement.lang = state.lang;
  $('#lang').value = state.lang;
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
}

function render() {
  renderTimer();
  renderTasks();
  renderStats();
}

// ---------- events ----------

$('#btn-start').addEventListener('click', () => (state.timer.running ? pause() : start()));
$('#btn-skip').addEventListener('click', skip);
$('#btn-reset').addEventListener('click', () => {
  const tm = state.timer;
  if ((tm.running || tm.left < modeSeconds(tm.mode)) && !confirm(t('confirmReset'))) return;
  setMode(tm.mode, false);
  save();
  render();
});

$$('.modes button').forEach(b => b.addEventListener('click', () => {
  const tm = state.timer;
  if (b.dataset.mode === tm.mode) return;
  if (tm.running && !confirm(t('confirmReset'))) return;
  setMode(b.dataset.mode, false);
  save();
  render();
}));

document.addEventListener('keydown', e => {
  if (e.code !== 'Space' || e.target.closest('input, textarea, select, button, dialog')) return;
  e.preventDefault();
  state.timer.running ? pause() : start();
});

$('#add-task').addEventListener('submit', e => {
  e.preventDefault();
  const title = $('#task-title').value.trim();
  if (!title) return;
  const task = { id: uid(), title: title.slice(0, 120), est: clampInt($('#task-est').value, 1, 20, 1), count: 0, done: false };
  state.tasks.push(task);
  if (!state.tasks.some(x => x.id === state.activeTask && !x.done)) state.activeTask = task.id;
  $('#task-title').value = '';
  save();
  render();
});

$('#tasks').addEventListener('click', e => {
  const li = e.target.closest('.task');
  if (!li) return;
  const task = state.tasks.find(x => x.id === li.dataset.id);
  if (e.target.closest('[data-remove]')) {
    state.tasks = state.tasks.filter(x => x !== task);
    if (state.activeTask === task.id) state.activeTask = '';
  } else if (e.target.matches('input[type="checkbox"]')) {
    task.done = e.target.checked;
    if (task.done && state.activeTask === task.id) state.activeTask = (state.tasks.find(x => !x.done) || {}).id || '';
  } else if (e.target.closest('.task-title') && !task.done) {
    state.activeTask = task.id;
  } else return;
  save();
  render();
});

$('#btn-clear-done').addEventListener('click', () => {
  state.tasks = state.tasks.filter(x => !x.done);
  save();
  render();
});

$('#btn-settings').addEventListener('click', () => {
  const f = $('#settings-form');
  for (const [k, v] of Object.entries(state.settings)) {
    if (typeof v === 'boolean') f.elements[k].checked = v; else f.elements[k].value = v;
  }
  $('#dlg').showModal();
});
$('#btn-cancel').addEventListener('click', () => $('#dlg').close());
$('#settings-form').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, s = state.settings;
  const old = { ...s };
  s.focus = clampInt(f.elements.focus.value, 1, 180, s.focus);
  s.short = clampInt(f.elements.short.value, 1, 60, s.short);
  s.long = clampInt(f.elements.long.value, 1, 90, s.long);
  s.every = clampInt(f.elements.every.value, 2, 12, s.every);
  s.autoBreak = f.elements.autoBreak.checked;
  s.autoFocus = f.elements.autoFocus.checked;
  s.sound = f.elements.sound.checked;
  const tm = state.timer;
  if (tm.round >= s.every) tm.round = 0;
  if (!tm.running && tm.left === old[tm.mode] * 60) tm.left = modeSeconds(tm.mode);
  save();
  $('#dlg').close();
  render();
});
$('#btn-clear-stats').addEventListener('click', () => {
  if (!confirm(t('confirmClearStats'))) return;
  state.log = {};
  save();
  render();
});

$('#lang').addEventListener('change', e => {
  state.lang = e.target.value === 'nb' ? 'nb' : 'en';
  save();
  applyLanguage();
  render();
});

// A block that ended while the page was closed still counts, without sound or auto-start.
if (state.timer.running && secondsLeft() <= 0) finish(true);
save();
applyLanguage();
render();
setInterval(tick, 250);
