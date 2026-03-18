// ── Google Auth ───────────────────────────────────────────────────────────
var fbAuth;

function initFirebase(){
  try {
    fbApp  = firebase.initializeApp(firebaseConfig);
    fbDb   = firebase.database();
    fbAuth = firebase.auth();

    fbAuth.onAuthStateChanged(function(user){
      if(user){
        document.getElementById('authOverlay').style.display = 'none';
        document.getElementById('userInfo').style.display = 'flex';
        document.getElementById('userAvatar').src = user.photoURL || '';
        document.getElementById('userName').textContent = user.displayName || user.email;

        // Показать кнопку Админ только для sxintcxt@gmail.com
        if(user.email === ADMIN_EMAIL){
          document.getElementById('adminBtn').style.display = 'inline-block';
        }

        // Сохранить/обновить инфо о пользователе
        var userInfoRef = fbDb.ref('users/' + user.uid + '/info');
        userInfoRef.once('value').then(function(snap){
          var isNew = !snap.exists();
          userInfoRef.set({
            name: user.displayName || '',
            email: user.email || '',
            photo: user.photoURL || '',
            firstSeen: isNew ? new Date().toISOString() : (snap.val().firstSeen || new Date().toISOString()),
            lastSeen: new Date().toISOString(),
            lastIp: userIp
          });
          // Лог входа
          fbDb.ref('users/' + user.uid + '/log').push({
            event: isNew ? 'РЕГИСТРАЦИЯ' : 'ВХОД',
            email: user.email,
            ip: userIp,
            time: new Date().toISOString()
          });
        });

        fbRef    = fbDb.ref('users/' + user.uid + '/trades');
        fbLogRef = fbDb.ref('users/' + user.uid + '/log');
        wdRef    = fbDb.ref('users/' + user.uid + '/withdrawals');

        // Загрузить выводы
        wdRef.once('value').then(function(snap){
          var data = snap.val();
          if(data){
            withdrawals = Object.values(data).sort(function(a,b){ return a.id-b.id; });
            wid = withdrawals.reduce(function(m,w){ return Math.max(m,w.id); },0);
          }
          renderWd(); updS();
        });
        var firstLoad = true;
        fbRef.on('value', function(snap){
          // Если есть несохранённые изменения — не трогаем таблицу вообще
          // чтобы не сбивать фокус и курсор при редактировании
          if(!firstLoad && pendingChanges.length > 0) return;

          var data = snap.val();
          if(data){
            rows = Object.values(data).sort(function(a,b){ return a.id - b.id; });
            rid  = rows.reduce(function(m,r){ return Math.max(m,r.id); }, 0);
          } else {
            rows = [];
          }
          rowsSnapshot = JSON.stringify(rows);
          pendingChanges = [];
          updSaveBtns();
          fbReady = true;
          setBadgeDB('ok');
          firstLoad = false;
          render();
          
        }, function(err){
          console.error(err);
          setBadgeDB('err');
          loadLocal(); loadWdLocal(); renderWd(); render();
        });
      } else {
        document.getElementById('authOverlay').style.display = 'flex';
        document.getElementById('userInfo').style.display = 'none';
        fbReady = false; rows = []; render();
      }
    });

    document.getElementById('signInBtn').addEventListener('click', function(){
      var provider = new firebase.auth.GoogleAuthProvider();
      fbAuth.signInWithPopup(provider).catch(function(e){ alert('Ошибка входа: ' + e.message); });
    });

    document.getElementById('signOutBtn').addEventListener('click', function(){
      if(confirm('Выйти из аккаунта?')){
        fbAuth.signOut();
        if(fbRef) fbRef.off();
        fbRef = null; fbReady = false; rows = []; render();
      }
    });

  } catch(e) {
    console.error('Firebase init error:', e);
    setBadgeDB('err');
    loadLocal(); loadWdLocal(); renderWd(); render();
  }
}

initFirebase();