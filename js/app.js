var rows = [], rid = 0, fq = '', acel = null;
var withdrawals = [], wid = 0;
var wdRef = null;

// Try fetch full list in background
fetch('https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json')
  .then(function(r){ return r.json(); })
  .then(function(d){
    SKINS = d.map(function(s){ return s.name; });
    var b = document.getElementById('apibadge');
    b.textContent = SKINS.length.toLocaleString() + ' скинов (онлайн)';
    b.className = 'badge ok';
  }).catch(function(){});

// ── Firebase ──────────────────────────────────────────────────────────────
var firebaseConfig = {
  apiKey: "AIzaSyDVsbGbJsbmGNr042hWiD-X0d2eAIh7qFk",
  authDomain: "sxintcxt-skintrade.firebaseapp.com",
  databaseURL: "https://sxintcxt-skintrade-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "sxintcxt-skintrade",
  storageBucket: "sxintcxt-skintrade.firebasestorage.app",
  messagingSenderId: "53025622376",
  appId: "1:53025622376:web:b1ee03f11ecc1f98616edd"
};

var fbApp, fbDb, fbRef, fbLogRef;
var fbReady = false;
var userIp = '—';
var pendingChanges = [];
var rowsSnapshot = '';

// Получаем IP при загрузке
fetch('https://api.ipify.org?format=json')
  .then(function(r){ return r.json(); })
  .then(function(d){ userIp = d.ip || '—'; })
  .catch(function(){ userIp = '—'; });

function setBadgeDB(state){
  var b = document.getElementById('dbbadge');
  if(!b) return;
  if(state === 'ok'){ b.textContent = '● Firebase'; b.className = 'badge ok'; }
  else { b.textContent = '● Офлайн (локально)'; b.className = 'badge err'; }
}

// Записать событие в лог Firebase
function writeLog(action, details){
  if(!fbLogRef) return;
  var user = fbAuth ? fbAuth.currentUser : null;
  fbLogRef.push({
    event: action,
    details: details || '',
    user: user ? (user.displayName || user.email) : '—',
    email: user ? user.email : '—',
    ip: userIp,
    time: new Date().toISOString()
  }).catch(function(e){ console.error('Log error:', e); });
}

// Обновить кнопки сохранения
function updSaveBtns(){
  var hasPending = pendingChanges.length > 0;
  var sb = document.getElementById('saveBtn');
  var rb = document.getElementById('resetBtn');
  if(sb) sb.style.display = hasPending ? 'inline-block' : 'none';
  if(rb) rb.style.display = hasPending ? 'inline-block' : 'none';
}

// Локальный черновик — только localStorage, Firebase НЕ трогаем
function save(){
  try{ localStorage.setItem('cs2r_bak', JSON.stringify(rows)); }catch(e){}
}

// Явное сохранение с логом
function saveNow(){
  if(!fbReady){ alert('Нет подключения к Firebase'); return; }
  var obj = {};
  rows.forEach(function(r){ obj['r'+r.id] = r; });
  fbRef.set(obj).then(function(){
    pendingChanges.forEach(function(ch){ writeLog(ch.action, ch.details); });
    pendingChanges = [];
    rowsSnapshot = JSON.stringify(rows);
    updSaveBtns();
    showToast('✓ Сохранено');
  }).catch(function(e){ alert('Ошибка сохранения: ' + e.message); });
}

function showToast(msg){
  var t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(function(){ t.style.opacity = '0'; }, 2500);
}

// Сброс несохранённых изменений
function resetChanges(){
  if(!confirm('Сбросить все несохранённые изменения?')) return;
  try{ rows = JSON.parse(rowsSnapshot); rid = rows.reduce(function(m,r){ return Math.max(m,r.id); },0); }catch(e){ rows=[]; }
  pendingChanges = [];
  updSaveBtns();
  render();
  showToast('↩ Изменения сброшены');
}

function loadLocal(){
  try{
    var s = localStorage.getItem('cs2r_bak');
    if(s){ rows = JSON.parse(s); rid = rows.reduce(function(m,r){ return Math.max(m,r.id); },0); }
  }catch(e){}
}

function mkRow(){
  var fees = getPlatFees('CS.MONEY');
  return { id: ++rid, skin:'', type:'Normal', wear:'Field-Tested', fl:'0.15', pat:'',
           bp:'Buff163', bpr:'',
           sp:'CS.MONEY', spr:'', sold:false,
           tf:fees[0], wf:fees[1], wfFixed:fees[2] };
}

