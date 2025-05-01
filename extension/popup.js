document.addEventListener('DOMContentLoaded', function() {
    const widgetChanceSlider = document.getElementById('widgetChance');
    const widgetChanceValue = document.getElementById('widgetChanceValue');
    const saveButton = document.getElementById('saveSettings');
    const statsDisplay = document.getElementById('statsDisplay');
  
    // Load current settings
    chrome.storage.local.get(['widgetChance', 'correctSATAnswers', 'incorrectSATAnswers'], function(result) {
      // Set widget chance slider
      const widgetChance = result.widgetChance || 0.1;
      widgetChanceSlider.value = widgetChance * 100;
      widgetChanceValue.textContent = `${Math.round(widgetChance * 100)}%`;
      
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
    });
  
    // Update display when slider changes
    widgetChanceSlider.addEventListener('input', function() {
      const value = widgetChanceSlider.value / 100;
      widgetChanceValue.textContent = `${Math.round(value * 100)}%`;
    });
  
    // Save settings
    saveButton.addEventListener('click', function() {
      const widgetChance = widgetChanceSlider.value / 100;
      chrome.storage.local.set({ widgetChance: widgetChance }, function() {
        // Show saved confirmation
        saveButton.textContent = 'Saved!';
        setTimeout(() => {
          saveButton.textContent = 'Save Settings';
        }, 500);
      });
    });
  });
  