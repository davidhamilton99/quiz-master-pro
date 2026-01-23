/* Quiz Parser */

export function parseQuizData(data) {
    const lines = data.split('\n');
    const questions = [];
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i].trim();
        
        if (line.match(/^\d+\./)) {
            const isOrdering = line.includes('[order]');
            const qText = line.replace(/^\d+\./, '').replace('[order]', '').trim();
            
            const q = {
                question: qText,
                type: isOrdering ? 'ordering' : 'choice',
                options: [],
                correct: [],
                code: null,
                explanation: null
            };
            
            i++;
            
            // Code block
            if (i < lines.length && lines[i].trim() === '[code]') {
                i++;
                const codeLines = [];
                while (i < lines.length && lines[i].trim() !== '[/code]') {
                    codeLines.push(lines[i]);
                    i++;
                }
                q.code = codeLines.join('\n');
                if (i < lines.length) i++;
            }
            
            // Options
            if (isOrdering) {
                while (i < lines.length && lines[i].match(/^\d+\)/)) {
                    const num = parseInt(lines[i].match(/^(\d+)\)/)[1]);
                    q.options.push(lines[i].replace(/^\d+\)/, '').trim());
                    q.correct.push(num - 1);
                    i++;
                }
            } else {
                while (i < lines.length && lines[i].match(/^[A-Z]\./i)) {
                    let opt = lines[i].substring(2).trim();
                    const isCorrect = opt.endsWith('*');
                    if (isCorrect) {
                        opt = opt.slice(0, -1).trim();
                        q.correct.push(q.options.length);
                    }
                    q.options.push(opt);
                    i++;
                }
            }
            
            // Explanation
            if (i < lines.length && lines[i].trim().match(/^\[explanation:/i)) {
                q.explanation = lines[i].trim().match(/^\[explanation:\s*(.+?)\]?$/i)?.[1] || '';
                i++;
            }
            
            questions.push(q);
        } else {
            i++;
        }
    }
    
    return questions;
}

export function questionsToText(questions) {
    return questions.map((q, i) => {
        let txt = `${i + 1}. ${q.type === 'ordering' ? '[order] ' : ''}${q.question}\n`;
        
        if (q.code) txt += `[code]\n${q.code}\n[/code]\n`;
        
        if (q.type === 'ordering') {
            q.options.forEach((opt, j) => {
                txt += `${q.correct[j] + 1}) ${opt}\n`;
            });
        } else {
            q.options.forEach((opt, j) => {
                txt += `${String.fromCharCode(65 + j)}. ${opt}${q.correct.includes(j) ? ' *' : ''}\n`;
            });
        }
        
        if (q.explanation) txt += `[explanation: ${q.explanation}]\n`;
        
        return txt;
    }).join('\n');
}
