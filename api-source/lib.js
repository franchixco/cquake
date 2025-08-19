var catalogModule =  (function(){
  dayjs.extend(dayjs_plugin_utc);
  function getURL(date) {
    const baseURL = "/sismicidad/catalogo";
    if (date === undefined) {
      date = dayjs.utc();
    }
    var url = [];
    for (let fmt of ["YYYY", "MM", "YYYYMMDD"]) {
      url.push(date.format(fmt));
    }
    url.unshift(baseURL);
    url.push(url.pop().concat(".html"));
    return url.join("/");
  }

  function loadURL(date) {
    const fallbackURL = "/sismicidad/sismos-por-dia.html";
    if (date === undefined) {
      date = dayjs.utc();
    }
    url = getURL(date);
    var xhr = new XMLHttpRequest();
    xhr.open("HEAD", url, true);
    xhr.onreadystatechange = function(data) {
      if (xhr.readyState == XMLHttpRequest.DONE && xhr.status == 200) {
        window.location = url;
      } else {
        window.location = fallbackURL;
      }
    }
    xhr.send();
  }

  return {
    getURL: getURL,
    loadURL: loadURL
  }
})();
