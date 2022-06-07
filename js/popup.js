let whitelist = []

chrome.storage.sync.get({whitelist: []}, function(result) {
  if (result.whitelist) {
    whitelist = result.whitelist
    console.log(result.whitelist) 
  }
});

document.addEventListener('DOMContentLoaded', function () {
	document.getElementById('whitelist')
		.addEventListener('click', save);

    chrome.tabs.query({active:true,currentWindow:true},function(tab){
      if(whitelist.includes(getHostData(tab[0].url))){
        document.getElementById('whitelist').className = "btn btn-outline-light mb-1 w-100"
        document.getElementById('whitelist').innerHTML = "Remove White List"
      }
    });
});

function getHostData(url) {
	const m = /^(?:(\w+):)?\/\/([^\/\?#]+)/.exec(url);
	if (!m || !m[2]) {
		return null;
	}
	return m[2];
}

function save() {
  chrome.tabs.query({active:true,currentWindow:true},function(tab){
    const host = getHostData(tab[0].url)

    if(whitelist.includes(host)){
      chrome.storage.sync.clear(() => {
        chrome.runtime.reload();
        window.close();
      });
    } else {
      whitelist.push(host)
      chrome.storage.sync.set({whitelist}, function() {
        console.log('Value is set to ' + whitelist);
        document.getElementById('whitelist').className = "btn btn-outline-light mb-1 w-100"
        document.getElementById('whitelist').innerHTML = "Remove White List"
      });
    }
    chrome.tabs.reload(tab[0].id);
  });

}