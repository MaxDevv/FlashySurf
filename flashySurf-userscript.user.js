// ==UserScript==
// @name         FlashySurf - Flash Cards for Passive learning
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  A userscript that creates flashcards from your browsing data for passive learning while surfing the web
// @author       MaxDev
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==


(async function() {
    'use strict';
    if (window.top !== window.self) {
        return;
    }
    let dataSet = {};

    function fetchDataset() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: "https://raw.githubusercontent.com/MaxDevv/flashysurf/main/questions.json",
                onload: function(response) {
                    if (response.status === 200) {
                        resolve(JSON.parse(response.responseText));
                    } else {
                        reject(new Error(`Failed to load dataset: ${response.status}`));
                        console.error("Failed to load dataset:", response.status);
                    }
                },
                onerror: function(error) {
                    reject(error);
                    console.error("Error loading dataset:", error);
                }
            });
        });
    }
    dataSet = await fetchDataset();
    let questionList = dataSet[(Math.random() > 0.5 ? "math" : "english")];
    let flashcard = questionList[Math.floor(Math.random()*questionList.length)];
    

    function createFlashcardWidget(flashcard) {
        GM_setValue('forceCard', true);
        
        let selectedChoice = null;
        let isCorrect = false;
        let closeTimer = 20;
        let forcePause;
        let intervalId = 0;
        let btnInterval = 0;

        if (!forcePause) {
            forcePause = setInterval(() => {
                document.querySelectorAll('video').forEach(vid => vid.pause());
            }, 100);
        }
    
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
            let answer = flashcard.answer;
            flashcard.choices.forEach((i) => {
                if (answer[0].toLowerCase() == i[0].toLowerCase()) {
                    answer = i;
                }
            })
            return answer;
        }

        function render() {
            widgetEl.innerHTML = `
                <div class="cover-container-flashySurfProtectiveStylingClass">
                    <div class="background-flashySurfProtectiveStylingClass"></div>
                    <div class="widget-flashySurfProtectiveStylingClass">
                        <div class="title-flashySurfProtectiveStylingClass">FlashySurf - Flashcard</div>
                        ${selectedChoice ? `
                            <span class="limited-flashySurfProtectiveStylingClass">
                                <span style="color: ${isCorrect ? 'green' : 'red'};">${isCorrect ? 'Correct' : 'Incorrect'}</span>
                                <br>Chosen Answer: ${selectedChoice}
                                <br>Actual Answer: ${getAnswer()}
                                <br>Explanation: ${flashcard.explanation}
                            </span>
                            <div>
                            <button class="close-button-flashySurfProtectiveStylingClass" id="closeButton-flashySurf" disabled>Close</button>
                            Closable in <span id="timefoudfuktktfkftlfgiuf">${closeTimer > 0 ? closeTimer.toFixed(1) : '0.0'}</span> seconds</div>
                        ` : `
                            <div class="question limited-flashySurfProtectiveStylingClass">
                                <span>Question: ${flashcard.question}</span>
                                <br>
                                <span>Paragraph: ${flashcard.paragraph}</span>
                                <br>
                                <span styie="text-decoration: undeerline;"> Tip: You can use desmos.com to solve math problems!</span>
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

            if (selectedChoice && intervalId == 0) {
                const closeButton = document.getElementById('closeButton-flashySurf');
                closeTimer = isCorrect ? 5 : 20;
                intervalId = setInterval(() => {
                    closeTimer -= 0.1;
                    if (closeTimer <= 0){
                        closeTimer = 0.0;
                        closeButton.disabled = false;
                        GM_setValue('forceCard', false);
                        closeButton.onclick = () => {
                            widgetEl.remove();
                            clearInterval(forcePause);
                            forcePause = 1;
                            GM_setValue('forceCard', false);
                        };
                        clearInterval(intervalId);
                    }
                    const timerEl = document.getElementById("timefoudfuktktfkftlfgiuf");
                    if (timerEl) timerEl.innerText = closeTimer.toFixed(1);
                    
                }, 100);
            }
        }
    
        function submittedAnswer(answer) {
            selectedChoice = answer;
            isCorrect = (answer[0].toLowerCase() == flashcard.answer[0].toLowerCase());
            if (!isCorrect) {
                try {
                    isCorrect = (answer[0].toLowerCase() == flashcard.answer[0][0].toLowerCase());
                }
                catch {}
            }
            
            if (isCorrect) {
                GM_setValue("correctSATAnswers", GM_getValue("correctSATAnswers", 0) + 1);
            } else {
                GM_setValue("incorrectSATAnswers", GM_getValue("incorrectSATAnswers", 0) + 1);
            }
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
    }

    GM_setValue("devMode", true);
    // Start the widget
    let randomWidget = (Math.random() < .10);
    if ((GM_getValue('forceCard', false) || randomWidget) && !window.location.hostname.toLowerCase().includes("desmos")) {
        setTimeout(() => {
            createFlashcardWidget(flashcard);
        }, 1000);
    }

    const badge = document.createElement('div');
    badge.style.position = 'fixed';
    badge.style.bottom = '10px';
    badge.style.right = '10px';
    badge.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    badge.style.color = 'white';
    badge.style.padding = '5px 10px';
    badge.style.borderRadius = '5px';
    badge.style.zIndex = '10000';
    badge.textContent = `FlashySurf Stats: Accuracy: ${GM_getValue('correctSATAnswers', 0)}/${GM_getValue('incorrectSATAnswers', 0)+GM_getValue('correctSATAnswers', 0)}`+ (GM_getValue("devMode", false) ? ` (${GM_getValue('forceCard', false) ? 1 : 0} || ${randomWidget ? 1 : 0}) && ${!window.location.hostname.toLowerCase().includes("desmos") ? 1:0}` : '');
    document.body.appendChild(badge);
})();