function addRow(){
  var r = mkRow();
  rows.push(r);
  pendingChanges.push({ action: 'ADD', details: 'Добавлена новая сделка #' + r.id });
  updSaveBtns();
  save();
  render();
  setTimeout(function(){
    var el = document.getElementById('si'+r.id);
    if(el){ el.focus(); el.scrollIntoView({behavior:'smooth',block:'center'}); }
  }, 80);
}

function delRow(id){
  var r = rows.find(function(r){ return r.id===id; });
  var skinName = r ? (r.skin || 'без названия') : '—';
  if(!confirm('Удалить сделку "' + skinName + '"?\n\nЭто действие нельзя отменить без сброса изменений.')) return;
  rows = rows.filter(function(r){ return r.id !== id; });
  pendingChanges.push({ action: 'DELETE', details: 'Удалена сделка #' + id + ' — ' + skinName });
  updSaveBtns();
  save();
  render();
}

function upd(id, f, v){
  var r = rows.find(function(r){ return r.id===id; });
  if(!r) return;
  var fieldNames = {skin:'Скин',type:'Тип',wear:'Состояние',fl:'Флоат',pat:'Паттерн',bp:'Платф.покупки',bpr:'Цена покупки',sp:'Платф.продажи',spr:'Цена продажи',sold:'Продано',free:'Бесплатно',tf:'Комис.сделки',wf:'Комис.вывода'};
  if(fieldNames[f] && String(r[f]) !== String(v)){
    var oldVal = r[f];
    r[f] = v;
    pendingChanges.push({ action: 'EDIT', details: 'Сделка #'+id+' ('+( r.skin||'—')+'): '+fieldNames[f]+' "'+oldVal+'" → "'+v+'"' });
    updSaveBtns();
  } else {
    r[f] = v;
  }

  // Авто-комиссии при смене платформы продажи
  if(f === 'sp'){
    var fees = getPlatFees(v);
    r.tf = fees[0]; r.wf = fees[1]; r.wfFixed = fees[2];
    var etf = document.getElementById('tf'+id), ewf = document.getElementById('wf'+id);
    if(etf) etf.textContent = fees[0]+'%';
    if(ewf) ewf.textContent = fees[1] > 0 ? fees[1]+'%' : '—';
  }

  // Бесплатно — блокировать/разблокировать цену покупки
  if(f === 'bp'){
    var bprEl = document.getElementById('bpr'+id);
    if(bprEl){
      if(v === 'Бесплатно'){
        bprEl.disabled = true;
        bprEl.value = '';
        bprEl.placeholder = 'Бесплатно';
        bprEl.style.color = 'var(--muted)';
        bprEl.style.opacity = '0.5';
        r.bpr = '';
      } else {
        bprEl.disabled = false;
        bprEl.placeholder = '0.00';
        bprEl.style.color = '';
        bprEl.style.opacity = '';
      }
    }
  }

  // Синхронизация флоат → состояние (без ограничений во время набора)
  if(f === 'fl'){
    var fv = parseFloat(v);
    if(!isNaN(fv) && fv >= 0 && fv <= 1){
      var detected = wearFromFloat(fv);
      if(detected && detected !== r.wear){
        r.wear = detected;
        var ew = document.getElementById('wr'+id);
        if(ew) ew.value = detected;
      }
    }
  }

  // Синхронизация состояние → флоат: подставить минимум диапазона
  if(f === 'wear'){
    var range = floatRangeForWear(v);
    var curfl = parseFloat(r.fl);
    if(isNaN(curfl) || curfl < range[0] || curfl >= range[1]){
      r.fl = range[0].toFixed(3);
      var efl3 = document.getElementById('fl'+id);
      if(efl3) efl3.value = r.fl;
    }
  }

  save(); updS();
}

function dirty(r){
  var s = parseFloat(r.spr);
  if(!s || isNaN(s)) return null;
  return s * (1 - r.tf/100) * (1 - r.wf/100);
}
function clean(r){
  var d = dirty(r);
  if(d === null) return null;
  var bp = r.bp === 'Бесплатно' ? 0 : (parseFloat(r.bpr) || 0);
  return d - bp;
}
function fmn(n, sign){
  if(n===null || n===undefined) return '&#8212;';
  var abs = '$' + Math.abs(n).toFixed(2);
  if(sign){ return (n>0?'+':n<0?'-':'') + abs; }
  return (n<0?'-':'') + abs;
}
function pc(n){ return n===null?'dash':n>0?'pos':'neg'; }

