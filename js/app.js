/*************************************************
 * EcoRecolecta — JS principal
 * - Registro / Login (LocalStorage)
 * - Programar recolección
 * - Reportes y perfil
 * - Navegación por secciones (menu .nav-link)
 **************************************************/

document.addEventListener('DOMContentLoaded', () => {
  /* ========= Utilidades ========= */
  const $  = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString() : '';

  /* ========= Store (LocalStorage) ========= */
  const K = { users:'users', session:'session', cols:'collections', puntos:'puntos' };
  const get = (k, def=[]) => JSON.parse(localStorage.getItem(k) || JSON.stringify(def));
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const Store = {
    users: () => get(K.users),
    addUser(u){ const a=get(K.users); a.push(u); set(K.users,a); },
    findUser(email, pw){ return get(K.users).find(u=>u.email===email && u.password===pw); },

    session(){ return JSON.parse(localStorage.getItem(K.session) || 'null'); },
    start(email){ localStorage.setItem(K.session, JSON.stringify({email})); },
    end(){ localStorage.removeItem(K.session); },

    cols: () => get(K.cols),
    addCol(c){ const a=get(K.cols); a.push(c); set(K.cols,a); },

    puntosAll: () => get(K.puntos),
    addTx(t){ const a=get(K.puntos); a.push(t); set(K.puntos,a); },
    saldo(email){ return get(K.puntos).filter(p=>p.email===email).reduce((n,p)=>n+p.puntos,0); }
  };

  /* ========= Navegación (menú superior) ========= */
  function goTo(sectionId){
    $$('.section').forEach(s => s.classList.remove('active'));
    $('#'+sectionId)?.classList.add('active');
    $$('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.section===sectionId));
  }
  $$('.nav-link').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const id = a.dataset.section; if(!id) return;
      if(id==='login'){ // loginLink hace logout si ya hay sesión
        const s = Store.session();
        if(s){ e.preventDefault(); doLogout(); return; }
      }
      // navegación normal
    });
  });

  /* ========= Contadores del Home ========= */
  function paintLandingCounters(){
    $('#totalUsers')?.innerText = Store.users().length;
    $('#totalCollections')?.innerText = Store.cols().length;
    const totalPts = Store.puntosAll().reduce((n,p)=>n+p.puntos,0);
    $('#totalPoints')?.innerText = totalPts;
  }

  /* ========= AUTH: pestañas login/registro ========= */
  (function wireAuthTabs(){
    const tabs = $$('.auth-tabs .tab-btn');
    if(!tabs.length) return;
    tabs.forEach(btn => btn.addEventListener('click', ()=>{
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      $('#loginForm')?.classList.toggle('active', btn.dataset.tab==='login');
      $('#registerForm')?.classList.toggle('active', btn.dataset.tab==='register');
    }));
  })();

  /* ========= Registro ========= */
  (function wireRegister(){
    const f = $('#registerFormElement'); if(!f) return;
    f.addEventListener('submit', (e)=>{
      e.preventDefault();
      const u = {
        name:   $('#registerName')?.value.trim(),
        email:  $('#registerEmail')?.value.trim(),
        phone:  $('#registerPhone')?.value.trim(),
        address:$('#registerAddress')?.value.trim(),
        neighborhood: $('#registerNeighborhood')?.value,
        password: $('#registerPassword')?.value
      };
      if(!u.name || !u.email || !u.password){ alert('Completa los campos requeridos'); return; }
      if(Store.users().some(x=>x.email===u.email)){ alert('Ese correo ya está registrado'); return; }
      Store.addUser(u);
      alert('Cuenta creada. Ahora inicia sesión.');
      paintLandingCounters();
      f.reset();
      // Cambiar a pestaña login
      const loginTab = $$('.auth-tabs .tab-btn').find(b=>b.dataset.tab==='login');
      loginTab?.click();
    });
  })();

  /* ========= Login / Logout ========= */
  (function wireLogin(){
    const f = $('#loginFormElement'); if(!f) return;

    f.addEventListener('submit', (e)=>{
      e.preventDefault();
      const email = $('#loginEmail')?.value.trim();
      const pw    = $('#loginPassword')?.value;
      const u = Store.findUser(email, pw);
      if(!u){ alert('Credenciales inválidas'); return; }
      Store.start(email);
      setLoggedUI(true);
      paintProfile();
      goTo('schedule');
    });

    $('#loginLink')?.addEventListener('click', (e)=>{
      // si no hay sesión, es solo navegación al login
      const s = Store.session();
      if(!s) { goTo('login'); return; }
      // si hay sesión, cerrar
      e.preventDefault();
      doLogout();
    });
  })();

  function doLogout(){
    Store.end();
    setLoggedUI(false);
    goTo('home');
  }

  function setLoggedUI(logged){
    const link = $('#loginLink');
    if(link) link.textContent = logged ? 'Cerrar Sesión' : 'Iniciar Sesión';
  }

  /* ========= Perfil ========= */
  function paintProfile(){
    const s = Store.session(); if(!s) return;
    const u = Store.users().find(x=>x.email===s.email); if(!u) return;
    $('#userName')  && ($('#userName').innerText = u.name || 'Usuario');
    $('#userEmail') && ($('#userEmail').innerText = u.email || '');
    $('#userPhone') && ($('#userPhone').innerText = u.phone || '');
    $('#userAddress') && ($('#userAddress').innerText = u.address || '');
    
  }

  /* ========= Programar recolección ========= */
  const Pts = {
    organic:   (kg)=> Math.round((kg||1)*5),
    inorganic: (kg)=> Math.round((kg||1)*8),
    dangerous: (kg)=> Math.round((kg||1)*15 + 10)
  };
  const calcPts = (type, kg) => (Pts[type] || (()=>0))(kg);

  (function wireSchedule(){
    const form = $('#scheduleForm'); if(!form) return;
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const s = Store.session(); if(!s){ alert('Primero inicia sesión'); goTo('login'); return; }

      const col = {
        id: crypto.randomUUID(),
        email: s.email,
        type: $('#wasteType')?.value,
        mode: $('#collectionType')?.value,
        date: $('#collectionDate')?.value,
        time: $('#collectionTime')?.value,
        notes: $('#notes')?.value?.trim() || '',
        status: 'Programada',
        kg: 1 // 
      };
      if(!col.type || !col.mode || !col.date || !col.time){
        alert('Completa tipo, modalidad, fecha y hora'); return;
      }
      Store.addCol(col);
      
      const pts = calcPts(col.type, col.kg);
      Store.addTx({ id: crypto.randomUUID(), email:s.email, puntos:pts, tipo:'Abono', fecha:new Date().toISOString(), detalle:`${col.type} ${col.kg}kg (sim)` });

      paintCollectionsList();
      paintReports();
      paintLandingCounters();
      alert('Recolección programada. (Notificación simulada)');
      form.reset();
    });

    paintCollectionsList();
  })();

  function paintCollectionsList(){
    const box = $('#collectionsList'); if(!box) return;
    const s = Store.session();
    if(!s){ box.innerHTML = '<p class="muted">Inicia sesión para ver tus recolecciones.</p>'; return; }
    const items = Store.cols().filter(c=>c.email===s.email);
    box.innerHTML = items.map(c=>`
      <div class="collection-card">
        <div>
          <strong>${fmtDate(c.date)} ${c.time||''}</strong>
          <div class="muted">${c.type} • ${c.mode}</div>
        </div>
        <span class="badge">${c.status}</span>
      </div>
    `).join('') || '<p class="muted">Aún no tienes recolecciones programadas.</p>';
  }

  /* ========= Reportes ========= */
  function paintReports(){
    const s = Store.session(); if(!s) return;

    const start = $('#reportStartDate')?.value || '1900-01-01';
    const end   = $('#reportEndDate')?.value || '2999-12-31';
    const cols  = Store.cols().filter(c=>c.email===s.email && c.date>=start && c.date<=end);

    const tbody = $('#reportsTableBody');
    if(tbody){
      tbody.innerHTML = cols.map(c=>`
        <tr>
          <td>${fmtDate(c.date)}</td>
          <td>${c.type}</td>
          <td>${c.kg ?? 1}</td>
          <td>${calcPts(c.type, c.kg ?? 1)}</td>
          <td>${c.status}</td>
        </tr>
      `).join('') || '<tr><td colspan="5" class="muted">Sin datos en el rango seleccionado.</td></tr>';
    }

    // tarjetas de estadísticas de reportes
    $('#totalCollectionsUser') && ($('#totalCollectionsUser').innerText = cols.length);
    const pesoTotal = cols.reduce((n,c)=> n + (c.kg ?? 1), 0);
    $('#totalWeightUser') && ($('#totalWeightUser').innerText = `${pesoTotal} kg`);
    $('#totalPointsUser') && ($('#totalPointsUser').innerText = Store.saldo(s.email));

    // perfil (totales globales del usuario)
    const colsAll = Store.cols().filter(c=>c.email===s.email);
    $('#profileTotalCollections') && ($('#profileTotalCollections').innerText = colsAll.length);
    const pesoAll = colsAll.reduce((n,c)=> n + (c.kg ?? 1), 0);
    $('#profileTotalWeight') && ($('#profileTotalWeight').innerText = `${pesoAll} kg`);
    $('#profileTotalPoints') && ($('#profileTotalPoints').innerText = Store.saldo(s.email));
  }
  $('#generateReport')?.addEventListener('click', paintReports);

  /* ========= Estado inicial ========= */
  (function init(){
    paintLandingCounters();
    const s = Store.session();
    setLoggedUI(!!s);
    if(s){ paintProfile(); paintCollectionsList(); paintReports(); }
  })();
});
