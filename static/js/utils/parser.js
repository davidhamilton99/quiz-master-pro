/* Quiz Parser */
export function parseQuizData(data) {
    const lines = data.split('\n'), questions = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (line.match(/^\d+\./)) {
            const isOrder = line.includes('[order]');
            const isMatch = line.includes('[match]');
            const isTF = line.includes('[tf]') || line.includes('[truefalse]');
            
            let type = 'choice';
            if (isOrder) type = 'ordering';
            else if (isMatch) type = 'matching';
            else if (isTF) type = 'truefalse';
            
            const q = { 
                question: line.replace(/^\d+\./, '').replace(/\[(order|match|tf|truefalse)\]/gi, '').trim(), 
                type, 
                options: [], 
                correct: [], 
                pairs: [], // for matching
                code: null, 
                explanation: null 
            };
            i++;
            
            // Code block
            if (i < lines.length && lines[i].trim() === '[code]') {
                i++; const code = [];
                while (i < lines.length && lines[i].trim() !== '[/code]') { code.push(lines[i]); i++; }
                q.code = code.join('\n'); if (i < lines.length) i++;
            }
            
            // Parse based on type
            if (type === 'ordering') {
                while (i < lines.length && lines[i].match(/^\d+\)/)) {
                    const num = parseInt(lines[i].match(/^(\d+)\)/)[1]);
                    q.options.push(lines[i].replace(/^\d+\)/, '').trim());
                    q.correct.push(num - 1); i++;
                }
            } else if (type === 'matching') {
                // Format: A. Term => Definition
                while (i < lines.length && lines[i].match(/^[A-Z]\./i)) {
                    const content = lines[i].substring(2).trim();
                    const parts = content.split(/\s*=>\s*|\s*->\s*|\s*:\s*/);
                    if (parts.length >= 2) {
                        q.pairs.push({ left: parts[0].trim(), right: parts[1].trim() });
                    }
                    i++;
                }
                // Store shuffled right side as options, correct order as answer
                q.options = q.pairs.map(p => p.right);
                q.correct = q.pairs.map((_, idx) => idx); // correct order is 0,1,2,3...
            } else if (type === 'truefalse') {
                // Look for True/False answer marker
                q.options = ['True', 'False'];
                while (i < lines.length && lines[i].trim()) {
                    const ans = lines[i].trim().toLowerCase();
                    if (ans === 'true' || ans === 't' || ans === 'true *' || ans === 't *') {
                        q.correct = [0]; i++; break;
                    } else if (ans === 'false' || ans === 'f' || ans === 'false *' || ans === 'f *') {
                        q.correct = [1]; i++; break;
                    } else if (ans.startsWith('[')) {
                        break; // explanation or next question
                    }
                    i++;
                }
                if (q.correct.length === 0) q.correct = [0]; // default to true if not specified
            } else {
                // Multiple choice
                while (i < lines.length && lines[i].match(/^[A-Z]\./i)) {
                    let opt = lines[i].substring(2).trim();
                    if (opt.endsWith('*')) { opt = opt.slice(0, -1).trim(); q.correct.push(q.options.length); }
                    q.options.push(opt); i++;
                }
            }
            
            // Explanation
            if (i < lines.length && lines[i].trim().match(/^\[explanation:/i)) {
                q.explanation = lines[i].trim().match(/^\[explanation:\s*(.+?)\]?$/i)?.[1] || ''; i++;
            }
            questions.push(q);
        } else { i++; }
    }
    return questions;
}

export function questionsToText(questions) {
    return questions.map((q, i) => {
        let tag = '';
        if (q.type === 'ordering') tag = '[order] ';
        else if (q.type === 'matching') tag = '[match] ';
        else if (q.type === 'truefalse') tag = '[tf] ';
        
        let t = `${i + 1}. ${tag}${q.question}\n`;
        if (q.code) t += `[code]\n${q.code}\n[/code]\n`;
        
        if (q.type === 'ordering') {
            q.options.forEach((opt, j) => { t += `${q.correct[j] + 1}) ${opt}\n`; });
        } else if (q.type === 'matching') {
            q.pairs.forEach((pair, j) => { t += `${String.fromCharCode(65 + j)}. ${pair.left} => ${pair.right}\n`; });
        } else if (q.type === 'truefalse') {
            t += q.correct[0] === 0 ? 'True\n' : 'False\n';
        } else {
            q.options.forEach((opt, j) => { t += `${String.fromCharCode(65 + j)}. ${opt}${q.correct.includes(j) ? ' *' : ''}\n`; });
        }
        if (q.explanation) t += `[explanation: ${q.explanation}]\n`;
        return t;
    }).join('\n');
}
