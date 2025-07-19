<p align="center">
  <img src="https://github.com/MaxDevv/FlashySurf/blob/main/Logo.png?raw=true" alt="Logo">
</p>

# FlashySurf - Flash Cards for Passive SAT Learning

FlashySurf is a browser extension that helps you prepare for the SAT while you browse the web. Instead of dedicating specific study time, FlashySurf integrates SAT practice questions into your regular browsing experience, making preparation passive and consistent.

## 🎯 Purpose

Designed for students aiming for high SAT scores (1500+) without the need for intensive dedicated study sessions. FlashySurf turns your regular web browsing time into productive SAT preparation through spaced repetition and passive learning.

## ✨ Features

- **Passive Learning**: Random SAT questions appear while you browse the web
- **Math & English Coverage**: Questions from both SAT sections
- **Performance Tracking**: Tracks your accuracy with a small badge
- **Explanation Feedback**: Provides detailed explanations for each answer
- **Note-Taking**: Record your understanding of incorrect answers to reinforce learning
- **Non-intrusive**: Designed to integrate into your browsing without being disruptive
- **Customizable Frequency**: Control how often flashcards appear with the settings panel

## 📋 Requirements

- A modern web browser (Chrome, Firefox, Edge, etc.)

## 🚀 Installation

### Browser Extension (Recommended)

