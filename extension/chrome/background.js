chrome.runtime.onInstalled.addListener(() => {
    console.log('FlashySurf extension installed');
    
    chrome.storage.local.get(['correctSATAnswers', 'incorrectSATAnswers', 'forceCard', 'widgetChance', 'devMode'], (result) => {
      if (result.correctSATAnswers === undefined) {
        chrome.storage.local.set({ correctSATAnswers: 0 });
      }
      if (result.incorrectSATAnswers === undefined) {
        chrome.storage.local.set({ incorrectSATAnswers: 0 });
      }
      if (result.forceCard === undefined) {
        chrome.storage.local.set({ forceCard: false });
      }
      if (result.devMode === undefined) {
        chrome.storage.local.set({ devMode: false });
      }
      if (result.widgetChance === undefined) {
        chrome.storage.local.set({ widgetChance: 0.1 });
      }
    });
  });
