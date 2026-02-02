/* Quiz Parser - PHASE 2: Enhanced with Code Language & Image Support */

/**
 * Parse quiz data from text format
 * 
 * PHASE 2 ENHANCEMENTS:
 * - Code blocks with language: [code:powershell] ... [/code]
 * - Question images: [image: url] or [img: url]
 * - Image alt text: [image: url | alt text]
 * - Option images: A. [img: url] Caption text
 * 
 * SUPPORTED FORMATS:
 * 
 * Multiple Choice:
 * 1. Question text
 * [image: https://example.com/diagram.png | Network diagram]
 * [code:powershell]
 * Get-Service | Where-Object {$_.Status -eq "Running"}
 * [/code]
 * A. Option 1
 * B. Option 2 *
 * C. Option 3
 * [explanation: Why B is correct]
 * 
 * True/False:
 * 2. [tf] Statement to evaluate
 * True
 * [explanation: Explanation text]
 * 
 * Matching:
 * 3. [match] Match the terms
 * A. Term 1 => Definition 1
 * B. Term 2 => Definition 2
 * 
 * Ordering:
 * 4. [order] Put in correct order
 * 1) First step
 * 2) Second step
 * 3) Third step
 */

export function parseQuizData(data) {
    const lines = data.split('\n');
    const questions = [];
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i].trim();
        
        // Check for question start (numbered line)
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
    
    // Determine question type from tags
    const isOrder = line.includes('[order]');
    const isMatch = line.includes('[match]');
    const isTF = line.includes('[tf]') || line.includes('[truefalse]');
    
    let type = 'choice';
    if (isOrder) type = 'ordering';
    else if (isMatch) type = 'matching';
    else if (isTF) type = 'truefalse';
    
    // Clean question text
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
    
    // Parse image (can appear before or after code)
    const imageResult = parseImage(lines, i);
    if (imageResult) {
        question.image = imageResult.url;
        question.imageAlt = imageResult.alt;
        i = imageResult.nextIndex;
    }
    
    // Parse code block with language
    const codeResult = parseCodeBlock(lines, i);
    if (codeResult) {
        question.code = codeResult.code;
        question.codeLanguage = codeResult.language;
        i = codeResult.nextIndex;
    }
    
    // Parse image again (in case it comes after code)
    if (!question.image) {
        const imageResult2 = parseImage(lines, i);
        if (imageResult2) {
            question.image = imageResult2.url;
            question.imageAlt = imageResult2.alt;
            i = imageResult2.nextIndex;
        }
    }
    
    // Parse based on type
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
    
    // Parse explanation
    const explanationResult = parseExplanation(lines, i);
    if (explanationResult) {
        question.explanation = explanationResult.text;
        i = explanationResult.nextIndex;
    }
    
    return { question, nextIndex: i };
}

// PHASE 2: Parse code block with language support
function parseCodeBlock(lines, startIndex) {
    if (startIndex >= lines.length) return null;
    
    const line = lines[startIndex].trim();
    
    // Check for code block start: [code] or [code:language]
    const codeMatch = line.match(/^\[code(?::(\w+))?\]$/i);
    if (!codeMatch) return null;
    
    const language = codeMatch[1] || 'plaintext';
    const codeLines = [];
    let i = startIndex + 1;
    
    while (i < lines.length && lines[i].trim() !== '[/code]') {
        codeLines.push(lines[i]);
        i++;
    }
    
    // Skip closing tag
    if (i < lines.length) i++;
    
    return {
        code: codeLines.join('\n'),
        language: language.toLowerCase(),
        nextIndex: i
    };
}

// PHASE 2: Parse image tag
function parseImage(lines, startIndex) {
    if (startIndex >= lines.length) return null;
    
    const line = lines[startIndex].trim();
    
    // Match [image: url] or [img: url] with optional alt text
    const imageMatch = line.match(/^\[(?:image|img):\s*([^\]|]+)(?:\s*\|\s*([^\]]+))?\]$/i);
    if (!imageMatch) return null;
    
    return {
        url: imageMatch[1].trim(),
        alt: imageMatch[2] ? imageMatch[2].trim() : null,
        nextIndex: startIndex + 1
    };
}

