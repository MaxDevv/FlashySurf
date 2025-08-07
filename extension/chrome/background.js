chrome.runtime.onInstalled.addListener(() => {
    console.log('FlashySurf extension installed');
    chrome.tabs.create({ url: "https://flashysurf.com/onboarding", active: true });
    chrome.storage.local.get(['correctSATAnswers', 'incorrectSATAnswers', 'forceCard', 'widgetChance', 'devMode', 'lastCompleted', 'satNotes', 'answeredQuestions', 'lastBreak', 'failedQuestions', "uID", 'performanceReport'], (result) => {
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
      if (result.lastCompleted === undefined) {
        chrome.storage.local.set({ lastCompleted: 0 });
      }
      if (result.satNotes === undefined) {
        chrome.storage.local.set({ satNotes: {} });
      }
      if (result.answeredQuestions === undefined) {
        chrome.storage.local.set({ answeredQuestions: [] });
      }
      if (result.lastBreak === undefined) {
        chrome.storage.local.set({ lastBreak: 0 });
      }
      if (result.failedQuestions === undefined) {
        chrome.storage.local.set({ failedQuestions: [] });
      }
      if (result.uID === undefined) {
        chrome.storage.local.set({ uID: crypto.randomUUID() });
      }
      
      if (result.performanceReport === undefined) {
        chrome.storage.local.set({ performanceReport: {"image": undefined, "timestamp": 0} });
      }
      

    });
  });