function updS(){
  var bought=0, soldDirty=0, profit=0, pending=0, dirtyAll=0;
  rows.forEach(function(r){
    var bp = r.bp === 'Бесплатно' ? 0 : (parseFloat(r.bpr)||0);
    var d = dirty(r), c = clean(r);
    // Вложено = цены платных покупок + грязная прибыль бесплатных
    if(r.bp !== 'Бесплатно'){
      bought += bp;
    } else {
      if(d !== null) bought += d;
    }
    if(r.sold && d !== null) soldDirty += d;
    if(r.sold && r.bp !== 'Бесплатно' && c !== null) profit += c;
    if(!r.sold && c !== null) pending += c;
    if(d !== null) dirtyAll += d;
  });

  // Выводы
  var totalWithdrawn = 0, totalWdFee = 0;
  withdrawals.forEach(function(w){ totalWithdrawn += w.net; totalWdFee += w.fee; });

  // Общий капитал = грязная всех сделок − комиссии выводов (1.5%+$1.2 за каждый)
  var totalCapital = dirtyAll - totalWdFee;

  function setN(id, val){
    var el=document.getElementById(id); if(!el) return;
    el.textContent='$'+val.toFixed(2); el.className='sval';
  }
  function setC(id, val){
    var el=document.getElementById(id); if(!el) return;
    el.textContent=(val>=0?'+':'-')+'$'+Math.abs(val).toFixed(2);
    el.className='sval '+(val>=0?'g':'r');
  }
  setN('s-bought', bought);
  setN('s-sold', soldDirty);
  setC('s-profit', profit);
  setC('s-pending', pending);
  setN('s-withdrawn', totalWithdrawn);
  setN('s-total', totalCapital);

  rows.forEach(function(r){
    var de=document.getElementById('d'+r.id), ce=document.getElementById('c'+r.id);
    var d=dirty(r), c=clean(r);
    if(de){ de.innerHTML=fmn(d,false); de.className='cm '+pc(d); }
    if(ce){ ce.innerHTML=fmn(c,true); ce.className='cm '+pc(c); }
  });
}

// Autocomplete
function closeAC(){ if(acel){ acel.remove(); acel=null; } }
document.addEventListener('click', function(e){ if(!e.target.closest('.acw')) closeAC(); });

function showAC(inp, id){
  closeAC();
  var q = inp.value.trim().toLowerCase();
  if(q.length < 2) return;
  var words = q.split(/\s+/);
  var hits = SKINS.filter(function(s){
    var sl = s.toLowerCase().replace(/\s*\|\s*/g,' ');
    return words.every(function(w){ return sl.indexOf(w) !== -1; });
  }).slice(0,40);
  if(!hits.length) return;
  var list = document.createElement('div');
  list.className = 'acd';
  // Position using fixed coords from input bounding rect
  var rect = inp.getBoundingClientRect();
  list.style.top  = (rect.bottom + 3) + 'px';
  list.style.left = rect.left + 'px';
  list.style.width = Math.max(rect.width, 280) + 'px';
  hits.forEach(function(s, i){
    var d = document.createElement('div');
    d.className = 'aci' + (i===0?' on':'');
    d.textContent = s;
    d.onmousedown = function(e){
      e.preventDefault();
      inp.value = s;
      upd(id, 'skin', s);
      closeAC();
    };
    list.appendChild(d);
  });
  document.body.appendChild(list);
  acel = list;
}

function acKey(e, id){
  if(!acel) return;
  var items = acel.querySelectorAll('.aci');
  var idx = -1;
  items.forEach(function(d,i){ if(d.classList.contains('on')) idx=i; });
  if(e.key==='ArrowDown'){ e.preventDefault(); if(idx<items.length-1){ if(idx>=0) items[idx].classList.remove('on'); items[idx+1].classList.add('on'); items[idx+1].scrollIntoView({block:'nearest'}); } }
  if(e.key==='ArrowUp'){ e.preventDefault(); if(idx>0){ items[idx].classList.remove('on'); items[idx-1].classList.add('on'); items[idx-1].scrollIntoView({block:'nearest'}); } }
  if(e.key==='Enter' && idx>=0){ e.preventDefault(); items[idx].onmousedown(e); }
  if(e.key==='Escape') closeAC();
}

function mkSel(opts, val, id, f, cls){
  var s = document.createElement('select');
  if(cls) s.className = cls;
  s.onchange = function(){ upd(id, f, this.value); };
  opts.forEach(function(o){
    var op = document.createElement('option');
    op.value = o; op.textContent = o;
    if(o===val) op.selected = true;
    s.appendChild(op);
  });
  return s;
}

