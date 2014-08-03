// Copyright (c) 2014 Joshua Perry

var lastTabId = 0;
var systemActive = true;
var tabManifest = [];

var maxAge = 86400;

// Creates a manifest tab from a Chrome tab object
function createManifestTab(tab) {
  return {
    id: tab.id,
    age: 0
  };
}

// Record the intitially active tab
chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
  lastTabId = tabs[0].id;
});

// Make a note of the active tab when it changes and reset its age
chrome.tabs.onActivated.addListener(function(tabId) {
  lastTabId = tabId;

  var tab = _.find(tabManifest, function(tab){ return tab.id === lastTabId; });
  if(tab)
    tab.age = 0;
});

// Add any created tabs to our inventory
chrome.tabs.onCreated.addListener(function(tab){
  tabManifest.push(createManifestTab(tab));
});

// Remove any closed tabs from our inventory
chrome.tabs.onRemoved.addListener(function(tab){
  _.remove(tabManifest, function(mTab){ mTab.id === tab.id; });
})

// Inventory the initial tab set
chrome.tabs.query({}, function(tabs) {
  tabManifest = _.map(tabs, function(tab) {
    return createManifestTab(tab);
  })
});

// We only want to age when the user is actively using their system
chrome.idle.onStateChanged.addListener(function(state) {
  systemActive = state === "active";
});

// Age all of the open browser tabs that are not the last active tab
window.setInterval(function() {
  if(!systemActive)
    return;

  _.forEach(tabManifest, function(tab) {
    if(tab.id !== lastTabId) {
      tab.age++;

      // Commit senicide on aged tabs
      if(tab.age > maxAge) {
        chrome.tabs.remove(tab.id);
      }
    }
  });
}, 1000);
