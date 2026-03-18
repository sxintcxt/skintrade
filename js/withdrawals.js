// ── Состояние ─────────────────────────────────────────────────────────────
var withdrawals = [], wid = 0;
var deposits    = [], did = 0;
var wdRef       = null;
var depRef      = null;
var wdPending   = [];
var depPending  = [];

// Сортировка
var wdSortField  = '', wdSortDir  = 1;
var depSortField = '', depSortDir = 1;

// ── Кнопки сохранения ─────────────────────────────────────────────────────
function updWdSaveBtns(){
  var hasPending = wdPending.length > 0 || depPending.length > 0;
  ['wdSaveBtn','wdSaveBtn2'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.style.display = hasPending ? 'inline-block' : 'none';
  });
  ['wdResetBtn','wdResetBtn2'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.style.display = hasPending ? 'inline-block' : 'none';
  });
}

// ── Доступно для вывода ───────────────────────────────────────────────────
function getAvailForPlat(plat){
  var earned = 0;
  rows.forEach(function(r){
    if(r.sold && r.sp === plat){ var d=dirty(r); if(d!==null) earned+=d; }
  });
  var deposited = 0;
  deposits.forEach(function(d){ if(d.plat===plat) deposited+=d.amount; });
  var spent = 0;
  rows.forEach(function(r){
    if(r.bp === plat && r.bp !== 'Бесплатно') spent += parseFloat(r.bpr)||0;
  });
  var withdrawn = 0;
  withdrawals.forEach(function(w){ if(w.plat===plat) withdrawn+=w.amount; });
  return Math.max(0, earned + deposited - spent - withdrawn);
}

function calcWdFee(plat, amount){
  var f = WD_FEES[plat] || [0,0];
  if(amount <= 0) return 0;
  return amount * f[0]/100 + f[1];
}

// ── Модалка вывода ────────────────────────────────────────────────────────
function updWdCalc(){
  var plat   = document.getElementById('wd-plat').value;
  var amount = parseFloat(document.getElementById('wd-amount').value) || 0;
  var avail  = getAvailForPlat(plat);
  var inp    = document.getElementById('wd-amount');
  inp.max = avail.toFixed(2);
  if(amount > avail){ inp.value = avail.toFixed(2); amount = avail; }
  document.getElementById('wd-avail').textContent = 'Доступно: $' + avail.toFixed(2);
  if(amount > 0){
    var fee = calcWdFee(plat, amount);
    var net = amount - fee;
    document.getElementById('wd-calc').style.display = '';
    document.getElementById('wdc-amount').textContent = '$'+amount.toFixed(2);
    document.getElementById('wdc-fee').textContent    = '-$'+fee.toFixed(2);
    document.getElementById('wdc-net').textContent    = '$'+Math.max(0,net).toFixed(2);
  } else {
    document.getElementById('wd-calc').style.display = 'none';
  }
}

function openWdModal(){
  document.getElementById('wd-date').value   = new Date().toISOString().slice(0,10);
  document.getElementById('wd-amount').value = '';
  document.getElementById('wd-note').value   = '';
  document.getElementById('wd-calc').style.display = 'none';
  document.getElementById('wdModal').classList.add('open');
  updWdCalc();
}
function closeWdModal(){ document.getElementById('wdModal').classList.remove('open'); }
document.getElementById('wdModal').addEventListener('click', function(e){ if(e.target===this) closeWdModal(); });

function confirmWd(){
  var plat   = document.getElementById('wd-plat').value;
  var amount = parseFloat(document.getElementById('wd-amount').value);
  var date   = document.getElementById('wd-date').value;
  var note   = document.getElementById('wd-note').value.trim();
  if(!amount || amount <= 0){ showToast('Введите сумму вывода'); return; }
  var fee = calcWdFee(plat, amount);
  var net = parseFloat((amount - fee).toFixed(4));
  var w = { id:++wid, plat:plat, amount:amount, fee:parseFloat(fee.toFixed(4)), net:net, date:date, note:note };
  withdrawals.push(w);
  wdPending.push({ action:'ADD', details:'Вывод $'+amount.toFixed(2)+' ('+plat+')' });
  updWdSaveBtns();
  saveWdLocal();
  renderWd();
  updS();
  closeWdModal();
  showToast('✓ Вывод добавлен — не забудьте сохранить');
}

