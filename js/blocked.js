function parse_query_string(query) {
  var vars = query.split("&");
  var query_string = {};
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    // If first entry with this name
    if (typeof query_string[pair[0]] === "undefined") {
      query_string[pair[0]] = decodeURIComponent(pair[1]);
      // If second entry with this name
    } else if (typeof query_string[pair[0]] === "string") {
      var arr = [query_string[pair[0]], decodeURIComponent(pair[1])];
      query_string[pair[0]] = arr;
      // If third or later entry with this name
    } else {
      query_string[pair[0]].push(decodeURIComponent(pair[1]));
    }
  }
  return query_string;
}

let enter_url = window.location.href;
let bits = enter_url.split("?");
if(bits && bits.length){
  let url_params = bits[1];
  let params = parse_query_string(url_params);
  console.log(JSON.stringify(params));
  if(params){
    let elem = document.getElementById('ip');
    elem.textContent = "Original IP: " + params.ip;
    elem = document.getElementById('url');
    elem.textContent = "Triggered URL: " + params.url;
    elem = document.getElementById('attempt');
    elem.textContent = "Attempted IP: " + params.attempt;
    elem = document.getElementById('report');
    elem.href = 'https://safebrowsing.google.com/safebrowsing/report_badware/?referrer=antirebind&url=' + encodeURI(params.url);
  }


}