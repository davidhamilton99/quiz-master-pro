/* Quiz Parser */
export function parseQuizData(data) {
    const lines = data.split('\n'), questions = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i].trim();
        if (line.match(/^\d+\./)) {
            const isOrder = line.includes('[order]');
            const q = { question: line.replace(/^\d+\./, '').replace('[order]', '').trim(), type: isOrder ? 'ordering' : 'choice', options: [], correct: [], code: null, explanation: null };
            i++;
            if (i < lines.length && lines[i].trim() === '[code]') {
                i++; const code = [];
                while (i < lines.length && lines[i].trim() !== '[/code]') { code.push(lines[i]); i++; }
                q.code = code.join('\n'); if (i < lines.length) i++;
            }
            if (isOrder) {
                while (i < lines.length && lines[i].match(/^\d+\)/)) {
                    const num = parseInt(lines[i].match(/^(\d+)\)/)[1]);
                    q.options.push(lines[i].replace(/^\d+\)/, '').trim());
                    q.correct.push(num - 1); i++;
                }
            } else {
                while (i < lines.length && lines[i].match(/^[A-Z]\./i)) {
                    let opt = lines[i].substring(2).trim();
                    if (opt.endsWith('*')) { opt = opt.slice(0, -1).trim(); q.correct.push(q.options.length); }
                    q.options.push(opt); i++;
                }
            }
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
        let t = `${i + 1}. ${q.type === 'ordering' ? '[order] ' : ''}${q.question}\n`;
        if (q.code) t += `[code]\n${q.code}\n[/code]\n`;
        if (q.type === 'ordering') {
            q.options.forEach((opt, j) => { t += `${q.correct[j] + 1}) ${opt}\n`; });
        } else {
            q.options.forEach((opt, j) => { t += `${String.fromCharCode(65 + j)}. ${opt}${q.correct.includes(j) ? ' *' : ''}\n`; });
        }
        if (q.explanation) t += `[explanation: ${q.explanation}]\n`;
        return t;
    }).join('\n');
}
