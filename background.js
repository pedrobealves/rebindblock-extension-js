let dns = {};
let cancelRequestsTo = {};
let ignoreCheck = {};
let urlTab = {}

let whitelist = []

chrome.tabs.onUpdated.addListener(function(activeInfo) {
  chrome.storage.sync.get({whitelist: []}, function(result) {
    if (result.whitelist) {
      whitelist = result.whitelist
    }
  });
}); 

function block(url, host){
  chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: url.map((h, i) => i + 1),
    addRules: url.map((h, i) => ({
      id: i + 1,
      action: {type: 'redirect', redirect: {extensionPath: `/blockPage.html?url=${encodeURI(host)}&ip=${dns[host]}&attempt=${cancelRequestsTo[host]}`}},
      condition: {urlFilter: `||${h}`
      , resourceTypes: [
        "main_frame",
        "sub_frame",
        "stylesheet",
        "script",
        "image",
        "font",
        "object",
        "xmlhttprequest",
        "ping",
        "csp_report",
        "media",
        "websocket",
        "other"
      ]},
    })),
  });
}



chrome.webRequest.onBeforeRequest.addListener(
  function({tabId, url}) {    

    const hostData = getHostData(url);

    if (!hostData) return;

    urlTab[tabId] = [...urlTab[tabId]?urlTab[tabId]:[], hostData.host]

    if(urlTab[tabId].some(r=> whitelist.includes(r))){
      console.log("true")
      return;
    } 

    if(ignoreCheck[url]){
      CheckDNS(hostData.host, url);
    }
    
    if (cancelRequestsTo[hostData.host] && !ignoreCheck[url]) {
      const urlHost = "http://" + hostData.host +"/";
      ignoreCheck[urlHost] = true;
      checkDomain[urlHost] = true;
      block(urlTab[tabId], hostData.host)
      chrome.tabs.reload(tabId);
    }
  },
  {
    types: ['main_frame', 'sub_frame'],
    urls: ["<all_urls>"],
});

chrome.webRequest.onResponseStarted.addListener(function ({tabId, url, ip}){

  const hostData = getHostData(url);

  if (!hostData) return;

  urlTab[tabId] = [...urlTab[tabId]?urlTab[tabId]:[], hostData.host]

  if(urlTab[tabId].some(r=> whitelist.includes(r))){
    console.log("true")
    return;
  } 

  const isDnsSafe = CheckDNS(hostData.host, ip);
	if (!isDnsSafe && !ignoreCheck[url]) {
    block(urlTab[tabId], hostData.host)
    chrome.tabs.reload(tabId);
	}
},
{
 urls: ["<all_urls>"]
},
["responseHeaders"]);

function CheckDNS(fqdn, ip){
  if(!ip) return true;

  if(dns[fqdn]){
    if(/(^127\.)|(^192\.168\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^::1$)|(^[fF][cCdD])/.test(ip)){
      if(!/(^127\.)|(^192\.168\.)|(^10\.)|(^172\.1[6-9]\.)|(^172\.2[0-9]\.)|(^172\.3[0-1]\.)|(^::1$)|(^[fF][cCdD])/.test(dns[fqdn])){
        console.log("[DNS REBIND ATTACK DETECTED] - " + fqdn + " - " + ip);
        cancelRequestsTo[fqdn] = ip;
        return false;
      } 
    } else {
      if(dns[fqdn] != ip){
        dns[fqdn] = ip;
      } else {
        dns[fqdn] = ip;
      }
    }
  } else {
    dns[fqdn] = ip;
  }
  if(cancelRequestsTo[fqdn]){
    console.log("[REBIND ATTACK OVER] for domain " + fqdn + " removing block.");
    chrome.declarativeNetRequest.updateDynamicRules({"removeRuleIds": cancelRequestsTo.indexOf(fqdn)})
    delete cancelRequestsTo[fqdn];
  }
  return true;
}

function getHostData(url) {
	const m = /^(?:(\w+):)?\/\/([^\/\?#]+)/.exec(url);
	if (!m || !m[2]) {
		return null;
	}
	const result = {
		scheme:m[1],
		initialHost:m[2],
		host:m[2],
		forceReplace:false
	};
	return result;
}