1. Visit the extension store for your browser:
   - [Chrome Web Store](https://chromewebstore.google.com/detail/ldajenfdgimgdajklkohhljdgdalcedb?utm_source=item-share-c)

2. Search for "FlashySurf" and click "Add to Browser"

### Manual Installation (Developer Mode)

1. Download the extension files from the [GitHub repository](https://github.com/MaxDevv/FlashySurf)
2. Unzip the files to a folder on your computer
3. In Chrome/Edge, go to `chrome://extensions/` or `edge://extensions/`
4. Enable "Developer mode" in the top-right corner
5. Click "Load unpacked" and select the extension folder

### Userscript Version (Alternative)

If you prefer using a userscript manager:

1. Install a userscript manager extension with storage support:
   - [Tampermonkey](https://www.tampermonkey.net/) (recommended)
   - [Violentmonkey](https://violentmonkey.github.io/)
   - [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) (Firefox)
   - [Stay iOS](https://apps.apple.com/us/app/stay-for-safari/id1591620171) (iOS)
2. Click on the following link to install the FlashySurf userscript:
   [Install FlashySurf Userscript](https://github.com/MaxDevv/flashysurf/raw/main/flashySurf-userscript.user.js)
3. Confirm the installation when prompted by your userscript manager

## 🔧 How It Works

FlashySurf randomly presents SAT practice questions while you browse the web. When a question appears:

1. Read the question and select your answer
2. Get immediate feedback on your choice
3. Review the explanation to understand the correct approach
4. For incorrect answers, take notes on your understanding to reinforce learning
5. The flashcard will automatically close after a short period (longer for incorrect answers to give you time to learn)

The extension tracks your performance over time, helping you identify areas for improvement.

## 🛠️ Configuration

Click on the FlashySurf icon in your browser toolbar to:
- Adjust the frequency of flashcard appearances
- View your performance statistics
- Review your saved notes from incorrect answers
- Access additional settings

## 🧠 Learning Approach

FlashySurf uses principles of spaced repetition and passive learning to help you absorb SAT content gradually over time. By integrating practice into your daily browsing, you'll build familiarity with SAT question patterns without dedicated study sessions.

# Changelog
## 1.7
### 1.7.0 (2025-07-19)
- Implemented intelligent question selection system with 60/40 split between new and preveiously failed questions
- Added failed questions tracking to help users focus on areas needing improvement
- Enhanced question avoidance algorithm to prevent repetition of recently answered questions
- Added automatic removal of questions from failed list when answered correctly
- Improved local storage initialization to include failed questions tracking
- Optimized flashcard selection logic with better randomization, cleaner code, and question filtering.
- Added comprehensive logging for question selection debugging
- Optimized question selection performance with promise-based asynchronous handling

## 1.6
### 1.6.0 (2025-05-23)
- Implemented break timer feature allowing users to pause flashcards for 30 minutes
- Added question ID tracking to prevent repetition of recently answered questions
- Added "30 Minute Break" button in the popup with a 4-hour cooldown timer
- Added countdown display showing time remaining on break
- Updated extension version to 1.6.0
- Improved local storage initialization for tracking answered questions and break times
- Removed unused images to reduce extension size
- Minor documentation updates

## 1.5
### 1.5.0 (2025-05-13)
- Implemented note-taking feature for incorrect answers
- Added container to display user notes in the popup
- Implemented display of user notes sorted by timestamp with delete functionality
- Added note-taking section to flashcard widget for incorrect answers
- Added word count validator to ensure minimum of 10 words in notes
- Added back button to return to explanation
- Added tips to question display
- Improved widget closing logic and added load buffer

## 1.4
### 1.4.1 (2025-05-08)
- Removed the `activeTab` permission from the Chrome extension manifest for improved security and privacy
- Updated the flashcard frequency slider to have a minimum value of 5
- Implemented function to get the correct answer choice instead of just the answer letter
- Fixed bug where the timer wasn't being cleared when a correct answer was submitted
- Fixed bug where the answer wasn't being displayed correctly
- Implemented a more robust system for attaching listeners to choice buttons
- Updated UserScript to account for new features

### 1.4.0 (2025-05-06)
- Improved answer checking, including handling of array style answers and single-element list answers
- Fixed bug where the `forceCard` local storage value was not being reset when the close button was enabled
- Reduced the interval for attaching listeners to choice buttons to 500ms
- Implemented data cleaning in `data-process.py` to remove unnecessary characters and standardize answer formats
- Removed the `properStyling` and `styleFlashCard` functions from `data-process.py`, replacing them with a single `cleanUp` function
- Fixed issues with parenthesis handling in questions

## 1.3
### 1.3.0 (2025-05-06)
- Enhanced flashcard widget with improved timer and button handling
- Implemented a closable timer that enables the close button after a delay (5 seconds for correct answers, 20 seconds for incorrect)
- Fixed bug where the height of choice buttons was not automatically adjusting to content
- Added a close button to the flashcard widget for manual closing after timer expiration
- Implemented case-insensitive answer checking
- Fixed bug where event listeners were being attached multiple times to choice buttons
- Adjusted styling of the close button
- Fixed bug that broke the system with the submit button

## 1.2
### 1.2.0 (2025-05-06)
- Improved flashcard styling and data processing
- Added CSS styling to ensure proper text wrapping, black text color, and prevent style conflicts with websites
- Implemented HTML parsing with BeautifulSoup in `data-process.py` for consistent appearance across websites
- Modified `data-process.py` to apply styling to question, paragraph, choices, answer, and explanation fields
- Fixed bug where the height of choice buttons was not automatically adjusting to content

## 1.1
### 1.1.0 (2025-05-01)
- Refactored from userscript to browser extension for improved user experience
- Updated installation instructions for browser stores and manual installation
- Added configuration section for adjusting flashcard frequency and viewing statistics
- Updated logo URL in README
- Reduced default flashcard probability in the userscript
- Added variable flashcard chances
- Expanded math question database from 393 to 994 questions

## 1.0
### 1.0.0 (2025-04-03)
- Initial release of FlashySurf
- Implemented basic flashcard functionality for SAT questions
- Added support for both math and English questions
- Created userscript version with Tampermonkey/Greasemonkey support
- Implemented basic statistics tracking
- Added explanation feedback for answers
- Fixed image mapping error
- Increased duration to read explanations
- Fixed text color error on certain websites
- Added forced run only in top frame to prevent duplicate flashcards


## 🤝 Contributing

Contributions are welcome! If you'd like to improve FlashySurf or add new features, please feel free to submit a pull request.

## 🙏 Acknowledgements

Special thanks to [mdn522](https://github.com/mdn522) for providing the SAT question bank used in this project. The questions were sourced from the [sat-question-bank](https://github.com/mdn522/sat-question-bank/) repository.

## 📝 License

MIT License

Copyright (c) 2025 MaxDevv

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

_Made with ❤️ by MaxDevv_