function mkInp(type, val, cls, onch, style){
  var i = document.createElement('input');
  i.type = type; i.value = val||'';
  if(cls) i.className = cls;
  if(style) i.setAttribute('style', style);
  if(type==='number') i.step='0.01';
  i.oninput = onch;
  return i;
}

function render(){
  var tb = document.getElementById('TB'), em = document.getElementById('EM');
  var vis = fq ? rows.filter(function(r){ return r.skin.toLowerCase().indexOf(fq)!==-1; }) : rows;
  document.getElementById('rc').textContent = rows.length + ' сделок';
  if(!rows.length){ tb.innerHTML=''; em.style.display='';  return; }
  em.style.display = 'none';
  tb.innerHTML = '';

  vis.forEach(function(r, i){
    var d=dirty(r), c=clean(r);
    var tr = document.createElement('tr');

    function td(cls){ var t=document.createElement('td'); if(cls) t.className=cls; tr.appendChild(t); return t; }

    td('ci').textContent = i+1;

    // Skin autocomplete
    var ts = td(); ts.style.minWidth='190px'; ts.style.maxWidth='215px';
    var aw = document.createElement('div'); aw.className='acw';
    var si = mkInp('text', r.skin, '', function(){ upd(r.id,'skin',this.value); showAC(this,r.id); }, '');
    si.id = 'si'+r.id;
    si.placeholder = 'AK-47 | Redline...';
    si.onkeydown = function(e){ acKey(e, r.id); };
    si.onblur = function(){ setTimeout(closeAC, 150); };
    aw.appendChild(si); ts.appendChild(aw);

    var tdType = td('col-type'); tdType.appendChild(mkSel(TYPE, r.type, r.id, 'type', ''));

    var wearSel = mkSel(WEAR, r.wear, r.id, 'wear', '');
    wearSel.id = 'wr'+r.id;
    td().appendChild(wearSel);

    var tf2=td('col-float'); tf2.style.maxWidth='92px';
    var flInp = document.createElement('input');
    flInp.type = 'number';
    flInp.value = r.fl || '0.150';
    flInp.min = '0';
    flInp.max = '0.999999';
    flInp.step = '0.000001';
    flInp.id = 'fl'+r.id;
    flInp.setAttribute('style','font-family:monospace;font-size:12px;text-align:right;width:100%;background:transparent;border:none;color:var(--txt);outline:none;padding:1px 3px');
    flInp.oninput = function(){
      var raw = this.value;
      if(/^0{2,}/.test(raw)){ raw = raw.replace(/^0+/, '0'); this.value = raw; }
      upd(r.id, 'fl', this.value);
    };
    flInp.onblur = (function(row){ return function(){
      var v = parseFloat(this.value);
      if(isNaN(v) || v < 0){ this.value = '0.000'; }
      else if(v > 0.999){ this.value = '0.999'; }
      upd(row.id, 'fl', this.value);
    };})(r);
    tf2.appendChild(flInp);

    var tp=td('col-pattern'); tp.style.maxWidth='60px';
    var patInp = mkInp('number', r.pat, '', function(){
      var v = parseInt(this.value);
      if(this.value !== '' && (isNaN(v) || v < 1)) v = 1;
      if(v > 999) v = 999;
      if(!isNaN(v)) this.value = v;
      upd(r.id,'pat', isNaN(v)?'':v);
    }, 'width:52px');
    patInp.min='1'; patInp.max='999'; patInp.step='1';
    patInp.placeholder='1-999';
    tp.appendChild(patInp);

    td('col-bplat').appendChild(mkSel(PLAT_BUY, r.bp, r.id, 'bp', 'bi'));

    var tbp = td();
    var isFree = r.bp === 'Бесплатно';
    var ibp = mkInp('number', isFree ? '' : r.bpr, 'bi', function(){ upd(r.id,'bpr',this.value); updS(); }, '');
    ibp.placeholder = isFree ? 'Бесплатно' : '0.00';
    ibp.disabled = isFree;
    ibp.id = 'bpr'+r.id;
    if(isFree){ ibp.style.color='var(--muted)'; ibp.style.opacity='0.5'; }
    tbp.appendChild(ibp);

    var spSel = mkSel(PLAT_SELL, r.sp, r.id, 'sp', 'gi');
    spSel.id = 'spl'+r.id;
    td('col-splat').appendChild(spSel);

    var tsp=td();
    var isp=mkInp('number', r.spr, 'gi', function(){ upd(r.id,'spr',this.value); updS(); }, '');
    isp.placeholder='0.00'; tsp.appendChild(isp);

    // Чекбокс "Продано"
    var tsold = td('chk-cell');
    var chkSold = document.createElement('input');
    chkSold.type = 'checkbox'; chkSold.className = 'chk';
    chkSold.checked = !!r.sold;
    chkSold.title = 'Скин продан';
    chkSold.onchange = (function(row){ return function(){
      upd(row.id, 'sold', this.checked);
      updS();
    };})(r);
    tsold.appendChild(chkSold);

    // Комиссия: показывать как читаемый лейбл (не редактируемый)
    var fees = getPlatFees(r.sp);
    var ttf=td('col-trade'); ttf.style.textAlign='right'; ttf.style.paddingRight='8px';
    ttf.style.fontFamily='monospace'; ttf.style.fontSize='12px'; ttf.style.color='var(--yel)';
    ttf.textContent = fees[0]+'%';
    ttf.id = 'tf'+r.id;

    var twf=td('col-trade'); twf.style.textAlign='right'; twf.style.paddingRight='8px';
    twf.style.fontFamily='monospace'; twf.style.fontSize='12px'; twf.style.color='var(--yel)';
    twf.id = 'wf'+r.id;
    twf.textContent = fees[1] > 0 ? fees[1]+'%' : '—';

    var tdd=td('cm '+pc(d)); tdd.id='d'+r.id; tdd.innerHTML=fmn(d,false);
    var tcc=td('cm '+pc(c)); tcc.id='c'+r.id; tcc.innerHTML=fmn(c,true);

    var tdel=td(); tdel.style.textAlign='center';
    var btn=document.createElement('button'); btn.className='db'; btn.textContent='×';
    btn.onclick=function(){ delRow(r.id); }; tdel.appendChild(btn);

    tb.appendChild(tr);
  });
  updS();
  
}

