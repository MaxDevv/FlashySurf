// FlashySurf content script
(async function () {
    'use strict';
    if (window.top !== window.self) {
        return;
    }
    let config = {
        satMode: true,
        devMode: false,
        semanticSimmilarityInNotSATMode: false,
        useSemanticSimmilarity: true
    }
    config.devMode = await chrome.storage.local.get("devMode");
    let satCardsEnabled = await chrome.storage.local.get("satCardsEnabled");
    config.satMode = satCardsEnabled.satCardsEnabled;
    if (!config.devMode) {
        console.log = function () { };
    }
    // i think itd be best to randomly select one flascard collection first, then do all the rest of the code working off that
    let userFlashCards = await chrome.storage.local.get("userFlashCards");
    userFlashCards = userFlashCards.userFlashCards;
    userFlashCards = userFlashCards.filter((e) => e.active);
    console.log(userFlashCards);
    let selectedFlashcards = userFlashCards[Math.floor(Math.random() * userFlashCards.length)];
    function reallyDumbUneededRecursionForSelectingCollections(recursionLevel = 0) {
        if (userFlashCards.length == 0) {
            return;
        }
        if (recursionLevel > 10) {
            throw new Error("reallyDumbUneededRecursionForSelectingCollections repeated 10 times.");
            return;
        }
        if (satCardsEnabled) {
            if (selectedFlashcards.id == "sat") {
                config.satMode = true;
            } else {
                config.satMode = false;
            }
        } else {
            selectedFlashcards = userFlashCards[Math.floor(Math.random() * userFlashCards.length)];
            reallyDumbUneededRecursionForSelectingCollections(recursionLevel + 1);
        }
    }

    reallyDumbUneededRecursionForSelectingCollections();



    if (!config.satMode && !config.semanticSimmilarityInNotSATMode) {
        // ToDo: implement semantic simmilarity for non SAT mode, im thinking some algorithm that removes filler words like "that" or "the" or "I" then it removes meaningless word prefixes and suffixes like "ly" and "ess" then it finds the most simmilar words to calculate semantic simmmilarity.
        config.useSemanticSimmilarity = false;
    }

    let dataSet = {};
    let randomWidget;
    let answeredPage = false;
    function fetchDataset() {
        if (userFlashCards.length == 0) {
            return new Promise((resolve, reject) => {
                resolve([]);
            });
        }
        if (config.satMode) {
            // old sat functionality
            return new Promise((resolve, reject) => {
                fetch(chrome.runtime.getURL('questions.json'))
                    .then(response => {
                        if (response.ok) {
                            return response.json();
                        }
                        throw new Error(`Failed to load dataset: ${response.status}`);
                    })
                    .then(data => resolve(data))
                    .catch(error => {
                        console.error("Error loading dataset:", error);
                        reject(error);
                    });
            });
        } else {
            return new Promise((resolve, reject) => {
                resolve(selectedFlashcards.questions);
            });
        }
    }

    async function generatePerformanceReport() {
        let data;
        let dataSet = await fetchDataset();
        let flashcardList = [...dataSet["math"], ...dataSet["english"]];


        let result = await chrome.storage.local.get(["failedQuestions", "answeredQuestions", "incorrectSATAnswers", "correctSATAnswers", "satNotes", "uID"]);
        let answeredQuestions = result.answeredQuestions;
        let failedQuestions = result.failedQuestions;
        let correctSATAnswers = result.correctSATAnswers;
        let incorrectSATAnswers = result.incorrectSATAnswers;
        let notes = result.satNotes;
        if (failedQuestions < 5 || (failedQuestions + answeredQuestions) < 25) return false;
        let clusters = Array.from({ length: 87 }, (_, i) => {
            return {
                id: i,
                failedQuestions: 0,
                answeredQuestions: 0
            }
        });

        answeredQuestions.forEach((q) => {
            let question = flashcardList.find(e => e.id === q);
            clusters[question["cluster"]].answeredQuestions += 1;
        })

        failedQuestions.forEach((q) => {
            let question = flashcardList.find(e => e.id === q);
            clusters[question["cluster"]].failedQuestions += 1;
        })

        // After looking through the dataset I realized that the fact that we remove failed questions immediately after theyve been answered means we have less data than we thought, so ill use the notes dataset and get all notes to make this more accurate
        for (const [key, q] of Object.entries(notes)) {
            let question = flashcardList.find(e => e.question === q.question);
            clusters[question["cluster"]].failedQuestions += 1;
        }

        let clusterAccuracies = clusters.map((val) => { return { id: val.id, accuracy: ((val.answeredQuestions + val.failedQuestions) > 0 ? ((val.answeredQuestions) / (val.answeredQuestions + val.failedQuestions)) : (correctSATAnswers / (incorrectSATAnswers + correctSATAnswers + 0.1))) } }).sort((b, a) => b.accuracy - a.accuracy);
        let strugglePoints = []

        clusterAccuracies.forEach((e) => {
            if ((e.accuracy > 0) && (e.accuracy < (correctSATAnswers / (incorrectSATAnswers + correctSATAnswers + 0.1))) && strugglePoints.length < 3) {
                strugglePoints.push(e)
            }
        })

        if (strugglePoints.length < 3) return false;
        data = {
            "correctSATAnswers": correctSATAnswers,
            "incorrectSATAnswers": incorrectSATAnswers,
            "strugglePoints": [
                {
                    "cluster": strugglePoints[0].id,
                    "accuracy": strugglePoints[0].accuracy
                },
                {
                    "cluster": strugglePoints[1].id,
                    "accuracy": strugglePoints[1].accuracy
                },
                {
                    "cluster": strugglePoints[2].id,
                    "accuracy": strugglePoints[2].accuracy
                }
            ],
            "userID": result.uID
        }

        return data;
    }

    try {
        // let flashcardList = dataSet[(Math.random() > 0.5 ? "math" : "english")];
        // dateset is rougly evenly split now, and fixes bug
        let flashcardList = [];
        if (config.satMode) {
            dataSet = await fetchDataset();
            flashcardList = [...dataSet["math"], ...dataSet["english"]];
        } else {
            // NOTSATMODE, yet to implement
            flashcardList = await fetchDataset();
        }
        let flashcard;
        // Helper function to get a random flashcard from a list
        function getRandomFlashcard(flashcardList) {
            return flashcardList[Math.floor(Math.random() * flashcardList.length)];
        }

        // Function to avoid already answered questions
        function avoidAnsweredQuestions(flashcard, flashcardList, answeredQuestions, maxAttempts = 10) {
            let attempts = 0;
            while (answeredQuestions.includes(flashcard.id) && attempts < maxAttempts) {
                flashcard = getRandomFlashcard(flashcardList);
                attempts++;
            }
            return flashcard;
        }

        // Function to get a flashcard from failed questions
        function getFailedQuestionFlashcard(flashcardList, failedQuestions, answeredQuestions) {
            return new Promise((resolve) => {

                if (!config.satMode) {
                    // new system, better data but im lazy rn
                    // basically just loop through all the failed questions and answered questions and perform the operations i removed to make the data look like its from the old system
                    let failedQuestionsOld = [];
                    let answeredQuestionsOld = [];
                    failedQuestions = failedQuestions.map(e => e.correct = false);
                    answeredQuestions = answeredQuestions.map(e => e.correct = true);
                    [...failedQuestions, ...answeredQuestions].sort((a, b) => a.time - b.time).forEach((e) => {
                        if (e.correct) {
                            answeredQuestionsOld.push(e.id)
                            if (failedQuestionsOld.indexOf(e.id) != -1) {
                                failedQuestionsOld.splice(failedQuestionsOld.indexOf(e.id), 1);
                            }
                        } else {
                            failedQuestionsOld.push(e.id);
                            // wait is there no functionality to remove answered questions???, watever idc
                        }
                    })

                    failedQuestions = failedQuestionsOld;
                    answeredQuestions = answeredQuestionsOld;
                }


                let possibleFlashCards = flashcardList.filter(flashcard =>
                    // Bugfix fixing error that caused users to repeatedly get "previously failed" questions that they had answeered correctly later.
                    (failedQuestions.includes(flashcard.id) && (!answeredQuestions.includes(flashcard.id)))
                );

                if (possibleFlashCards.length > 0) {
                    let flashcard = getRandomFlashcard(possibleFlashCards);
                    resolve(flashcard);
                } else {
                    // No failed questions available, get random and avoid answered ones
                    let flashcard = getRandomFlashcard(flashcardList);
                    flashcard = avoidAnsweredQuestions(flashcard, flashcardList, answeredQuestions);
                    resolve(flashcard);
                }
            });
        }

        // Function to get a flashcard that the user struggles with
        function getSATStruggleQuestion(flashcardList, failedQuestions, answeredQuestions, correctSATAnswers, incorrectSATAnswers, notes) {
            return new Promise((resolve) => {
                // get least accurate semantic question clusters
                let clusters = Array.from({ length: 87 }, (_, i) => {
                    return {
                        id: i,
                        failedQuestions: 0,
                        answeredQuestions: 0
                    }
                });

                answeredQuestions.forEach((q) => {
                    let question = flashcardList.find(e => e.id === q);
                    clusters[question["cluster"]].answeredQuestions += 1;
                })

                failedQuestions.forEach((q) => {
                    let question = flashcardList.find(e => e.id === q);
                    clusters[question["cluster"]].failedQuestions += 1;
                })
                // After looking through the dataset I realized that the fact that we remove failed questions immediately after theyve been answered means we have less data than we thought, so ill use the notes dataset and get all notes to make this more accurate
                for (const [key, q] of Object.entries(notes)) {
                    let question = flashcardList.find(e => e.question === q.question);
                    clusters[question["cluster"]].failedQuestions += 1;
                }

                let clusterAccuracies = clusters.map((val) => { return { id: val.id, accuracy: ((val.answeredQuestions + val.failedQuestions) > 0 ? (val.answeredQuestions / (val.answeredQuestions + val.failedQuestions)) : (correctSATAnswers / (incorrectSATAnswers + correctSATAnswers + 0.1))) } }).sort((b, a) => b.accuracy - a.accuracy);
                // clusters.sort((a, b) => (a.failedQuestions/(a.answeredQuestions + a.failedQuestions)) - (b.failedQuestions/(b.answeredQuestions + b.failedQuestions)))
                // ;
                console.log(clusterAccuracies, clusters);

                let possibleFlashCards = flashcardList.filter(flashcard => {
                    return clusterAccuracies.slice(0, 3).some((cluster) => {
                        if (clusters[cluster.id].failedQuestions > 0) {
                            if (flashcard.cluster == cluster.id) {
                                console.log("found!");
                                return true;
                            }
                        }
                    });
                }
                );
                console.log(possibleFlashCards);



                if (possibleFlashCards.length > 0) {
                    let flashcard = getRandomFlashcard(possibleFlashCards);
                    resolve(flashcard);
                } else {
                    // No innacurate questions available, get random and avoid answered ones
                    let flashcard = getRandomFlashcard(flashcardList);
                    flashcard = avoidAnsweredQuestions(flashcard, flashcardList, answeredQuestions);
                    resolve(flashcard);
                }
            });
        }

        function getNonSATStruggleQuestion(flashcardList, failedQuestionIDs, answeredQuestionIDs) {
            // NOTSATMODE, yet to implement
            // Check out https://github.com/NaturalNode/natural, npm install natural

        }



        // Function to get a regular flashcard (avoiding answered questions)
        function getRegularFlashcard(flashcardList, answeredQuestions) {
            return new Promise((resolve) => {
                let flashcard = getRandomFlashcard(flashcardList);
                flashcard = avoidAnsweredQuestions(flashcard, flashcardList, answeredQuestions);
                resolve(flashcard);
            });
        }

        // Main function to select a flashcard
        async function selectFlashcard(flashcardList) {
            return new Promise(async (resolve) => {
                let num = Math.random();
                if (config.devMode) {
                    let n = await chrome.storage.local.get("flashCardDevModeNum");
                    n = n.flashCardDevModeNum;
                    if (n != -1) {
                        num = n;
                    }
                }
                console.log(num);
                if (num < 0.45) {
                    // 45% chance to give a regular question (avoiding answered ones)
                    console.log("New random question :D");
                    if (config.satMode) {
                        chrome.storage.local.get(['answeredQuestions'], async (res) => {
                            const answeredQuestions = res.answeredQuestions || [];
                            const flashcard = await getRegularFlashcard(flashcardList, answeredQuestions);
                            resolve(flashcard);
                        });
                    } else {
                        console.log("Not satmode")
                        const flashcard = await getRegularFlashcard(flashcardList, selectedFlashcards.correctlyAnswered); // Should test Im not sure if this'll work lol
                        resolve(flashcard);
                    }
                } else if (num < 0.45 + 0.35) {
                    // 35% chance to give a question **simmilar** to a previously failed question
                    if (!config.useSemanticSimmilarity) {
                        selectFlashcard(flashcardList).then(selectedFlashcard => {
                            resolve(selectedFlashcard);
                        });
                    } else { // Fixes bug where I made the mistake that i thought the resolve function acted as a return function, and that broke the code, when the SATMODE function was called when it wasnt supposed to, giving us 35% less flashcards cuz of the bug
                        console.log("Semantically simmilar question to a previously failed question :D")
                        chrome.storage.local.get(['failedQuestions', 'answeredQuestions', 'satNotes', 'correctSATAnswers', 'incorrectSATAnswers'], async (res) => {
                            const failedQuestions = res.failedQuestions || [];
                            const answeredQuestions = res.answeredQuestions || [];
                            const flashcard = await getSATStruggleQuestion(flashcardList, failedQuestions, answeredQuestions, res.correctSATAnswers, res.incorrectSATAnswers, res.satNotes);
                            resolve(flashcard);
                        });
                    }
                } else if (num < 0.45 + 0.35 + 0.15) {
                    // 15% chance to give a previously failed question
                    console.log("Previously failed question :D");
                    if (config.satMode) {
                        chrome.storage.local.get(['failedQuestions', 'answeredQuestions'], async (res) => {
                            const failedQuestions = res.failedQuestions || [];
                            const answeredQuestions = res.answeredQuestions || [];
                            const flashcard = await getFailedQuestionFlashcard(flashcardList, failedQuestions, answeredQuestions);
                            resolve(flashcard);
                        });

                    } else {
                        const flashcard = await getFailedQuestionFlashcard(flashcardList, selectedFlashcards.correctlyAnswered, selectedFlashcards.incorrectlyAnswered);
                        resolve(flashcard);
                    }
                } else if (num < 0.45 + 0.35 + 0.15 + 0.025) {
                    if (!config.satMode) {
                        selectFlashcard(flashcardList).then(selectedFlashcard => {
                            resolve(selectedFlashcard);
                        });
                    } else {
                        // 2.5% Chance to show user popup asking to generate score report if possible and not already done in last 12 hours
                        chrome.storage.local.get(["performanceReport"], async (res) => {
                            let canRender = res.performanceReport.timestamp < Date.now() + (12 * 60 * 60 * 1000);
                            let performanceReport = await generatePerformanceReport()
                            if (canRender && performanceReport) {
                                resolve("Performance Report");
                            } else {
                                selectFlashcard(flashcardList).then(selectedFlashcard => {
                                    resolve(selectedFlashcard);
                                });
                            }
                        })
                    }
                } else if (num < 0.45 + 0.35 + 0.15 + 0.025 + 0.025) {
                    // 2.5% Chance to show user popup asking to share extension if possible and not already done in last 5 days
                    chrome.storage.local.get(["nextShareRequest"], async (res) => {
                        if (Date.now() > res.nextShareRequest) {
                            resolve("Share Request");
                        } else {
                            selectFlashcard(flashcardList).then(selectedFlashcard => {
                                resolve(selectedFlashcard);
                            });
                        }
                    })
                }
            });
        }

        // Usage (replaces the original code block):
        console.log("Selecting Flashcard...")
        if (userFlashCards.length != 0) {
            selectFlashcard(flashcardList).then(selectedFlashcard => {
                console.log("Flashcard Selected!")
                flashcard = selectedFlashcard;
                console.log(flashcard);
            });
        }


        function createReportChoiceWidget() {
            let forcePause;
            // Start pausing any background videos.
            if (!forcePause) {
                forcePause = setInterval(() => {
                    document.querySelectorAll('video').forEach(vid => vid.pause());
                }, 100);
            }

            // --- Create the Widget Container and Shadow DOM ---
            const widgetEl = document.createElement('div');
            widgetEl.id = 'performance-report-choice-widget';
            const shadow = widgetEl.attachShadow({ mode: 'closed' });

            // --- Define Styles for the Widget (Restored to your original) ---
            const styles = document.createElement('style');
            styles.textContent = `
                :host {
                    all: initial;
                }
                .background {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw; /* Reduced from original 10000vw for sanity */
                    height: 100vh; /* Reduced from original 100000vh for sanity */
                    overflow: hidden;
                    background-color: gray !important;
                    opacity: 70%;
                    z-index: 99999999999999;
                }
                .cover-container {
                    color: black; 
                    overflow: hidden;
                }
                .widget {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 30vw;
                    border-radius: 1.5em;
                    padding: 1.4em;
                    background-color: white !important;
                    border: 0.075em solid black;
                    display: flex;
                    flex-direction: column;
                    font-family: monospace;
                    gap: 1.5em;
                    box-shadow: 0px 0px 60px 3px rgba(0,0,0,0.2);
                    z-index: 999999999999999;
                    color: black !important;
                    overflow-y: auto;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                ::-webkit-scrollbar {
                    display: none;
                }
                .title { font-weight: bold; font-size: large; }
                .limited { flex: 1; overflow-y: auto; }

                /* Button Styling */
                .close-button {
                    padding: 8px 16px;
                    border-radius: 4px;
                    background-color: #007bff; /* Blue */
                    color: white;
                    border: none;
                    cursor: pointer;
                }
                .generate-report-button { /* Added this style for your new button */
                    padding: 8px 16px;
                    border-radius: 4px;
                    background-color: #28a745; /* Green */
                    color: white;
                    border: none;
                    cursor: pointer;
                }

                /* Styling the list for better readability */
                .limited ul {
                    padding-left: 5px;
                    list-style-type: circle;
                }

                .limited li {
                    margin-bottom: 0.25em;
                    padding-left: 0.5em;
                    display: list-item;
                }
            `;

            function render() {
                // --- Define the HTML structure using your exact text ---
                shadow.innerHTML = `
                    <div class="cover-container">
                        <div class="background"></div>
                        <div class="widget">
                            <div class="title">FlashySurf - Performance Report Ready :D</div>
                            <div class="limited">
                                <br>
                                Score reports are one of the best ways to greatly improve your score, In one click you can, generate a pretty visual report that will:
                                <ul>
                                    <li>• Identify your top 3 weakest topic areas</li>
                                    <li>• Predict your current SAT score range</li>
                                    <li>• Create a shareable image that you can send to tutors, friends, and communities to get even more help.</li>
                                </ul>
                                <br><br>
                            </div>
                            <div>
                                <button class="generate-report-button" id="generateReportButton-flashySurf">Generate Report</button>
                                <button class="close-button" id="closeButton-flashySurf">Close</button>
                            </div>
                        </div>
                    </div>
                `;
                shadow.appendChild(styles);

                // --- Attach Event Listeners (Restored to separate handlers) ---
                const generateButton = shadow.getElementById('generateReportButton-flashySurf');
                const closeButton = shadow.getElementById('closeButton-flashySurf');

                // Generate button functionality
                if (generateButton) {
                    generateButton.addEventListener('click', () => {
                        // The main goal: call the function to show the report
                        generatePerformanceReport().then((report) => {
                            showPerformanceReport(report);
                        });

                        // Now, clean up this choice widget
                        widgetEl.remove();
                        clearInterval(forcePause);
                        // No need to set forcePause to 1 or reset 'forceCard', assuming this widget doesn't affect that
                    });
                }

                // Close button functionality
                if (closeButton) {
                    closeButton.addEventListener('click', () => {
                        // Clean up the widget and interval
                        widgetEl.remove();
                        clearInterval(forcePause);
                    });
                }
            }

            // --- Final Steps ---
            render();
            document.body.appendChild(widgetEl);
        }

        function createShareRequestWidget() {
            let forcePause;
            // Start pausing any background videos.
            if (!forcePause) {
                forcePause = setInterval(() => {
                    document.querySelectorAll('video').forEach(vid => vid.pause());
                }, 100);
            }

            // --- Create the Widget Container and Shadow DOM ---
            const widgetEl = document.createElement('div');
            widgetEl.id = 'flashySurf-share-request-widget';
            const shadow = widgetEl.attachShadow({ mode: 'closed' });

            // --- Define Styles for the Widget ---
            const styles = document.createElement('style');
            styles.textContent = `
                :host {
                    all: initial;
                }
                .background {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background-color: rgba(0, 0, 0, 0.7); /* Darker, more focused background */
                    z-index: 2147483646; /* High but standard max z-index */
                }
                .widget {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 450px; /* Fixed width for better control */
                    max-width: 90vw;
                    border-radius: 16px;
                    padding: 24px;
                    background-color: #ffffff;
                    border: 1px solid #e0e0e0;
                    display: flex;
                    flex-direction: column;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    gap: 20px;
                    box-shadow: 0px 10px 40px rgba(0,0,0,0.15);
                    z-index: 2147483647;
                    color: #333333;
                }
                .title { 
                    font-weight: 600; 
                    font-size: 1.1em; 
                    color: #111;
                }
                .message {
                    font-size: 0.95em;
                    line-height: 1.6;
                    margin: 0;
                }
                .message strong {
                    font-weight: 600;
                }
                .button-container {
                    display: flex;
                    justify-content: space-between;
                    gap: 12px;
                }
                .button {
                    flex-grow: 1;
                    padding: 10px 16px;
                    border-radius: 8px;
                    border: 1px solid transparent;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 0.9em;
                    transition: background-color 0.2s, border-color 0.2s;
                }
                .dismiss-button {
                    background-color: #f0f0f0;
                    color: #555;
                    border-color: #dcdcdc;
                }
                .dismiss-button:hover {
                    background-color: #e0e0e0;
                }
                .support-button {
                    background-color: #28a745; /* Green */
                    color: white;
                }
                .support-button:hover {
                    background-color: #218838;
                }
                .ps-container {
                    border-top: 1px solid #eee;
                    padding-top: 16px;
                    margin-top: 4px;
                    font-size: 0.85em;
                    color: #666;
                }
                .power-session-button {
                    display: inline-block;
                    margin-top: 8px;
                    padding: 8px 14px;
                    border-radius: 6px;
                    background-color: #007bff; /* Blue */
                    color: white;
                    border: none;
                    cursor: pointer;
                    font-weight: 500;
                }
                .power-session-button:hover {
                    background-color: #0069d9;
                }
            `;

            function render() {
                shadow.innerHTML = `
                    <div class="background"></div>
                    <div class="widget">
                        <div class="title">A quick message from the developer</div>
                        <p class="message">
                            Hi, I'm Max. I'm the solo dev behind FlashySurf.
                            <br><br>
                            I love working on this, but getting the word out is tough on my own. If you're finding FlashySurf useful, the best way you can support it is by sharing it with a friend, classmate or a fellow learner.
                            <br><br>
                            Please consider doing so, if you can think of anyone who might be interested in something like this, just a quick message to spread the word would mean <strong>a world of help</strong>, and it'd lets me focus on building features instead of running ads.
                        </p>
                        <div class="button-container">
                            <button class="button dismiss-button" id="dismissButton-flashySurf">Don't show this again</button>
                            <button class="button support-button" id="supportButton-flashySurf">I'll help spread the word</button>
                        </div>
                    </div>
                `;
                shadow.appendChild(styles);

                // --- Attach Event Listeners ---
                const dismissButton = shadow.getElementById('dismissButton-flashySurf');
                const supportButton = shadow.getElementById('supportButton-flashySurf');
                const background = shadow.querySelector('.background');

                const closeWidget = () => {
                    widgetEl.remove();
                    clearInterval(forcePause);
                };

                // Dismiss button functionality
                if (dismissButton) {
                    dismissButton.addEventListener('click', () => {
                        // TODO: Your logic here. 
                        // Set a flag in localStorage to prevent this from showing again.
                        chrome.storage.local.set({ 'nextShareRequest': Date.now() + (60 * 24 * 60 * 60 * 1000) });
                        // Mixpanel event
                        console.log("User chose not to see this message again.");
                        closeWidget();
                    });
                }

                // Support button functionality
                if (supportButton) {
                    supportButton.addEventListener('click', () => {
                        // TODO: Your logic here.
                        // You could present a shareable link, or just use this as a positive signal.
                        // It's mainly for user affirmation, but you could track this click.

                        chrome.storage.local.set({ 'nextShareRequest': Date.now() + (10 * 24 * 60 * 60 * 1000) })
                        console.log("User pledged to share!");
                        closeWidget();
                    });
                }

                // Allow clicking the background to close the widget
                // if(background) {
                //     background.addEventListener('click', closeWidget);
                // }
            }

            // --- Final Steps ---
            render();
            document.body.appendChild(widgetEl);
        }
        function createFlashcardWidget(flashcard) {
            chrome.storage.local.set({ 'forceCard': true });

            if (flashcard == "Performance Report") {
                createReportChoiceWidget();
                return;
            } else if (flashcard == "Share Request") {

                createShareRequestWidget();
                return;
            }


            let selectedChoice = null;
            let isCorrect = false;
            let closeTimer = 20;
            let forcePause;
            if (!forcePause) {
                forcePause = setInterval(() => {
                    document.querySelectorAll('video').forEach(vid => vid.pause());
                }, 100);
            }
            let intervalId = 0;
            let btnInterval = 0;

            // Create container
            const widgetEl = document.createElement('div');
            widgetEl.id = 'flashcard-widget';
            const shadow = widgetEl.attachShadow({ mode: 'closed' });

            // Add event listeners to stop propagation **Fixes bug that allowed textbox keypresses to propogate into website hotkeys causing nuisance and possibly deeper errors to users**
            shadow.addEventListener('keydown', (e) => {
                e.stopPropagation();
            });

            shadow.addEventListener('keyup', (e) => {
                e.stopPropagation();
            });

            shadow.addEventListener('keypress', (e) => {
                e.stopPropagation();
            });
            // Add styles directly to widget
            const styles = document.createElement('style');
            function getAnswer() {
                let answer = flashcard.answer; // Answer Letter like "A"
                flashcard.choices.forEach((i) => {
                    if (answer[0].toLowerCase() == i[0].toLowerCase()) {
                        answer = i; // Answer choice
                    }
                })
                return answer;
            }
            let notesText = '';
            let isInNotesSection = false;
            function render() {
                // In the createFlashcardWidget function, modify the render function
                let tips = [
                    "You can use desmos.com to solve math problems!",
                    "Taking notes improves memory by up to 30% even if you don't read them later!",
                    "Try to understand the concept rather than memorizing the answer.",
                    "Make sure to remember the strategy you use to answer this question so you reuse it or avoid it if you get the question wrong."
                ]
                chrome.storage.local.get(['points', 'pointsEarnedToday', 'userThemes'], function (result) {

                    shadow.innerHTML = `
                    <div class="cover-container">
                        <div class="background"></div>
                        <div class="widget">
                            <div class="title">FlashySurf - Flashcard</div>
                            ${selectedChoice ?
                            isInNotesSection && !isCorrect ?
                                `
                                    <span class="limited">
                                         <h3 style="color: var(--incorrect-text);">Take Notes</h3>
                                        <p>Please describe how and why you got the question wrong and the right solution in your own words.</p>
                                        <p><small>Did you know that notetaking improves memory by up to 30% even if you don't read them?</small></p>
                                        <textarea id="notes-input-flashySurf" class="notes-input" 
                                            placeholder="Please describe how and why you got the question wrong and the right solution in your own words..." 
                                            rows="5">${notesText}</textarea>
                                        <div class="word-count" id="word-count-flashySurf">0 words (minimum 10)</div>
                                    </span>
                                    <div>
                                        <button class="back-button" id="backButton-flashySurf">Back to Explanation</button>
                                        <button class="close-button" id="closeButton-flashySurf" disabled>Close</button>
                                        <span>Closable when you write at least 10 words</span>
                                    </div>
                                `
                                :
                                `
                            <span class="limited">
                                 <span style="color: ${isCorrect ? 'var(--correct-text)' : 'var(--incorrect-text)'};">
                                 ${isCorrect ? 'Correct' : 'Incorrect'} ${(((result.points < 750) && (result.pointsEarnedToday[0] < 50)) || (Number(Date.now()) > (result.pointsEarnedToday[1] + 24 * 60 * 60 * 1000))) ? `${isCorrect ? ' +4 ⬢' : ' +1 ⬢'} points Earned${isCorrect ? '!' : ''}` : `+0 ⬢ (Daily/Total limit reached)`}


                                        </span>
                                        <br>Question: ${flashcard.question.length < 150 ? flashcard.question : "<details> <summary>Click to show question:</summary> " + flashcard.question + " </details>"}
                                        <br>Chosen Answer: ${selectedChoice}
                                        <br>Actual Answer: ${getAnswer()}
                                        <br>Explanation: ${flashcard.explanation}
                                    </span>
                                    <div>
                                    ${isCorrect ?
                                    `<button class="close-button" id="closeButton-flashySurf" disabled>Close</button>
                                        Closable in <span id="timefoudfuktktfkftlfgiuf">${closeTimer > 0 ? closeTimer.toFixed(1) : '0.0'}</span> seconds`
                                    :
                                    `<button class="next-button" id="nextButton-flashySurf">Next: Take Notes</button>`
                                }
                                    </div>
                                `
                            : `
                                <div class="question limited">
                                    <span>Question: ${flashcard.question}</span>
                                    <br>
                                    ${flashcard.paragraph ? `<span>Paragraph: ${flashcard.paragraph}</span>` : ``}
                                    <br>
<br>
                                    <span style="text-decoration: underline;"> Tip: ${tips[Math.floor(Math.random() * tips.length)]}</span> 
                                <button class="skip-button" id="skipButton-flashySurf">Skip Flashcard (Costs 9 Points)</button>
                                </div>
                                <div class="answer">
                                    <div class="choices">
                                        ${flashcard.choices.map(choice => `
                                            <button class="choice">${choice}</button>
                                        `).join('')}
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                `;

                    styles.textContent = `
                
                    ${result.userThemes.currentThemeCSS}

                    .background {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 10000vw;
                        height: 100000vh;
                        overflow: hidden;
                        background-color: var(--overlay-bg) !important;
                        opacity: 70%;
                        z-index: 99999999999999;
                    }
                    .cover-container {
                        color: var(--text-color); 
                        overflow: hidden;
                        
                    }
                    .widget {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: max(40vw, 35vh);
                        border-radius: 1.5em;
                        padding: 1.4em;
                        background-color: var(--bg-color) !important;
                        border: 0.075em solid var(--border-color);
                        display: flex;
                        flex-direction: column;
                        font-family: monospace;
                        gap: 1.5em;
                        box-shadow: 0px 0px 60px 3px var(--shadow-color);
                        z-index: 999999999999999;
                        color: var(--text-color) !important;
                    }
                    .title { font-weight: bold; font-size: large; }
                    .limited { max-height: 45vh; overflow-y: auto; }
                    .choices { display: flex; flex-direction: column; gap: 0.2em; }
                    .choice {
                        padding: 2px 4px;
                        border-radius: 6px;
                        text-align: left;
                        background-color: var(--choice-bg);
                        border: none;
                        height: auto !important;
                        color: var(--text-color) !important;
                        cursor: pointer;
                    }
                    .close-button {
                        padding: 8px 16px;
                        border-radius: 4px;
                        background-color: var(--close-button-bg);
                        color: var(--close-button-text);
                        border: none;
                        cursor: pointer;
                    }
                    .close-button:disabled {
                        background-color: var(--disabled-button-bg);
                        cursor: not-allowed;
                    }
                    
                    .skip-button {
                        font-size: 0.80rem;
                        font-weight: bold;
                        padding-top: 0.125em;
                        margin-top: 0.5em;
                        cursor: pointer;
                        opacity: 0.75;
                        background: none;
                        border-width: 1px;
                        color: var(--text-color) !important;
                    }
                    
                summary {
                    cursor: pointer !important;
                }
                    
                    .notes-input {
                        width: 80%;
                        padding: 8px;
                        border: 1px solid var(--notes-border);
                        border-radius: 4px;
                        font-family: inherit;
                        font-size: 0.9em;
                        resize: vertical;
                        color: var(--notes-text) !important;
                        background-color: var(--notes-bg) !important;
                        margin: 0 auto;
                        display: block;
                    }
                    .word-count {
                        font-size: 0.8em;
                        color: var(--word-count-text);
                        text-align: right;
                        margin-top: 4px;
                        width: 80%;
                        margin: 4px auto 0;
                    }
                    .back-button {
                        padding: 8px 16px;
                        border-radius: 4px;
                        background-color: var(--back-button-bg);
                        color: var(--back-button-text);
                        border: none;
                        cursor: pointer;
                        margin-right: 8px;
                    }
                    .next-button {
                        padding: 8px 16px;
                        border-radius: 4px;
                        background-color: var(--next-button-bg);
                        color: var(--next-button-text);
                        border: none;
                        cursor: pointer;
                    }
                    .next-button:disabled {
                        background-color: var(--disabled-button-bg);
                        cursor: not-allowed;
                    }
                `;
                    shadow.appendChild(styles);


                    // Add event listeners for the new buttons and textarea
                    if (selectedChoice) {
                        if (isInNotesSection && !isCorrect) {
                            const notesInput = shadow.getElementById('notes-input-flashySurf');
                            const wordCount = shadow.getElementById('word-count-flashySurf');
                            const closeButton = shadow.getElementById('closeButton-flashySurf');
                            const backButton = shadow.getElementById('backButton-flashySurf');
                            // Update word count and enable/disable close button
                            const updateWordCount = () => {
                                const words = notesInput.value.trim().split(/\s+/).filter(word => word.length > 0);
                                const count = words.length;
                                wordCount.textContent = `${count} words (minimum 10)`;
                                notesText = notesInput.value;

                                if (count >= 10) {
                                    closeButton.disabled = false;
                                } else {
                                    closeButton.disabled = true;
                                }
                            };

                            notesInput.addEventListener('input', updateWordCount);
                            updateWordCount(); // Initial count

                            // Back button to return to explanation
                            backButton.addEventListener('click', () => {
                                isInNotesSection = false;
                                render();
                            });

                            // Close button saves notes and closes widget
                            closeButton.addEventListener('click', () => {
                                // Save notes to storage
                                const noteId = `${flashcard.id}_${new Date().toISOString().split('T')[0]}_${Math.round(Math.random() * 10000).toString()}`;
                                // WHO TF DESIGNED THIS, oh wait it was me, uhh no I blame this on chatgpt I barely use this but these comments arent trashy enough to be mine, now i gotta look through to see if anything depends on this trashy functionality and fix it
                                // wait nvm i see the vision

                                if (config.satMode) {
                                    chrome.storage.local.get(['satNotes'], function (result) {
                                        const notes = result.satNotes || {};
                                        notes[noteId] = {
                                            question: flashcard.question,
                                            answer: getAnswer(),
                                            userAnswer: selectedChoice,
                                            notes: notesText,
                                            timestamp: Date.now()
                                        };
                                        chrome.storage.local.set({ 'satNotes': notes });
                                    });
                                } else {
                                    chrome.storage.local.get(['userFlashCards'], function (result) {
                                        let userFlashCards = result.userFlashCards;
                                        // get/find the right flascards
                                        for (let i = 0; i < userFlashCards.length; i++) {
                                            if (userFlashCards[i].id == selectedFlashcards.id) {
                                                userFlashCards[i].notes[noteId] = {
                                                    question: flashcard.question,
                                                    answer: getAnswer(),
                                                    userAnswer: selectedChoice,
                                                    notes: notesText,
                                                    timestamp: Date.now()
                                                };
                                            }
                                        }
                                        chrome.storage.local.set({ 'userFlashCards': userFlashCards }); // this feels like just the absolute perfect vector to like have all the flashcards erase themselves
                                    });
                                }

                                widgetEl.remove();
                                clearInterval(forcePause);
                                forcePause = 1;
                                chrome.storage.local.set({ 'forceCard': false });
                                chrome.storage.local.set({ 'lastCompleted': Number(new Date()) });
                            });
                        } else if (!isInNotesSection) {

                            console.log("Starting points check");

                            if (isCorrect) {
                                // For correct answers, handle the close button timer
                                if (intervalId == 0) {
                                    const closeButton = shadow.getElementById('closeButton-flashySurf');
                                    const timerEl = shadow.getElementById("timefoudfuktktfkftlfgiuf");
                                    closeTimer = 3;
                                    intervalId = setInterval(() => {
                                        closeTimer -= 0.1;
                                        if (closeTimer <= 0) {
                                            closeTimer = 0.0;
                                            closeButton.disabled = false;
                                            chrome.storage.local.set({ 'forceCard': false });
                                            chrome.storage.local.set({ 'lastCompleted': Number(new Date()) });
                                            closeButton.onclick = () => {
                                                widgetEl.remove();
                                                clearInterval(forcePause);
                                                forcePause = 1;
                                                chrome.storage.local.set({ 'forceCard': false });
                                            };
                                            clearInterval(intervalId);
                                        }
                                        if (timerEl) timerEl.innerText = closeTimer.toFixed(1);
                                    }, 100);
                                }
                            } else {
                                // For incorrect answers, handle the next button (no timer, just the button)
                                const nextButton = shadow.getElementById('nextButton-flashySurf');

                                // Add click handler for next button
                                nextButton.addEventListener('click', () => {
                                    isInNotesSection = true;
                                    render();
                                });
                            }
                        }

                    } else {
                        const skipButton = shadow.getElementById('skipButton-flashySurf');
                        skipButton.addEventListener('click', () => {
                            if (confirm("Are you sure you want to skip this flashcard? This will cost you 9 points.")) {
                                // Deduct 9 points
                                chrome.storage.local.get(['points'], function (result) {
                                    if (result.points >= 9) {
                                        chrome.storage.local.set({ points: result.points - 9 }, function () {
                                            // Close the widget
                                            widgetEl.remove();
                                            clearInterval(forcePause);
                                            forcePause = 1;
                                            chrome.storage.local.set({ 'forceCard': false });
                                        });
                                    } else {
                                        alert("You don't have enough points to skip this flashcard.");
                                    }
                                });
                            }
                        });
                    }
                });


            }

            function submittedAnswer(answer) {
                answeredPage = true;
                selectedChoice = answer;
                console.log(answer, flashcard.answer, flashcard.choices);
                isCorrect = (answer[0].toLowerCase() == flashcard.answer[0].toLowerCase());
                if (!isCorrect) {
                    try {
                        isCorrect = (answer[0].toLowerCase() == flashcard.answer[0][0].toLowerCase());
                    }
                    catch { }
                }

                addPoints(isCorrect ? 4 : 1);

                if (config.satMode) {
                    chrome.storage.local.get(['correctSATAnswers', 'incorrectSATAnswers', 'failedQuestions'], function (result) {
                        let correct = result.correctSATAnswers || 0;
                        let incorrect = result.incorrectSATAnswers || 0;
                        let failedQuestions = result.failedQuestions || [];
                        if (isCorrect) {
                            chrome.storage.local.set({ "correctSATAnswers": correct + 1 });
                            chrome.storage.local.get(['answeredQuestions'], (res) => {
                                let a = res.answeredQuestions;
                                a.push(flashcard.id);
                                chrome.storage.local.set({ 'answeredQuestions': a });
                            });
                            if (failedQuestions.indexOf(flashcard.id) != -1) {
                                failedQuestions.splice(failedQuestions.indexOf(flashcard.id), 1);
                                chrome.storage.local.set({ "failedQuestions": failedQuestions });
                            }
                        } else {
                            failedQuestions.push(flashcard.id);
                            chrome.storage.local.set({ "incorrectSATAnswers": incorrect + 1 });
                            chrome.storage.local.set({ "failedQuestions": failedQuestions });
                            // I just realized how trashy this code is, but it "works", so idc ig.
                        }
                    });
                } else {
                    chrome.storage.local.get(['userFlashCards'], function (result) {
                        let userFlashCards = result.userFlashCards;
                        // get/find the right flascards
                        for (let i = 0; i < userFlashCards.length; i++) {
                            if (userFlashCards[i].id == selectedFlashcards.id) {
                                if (isCorrect) {
                                    // New system tracks time, more work but also more data for semantic system
                                    userFlashCards[i].correctlyAnswered.push({ id: flashcard.id, time: Date.now() });
                                } else {
                                    userFlashCards[i].incorrectlyAnswered.push({ id: flashcard.id, time: Date.now() });
                                }
                            }
                        }

                        chrome.storage.local.set({ 'userFlashCards': userFlashCards }); // this feels like just the absolute perfect vector to like have all the flashcards erase themselves
                    });

                }
                render();
            }

            // Initial render
            render();
            document.body.appendChild(widgetEl);

            // Event delegation for choices
            console.log("Attaching Listners");

            btnInterval = setInterval(() => {
                Array.from(shadow.querySelectorAll(".choice")).forEach((btn) => {
                    if (!Boolean(btn.attachedListeners)) {
                        btn.addEventListener('click', (e) => {
                            submittedAnswer(btn.textContent);
                        });
                        console.log(btn.textContent);
                        btn.attachedListeners = true;
                        clearInterval(btnInterval);
                    }
                });
            }, 500);


            // Check incase user answered on other website
            let loadTime = Number(new Date());
            setInterval(() => {

                chrome.storage.local.get(['lastCompleted', 'lastBreak'], function (result) {
                    if ((((result.lastCompleted + 3 * 60 * 1000 /* Add 10 second load buffer, replaced with a 3 min delay between cards to reduce annoyances */) > loadTime) && !answeredPage /* Fixes bug where current page would instantly unload widget when answered*/)
                        || (Number(Date.now()) < (result.lastBreak + 30 * 60 * 1000))
                    ) {
                        widgetEl.remove();
                        clearInterval(forcePause);
                        forcePause = 1;
                    }
                });
            })

        }


        function showPerformanceReport(data) {
            let forcePause;
            if (!forcePause) {
                forcePause = setInterval(() => {
                    document.querySelectorAll('video').forEach(vid => vid.pause());
                }, 100);
            }

            let reportImageBlob = null;
            let reportImageUrl = null;

            // Create container
            const widgetEl = document.createElement('div');
            widgetEl.id = 'performance-report-widget';
            const shadow = widgetEl.attachShadow({ mode: 'closed' });

            // Add styles directly to widget
            const styles = document.createElement('style');
            styles.textContent = `

                :host {
                    all: initial;
                }
                .background {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 10000vw;
                    height: 100000vh;
                    overflow: hidden;
                    background-color: gray !important;
                    opacity: 70%;
                    z-index: 99999999999999;
                }
                .cover-container {
                    color: black; 
                    overflow: hidden;
                }
                .widget {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 30vw;
                    height: 80vh;
                    border-radius: 1.5em;
                    padding: 1.4em;
                    background-color: white !important;
                    border: 0.075em solid black;
                    display: flex;
                    flex-direction: column;
                    font-family: monospace;
                    gap: 1.5em;
                    box-shadow: 0px 0px 60px 3px rgba(0,0,0,0.2);
                    z-index: 999999999999999;
                    color: black !important;
                    overflow-y: auto;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                ::-webkit-scrollbar {
                    display: none;
                }
                
                .title { font-weight: bold; font-size: large; }
                .limited { flex: 1; overflow-y: auto; box-shadow: inset 0 -20px 20px -20px rgba(0, 0, 0, 0.6); }
                .close-button {
                    padding: 8px 16px;
                    border-radius: 4px;
                    background-color: #007bff;
                    color: white;
                    border: none;
                    cursor: pointer;
                }
                .download-button, .copy-button {
                    padding: 8px 16px;
                    border-radius: 4px;
                    background-color: #28a745;
                    color: white;
                    border: none;
                    cursor: pointer;
                }
                .close-button:disabled, .download-button:disabled, .copy-button:disabled {
                    background-color: #ccc;
                    cursor: not-allowed;
                }
                .error-text {
                    text-align: center;
                    margin-top: 10px;
                    color: #dc3545;
                }
            `;

            function render(isLoading = true, errorMessage = null) {
                const imageContent = errorMessage ?
                    `<div class="error-text">${errorMessage}</div>` :
                    `<div style="width: 100%; display: flex; justify-content: center;">
                        <img src="${isLoading ? chrome.runtime.getURL('assets/loading.gif') : reportImageUrl}" 
                            style="width: 80%; height: auto; display: block;" />
                    </div>`;

                shadow.innerHTML = `
                    <div class="cover-container">
                        <div class="background"></div>
                        <div class="widget">
                            <div class="title">FlashySurf - Performance Report</div>
                            <div class="limited">
                                ${imageContent}
                                ${!isLoading && !errorMessage ? `
                                    <br>
                                    <span style="text-decoration: underline;">Performance reports provide a detailed assessment of your SAT strengths and weaknesses in an easy-to-understand format. Use these insights to focus your study time on areas that need the most improvement. Share your report with study buddies, tutors, or friends to get targeted help on your challenging topics.</span>
                                ` : ''}
                            </div>
                            <div>
                                ${!errorMessage ? `
                                    Share your report: 
                                    <button class="download-button" id="downloadButton-flashySurf" ${isLoading ? 'disabled' : ''}>Download Report</button>
                                ` : ''}
                                <button class="close-button" id="closeButton-flashySurf">Close</button>
                            </div>
                        </div>
                    </div>
                `;
                shadow.appendChild(styles);

                // Add event listeners for buttons
                const downloadButton = shadow.getElementById('downloadButton-flashySurf');
                const closeButton = shadow.getElementById('closeButton-flashySurf');

                // Download button functionality
                if (downloadButton && !isLoading) {
                    downloadButton.addEventListener('click', () => {
                        if (reportImageBlob) {
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(reportImageBlob);
                            link.download = `FlashySurf_Performance_Report_${new Date().toISOString().split('T')[0]}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }
                    });
                }

                // Close button functionality
                if (closeButton) {
                    closeButton.addEventListener('click', () => {
                        // Clean up blob URL
                        if (reportImageUrl) {
                            URL.revokeObjectURL(reportImageUrl);
                        }
                        widgetEl.remove();
                        clearInterval(forcePause);
                        forcePause = 1;
                        chrome.storage.local.set({ 'forceCard': false });
                    });
                }
            }

            // Function to convert blob to base64
            function blobToBase64(blob) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }

            // Function to create blob from base64
            function base64ToBlob(base64) {
                const [header, data] = base64.split(',');
                const mimeType = header.match(/:(.*?);/)[1];
                const byteCharacters = atob(data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                return new Blob([byteArray], { type: mimeType });
            }

            // Function to check if cached report is still valid (within 12 hours)
            function isCachedReportValid(timestamp) {
                const now = Date.now();
                const twelveHoursInMs = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
                return (now - timestamp) < twelveHoursInMs;
            }

            // Function to load cached report
            async function loadCachedReport() {
                return new Promise((resolve) => {
                    chrome.storage.local.get(['performanceReport'], (result) => {
                        if (result.performanceReport &&
                            result.performanceReport.image &&
                            result.performanceReport.timestamp &&
                            isCachedReportValid(result.performanceReport.timestamp)) {
                            resolve(result.performanceReport);
                        } else {
                            resolve(null);
                        }
                    });
                });
            }

            // Function to generate report via API
            async function generateReport() {
                try {
                    const response = await fetch('https://v2-1085676987010.us-central1.run.app/api/generateReport', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data)
                    });

                    if (!response.ok) {
                        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
                    }

                    // Get the image as blob
                    reportImageBlob = await response.blob();
                    reportImageUrl = URL.createObjectURL(reportImageBlob);

                    // Convert blob to base64 for storage
                    const base64Image = await blobToBase64(reportImageBlob);

                    // Store the report in chrome storage
                    chrome.storage.local.set({
                        'performanceReport': {
                            "image": base64Image,
                            "timestamp": Date.now()
                        }
                    });

                    // Re-render with the actual image
                    render(false);
                } catch (error) {
                    console.error('Error generating report:', error);
                    render(false, 'Failed to generate report. Please try again.');
                }
            }

            // Main initialization function
            async function initialize() {
                // Check for cached report first
                const cachedReport = await loadCachedReport();

                if (cachedReport) {
                    // Use cached report
                    reportImageBlob = base64ToBlob(cachedReport.image);
                    reportImageUrl = URL.createObjectURL(reportImageBlob);
                    render(false);
                } else {
                    // Initial render with loading state
                    render(true);
                    // Generate new report
                    await generateReport();
                }
            }

            // Start the process
            document.body.appendChild(widgetEl);
            initialize();
        }


        function showAddCollectionPopup() {
            let forcePause;
            // Start pausing any background videos.
            if (!forcePause) {
                forcePause = setInterval(() => {
                    document.querySelectorAll('video').forEach(vid => vid.pause());
                }, 100);
            }

            // --- Create the Widget Container and Shadow DOM ---
            const widgetEl = document.createElement('div');
            widgetEl.id = 'add-collection-widget';
            const shadow = widgetEl.attachShadow({ mode: 'closed' });

            // --- Define Styles for the Widget (From your edited file) ---
            const styles = document.createElement('style');
            styles.textContent = `
                :host {
                    all: initial;
                }
                .background {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    overflow: hidden;
                    background-color: gray !important;
                    opacity: 70%;
                    z-index: 99999999999999;
                }
                .cover-container {
                    color: black; 
                    overflow: hidden;
                }
                .widget {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 30vw;
                    border-radius: 1.5em;
                    padding: 1.4em;
                    background-color: white !important;
                    border: 0.075em solid black;
                    display: flex;
                    flex-direction: column;
                    font-family: monospace;
                    gap: 1.5em;
                    box-shadow: 0px 0px 60px 3px rgba(0,0,0,0.2);
                    z-index: 999999999999999;
                    color: black !important;
                    overflow-y: auto;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                ::-webkit-scrollbar {
                    display: none;
                }
                .title { 
                    font-weight: bold; 
                    font-size: large; 
                }
                .limited { 
                    flex: 1; 
                    overflow-y: auto; 
                }

                /* Button Styling */
                .close-button {
                    padding: 8px 16px;
                    border-radius: 4px;
                    background-color: #007bff; /* Blue */
                    color: white;
                    border: none;
                    cursor: pointer;
                }
                .generate-report-button {
                    padding: 8px 16px;
                    border-radius: 4px;
                    background-color: #28a745; /* Green */
                    color: white;
                    border: none;
                    cursor: pointer;
                }

                /* Styling the list for better readability */
                .limited ul {
                    padding-left: 5px;
                    list-style-type: circle;
                    max-width: 95%;
                }

                .limited li {
                    margin-bottom: 0.25em;
                    padding-left: 2.25em;
                    display: list-item;
                    text-indent: -1.75em;
                    
                }

                .limited {
                    h3 {
                        text-decoration-line: underline;
                        text-decoration-style: wavy;  
                        text-decoration-color: rgba(133, 133, 133, 0.541);  
                        margin-top: 0px;
                        padding-top: 0px;
                    }
                    img {
                        padding-left: 2em;
                        
                    }
                }

                .divider {
                    width: 95%;
                    margin-bottom: 1em;
                    height: 1px;
                    justify-self: center;
                    background-color: black;
                }

                div.then {
                    padding-bottom: 2em;
                }

                div.uploadDrag {
                    display: flex;
                    cursor: pointer;
                    justify-self: center;
                    width: 80%;
                    border: 2px dashed #808080;
                    padding: 1em;
                    align-items: center;
                    justify-content: center;
                    flex-direction: column;
                    border-radius: 1em;
                    font-size: 1rem;
                    p.plus {
                        font-size: 10rem;
                        font-weight: 100;
                        opacity: 60%;
                        padding: 0px;
                        margin: 0px;
                        height: 0.6em;
                        display: flex;
                        align-items: center;
                    }
                }
                div.uploadDrag.hover {
                    border-color: blue;
                    border-width: 3px;
                }
            `;

            function render() {
                // --- Define the HTML structure using your edited file ---
                shadow.innerHTML = `
                    <div class="cover-container">
                        <div class="background"></div>
                        <div class="widget">
                            <div class="title">FlashySurf - Upload Flaschard Collection</div>
                            <div class="limited">
                                <br>
                                <h3>Steps to add/edit collections:</h3>
                                <ul>
                                    <li>1. If you want to edit a collection, start off by downloading it</li>
                                    <img src="${chrome.runtime.getURL('assets/collection-download-instruction.png')}" alt="Screenshot-20250902-182102" border="0">
                                    <li>2. Visit <a target="_blank" rel="noopener noreferrer" href="https://flashysurf.com/creator">flashysurf.com/creator</a> and create or edit your collection</li>
                                    <li>3. Download the collection file from the creator website and upload the collection below ↓</li>
                                </ul>

                                <div class="divider"></div>

                                <div class="then">Drag-And-Drop the Collection file Here ↓</div>

                                <div class="uploadDrag" id="uploadDrag">
                                    <p class="plus">+</p>
                                <p>or click to upload</p>

                                <input type="file" id="file-input" accept=".flashysurfcollection.json" style="display: none;">
                                </div>

                                <br><br>
                            </div>
                            <div>
                                <button class="close-button" id="closeButton-flashySurf">Close</button>
                            </div>
                        </div>
                    </div>
                `;
                shadow.appendChild(styles);

                // --- Attach Original Event Listeners ---
                const closeButton = shadow.getElementById('closeButton-flashySurf');

                // Close button functionality
                if (closeButton) {
                    closeButton.addEventListener('click', () => {
                        widgetEl.remove();
                        clearInterval(forcePause);
                    });
                }

                // --- Your new script for drag-and-drop functionality ---
                const dropZone = shadow.getElementById('uploadDrag');
                const fileInput = shadow.getElementById('file-input');

                // Prevent default drag behavior and add hover class
                dropZone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    dropZone.classList.add('hover');
                });

                // Remove hover class when dragging leaves the zone
                dropZone.addEventListener('dragleave', () => {
                    dropZone.classList.remove('hover');
                });

                // Handle dropped files
                dropZone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    dropZone.classList.remove('hover');
                    const files = e.dataTransfer.files;
                    handleFiles(files); // Custom function to process files
                });

                // Handle click to open file input
                dropZone.addEventListener('click', () => {
                    fileInput.click();
                });

                // Handle files selected via input
                fileInput.addEventListener('change', (e) => {
                    const files = e.target.files;
                    handleFiles(files); // Custom function to process files
                });

                // Example function to process files (e.g., display names)
                function handleFiles(files) {
                    let file = files[0]
                    const reader = new FileReader();
                    let returnnnn = false;
                    reader.onload = function (e) {
                        try {
                            const newCollection = JSON.parse(e.target.result);
                            console.log(newCollection);
                            chrome.storage.local.get("userFlashCards", (res) => {
                                let replaceIdx = -1;
                                res.userFlashCards.forEach((collection) => {
                                    if (collection.id == newCollection.id) {
                                        if (confirm(`ALERT this collection "${collection.name}" already exists, do you intend to update it?`)) {
                                            replaceIdx = res.userFlashCards.indexOf(collection);
                                        } else {
                                            returnnnn = true;
                                            return;
                                        }
                                    }
                                    if (returnnnn) return;

                                })
                                if (returnnnn) return;
                                if (replaceIdx != -1) {
                                    res.userFlashCards[replaceIdx].questions = newCollection.questions;
                                    res.userFlashCards[replaceIdx].name = newCollection.name;
                                } else {
                                    res.userFlashCards.push({
                                        active: true,
                                        correctlyAnswered: [],
                                        incorrectlyAnswered: [],
                                        notes: {},
                                        ...newCollection
                                    })
                                }

                                chrome.storage.local.set({ userFlashCards: res.userFlashCards }).then(() => {
                                    alert("Flashcard Collection added/updated, you may safely close this widget or upload more collections :D");
                                });
                            })

                        } catch (error) {
                            console.log('Error parsing JSON: ' + error.message);
                        }
                    };
                    reader.readAsText(file);
                }
            }

            // --- Final Steps ---
            render();
            document.body.appendChild(widgetEl);

        }


        function showThemePreviewPopup(css) {
            // remove any existing widget
            const existingWidget = document.getElementById('flashcard-widget');
            if (existingWidget) {
                existingWidget.remove();
            }
            // Create mock flashcard for preview
            const previewFlashcard = {
                question: "This is what the flashcard would look like",
                paragraph: "Hint: choice a is correct",
                choices: [
                    "A) This is what choice A would look like",
                    "B) This is what choice B would look like",
                    "C) This is what choice C would look like",
                    "D) This is what choice D would look like"
                ],
                answer: "A",
                explanation: "This is what the explanation would look like"
            };

            let selectedChoice = null;
            let isCorrect = false;
            let intervalId = 0;
            let btnInterval = 0;

            // Create container
            const widgetEl = document.createElement('div');
            widgetEl.id = 'flashcard-widget';
            const shadow = widgetEl.attachShadow({ mode: 'closed' });

            // Add event listeners to stop propagation **Fixes bug that allowed textbox keypresses to propogate into website hotkeys causing nuisance and possibly deeper errors to users**
            shadow.addEventListener('keydown', (e) => {
                e.stopPropagation();
            });

            shadow.addEventListener('keyup', (e) => {
                e.stopPropagation();
            });

            shadow.addEventListener('keypress', (e) => {
                e.stopPropagation();
            });
            // Add styles directly to widget
            const styles = document.createElement('style');
            function getAnswer() {
                let answer = previewFlashcard.answer; // Answer Letter like "A"
                previewFlashcard.choices.forEach((i) => {
                    if (answer[0].toLowerCase() == i[0].toLowerCase()) {
                        answer = i; // Answer choice
                    }
                })
                return answer;
            }
            let notesText = '';
            let isInNotesSection = false;
            function render() {

                let tips = [
                    "You can use desmos.com to solve math problems!",
                    "Taking notes improves memory by up to 30% even if you don't read them later!",
                    "Try to understand the concept rather than memorizing the answer.",
                    "Make sure to remember the strategy you use to answer this question so you reuse it or avoid it if you get the question wrong."
                ]
                shadow.innerHTML = `
                    <div class="cover-container">
                        <div class="background"></div>
                        <div class="widget">
                            <div class="title">FlashySurf - Flashcard Preview</div>
                            ${selectedChoice ?
                        isInNotesSection && !isCorrect ?
                            `
                                    <span class="limited">
                                         <h3 style="color: var(--incorrect-text);">Take Notes</h3>
                                        <p>Please describe how and why you got the question wrong and the right solution in your own words.</p>
                                        <p><small>Did you know that notetaking improves memory by up to 30% even if you don't read them?</small></p>
                                        <textarea id="notes-input-flashySurf" class="notes-input" 
                                            placeholder="Please describe how and why you got the question wrong and the right solution in your own words..." 
                                            rows="5">${notesText}</textarea>
                                        <div class="word-count" id="word-count-flashySurf">0 words (minimum 10)</div>
                                    </span>
                                    <div>
                                        <button class="back-button" id="backButton-flashySurf">Back to Explanation</button>
                                        <button class="close-button" id="closeButton-flashySurf">Close Preview</button>
                                    </div>
                                `
                            :
                            `
                            <span class="limited">
                                 <span style="color: ${isCorrect ? 'var(--correct-text)' : 'var(--incorrect-text)'};">
                                 ${isCorrect ? 'Correct' : 'Incorrect'}
                                         </span>
                                         <br>Question: ${previewFlashcard.question.length < 150 ? previewFlashcard.question : "<details> <summary>Click to show question:</summary> " + previewFlashcard.question + " </details>"}
                                         <br>Chosen Answer: ${selectedChoice}
                                         <br>Actual Answer: ${getAnswer()}
                                         <br>Explanation: ${previewFlashcard.explanation}
                                     </span>
                                     <div>
                                    <button class="close-button" id="closeButton-flashySurf">Close Preview</button>
                                     </div>
                                 `
                        : `
                                 <div class="question limited">
                                     <span>Question: ${previewFlashcard.question}</span>
                                     <br>
                                     ${previewFlashcard.paragraph ? `<span>Paragraph: ${previewFlashcard.paragraph}</span>` : ``}
                                     <br>
<br>
                                     <span style="text-decoration: underline;"> Tip: ${tips[Math.floor(Math.random() * tips.length)]}</span> 
                                 </div>
                                 <div class="answer">
                                     <div class="choices">
                                         ${previewFlashcard.choices.map(choice => `
                                             <button class="choice">${choice}</button>
                                         `).join('')}
                                     </div>
                                 </div>
                             `}
                         </div>
                     </div>
                 `;

                styles.textContent = `
                 
                    ${css}

                    .background {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 10000vw;
                        height: 100000vh;
                        overflow: hidden;
                        background-color: var(--overlay-bg) !important;
                        opacity: 70%;
                        z-index: 99999999999999;
                    }
                    .cover-container {
                        color: var(--text-color); 
                        overflow: hidden;
                        
                    }
                    .widget {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: max(40vw, 35vh);
                        border-radius: 1.5em;
                        padding: 1.4em;
                        background-color: var(--bg-color) !important;
                        border: 0.075em solid var(--border-color);
                        display: flex;
                        flex-direction: column;
                        font-family: monospace;
                        gap: 1.5em;
                        box-shadow: 0px 0px 60px 3px var(--shadow-color);
                        z-index: 999999999999999;
                        color: var(--text-color) !important;
                    }
                    .title { font-weight: bold; font-size: large; }
                    .limited { max-height: 45vh; overflow-y: auto; }
                    .choices { display: flex; flex-direction: column; gap: 0.2em; }
                    .choice {
                        padding: 2px 4px;
                        border-radius: 6px;
                        text-align: left;
                        background-color: var(--choice-bg);
                        border: none;
                        height: auto !important;
                        color: var(--text-color) !important;
                        cursor: pointer;
                    }
                    .close-button {
                        padding: 8px 16px;
                        border-radius: 4px;
                        background-color: var(--close-button-bg);
                        color: var(--close-button-text);
                        border: none;
                        cursor: pointer;
                    }
                    .close-button:disabled {
                        background-color: var(--disabled-button-bg);
                        cursor: not-allowed;
                    }
                    
                    .skip-button {
                        font-size: 0.80rem;
                        font-weight: bold;
                        padding-top: 0.125em;
                        margin-top: 0.5em;
                        cursor: pointer;
                        opacity: 0.75;
                        background: none;
                        border-width: 1px;
                        color: var(--text-color) !important;
                    }
                    
                summary {
                    cursor: pointer !important;
                }
                    
                    .notes-input {
                        width: 80%;
                        padding: 8px;
                        border: 1px solid var(--notes-border);
                        border-radius: 4px;
                        font-family: inherit;
                        font-size: 0.9em;
                        resize: vertical;
                        color: var(--notes-text) !important;
                        background-color: var(--notes-bg) !important;
                        margin: 0 auto;
                        display: block;
                    }
                    .word-count {
                        font-size: 0.8em;
                        color: var(--word-count-text);
                        text-align: right;
                        margin-top: 4px;
                        width: 80%;
                        margin: 4px auto 0;
                    }
                    .back-button {
                        padding: 8px 16px;
                        border-radius: 4px;
                        background-color: var(--back-button-bg);
                        color: var(--back-button-text);
                        border: none;
                        cursor: pointer;
                        margin-right: 8px;
                    }
                    .next-button {
                        padding: 8px 16px;
                        border-radius: 4px;
                        background-color: var(--next-button-bg);
                        color: var(--next-button-text);
                        border: none;
                        cursor: pointer;
                    }
                    .next-button:disabled {
                        background-color: var(--disabled-button-bg);
                        cursor: not-allowed;
                    }
                `;
                shadow.appendChild(styles);


                // Add event listeners for the new buttons and textarea
                if (selectedChoice) {
                    if (isInNotesSection && !isCorrect) {
                        const notesInput = shadow.getElementById('notes-input-flashySurf');
                        const wordCount = shadow.getElementById('word-count-flashySurf');
                        const closeButton = shadow.getElementById('closeButton-flashySurf');
                        const backButton = shadow.getElementById('backButton-flashySurf');
                        // Update word count and enable/disable close button
                        const updateWordCount = () => {
                            const words = notesInput.value.trim().split(/\s+/).filter(word => word.length > 0);
                            const count = words.length;
                            wordCount.textContent = `${count} words (minimum 10)`;
                            notesText = notesInput.value;
                        };

                        notesInput.addEventListener('input', updateWordCount);
                        updateWordCount(); // Initial count

                        // Back button to return to explanation
                        backButton.addEventListener('click', () => {
                            isInNotesSection = false;
                            render();
                        });

                        // Close button closes widget
                        closeButton.addEventListener('click', () => {
                            widgetEl.remove();
                        });
                    } else if (!isInNotesSection) {
                        const closeButton = shadow.getElementById('closeButton-flashySurf');

                        // Close button for explanation screen
                        closeButton.addEventListener('click', () => {
                            if (isCorrect) {
                                widgetEl.remove();
                            } else {
                                isInNotesSection = true;
                                render();
                            }
                        });

                        // Update button text based on correctness
                        if (!isCorrect) {
                            closeButton.textContent = 'Next: Take Notes';
                        }
                    }

                } else {
                    // No choice selected yet, nothing extra needed
                }

            }

            function submittedAnswer(answer) {
                selectedChoice = answer;
                console.log(answer, previewFlashcard.answer, previewFlashcard.choices);
                isCorrect = (answer[0].toLowerCase() == previewFlashcard.answer[0].toLowerCase());
                if (!isCorrect) {
                    try {
                        isCorrect = (answer[0].toLowerCase() == previewFlashcard.answer[0][0].toLowerCase());
                    }
                    catch { }
                }

                render();
            }

            // Initial render
            render();
            document.body.appendChild(widgetEl);

            // Event delegation for choices
            console.log("Attaching Listners");

            btnInterval = setInterval(() => {
                Array.from(shadow.querySelectorAll(".choice")).forEach((btn) => {
                    if (!Boolean(btn.attachedListeners)) {
                        btn.addEventListener('click', (e) => {
                            submittedAnswer(btn.textContent);
                        });
                        console.log(btn.textContent);
                        btn.attachedListeners = true;
                        clearInterval(btnInterval);
                    }
                });
            }, 500);

        }
        function addPoints(pointsToAdd) {
            chrome.storage.local.get(['points', 'pointsEarnedToday'], function (result) {
                if (result.points < 750) {
                    return;
                }
                if (Number(Date.now()) > (result.pointsEarnedToday[1] + 24 * 60 * 60 * 1000)) {
                    // Reset daily points if last earned was over 24 hours ago
                    chrome.storage.local.set({ pointsEarnedToday: [pointsToAdd, Date.now()] });
                    chrome.storage.local.set({ points: [pointsToAdd + result.points] });
                } else if ((result.pointsEarnedToday + pointsToAdd) < 50) {
                    chrome.storage.local.set({ pointsEarnedToday: [result.pointsEarnedToday[0] + pointsToAdd, Date.now()] });
                    chrome.storage.local.set({ points: [pointsToAdd + result.points] });
                }
            });


        }

        chrome.storage.local.get(['forceCard', 'widgetChance', 'lastBreak', 'lastCompleted', 'ignoreUrls'], function (result) {
            if ((Number(Date.now()) > (result.lastBreak + 30 * 60 * 1000)) && (Number(Date.now()) > (result.lastCompleted + 3 * 60 * 1000)) && (userFlashCards.length != 0)) {

                console.log("Running");
                let v = Math.random();
                randomWidget = (v < result.widgetChance);
                // console.log(v, result.widgetChance, result.forceCard);
                let excludedSites = [
                    "desmos.com",
                    "flashysurf.com",
                    ...result.ignoreUrls
                ]

                for (let site of excludedSites) {
                    if (window.location.hostname.toLowerCase().includes(site.toLowerCase())) {
                        return;
                    }
                }
                if ((result.forceCard || randomWidget)) {
                    setTimeout(() => {
                        createFlashcardWidget(flashcard);
                    }, 1000);
                }
            }
        });

        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case "showPerformanceReport":
                    showPerformanceReport(message.data);
                    sendResponse({ success: true });
                    break;
                case "addCollection":
                    showAddCollectionPopup();
                    sendResponse({ success: true });
                    break;
                case "previewTheme":
                    showThemePreviewPopup(message.data);
                    sendResponse({ success: true });
                    break;
                default:
                    console.log("Invalid event", message.action, message);
                    sendResponse({ success: false });
            }
        });

        chrome.storage.local.get("forceAddCollection", (result) => {
            if (result.forceAddCollection) {
                chrome.storage.local.set({ forceAddCollection: false });
                showAddCollectionPopup();
            }
        })
        chrome.storage.local.get(['pendingPreviewCss'], (result) => {
            if (result.pendingPreviewCss) {
                showThemePreviewPopup(result.pendingPreviewCss);
                chrome.storage.local.remove('pendingPreviewCss');
            }
        });
        // Create stats badge
        /*
        chrome.storage.local.get(['correctSATAnswers', 'incorrectSATAnswers', 'devMode'], function(result) {
            const badge = document.createElement('div');
            badge.style.position = 'fixed';
            badge.style.bottom = '10px';
            badge.style.right = '10px';
            badge.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            badge.style.color = 'white';
            badge.style.padding = '5px 10px';
            badge.style.borderRadius = '5px';
            badge.style.zIndex = '10000';
            
            const correct = result.correctSATAnswers || 0;
            const incorrect = result.incorrectSATAnswers || 0;
            const devMode = result.devMode || false;
            console.log(result);
            badge.textContent = `FlashySurf Stats: Accuracy: ${correct}/${incorrect+correct}`+ 
                (devMode ? ` (${result.forceCard ? 1 : 0} || ${randomWidget ? 1 : 0}) && ${!window.location.hostname.toLowerCase().includes("desmos") ? 1:0}` : '');
            
            document.body.appendChild(badge);
        }); */
    } catch (error) {
        console.error("FlashySurf error:", error);
    }




})();