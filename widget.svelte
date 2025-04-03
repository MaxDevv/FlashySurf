 <script>
    import { state } from 'svelte/motion';

    let flashcard = {
          question: "How tall am I?",
          choices: ["1", "5","12", "16"],
          images: [],
          answer: "16",
          explanation: "Because i was said so, also Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
      };
      let closeTimer = state(30);
      let selectedChoice = state(false);
      let isCorrect = state(false);
      function submittedAnswer(answer) {
          // console.log(answer);
          $selectedChoice = answer;
          if (answer[0] == [flashcard.answer[0]]) {
              $isCorrect = true;
          } else {
              $closeTimer += 30
          }
          setInterval(() => {
              $closeTimer -= 0.1;
              if ($closeTimer < 0) {
                  document.getElementById("FlashySurfWidget").remove();	
              }
          }, 100);
      }
</script>
{#if $closeTimer > 0}

<div class="cover-container">
      <div class="background"></div>
      <div class="widget">
              <div class="title">FlashySurf - Flashcard</div>
              {#if $selectedChoice}
                  <span class="limited">
                      <span style="color: {$isCorrect ? "green": "red"};">{$isCorrect ? "Correct" : "Incorrect"}</span>
                      <br>
                      Chosen Answer: {$selectedChoice}
                      <br>
                      Actual Answer: {flashcard.answer}
                      <br>
                      Explanation: {flashcard.explanation}
                  </span>
              Closing in {$closeTimer.toFixed(1)} seconds
              {:else}
                  <div class="question limited">
                      <span>
                              Question: {flashcard.question}
                      </span> <br>
                      <span>
                              Paragraph: {flashcard.question}
                      </span>
                      {#each flashcard.images as image}
                          <img src={image} alt="">
                      {/each}
                      <!-- <span>What is it, that makes me great?</span> -->
              </div>
              <div class="answer">
                      <div class="choices">
                          {#each flashcard.choices as choice}
                              <button class="choice" on:click={() => {submittedAnswer(choice)}}>{choice}</button>
                          {/each}
                      </div>
                      <div class="textInput"></div>
              </div>
              {/if}
      </div>
</div>
{/if}


<style>
          .background {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  background-color: gray;
                  opacity: 30%;
                  z-index: 99999999999999;

                          

          }
					.cover-container {
						color: black;
					}
          .widget {
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%); 
                  width: max(40vw, 35vh);
                  /* height: max(60vh); */
                  border-radius: 1.5em;
                  padding: 1.4em;
                  background-color: white;
                  border-width: 0.25em;
                  border-color: black;
                  display: flex;
                  flex-direction: column;
                  font-family:monospace;
                  font-weight: 400;
                  gap: 1.5em;
                  -webkit-box-shadow: 0px 0px 60px 3px rgba(0,0,0,0.2);
                  -moz-box-shadow: 0px 0px 60px 3px rgba(0,0,0,0.2);
                  box-shadow: 0px 0px 60px 3px rgba(0,0,0,0.2);
                  /* opacity: 30%; */
                  z-index: 99999999999999;

                          color: black;


                  


          }

          .title {
            font-weight: bold;
            font-size: large;
    }
              .limited {
                      max-height: 10em;
                      overflow-y: scroll;
              }

          .choices {
                  display: flex;
                  flex-direction: column;
                  gap: 0.2em;
          }

          .choice {
                  appearance: none;
                  -webkit-appearance: none;
                  padding: 2px;
                  padding-left: 4px;
                  border-radius: 6px;
                  text-align: left;
									color: black;
                  background-color: color-mix(in srgb, silver 30%, white 70%);

          }
  </style>
