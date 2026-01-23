/* ============================================
   QUIZ MASTER PRO - Quiz Parser
   Parse text format to quiz questions
   ============================================ */

export function parseQuizData(data) {
    const lines = data.split('\n');
    const questions = [];
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i].trim();
        
        // Look for question start (number followed by period)
        if (line.match(/^\d+\./)) {
            const isOrdering = line.includes('[order]');
            const isMatching = line.includes('[matching]');
            const questionText = line
                .replace(/^\d+\./, '')
                .replace('[order]', '')
                .replace('[matching]', '')
                .trim();
            
            const question = {
                question: questionText,
                type: isOrdering ? 'ordering' : isMatching ? 'matching' : 'choice',
                options: [],
                correct: [],
                image: null,
                explanation: null,
                code: null
            };
            
            if (isMatching) {
                question.matchPairs = [];
                question.matchTargets = [];
            }
            
            i++;
            
            // Parse code block
            if (i < lines.length && lines[i].trim() === '[code]') {
                i++;
                const codeLines = [];
                while (i < lines.length && lines[i].trim() !== '[/code]') {
                    codeLines.push(lines[i]);
                    i++;
                }
                if (codeLines.length > 0) {
                    question.code = codeLines.join('\n');
                }
                if (i < lines.length && lines[i].trim() === '[/code]') {
                    i++;
                }
            }
            
            // Parse image
            const imageMatch = i < lines.length && lines[i].trim().match(/^\[image:\s*(.+?)\]/i);
            if (imageMatch) {
                question.image = imageMatch[1];
                i++;
            }
            
            // Parse options based on type
            if (isMatching) {
                // Matching format: A. Term -> Definition
                while (i < lines.length && lines[i].match(/^[A-Z]\./)) {
                    const matchLine = lines[i].substring(2).trim();
                    const arrowIndex = matchLine.indexOf('->');
                    
                    if (arrowIndex !== -1) {
                        const term = matchLine.substring(0, arrowIndex).trim();
                        const definition = matchLine.substring(arrowIndex + 2).trim();
                        const pairId = `pair_${question.matchPairs.length}`;
                        const targetId = `target_${question.matchTargets.length}`;
                        
                        question.matchPairs.push({ id: pairId, text: term, correctMatch: targetId });
                        question.matchTargets.push({ id: targetId, text: definition });
                    }
                    i++;
                }
            } else if (isOrdering) {
                // Ordering format: 1) First item, 2) Second item, etc.
                while (i < lines.length && lines[i].match(/^\d+\)/)) {
                    const num = parseInt(lines[i].match(/^(\d+)\)/)[1]);
                    const text = lines[i].replace(/^\d+\)/, '').trim();
                    question.options.push(text);
                    question.correct.push(num - 1);
                    i++;
                }
            } else {
                // Multiple choice format: A. Option text *
                while (i < lines.length && lines[i].match(/^[A-Z]\./)) {
                    let optionText = lines[i].substring(2).trim();
                    const isCorrect = optionText.endsWith('*');
                    
                    if (isCorrect) {
                        optionText = optionText.slice(0, -1).trim();
                        question.correct.push(question.options.length);
                    }
                    
                    question.options.push(optionText);
                    i++;
                }
            }
            
            // Parse explanation
            const explanationMatch = i < lines.length && lines[i].trim().match(/^\[explanation:\s*(.+?)\]/i);
            if (explanationMatch) {
                question.explanation = explanationMatch[1];
                i++;
            }
            
            questions.push(question);
        } else {
            i++;
        }
    }
    
    return questions;
}

// Convert questions back to text format
export function questionsToText(questions) {
    return questions.map((q, i) => {
        let text = `${i + 1}. `;
        
        if (q.type === 'ordering') text += '[order] ';
        if (q.type === 'matching') text += '[matching] ';
        
        text += q.question + '\n';
        
        if (q.code) {
            text += `[code]\n${q.code}\n[/code]\n`;
        }
        
        if (q.image) {
            text += `[image: ${q.image}]\n`;
        }
        
        if (q.type === 'matching' && q.matchPairs) {
            q.matchPairs.forEach((pair, j) => {
                const target = q.matchTargets.find(t => t.id === pair.correctMatch);
                text += `${String.fromCharCode(65 + j)}. ${pair.text} -> ${target?.text || ''}\n`;
            });
        } else if (q.type === 'ordering') {
            q.options.forEach((opt, j) => {
                text += `${q.correct[j] + 1}) ${opt}\n`;
            });
        } else {
            q.options.forEach((opt, j) => {
                const isCorrect = q.correct.includes(j);
                text += `${String.fromCharCode(65 + j)}. ${opt}${isCorrect ? ' *' : ''}\n`;
            });
        }
        
        if (q.explanation) {
            text += `[explanation: ${q.explanation}]\n`;
        }
        
        return text;
    }).join('\n');
}

export default { parseQuizData, questionsToText };
