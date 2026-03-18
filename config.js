var SKINS = []; // загружается через API
var PLAT_BUY  = ['Buff163','CS.MONEY','CSFloat','Бесплатно'];
var PLAT_SELL = ['CS.MONEY','CSFloat','Buff163'];
var WEAR = ['Factory New','Minimal Wear','Field-Tested','Well-Worn','Battle-Scarred'];
var TYPE = ['Normal','StatTrak','Souvenir'];

// Комиссии платформ для сделок: [trade%, withdraw%]
// $1.2 фиксированная часть CS.MONEY считается только при выводе средств
var PLAT_FEES = {
  'Buff163':  [2.5, 0,   0],
  'CS.MONEY': [5,   1.5, 0],
  'CSFloat':  [2,   0,   0]
};

// Флоат диапазоны для каждого состояния [min, max)
var WEAR_RANGES = {
  'Factory New':    [0,    0.07],
  'Minimal Wear':   [0.07, 0.15],
  'Field-Tested':   [0.15, 0.38],
  'Well-Worn':      [0.38, 0.45],
  'Battle-Scarred': [0.45, 1.0]
};

function getPlatFees(plat){ return PLAT_FEES[plat] || [5, 0, 0]; }

// Определить состояние по флоату
function wearFromFloat(f){
  var v = parseFloat(f);
  if(isNaN(v)) return null;
  var ranges = WEAR_RANGES;
  for(var w in ranges){
    if(v >= ranges[w][0] && v < ranges[w][1]) return w;
  }
  if(v >= 0.45) return 'Battle-Scarred';
  return null;
}

// Получить допустимый диапазон флоата для состояния
function floatRangeForWear(wear){ return WEAR_RANGES[wear] || [0, 1]; }