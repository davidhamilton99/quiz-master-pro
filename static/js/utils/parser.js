/* Quiz Parser - PHASE 2: Image & Code Language Support */

export function parseQuizData(data) {
    const lines = data.split('\n');
    const questions = [];
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i].trim();
        
        if (line.match(/^\d+\./)) {
            const question = parseQuestion(lines, i);
            if (question) {
                questions.push(question.question);
                i = question.nextIndex;
            } else {
                i++;
            }
        } else {
            i++;
        }
    }
    
    return questions;
}

function parseQuestion(lines, startIndex) {
    const line = lines[startIndex].trim();
    
    const isOrder = line.includes('[order]');
    const isMatch = line.includes('[match]');
    const isTF = line.includes('[tf]') || line.includes('[truefalse]');
    
    let type = 'choice';
    if (isOrder) type = 'ordering';
    else if (isMatch) type = 'matching';
    else if (isTF) type = 'truefalse';
    
    const questionText = line
        .replace(/^\d+\./, '')
        .replace(/\[(order|match|tf|truefalse)\]/gi, '')
        .trim();
    
    const question = {
        question: questionText,
        type,
        options: [],
        correct: [],
        pairs: [],
        code: null,
        codeLanguage: null,
        image: null,
        imageAlt: null,
        optionImages: [],
        explanation: null
    };
    
    let i = startIndex + 1;
    
    // Parse image
    const imageResult = parseImage(lines, i);
    if (imageResult) {
        question.image = imageResult.url;
        question.imageAlt = imageResult.alt;
        i = imageResult.nextIndex;
    }
    
    // Parse code block
    const codeResult = parseCodeBlock(lines, i);
    if (codeResult) {
        question.code = codeResult.code;
        question.codeLanguage = codeResult.language;
        i = codeResult.nextIndex;
    }
    
    // Try image again after code
    if (!question.image) {
        const imageResult2 = parseImage(lines, i);
        if (imageResult2) {
            question.image = imageResult2.url;
            question.imageAlt = imageResult2.alt;
            i = imageResult2.nextIndex;
        }
    }
    
    switch (type) {
        case 'ordering':
            i = parseOrdering(lines, i, question);
            break;
        case 'matching':
            i = parseMatching(lines, i, question);
            break;
        case 'truefalse':
            i = parseTrueFalse(lines, i, question);
            break;
        default:
            i = parseMultipleChoice(lines, i, question);
    }
    
    const explanationResult = parseExplanation(lines, i);
    if (explanationResult) {
        question.explanation = explanationResult.text;
        i = explanationResult.nextIndex;
    }
    
    return { question, nextIndex: i };
}

function parseCodeBlock(lines, startIndex) {
    if (startIndex >= lines.length) return null;
    
    const line = lines[startIndex].trim();
    const codeMatch = line.match(/^\[code(?::(\w+))?\]$/i);
    if (!codeMatch) return null;
    
    const language = codeMatch[1] || 'plaintext';
    const codeLines = [];
    let i = startIndex + 1;
    
    while (i < lines.length && lines[i].trim() !== '[/code]') {
        codeLines.push(lines[i]);
        i++;
    }
    
    if (i < lines.length) i++;
    
    return { code: codeLines.join('\n'), language: language.toLowerCase(), nextIndex: i };
}

function parseImage(lines, startIndex) {
    if (startIndex >= lines.length) return null;
    
    const line = lines[startIndex].trim();
    const imageMatch = line.match(/^\[(?:image|img):\s*([^\]|]+)(?:\s*\|\s*([^\]]+))?\]$/i);
    if (!imageMatch) return null;
    
    return { url: imageMatch[1].trim(), alt: imageMatch[2] ? imageMatch[2].trim() : null, nextIndex: startIndex + 1 };
}

