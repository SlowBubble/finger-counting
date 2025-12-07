const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const people = [
    { name: "Bluey", age: 5 },
    { name: "Bingo", age: 3 }
];

const urlParams = new URLSearchParams(window.location.search);
const gameSettings = {
    maxAge: parseInt(urlParams.get('maxAge')) || 8,
    utteranceRate: parseFloat(urlParams.get('utteranceRate')) || 0.2
};

let state = 'waiting'; // 'waiting' or 'answering'
let currentQuestion = null;
let userAnswer = '';
let isFirstQuestion = true;

function speak(text, onEnd) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = gameSettings.utteranceRate;
    if (onEnd) {
        utterance.onend = onEnd;
    }
    speechSynthesis.speak(utterance);
}

function getYoungerPerson() {
    return people.reduce((youngest, person) => 
        person.age < youngest.age ? person : youngest
    );
}

function getOlderPerson() {
    return people.reduce((oldest, person) => 
        person.age > oldest.age ? person : oldest
    );
}

function generateQuestion() {
    const younger = getYoungerPerson();
    const older = getOlderPerson();
    const minAge = younger.age;
    const N = Math.floor(Math.random() * (gameSettings.maxAge - minAge - 1)) + minAge + 1;
    const ageDifference = older.age - younger.age;
    const correctAnswer = N + ageDifference;
    
    return {
        younger,
        older,
        N,
        ageDifference,
        correctAnswer,
        question: `When ${younger.name} is ${N}, how old will ${older.name} be?`
    };
}

function drawText(text, x, y, fontSize = 30, color = 'black') {
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText(text, x, y);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function draw() {
    clearCanvas();
    
    if (state === 'waiting') {
        drawText('Press Space', 50, canvas.height / 2, 72);
    } else if (state === 'answering' || state === 'incorrect' || state === 'correct') {
        if (userAnswer) {
            const answer = parseInt(userAnswer);
            let symbol = '=';
            if (answer > currentQuestion.correctAnswer) {
                symbol = '<';
            } else if (answer < currentQuestion.correctAnswer) {
                symbol = '>';
            }
            drawText(`${currentQuestion.N} + ${currentQuestion.ageDifference} ${symbol} ${userAnswer}`, 50, canvas.height / 2, 96);
        } else {
            drawText(`${currentQuestion.N} + ${currentQuestion.ageDifference}`, 50, canvas.height / 2, 96);
        }
    }
}

document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    
    if (e.key === ' ' && state === 'waiting') {
        currentQuestion = generateQuestion();
        userAnswer = '';
        state = 'answering';
        
        if (isFirstQuestion) {
            isFirstQuestion = false;
            speak("Welcome to The Age is Right!", () => {
                window.setTimeout(_ => {
                    speak(currentQuestion.question);
                }, 700);
            });
        } else {
            speak(currentQuestion.question);
        }
        
        draw();
    } else if (state === 'answering' || state === 'incorrect') {
        if (e.key >= '0' && e.key <= '9') {
            userAnswer += e.key;
            draw();
            
            const correctDigits = currentQuestion.correctAnswer.toString().length;
            if (userAnswer.length === correctDigits) {
                const answer = parseInt(userAnswer);
                
                if (answer === currentQuestion.correctAnswer) {
                    state = 'correct';
                    const successMsg = `Very nice. When ${currentQuestion.younger.name} is ${currentQuestion.N}, ${currentQuestion.older.name} will be ${currentQuestion.correctAnswer}.`;
                    speak(successMsg, () => {
                        state = 'waiting';
                        userAnswer = '';
                        draw();
                    });
                } else {
                    state = 'incorrect';
                    speak('Incorrect. Please try again.', () => {
                        userAnswer = '';
                        state = 'answering';
                        draw();
                    });
                }
            }
        }
    }
});

document.getElementById('personalDataBtn').addEventListener('click', () => {
    const content = `
        <h2>Personal Data (JSON)</h2>
        <textarea id="peopleData" style="font-size: 1.5em; width: 100%; min-height: 400px;">${JSON.stringify(people, null, 2)}</textarea>
        <p style="color: #666; font-size: 14px;">Press Enter to save, Escape to cancel</p>
    `;
    
    createModal(content, (modal) => {
        const textarea = modal.querySelector('#peopleData');
        try {
            const newPeople = JSON.parse(textarea.value);
            if (Array.isArray(newPeople)) {
                people.length = 0;
                people.push(...newPeople);
                return true;
            } else {
                alert('Invalid format: must be an array');
                return false;
            }
        } catch (e) {
            alert('Invalid JSON: ' + e.message);
            return false;
        }
    });
});

function updateURLParams() {
    const params = new URLSearchParams();
    if (gameSettings.maxAge !== 8) {
        params.set('maxAge', gameSettings.maxAge);
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

draw();