// Parse explanation tag
function parseExplanation(lines, startIndex) {
    if (startIndex >= lines.length) return null;
    
    const line = lines[startIndex].trim();
    
    // Match [explanation: text] or [exp: text]
    const expMatch = line.match(/^\[(?:explanation|exp):\s*(.+?)\]?$/i);
    if (!expMatch) return null;
    
    return {
        text: expMatch[1].trim(),
        nextIndex: startIndex + 1
    };
}

// Parse multiple choice options
function parseMultipleChoice(lines, startIndex, question) {
    let i = startIndex;
    
    while (i < lines.length && lines[i].match(/^[A-Z]\./i)) {
        const line = lines[i].trim();
        let optionText = line.substring(2).trim();
        let optionImage = null;
        
        // PHASE 2: Check for image option [img: url]
        const imgMatch = optionText.match(/^\[(?:image|img):\s*([^\]]+)\]\s*(.*)$/i);
        if (imgMatch) {
            optionImage = imgMatch[1].trim();
            optionText = imgMatch[2].trim();
        }
        
        // Check if this is the correct answer (marked with *)
        const isCorrect = optionText.endsWith('*');
        if (isCorrect) {
            optionText = optionText.slice(0, -1).trim();
            question.correct.push(question.options.length);
        }
        
        question.options.push(optionText);
        if (optionImage) {
            question.optionImages[question.options.length - 1] = optionImage;
        }
        
        i++;
    }
    
    // Default to first option if no correct answer marked
    if (question.correct.length === 0 && question.options.length > 0) {
        question.correct = [0];
    }
    
    return i;
}

// Parse true/false
function parseTrueFalse(lines, startIndex, question) {
    question.options = ['True', 'False'];
    let i = startIndex;
    
    while (i < lines.length && lines[i].trim()) {
        const ans = lines[i].trim().toLowerCase();
        
        // Check for answer markers
        if (ans === 'true' || ans === 't' || ans === 'true *' || ans === 't *') {
            question.correct = [0];
            i++;
            break;
        } else if (ans === 'false' || ans === 'f' || ans === 'false *' || ans === 'f *') {
            question.correct = [1];
            i++;
            break;
        } else if (ans.startsWith('[')) {
            // Hit explanation or next question marker
            break;
        }
        i++;
    }
    
    // Default to true if not specified
    if (question.correct.length === 0) {
        question.correct = [0];
    }
    
    return i;
}

// Parse matching pairs
function parseMatching(lines, startIndex, question) {
    let i = startIndex;
    
    // Format: A. Term => Definition or A. Term -> Definition or A. Term : Definition
    while (i < lines.length && lines[i].match(/^[A-Z]\./i)) {
        const content = lines[i].substring(2).trim();
        const parts = content.split(/\s*(?:=>|->|:)\s*/);
        
        if (parts.length >= 2) {
            question.pairs.push({
                left: parts[0].trim(),
                right: parts[1].trim()
            });
        }
        i++;
    }
    
    // Store right side as options for compatibility
    question.options = question.pairs.map(p => p.right);
    question.correct = question.pairs.map((_, idx) => idx);
    
    return i;
}

// Parse ordering items
function parseOrdering(lines, startIndex, question) {
    let i = startIndex;
    const items = [];
    
    // Format: 1) Item text (number indicates correct position)
    while (i < lines.length && lines[i].match(/^\d+\)/)) {
        const match = lines[i].match(/^(\d+)\)\s*(.+)$/);
        if (match) {
            const correctPosition = parseInt(match[1]) - 1;
            const text = match[2].trim();
            items.push({ text, correctPosition });
        }
        i++;
    }
    
    // Sort by correct position and extract texts
    items.sort((a, b) => a.correctPosition - b.correctPosition);
    question.options = items.map(item => item.text);
    question.correct = items.map((_, idx) => idx);
    
    return i;
}

/**
 * Convert questions back to text format
 */
