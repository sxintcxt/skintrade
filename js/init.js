// Запуск
render();

// Sticky заголовки таблицы
// Используем requestAnimationFrame чтобы высоты элементов
// были посчитаны после реальной отрисовки браузером
function fixStickyTop(){
  requestAnimationFrame(function(){
    var hdr   = document.querySelector('.hdr');
    var stats = document.querySelector('.stats');
    var tabs  = document.querySelector('.tabs');
    if(!hdr || !stats || !tabs) return;
    var top = hdr.offsetHeight + stats.offsetHeight + tabs.offsetHeight;
    document.querySelectorAll('thead th').forEach(function(el){
      el.style.top = top + 'px';
    });
  });
}

window.addEventListener('resize', fixStickyTop);