function parseExplanation(lines, startIndex) {
    if (startIndex >= lines.length) return null;
    
    const line = lines[startIndex].trim();
    const expMatch = line.match(/^\[(?:explanation|exp):\s*(.+?)\]?$/i);
    if (!expMatch) return null;
    
    return { text: expMatch[1].trim(), nextIndex: startIndex + 1 };
}

function parseMultipleChoice(lines, startIndex, question) {
    let i = startIndex;
    
    while (i < lines.length && lines[i].match(/^[A-Z]\./i)) {
        const line = lines[i].trim();
        let optionText = line.substring(2).trim();
        let optionImage = null;
        
        const imgMatch = optionText.match(/^\[(?:image|img):\s*([^\]]+)\]\s*(.*)$/i);
        if (imgMatch) {
            optionImage = imgMatch[1].trim();
            optionText = imgMatch[2].trim();
        }
        
        const isCorrect = optionText.endsWith('*');
        if (isCorrect) {
            optionText = optionText.slice(0, -1).trim();
            question.correct.push(question.options.length);
        }
        
        question.options.push(optionText);
        if (optionImage) question.optionImages[question.options.length - 1] = optionImage;
        
        i++;
    }
    
    if (question.correct.length === 0 && question.options.length > 0) {
        question.correct = [0];
    }
    
    return i;
}

function parseTrueFalse(lines, startIndex, question) {
    question.options = ['True', 'False'];
    let i = startIndex;
    
    while (i < lines.length && lines[i].trim()) {
        const ans = lines[i].trim().toLowerCase();
        
        if (ans === 'true' || ans === 't' || ans === 'true *' || ans === 't *') {
            question.correct = [0];
            i++;
            break;
        } else if (ans === 'false' || ans === 'f' || ans === 'false *' || ans === 'f *') {
            question.correct = [1];
            i++;
            break;
        } else if (ans.startsWith('[')) {
            break;
        }
        i++;
    }
    
    if (question.correct.length === 0) question.correct = [0];
    
    return i;
}

function parseMatching(lines, startIndex, question) {
    let i = startIndex;
    
    while (i < lines.length && lines[i].match(/^[A-Z]\./i)) {
        const content = lines[i].substring(2).trim();
        const parts = content.split(/\s*(?:=>|->|:)\s*/);
        
        if (parts.length >= 2) {
            question.pairs.push({ left: parts[0].trim(), right: parts[1].trim() });
        }
        i++;
    }
    
    question.options = question.pairs.map(p => p.right);
    question.correct = question.pairs.map((_, idx) => idx);
    
    return i;
}

function parseOrdering(lines, startIndex, question) {
    let i = startIndex;
    const items = [];
    
    while (i < lines.length && lines[i].match(/^\d+\)/)) {
        const match = lines[i].match(/^(\d+)\)\s*(.+)$/);
        if (match) {
            const correctPosition = parseInt(match[1]) - 1;
            const text = match[2].trim();
            items.push({ text, correctPosition });
        }
        i++;
    }
    
    items.sort((a, b) => a.correctPosition - b.correctPosition);
    question.options = items.map(item => item.text);
    question.correct = items.map((_, idx) => idx);
    
    return i;
}

export function questionsToText(questions) {
    return questions.map((q, i) => {
        let tag = '';
        if (q.type === 'ordering') tag = '[order] ';
        else if (q.type === 'matching') tag = '[match] ';
        else if (q.type === 'truefalse') tag = '[tf] ';
        
        let text = `${i + 1}. ${tag}${q.question}\n`;
        
        if (q.image) {
            text += `[image: ${q.image}${q.imageAlt ? ' | ' + q.imageAlt : ''}]\n`;
        }
        
        if (q.code) {
            const lang = q.codeLanguage || 'plaintext';
            text += `[code:${lang}]\n${q.code}\n[/code]\n`;
        }
        
        if (q.type === 'ordering') {
            q.options.forEach((opt, j) => {
                text += `${j + 1}) ${opt}\n`;
            });
        } else if (q.type === 'matching') {
            q.pairs.forEach((pair, j) => {
                text += `${String.fromCharCode(65 + j)}. ${pair.left} => ${pair.right}\n`;
            });
        } else if (q.type === 'truefalse') {
            text += q.correct[0] === 0 ? 'True\n' : 'False\n';
        } else {
            q.options.forEach((opt, j) => {
                const imgPart = q.optionImages && q.optionImages[j] ? `[img: ${q.optionImages[j]}] ` : '';
                text += `${String.fromCharCode(65 + j)}. ${imgPart}${opt}${q.correct.includes(j) ? ' *' : ''}\n`;
            });
        }
        
        if (q.explanation) text += `[explanation: ${q.explanation}]\n`;
        
        return text;
    }).join('\n');
}

