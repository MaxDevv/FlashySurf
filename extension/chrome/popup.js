function getTimeDifference(date1, date2) {
    const diffInMilliseconds = Math.abs(date2 - date1);
    const totalSeconds = Math.floor(diffInMilliseconds / 1000);
    const hours = formatToTwoDigits(Math.floor(totalSeconds / 3600));
    const minutes = formatToTwoDigits(Math.floor((totalSeconds % 3600) / 60));
    const seconds = formatToTwoDigits(totalSeconds % 60);
    return { hours, minutes, seconds };
}






function formatToTwoDigits(number) {
    return number.toLocaleString('en-US', {
        minimumIntegerDigits: 2,
        useGrouping: false,
    });
}


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

function renderStats() {
    chrome.storage.local.get(['correctSATAnswers', 'incorrectSATAnswers', 'userFlashCards', 'satCardsEnabled', 'refferalCount', 'refferalPoints', 'userThemes'], function (result) {
        let correct = 0;
        let incorrect = 0;
        if (result.satCardsEnabled) {
            correct += result.correctSATAnswers || 0;
            incorrect += result.incorrectSATAnswers || 0;
        }

        for (let collection of result.userFlashCards) {
            if (collection.active) {
                console.log(collection.name);
                correct += collection.correctlyAnswered.length;
                incorrect += collection.incorrectlyAnswered.length;
            }
        }
        const total = correct + incorrect;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;


        statsDisplay.innerHTML = `
        <p>- Correct answers: ${correct}</p>
        <p>- Incorrect answers: ${incorrect}</p>
        <p>- Total questions: ${total}</p>
        <p>- Accuracy: ${accuracy}%</p>
    `;
    });
}

