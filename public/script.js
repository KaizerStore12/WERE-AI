// Konfigurasi
const API_URL = '/api/chat'; // Endpoint Vercel Serverless Function

// State management
let conversationHistory = [];
let isWaitingForResponse = false;

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// Load chat history dari localStorage
function loadChatHistory() {
    const saved = localStorage.getItem('deepseek_chat_history');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                conversationHistory = parsed;
                renderMessages();
            }
        } catch (e) {
            console.error('Failed to load history:', e);
        }
    }
}

// Save chat history ke localStorage
function saveChatHistory() {
    localStorage.setItem('deepseek_chat_history', JSON.stringify(conversationHistory));
}

// Render semua pesan
function renderMessages() {
    chatMessages.innerHTML = '';
    
    if (conversationHistory.length === 0) {
        // Tampilkan welcome message
        addMessageToUI('ai', 'Halo! Saya adalah DeepSeek AI Assistant. 👋<br>Ada yang bisa saya bantu? Silakan tanyakan apa saja!');
    } else {
        conversationHistory.forEach(msg => {
            addMessageToUI(msg.role, msg.content);
        });
    }
    
    scrollToBottom();
}

// Tambah pesan ke UI
function addMessageToUI(role, content) {
    const messageDiv = document.createElement('div');
    
    if (role === 'user') {
        messageDiv.className = 'message-user';
        messageDiv.innerHTML = `
            <div class="message-content">
                ${escapeHtml(content)}
            </div>
        `;
    } else {
        messageDiv.className = 'message-ai';
        messageDiv.innerHTML = `
            <div class="ai-avatar">AI</div>
            <div class="message-content">
                ${escapeHtml(content)}
            </div>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Tampilkan typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message-ai';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="ai-avatar">AI</div>
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
}

// Hapus typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// Escape HTML untuk keamanan
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Scroll ke bawah
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Update status koneksi
function updateStatus(isConnected) {
    if (isConnected) {
        statusDot.classList.remove('disconnected');
        statusText.textContent = 'Connected';
    } else {
        statusDot.classList.add('disconnected');
        statusText.textContent = 'Disconnected';
    }
}

// Kirim pesan ke backend
async function sendMessageToAPI(messages) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
        throw new Error(data.error || 'Unknown error');
    }
    
    return data.message;
}

// Fungsi utama kirim pesan
async function sendMessage() {
    const message = userInput.value.trim();
    
    if (!message) {
        alert('Silakan ketik pesan terlebih dahulu!');
        return;
    }
    
    if (isWaitingForResponse) {
        alert('Tunggu respons AI selesai!');
        return;
    }
    
    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // Tambah pesan user ke UI dan history
    addMessageToUI('user', message);
    conversationHistory.push({ role: 'user', content: message });
    saveChatHistory();
    
    // Set flag dan disable tombol
    isWaitingForResponse = true;
    sendBtn.disabled = true;
    
    // Tampilkan typing indicator
    showTypingIndicator();
    
    try {
        // Siapkan messages untuk API (kirim seluruh history)
        const apiMessages = conversationHistory;
        
        // Panggil API
        const aiResponse = await sendMessageToAPI(apiMessages);
        
        // Hapus typing indicator
        removeTypingIndicator();
        
        // Tambah response AI ke UI dan history
        addMessageToUI('ai', aiResponse);
        conversationHistory.push({ role: 'assistant', content: aiResponse });
        saveChatHistory();
        
        // Update status
        updateStatus(true);
        
    } catch (error) {
        console.error('Error:', error);
        
        // Hapus typing indicator
        removeTypingIndicator();
        
        // Tampilkan error message
        const errorMessage = `❌ Error: ${error.message}\n\nPastikan backend server berjalan dan API Key sudah diatur dengan benar.`;
        addMessageToUI('ai', errorMessage);
        
        // Update status error
        updateStatus(false);
        
    } finally {
        // Reset flag dan enable tombol
        isWaitingForResponse = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

// Clear chat history
function clearChat() {
    if (confirm('Yakin ingin menghapus semua riwayat percakapan?')) {
        conversationHistory = [];
        localStorage.removeItem('deepseek_chat_history');
        renderMessages();
        saveChatHistory();
    }
}

// Auto-resize textarea
function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
}

// Handle keyboard shortcuts
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Gunakan prompt template
function setupPromptButtons() {
    document.querySelectorAll('.prompt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.getAttribute('data-prompt');
            userInput.value = prompt;
            autoResizeTextarea();
            userInput.focus();
        });
    });
}

// Test koneksi ke backend
async function testConnection() {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: 'ping' }] })
        });
        
        if (response.ok) {
            updateStatus(true);
            console.log('✅ Backend connected');
        } else {
            updateStatus(false);
            console.warn('⚠️ Backend error:', response.status);
        }
    } catch (error) {
        updateStatus(false);
        console.error('❌ Cannot connect to backend:', error);
    }
}

// Inisialisasi
function init() {
    loadChatHistory();
    setupPromptButtons();
    
    userInput.addEventListener('input', autoResizeTextarea);
    userInput.addEventListener('keypress', handleKeyPress);
    sendBtn.addEventListener('click', sendMessage);
    clearBtn.addEventListener('click', clearChat);
    
    userInput.focus();
    
    // Test koneksi setelah 1 detik
    setTimeout(testConnection, 1000);
}

// Jalankan inisialisasi saat halaman siap
document.addEventListener('DOMContentLoaded', init);