function delWd(id){
  var w = withdrawals.find(function(w){ return w.id===id; });
  if(!w) return;
  if(!confirm('Удалить вывод $'+w.amount.toFixed(2)+' ('+w.plat+')?')) return;
  withdrawals = withdrawals.filter(function(w){ return w.id!==id; });
  wdPending.push({ action:'DELETE', details:'Удалён вывод $'+w.amount.toFixed(2)+' ('+w.plat+')' });
  updWdSaveBtns();
  saveWdLocal();
  renderWd();
  updS();
}

// ── Модалка депозита ──────────────────────────────────────────────────────
function openDepModal(){
  document.getElementById('dep-date').value   = new Date().toISOString().slice(0,10);
  document.getElementById('dep-amount').value = '';
  document.getElementById('dep-note').value   = '';
  document.getElementById('depModal').classList.add('open');
}
function closeDepModal(){ document.getElementById('depModal').classList.remove('open'); }
document.getElementById('depModal').addEventListener('click', function(e){ if(e.target===this) closeDepModal(); });

function confirmDep(){
  var plat   = document.getElementById('dep-plat').value;
  var amount = parseFloat(document.getElementById('dep-amount').value);
  var date   = document.getElementById('dep-date').value;
  var note   = document.getElementById('dep-note').value.trim();
  if(!amount || amount <= 0){ showToast('Введите сумму депозита'); return; }
  var d = { id:++did, plat:plat, amount:amount, date:date, note:note };
  deposits.push(d);
  depPending.push({ action:'ADD', details:'Депозит $'+amount.toFixed(2)+' ('+plat+')' });
  updWdSaveBtns();
  saveDepLocal();
  renderDep();
  updS();
  closeDepModal();
  showToast('✓ Депозит добавлен — не забудьте сохранить');
}

function delDep(id){
  var dep = deposits.find(function(d){ return d.id===id; });
  if(!dep) return;
  if(!confirm('Удалить депозит $'+dep.amount.toFixed(2)+' ('+dep.plat+')?')) return;
  deposits = deposits.filter(function(d){ return d.id!==id; });
  depPending.push({ action:'DELETE', details:'Удалён депозит $'+dep.amount.toFixed(2)+' ('+dep.plat+')' });
  updWdSaveBtns();
  saveDepLocal();
  renderDep();
  updS();
}

// ── Сохранение / сброс ────────────────────────────────────────────────────
function saveWdNow(){
  if(!fbReady){ alert('Нет подключения к Firebase'); return; }
  var wObj = {};
  withdrawals.forEach(function(w){ wObj['w'+w.id]=w; });
  var dObj = {};
  deposits.forEach(function(d){ dObj['d'+d.id]=d; });
  var p1 = wdRef  ? wdRef.set(wObj)  : Promise.resolve();
  var p2 = depRef ? depRef.set(dObj) : Promise.resolve();
  Promise.all([p1, p2]).then(function(){
    wdPending.forEach(function(ch){ writeLog(ch.action, ch.details); });
    depPending.forEach(function(ch){ writeLog(ch.action, ch.details); });
    wdPending = []; depPending = [];
    updWdSaveBtns();
    showToast('✓ Сохранено');
  }).catch(function(e){ alert('Ошибка: '+e.message); });
}

function resetWdChanges(){
  if(!confirm('Сбросить несохранённые изменения?')) return;
  loadWdLocal(); loadDepLocal();
  wdPending = []; depPending = [];
  updWdSaveBtns();
  renderWd(); renderDep(); updS();
  showToast('↩ Изменения сброшены');
}

