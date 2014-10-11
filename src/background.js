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

// Stash the active tab of the topmost window
chrome.windows.getLastFocused({}, function(window) {
  chrome.tabs.query({ active: true, windowId: window.id }, function(tabs) {
    lastTabId = tabs[0].id;
    console.debug('Queried currently active tab: %d', lastTabId);
  });
});

// Make a note of the active tab when it changes and reset its age
function activeTabChanged(tab) {
  if(!tab) {
    console.debug('Ummm a not-tab was activated?');
    console.dir(tab);
    return;
  }

  lastTabId = tab.tabId;

  console.debug('New tab activated: %d', lastTabId);

  var mTab = _.find(tabManifest, function(tab){ return tab.id === lastTabId; });
  if(mTab)
    mTab.age = 0;
  else
    console.debug('Newly active tab not in manifest.');
}
chrome.tabs.onActivated.addListener(activeTabChanged);

// If the active window changes, stash the active tab in that window
chrome.windows.onFocusChanged.addListener(function(windowId) {
  // All windows lost focus
  if(windowId === chrome.windows.WINDOW_ID_NONE)
    return;

  chrome.windows.get(windowId, {}, function(window) {
    if(window)
      console.debug('Window type: %s', window.type);
  });

  chrome.tabs.query({active: true, windowId: windowId }, function(tabs) {
    var tab = tabs[0];
    activeTabChanged({ tabId: tab.id, windowId: tab.windowId });
  });
});

// Add any created tabs to our inventory
chrome.tabs.onCreated.addListener(function(tab){
  tabManifest.push(createManifestTab(tab));
  console.debug('New tab %d created, added to manifest', tab.id);
});

// Remove any closed tabs from our inventory
chrome.tabs.onRemoved.addListener(function(tabId){
  _.remove(tabManifest, function(mTab){ return mTab.id === tabId; });
  console.debug('Tab %d removed, deling from manifest', tabId);
});

// Inventory the initial tab set
chrome.tabs.query({}, function(tabs) {
  tabManifest = _.map(tabs, function(tab) {
    return createManifestTab(tab);
  });
});

// We only want to age when the user is actively using their system
chrome.idle.onStateChanged.addListener(function(state) {
  systemActive = state === "active";
  console.debug("System idle state changed: %s", state);
});

// Age all of the open browser tabs that are not the last active tab
window.setInterval(function() {
  if(!systemActive) {
    console.debug('Skipped aging tabs because of idle system');
    return;
  }

  _.forEach(tabManifest, function(tab) {
    if(tab.id !== lastTabId) {
      tab.age++;

      // Commit senicide on aged tabs
      if(tab.age > maxAge) {
        console.debug('Executing tab %d for old age.', tab.id);
        chrome.tabs.remove(tab.id);
      }
    }
  });
}, 1000);
