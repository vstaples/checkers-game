document.addEventListener('DOMContentLoaded', () => {
    
    checkAuthentication();
    
    initializeI18next();

    const newGameButton = document.getElementById('newGameButton');
    
    newGameButton.style.display = 'block';
    
});

function checkAuthentication() {
    
    console.log("Checking authentication status...");
    
    fetch('/auth-status', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Received response from /auth-status:', response);
        return response.json();
    })
    .then(data => {
        console.log('Authentication status data:', data);
        if (!data.isAuthenticated) {
            window.location.href = '/login.html';
        } else {
            console.log('User is authenticated');
        }
    })
    .catch(error => {
        console.error('Error checking authentication status:', error);
        window.location.href = '/login.html';
    });
}

function initializeI18next() {

    i18next
        .use(i18nextHttpBackend)
        .use(i18nextBrowserLanguageDetector)
        .init({
            backend: {
                loadPath: function(lngs, namespaces) {
                    const language = lngs[0].split('-')[0]; // Get the base language (e.g., 'zh' from 'zh-CN')
                    return `/locales/${language}.json`; // Use the base language file
                }
            },
            fallbackLng: 'en-US', // Set fallback language to 'zh-CN'
            lng: 'en-US', // Explicitly set the initial language to Chinese
            debug: true
        }, function(err, t) {
            if (err) {
                console.error("i18next initialization error:", err);
            } else {
                updateContent();
            }
        });
}

function updateContent() {

    document.querySelectorAll('[data-i18n]').forEach(function(element) {
        const key = element.getAttribute('data-i18n');
        element.innerHTML = i18next.t(key);
        console.log(`Translated "${key}" to "${element.innerHTML}"`);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(element) {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = i18next.t(key);
        console.log(`Translated placeholder "${key}" to "${element.placeholder}"`);
    });

    console.log("Content updated with translations");

    // Translate chat messages
    updateChatMessages();

    // Log the display property of the New Game button after translations
    const newGameButton = document.getElementById('newGameButton');
    console.log('New Game button after translations:', newGameButton.style.display);
}

function updateChatMessages() {
    const chatMessagesContainer = document.getElementById('chatMessages');
          chatMessagesContainer.innerHTML = ''; // Clear current chat messages

    CHAT_MESSAGES.forEach(message => {
        const messageElement = document.createElement('div');
        const isOwnMessage = message.from === clientUsername;

        messageElement.classList.add('chat-message');
        if (isOwnMessage) {
            messageElement.classList.add('own-message');
        } else {
            messageElement.classList.add('other-message');
        }

        const translatedMessage = i18next.t(message.message);

        messageElement.innerHTML = `
            ${!isOwnMessage ? `<img src="images/${message.from}.png" alt="${message.from}" class="chat-avatar">` : ''}
            <div class="chat-text">${translatedMessage}</div>
            ${isOwnMessage ? `<img src="images/${clientUsername}.png" alt="${clientUsername}" class="chat-avatar">` : ''}
        `;

        chatMessagesContainer.appendChild(messageElement);
    });
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}