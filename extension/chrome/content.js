// FlashySurf content script
(async function() {
    'use strict';
    if (window.top !== window.self) {
        return;
    }
    let devMode = false;

    chrome.storage.local.get(['correctSATAnswers', 'incorrectSATAnswers', 'forceCard', 'widgetChance', 'devMode', 'lastCompleted', 'satNotes', 'answeredQuestions', 'lastBreak', 'failedQuestions'], (result) => {    
        devMode = result.devMode;
        // devMode = false;
        if (!devMode) {
            console.log = () => {}
        }
        if (devMode) console.log("Data dump:", result);
    });

    let dataSet = {};
    let  randomWidget;
    let answeredPage = false;
    function fetchDataset() {
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
    }

    function getRandomSubarray(arr, size) {
        size = Math.min(size, arr.length);
        var shuffled = arr.slice(0), i = arr.length, min = i - size, temp, index;
        while (i-- > min) {
            index = Math.floor((i + 1) * Math.random());
            temp = shuffled[index];
            shuffled[index] = shuffled[i];
            shuffled[i] = temp;
        }
        return shuffled.slice(min);
    }

    function cosSim(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error("Vectors must be the same length");
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) {
            return 0; // avoid divide-by-zero if either vector is all zeros
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    try {
        dataSet = await fetchDataset();
        // let flashcardList = dataSet[(Math.random() > 0.5 ? "math" : "english")];
        // dateset is rougly evenly split now, and fixes bug
        let flashcardList = [...dataSet["math"], ...dataSet["english"]];
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
        function getStruggleQuestion(flashcardList, failedQuestions, answeredQuestions) {
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
                
                let clusterAccuracies = clusters.map((val) => {return {id: val.id, accuracy: (val.failedQuestions/(val.answeredQuestions + val.failedQuestions + (1/1000))) }}).sort((a, b) => b.accuracy - a.accuracy);
                // clusters.sort((a, b) => (a.failedQuestions/(a.answeredQuestions + a.failedQuestions)) - (b.failedQuestions/(b.answeredQuestions + b.failedQuestions)))
                // ;

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
                    console.log( possibleFlashCards);

            
                
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
            return new Promise((resolve) => {
                let num = Math.random();
                if (num < 0.5) {
                    // 50% chance to give a regular question (avoiding answered ones)
                    console.log("New random question :D")
                    chrome.storage.local.get(['answeredQuestions'], async (res) => {
                        const answeredQuestions = res.answeredQuestions || [];
                        const flashcard = await getRegularFlashcard(flashcardList, answeredQuestions);
                        resolve(flashcard);
                    });
                } else if (num < 0.5 + 0.3) {
                    // 30% chance to give a question **simmilar** to a previously failed question
                    console.log("Semantically simmilar question to a previously failed question :D")
                    chrome.storage.local.get(['failedQuestions', 'answeredQuestions'], async (res) => {
                        const failedQuestions = res.failedQuestions || [];
                        const answeredQuestions = res.answeredQuestions || [];
                        const flashcard = await getStruggleQuestion(flashcardList, failedQuestions, answeredQuestions);
                        resolve(flashcard);
                    });
                } else if (num < 0.5 + 0.3 + 0.2) {
                    // 20% chance to give a previously failed question
                    console.log("Previously failed question :D")
                    chrome.storage.local.get(['failedQuestions', 'answeredQuestions'], async (res) => {
                        const failedQuestions = res.failedQuestions || [];
                        const answeredQuestions = res.answeredQuestions || [];
                        const flashcard = await getFailedQuestionFlashcard(flashcardList, failedQuestions, answeredQuestions);
                        resolve(flashcard);
                    });
                }
            });
        }

        // Usage (replaces the original code block):
        selectFlashcard(flashcardList).then(selectedFlashcard => {
            flashcard = selectedFlashcard;
            console.log(flashcard);
        });


        function createFlashcardWidget(flashcard) {
            chrome.storage.local.set({ 'forceCard': true });
                        

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
            
            // Add styles directly to widget
            const styles = document.createElement('style');
            styles.textContent = `
                .background-flashySurfProtectiveStylingClass {
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
                .cover-container-flashySurfProtectiveStylingClass {
                    color: black; 
                    overflow: hidden;
                    
                }
                .widget-flashySurfProtectiveStylingClass {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: max(40vw, 35vh);
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
                }
                .title-flashySurfProtectiveStylingClass { font-weight: bold; font-size: large; }
                .limited-flashySurfProtectiveStylingClass { max-height: 10em; overflow-y: scroll; }
                .choices-flashySurfProtectiveStylingClass { display: flex; flex-direction: column; gap: 0.2em; }
                .choice-flashySurfProtectiveStylingClass {
                    padding: 2px 4px;
                    border-radius: 6px;
                    text-align: left;
                    background-color: color-mix(in srgb, silver 30%, white 70%);
                    border: none;
                    height: auto !important;
                    color: black !important;
                    cursor: pointer;
                }
                .close-button-flashySurfProtectiveStylingClass {
                    padding: 8px 16px;
                    border-radius: 4px;
                    background-color: #007bff;
                    color: white;
                    border: none;
                    cursor: pointer;
                }
                .close-button-flashySurfProtectiveStylingClass:disabled {
                    background-color: #ccc;
                    cursor: not-allowed;
                }
            `;
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
                    "Try to understand the concept rather than memorizing the answer."
                ]
                
                widgetEl.innerHTML = `
                    <div class="cover-container-flashySurfProtectiveStylingClass">
                        <div class="background-flashySurfProtectiveStylingClass"></div>
                        <div class="widget-flashySurfProtectiveStylingClass">
                            <div class="title-flashySurfProtectiveStylingClass">FlashySurf - Flashcard</div>
                            ${selectedChoice ? 
                                isInNotesSection && !isCorrect ? 
                                `
                                    <span class="limited-flashySurfProtectiveStylingClass">
                                        <h3 style="color: red;">Take Notes</h3>
                                        <p>Please describe how and why you got the question wrong and the right solution in your own words.</p>
                                        <p><small>Did you know that notetaking improves memory by up to 30% even if you don't read them?</small></p>
                                        <textarea id="notes-input-flashySurf" class="notes-input-flashySurfProtectiveStylingClass" 
                                            placeholder="Please describe how and why you got the question wrong and the right solution in your own words..." 
                                            rows="5">${notesText}</textarea>
                                        <div class="word-count-flashySurfProtectiveStylingClass" id="word-count-flashySurf">0 words (minimum 10)</div>
                                    </span>
                                    <div>
                                        <button class="back-button-flashySurfProtectiveStylingClass" id="backButton-flashySurf">Back to Explanation</button>
                                        <button class="close-button-flashySurfProtectiveStylingClass" id="closeButton-flashySurf" disabled>Close</button>
                                        <span>Closable when you write at least 10 words</span>
                                    </div>
                                ` 
                                : 
                                `
                                    <span class="limited-flashySurfProtectiveStylingClass">
                                        <span style="color: ${isCorrect ? 'green' : 'red'};">${isCorrect ? 'Correct' : 'Incorrect'}</span>
                                        <br>Chosen Answer: ${selectedChoice}
                                        <br>Actual Answer: ${getAnswer()}
                                        <br>Explanation: ${flashcard.explanation}
                                    </span>
                                    <div>
                                    ${isCorrect ? 
                                        `<button class="close-button-flashySurfProtectiveStylingClass" id="closeButton-flashySurf" disabled>Close</button>
                                        Closable in <span id="timefoudfuktktfkftlfgiuf">${closeTimer > 0 ? closeTimer.toFixed(1) : '0.0'}</span> seconds` 
                                        : 
                                        `<button class="next-button-flashySurfProtectiveStylingClass" id="nextButton-flashySurf">Next: Take Notes</button>`
                                    }
                                    </div>
                                `
                            : `
                                <div class="question limited-flashySurfProtectiveStylingClass">
                                    <span>Question: ${flashcard.question}</span>
                                    <br>
                                    <span>Paragraph: ${flashcard.paragraph}</span>
                                    <br>
                                    <span style="text-decoration: underline;"> Tip: ${tips[Math.floor(Math.random()*tips.length)]}</span>
                                </div>
                                <div class="answer-flashySurfProtectiveStylingClass">
                                    <div class="choices-flashySurfProtectiveStylingClass">
                                        ${flashcard.choices.map(choice => `
                                            <button class="choice-flashySurfProtectiveStylingClass">${choice}</button>
                                        `).join('')}
                                    </div>
                                </div>
                            `}
                        </div>
                    </div>
                `;
                widgetEl.appendChild(styles);

                // Add event listeners for the new buttons and textarea
                if (selectedChoice) {
                    if (isInNotesSection && !isCorrect) {
                        const notesInput = document.getElementById('notes-input-flashySurf');
                        const wordCount = document.getElementById('word-count-flashySurf');
                        const closeButton = document.getElementById('closeButton-flashySurf');
                        const backButton = document.getElementById('backButton-flashySurf');
                        
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
                            const questionId = `${flashcard.question.substring(0, 30)}_${new Date().toISOString().split('T')[0]}`;
                            chrome.storage.local.get(['satNotes'], function(result) {
                                const notes = result.satNotes || {};
                                notes[questionId] = {
                                    question: flashcard.question,
                                    answer: getAnswer(),
                                    userAnswer: selectedChoice,
                                    notes: notesText,
                                    timestamp: Date.now()
                                };
                                chrome.storage.local.set({ 'satNotes': notes });
                            });
                            
                            widgetEl.remove();
                            clearInterval(forcePause);
                            forcePause = 1;
                            chrome.storage.local.set({ 'forceCard': false });
                            chrome.storage.local.set({ 'lastCompleted': Number(new Date()) });
                        });
                    } else if (!isInNotesSection) {
                        if (isCorrect) {
                            // For correct answers, handle the close button timer
                            if (intervalId == 0) {
                                const closeButton = document.getElementById('closeButton-flashySurf');
                                const timerEl = document.getElementById("timefoudfuktktfkftlfgiuf");
                                closeTimer = 5;
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
                            const nextButton = document.getElementById('nextButton-flashySurf');
                            
                            // Add click handler for next button
                            nextButton.addEventListener('click', () => {
                                isInNotesSection = true;
                                render();
                            });
                        }
                    }
                }

                // Add CSS for new elements to the styles
                styles.textContent += `
                    .notes-input-flashySurfProtectiveStylingClass {
                        width: 80%;
                        padding: 8px;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                        font-family: inherit;
                        font-size: 0.9em;
                        resize: vertical;
                        color: black !important;
                        background-color: white !important;
                        margin: 0 auto;
                        display: block;
                    }
                    .word-count-flashySurfProtectiveStylingClass {
                        font-size: 0.8em;
                        color: #666;
                        text-align: right;
                        margin-top: 4px;
                        width: 80%;
                        margin: 4px auto 0;
                    }
                    .back-button-flashySurfProtectiveStylingClass {
                        padding: 8px 16px;
                        border-radius: 4px;
                        background-color: #6c757d;
                        color: white;
                        border: none;
                        cursor: pointer;
                        margin-right: 8px;
                    }
                    .next-button-flashySurfProtectiveStylingClass {
                        padding: 8px 16px;
                        border-radius: 4px;
                        background-color: #28a745;
                        color: white;
                        border: none;
                        cursor: pointer;
                    }
                    .next-button-flashySurfProtectiveStylingClass:disabled {
                        background-color: #ccc;
                        cursor: not-allowed;
                    }
                `;

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
                    catch {}
                }

                
                chrome.storage.local.get(['correctSATAnswers', 'incorrectSATAnswers', 'failedQuestions'], function(result) {
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
                            chrome.storage.local.set({"failedQuestions": failedQuestions});
                        }
                    } else {
                        failedQuestions.push(flashcard.id);
                        chrome.storage.local.set({ "incorrectSATAnswers": incorrect + 1 });
                        chrome.storage.local.set({"failedQuestions": failedQuestions});
                    }
                });
                render();
            }
            
            // Initial render
            render();
            document.body.appendChild(widgetEl);

            // Event delegation for choices
            console.log("Attaching Listners");
              
            btnInterval = setInterval(() => {
                Array.from(document.getElementsByClassName("choice-flashySurfProtectiveStylingClass")).forEach((btn) => {
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

                chrome.storage.local.get(['lastCompleted', 'lastBreak'], function(result) {
                    if (    (((result.lastCompleted + 3 * 60 * 1000 /* Add 10 second load buffer, replaced with a 3 min delay between cards to reduce annoyances */) > loadTime) && !answeredPage /* Fixes bug where current page would instantly unload widget when answered*/ )
                            || (Number(Date.now()) < (result.lastBreak + 30 * 60 * 1000))
                        ) {
                        widgetEl.remove();
                        clearInterval(forcePause);
                        forcePause = 1;
                    }
                });
            })
            
        }
        
        // Start the widget
        chrome.storage.local.get(['forceCard', 'widgetChance', 'lastBreak'], function(result) {
            if (Number(Date.now()) > (result.lastBreak + 30 * 60 * 1000)) {

                console.log("Running");
                let v = Math.random();
                randomWidget = (v < result.widgetChance);
                // console.log(v, result.widgetChance, result.forceCard);
                if ((result.forceCard || randomWidget) && !window.location.hostname.toLowerCase().includes("desmos")) {
                    setTimeout(() => {
                        createFlashcardWidget(flashcard);
                    }, 1000);
                }
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