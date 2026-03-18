// ── Admin ─────────────────────────────────────────────────────────────────
var ADMIN_EMAIL = 'sxintcxt@gmail.com';

function openAdmin(){
  document.getElementById('adminOverlay').classList.add('open');
  loadAdminUsers();
}
function closeAdmin(){
  document.getElementById('adminOverlay').classList.remove('open');
}
document.getElementById('adminOverlay').addEventListener('click', function(e){
  if(e.target === this) closeAdmin();
});

function loadAdminUsers(){
  var list = document.getElementById('adminUserList');
  list.innerHTML = '<div class="admin-loading">Загрузка...</div>';
  fbDb.ref('users').once('value').then(function(snap){
    var data = snap.val();
    if(!data){ list.innerHTML = '<div class="admin-loading">Нет пользователей</div>'; return; }
    list.innerHTML = '';
    Object.entries(data).forEach(function(entry){
      var uid = entry[0], udata = entry[1];
      var info = udata.info || {};
      var trades = udata.trades ? Object.values(udata.trades) : [];
      // Считаем статистику
      var revenue=0, costs=0, dirtySum=0, cleanSum=0;
      trades.forEach(function(r){
        var sp=parseFloat(r.spr)||0, bp=parseFloat(r.bpr)||0;
        revenue+=sp; costs+=bp;
        if(sp){
          var d = sp*(1-r.tf/100)*(1-(r.wf||0)/100)-(r.wfFixed||0);
          dirtySum+=d;
          if(bp) cleanSum+=(d-bp);
        }
      });
      var card = document.createElement('div');
      card.className = 'user-card';
      var lastSeen = info.lastSeen ? new Date(info.lastSeen).toLocaleString('ru-RU') : '—';
      card.innerHTML =
        '<div class="user-card-top">' +
          '<img class="user-card-avatar" src="'+(info.photo||'')+'" onerror="this.style.display=\'none\'">' +
          '<div>' +
            '<div class="user-card-name">'+(info.name||'Без имени')+'</div>' +
            '<div class="user-card-email">'+(info.email||uid)+'</div>' +
          '</div>' +
          '<div class="user-card-last">Последний вход:<br>'+lastSeen+'</div>' +
        '</div>' +
        '<div class="user-stats">' +
          '<div class="user-stat"><div class="user-stat-lbl">Сделок</div><div class="user-stat-val" style="color:var(--blue)">'+trades.length+'</div></div>' +
          '<div class="user-stat"><div class="user-stat-lbl">Расходы</div><div class="user-stat-val" style="color:var(--red)">$'+costs.toFixed(2)+'</div></div>' +
          '<div class="user-stat"><div class="user-stat-lbl">Грязная</div><div class="user-stat-val" style="color:var(--yel)">$'+dirtySum.toFixed(2)+'</div></div>' +
          '<div class="user-stat"><div class="user-stat-lbl">Чистая</div><div class="user-stat-val" style="color:'+(cleanSum>=0?'var(--green)':'var(--red)')+';">'+(cleanSum>=0?'+':'')+cleanSum.toFixed(2)+'$</div></div>' +
        '</div>' +
        (trades.length > 0 ?
          '<div class="admin-trades" id="trades-'+uid+'" style="display:none">'+buildTradesTable(trades)+'</div>' +
          '<div style="text-align:center;margin-top:8px"><button class="btn btns" style="font-size:11px;padding:4px 12px" onclick="toggleTrades(\''+uid+'\')">▼ Показать сделки</button></div>'
        : '') ;
      list.appendChild(card);
    });
  }).catch(function(e){
    list.innerHTML = '<div class="admin-loading" style="color:var(--red)">Ошибка: '+e.message+'</div>';
  });
}

function buildTradesTable(trades){
  var rows = trades.map(function(r,i){
    var d = parseFloat(r.spr) ? (parseFloat(r.spr)*(1-r.tf/100)*(1-(r.wf||0)/100)-(r.wfFixed||0)) : null;
    var c = d !== null && parseFloat(r.bpr) ? d - parseFloat(r.bpr) : null;
    return '<tr>' +
      '<td>'+(i+1)+'</td>' +
      '<td style="text-align:left">'+(r.skin||'—')+'</td>' +
      '<td>'+(r.wear||'—')+'</td>' +
      '<td>'+(r.fl||'—')+'</td>' +
      '<td>'+(r.bp||'—')+'</td>' +
      '<td style="color:var(--blue)">'+(r.bpr?'$'+parseFloat(r.bpr).toFixed(2):'—')+'</td>' +
      '<td>'+(r.sp||'—')+'</td>' +
      '<td style="color:var(--green)">'+(r.spr?'$'+parseFloat(r.spr).toFixed(2):'—')+'</td>' +
      '<td style="color:var(--yel)">'+(d!==null?'$'+d.toFixed(2):'—')+'</td>' +
      '<td style="color:'+(c!==null?(c>=0?'var(--green)':'var(--red)'):'var(--muted)')+';">'+(c!==null?(c>=0?'+':'')+c.toFixed(2)+'$':'—')+'</td>' +
    '</tr>';
  }).join('');
  return '<table><thead><tr><th>#</th><th>Скин</th><th>Состояние</th><th>Флоат</th><th>Купл.</th><th>Цена</th><th>Прод.</th><th>Цена</th><th>Грязная</th><th>Чистая</th></tr></thead><tbody>'+rows+'</tbody></table>';
}

function toggleTrades(uid){
  var el = document.getElementById('trades-'+uid);
  var btn = el.nextElementSibling.querySelector('button');
  if(el.style.display === 'none'){
    el.style.display = 'block';
    btn.textContent = '▲ Скрыть сделки';
  } else {
    el.style.display = 'none';
    btn.textContent = '▼ Показать сделки';
  }
}

// ── Вкладки ───────────────────────────────────────────────────────────────
function switchTab(name){
  document.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('on'); });
  document.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.remove('on'); });
  document.getElementById('tab-'+name).classList.add('on');
  document.getElementById('panel-'+name).classList.add('on');
  setTimeout(fixStickyTop, 50);
  setTimeout(fixStickyTop, 50);
}