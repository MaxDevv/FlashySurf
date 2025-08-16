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
    let incorrectSATAnswers  = result.incorrectSATAnswers;
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

    let clusterAccuracies = clusters.map((val) => {return {id: val.id, accuracy: ((val.answeredQuestions + val.failedQuestions) > 0 ? ((val.answeredQuestions)/(val.answeredQuestions + val.failedQuestions)) : (correctSATAnswers/(incorrectSATAnswers + correctSATAnswers + 0.1))) }}).sort((b, a) => b.accuracy - a.accuracy);
    let strugglePoints = []

    clusterAccuracies.forEach((e) => {
        if ((e.accuracy > 0) && (e.accuracy <  (correctSATAnswers/(incorrectSATAnswers + correctSATAnswers + 0.1))) && strugglePoints.length < 3) {
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

document.addEventListener('DOMContentLoaded', async function () {
    const widgetChanceSlider = document.getElementById('widgetChance');
    const widgetChanceValue = document.getElementById('widgetChanceValue');
    const statsDisplay = document.getElementById('statsDisplay');
    const notesContainer = document.getElementById('notesContainer');
    const notesTab = document.getElementById('notesTab');
    const statsTab = document.getElementById('statsTab');
    const helpLink = document.getElementById('helpLink');
    const generatePerformanceReportButton = document.getElementById("generate-performance-report");
    const breakBtn = document.getElementById('break-button');
    const reportTooltip = document.getElementById('report-tooltip');

    // Load current settings
    chrome.storage.local.get(['widgetChance', 'correctSATAnswers', 'incorrectSATAnswers', 'satNotes', 'lastBreak'], function (result) {
        // Set widget chance slider
        const widgetChance = result.widgetChance || 0.1;
        widgetChanceSlider.value = widgetChance * 100;
        widgetChanceValue.textContent = `${Math.round(widgetChance * 100)}%`;
        // Update Break Button
        if (Number(Date.now()) <= (result.lastBreak + 4 * 60 * 60 * 1000)) {
            breakBtn.disabled = true;
            let origText = breakBtn.innerText;
            setInterval(() => {
                if (Number(Date.now()) > (result.lastBreak + 30 * 60 * 1000)) {
                    let timeDiff = getTimeDifference(Number(Date.now()), result.lastBreak + 4 * 60 * 60 * 1000);
                    let timeText = ` (Available In ${timeDiff.hours + ":" + timeDiff.minutes + ":" + timeDiff.seconds})`;
                    breakBtn.innerText = origText + timeText;
                } else {
                    let timeDiff = getTimeDifference(Number(Date.now()), result.lastBreak + 30 * 60 * 1000);
                    let timeText = ` (Active For ${timeDiff.hours + ":" + timeDiff.minutes + ":" + timeDiff.seconds})`;
                    breakBtn.innerText = origText + timeText;
                }
            }, 100);
        }
        // Update stats display
        const correct = result.correctSATAnswers || 0;
        const incorrect = result.incorrectSATAnswers || 0;
        const total = correct + incorrect;
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;


        statsDisplay.innerHTML = `
        <p>- Correct answers: ${correct}</p>
        <p>- Incorrect answers: ${incorrect}</p>
        <p>- Total questions: ${total}</p>
        <p>- Accuracy: ${accuracy}%</p>
    `;


        // Load notes
        const notes = result.satNotes || {};
        if (Object.keys(notes).length > 0) {
            let notesHTML = '<details><summary class="heading">Your Notes</summary>';


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
        breakBtn.disabled = true;
    })

    helpLink.addEventListener('click', () => {
        chrome.tabs.create({ url: "https://flashysurf.com/onboarding", active: true });
    })


    let report = await generatePerformanceReport();
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
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
                generatePerformanceReportButton.innerText = "Show Performance Report (updates in " + Math.round((12 * 60 * 60 * 1000 - (Date.now() - res.performanceReport.timestamp))/(60 * 60 * 1000)) + "h)";
            }
        })
        generatePerformanceReportButton.disabled = false;
    } else {
        generatePerformanceReportButton.disabled = true;
    }

});