function exportCSV(){
  var h=['#','Скин','Тип','Состояние','Флоат','Паттерн','Платформа покупки','Цена покупки','Платформа продажи','Цена продажи','Комис.%','Вывод%','Получено','Прибыль'];
  var body=rows.map(function(r,i){
    var d=dirty(r), c=clean(r);
    return [i+1,r.skin,r.type,r.wear,r.fl,r.pat,r.bp,r.bpr,r.sp,r.spr,r.tf+'%',r.wf+'%',d!=null?d.toFixed(2):'',c!=null?c.toFixed(2):''].map(function(v){ return '"'+v+'"'; }).join(',');
  });
  var csv='\uFEFF'+[h.join(',')].concat(body).join('\n');
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  a.download='CS2_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();
}

document.getElementById('addBtn').addEventListener('click', addRow);
document.getElementById('csvBtn').addEventListener('click', exportCSV);
document.getElementById('flt').addEventListener('input', function(){ fq=this.value.toLowerCase(); render(); });
document.getElementById('importBtn').addEventListener('click', function(){ document.getElementById('importFile').click(); });
document.getElementById('importFile').addEventListener('change', importCSV);

function importCSV(e){
  var file = e.target.files[0];
  if(!file) return;
  var reader = new FileReader();
  reader.onload = function(ev){
    var lines = ev.target.result.split('\n').filter(function(l){ return l.trim(); });
    if(lines.length < 2){ alert('Файл пустой или неверный формат'); return; }
    var imported = 0;
    // Пропускаем заголовок (строка 0)
    for(var i = 1; i < lines.length; i++){
      var cols = lines[i].split(',').map(function(c){ return c.replace(/^"|"$/g,'').trim(); });
      if(cols.length < 10) continue;
      // Порядок: #, Скин, Тип, Состояние, Флоат, Паттерн, Платф.покупки, Цена покупки, Платф.продажи, Цена продажи, Комис%, Вывод%, Получено, Прибыль
      var fees = getPlatFees(cols[8] || 'CS.MONEY');
      var r = {
        id: ++rid,
        skin: cols[1]||'', type: cols[2]||'Normal', wear: cols[3]||'Field-Tested',
        fl: cols[4]||'', pat: cols[5]||'',
        bp: cols[6]||'Buff163', bpr: cols[7]||'',
        sp: cols[8]||'CS.MONEY', spr: cols[9]||'',
        tf: fees[0], wf: fees[1], wfFixed: fees[2]
      };
      rows.push(r);
      imported++;
    }
    save();
    render();
    alert('Импортировано сделок: ' + imported);
    e.target.value = '';
  };
  reader.readAsText(file, 'UTF-8');
}