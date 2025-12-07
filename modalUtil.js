function createModal(content, onSubmit) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 8px;
        min-width: 700px;
        max-width: 800px;
        width: 100%;
        min-height: 400px;
        font-size: 1.5em;
    `;

    modal.innerHTML = content;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const closeModal = () => {
        document.body.removeChild(overlay);
    };

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
    });

    document.addEventListener('keydown', function handleEnter(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const result = onSubmit(modal);
            if (result !== false) {
                closeModal();
                document.removeEventListener('keydown', handleEnter);
            }
        } else if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEnter);
        }
    });

    return { modal, closeModal };
}
