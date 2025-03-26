// ==UserScript==
// @name         FlashySurf - Flash Cards for Passive learning
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  A userscript that creates flashcards from your browsing data for passive learning while surfing the web
// @author       MaxDev
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==


(async function() {
    'use strict';

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
        
        let closeTimer = 10;
        let selectedChoice = null;
        let isCorrect = false;
        let intervalId;
        let forcePause;
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
            .background {
                position: fixed;
                top: 0;
                left: 0;
                width: 10000vw;
                height: 100000vh;
                overflow: hidden;
                background-color: gray;
                opacity: 70%;
                z-index: 99999999999999;
            }
            .cover-container { color: black; 
                overflow: hidden;}
            .widget {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: max(40vw, 35vh);
                border-radius: 1.5em;
                padding: 1.4em;
                background-color: white;
                border: 0.075em solid black;
                display: flex;
                flex-direction: column;
                font-family: monospace;
                gap: 1.5em;
                box-shadow: 0px 0px 60px 3px rgba(0,0,0,0.2);
                z-index: 999999999999999;
            }
            .title { font-weight: bold; font-size: large; }
            .limited { max-height: 10em; overflow-y: scroll; }
            .choices { display: flex; flex-direction: column; gap: 0.2em; }
            .choice {
                padding: 2px 4px;
                border-radius: 6px;
                text-align: left;
                background-color: color-mix(in srgb, silver 30%, white 70%);
                border: none;
                color: black;
            }
        `;
    
        function render() {
            widgetEl.innerHTML = closeTimer > 0 ? `
                <div class="cover-container">
                    <div class="background"></div>
                    <div class="widget">
                        <div class="title">FlashySurf - Flashcard</div>
                        ${selectedChoice ? `
                            <span class="limited">
                                <span style="color: ${isCorrect ? 'green' : 'red'};">${isCorrect ? 'Correct' : 'Incorrect'}</span>
                                <br>Chosen Answer: ${selectedChoice}
                                <br>Actual Answer: ${flashcard.answer}
                                <br>Explanation: ${flashcard.explanation}
                            </span>
                            <div>Closing in <span id="timefoudfuktktfkftlfgiuf">${closeTimer.toFixed(1)}</span> seconds</div>
                        ` : `
                            <div class="question limited">
                                <span>Question: ${flashcard.question}</span><br>
                                <span>Paragraph: ${flashcard.paragraph}</span>
                                ${flashcard.images.map(img => `<img src="${img}" alt="Image">`).join('')}
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
            ` : '';
            widgetEl.appendChild(styles);
        }
    
        function submittedAnswer(answer) {

            selectedChoice = answer;
            isCorrect = answer[0] === flashcard.answer[0];
            if (!isCorrect) closeTimer += 30;
            if (isCorrect) {
                GM_setValue("correctSATAnswers", GM_getValue("correctSATAnswers", 0) + 1);
            } else {
                GM_setValue("incorrectSATAnswers", GM_getValue("incorrectSATAnswers", 0) + 1);
            }
            if (!intervalId) {
                intervalId = setInterval(() => {
                    closeTimer -= 0.1;
                    if (closeTimer < 0) {
                        widgetEl.remove();
                        clearInterval(intervalId);
                        clearInterval(forcePause);
                        forcePause = 1;
                        GM_setValue('forceCard', false);
                    }
                    document.getElementById("timefoudfuktktfkftlfgiuf").innerText = closeTimer.toFixed(1);
                }, 100);
            }
            render();
        }
    
        // Event delegation for choices
        widgetEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('choice')) {
                submittedAnswer(e.target.textContent);
            }
        });
    
        // Initial render
        render();
        document.body.appendChild(widgetEl);
    }
    
    // Start the widget
    let randomWidget = (Math.random() < 0.20);
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
    badge.textContent = `FlashySurf Stats: Accuracy: ${GM_getValue('correctSATAnswers', 0)}/${GM_getValue('incorrectSATAnswers', 0)} (${GM_getValue('forceCard', false) ? 1 : 0} || ${randomWidget ? 1 : 0}) && ${!window.location.hostname.toLowerCase().includes("desmos") ? 1:0}`;
    document.body.appendChild(badge);
})();