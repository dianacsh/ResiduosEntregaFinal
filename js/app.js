/* EcoRecolecta - Navegación + Auth + Recolecciones + Reportes */
document.addEventListener('DOMContentLoaded', function () {
  /* ================= Helpers ================= */
  function $(sel){ return document.querySelector(sel); }
  function $all(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  /* ================= Store (LocalStorage) ================= */
  var K = { users:'users', session:'session' };
  function get(k, def){ var v = localStorage.getItem(k); return v ? JSON.parse(v) : (def || []); }
  function set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
  var Store = {
    users: function(){ return get(K.users, []); },
    addUser: function(u){ var a = get(K.users, []); a.push(u); set(K.users, a); },
    findUser: function(email, pw){ return get(K.users, []).find(function(u){ return u.email===email && u.password===pw; }); },
    session: function(){ var v = localStorage.getItem(K.session); return v ? JSON.parse(v) : null; },
    start: function(email){ localStorage.setItem(K.session, JSON.stringify({email: email})); },
    end: function(){ localStorage.removeItem(K.session); }
  };

  /* ================= Navegación (mostrar/ocultar secciones) ================= */
  var sections = $all('.section');
  function showSection(id){
    sections.forEach(function(s){ s.style.display = (s.id === id ? 'block' : 'none'); });
    $all('.nav-link').forEach(function(a){
      a.classList.toggle('active', a.dataset.section === id);
    });
    window.scrollTo(0,0);
  }
  var initial = 'home';
  sections.forEach(function(s){ if(s.classList.contains('active')) initial = s.id; });
  showSection(initial);

  $all('.nav-link').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      var id = a.dataset.section;
      if(!id) return;
      var s = Store.session();
      if (id === 'login' && s){ doLogout(); return; } // si hay sesión: logout
      showSection(id);
      if(id === 'login'){ // asegurar pestaña de "Iniciar Sesión"
        var loginBtn = document.querySelector('.auth-tabs .tab-btn[data-tab="login"]');
        var registerBtn = document.querySelector('.auth-tabs .tab-btn[data-tab="register"]');
        if(loginBtn) loginBtn.classList.add('active');
        if(registerBtn) registerBtn.classList.remove('active');
        var lf = $('#loginForm'), rf = $('#registerForm');
        if(lf) lf.classList.add('active');
        if(rf) rf.classList.remove('active');
      }
    });
  });

  function setLoggedUI(logged){
    var link = $('#loginLink');
    if(link) link.textContent = logged ? 'Cerrar Sesión' : 'Iniciar Sesión';
  }

  /* ================= Pestañas Login/Registro ================= */
  (function wireAuthTabs(){
    var tabs = $all('.auth-tabs .tab-btn');
    if(!tabs.length) return;
    tabs.forEach(function(btn){
      btn.addEventListener('click', function(){
        tabs.forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        var isLogin = (btn.getAttribute('data-tab') === 'login');
        var lf = $('#loginForm'), rf = $('#registerForm');
        if(lf) lf.classList.toggle('active', isLogin);
        if(rf) rf.classList.toggle('active', !isLogin);
      });
    });
  })();

  /* ================= Registro ================= */
  (function wireRegister(){
    var f = $('#registerFormElement'); if(!f) return;
    f.addEventListener('submit', function(e){
      e.preventDefault();
      var u = {
        name: $('#registerName') ? $('#registerName').value.trim() : '',
        email: $('#registerEmail') ? $('#registerEmail').value.trim() : '',
        phone: $('#registerPhone') ? $('#registerPhone').value.trim() : '',
        address: $('#registerAddress') ? $('#registerAddress').value.trim() : '',
        neighborhood: $('#registerNeighborhood') ? $('#registerNeighborhood').value : '',
        password: $('#registerPassword') ? $('#registerPassword').value : ''
      };
      if(!u.name || !u.email || !u.password){ alert('Completa los campos requeridos'); return; }
      if(Store.users().some(function(x){ return x.email===u.email; })){ alert('Ese correo ya está registrado'); return; }
      Store.addUser(u);
      alert('Cuenta creada. Ahora inicia sesión.');
      f.reset();
      var loginBtn = document.querySelector('.auth-tabs .tab-btn[data-tab="login"]');
      if(loginBtn) loginBtn.click();
      showSection('login');
    });
  })();

  /* ================= Login ================= */
  (function wireLogin(){
    var f = $('#loginFormElement'); if(!f) return;
    f.addEventListener('submit', function(e){
      e.preventDefault();
      var email = $('#loginEmail') ? $('#loginEmail').value.trim() : '';
      var pw    = $('#loginPassword') ? $('#loginPassword').value : '';
      var u = Store.findUser(email, pw);
      if(!u){ alert('Credenciales inválidas'); return; }
      Store.start(email);
      setLoggedUI(true);
      paintProfile();
      showSection('schedule');
    });
  })();

  /* ================= Logout ================= */
  function doLogout(){
    Store.end();
    setLoggedUI(false);
    showSection('home');
  }

  /* ==================== Recolecciones / Reportes ==================== */
  var COL_KEY = 'collections';
  var PT_KEY  = 'points';
  function getList(k){ var v = localStorage.getItem(k); return v ? JSON.parse(v) : []; }
  function saveList(k,a){ localStorage.setItem(k, JSON.stringify(a)); }

  function calcPoints(type){
    if(type==='organic')   return 5;
    if(type==='inorganic') return 8;
    if(type==='dangerous') return 15;
    return 0;
  }

  function paintCollections(){
    var box = document.getElementById('collectionsList');
    if(!box) return;
    var s = Store.session();
    if(!s){ box.innerHTML = '<p>Inicia sesión para ver tus recolecciones.</p>'; return; }
    var cols = getList(COL_KEY).filter(function(c){ return c.email===s.email; });
    if(!cols.length){ box.innerHTML = '<p>Aún no tienes recolecciones programadas.</p>'; return; }
    box.innerHTML = cols.map(function(c){
      return '<div class="collection-card"><strong>'+c.date+'</strong> - '+c.type+' ('+c.mode+') - '+c.status+'</div>';
    }).join('');
  }

  var scheduleForm = document.getElementById('scheduleForm');
  if(scheduleForm){
    scheduleForm.addEventListener('submit', function(e){
      e.preventDefault();
      var s = Store.session();
      if(!s){ alert('Inicia sesión primero'); return; }

      var type = document.getElementById('wasteType').value;
      var mode = document.getElementById('collectionType').value;
      var date = document.getElementById('collectionDate').value;
      var time = document.getElementById('collectionTime').value;
      if(!type || !mode || !date || !time){ alert('Completa todos los campos'); return; }

      var cols = getList(COL_KEY);
      cols.push({
        id: Date.now(), email: s.email, type: type, mode: mode,
        date: date, time: time, status: 'Programada'
      });
      saveList(COL_KEY, cols);

      var pts = getList(PT_KEY);
      pts.push({ email: s.email, puntos: calcPoints(type), fecha: date });
      saveList(PT_KEY, pts);

      alert('✅ Recolección programada');
      scheduleForm.reset();
      paintCollections();
      paintReports();
      paintProfile();
    });
  }

  function paintReports(){
    var s = Store.session(); if(!s) return;
    var pts  = getList(PT_KEY).filter(function(p){ return p.email===s.email; });
    var cols = getList(COL_KEY).filter(function(c){ return c.email===s.email; });

    var totalCols = cols.length;
    var totalPts  = pts.reduce(function(n,p){ return n+p.puntos; }, 0);
    var pesoTotal = cols.length;

    var tCols = document.getElementById('totalCollectionsUser');
    var tPts  = document.getElementById('totalPointsUser');
    var tPeso = document.getElementById('totalWeightUser');
    if(tCols) tCols.textContent = totalCols;
    if(tPts)  tPts.textContent  = totalPts;
    if(tPeso) tPeso.textContent = pesoTotal + ' kg';

    var body = document.getElementById('reportsTableBody');
    if(body){
      body.innerHTML = cols.map(function(c){
        var p = calcPoints(c.type);
        return '<tr><td>'+c.date+'</td><td>'+c.type+'</td><td>1</td><td>'+p+'</td><td>'+c.status+'</td></tr>';
      }).join('') || '<tr><td colspan="5">Sin datos.</td></tr>';
    }
  }

  /* ====== ÚNICA función de perfil (datos personales + estadísticas) ====== */
  function paintProfile(){
    var s = Store.session(); if(!s) return;
    var u = Store.users().find(function(x){ return x.email===s.email; }); if(!u) return;

    // Panel izquierdo (datos personales)
    if($('#userName'))    $('#userName').innerText    = u.name || 'Usuario';
    if($('#userEmail'))   $('#userEmail').innerText   = u.email || '';
    if($('#userPhone'))   $('#userPhone').innerText   = u.phone || '';
    if($('#userAddress')) $('#userAddress').innerText = u.address || '';

    // Panel derecho (estadísticas)
    var pts  = getList(PT_KEY).filter(function(p){ return p.email===s.email; });
    var cols = getList(COL_KEY).filter(function(c){ return c.email===s.email; });
    var totalCols = cols.length;
    var totalPts  = pts.reduce(function(n,p){ return n+p.puntos; }, 0);
    var pesoTotal = cols.length; // simulado

    if($('#profileTotalCollections')) $('#profileTotalCollections').innerText = totalCols;
    if($('#profileTotalPoints'))      $('#profileTotalPoints').innerText      = totalPts;
    if($('#profileTotalWeight'))      $('#profileTotalWeight').innerText      = pesoTotal + ' kg';
  }

  /* ================= Botón de reporte ================= */
  var btnReport = document.getElementById('generateReport');
  if(btnReport) btnReport.addEventListener('click', paintReports);

  /* ================= Estado inicial ================= */
  (function init(){
    var s = Store.session();
    setLoggedUI(!!s);
    if(s){ paintProfile(); }
    paintCollections();
    paintReports();
    console.log('✅ js/app.js');
  })();
});