// ── localStorage ──────────────────────────────────────────────────────────
function saveWdLocal(){
  try{ localStorage.setItem('cs2wd_bak', JSON.stringify(withdrawals)); }catch(e){}
}
function saveDepLocal(){
  try{ localStorage.setItem('cs2dep_bak', JSON.stringify(deposits)); }catch(e){}
}
function loadWdLocal(){
  try{
    var s = localStorage.getItem('cs2wd_bak');
    if(s){ withdrawals=JSON.parse(s); wid=withdrawals.reduce(function(m,w){ return Math.max(m,w.id); },0); }
  }catch(e){}
}
function loadDepLocal(){
  try{
    var s = localStorage.getItem('cs2dep_bak');
    if(s){ deposits=JSON.parse(s); did=deposits.reduce(function(m,d){ return Math.max(m,d.id); },0); }
  }catch(e){}
}

// ── Сортировка ────────────────────────────────────────────────────────────
function sortWd(field){
  if(wdSortField === field) wdSortDir *= -1;
  else { wdSortField = field; wdSortDir = 1; }
  renderWd();
}

function sortDep(field){
  if(depSortField === field) depSortDir *= -1;
  else { depSortField = field; depSortDir = 1; }
  renderDep();
}

function applySort(arr, field, dir){
  if(!field) return arr.slice().reverse();
  return arr.slice().sort(function(a,b){
    var av = a[field] || 0, bv = b[field] || 0;
    if(typeof av === 'string'){ av = av.toLowerCase(); bv = bv.toLowerCase(); }
    if(av < bv) return -dir;
    if(av > bv) return  dir;
    return 0;
  });
}

function updateWdArrows(attr, field, dir){
  document.querySelectorAll('th['+attr+']').forEach(function(th){
    var f = th.getAttribute(attr);
    var arr = th.querySelector('.sort-arr');
    if(!arr) return;
    arr.textContent = f === field ? (dir===1?' ▲':' ▼') : ' ⇅';
  });
}

// ── Рендер выводов ────────────────────────────────────────────────────────
function renderWd(){
  var tb = document.getElementById('WD-TB');
  var em = document.getElementById('WD-EM');
  if(!tb) return;
  updateWdArrows('data-sort-wd', wdSortField, wdSortDir);
  if(!withdrawals.length){ tb.innerHTML=''; em.style.display=''; return; }
  em.style.display = 'none';
  var sorted = applySort(withdrawals, wdSortField, wdSortDir);
  tb.innerHTML = sorted.map(function(w, i){
    return '<tr>'+
      '<td style="color:var(--muted)">'+(i+1)+'</td>'+
      '<td>'+w.date+'</td>'+
      '<td style="color:var(--yel);font-weight:500">'+w.plat+'</td>'+
      '<td style="color:var(--blue);font-family:monospace">$'+w.amount.toFixed(2)+'</td>'+
      '<td style="color:var(--red);font-family:monospace">-$'+w.fee.toFixed(2)+'</td>'+
      '<td style="color:var(--green);font-weight:600;font-family:monospace">$'+w.net.toFixed(2)+'</td>'+
      '<td style="color:var(--muted);font-size:12px">'+(w.note||'—')+'</td>'+
      '<td><button class="db" onclick="delWd('+w.id+')" title="Удалить">×</button></td>'+
    '</tr>';
  }).join('');
}

// ── Рендер депозитов ──────────────────────────────────────────────────────
function renderDep(){
  var tb = document.getElementById('DEP-TB');
  var em = document.getElementById('DEP-EM');
  if(!tb) return;
  updateWdArrows('data-sort-dep', depSortField, depSortDir);
  if(!deposits.length){ tb.innerHTML=''; em.style.display=''; return; }
  em.style.display = 'none';
  var sorted = applySort(deposits, depSortField, depSortDir);
  tb.innerHTML = sorted.map(function(d, i){
    return '<tr>'+
      '<td style="color:var(--muted)">'+(i+1)+'</td>'+
      '<td>'+d.date+'</td>'+
      '<td style="color:var(--yel);font-weight:500">'+d.plat+'</td>'+
      '<td style="color:var(--blue);font-weight:600;font-family:monospace">$'+d.amount.toFixed(2)+'</td>'+
      '<td style="color:var(--muted);font-size:12px">'+(d.note||'—')+'</td>'+
      '<td><button class="db" onclick="delDep('+d.id+')" title="Удалить">×</button></td>'+
    '</tr>';
  }).join('');
}
