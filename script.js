/* ============================================
   FitnessTakip — Application Logic (Enhanced)
   ============================================ */
(function () {
  'use strict';

  const SK = {
    USERS: 'ft_users', CURRENT: 'ft_current', WORKOUTS: 'ft_workouts',
    MEALS: 'ft_meals', BMI: 'ft_bmi', WATER: 'ft_water', SUGAR: 'ft_sugar',
    SLEEP: 'ft_sleep', WLOG: 'ft_wlog', THEME: 'ft_theme',
  };

  const MEAL_TYPES = [
    { key: 'breakfast', label: 'Kahvaltı', icon: '🌅' },
    { key: 'lunch', label: 'Öğle Yemeği', icon: '☀️' },
    { key: 'dinner', label: 'Akşam Yemeği', icon: '🌙' },
    { key: 'snack', label: 'Ara Öğün', icon: '🍎' },
  ];

  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  const gs = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
  const ss = (k, d) => localStorage.setItem(k, JSON.stringify(d));
  const today = () => new Date().toISOString().split('T')[0];
  const fmtDate = ds => new Date(ds + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
  const esc = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };

  async function hashPw(p) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Toast
  function toast(msg, type = 'success') {
    const c = $('#toastContainer'), t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', warning: '⚠️' };
    t.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
    c.appendChild(t); setTimeout(() => t.remove(), 3000);
  }

  // Modal
  function openModal(html) {
    const o = $('#modalOverlay'); $('#modalContent').innerHTML = html;
    o.classList.add('active');
    o.onclick = e => { if (e.target === o) closeModal(); };
  }
  function closeModal() { $('#modalOverlay').classList.remove('active'); }

  // Theme
  function initTheme() {
    const saved = localStorage.getItem(SK.THEME) || 'dark';
    document.body.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
    $('#themeToggle').addEventListener('click', () => {
      const cur = document.body.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', next);
      localStorage.setItem(SK.THEME, next);
      updateThemeIcon(next);
    });
  }
  function updateThemeIcon(t) { const b = $('#themeToggle'); if (b) b.textContent = t === 'dark' ? '☀️' : '🌙'; }

  // Auth
  async function initAdmin() {
    const u = gs(SK.USERS);
    if (!u.find(x => x.username === 'admin')) {
      u.push({ id: uid(), username: 'admin', email: 'admin@fitnesstakip.com', password: await hashPw('admin123'), age: 30, gender: 'male', role: 'admin', createdAt: new Date().toISOString() });
      ss(SK.USERS, u);
    }
  }
  function curUser() { const id = localStorage.getItem(SK.CURRENT); if (!id) return null; return gs(SK.USERS).find(u => u.id === id) || null; }
  function setCurUser(u) { localStorage.setItem(SK.CURRENT, u.id); }
  function logout() { localStorage.removeItem(SK.CURRENT); nav('login'); toast('Çıkış yapıldı'); }

  // Router
  const PAGES = ['login', 'register', 'dashboard', 'workouts', 'nutrition', 'tracking', 'measurements', 'profile', 'admin'];
  const AUTH = ['login', 'register'];
  function nav(p) { location.hash = '#' + p; }
  function getPage() { const h = location.hash.replace('#', '') || 'login'; return PAGES.includes(h) ? h : 'login'; }

  function renderPage() {
    const page = getPage(), user = curUser();
    if (!user && !AUTH.includes(page)) { nav('login'); return; }
    if (user && AUTH.includes(page)) { nav('dashboard'); return; }
    if (page === 'admin' && user && user.role !== 'admin') { nav('dashboard'); return; }
    const nb = $('#navbar');
    if (AUTH.includes(page)) { nb.style.display = 'none'; $('.main-content').style.marginTop = '0'; }
    else { nb.style.display = ''; $('.main-content').style.marginTop = ''; }
    const tpl = $(`#tpl-${page}`); if (!tpl) return;
    const app = $('#app'); app.innerHTML = ''; app.appendChild(tpl.content.cloneNode(true));
    $$('.navbar-nav a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
    if (user) {
      $('#navUserName').textContent = user.username;
      $('#userAvatar').textContent = user.username.charAt(0).toUpperCase();
      $('#userAvatar').onclick = logout;
      $('#adminNavLink').classList.toggle('hidden', user.role !== 'admin');
    }
    const init = { login: initLogin, register: initRegister, dashboard: initDash, workouts: initWorkouts, nutrition: initNutrition, tracking: initTracking, measurements: initMeasurements, profile: initProfile, admin: initAdminPage };
    if (init[page]) init[page]();
  }

  // Sub-tab system
  function initSubTabs(containerSel) {
    const tabs = $$(containerSel + ' .sub-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const parent = tab.closest('.animate-in');
        parent.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
        parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const target = parent.querySelector('#tab-' + tab.dataset.tab);
        if (target) target.classList.add('active');
      });
    });
  }

  // Login
  function initLogin() {
    $('#loginForm').addEventListener('submit', async e => {
      e.preventDefault();
      const un = $('#loginUsername').value.trim(), pw = $('#loginPassword').value;
      const users = gs(SK.USERS), h = await hashPw(pw);
      const u = users.find(x => x.username === un && x.password === h);
      if (!u) { toast('Kullanıcı adı veya şifre hatalı!', 'error'); return; }
      setCurUser(u); toast(`Hoş geldiniz, ${u.username}!`); nav('dashboard');
    });
  }

  // Register
  function initRegister() {
    $('#registerForm').addEventListener('submit', async e => {
      e.preventDefault();
      const un = $('#regUsername').value.trim(), em = $('#regEmail').value.trim();
      const age = parseInt($('#regAge').value), gender = $('#regGender').value;
      const pw = $('#regPassword').value, cf = $('#regPasswordConfirm').value;
      if (pw !== cf) { toast('Şifreler eşleşmiyor!', 'error'); return; }
      const users = gs(SK.USERS);
      if (users.find(u => u.username === un)) { toast('Bu kullanıcı adı alınmış!', 'error'); return; }
      const nu = { id: uid(), username: un, email: em, password: await hashPw(pw), age, gender, role: 'user', createdAt: new Date().toISOString() };
      users.push(nu); ss(SK.USERS, users); setCurUser(nu); toast('Kayıt başarılı!'); nav('dashboard');
    });
  }

  // Dashboard
  function initDash() {
    const u = curUser(); if (!u) return;
    const hr = new Date().getHours();
    let g = 'İyi Günler'; if (hr < 12) g = 'Günaydın'; else if (hr >= 18) g = 'İyi Akşamlar';
    $('#dashGreeting').textContent = `${g}, ${u.username} 👋`;
    const wo = gs(SK.WORKOUTS).filter(w => w.userId === u.id);
    const tm = gs(SK.MEALS).filter(m => m.userId === u.id && m.date === today());
    const bmi = gs(SK.BMI).filter(b => b.userId === u.id);
    const water = gs(SK.WATER).filter(w => w.userId === u.id && w.date === today());
    const sleep = gs(SK.SLEEP).filter(s => s.userId === u.id).sort((a, b) => new Date(b.date) - new Date(a.date));
    $('#statWorkouts').textContent = wo.length;
    $('#statMeals').textContent = tm.length;
    const tc = tm.reduce((s, m) => s + m.foods.reduce((a, f) => a + (f.calories || 0), 0), 0);
    $('#statCalories').textContent = tc;
    const wc = water.length > 0 ? water[0].count : 0;
    $('#statWater').textContent = wc;
    const ls = sleep.length > 0 ? sleep[0].hours : null;
    $('#statSleep').textContent = ls !== null ? ls + 'h' : '—';
    const lb = bmi.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    $('#statBMI').textContent = lb ? lb.bmi.toFixed(1) : '—';
    // Recent workouts
    const rw = wo.slice(-3).reverse(), wc2 = $('#dashRecentWorkouts');
    if (!rw.length) wc2.innerHTML = '<div class="empty-state"><p>Henüz antrenman planı yok.</p><a href="#workouts" class="btn btn-primary btn-sm">Plan Oluştur</a></div>';
    else wc2.innerHTML = rw.map(w => `<div class="list-item"><div class="item-icon card-icon green">🏋️</div><div class="item-content"><div class="item-title">${esc(w.name)}</div><div class="item-subtitle">${w.exercises.length} egzersiz</div></div></div>`).join('');
    // Recent meals
    const mc = $('#dashRecentMeals');
    if (!tm.length) mc.innerHTML = '<div class="empty-state"><p>Bugün öğün eklenmemiş.</p><a href="#nutrition" class="btn btn-primary btn-sm">Öğün Ekle</a></div>';
    else mc.innerHTML = tm.slice(0, 4).map(m => {
      const mt = MEAL_TYPES.find(t => t.key === m.mealType);
      const cal = m.foods.reduce((s, f) => s + (f.calories || 0), 0);
      return `<div class="list-item"><div class="item-icon card-icon blue">${mt ? mt.icon : '🍽️'}</div><div class="item-content"><div class="item-title">${mt ? mt.label : m.mealType}</div><div class="item-subtitle">${cal} kcal · ${m.foods.length} yiyecek</div></div></div>`;
    }).join('');
  }

  // Workouts
  function initWorkouts() {
    const u = curUser(); if (!u) return;
    renderWorkoutList();
    $('#btnNewWorkout').addEventListener('click', () => openWorkoutModal());
    $('#btnWorkoutTimer').addEventListener('click', openTimer);
    renderWorkoutLog();
  }

  function renderWorkoutList() {
    const u = curUser(), wo = gs(SK.WORKOUTS).filter(w => w.userId === u.id), c = $('#workoutList');
    if (!wo.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">🏋️</div><h3>Henüz antrenman planınız yok</h3><p>İlk planınızı oluşturarak başlayın!</p></div>'; return; }
    c.innerHTML = wo.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(w => `
      <div class="list-item"><div class="item-icon card-icon green">🏋️</div>
      <div class="item-content"><div class="item-title">${esc(w.name)}</div>
      <div class="item-subtitle">${w.exercises.length} egzersiz · ${new Date(w.createdAt).toLocaleDateString('tr-TR')}</div>
      <div class="mt-8" style="display:flex;flex-wrap:wrap;gap:4px;">${w.exercises.map(ex => `<span class="exercise-tag">${esc(ex.name)} ${ex.sets}×${ex.reps} ${ex.weight ? ex.weight + 'kg' : ''}</span>`).join('')}</div></div>
      <div class="item-actions">
        <button class="btn btn-secondary btn-sm" onclick="window.FT.logWorkout('${w.id}')" title="Tamamla">✅</button>
        <button class="btn btn-secondary btn-icon" onclick="window.FT.editWorkout('${w.id}')" title="Düzenle">✏️</button>
        <button class="btn btn-danger btn-icon" onclick="window.FT.deleteWorkout('${w.id}')" title="Sil">🗑️</button>
      </div></div>`).join('');
  }

  function openWorkoutModal(editId) {
    const u = curUser(); let ex = null;
    if (editId) ex = gs(SK.WORKOUTS).find(w => w.id === editId && w.userId === u.id);
    const exercises = ex ? [...ex.exercises] : [];
    const title = ex ? 'Antrenman Düzenle' : 'Yeni Antrenman Planı';
    function renderEx() {
      const el = document.getElementById('modalExList'); if (!el) return;
      if (!exercises.length) { el.innerHTML = '<p class="text-muted text-center text-sm">Henüz egzersiz eklenmedi.</p>'; return; }
      el.innerHTML = exercises.map((e, i) => `<div class="list-item" style="margin-bottom:8px;"><div class="item-content"><div class="item-title">${esc(e.name)}</div><div class="item-subtitle">${e.sets} set × ${e.reps} tekrar ${e.weight ? '· ' + e.weight + ' kg' : ''}</div></div><button class="btn btn-danger btn-icon btn-sm" onclick="window.FT._rmEx(${i})">✕</button></div>`).join('');
    }
    window.FT._rmEx = i => { exercises.splice(i, 1); renderEx(); };
    openModal(`<div class="modal-header"><h2>${title}</h2><button class="modal-close" onclick="window.FT.closeModal()">✕</button></div>
      <div class="form-group"><label class="form-label">Plan Adı</label><input class="form-input" id="mWName" placeholder="örn: Göğüs + Triceps" value="${ex ? esc(ex.name) : ''}"></div>
      <h4 class="mb-12">Egzersizler</h4><div id="modalExList"></div>
      <div style="border:1px dashed var(--border-color);border-radius:var(--radius-md);padding:16px;margin-top:12px;">
        <div class="form-group mb-8"><input class="form-input" id="exN" placeholder="Egzersiz adı"></div>
        <div class="form-row mb-8"><div class="form-group mb-8"><input class="form-input" type="number" id="exS" placeholder="Set" min="1"></div><div class="form-group mb-8"><input class="form-input" type="number" id="exR" placeholder="Tekrar" min="1"></div><div class="form-group mb-8"><input class="form-input" type="number" id="exW" placeholder="Kg" min="0" step="0.5"></div></div>
        <button class="btn btn-secondary btn-sm w-full" id="btnAddEx">+ Egzersiz Ekle</button></div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="window.FT.closeModal()">İptal</button><button class="btn btn-primary" id="btnSaveW">Kaydet</button></div>`);
    renderEx();
    document.getElementById('btnAddEx').addEventListener('click', () => {
      const n = document.getElementById('exN').value.trim(), s = parseInt(document.getElementById('exS').value) || 0, r = parseInt(document.getElementById('exR').value) || 0, w = parseFloat(document.getElementById('exW').value) || 0;
      if (!n || s < 1 || r < 1) { toast('Egzersiz adı, set ve tekrar giriniz.', 'warning'); return; }
      exercises.push({ name: n, sets: s, reps: r, weight: w });
      ['exN', 'exS', 'exR', 'exW'].forEach(id => document.getElementById(id).value = '');
      renderEx();
    });
    document.getElementById('btnSaveW').addEventListener('click', () => {
      const n = document.getElementById('mWName').value.trim();
      if (!n) { toast('Plan adı giriniz.', 'warning'); return; }
      if (!exercises.length) { toast('En az bir egzersiz ekleyin.', 'warning'); return; }
      const wo = gs(SK.WORKOUTS);
      if (ex) { const i = wo.findIndex(w => w.id === ex.id); if (i !== -1) { wo[i].name = n; wo[i].exercises = exercises; } toast('Plan güncellendi!'); }
      else { wo.push({ id: uid(), userId: u.id, name: n, exercises, createdAt: new Date().toISOString() }); toast('Plan oluşturuldu!'); }
      ss(SK.WORKOUTS, wo); closeModal(); renderWorkoutList();
    });
  }

  function deleteWorkout(id) {
    if (!confirm('Bu planı silmek istediğinize emin misiniz?')) return;
    ss(SK.WORKOUTS, gs(SK.WORKOUTS).filter(w => w.id !== id)); toast('Plan silindi.'); renderWorkoutList();
  }

  // Workout Log
  function logWorkout(wId) {
    const u = curUser(), wo = gs(SK.WORKOUTS).find(w => w.id === wId);
    if (!wo) return;
    const logs = gs(SK.WLOG);
    logs.push({ id: uid(), userId: u.id, workoutId: wId, workoutName: wo.name, exercises: wo.exercises, date: today(), createdAt: new Date().toISOString() });
    ss(SK.WLOG, logs); toast(`"${wo.name}" tamamlandı olarak kaydedildi! 💪`); renderWorkoutLog();
  }

  function renderWorkoutLog() {
    const u = curUser(), logs = gs(SK.WLOG).filter(l => l.userId === u.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const c = $('#workoutLogList'); if (!c) return;
    if (!logs.length) { c.innerHTML = '<div class="empty-state"><p>Henüz antrenman geçmişi yok. Bir planı tamamlayarak başlayın.</p></div>'; return; }
    c.innerHTML = logs.slice(0, 10).map(l => `<div class="list-item"><div class="item-icon card-icon green">✅</div><div class="item-content"><div class="item-title">${esc(l.workoutName)}</div><div class="item-subtitle">${fmtDate(l.date)} · ${l.exercises.length} egzersiz</div></div></div>`).join('');
  }

  // Timer
  function openTimer() {
    let seconds = 0, running = false, interval;
    const div = document.createElement('div'); div.className = 'timer-overlay'; div.id = 'timerOverlay';
    div.innerHTML = `<div class="timer-label">⏱️ Antrenman Zamanlayıcısı</div><div class="timer-display" id="timerDisp">00:00</div>
      <div class="timer-buttons"><button class="btn btn-primary btn-lg" id="timerToggle">▶ Başlat</button><button class="btn btn-secondary btn-lg" id="timerReset">Sıfırla</button><button class="btn btn-danger btn-lg" id="timerClose">Kapat</button></div>`;
    document.body.appendChild(div);
    const disp = document.getElementById('timerDisp'), tog = document.getElementById('timerToggle');
    function upd() { const m = Math.floor(seconds / 60), s = seconds % 60; disp.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }
    tog.addEventListener('click', () => {
      if (running) { clearInterval(interval); running = false; tog.textContent = '▶ Devam'; }
      else { interval = setInterval(() => { seconds++; upd(); }, 1000); running = true; tog.textContent = '⏸ Durdur'; }
    });
    document.getElementById('timerReset').addEventListener('click', () => { clearInterval(interval); seconds = 0; running = false; upd(); tog.textContent = '▶ Başlat'; });
    document.getElementById('timerClose').addEventListener('click', () => { clearInterval(interval); div.remove(); });
  }

  // Nutrition
  let curNutDate = today();
  function initNutrition() {
    curNutDate = today(); updNutDate(); renderNut();
    $('#btnNewMeal').addEventListener('click', () => openMealModal());
    $('#btnPrevDay').addEventListener('click', () => chgDate(-1));
    $('#btnNextDay').addEventListener('click', () => chgDate(1));
  }
  function chgDate(d) { const dt = new Date(curNutDate + 'T00:00:00'); dt.setDate(dt.getDate() + d); curNutDate = dt.toISOString().split('T')[0]; updNutDate(); renderNut(); }
  function updNutDate() { const e = $('#nutritionDate'); if (e) e.textContent = fmtDate(curNutDate); }

  function renderNut() {
    const u = curUser(); if (!u) return; const c = $('#nutritionContent'); if (!c) return;
    const meals = gs(SK.MEALS).filter(m => m.userId === u.id && m.date === curNutDate);
    if (!meals.length) { c.innerHTML = '<div class="empty-state"><div class="empty-icon">🥗</div><h3>Bu gün için öğün yok</h3><p>Öğün ekleyerek beslenme takibinize başlayın.</p></div>'; return; }
    let html = '', tc = 0, tp = 0, tk = 0, ty = 0;
    MEAL_TYPES.forEach(mt => {
      const tm = meals.filter(m => m.mealType === mt.key); if (!tm.length) return;
      html += `<div class="meal-section"><div class="meal-section-header"><h3>${mt.icon} ${mt.label}</h3></div>`;
      tm.forEach(m => m.foods.forEach(f => {
        tc += f.calories || 0; tp += f.protein || 0; tk += f.carbs || 0; ty += f.fat || 0;
        html += `<div class="list-item"><div class="item-content"><div class="item-title">${esc(f.name)}</div><div class="item-subtitle">${f.calories} kcal · P:${f.protein}g · K:${f.carbs}g · Y:${f.fat}g</div></div><button class="btn btn-danger btn-icon btn-sm" onclick="window.FT.deleteMeal('${m.id}')" title="Sil">🗑️</button></div>`;
      }));
      html += '</div>';
    });
    html += `<div class="meal-total"><div class="meal-total-item"><div class="total-value text-gradient">${tc}</div><div class="total-label">Kalori</div></div><div class="meal-total-item"><div class="total-value" style="color:#10b981">${tp}g</div><div class="total-label">Protein</div></div><div class="meal-total-item"><div class="total-value" style="color:#06b6d4">${tk}g</div><div class="total-label">Karbonhidrat</div></div><div class="meal-total-item"><div class="total-value" style="color:#f59e0b">${ty}g</div><div class="total-label">Yağ</div></div></div>`;
    c.innerHTML = html;
  }

  function openMealModal() {
    const foods = [];
    function renderF() {
      const l = document.getElementById('mFoodList'); if (!l) return;
      if (!foods.length) { l.innerHTML = '<p class="text-muted text-center text-sm">Henüz yiyecek eklenmedi.</p>'; return; }
      l.innerHTML = foods.map((f, i) => `<div class="list-item" style="margin-bottom:8px;"><div class="item-content"><div class="item-title">${esc(f.name)}</div><div class="item-subtitle">${f.calories} kcal · P:${f.protein}g · K:${f.carbs}g · Y:${f.fat}g</div></div><button class="btn btn-danger btn-icon btn-sm" onclick="window.FT._rmF(${i})">✕</button></div>`).join('');
    }
    window.FT._rmF = i => { foods.splice(i, 1); renderF(); };
    openModal(`<div class="modal-header"><h2>Öğün Ekle</h2><button class="modal-close" onclick="window.FT.closeModal()">✕</button></div>
      <div class="form-group"><label class="form-label">Öğün Tipi</label><select class="form-select" id="mMealType">${MEAL_TYPES.map(mt => `<option value="${mt.key}">${mt.icon} ${mt.label}</option>`).join('')}</select></div>
      <h4 class="mb-12">Yiyecekler</h4><div id="mFoodList"></div>
      <div style="border:1px dashed var(--border-color);border-radius:var(--radius-md);padding:16px;margin-top:12px;">
        <div class="form-group mb-8"><input class="form-input" id="fN" placeholder="Yiyecek adı"></div>
        <div class="form-row mb-8"><div class="form-group mb-8"><input class="form-input" type="number" id="fC" placeholder="Kalori" min="0"></div><div class="form-group mb-8"><input class="form-input" type="number" id="fP" placeholder="Protein(g)" min="0" step="0.1"></div></div>
        <div class="form-row mb-8"><div class="form-group mb-8"><input class="form-input" type="number" id="fK" placeholder="Karb.(g)" min="0" step="0.1"></div><div class="form-group mb-8"><input class="form-input" type="number" id="fY" placeholder="Yağ(g)" min="0" step="0.1"></div></div>
        <button class="btn btn-secondary btn-sm w-full" id="btnAddF">+ Yiyecek Ekle</button></div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="window.FT.closeModal()">İptal</button><button class="btn btn-primary" id="btnSaveM">Kaydet</button></div>`);
    renderF();
    document.getElementById('btnAddF').addEventListener('click', () => {
      const n = document.getElementById('fN').value.trim(), c = parseInt(document.getElementById('fC').value) || 0, p = parseFloat(document.getElementById('fP').value) || 0, k = parseFloat(document.getElementById('fK').value) || 0, y = parseFloat(document.getElementById('fY').value) || 0;
      if (!n) { toast('Yiyecek adı girin.', 'warning'); return; }
      foods.push({ name: n, calories: c, protein: p, carbs: k, fat: y });
      ['fN', 'fC', 'fP', 'fK', 'fY'].forEach(id => document.getElementById(id).value = '');
      renderF();
    });
    document.getElementById('btnSaveM').addEventListener('click', () => {
      if (!foods.length) { toast('En az bir yiyecek ekleyin.', 'warning'); return; }
      const u = curUser(), meals = gs(SK.MEALS);
      meals.push({ id: uid(), userId: u.id, date: curNutDate, mealType: document.getElementById('mMealType').value, foods, createdAt: new Date().toISOString() });
      ss(SK.MEALS, meals); closeModal(); toast('Öğün eklendi!'); renderNut();
    });
  }

  function deleteMeal(id) { if (!confirm('Bu öğünü silmek istiyor musunuz?')) return; ss(SK.MEALS, gs(SK.MEALS).filter(m => m.id !== id)); toast('Öğün silindi.'); renderNut(); }

  // Tracking Page (Water + Sugar + Sleep)
  function initTracking() {
    initSubTabs('#trackingTabs');
    initWater(); initSugar(); initSleep();
  }

  // Water
  function initWater() {
    const u = curUser(); if (!u) return;
    const rec = gs(SK.WATER).find(w => w.userId === u.id && w.date === today()) || { count: 0 };
    updWater(rec.count);
    $('#btnAddWater').addEventListener('click', () => { const r = getWaterRec(); r.count = Math.min(r.count + 1, 30); saveWater(r); updWater(r.count); });
    $('#btnRemoveWater').addEventListener('click', () => { const r = getWaterRec(); r.count = Math.max(r.count - 1, 0); saveWater(r); updWater(r.count); });
    renderWaterChart();
  }

  function getWaterRec() {
    const u = curUser(), all = gs(SK.WATER); let r = all.find(w => w.userId === u.id && w.date === today());
    if (!r) { r = { id: uid(), userId: u.id, date: today(), count: 0 }; all.push(r); ss(SK.WATER, all); } return r;
  }
  function saveWater(r) { const all = gs(SK.WATER); const i = all.findIndex(w => w.id === r.id); if (i !== -1) all[i] = r; else all.push(r); ss(SK.WATER, all); }
  function updWater(c) {
    const el = $('#waterCount'); if (el) el.textContent = c;
    const fill = $('#waterFill'); if (fill) fill.style.height = Math.min((c / 8) * 100, 100) + '%';
  }

  function renderWaterChart() {
    const u = curUser(), c = $('#waterChartArea'); if (!c) return;
    const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().split('T')[0]); }
    const all = gs(SK.WATER).filter(w => w.userId === u.id);
    const max = Math.max(...days.map(d => { const r = all.find(w => w.date === d); return r ? r.count : 0; }), 1);
    c.innerHTML = `<div class="chart-bar-group">${days.map(d => {
      const r = all.find(w => w.date === d); const v = r ? r.count : 0;
      const h = (v / max) * 85;
      return `<div class="chart-bar-item"><div class="chart-bar-value">${v}</div><div class="chart-bar cyan" style="height:${h}%"></div><div class="chart-bar-label">${new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'short' })}</div></div>`;
    }).join('')}</div>`;
  }

  // Sugar
  function initSugar() {
    const u = curUser(); if (!u) return;
    updSugarTotal();
    $('#sugarForm').addEventListener('submit', e => {
      e.preventDefault();
      const amt = parseFloat($('#sugarAmount').value) || 0, note = $('#sugarNote').value.trim();
      if (amt <= 0) { toast('Miktar girin.', 'warning'); return; }
      const all = gs(SK.SUGAR); all.push({ id: uid(), userId: u.id, date: today(), amount: amt, note, createdAt: new Date().toISOString() });
      ss(SK.SUGAR, all); $('#sugarAmount').value = ''; $('#sugarNote').value = '';
      toast('Şeker kaydı eklendi!'); updSugarTotal(); renderSugarChart();
    });
    renderSugarChart();
  }

  function updSugarTotal() {
    const u = curUser(), all = gs(SK.SUGAR).filter(s => s.userId === u.id && s.date === today());
    const t = all.reduce((s, x) => s + x.amount, 0);
    const el = $('#sugarTodayTotal'); if (el) el.textContent = t.toFixed(1) + 'g';
  }

  function renderSugarChart() {
    const u = curUser(), c = $('#sugarChartArea'); if (!c) return;
    const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().split('T')[0]); }
    const all = gs(SK.SUGAR).filter(s => s.userId === u.id);
    const vals = days.map(d => all.filter(s => s.date === d).reduce((sum, x) => sum + x.amount, 0));
    const max = Math.max(...vals, 1);
    c.innerHTML = `<div class="chart-bar-group">${days.map((d, i) => {
      const h = (vals[i] / max) * 85;
      return `<div class="chart-bar-item"><div class="chart-bar-value">${vals[i].toFixed(0)}g</div><div class="chart-bar orange" style="height:${h}%"></div><div class="chart-bar-label">${new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'short' })}</div></div>`;
    }).join('')}</div>`;
    // Log list
    const logC = $('#sugarLogList'); if (!logC) return;
    const todayLogs = all.filter(s => s.date === today()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    logC.innerHTML = todayLogs.length ? todayLogs.map(l => `<div class="list-item"><div class="item-content"><div class="item-title">${l.amount}g</div><div class="item-subtitle">${l.note || '—'}</div></div></div>`).join('') : '';
  }

  // Sleep
  let sleepQual = 3;
  function initSleep() {
    const u = curUser(); if (!u) return;
    // Stars
    $$('#sleepQuality .sleep-star').forEach(s => {
      s.addEventListener('click', () => { sleepQual = parseInt(s.dataset.val); updStars(); });
    });
    updStars();
    $('#sleepForm').addEventListener('submit', e => {
      e.preventDefault();
      const hrs = parseFloat($('#sleepHours').value) || 0, note = ($('#sleepNote') && $('#sleepNote').value.trim()) || '';
      if (hrs <= 0) { toast('Uyku süresi girin.', 'warning'); return; }
      const all = gs(SK.SLEEP); all.push({ id: uid(), userId: u.id, date: today(), hours: hrs, quality: sleepQual, note, createdAt: new Date().toISOString() });
      ss(SK.SLEEP, all); $('#sleepHours').value = ''; if ($('#sleepNote')) $('#sleepNote').value = '';
      toast('Uyku kaydedildi!'); renderSleepChart(); renderSleepHistory();
    });
    renderSleepChart(); renderSleepHistory();
  }

  function updStars() {
    $$('#sleepQuality .sleep-star').forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= sleepQual));
  }

  function renderSleepChart() {
    const u = curUser(), c = $('#sleepChartArea'); if (!c) return;
    const days = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().split('T')[0]); }
    const all = gs(SK.SLEEP).filter(s => s.userId === u.id);
    const vals = days.map(d => { const recs = all.filter(s => s.date === d); return recs.length ? recs.reduce((s, x) => s + x.hours, 0) : 0; });
    const max = Math.max(...vals, 1);
    c.innerHTML = `<div class="chart-bar-group">${days.map((d, i) => {
      const h = (vals[i] / max) * 85;
      return `<div class="chart-bar-item"><div class="chart-bar-value">${vals[i] ? vals[i].toFixed(1) + 'h' : '—'}</div><div class="chart-bar purple" style="height:${h}%"></div><div class="chart-bar-label">${new Date(d + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'short' })}</div></div>`;
    }).join('')}</div>`;
  }

  function renderSleepHistory() {
    const u = curUser(), c = $('#sleepHistory'); if (!c) return;
    const recs = gs(SK.SLEEP).filter(s => s.userId === u.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!recs.length) { c.innerHTML = '<div class="empty-state"><p>Henüz uyku kaydı yok.</p></div>'; return; }
    c.innerHTML = recs.slice(0, 10).map(r => `<div class="list-item"><div class="item-icon card-icon indigo">🌙</div><div class="item-content"><div class="item-title">${r.hours} saat · ${'⭐'.repeat(r.quality)}</div><div class="item-subtitle">${fmtDate(r.date)}${r.note ? ' · ' + esc(r.note) : ''}</div></div></div>`).join('');
  }

  // Measurements (BMI + BMR)
  function initMeasurements() {
    initSubTabs('#measurementTabs');
    initBMI(); initBMR();
  }

  function initBMI() {
    const u = curUser(); if (!u) return;
    if (u.age) $('#bmiAge').value = u.age;
    if (u.gender) $('#bmiGender').value = u.gender;
    $('#bmiForm').addEventListener('submit', e => {
      e.preventDefault();
      const h = parseFloat($('#bmiHeight').value), w = parseFloat($('#bmiWeight').value), age = parseInt($('#bmiAge').value), gen = $('#bmiGender').value;
      const hm = h / 100, bmi = w / (hm * hm);
      let bf = gen === 'male' ? 1.20 * bmi + 0.23 * age - 16.2 : 1.20 * bmi + 0.23 * age - 5.4;
      bf = Math.max(3, Math.min(bf, 60));
      let cat, cc;
      if (bmi < 18.5) { cat = 'Zayıf'; cc = '#06b6d4'; } else if (bmi < 25) { cat = 'Normal'; cc = '#10b981'; }
      else if (bmi < 30) { cat = 'Fazla Kilolu'; cc = '#f59e0b'; } else { cat = 'Obez'; cc = '#ef4444'; }
      const mp = Math.max(0, Math.min(100, ((bmi - 15) / 25) * 100));
      $('#bmiResultArea').innerHTML = `<div class="bmi-result"><div class="bmi-value" style="color:${cc}">${bmi.toFixed(1)}</div><div class="bmi-category" style="color:${cc}">${cat}</div><div class="bmi-fat">Tahmini Vücut Yağ: <strong>${bf.toFixed(1)}%</strong></div></div>
        <div class="bmi-scale" style="position:relative;"><div class="segment underweight"></div><div class="segment normal"></div><div class="segment overweight"></div><div class="segment obese"></div><div class="bmi-marker" style="left:${mp}%"></div></div>
        <div class="bmi-labels"><span>Zayıf (&lt;18.5)</span><span>Normal (18.5-25)</span><span>Fazla Kilolu (25-30)</span><span>Obez (&gt;30)</span></div>`;
      const recs = gs(SK.BMI); recs.push({ id: uid(), userId: u.id, height: h, weight: w, bmi, bodyFat: bf, age, gender: gen, date: today(), createdAt: new Date().toISOString() });
      ss(SK.BMI, recs); renderBmiHist(); toast('BMI hesaplandı!');
    });
    renderBmiHist();
  }

  function renderBmiHist() {
    const u = curUser(), recs = gs(SK.BMI).filter(b => b.userId === u.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const c = $('#bmiHistory'); if (!c) return;
    if (!recs.length) { c.innerHTML = '<div class="empty-state"><p>Henüz BMI kaydı yok.</p></div>'; return; }
    c.innerHTML = `<div class="table-container"><table class="table"><thead><tr><th>Tarih</th><th>Boy</th><th>Kilo</th><th>BMI</th><th>Yağ%</th><th>Durum</th></tr></thead><tbody>${recs.map(r => {
      let cat, cls;
      if (r.bmi < 18.5) { cat = 'Zayıf'; cls = 'badge-blue'; } else if (r.bmi < 25) { cat = 'Normal'; cls = 'badge-green'; }
      else if (r.bmi < 30) { cat = 'Fazla Kilolu'; cls = 'badge-orange'; } else { cat = 'Obez'; cls = 'badge-red'; }
      return `<tr><td>${new Date(r.createdAt).toLocaleDateString('tr-TR')}</td><td>${r.height}cm</td><td>${r.weight}kg</td><td><strong>${r.bmi.toFixed(1)}</strong></td><td>${r.bodyFat.toFixed(1)}%</td><td><span class="badge ${cls}">${cat}</span></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  // BMR
  function initBMR() {
    const u = curUser(); if (!u) return;
    if (u.age) $('#bmrAge').value = u.age;
    if (u.gender) $('#bmrGender').value = u.gender;
    $('#bmrForm').addEventListener('submit', e => {
      e.preventDefault();
      const h = parseFloat($('#bmrHeight').value), w = parseFloat($('#bmrWeight').value), age = parseInt($('#bmrAge').value), gen = $('#bmrGender').value, act = parseFloat($('#bmrActivity').value);
      let bmr;
      if (gen === 'male') bmr = 88.362 + 13.397 * w + 4.799 * h - 5.677 * age;
      else bmr = 447.593 + 9.247 * w + 3.098 * h - 4.330 * age;
      const tdee = bmr * act;
      const prot = Math.round((tdee * 0.3) / 4), carb = Math.round((tdee * 0.45) / 4), fat = Math.round((tdee * 0.25) / 9);
      $('#bmrResultArea').innerHTML = `<div class="bmr-result">
        <div class="bmr-label">Bazal Metabolizma (BMR)</div><div class="bmr-value">${Math.round(bmr)} kcal</div>
        <div class="bmr-label mt-16">Günlük Kalori İhtiyacı (TDEE)</div><div class="bmr-tdee">${Math.round(tdee)} kcal</div>
        <div class="bmr-macros">
          <div class="bmr-macro-item"><div class="bmr-macro-value" style="color:#10b981">${prot}g</div><div class="bmr-macro-label">Protein</div></div>
          <div class="bmr-macro-item"><div class="bmr-macro-value" style="color:#06b6d4">${carb}g</div><div class="bmr-macro-label">Karbonhidrat</div></div>
          <div class="bmr-macro-item"><div class="bmr-macro-value" style="color:#f59e0b">${fat}g</div><div class="bmr-macro-label">Yağ</div></div>
        </div></div>`;
      toast('BMR ve TDEE hesaplandı!');
    });
  }

  // Profile
  function initProfile() {
    const u = curUser(); if (!u) return;
    $('#profileUsername').value = u.username;
    $('#profileEmail').value = u.email || '';
    $('#profileAge').value = u.age || '';
    $('#profileGender').value = u.gender || 'male';
    $('#profileForm').addEventListener('submit', e => {
      e.preventDefault();
      const users = gs(SK.USERS), idx = users.findIndex(x => x.id === u.id); if (idx === -1) return;
      users[idx].email = $('#profileEmail').value.trim();
      users[idx].age = parseInt($('#profileAge').value) || u.age;
      users[idx].gender = $('#profileGender').value;
      ss(SK.USERS, users); toast('Profil güncellendi!');
    });
    $('#passwordForm').addEventListener('submit', async e => {
      e.preventDefault();
      const cur = await hashPw($('#currentPassword').value), np = $('#newPassword').value, nc = $('#newPasswordConfirm').value;
      if (u.password !== cur) { toast('Mevcut şifre hatalı!', 'error'); return; }
      if (np !== nc) { toast('Şifreler eşleşmiyor!', 'error'); return; }
      if (np.length < 6) { toast('Şifre en az 6 karakter olmalı!', 'error'); return; }
      const users = gs(SK.USERS), idx = users.findIndex(x => x.id === u.id);
      users[idx].password = await hashPw(np); ss(SK.USERS, users);
      toast('Şifre değiştirildi!'); $('#currentPassword').value = ''; $('#newPassword').value = ''; $('#newPasswordConfirm').value = '';
    });
    // Export
    $('#btnExportData').addEventListener('click', () => {
      const data = {};
      [SK.USERS, SK.WORKOUTS, SK.MEALS, SK.BMI, SK.WATER, SK.SUGAR, SK.SLEEP, SK.WLOG].forEach(k => data[k] = gs(k));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `fitnesstakip_backup_${today()}.json`; a.click();
      toast('Veriler dışa aktarıldı!');
    });
    // Import
    $('#importFileInput').addEventListener('change', e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          Object.keys(data).forEach(k => { if (Array.isArray(data[k])) ss(k, data[k]); });
          toast('Veriler içe aktarıldı! Sayfa yenileniyor...'); setTimeout(() => location.reload(), 1000);
        } catch { toast('Dosya okunamadı!', 'error'); }
      };
      reader.readAsText(file);
    });
  }

  // Admin
  function initAdminPage() {
    const u = curUser(); if (!u || u.role !== 'admin') return;
    const users = gs(SK.USERS), aw = gs(SK.WORKOUTS), am = gs(SK.MEALS);
    $('#adminUserCount').textContent = users.length;
    $('#adminWorkoutCount').textContent = aw.length;
    $('#adminMealCount').textContent = am.length;
    const tb = $('#adminUserTableBody');
    tb.innerHTML = users.map(u2 => {
      const wc = aw.filter(w => w.userId === u2.id).length, mc = am.filter(m => m.userId === u2.id).length;
      const isA = u2.role === 'admin';
      return `<tr><td><strong>${esc(u2.username)}</strong></td><td>${esc(u2.email)}</td><td><span class="badge ${isA ? 'badge-purple' : 'badge-green'}">${isA ? 'Admin' : 'Kullanıcı'}</span></td><td>${wc}</td><td>${mc}</td><td><div style="display:flex;gap:6px;"><button class="btn btn-secondary btn-sm" onclick="window.FT.viewUser('${u2.id}')">Detay</button>${!isA ? `<button class="btn btn-danger btn-sm" onclick="window.FT.adminDel('${u2.id}')">Sil</button>` : ''}</div></td></tr>`;
    }).join('');
  }

  function viewUser(userId) {
    const users = gs(SK.USERS), u = users.find(x => x.id === userId); if (!u) return;
    const wo = gs(SK.WORKOUTS).filter(w => w.userId === userId), ml = gs(SK.MEALS).filter(m => m.userId === userId);
    const bmi = gs(SK.BMI).filter(b => b.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    openModal(`<div class="modal-header"><h2>👤 ${esc(u.username)}</h2><button class="modal-close" onclick="window.FT.closeModal()">✕</button></div>
      <div class="mb-16"><p class="text-muted text-sm">E-posta: ${esc(u.email)}</p><p class="text-muted text-sm">Yaş: ${u.age || '—'} · ${u.gender === 'male' ? 'Erkek' : 'Kadın'}</p><p class="text-muted text-sm">Kayıt: ${new Date(u.createdAt).toLocaleDateString('tr-TR')}</p></div>
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px;">
        <div style="text-align:center;padding:12px;background:var(--bg-glass);border-radius:var(--radius-md);"><div class="stat-value" style="font-size:1.3rem;">${wo.length}</div><div class="stat-label">Antrenman</div></div>
        <div style="text-align:center;padding:12px;background:var(--bg-glass);border-radius:var(--radius-md);"><div class="stat-value" style="font-size:1.3rem;">${ml.length}</div><div class="stat-label">Öğün</div></div>
        <div style="text-align:center;padding:12px;background:var(--bg-glass);border-radius:var(--radius-md);"><div class="stat-value" style="font-size:1.3rem;">${bmi ? bmi.bmi.toFixed(1) : '—'}</div><div class="stat-label">Son BMI</div></div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="window.FT.closeModal()">Kapat</button></div>`);
  }

  function adminDel(userId) {
    const users = gs(SK.USERS), u = users.find(x => x.id === userId);
    if (!u || u.role === 'admin') return;
    if (!confirm(`"${u.username}" kullanıcısını silmek istediğinize emin misiniz?`)) return;
    ss(SK.USERS, users.filter(x => x.id !== userId));
    [SK.WORKOUTS, SK.MEALS, SK.BMI, SK.WATER, SK.SUGAR, SK.SLEEP, SK.WLOG].forEach(k => ss(k, gs(k).filter(x => x.userId !== userId)));
    toast('Kullanıcı silindi.'); initAdminPage();
  }

  // Mobile menu
  function initMobile() {
    $('#mobileMenuBtn').addEventListener('click', () => $('#navLinks').classList.toggle('open'));
    $('#navLinks').addEventListener('click', e => { if (e.target.tagName === 'A') $('#navLinks').classList.remove('open'); });
  }

  // Public API
  window.FT = {
    closeModal, editWorkout: id => openWorkoutModal(id), deleteWorkout, deleteMeal,
    viewUser, adminDel, logWorkout, _rmEx: () => { }, _rmF: () => { },
  };

  // Init
  async function init() {
    await initAdmin(); initTheme(); initMobile();
    window.addEventListener('hashchange', renderPage);
    renderPage();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
