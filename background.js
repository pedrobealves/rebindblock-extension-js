let dns = {};
let cancelRequestsTo = {};
let ignoreCheck = {};
let urlTab = {}
let whitelist = []

// Get whitelist in sync storage
chrome.tabs.onUpdated.addListener(function(activeInfo) {
  chrome.storage.sync.get({whitelist: []}, function(result) {
    if (result.whitelist) {
      whitelist = result.whitelist
    }
  });
}); 

// Create block rule for url/host 
function block(url, host){
  // Update rules
  chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: url.map((h, i) => i + 1),
    addRules: url.map((h, i) => ({
      id: i + 1,
      //Create redirect rule type to blockpage
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

// This event is triggered when a request is about to be made, and before headers are available
chrome.webRequest.onBeforeRequest.addListener(
  function({tabId, url}) {    

    // Get host info url
    const hostData = getHostData(url);

    // Break id note host in url
    if (!hostData) return;

    // Assign id to a hostdata
    urlTab[tabId] = [...urlTab[tabId]?urlTab[tabId]:[], hostData.host]

    // If url is in whitelist
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
      // Create rule block for url
      block(urlTab[tabId], hostData.host)
      // Reload tab id url
      chrome.tabs.reload(tabId);
    }
  },
  {
    types: ['main_frame', 'sub_frame'],
    urls: ["<all_urls>"],
});


// Fired when the first byte of the response body is received
chrome.webRequest.onResponseStarted.addListener(function ({tabId, url, ip}){

  // Get host info url
  const hostData = getHostData(url);

  // Break id note host in url
  if (!hostData) return;

  // Assign id to a hostdata
  urlTab[tabId] = [...urlTab[tabId]?urlTab[tabId]:[], hostData.host]

  // If url is in whitelist
  if(urlTab[tabId].some(r=> whitelist.includes(r))){
    console.log("true")
    return;
  } 

  // Check if dns rebidind in host/ip
  const isDnsSafe = CheckDNS(hostData.host, ip);
	if (!isDnsSafe && !ignoreCheck[url]) {
    // Create rule block for url
    block(urlTab[tabId], hostData.host)
    // Reload tab id url
    chrome.tabs.reload(tabId);
	}
},
{
 urls: ["<all_urls>"]
},
["responseHeaders"]);

// Check if host and ip in private list
function CheckDNS(fqdn, ip){
  if(!ip) return true;

  if(dns[fqdn]){
    // Check if ip in rfc1918 list
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

