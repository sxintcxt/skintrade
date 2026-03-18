// ── Константы ─────────────────────────────────────────────────────────────
var SKINS    = []; // загружается через API
var PLAT_BUY  = ['Buff163','CS.MONEY','CSFloat','Бесплатно'];
var PLAT_SELL = ['CS.MONEY','CSFloat','Buff163'];
var PLAT_WD   = ['CS.MONEY','CSFloat','Buff163']; // платформы для выводов/депозитов
var WEAR      = ['Factory New','Minimal Wear','Field-Tested','Well-Worn','Battle-Scarred'];
var TYPE      = ['Normal','StatTrak','Souvenir'];

// Комиссии платформ для сделок: [trade%, withdraw%]
var PLAT_FEES = {
  'Buff163':  [2.5, 0,   0],
  'CS.MONEY': [5,   1.5, 0],
  'CSFloat':  [2,   0,   0]
};

// Комиссии при выводе: только $1.2 (1.5% уже в сделках)
var WD_FEES = {
  'CS.MONEY': [0, 1.2],
  'CSFloat':  [0, 0],
  'Buff163':  [0, 0]
};

var WEAR_RANGES = {
  'Factory New':    [0,    0.07],
  'Minimal Wear':   [0.07, 0.15],
  'Field-Tested':   [0.15, 0.38],
  'Well-Worn':      [0.38, 0.45],
  'Battle-Scarred': [0.45, 1.0]
};

function getPlatFees(p){ return PLAT_FEES[p] || [0,0,0]; }

function wearFromFloat(f){
  f = parseFloat(f);
  if(isNaN(f)) return null;
  for(var w in WEAR_RANGES){
    var r = WEAR_RANGES[w];
    if(f >= r[0] && f < r[1]) return w;
  }
  if(f >= 0.45) return 'Battle-Scarred';
  return null;
}

function floatRangeForWear(wear){ return WEAR_RANGES[wear] || [0,1]; }
