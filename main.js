const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const header = document.getElementById('header');

const urlParams = new URLSearchParams(window.location.search);
const gameSettings = {
    maxLeftFingers: parseInt(urlParams.get('maxLeftFingers')) || 5,
    maxRightFingers: parseInt(urlParams.get('maxRightFingers')) || 5,
    utteranceRate: parseFloat(urlParams.get('utteranceRate')) || 0.4
};

let state = 'waiting'; // 'waiting' or 'answering'
let currentQuestion = null;
let userAnswer = '';
let isFirstTime = true;

function drawFinger(x, y, height) {
    // Draw finger as a rounded rectangle (top only)
    const fingerWidth = 20;
    const fingerHeight = height;
    const radius = 10;
    
    // Skin color for finger
    ctx.fillStyle = '#ffdbac';
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 2;
    
    // Draw rounded rectangle with no bottom rounding (extends past canvas)
    ctx.beginPath();
    ctx.moveTo(x - fingerWidth / 2 + radius, y);
    ctx.lineTo(x + fingerWidth / 2 - radius, y);
    ctx.arcTo(x + fingerWidth / 2, y, x + fingerWidth / 2, y + radius, radius);
    ctx.lineTo(x + fingerWidth / 2, y + fingerHeight);
    ctx.lineTo(x - fingerWidth / 2, y + fingerHeight);
    ctx.lineTo(x - fingerWidth / 2, y + radius);
    ctx.arcTo(x - fingerWidth / 2, y, x - fingerWidth / 2 + radius, y, radius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Nail (oval on top)
    ctx.fillStyle = '#ffc0cb';
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawHand(x, y, fingerCount, side) {
    const fingerSpacing = 30;
    const startX = x - (fingerCount - 1) * fingerSpacing / 2;
    const baseHeight = 250; // Extended to ensure bottom is always hidden
    
    // Middle finger index (for even counts, pick the left-middle one)
    const middleIndex = Math.floor((fingerCount - 1) / 2);
    
    for (let i = 0; i < fingerCount; i++) {
        // Calculate distance from middle finger
        const distanceFromMiddle = Math.abs(i - middleIndex);
        // Create inverted U shape - fingers further from middle are shorter
        const yOffset = distanceFromMiddle * 15;
        
        drawFinger(startX + i * fingerSpacing, y + yOffset, baseHeight);
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function draw() {
    clearCanvas();
    
    if (state === 'answering' || state === 'incorrect' || state === 'correct') {
        if (currentQuestion) {
            // Draw left hand (fingers grow from bottom, shorter visible height)
            drawHand(200, canvas.height - 100, currentQuestion.n1, 'Left');
            
            // Draw right hand (fingers grow from bottom, shorter visible height)
            drawHand(600, canvas.height - 100, currentQuestion.n2, 'Right');
        }
    }
}

function generateQuestion() {
    const n1 = Math.floor(Math.random() * gameSettings.maxLeftFingers) + 1;
    const n2 = Math.floor(Math.random() * gameSettings.maxRightFingers) + 1;
    const correctAnswer = n1 + n2;
    
    const leftText = n1 === 1 ? '1 finger' : `${n1} fingers`;
    const rightText = n2 === 1 ? '1 finger' : `${n2} fingers`;
    const totalText = correctAnswer === 1 ? 'finger is' : 'fingers are';
    
    return {
        n1,
        n2,
        correctAnswer,
        question: `I have ${leftText} on the left and ${rightText} on the right. How many ${totalText} there?`
    };
}

function speak(text, onEnd) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = gameSettings.utteranceRate;
    if (onEnd) {
        utterance.onend = onEnd;
    }
    speechSynthesis.speak(utterance);
}

function updateURLParams() {
    const params = new URLSearchParams();
    if (gameSettings.maxLeftFingers !== 5) {
        params.set('maxLeftFingers', gameSettings.maxLeftFingers);
    }
    if (gameSettings.maxRightFingers !== 5) {
        params.set('maxRightFingers', gameSettings.maxRightFingers);
    }
    if (gameSettings.utteranceRate !== 0.2) {
        params.set('utteranceRate', gameSettings.utteranceRate);
    }
    const newURL = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, '', newURL);
}

document.getElementById('gameSettingsBtn').addEventListener('click', () => {
    const content = `
        <h2>Game Settings (JSON)</h2>
        <textarea id="settingsData" style="font-size: 1.5em; width: 100%; min-height: 400px;">${JSON.stringify(gameSettings, null, 2)}</textarea>
        <p style="color: #666; font-size: 14px;">Press Enter to save, Escape to cancel</p>
    `;
    
    createModal(content, (modal) => {
        const textarea = modal.querySelector('#settingsData');
        try {
            const newSettings = JSON.parse(textarea.value);
            if (typeof newSettings === 'object' && !Array.isArray(newSettings)) {
                Object.assign(gameSettings, newSettings);
                updateURLParams();
                return true;
            } else {
                alert('Invalid format: must be an object');
                return false;
            }
        } catch (e) {
            alert('Invalid JSON: ' + e.message);
            return false;
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    
    if (e.key === ' ' && state === 'waiting') {
        if (isFirstTime) {
            isFirstTime = false;
            speak('Welcome to finger counting!', () => {
                currentQuestion = generateQuestion();
                userAnswer = '';
                state = 'answering';
                
                header.textContent = `${currentQuestion.n1} + ${currentQuestion.n2}`;
                speak(currentQuestion.question);
                draw();
            });
        } else {
            currentQuestion = generateQuestion();
            userAnswer = '';
            state = 'answering';
            
            header.textContent = `${currentQuestion.n1} + ${currentQuestion.n2}`;
            speak(currentQuestion.question);
            draw();
        }
    } else if (state === 'answering' || state === 'incorrect') {
        if (e.key >= '0' && e.key <= '9') {
            userAnswer += e.key;
            
            // Update header with user's answer
            if (userAnswer) {
                const answer = parseInt(userAnswer);
                let symbol = '=';
                if (answer > currentQuestion.correctAnswer) {
                    symbol = '<';
                } else if (answer < currentQuestion.correctAnswer) {
                    symbol = '>';
                }
                header.textContent = `${currentQuestion.n1} + ${currentQuestion.n2} ${symbol} ${userAnswer}`;
            }
            
            const correctDigits = currentQuestion.correctAnswer.toString().length;
            if (userAnswer.length === correctDigits) {
                const answer = parseInt(userAnswer);
                
                if (answer === currentQuestion.correctAnswer) {
                    state = 'correct';
                    const successMsg = `Very nice. I have ${currentQuestion.n1} plus ${currentQuestion.n2} fingers, or ${currentQuestion.correctAnswer} fingers.`;
                    speak(successMsg, () => {
                        state = 'waiting';
                        userAnswer = '';
                        header.textContent = 'Press Space';
                        clearCanvas();
                    });
                } else {
                    state = 'incorrect';
                    speak('Incorrect. Please try again.', () => {
                        userAnswer = '';
                        state = 'answering';
                        header.textContent = `${currentQuestion.n1} + ${currentQuestion.n2}`;
                    });
                }
            }
        }
    }
});
