/************************************
 * EcoRecolecta – AUTH
 ************************************/

const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

/* ==== Store ==== */
const Store = (() => {
  const K = { users:'users', session:'session' };
  const get = (k, def=[]) => JSON.parse(localStorage.getItem(k) || JSON.stringify(def));
  const set = (k, v)     => localStorage.setItem(k, JSON.stringify(v));
  return {
    users:   () => get(K.users),
    addUser: (u) => { const a=get(K.users); a.push(u); set(K.users,a); },
    find:    (email,pw) => get(K.users).find(u => u.email===email && u.password===pw),
    start:   (email) => localStorage.setItem(K.session, JSON.stringify({email})),
    end:     () => localStorage.removeItem(K.session),
    session: () => JSON.parse(localStorage.getItem(K.session) || 'null'),
  };
})();

/* ==== Navegación (cambia de sección) ==== */
function goTo(sectionId){
  $$('.section').forEach(s => s.classList.remove('active'));
  $(`[id="${sectionId}"]`)?.classList.add('active');
  $$('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.section===sectionId));
}

/* ==== Contadores del home ==== */
function paintLandingCounters(){
  $('#totalUsers')?.innerText = Store.users().length;

}
paintLandingCounters();

/* ==== Pone datos del perfil con el usuario actual ==== */
function paintProfile(){
  const s = Store.session(); if(!s) return;
  const u = Store.users().find(x => x.email===s.email);
  if(!u) return;
  $('#userName')  && ($('#userName').innerText  = u.name || 'Usuario');
  $('#userEmail') && ($('#userEmail').innerText = u.email || '');
  $('#userPhone') && ($('#userPhone').innerText = u.phone || '');
  $('#userAddress') && ($('#userAddress').innerText = u.address || '');
}

/* ==== Cambia UI según si hay sesión ==== */
function setLoggedUI(logged){
  const link = $('#loginLink');
  if(link) link.textContent = logged ? 'Cerrar Sesión' : 'Iniciar Sesión';
  if(logged){ paintProfile(); }
}

/* ====== TABS de login/registro ====== */
(function wireTabs(){
  const tabs = $$('.auth-tabs .tab-btn');
  tabs.forEach(btn => btn.addEventListener('click', ()=>{
    tabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $('#loginForm')?.classList.toggle('active', btn.dataset.tab==='login');
    $('#registerForm')?.classList.toggle('active', btn.dataset.tab==='register');
  }));
})();

/* ====== Registro ====== */
(function wireRegister(){
  const f = $('#registerFormElement'); if(!f) return;
  f.addEventListener('submit', (e)=>{
    e.preventDefault();
    const u = {
      name:   $('#registerName').value.trim(),
      email:  $('#registerEmail').value.trim(),
      phone:  $('#registerPhone').value.trim(),
      address:$('#registerAddress').value.trim(),
      neighborhood: $('#registerNeighborhood').value,
      password: $('#registerPassword').value
    };
    if(!u.name || !u.email || !u.password){ alert('Completa los campos requeridos'); return; }
    if(Store.users().some(x => x.email===u.email)){ alert('Ese correo ya está registrado'); return; }
    Store.addUser(u);
    alert('Cuenta creada. Ahora inicia sesión.');
    paintLandingCounters();
    f.reset();
    // cambia a pestaña "login"
    $$('.auth-tabs .tab-btn').find(b=>b.dataset.tab==='login')?.click();
  });
})();

/* ====== Login / Logout ====== */
(function wireLogin(){
  const f = $('#loginFormElement'); if(!f) return;

  // iniciar sesión
  f.addEventListener('submit', (e)=>{
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const pw    = $('#loginPassword').value;
    const u = Store.find(email, pw);
    if(!u){ alert('Credenciales inválidas'); return; }
    Store.start(email);
    setLoggedUI(true);
    paintProfile();
    // ir a Programar Recolección
    goTo('schedule');
  });

  // “Iniciar Sesión” del menú también hará logout si ya esta autenticad@
  $('#loginLink')?.addEventListener('click', (e)=>{
    const s = Store.session();
    if(s){
      e.preventDefault();
      Store.end();
      setLoggedUI(false);
      goTo('home');
    } else {
      // ir a la sección de login
      goTo('login');
      // forzar pestaña de login visible
      $$('.auth-tabs .tab-btn').find(b=>b.dataset.tab==='login')?.click();
    }
  });
})();

/* ==== Estado inicial (si ya había sesión guardada) ==== */
(function init(){
  const s = Store.session();
  setLoggedUI(!!s);
  if(s){ paintProfile(); }
})();
