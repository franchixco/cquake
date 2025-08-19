(function () {
  document.addEventListener('DOMContentLoaded', function() {
    var selectors = [
      "#nav li:nth-child(2) a",   // top-menu
      "#page aside ul.accesos li:first-child a", // index left-menu
      "#page section li:nth-child(2) a",  // sismicidad sub-menu
      "article h1.ondas span.boton-esq a.icon-plus",  // icon plus
    ]
    for (let sel of selectors) {
      el = document.querySelector(sel);
      if (el && /sismos-por-dia.html$/.test(el.href)) {
        el.addEventListener("click", function(e) {
          e.preventDefault();
          catalogModule.loadURL();
        });
      }
    }  
  })
})();
