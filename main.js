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

function drawFinger(x, y) {
    // Draw finger as a thin rectangle with a circle on top
    const fingerWidth = 15;
    const fingerHeight = 80;
    const nailRadius = 10;
    
    // Skin color for finger
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(x - fingerWidth / 2, y, fingerWidth, fingerHeight);
    
    // Nail (circle on top)
    ctx.fillStyle = '#ffc0cb';
    ctx.beginPath();
    ctx.arc(x, y, nailRadius, 0, Math.PI * 2);
    ctx.fill();
}

function drawHand(x, y, fingerCount, side) {
    const fingerSpacing = 25;
    const startX = x - (fingerCount - 1) * fingerSpacing / 2;
    
    for (let i = 0; i < fingerCount; i++) {
        drawFinger(startX + i * fingerSpacing, y);
    }
    
    // Draw label
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(side, x, y + 120);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function draw() {
    clearCanvas();
    
    if (state === 'answering' || state === 'incorrect' || state === 'correct') {
        if (currentQuestion) {
            // Draw left hand
            drawHand(200, 150, currentQuestion.n1, 'Left');
            
            // Draw right hand
            drawHand(600, 150, currentQuestion.n2, 'Right');
        }
    }
}

function generateQuestion() {
    const n1 = Math.floor(Math.random() * gameSettings.maxLeftFingers) + 1;
    const n2 = Math.floor(Math.random() * gameSettings.maxRightFingers) + 1;
    const correctAnswer = n1 + n2;
    
    return {
        n1,
        n2,
        correctAnswer,
        question: `I have ${n1} fingers on the left and ${n2} fingers on the right. How many fingers are there?`
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
        currentQuestion = generateQuestion();
        userAnswer = '';
        state = 'answering';
        
        header.textContent = `${currentQuestion.n1} + ${currentQuestion.n2}`;
        speak(currentQuestion.question);
        draw();
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
                    const successMsg = `Very nice. ${currentQuestion.n1} plus ${currentQuestion.n2} equals ${currentQuestion.correctAnswer}.`;
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
