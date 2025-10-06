/* EcoRecolecta - Navegación + Auth */
document.addEventListener('DOMContentLoaded', function () {
  // Helpers
  function $(sel){ return document.querySelector(sel); }
  function $all(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  // Store (LocalStorage)
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

  // Mostrar/ocultar secciones por display
  var sections = $all('.section');
  function showSection(id){
    sections.forEach(function(s){ s.style.display = (s.id === id ? 'block' : 'none'); });
    // marcar link activo
    $all('.nav-link').forEach(function(a){
      if (a.dataset.section === id) a.classList.add('active');
      else a.classList.remove('active');
    });
    window.scrollTo(0,0);
    console.log('-> sección:', id);
  }
  // estado inicial
  var initial = 'home';
  sections.forEach(function(s){ if(s.classList.contains('active')) initial = s.id; });
  showSection(initial);

  // Menú superior
  $all('.nav-link').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      var id = a.dataset.section;
      if(!id) return;
      var s = Store.session();
      // Si hay sesión y hacen clic en "login", se interpreta como logout
      if (id === 'login' && s){
        doLogout();
        return;
      }
      showSection(id);
      // Si abren login, asegurar pestaña de "Iniciar Sesión"
      if(id === 'login'){
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

  // Cambiar texto del link según sesión
  function setLoggedUI(logged){
    var link = $('#loginLink');
    if(link) link.textContent = logged ? 'Cerrar Sesión' : 'Iniciar Sesión';
  }

  // Pestañas de login/registro
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

  // Registro
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
      // Cambiar a pestaña login y mostrar sección login
      var loginBtn = document.querySelector('.auth-tabs .tab-btn[data-tab="login"]');
      if(loginBtn) loginBtn.click();
      showSection('login');
    });
  })();

  // Login
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

  // Logout (el propio enlace de login actúa como logout si hay sesión)
  function doLogout(){
    Store.end();
    setLoggedUI(false);
    showSection('home');
  }

  // Perfil
  function paintProfile(){
    var s = Store.session(); if(!s) return;
    var u = Store.users().find(function(x){ return x.email===s.email; }); if(!u) return;
    if($('#userName'))   $('#userName').innerText = u.name || 'Usuario';
    if($('#userEmail'))  $('#userEmail').innerText = u.email || '';
    if($('#userPhone'))  $('#userPhone').innerText = u.phone || '';
    if($('#userAddress'))$('#userAddress').innerText = u.address || '';
  }

  // Estado inicial
  (function init(){
    var s = Store.session();
    setLoggedUI(!!s);
    if(s){ paintProfile(); }
    console.log('✅ js/app.js listo');
  })();
});
