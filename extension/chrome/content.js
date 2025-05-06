// FlashySurf content script
(async function() {
    'use strict';
    if (window.top !== window.self) {
        return;
    }
    let dataSet = {};
    let  randomWidget;

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
    
    try {
        dataSet = await fetchDataset();
        let questionList = dataSet[(Math.random() > 0.5 ? "math" : "english")];
        let flashcard = questionList[Math.floor(Math.random()*questionList.length)];
        
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
                                    <br>Actual Answer: ${flashcard.answer}
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
                    const closeButton = document.getElementById('closeButton-flashySurf'); // Tixed bug that broke system
                    closeTimer = isCorrect ? 5 : 20;
                    intervalId = setInterval(() => {
                        closeTimer -= 0.1;
                        if (closeTimer <= 0){
                            closeTimer = 0.0;
                            closeButton.disabled = false;
                            closeButton.onclick = () => {
                                widgetEl.remove();
                                clearInterval(forcePause);
                                forcePause = 1;
                                chrome.storage.local.set({ 'forceCard': false });
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

                
                chrome.storage.local.get(['correctSATAnswers', 'incorrectSATAnswers'], function(result) {
                    let correct = result.correctSATAnswers || 0;
                    let incorrect = result.incorrectSATAnswers || 0;
                    
                    if (isCorrect) {
                        chrome.storage.local.set({ "correctSATAnswers": correct + 1 });
                    } else {
                        chrome.storage.local.set({ "incorrectSATAnswers": incorrect + 1 });
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
                            submittedAnswer(e.target.textContent);
                        });
                        btn.attachedListeners = true;
                        clearInterval(btnInterval);
                    }
                });    
            }, 100);
            
        }
        
        // Start the widget
        chrome.storage.local.get(['forceCard', 'widgetChance'], function(result) {
            randomWidget = (Math.random() < result.widgetChance);
            if ((result.forceCard || randomWidget) && !window.location.hostname.toLowerCase().includes("desmos")) {
                setTimeout(() => {
                    createFlashcardWidget(flashcard);
                }, 1000);
            }
        });

        // Create stats badge
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
        });
    } catch (error) {
        console.error("FlashySurf error:", error);
    }

})();