document.addEventListener('DOMContentLoaded', async function () {
    const widgetChanceSlider = document.getElementById('widgetChance');
    const widgetChanceValue = document.getElementById('widgetChanceValue');
    const statsDisplay = document.getElementById('statsDisplay');
    const notesContainer = document.getElementById('notesContainer');
    const notesTab = document.getElementById('notesTab');
    const statsTab = document.getElementById('statsTab');
    const feedbackLink = document.getElementById("feedback");
    const helpLink = document.getElementById('helpLink');
    const generatePerformanceReportButton = document.getElementById("generate-performance-report");
    const breakBtn = document.getElementById('break-button');
    const reportTooltip = document.getElementById('report-tooltip');
    const ignoreUrls = document.getElementById('ignoreUrls');
    const cantAffordBreaks = document.getElementById('cant-afford-breaks');
    const currentPointsDisplay = document.getElementById('current-points-display');
    const totalReffered = document.getElementById('totalReffered');
    const totalRefferalPoints = document.getElementById('totalRefferalPoints');
    // const extraBonus = document.getElementById('extraBonus');
    const referFriendLink = document.getElementById('referFriendLink');
    const themesFieldset = document.getElementById('themesFieldset');
    const themes = {
        "light": {
            "title": "Light Theme (Default)",
            "css": `
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
                }`,
            "cost": 0
        },

        "dark": {
            "title": "Dark Mode Theme",
            "css": `
                :host {
                    all: initial;
                    --bg-color: #1a1a1a;
                    --text-color: #e0e0e0;
                    --border-color: #404040;
                    --shadow-color: rgba(0,0,0,0.5);
                    --overlay-bg: #2a2a2a;
                    --choice-bg: color-mix(in srgb, #3a3a3a 30%, #2a2a2a 70%);
                    --close-button-bg: #007bff;
                    --close-button-text: #ffffff;
                    --back-button-bg: #6c757d;
                    --back-button-text: #ffffff;
                    --next-button-bg: #28a745;
                    --next-button-text: #ffffff;
                    --disabled-button-bg: #3a3a3a;
                    --correct-text: #4ade80;
                    --incorrect-text: #ff4444;
                    --notes-border: #404040;
                    --notes-bg: #252525;
                    --notes-text: #e0e0e0;
                    --word-count-text: #999999;
                }`,
            "cost": 5
        },
        "gold": {
            "title": "Gold Theme",
            "css": `
                :host {
                    all: initial;
                    --bg-color: #ffd700;
                    --text-color: #000000;
                    --border-color: #b8860b;
                    --shadow-color: rgba(255, 215, 0, 0.3);
                    --overlay-bg: #2a2a2a;
                    --choice-bg: color-mix(in srgb, #d4af37 25%, #f5f5dc 75%);
                    --close-button-bg: #007bff;
                    --close-button-text: #000000;
                    --back-button-bg: #b8860b;
                    --back-button-text: #ffffff;
                    --next-button-bg: #ffd700;
                    --next-button-text: #ffffff;
                    --disabled-button-bg: #d4af37;
                    --correct-text: #ffd700;
                    --incorrect-text: #ff4444;
                    --notes-border: #b8860b;
                    --notes-bg: #fffacd;
                    --notes-text: #333333;
                }`,
            "cost": 200
        },
        "galaxy": {
            "title": "Galaxy Theme",
            "css": `
            :host {
                /* Cool/Ice Galaxy Palette */
                --bg-color: #050510; /* Darker, colder background */
                --text-color: #f0f8ff; /* Alice Blue text (cool white) */
                --border-color: #3e5c76;
                --shadow-color: rgba(135, 206, 235, 0.15); /* Subtler, cool blue shadow */
                --overlay-bg: #0f172acc;
                --choice-bg: color-mix(in srgb, #1e293b 40%, #050510 60%);
                --close-button-bg: #38bdf8cc; /* Light Blue */
                --close-button-text: #000000;
                --back-button-bg: #475569;
                --back-button-text: #ffffff;
                --next-button-bg: #0ea5e9;
                --next-button-text: #ffffff;
                --disabled-button-bg: #1e293b;
                --correct-text: #6ee7b7; /* Cool Mint Green */
                --incorrect-text: #fca5a5;
                --notes-border: #334155;
                --notes-bg: #0f172a;
                --notes-text: #cbd5e1;
                --word-count-text: #94a3b8;
            }

            /* Container */
            .background {
                position: relative;
                width: 100%;
                height: 100vh;
                overflow: hidden;
                /* Colder Deep Space Gradient */
                background: linear-gradient(160deg, #020205 0%, #0a0e17 40%, #111827 100%);
            }

            /* LAYER 1: Distant Stars (Sharp, tiny, pure white, slow) */
            .background::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 1px;
                height: 1px;
                border-radius: 50%;
                background: transparent;
                pointer-events: none;
                z-index: 1;
                opacity: 0.9; /* Increased brightness */
                /* 
                Box Shadow Syntax: X Y Blur Spread Color 
                Blur is 0px for sharp, crisp distant stars
                */
                box-shadow: 
                    10vw 10vh 0px 0px #fff, 
                    25vw 05vh 0px 0px #fff, 
                    40vw 30vh 0px 0px #fff,
                    05vw 45vh 0px 0px #fff,
                    60vw 15vh 0px 0px #fff,
                    80vw 05vh 0px 0px #fff,
                    90vw 35vh 0px 0px #fff,
                    15vw 60vh 0px 0px #fff,
                    35vw 75vh 0px 0px #fff,
                    55vw 55vh 0px 0px #fff,
                    75vw 85vh 0px 0px #fff,
                    95vw 65vh 0px 0px #fff,
                    110vw 20vh 0px 0px #fff,
                    130vw 50vh 0px 0px #fff,
                    150vw 10vh 0px 0px #fff,
                    10vw 90vh 0px 0px #fff,
                    45vw 95vh 0px 0px #fff,
                    85vw 95vh 0px 0px #fff,
                    20vw 20vh 0px 0px #fff,
                    65vw 30vh 0px 0px #fff,
                    120vw 80vh 0px 0px #fff,
                    140vw 30vh 0px 0px #fff,
                    160vw 60vh 0px 0px #fff;
                animation: galaxy-drift 100s linear infinite;
            }

            /* LAYER 2: Close Stars (Brighter, Cooler Tint, distinct points) */
            .background::after {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 2px;
                height: 2px;
                border-radius: 50%;
                background: transparent; 
                pointer-events: none;
                z-index: 2;
                opacity: 1; /* Max brightness */
                /* 
                Updated Shadow:
                1. Blur reduced to 1px (Sharper/Less subtle glow)
                2. Spread increased to 1px (Makes the star core bigger/brighter)
                3. Color changed to #e0fbfc (Cool Cyan White)
                */
                box-shadow: 
                    15vw 15vh 1px 1px #e0fbfc, 
                    30vw 40vh 1px 1px #e0fbfc, 
                    50vw 10vh 1px 1px #e0fbfc, 
                    70vw 60vh 1px 1px #e0fbfc, 
                    90vw 20vh 1px 1px #e0fbfc, 
                    20vw 80vh 1px 1px #e0fbfc, 
                    40vw 60vh 1px 1px #e0fbfc, 
                    60vw 90vh 1px 1px #e0fbfc, 
                    80vw 40vh 1px 1px #e0fbfc, 
                    105vw 10vh 1px 1px #e0fbfc,
                    125vw 50vh 1px 1px #e0fbfc,
                    145vw 80vh 1px 1px #e0fbfc,
                    05vw 35vh 1px 1px #e0fbfc,
                    55vw 25vh 1px 1px #e0fbfc,
                    95vw 85vh 1px 1px #e0fbfc;
                animation: galaxy-drift 60s linear infinite;
            }

            /* Stable Directional Motion */
            @keyframes galaxy-drift {
                0% {
                    transform: translate(0, 0);
                }
                100% {
                    transform: translate(-50vw, -50vh);
                }
            }`,
            "cost": 275
        },
        "cherry-blossom": {
            "title": "Cherry Blossom Theme",
            "css": `
            :host {
                --bg-color: #fff5f7;
                --text-color: #2d1b1f;
                --border-color: #ffb7c5;
                --shadow-color: rgba(255,183,197,0.4);
                --overlay-bg: #ffe0ebc7;
                --choice-bg: color-mix(in srgb, #ffe0e8 30%, #fff5f7 70%);
                --close-button-bg: #007bffcb;
                --close-button-text: #ffffff;
                --back-button-bg: #6c757d;
                --back-button-text: #ffffff;
                --next-button-bg: #28a745;
                --next-button-text: #ffffff;
                --disabled-button-bg: #f0d4da;
                --correct-text: #72ca49ff;
                --incorrect-text: #920725ff;
                --notes-border: #ffccd5;
                --notes-bg: #fffafc;
                --notes-text: #2d1b1f;
                --word-count-text: #a67b88;
                }
                /* Container for both layers */
            .background {
                position: relative;
                width: 100%;
                height: 100vh;
                overflow: hidden;
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            }

            /* LAYER 1: Swaying, Rotating Fall Animation */
            .background::before {
                content: "";
                position: absolute;
                top: -10vh;
                left: -10vw;
                width: 20px; 
                height: 15px;
                border-radius: 100% 0 100% 0;
                background: linear-gradient(135deg, #fff0f5 0%, #ffc0cb 100%);
                pointer-events: none;
                z-index: 2;
                opacity: 0.9;
                box-shadow: 
                    10vw 15vh 2px 0px #ffd1dc, 
                    30vw 05vh 5px 1px #ffb7c5, 
                    50vw 10vh 2px 0px #fff0f5,
                    20vw 35vh 2px 0px #ffc0cb,
                    45vw 40vh 4px 1px #ffd1dc,
                    80vw 20vh 2px 0px #ffb7c5,
                    10vw 60vh 3px 0px #fff,
                    35vw 70vh 5px 1px #ffc0cb,
                    60vw 55vh 2px 0px #ffd1dc,
                    85vw 50vh 2px 0px #fff0f5,
                    110vw 30vh 4px 1px #ffb7c5,
                    130vw 60vh 2px 0px #ffd1dc,
                    75vw 80vh 3px 0px #ffc0cb,
                    95vw 90vh 5px 1px #fff,
                    120vw 85vh 2px 0px #ffb7c5,
                    140vw 40vh 2px 0px #ffd1dc,
                    160vw 10vh 4px 1px #ffc0cb;
                animation: blossom-fall 12s linear infinite;
            }

            /* LAYER 2: Diagonal Flow with Bobbing Motion */
            .background::after {
                content: "";
                position: absolute;
                top: -20vh;
                left: 0;
                width: 30px; 
                height: 18px;
                background: #ffdce5; 
                border-radius: 20px 2px 20px 2px;
                pointer-events: none;
                z-index: 1;
                opacity: 1;
                box-shadow: 
                    10vw 10vh 15px #ffffff, 10vw 10vh 5px #ffb7c5, 10vw 10vh #ffdce5, 
                    40vw 25vh 15px #ffffff, 40vw 25vh 5px #ffb7c5, 40vw 25vh #ffebf0, 
                    70vw 15vh 15px #ffffff, 70vw 15vh 5px #ffb7c5, 70vw 15vh #ffdce5, 
                    100vw 40vh 15px #ffffff, 100vw 40vh 5px #ffb7c5, 100vw 40vh #ffebf0, 
                    130vw 20vh 15px #ffffff, 130vw 20vh 5px #ffb7c5, 130vw 20vh #ffdce5, 
                    160vw 50vh 15px #ffffff, 160vw 50vh 5px #ffb7c5, 160vw 50vh #ffebf0, 
                    25vw 20vh 15px #ffffff, 25vw 20vh 5px #ffb7c5, 25vw 20vh #ffdce5, 
                    55vw 50vh 15px #ffffff, 55vw 50vh 5px #ffb7c5, 55vw 50vh #ffebf0, 
                    85vw 35vh 15px #ffffff, 85vw 35vh 5px #ffb7c5, 85vw 35vh #ffdce5, 
                    115vw 10vh 15px #ffffff, 115vw 10vh 5px #ffb7c5, 115vw 10vh #ffebf0, 
                    145vw 60vh 15px #ffffff, 145vw 60vh 5px #ffb7c5, 145vw 60vh #ffdce5, 
                    35vw 40vh 15px #ffffff, 35vw 40vh 5px #ffb7c5, 35vw 40vh #ffebf0, 
                    65vw 15vh 15px #ffffff, 65vw 15vh 5px #ffb7c5, 65vw 15vh #ffdce5, 
                    95vw 60vh 15px #ffffff, 95vw 60vh 5px #ffb7c5, 95vw 60vh #ffebf0, 
                    125vw 30vh 15px #ffffff, 125vw 30vh 5px #ffb7c5, 125vw 30vh #ffdce5, 
                    5vw 60vh 15px #ffffff, 5vw 60vh 5px #ffb7c5, 5vw 60vh #ffdce5, 
                    170vw 95vh 15px #ffffff, 170vw 95vh 5px #ffb7c5, 170vw 95vh #ffebf0, 
                    210vw 100vh 15px #ffffff, 210vw 100vh 5px #ffb7c5, 210vw 100vh #ffdce5, 
                    260vw 30vh 15px #ffffff, 260vw 30vh 5px #ffb7c5, 260vw 30vh #ffebf0;
                animation: blossom-flow-bob 15s linear infinite, bob 3s ease-in-out infinite;
            }

            /* Animation 1: Swaying, rotating fall */
            @keyframes blossom-fall {
                0% {
                    transform: translate(0, 0) rotate(0deg);
                }
                25% {
                    transform: translate(30vw, 25vh) rotate(45deg);
                }
                50% {
                    transform: translate(60vw, 50vh) rotate(90deg);
                }
                75% {
                    transform: translate(90vw, 75vh) rotate(135deg);
                }
                100% {
                    transform: translate(120vw, 110vh) rotate(180deg);
                }
            }

            /* Animation 2: Diagonal flow WITH smooth bobbing up and down */
            @keyframes blossom-flow-bob {
                0% {
                    transform: translate(100vw, 0);
                }
                100% {
                    transform: translate(-150vw, 110vh);
                }
            }

            /* Simple up and down bob animation */
            @keyframes bob {
                0%, 100% {
                    translate: 0 0;
                }
                50% {
                    translate: 0 -10vh;
                }
            }`,
            "cost": 375
        }

    };
    // Load current settings
    // Update stats display
    // To-do: update functionality of vereyphing in this get request below this to like account for all of ts custom flashcards

    chrome.storage.local.get(['widgetChance', 'lastBreak', "satNotes", "userFlashCards", "points", "lastBreak", "uID", "userThemes"], function (result) {
        // Set widget chance slider
        const widgetChance = result.widgetChance || 0.1;
        widgetChanceSlider.value = widgetChance * 100;
        widgetChanceValue.textContent = `${Math.round(widgetChance * 100)}%`;
        // Update Break Button
        if (Number(Date.now()) <= (result.lastBreak + 30 * 60 * 1000)) {
            breakBtn.disabled = true;
            setInterval(() => {
                let timeDiff = getTimeDifference(Number(Date.now()), result.lastBreak + 30 * 60 * 1000);
                let timeText = ` (Active For ${timeDiff.hours + ":" + timeDiff.minutes + ":" + timeDiff.seconds})`;
                breakBtn.innerText = "On Break" + timeText;
            }, 100);
        }
        cantAffordBreaks.hidden = true;
        if (result.points < 20) {
            breakBtn.disabled = true;
            if (Number(Date.now()) >= (result.lastBreak + 30 * 60 * 1000)) {
                cantAffordBreaks.hidden = false;
            }
        }
        // Render Stats
        renderStats();

        // show points
        currentPointsDisplay.textContent = result.points || 0;

        // Load referral stats
        totalReffered.textContent = result.refferalCount || 0;
        totalRefferalPoints.textContent = result.refferalPoints || 0;


        // Set refer a friend link
        referFriendLink.href = "https://flashysurf.com/refer-a-friend?userID=" + result.uID;


        // Load notes
        let notes = result.satNotes || {};
        result.userFlashCards.forEach((e) => {
            notes = { ...notes, ...e.notes };
        })
        if (Object.keys(notes).length > 0) {
            let notesHTML = '<details open><summary class="heading">Your Notes</summary>';


            // Sort notes by timestamp (newest first)
            const sortedNotes = Object.entries(notes)
                .sort((a, b) => b[1].timestamp - a[1].timestamp)
                .slice(0, 10); // Show only the 10 most recent notes


            sortedNotes.forEach(([id, note]) => {
                const date = new Date(note.timestamp).toLocaleDateString();
                notesHTML += `
                        <div class="note-item">
                            <div class="question">
                                <details>
                                    <summary><strong>Question</strong></summary>
                                    ${note.question}
                                </details>
                            </div>
                            <div class="note-content">
                                <div><strong>Your Answer:</strong> ${note.userAnswer}</div>
                                <div><strong>Correct Answer:</strong> ${note.answer}</div>
                                <details open>
                                    <summary><strong>Your Note</strong></summary>
                                    - ${note.notes}
                                </details>
                            </div>

                            <strong>${date}</strong> - <button class="delete-note" data-id="${id}">Delete Note</button>
                        </div>
                `;
            });


            notesContainer.innerHTML = notesHTML + "</details>";


            // Add event listeners for delete buttons
            document.querySelectorAll('.delete-note').forEach(button => {
                button.addEventListener('click', function () {
                    if (confirm("Are you sure you want to delete this note? This action is IRREVERSIBLE.")) {
                        const noteId = this.getAttribute('data-id');
                        chrome.storage.local.get(['satNotes'], function (result) {
                            const notes = result.satNotes || {};
                            delete notes[noteId];
                            chrome.storage.local.set({ 'satNotes': notes }, function () {
                                // Refresh the notes display
                                button.closest('.note-item').remove();
                            });
                        });
                    }
                });
            });
        } else {


            notesContainer.innerHTML = `
                <h3>Your Notes</h3>
                <sub>- No notes written yet, answer a few questions first. You'll write your first note when you fail a question. Remember, you can only grow if you're willing to fail :D</sub>`;
        }

        // Load themes
        /* base off this
        
                    <div>
                        <label><input type="radio" name="theme" value="default" checked> Default Theme (Plain White)
                            <button type="button">Preview</button> <button type="button">Get: 5 ⬢</button></label>
                    </div>
        */

        let justBought = [];
        for (const [key, theme] of Object.entries(themes)) {
            let radioWrapper = document.createElement('div');
            let radioInput = document.createElement('input');
            let radioLabel = document.createElement('label');
            let previewButton = document.createElement('button');
            let getButton = document.createElement('button');
            radioInput.type = 'radio';
            radioInput.name = 'theme';
            radioInput.value = key;
            if (result.userThemes.currentThemeCSS.replace(/\s/g, '') === theme.css.replace(/\s/g, '')) {
                radioInput.checked = true;
            }

            if (result.userThemes.ownedThemes.includes(key) || theme.cost === 0) {
                getButton.textContent = "Owned";
                getButton.disabled = true;
            } else {
                radioInput.disabled = true;
                radioInput.title = "You don't own this theme yet!";
                getButton.textContent = `Get: ${theme.cost} ⬢`;

            }
            previewButton.type = 'button';
            previewButton.textContent = 'Preview';
            radioLabel.appendChild(radioInput);
            radioLabel.appendChild(document.createTextNode(` ${theme.title} `));
            radioLabel.appendChild(previewButton);
            radioLabel.appendChild(document.createTextNode(' '));
            radioLabel.appendChild(getButton);
            radioWrapper.appendChild(radioLabel);
            themesFieldset.appendChild(radioWrapper);
            // Preview button listener
            previewButton.addEventListener('click', () => {
                // trigger content script to preview theme
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "previewTheme",
                        data: theme.css
                    }, (response) => {
                        if (response === undefined) {

                            chrome.storage.local.set({ pendingPreviewCss: theme.css }, () => {
                                chrome.tabs.create({ url: "https://flashysurf.com", active: true });
                            });
                        }
                    });
                });
            });

            // Get button listener
            getButton.addEventListener('click', () => {
                chrome.storage.local.get(['userThemes', 'points'], (resultSquared) => {
                    if (resultSquared.points >= theme.cost) {
                        // Deduct points and add theme to owned themes
                        getButton.textContent = "Owned";
                        getButton.disabled = true;
                        radioInput.disabled = false;
                        justBought.push(key); // fix bug where you have to reopen popup to select theme after buying

                        chrome.storage.local.set({ userThemes: { ...resultSquared.userThemes, ownedThemes: [...result.userThemes.ownedThemes, ...justBought] } });
                        console.log("Theme purchased:", key);
                        console.log("Updated owned themes:", [...result.userThemes.ownedThemes, ...justBought], justBought);
                        currentPointsDisplay.textContent = resultSquared.points - theme.cost;
                        chrome.storage.local.set({ points: resultSquared.points - theme.cost });
                    } else {
                        alert("You don't have enough points to get this theme! Click 'what are points?' to learn how to earn more points.");
                    }
                });
            });
            // Radio button listener
            radioInput.addEventListener('change', () => {
                if ([...result.userThemes.ownedThemes, ...justBought].includes(key) || theme.cost === 0) {
                    chrome.storage.local.get(['userThemes'], (resultSquared) => {
                        chrome.storage.local.set({ userThemes: { ...resultSquared.userThemes, currentTheme: key, currentThemeCSS: theme.css } });
                    });
                }
            });

        }

    });
    // Update display when slider changes
    widgetChanceSlider.addEventListener('input', function () {
        const value = widgetChanceSlider.value / 100;
        widgetChanceValue.textContent = `${Math.round(value * 100)}%`;
    });


    // Save settings
    widgetChanceSlider.addEventListener('change', function () {
        const widgetChance = widgetChanceSlider.value / 100;
        chrome.storage.local.set({ widgetChance: widgetChance });
    });


    // Break Button
    breakBtn.addEventListener('click', () => {
        chrome.storage.local.set({ lastBreak: Number(Date.now()) });
        chrome.storage.local.get(['points'], (result) => {
            if (result.points >= 20) {
                chrome.storage.local.set({ lastBreak: Number(Date.now()), points: result.points - 20 });
                currentPointsDisplay.textContent = result.points - 20;
            }
        });

        breakBtn.disabled = true;
        let startDate = Date.now();
        setInterval(() => {
            let timeDiff = getTimeDifference(Number(Date.now()), Number(startDate) + 30 * 60 * 1000);
            let timeText = ` (Active For ${timeDiff.hours + ":" + timeDiff.minutes + ":" + timeDiff.seconds})`;
            breakBtn.innerText = "On Break" + timeText;
            console.log("Updating break timer", "On Break" + timeText);
        }, 100);
    })

    helpLink.addEventListener('click', () => {
        chrome.tabs.create({ url: "https://flashysurf.com/onboarding", active: true });
    })


    feedbackLink.addEventListener('click', () => {
        chrome.tabs.create({ url: "https://tally.so/r/mDjY2Z", active: true });
    })

    referFriendLink.addEventListener('click', () => {
        chrome.tabs.create({ url: referFriendLink.href, active: true });
    })

    let report = await generatePerformanceReport();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (report != false) {
        reportTooltip.remove();
        generatePerformanceReportButton.addEventListener('click', () => {

            // Send message to content script
            chrome.tabs.sendMessage(tab.id, {
                action: "showPerformanceReport",
                data: report
            }, (response) => {
                // console.log("DOM modified:", response);
                window.close();
            });
        });
        chrome.storage.local.get(["performanceReport"], (res) => {
            if (res.performanceReport.timestamp > (Date.now() - 12 * 60 * 60 * 1000)) {
                generatePerformanceReportButton.innerText = "Show Performance Report (updates in " + Math.round((12 * 60 * 60 * 1000 - (Date.now() - res.performanceReport.timestamp)) / (60 * 60 * 1000)) + "h)";
            }
        })
        generatePerformanceReportButton.disabled = false;
    } else {
        generatePerformanceReportButton.disabled = true;
    }



    // Custom Flashcard Code

    let baseCollectionSchema = {
        name: "",
        active: false,
        correctlyAnswered: [],
        incorrectlyAnswered: [],
        notes: [],
        questions: [],
        id: "UUID"
    }
    // Collection selection system
    // Iterate through useer made collections and attach html elments with added listeners for all 3 buttons
    function toggleCollection(e) {
        chrome.storage.local.get("userFlashCards", (res) => {
            res.userFlashCards.forEach((collection) => {
                if (collection.id == e.id) {
                    collection.active = !collection.active;
                }
            })
            chrome.storage.local.set({ userFlashCards: res.userFlashCards }).then(renderStats);
        })
    }

    function downloadCollection(e) {
        chrome.storage.local.get("userFlashCards", (res) => {
            res.userFlashCards.forEach((collection) => {
                if (collection.id == e.id) {
                    // Ive decided to start citing my stackoverflow stuff so uhh: https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser 
                    function downloadObjectAsJson(exportObj, exportName) {
                        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
                        var downloadAnchorNode = document.createElement('a');
                        downloadAnchorNode.setAttribute("href", dataStr);
                        downloadAnchorNode.setAttribute("download", exportName + ".json");
                        document.body.appendChild(downloadAnchorNode); // required for firefox
                        downloadAnchorNode.click();
                        downloadAnchorNode.remove();
                    }

                    downloadObjectAsJson({ questions: collection.questions, id: collection.id, name: collection.name }, "flashsurf-collection- (" + collection.name + ") - (" + collection.id + ").flashysurfcollection");
                }
            })

        })
    }

    function deleteCollection(e) {
        if (confirm("Are you SURE you want to delete this collection, this action is IRREVERSIBLE. If you plan on editing it or using it later you should download it before deleting.")) {
            chrome.storage.local.get("userFlashCards", async (res) => {
                let deletionIndex = -1;
                res.userFlashCards.forEach((collection) => {
                    if (collection.id == e.id) {
                        deletionIndex = res.userFlashCards.indexOf(collection);
                    }
                })
                if (deletionIndex != -1) {
                    console.log(res.userFlashCards.splice(deletionIndex, 1));
                }

                await chrome.storage.local.set({ userFlashCards: res.userFlashCards });
                renderStats();
                e.remove();
            });
        }
    }


    // Attach card buttons and eventlisters
    chrome.storage.local.get("userFlashCards", (res) => {
        res.userFlashCards.forEach((collection) => {
            let downloadButton, deleteButton;
            let collectionElement = document.createElement('div');
            collectionElement.classList.add("collection");
            collectionElement.title = `Correct: ${collection.correctlyAnswered.length} | Incorrect: ${collection.incorrectlyAnswered.length} | Accuracy: ${Math.round(collection.correctlyAnswered.length * 100 / (collection.incorrectlyAnswered.length + collection.correctlyAnswered.length)) ? Math.round(collection.correctlyAnswered.length * 100 / (collection.incorrectlyAnswered.length + collection.correctlyAnswered.length)) : 0}%`  // Yes my code is that unreadable, sue me
            collectionElement.textContent = collection.name;
            collectionElement.id = collection.id;
            let checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            collectionElement.appendChild(checkbox);
            checkbox.checked = collection.active;
            if (checkbox.checked) {
                collectionElement.classList.add("selected");
            }

            if (collection.id != "sat") {
                downloadButton = document.createElement('button');
                downloadButton.classList.add("download");
                downloadButton.innerHTML = "&#10515;";
                collectionElement.appendChild(downloadButton);

                deleteButton = document.createElement('button');
                deleteButton.classList.add("delete");
                deleteButton.innerHTML = "&#9473;";
                collectionElement.appendChild(deleteButton);
            }

            // document.getElementById('flashCardTitle').after(collectionElement);
            document.getElementById('collections').appendChild(collectionElement);

            // Todo: Add event listners, disable download and delete button and make toggle button custom for sat cards
            if (collection.id != "sat") {
                checkbox.addEventListener('change', () => {
                    collectionElement.classList.toggle("selected");
                    toggleCollection(collectionElement);
                });

                downloadButton.addEventListener('click', () => {
                    downloadCollection(collectionElement);
                });

                deleteButton.addEventListener('click', () => {
                    deleteCollection(collectionElement);
                })
            } else {
                checkbox.addEventListener('change', () => {
                    collectionElement.classList.toggle("selected");
                    toggleCollection(collectionElement);
                    chrome.storage.local.set({ satCardsEnabled: checkbox.checked });
                    Array.from(document.getElementsByClassName("hide-if-sat-disabled")).forEach((e) => {
                        e.hidden = !checkbox.checked;
                    })
                });
            }

        })
    });


    document.getElementById("addCollection").addEventListener('click', () => {

        // Send message to content script
        chrome.tabs.sendMessage(tab.id, {
            action: "addCollection",
            data: undefined
        }, (response) => {
            if (response === undefined) {

                chrome.tabs.create({ url: "https://flashysurf.com/creator", active: true });
                chrome.storage.local.set({ "forceAddCollection": true });
            } else {
                window.close();
            }
        });


    });

    chrome.storage.local.get("satCardsEnabled", (res) => {
        Array.from(document.getElementsByClassName("hide-if-sat-disabled")).forEach((e) => {
            if (!res.satCardsEnabled) {
                e.hidden = true;
            }
        })
    })


    ignoreUrls.addEventListener('input', () => {
        function getHostname(input) {
            try {
                // If the input doesn't have a scheme, prepend "http://"
                let url = input.match(/^https?:\/\//) ? input : `http://${input}`;

                // Use the built-in URL class to parse
                let parsed = new URL(url);
                return parsed.hostname;
            } catch (e) {
                console.error("Invalid URL:", input);
                return null;
            }
        }
        ignoreUrlList = [];

        for (const line of ignoreUrls.value.split(/\r?\n/)) {
            if (getHostname(line)) {
                ignoreUrlList.push(getHostname(line));
            }
        }

        chrome.storage.local.set({ 'ignoreUrls': ignoreUrlList });
    });

    chrome.storage.local.get(['ignoreUrls'], function (result) {
        if (result.ignoreUrls.length > 0) {
            ignoreUrls.value = result.ignoreUrls.join("\n");
        }

    });
    // Add flashcard collection button
    // Shows html popup widget of upload collection button, and it should be split up into like 2 sections, one with a big plus that is like click to upload collection, and another that is like text that explains flashccard collections, how to edit them (download, delete, reupload), how to create them and how to import them, ill make a webpage on my website whre users can create and upload and import collections on the website
    var textAreas = document.getElementsByTagName('textarea');

    Array.prototype.forEach.call(textAreas, function (elem) {
        elem.placeholder = elem.placeholder.replace(/\\n/g, '\n');
    });

});

