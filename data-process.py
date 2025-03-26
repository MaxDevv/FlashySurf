# import json

# output = {
#     "math": [],
#     "english": []
# }
# # Output structure
# """
#     let flashcard = {
#         question: question.question,
#         paragraph: question.paragraph,
#         choices: Object.keys(question.choices).map(key => (`${key}): ${question.choices[key]}`)),
#         answer: question.correct_answer,
#         explanation: question.explanation
#     };
# """

# with open("cb-digital-questions.json", "r") as f:
#     data = json.load(f)


# for id, question in data.items():
#     flashcard = {}
#     content = question["content"]
#     if content.get("type", "") == "spr":
#         continue
#     if content.get('answer') and content.get('answer').get('choices') and question["module"] == "math":
#         # Multiple choice question
#         choices = [
#             f"{key}): {content['answer']['choices'][key].get('body', '')}" 
#             for key in content['answer']['choices']
#         ]
        
#         flashcard = {
#             'question': content.get('prompt', content.get('stem', '')),
#             'paragraph': '',  # Extract paragraph if needed
#             'choices': choices,
#             'answer': content['answer'].get('correct_choice', ''),
#             'explanation': content['answer'].get('rationale', '')
#         }
#         output[question["module"]].append(flashcard)
#     else:
#         continue
    
# print(len(output["english"]))
# # with open("questions.json", "w+") as f:
# #     json.dump(output, f)



# I succumb to AI ;-;
import json

output = {
    "math": [],
    "english": []
}
# Output structure
"""
    let flashcard = {
        question: question.question,
        paragraph: question.paragraph,
        choices: Object.keys(question.choices).map(key => (`${key}): ${question.choices[key]}`)),
        answer: question.correct_answer,
        explanation: question.explanation
    };
"""

with open("cb-digital-questions.json", "r") as f:
    data = json.load(f)

for id, question in data.items():
    flashcard = {}
    content = question["content"]
    
    # Skip student-produced response questions
    if content.get("type", "") == "spr":
        continue
        
    if content.get('answer') and content.get('answer').get('choices') and question["module"] == "math":
        # Multiple choice math question
        choices = [
            f"{key}): {content['answer']['choices'][key].get('body', '')}" 
            for key in content['answer']['choices']
        ]
        
        # Only include if there's a correct answer
        if content['answer'].get('correct_choice'):
            flashcard = {
                'question': content.get('prompt', content.get('stem', '')),
                'paragraph': '',  # Extract paragraph if needed
                'choices': choices,
                'answer': content['answer'].get('correct_choice', ''),
                'explanation': content['answer'].get('rationale', '')
            }
            output[question["module"]].append(flashcard)
    else:
        # Process English questions
        if (question.get("module") == "english" and 
            content.get("type") == "mcq" and 
            content.get("answerOptions") and 
            content.get("correct_answer")):
            
            # Only process if there are multiple choices and a correct answer
            if len(content.get("answerOptions", [])) > 0 and len(content.get("correct_answer", [])) > 0:
                # Extract stimulus as paragraph if available
                paragraph = content.get("stimulus", "")
                
                # Format choices
                choices = []
                for i, option in enumerate(content.get("answerOptions", [])):
                    # Use index to create letter (0->A, 1->B, etc.)
                    letter = chr(65 + i)  # ASCII: A=65, B=66, etc.
                    choices.append(f"{letter}): {option.get('content', '')}")
                
                # Get correct answer
                answer = content.get("correct_answer", [""])[0]
                
                flashcard = {
                    'question': content.get('stem', ''),
                    'paragraph': paragraph,
                    'choices': choices,
                    'answer': answer,
                    'explanation': content.get('rationale', '')
                }
                output["english"].append(flashcard)

print(f"Math questions: {len(output['math'])}")
print(f"English questions: {len(output['english'])}")

with open("questions.json", "w+") as f:
    json.dump(output, f, indent=4)
