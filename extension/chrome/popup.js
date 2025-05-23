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



document.addEventListener('DOMContentLoaded', function() {
    const widgetChanceSlider = document.getElementById('widgetChance');
    const widgetChanceValue = document.getElementById('widgetChanceValue');
    const statsDisplay = document.getElementById('statsDisplay');
    const notesContainer = document.getElementById('notesContainer');
    const notesTab = document.getElementById('notesTab');
    const statsTab = document.getElementById('statsTab');
    const breakBtn = document.getElementById('break-button');
  
    // Load current settings
    chrome.storage.local.get(['widgetChance', 'correctSATAnswers', 'incorrectSATAnswers', 'satNotes', 'lastBreak'], function(result) {
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
        <p>Correct answers: ${correct}</p>
        <p>Incorrect answers: ${incorrect}</p>
        <p>Total questions: ${total}</p>
        <p>Accuracy: ${accuracy}%</p>
      `;
      
      // Load notes
      const notes = result.satNotes || {};
      if (Object.keys(notes).length > 0) {
        let notesHTML = '<h3>Your Notes</h3>';
        
        // Sort notes by timestamp (newest first)
        const sortedNotes = Object.entries(notes)
          .sort((a, b) => b[1].timestamp - a[1].timestamp)
          .slice(0, 10); // Show only the 10 most recent notes
          
        sortedNotes.forEach(([id, note]) => {
          const date = new Date(note.timestamp).toLocaleDateString();
          notesHTML += `
            <div class="note-item">
              <div class="note-header">
                <strong>${date}</strong> - ${note.question.substring(0, 50)}...
              </div>
              <div class="note-content">
                <p><strong>Your Answer:</strong> ${note.userAnswer}</p>
                <p><strong>Correct Answer:</strong> ${note.answer}</p>
                <p><strong>Your Notes:</strong> ${note.notes}</p>
              </div>
              <button class="delete-note" data-id="${id}">Delete</button>
            </div>
          `;
        });
        
        notesContainer.innerHTML = notesHTML;
        
        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-note').forEach(button => {
          button.addEventListener('click', function() {
            const noteId = this.getAttribute('data-id');
            chrome.storage.local.get(['satNotes'], function(result) {
              const notes = result.satNotes || {};
              delete notes[noteId];
              chrome.storage.local.set({ 'satNotes': notes }, function() {
                // Refresh the notes display
                button.closest('.note-item').remove();
              });
            });
          });
        });
      }
    });
  
    // Update display when slider changes
    widgetChanceSlider.addEventListener('input', function() {
      const value = widgetChanceSlider.value / 100;
      widgetChanceValue.textContent = `${Math.round(value * 100)}%`;
    });
  
    // Save settings
    widgetChanceSlider.addEventListener('change', function() {
      const widgetChance = widgetChanceSlider.value / 100;
      chrome.storage.local.set({ widgetChance: widgetChance });
    });

    // Break Button
    breakBtn.addEventListener('click', () => {
        chrome.storage.local.set({ lastBreak: Number(Date.now())});
        breakBtn.disabled = true;
    })
  });
  