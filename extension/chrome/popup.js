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

function renderStats() {
    chrome.storage.local.get(['correctSATAnswers', 'incorrectSATAnswers', 'userFlashCards', 'satCardsEnabled'], function (result) {
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

    // Load current settings
    // Update stats display
    // To-do: update functionality of vereyphing in this get request below this to like account for all of ts custom flashcards
    
    chrome.storage.local.get(['widgetChance', 'lastBreak', "satNotes", "userFlashCards"], function (result) {
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
        
        // Render Stats
        renderStats();

        // Load notes
        let notes = result.satNotes || {};
        result.userFlashCards.forEach((e) => {
            notes = {...notes, ...e.notes};
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


    feedbackLink.addEventListener('click', () => {
        chrome.tabs.create({ url: "https://tally.so/r/mDjY2Z", active: true });
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
            chrome.storage.local.set({ userFlashCards: res.userFlashCards}).then(renderStats);
        })
    }

    function downloadCollection(e) {
        chrome.storage.local.get("userFlashCards", (res) => {
            res.userFlashCards.forEach((collection) => {
                if (collection.id == e.id) {
                    // Ive decided to start citing my stackoverflow stuff so uhh: https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser 
                    function downloadObjectAsJson(exportObj, exportName){
                        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
                        var downloadAnchorNode = document.createElement('a');
                        downloadAnchorNode.setAttribute("href",     dataStr);
                        downloadAnchorNode.setAttribute("download", exportName + ".json");
                        document.body.appendChild(downloadAnchorNode); // required for firefox
                        downloadAnchorNode.click();
                        downloadAnchorNode.remove();
                    }

                    downloadObjectAsJson({questions: collection.questions, id: collection.id, name: collection.name}, "flashsurf-collection- ("+collection.name+") - ("+collection.id+").flashysurfcollection");
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
            
                await chrome.storage.local.set({ userFlashCards: res.userFlashCards});
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
            collectionElement.title = `Correct: ${collection.correctlyAnswered.length} | Incorrect: ${collection.incorrectlyAnswered.length} | Accuracy: ${Math.round(collection.correctlyAnswered.length * 100 /(collection.incorrectlyAnswered.length + collection.correctlyAnswered.length)) ? Math.round(collection.correctlyAnswered.length * 100 /(collection.incorrectlyAnswered.length + collection.correctlyAnswered.length)) : 0}%`  // Yes my code is that unreadable, sue me
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

            document.getElementById('satFlashCards').after(collectionElement);
 
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
                    chrome.storage.local.set({satCardsEnabled: checkbox.checked});
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
                // console.log("DOM modified:", response);
            window.close();
            });

    });
    
    chrome.storage.local.get("satCardsEnabled", (res) => {
        Array.from(document.getElementsByClassName("hide-if-sat-disabled")).forEach((e) => {
            if (!res.satCardsEnabled) {
                e.hidden = true;
            }
        })
    })
    // Add flashcard collection button
        // Shows html popup widget of upload collection button, and it should be split up into like 2 sections, one with a big plus that is like click to upload collection, and another that is like text that explains flashccard collections, how to edit them (download, delete, reupload), how to create them and how to import them, ill make a webpage on my website whre users can create and upload and import collections on the website


    /* Old prompt:    

    now I'm working on custom flashcard collections, write the js in popup.js for selecting flashcards with the checkbox, also for downloading flashcards (it should only download the questions array as json), deleting collections (you hsould add a confirmation popup that says the flashcards and user data will be permanetly deleted),  also i left the sat flascards as a temp for how i want the ui to look, however when the sat flashcards are toggled unlike other flashcards they should be able to be downloaded or deleted and when theyre toggled it should only affect the satCardsEnabled variable, also when someone switches selected flashcards, it should alter which stats are shown, like thier stats should only show the combined stats and notes of the currently selected flashcard collections, and make sure it is known that the generate performance reportts button only works for SAT flashcards, and also if sat flashcards are deselected the the whole performance reports section should be hidden

flashcard collection schema: 

"    {

        active: false,

        correctlyAnswered: [],

        incorrectlyAnswered: [],

        notes: [],

        questions: [],

        id: "UUID"

    }"

the whole point of this is for us to work towards releasing v2.0 where users are allowed to upload thier own custom flashcard collections */

    
});