export function questionsToText(questions) {
    return questions.map((q, i) => {
        let tag = '';
        if (q.type === 'ordering') tag = '[order] ';
        else if (q.type === 'matching') tag = '[match] ';
        else if (q.type === 'truefalse') tag = '[tf] ';
        
        let text = `${i + 1}. ${tag}${q.question}\n`;
        
        // PHASE 2: Add image
        if (q.image) {
            text += `[image: ${q.image}${q.imageAlt ? ' | ' + q.imageAlt : ''}]\n`;
        }
        
        // PHASE 2: Add code with language
        if (q.code) {
            const lang = q.codeLanguage || 'plaintext';
            text += `[code:${lang}]\n${q.code}\n[/code]\n`;
        }
        
        // Add type-specific content
        if (q.type === 'ordering') {
            q.options.forEach((opt, j) => {
                text += `${q.correct[j] + 1}) ${opt}\n`;
            });
        } else if (q.type === 'matching') {
            q.pairs.forEach((pair, j) => {
                text += `${String.fromCharCode(65 + j)}. ${pair.left} => ${pair.right}\n`;
            });
        } else if (q.type === 'truefalse') {
            text += q.correct[0] === 0 ? 'True\n' : 'False\n';
        } else {
            // Multiple choice
            q.options.forEach((opt, j) => {
                const imgPart = q.optionImages && q.optionImages[j] 
                    ? `[img: ${q.optionImages[j]}] ` 
                    : '';
                text += `${String.fromCharCode(65 + j)}. ${imgPart}${opt}${q.correct.includes(j) ? ' *' : ''}\n`;
            });
        }
        
        // Add explanation
        if (q.explanation) {
            text += `[explanation: ${q.explanation}]\n`;
        }
        
        return text;
    }).join('\n');
}

/**
 * Validate a question object
 */
export function validateQuestion(question) {
    const errors = [];
    
    if (!question.question || question.question.trim() === '') {
        errors.push('Question text is required');
    }
    
    switch (question.type) {
        case 'choice':
            if (!question.options || question.options.length < 2) {
                errors.push('Multiple choice needs at least 2 options');
            }
            if (!question.correct || question.correct.length === 0) {
                errors.push('At least one correct answer must be marked');
            }
            break;
            
        case 'matching':
            if (!question.pairs || question.pairs.length < 2) {
                errors.push('Matching needs at least 2 pairs');
            }
            break;
            
        case 'ordering':
            if (!question.options || question.options.length < 2) {
                errors.push('Ordering needs at least 2 items');
            }
            break;
            
        case 'truefalse':
            if (!question.correct || question.correct.length === 0) {
                errors.push('True/False answer must be specified');
            }
            break;
    }
    
    // PHASE 2: Validate image URL if present
    if (question.image && !isValidUrl(question.image)) {
        errors.push('Invalid image URL');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        // Could be a relative path or data URL
        return string.startsWith('/') || string.startsWith('data:');
    }
}

/**
 * Smart parser for messy input (handles various formats)
 * PHASE 2: Enhanced to detect more formats
 */
export function smartParse(text) {
    // Try to detect format and normalize
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    // Detect numbered questions
    if (lines.some(l => l.match(/^\d+\./))) {
        return parseQuizData(text);
    }
    
    // Detect Q: format
    if (lines.some(l => l.match(/^Q:/i))) {
        return parseQFormat(text);
    }
    
    // Detect bullet format
    if (lines.some(l => l.match(/^[-*•]/))) {
        return parseBulletFormat(text);
    }
    
    // Fallback - try standard parse
    return parseQuizData(text);
}

function parseQFormat(text) {
    // Handle Q: Question / * Answer / - Wrong format
    const questions = [];
    const blocks = text.split(/(?=^Q:)/im).filter(b => b.trim());
    
    for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 2) continue;
        
        const questionText = lines[0].replace(/^Q:\s*/i, '').trim();
        const q = {
            question: questionText,
            type: 'choice',
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
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.match(/^[*✓]\s/)) {
                // Correct answer
                q.correct.push(q.options.length);
                q.options.push(line.replace(/^[*✓]\s*/, ''));
            } else if (line.match(/^[-•]\s/)) {
                // Wrong answer
                q.options.push(line.replace(/^[-•]\s*/, ''));
            }
        }
        
        if (q.options.length >= 2) {
            questions.push(q);
        }
    }
    
    return questions;
}

function parseBulletFormat(text) {
    // Simpler bullet format where first bullet after question is correct
    const questions = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    let currentQ = null;
    
    for (const line of lines) {
        if (!line.match(/^[-*•]/) && line.length > 10) {
            // Probably a question
            if (currentQ && currentQ.options.length >= 2) {
                questions.push(currentQ);
            }
            currentQ = {
                question: line,
                type: 'choice',
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
    
    if (currentQ && currentQ.options.length >= 2) {
        questions.push(currentQ);
    }
    
    // Default first option as correct if none marked
    questions.forEach(q => {
        if (q.correct.length === 0) {
            q.correct = [0];
        }
    });
    
    return questions;
}