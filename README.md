<p align="center">
  <img src="https://github.com/MaxDevv/FlashySurf/blob/main/Images/new-marquee.png?raw=true" alt="Marquee">
</p>

# FlashySurf - Study without ever Studying

FlashySurf is a browser extension that helps you study any subject while you browse the web. With v2.0, FlashySurf expands beyond SAT preparation to support custom flashcard collections, allowing you to study anything through passive learning integrated into your regular browsing experience.

## 🎯 Purpose

Designed for learners who want to study without dedicated study sessions. FlashySurf turns your regular web browsing time into productive learning through spaced repetition and passive learning. With v2.0, the extension now supports custom flashcard collections, enabling you to study any subject matter while maintaining the core passive learning experience.

## ✨ Features

- **Passive Learning**: Random questions appear while you browse the web
- **Custom Flashcard Collections**: Create, import, and manage your own flashcard collections for any subject
- **Intelligent Question Selection**: Advanced algorithm that adapts to your performance patterns
- **Semantic Clustering**: Questions are grouped by topic similarity to target your weak areas
- **Performance Tracking**: Tracks your accuracy with a small badge
- **Explanation Feedback**: Provides detailed explanations for each answer
- **Note-Taking**: Record your understanding of incorrect answers to reinforce learning
- **Adaptive Learning**: System learns from your mistakes and focuses on challenging areas
- **Non-intrusive**: Designed to integrate into your browsing without being disruptive
- **Customizable Frequency**: Control how often flashcards appear with the settings panel
- **Performance Reports**: Generate personalized reports identifying your weakest topic areas

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

### ~~Userscript Version (Alternative)~~
*Note: The userscript version has been discontinued due to maintenance difficulties*

<details>
<summary>Userscript Installation (Deprecated)</summary>