export function validateQuestion(question) {
    const errors = [];
    
    if (!question.question || question.question.trim() === '') errors.push('Question text is required');
    
    switch (question.type) {
        case 'choice':
            if (!question.options || question.options.length < 2) errors.push('Need at least 2 options');
            if (!question.correct || question.correct.length === 0) errors.push('Mark at least one correct answer');
            break;
        case 'matching':
            if (!question.pairs || question.pairs.length < 2) errors.push('Need at least 2 pairs');
            break;
        case 'ordering':
            if (!question.options || question.options.length < 2) errors.push('Need at least 2 items');
            break;
        case 'truefalse':
            if (!question.correct || question.correct.length === 0) errors.push('True/False answer required');
            break;
    }
    
    if (question.image && !isValidUrl(question.image)) errors.push('Invalid image URL');
    
    return { isValid: errors.length === 0, errors };
}

function isValidUrl(string) {
    try { new URL(string); return true; }
    catch (_) { return string.startsWith('/') || string.startsWith('data:'); }
}

export function smartParse(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    if (lines.some(l => l.match(/^\d+\./))) return parseQuizData(text);
    if (lines.some(l => l.match(/^Q:/i))) return parseQFormat(text);
    if (lines.some(l => l.match(/^[-*•]/))) return parseBulletFormat(text);
    
    return parseQuizData(text);
}

function parseQFormat(text) {
    const questions = [];
    const blocks = text.split(/(?=^Q:)/im).filter(b => b.trim());
    
    for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 2) continue;
        
        const questionText = lines[0].replace(/^Q:\s*/i, '').trim();
        const q = { question: questionText, type: 'choice', options: [], correct: [], pairs: [], code: null, codeLanguage: null, image: null, imageAlt: null, optionImages: [], explanation: null };
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.match(/^[*✓]\s/)) {
                q.correct.push(q.options.length);
                q.options.push(line.replace(/^[*✓]\s*/, ''));
            } else if (line.match(/^[-•]\s/)) {
                q.options.push(line.replace(/^[-•]\s*/, ''));
            }
        }
        
        if (q.options.length >= 2) questions.push(q);
    }
    
    return questions;
}

function parseBulletFormat(text) {
    const questions = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    let currentQ = null;
    
    for (const line of lines) {
        if (!line.match(/^[-*•]/) && line.length > 10) {
            if (currentQ && currentQ.options.length >= 2) questions.push(currentQ);
            currentQ = { question: line, type: 'choice', options: [], correct: [], pairs: [], code: null, codeLanguage: null, image: null, imageAlt: null, optionImages: [], explanation: null };
        } else if (line.match(/^[-*•]/) && currentQ) {
            const optText = line.replace(/^[-*•]\s*/, '');
            if (line.startsWith('*') || optText.endsWith('*')) {
                currentQ.correct.push(currentQ.options.length);
                currentQ.options.push(optText.replace(/\s*\*$/, ''));
            } else {
                currentQ.options.push(optText);
            }
        }
    }
    
    if (currentQ && currentQ.options.length >= 2) questions.push(currentQ);
    
    questions.forEach(q => { if (q.correct.length === 0) q.correct = [0]; });
    
    return questions;
}