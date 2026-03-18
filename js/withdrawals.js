// ── Выводы ────────────────────────────────────────────────────────────────
// Комиссия за вывод: [%, fixed$]
// Комиссии при выводе: только фиксированная часть $1.2 (1.5% уже учтена в каждой сделке)
var WD_FEES = { 'CS.MONEY': [0, 1.2], 'CSFloat': [0, 0], 'Buff163': [0, 0] };

function getAvailForPlat(plat){
  // Грязная прибыль проданных скинов на платформе продажи
  var earned = 0;
  rows.forEach(function(r){
    if(r.sold && r.sp === plat){ var d=dirty(r); if(d!==null) earned+=d; }
  });
  // Уже выведено с этой платформы
  var alreadyWd = 0;
  withdrawals.forEach(function(w){ if(w.plat===plat) alreadyWd+=w.amount; });
  return Math.max(0, earned - alreadyWd);
}

function calcWdFee(plat, amount){
  var f = WD_FEES[plat] || [0,0];
  if(amount <= 0) return 0;
  return amount * f[0]/100 + f[1];
}

function updWdCalc(){
  var plat   = document.getElementById('wd-plat').value;
  var amount = parseFloat(document.getElementById('wd-amount').value) || 0;
  var avail  = getAvailForPlat(plat);

  // Ограничить ввод доступным максимумом
  var inp = document.getElementById('wd-amount');
  inp.max = avail.toFixed(2);
  if(amount > avail){ inp.value = avail.toFixed(2); amount = avail; }

  var availEl = document.getElementById('wd-avail');
  availEl.textContent = 'Доступно для вывода: $' + avail.toFixed(2);

  if(amount > 0){
    var fee = calcWdFee(plat, amount);
    var net = amount - fee;
    document.getElementById('wd-calc').style.display = '';
    document.getElementById('wdc-amount').textContent = '$'+amount.toFixed(2);
    document.getElementById('wdc-fee').textContent = '-$'+fee.toFixed(2);
    document.getElementById('wdc-net').textContent = '$'+Math.max(0,net).toFixed(2);
  } else {
    document.getElementById('wd-calc').style.display = 'none';
  }
}

function openWdModal(){
  var today = new Date().toISOString().slice(0,10);
  document.getElementById('wd-date').value = today;
  document.getElementById('wd-amount').value = '';
  document.getElementById('wd-note').value = '';
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
  var net = amount - fee;
  var w = { id: ++wid, plat: plat, amount: amount, fee: parseFloat(fee.toFixed(4)), net: parseFloat(net.toFixed(4)), date: date, note: note };
  withdrawals.push(w);
  saveWd();
  renderWd();
  updS();
  closeWdModal();
  showToast('✓ Вывод зафиксирован');
}

function delWd(id){
  var w = withdrawals.find(function(w){ return w.id===id; });
  if(!w) return;
  if(!confirm('Удалить запись о выводе $'+w.amount.toFixed(2)+' ('+w.plat+')?')) return;
  withdrawals = withdrawals.filter(function(w){ return w.id!==id; });
  saveWd();
  renderWd();
  updS();
}

function saveWd(){
  try{ localStorage.setItem('cs2wd_bak', JSON.stringify(withdrawals)); }catch(e){}
  if(!wdRef) return;
  var obj = {};
  withdrawals.forEach(function(w){ obj['w'+w.id]=w; });
  wdRef.set(obj).catch(function(e){ console.error('WD save error:',e); });
}

function loadWdLocal(){
  try{
    var s=localStorage.getItem('cs2wd_bak');
    if(s){ withdrawals=JSON.parse(s); wid=withdrawals.reduce(function(m,w){ return Math.max(m,w.id); },0); }
  }catch(e){}
}

function renderWd(){
  var tb = document.getElementById('WD-TB');
  var em = document.getElementById('WD-EM');
  if(!withdrawals.length){ tb.innerHTML=''; em.style.display=''; return; }
  em.style.display='none';
  tb.innerHTML = withdrawals.slice().reverse().map(function(w,i){
    return '<tr>'+
      '<td style="color:var(--muted)">'+(withdrawals.length-i)+'</td>'+
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