If you prefer using a userscript manager:
1. Install a userscript manager extension with storage support:
   - [Tampermonkey](https://www.tampermonkey.net/) (recommended)
   - [Violentmonkey](https://violentmonkey.github.io/)
   - [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) (Firefox)
   - [Stay iOS](https://apps.apple.com/us/app/stay-for-safari/id1591620171) (iOS)
2. Click on the following link to install the FlashySurf userscript:
   [Install FlashySurf Userscript](https://github.com/MaxDevv/flashysurf/raw/main/flashySurf-userscript.user.js)
3. Confirm the installation when prompted by your userscript manager

</details>

## 🔧 How It Works

FlashySurf uses an intelligent question selection system to present questions while you browse the web. With v2.0, the system now supports both SAT questions and custom flashcard collections. The system employs three different strategies:

### Question Selection Algorithm
- **50% New Questions**: Fresh questions you haven't seen before, avoiding recently answered ones
- **35% Targeted Practice**: Questions semantically similar to ones you've struggled with, using clustering analysis to identify your weak topic areas
- **15% Review Questions**: Direct review of questions you previously answered incorrectly

### Learning Process
When a question appears:

1. Read the question and select your answer
2. Get immediate feedback on your choice
3. Review the explanation to understand the correct approach
4. For incorrect answers, take notes on your understanding to reinforce learning
5. The flashcard will then give you the option close after a short period (requires note taking for incorrect answers to force you to learn)

The extension tracks your performance over time and uses semantic clustering to identify topic areas where you need more practice, automatically adjusting future question selection to target your weaknesses. With v2.0, you can now create and manage multiple flashcard collections, enabling you to study any subject matter.

## 🛠️ Configuration

Click on the FlashySurf icon in your browser toolbar to:
- Adjust the frequency of flashcard appearances
- View your performance statistics across all active collections
- Review your saved notes from incorrect answers
- Manage your flashcard collections (create, import, edit, delete)
- Enable/disable specific flashcard collections
- Access additional settings

With v2.0, the configuration panel has been enhanced to support custom flashcard collections, allowing you to manage multiple collections and track your progress across different subjects.

## 🧠 Learning Approach (SAT Specific)

FlashySurf uses principles of spaced repetition, adaptive learning, and passive engagement to help you absorb SAT content gradually over time. Key features include:

- **Semantic Clustering**: Questions are grouped into 87 topic clusters using advanced similarity analysis
- **Adaptive Targeting**: The system identifies your least accurate topic areas and increases exposure to similar questions
- **Performance-Based Selection**: Question difficulty and topic selection adapt based on your historical performance
- **Balanced Coverage**: Ensures you see both math and English questions in proper proportion

By integrating practice into your daily browsing, you'll build familiarity with SAT question patterns without dedicated study sessions while receiving personalized attention to your areas of weakness.

# Changelog
## 2.0

### 2.0.5
   - Minor UI bugfixes:
      - Fixed flashcard collections layout display
      - Increased popup width to 400px for better spacing
      - Improved update vs install event handling

### 2.0.4
   - Lil Feature addition ;D
      - Added custom website exclusion feature allowing users to specify websites where flashcards won't appear

### 2.0.3
   - Minor bugfixes & Changes:
      - Add share request popup to encourage users to share the extension.
      - Fix bug in flashcard selection logic that reduced flashcards appearances by 35% below expected due to semantic similarity branch not working in SAT mode.
      - Adjust probability thresholds: 45% regular, 35% semantically similar, 15% failed, 5% special.

### 2.0.2
   - Minor bugfixes & Changes:
      - On some sites like chrome managed sites or the new tab site, the add collection button wouldnt work and that confused users, so I made it popup with the flashysurf website and open the add collection there on the chance that did happen
      - Made Max Height of flashcards much larger, should improve user experience
### 2.0.1
   - Minor & Major bugfixes:
      - Fixed ui bug that pushed fflashcard collections into ttitle itself for some reason.
      - Fixed bug that crashes script if no collections are enabled

### 2.0
   - FINALLY DONE! (Kinda).
   - Okay, lemme explain: FlashySurf V1 has been fully focused on the SAT, focused on only studying the sat, but after seeing the 60-100 point increases from multiple friends, reviews and even myself, I decided that flashysurf should grow beyond just the SAT, and that is V2.0
   - Sorry Writing all the Changes I made Would take forever lol, I fed an AI my git diff and my to-do list that I completed with all my notes and it spat out this list of changes. Also am I the only one who noticed that AI glazes anything, using fancy words like robust and comprehensive.

   - **Core Architecture**
      - Transformed from SAT-specific tool to general-purpose study platform
      - Updated extension name, version, and description to reflect broader capabilities
      - Implemented data structures for tracking user progress across multiple collections

   - **Custom Flashcard System**
      - Added complete flashcard collection management:
         - Create, import, and edit custom flashcard collections
         - Drag-and-drop interface for easy collection uploads
         - Download functionality to backup or share collections
         - Delete collections with confirmation to prevent accidental loss
         - Implemented collection selection system allowing users to enable/disable specific collections
         - Added unique collection IDs and metadata storage (name, questions, notes, stats)

   - **Statistics and Analytics**
      - Enhanced stats display to aggregate data across all active collections
      - Added individual collection statistics visible through hover tooltips
      - Implemented comprehensive tracking of correct/incorrect answers per collection
      - Maintained SAT-specific performance reports while adding general statistics

   **User Interface**
      - Redesigned popup interface with modern, intuitive collection management
      - Added visual indicators for active collections with selection states
      - Implemented responsive design for various screen sizes
      - Added feedback link for user suggestions and bug reporting
      - Enhanced help system with improved onboarding guidance

   **Technical Changes**
   - Disabled semantic similarity support for non-SAT mode learning until I figure out A way to work it.
   - Implemented recursive collection selection with safety limits (Very Jank Code lol)
   - Added confirmation dialogs for destructive operations
   - Improved code organization with modular functions

   This release represents a significant evolution from a SAT-focused tool to a comprehensive study platform, enabling users to create and manage custom flashcard collections for any subject while maintaining the core passive learning experience.
   
## 1.9
### 1.9.1
   - Just some minor bugfixes and additions
   - Bugfix fixed bug that allowed textbox keypresses to propogate into website hotkeys causing nuisance and possibly deeper errors to users
   - Feature Addition: Added popup that showed off new generate reports feature.
   
### 1.9.0 (2025-08-06)
   **New Feature: Personalized Performance Reports**: Generate a detailed visual report of your SAT performance.
   - Get insights into your top 3 weakest topic areas based on accuracy.
   - The report is generated as a shareable image, perfect for discussing with tutors or study groups.
   - Reports are cached for 12 hours to provide consistent feedback while minimizing API calls.

   **Enhanced Weakness-Targeting Algorithm**:
   - The system now analyzes your saved notes on incorrect answers to get a more accurate picture of your weaknesses.
   - Improved cluster accuracy calculations for more precise targeting of difficult topics.
   - Tuned question selection probabilities to 35% for semantically similar questions and 15% for direct reviews, optimizing the balance between new and review content.

   **Major UI & UX Overhaul**:
   - **Robust Flashcard Styling**: The flashcard widget now uses a Shadow DOM, preventing CSS conflicts with websites for a consistent and clean appearance everywhere.
   - **Redesigned Settings Popup**: The extension popup has been reorganized with a cleaner layout, collapsible sections for notes, and improved readability for a more user-friendly experience.
   - Added a confirmation dialog before deleting notes to prevent accidental data loss.

   **Critical Bug Fix**:
   - Fixed a persistent bug where questions that were previously failed but later answered correctly would continue to appear as "review" questions.

   **Code Refinement**: Removed redundant functions and optimized internal logic for better performance and maintainability.

## 1.8
### 1.8.0 (2025-07-26)
- **Major Algorithm Enhancement**: Completely redesigned question selection system with advanced semantic clustering
- **Semantic Question Clustering**: Implemented 87-cluster system to group questions by topic similarity using cosine similarity analysis
- **Intelligent Weakness Targeting**: Added 30% probability for questions semantically similar to previously failed ones
- **Enhanced Performance Analytics**: System now tracks cluster-level accuracy to identify specific topic weaknesses
- **Improved Question Variety**: New 50%/30%/20% split (new questions/similar to failed/direct review of failed)
- **Advanced Debugging**: Added comprehensive logging system for bugfixing
- **Optimized Performance**: Enhanced Question filtering algorithms.
- **Break button fix**: 30-min break button no longer needs user reloads to activate.

## 1.7
### 1.7.0 (2025-07-19)
- Implemented intelligent question selection system with 60/40 split between new and previously failed questions
- Added failed questions tracking to help users focus on areas needing improvement
- Enhanced question avoidance algorithm to prevent repetition of recently answered questions
- Added automatic removal of questions from failed list when answered correctly
- Improved local storage initialization to include failed questions tracking
- Optimized flashcard selection logic with better randomization, cleaner code, and question filtering
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

Copyright © 2025 Maximus Adeola. All rights reserved.

---

_Made with ❤️ by MaxDevv_
