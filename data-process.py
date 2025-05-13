import json, random, re
from fractions import Fraction
from bs4 import BeautifulSoup



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


mathCount = 0
englishCount = 0

def cleanUp(text: str) -> str:
    if isinstance(text, dict):
        if "answer" in text:
            if type(text["answer"]) == list and len(text["answer"]) == 1:
                text["answer"] = text["answer"][0]
    if isinstance(text, str):
        pass
    elif isinstance(text, dict):
        return {k: cleanUp(v) for k, v in text.items()}
    elif isinstance(text, list):
        return [cleanUp(i) for i in text]
    

    properCss = " color: black !important; overflow-wrap: break-word !important; display: inline !important; text-wrap-mode: wrap !important;"
    
    soup = BeautifulSoup(text, 'html.parser')
    color = "black"

    for tag in soup.find_all(['p', 'span']):
        if tag.has_attr('style'):
            tag['style'] += "; "+properCss
        else:
            tag['style'] = properCss
        for i in range(10):
            tag["style"] = tag["style"].replace(";;", ";")

    html = soup.prettify()
    html = html.replace("<mfenced>", '<mrow> <mo fence="true">(</mo>').replace("</mfenced>", '<mo fence="true">)</mo></mrow>')
    html = re.sub(r'([ABCDabcd]\):)\\n', r'\1', re.sub(r'([ABCDabcd]\):)\n', r'\1', html)) 
    return html


for id, question in data.items():
    flashcard = {}
    content = question["content"]
    
    if question["module"] == "math":
        mathCount += 1
    elif question["module"] == "english":
        englishCount += 1
        
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
                'paragraph': content.get('body', ''),  # Extract paragraph if needed
                'choices': choices,
                'answer': content['answer'].get('correct_choice', ''),
                'explanation': content['answer'].get('rationale', '')
            }
            output[question["module"]].append(cleanUp(flashcard))
    
    elif content.get('correct_answer') and (len(content.get('answerOptions')) > 0) and question["module"] == "math":
        # Multiple choice math question
        choices = [
            f"{key}): {content['answerOptions'][idx].get('content', '')}"
            for idx, key in enumerate("ABCDEFGHIJKLMNOPQRSTUVWXYZ"[:len(content['answerOptions'])])
        ]

        # Only include if there's a correct answer
        if content['correct_answer']:
            flashcard = {
                'question': content.get('prompt', content.get('stem', '')),
                'paragraph': content.get('body', ''),  # Extract paragraph if needed
                'choices': choices,
                'answer': content['correct_answer'],
                'explanation': content['rationale']
            }
            output[question["module"]].append(cleanUp(flashcard))
    elif content.get('correct_answer') and content.get("type", "") == "spr" and question["module"] == "math":
        # Input type math question, needs to be converted to multiple choice

        answer = content.get('correct_answer')[0]
        # print(answer)
        answerNum = float(Fraction(answer))
        precision = len(str(answerNum).split('.')[1])
        answerLetter = random.choice("ABCD")
        answerStr = f"{answerLetter}): {answerNum:.{precision}f}"
        
        
        choices = [
            # f"{key}): {content['answer']['choices'][key].get('body', '')}" 
            # for key in content['answer']['choices']
            f"{letter}): {(answerNum * random.uniform(0.8, 1.2)):.{precision}f}" if letter != answerLetter else answerStr for letter in "ABCD"
        ]

        
        
        flashcard = {
            'question': content.get('prompt', content.get('stem', '')),
            'paragraph': content.get('body', ''),  # Extract paragraph if needed
            'choices': choices,
            'answer': answerStr,
            'explanation': content.get('rationale', '')
        }
        output[question["module"]].append(cleanUp(flashcard))
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
                output["english"].append(cleanUp(flashcard))

print(f"Math questions: {len(output['math'])}/{mathCount}")
print(f"English questions: {len(output['english'])}/{englishCount}")



with open("questions.json", "w+") as f:
    json.dump(output, f, indent=4)
