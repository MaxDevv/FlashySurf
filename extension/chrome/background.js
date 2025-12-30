
chrome.runtime.onInstalled.addListener(({ reason }) => {
  console.log('FlashySurf extension installed/updated');
  if (reason === 'update') {
    chrome.tabs.create({ url: "https://flashysurf.com/updates/" });
  }


  chrome.storage.local.get(['correctSATAnswers', 'incorrectSATAnswers', 'forceCard', 'widgetChance', 'devMode', 'lastCompleted', 'satNotes', 'answeredQuestions', 'lastBreak', 'failedQuestions', "uID", 'performanceReport', 'userFlashCards', 'satCardsEnabled', 'flashCardDevModeNum', 'forceAddCollection', 'nextShareRequest', 'points', 'pointsEarnedToday', "gcmID", "refferalCount", "refferalPoints", "userThemes"], (result) => {
    let userID;
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
      userID = crypto.randomUUID();
      chrome.storage.local.set({ uID: userID });
    }

    if (result.performanceReport === undefined) {
      chrome.storage.local.set({ performanceReport: { "image": undefined, "timestamp": 0 } });
    }

    if (result.userFlashCards === undefined) {
      chrome.storage.local.set({
        userFlashCards: [{
          name: "SAT Flashcards",
          active: true,
          correctlyAnswered: [],
          incorrectlyAnswered: [],
          notes: {},
          questions: [],
          id: "sat"
        }]
      });
    }

    if (result.satCardsEnabled === undefined) {
      chrome.storage.local.set({ satCardsEnabled: true });
    }
    if (result.flashCardDevModeNum === undefined) {
      chrome.storage.local.set({ flashCardDevModeNum: -1 });
    }

    if (result.forceAddCollection === undefined) {
      chrome.storage.local.set({ forceAddCollection: false });
    }
    if (result.forceAddCollection === undefined) {
      chrome.storage.local.set({ forceAddCollection: false });
    }
    if (result.nextShareRequest === undefined) {
      chrome.storage.local.set({ nextShareRequest: Date.now() + (5 * 24 * 60 * 60 * 1000) });
    }

    if (result.ignoreUrls === undefined) {
      chrome.storage.local.set({ ignoreUrls: [] });
    }

    if (result.points === undefined) {
      chrome.storage.local.set({ points: 10 });
    }
    if (result.pointsEarnedToday === undefined) {
      chrome.storage.local.set({ pointsEarnedToday: [0, Date.now()] });
    }
    if (result.gcmID === undefined) {
      console.log('gcmID is undefined, starting registration process');
      chrome.instanceID.getToken({ authorizedEntity: "1085676987010", scope: "GCM" }, (registrationId) => {

        if (chrome.runtime.lastError) {
          console.error('FCM registration failed:', chrome.runtime.lastError.message);
          return;
        }

        console.log('FCM registration successful - registrationId:', registrationId);
        fetch('https://referral-system-1085676987010.europe-west1.run.app/register-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userID, fcmToken: registrationId })
        });
        console.log('Fetch request sent to register-device - userId:', userID, 'fcmToken:', registrationId);

        if (reason === 'install') {
          chrome.storage.sync.get(['referralClaimed'], function (result) {
            if (result.referralClaimed) {
              console.log("User has already claimed a referral.");
              chrome.tabs.create({ url: "https://flashysurf.com/onboarding", active: true });
            } else {
              console.log('Install detected, creating onboarding tab with gcmID:', registrationId);
              chrome.tabs.create({ url: "https://flashysurf.com/onboarding?gcmID=" + registrationId, active: true });
              chrome.storage.sync.set({ referralClaimed: true }, function () {
                console.log("Referral marked as claimed.");
              });
            }
          });
        }
        console.log('Storing gcmID in local storage - registrationId:', registrationId);
        chrome.storage.local.set({ gcmID: registrationId });
        console.log('Storage set complete');
      });
    }

    if (result.refferalCount === undefined) {
      chrome.storage.local.set({ refferalCount: 0 });
    }

    if (result.refferalPoints === undefined) {
      chrome.storage.local.set({ refferalPoints: 0 });
    }
    if (result.userThemes === undefined) {
      chrome.storage.local.set({
        userThemes: {
          ownedThemes: ["light"],
          currentTheme: "light",
          currentThemeCSS: `
                :host {
                    all: initial;
                    --bg-color: #ffffff;
                    --text-color: #000000;
                    --border-color: #000000;
                    --shadow-color: rgba(0,0,0,0.2);
                    --overlay-bg: gray;
                    --choice-bg: color-mix(in srgb, silver 30%, white 70%);
                    --close-button-bg: #007bff;
                    --close-button-text: #ffffff;
                    --back-button-bg: #6c757d;
                    --back-button-text: #ffffff;
                    --next-button-bg: #28a745;
                    --next-button-text: #ffffff;
                    --disabled-button-bg: #cccccc;
                    --correct-text: #008000;
                    --incorrect-text: #ff0000;
                    --notes-border: #cccccc;
                    --notes-bg: #ffffff;
                    --notes-text: #000000;
                    --word-count-text: #666666;
                }
        `,
        }
      });
    }
  });
});

chrome.gcm.onMessage.addListener((message) => {
  if (message.data && message.data.action === 'awardPoints') {

    chrome.storage.local.get(['points', 'refferalCount', 'refferalPoints'], (result) => {
      const currentPoints = result.points ? parseInt(result.points) : 0;
      const refferalCount = result.refferalCount ? parseInt(result.refferalCount) + 1 : 1;
      const newTotal = currentPoints + 75;
      chrome.storage.local.set({ refferalCount: refferalCount });
      chrome.storage.local.set({ refferalPoints: (result.refferalPoints ? parseInt(result.refferalPoints) : 0) + 75 + (refferalCount > 1 ? Math.min((refferalCount - 1), 2) * 25 : 0) });
      chrome.storage.local.set({ points: newTotal });

      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/128x128.png',
          title: 'Referral Bonus!',
          message: 'You just earned 75 points!'
        });
      }
    });
  }
});

chrome.runtime.setUninstallURL("https://tally.so/r/wzPyyk");