/    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
        size: 0.02,
        color: 0x88aaff,
        transparent: true,
        opacity: 0.6
    });
    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    // Animation
    function animate() {
        requestAnimationFrame(animate);

        // Rotate shapes
        torusKnot.rotation.x += 0.01;
        torusKnot.rotation.y += 0.02;
        
        ico.rotation.x += 0.02;
        ico.rotation.y += 0.01;
        
        sphere.rotation.x += 0.005;
        sphere.rotation.y += 0.01;

        // Rotate particles
        particles.rotation.y += 0.0005;

        renderer.render(scene, camera);
    }

    animate();

    // Handle resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ================ AUTHENTICATION FUNCTIONS ================
function handleLogin() {
    const username = document.getElementById('login-username')?.value;
    const password = document.getElementById('login-password')?.value;

    if (!username || !password) {
        alert('Username dan password harus diisi!');
        return;
    }

    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        if (user.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'index.html';
        }
    } else {
        alert('Username atau password salah!');
    }
}

function handleRegister() {
    const username = document.getElementById('reg-username')?.value;
    const password = document.getElementById('reg-password')?.value;
    const confirm = document.getElementById('reg-confirm')?.value;

    if (!username || !password || !confirm) {
        alert('Semua field harus diisi!');
        return;
    }

    if (password !== confirm) {
        alert('Password tidak cocok!');
        return;
    }

    if (users.find(u => u.username === username)) {
        alert('Username sudah digunakan!');
        return;
    }

    // Cek apakah ini percobaan register akun admin
    if (username.toLowerCase().includes('admin') || username === 'kaizer') {
        alert('Tidak bisa membuat akun admin!');
        return;
    }

    const newUser = {
        username: username,
        password: password,
        tokens: 100, // Token awal untuk member baru
        role: 'member'
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    alert('Registrasi berhasil! Silakan login.');
    window.location.href = 'login.html';
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// ================ CHAT FUNCTIONS ================
async function sendMessage() {
    if (!currentUser) {
        alert('Silakan login terlebih dahulu!');
        window.location.href = 'login.html';
        return;
    }

    if (currentUser.tokens <= 0) {
        alert('Token Anda habis! Hubungi admin (kaizer) untuk menambah token.');
        return;
    }

    const input = document.getElementById('user-input');
    const message = input.value.trim();
    
    if (!message) return;

    // Tampilkan pesan user
    addMessage(message, 'user');
    input.value = '';

    // Kurangi token
    currentUser.tokens -= 1;
    updateUserData();
    updateTokenDisplay();

    // Tampilkan loading
    addMessage('⏳ Grok sedang berpikir...', 'bot loading');

    try {
        // Panggil API Grok via x.ai
        const response = await callGrokAPI(message);
        
        // Hapus loading dan tampilkan respons
        removeLoadingMessage();
        addMessage(response, 'bot');
        
        // Simpan ke prompt.txt (simulasi)
        saveChatHistory(message, response);
        
    } catch (error) {
        removeLoadingMessage();
        addMessage('❌ Error: Gagal menghubungi AI. Coba lagi nanti.', 'bot error');
        console.error('API Error:', error);
        
        // Kembalikan token jika error
        currentUser.tokens += 1;
        updateUserData();
        updateTokenDisplay();
    }
}

async function callGrokAPI(userMessage) {
    // Load system prompt dari prompt.txt
    let systemPrompt = await loadPromptFromFile();
    
    // Fallback jika prompt tidak ada
    if (!systemPrompt) {
        systemPrompt = "You are Grok, a highly intelligent, helpful AI assistant created by xAI. Respond in the same language as the user's query.";
    }

    const requestBody = {
        model: "grok-4-1-fast-reasoning",
        input: [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: userMessage
            }
        ]
    };

    try {
        const response = await fetch('https://api.x.ai/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${XAI_API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        return data.output?.[0]?.content || 'Tidak ada respons dari AI.';
        
    } catch (error) {
        console.error('Grok API Error:', error);
        throw error;
    }
}

function addMessage(content, type) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = type === 'user' ? '👤' : '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeLoadingMessage() {
    const messages = document.getElementById('chat-messages');
    const loadingMsg = messages?.querySelector('.message.loading');
    if (loadingMsg) loadingMsg.remove();
}

function updateTokenDisplay() {
    const tokenSpan = document.getElementById('token-count');
    if (tokenSpan && currentUser) {
        tokenSpan.textContent = currentUser.tokens;
    }
}

function updateUserData() {
    // Update di array users
    const userIndex = users.findIndex(u => u.username === currentUser.username);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
    }
    
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

// ================ PROMPT MANAGEMENT ================
async function loadPromptFromFile() {
    try {
        const response = await fetch('prompt.txt');
        if (response.ok) {
            return await response.text();
        }
        return null;
    } catch (error) {
        console.log('Prompt file not found, using default');
        return null;
    }
}

function savePrompt() {
    if (!isAdmin()) {
        alert('Akses ditolak! Hanya admin (kaizer) yang bisa mengelola prompt.');
        return;
    }

    const content = document.getElementById('prompt-content')?.value;
    if (!content) return;

    // Simpan ke localStorage (simulasi file)
    localStorage.setItem('systemPrompt', content);
    
    // Buat file untuk di-download (opsional)
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompt.txt';
    a.click();
    
    alert('Prompt berhasil disimpan!');
}

function loadPrompt() {
    if (!isAdmin()) {
        alert('Akses ditolak! Hanya admin (kaizer) yang bisa mengelola prompt.');
        return;
    }

    const savedPrompt = localStorage.getItem('systemPrompt');
    const textarea = document.getElementById('prompt-content');
    
    if (textarea) {
        if (savedPrompt) {
            textarea.value = savedPrompt;
        } else {
            textarea.value = 'You are Grok, a highly intelligent, helpful AI assistant.';
        }
    }
}

function deletePrompt() {
    if (!isAdmin()) {
        alert('Akses ditolak! Hanya admin (kaizer) yang bisa menghapus prompt.');
        return;
    }

    if (confirm('Hapus prompt?')) {
        localStorage.removeItem('systemPrompt');
        document.getElementById('prompt-content').value = '';
        alert('Prompt dihapus!');
    }
}

function saveChatHistory(userMsg, botMsg) {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    history.push({
        user: currentUser?.username,
        userMsg: userMsg,
        botMsg: botMsg,
        timestamp: new Date().toISOString()
    });
    
    // Simpan maksimal 100 pesan terakhir
    if (history.length > 100) history.shift();
    localStorage.setItem('chatHistory', JSON.stringify(history));
}

// ================ ADMIN FUNCTIONS ================
function isAdmin() {
    return currentUser && currentUser.role === 'admin' && currentUser.username === 'kaizer';
}

function addTokens() {
    if (!isAdmin()) {
        alert('Akses ditolak! Hanya admin (kaizer) yang bisa menambah token.');
        return;
    }

    const username = document.getElementById('token-username')?.value;
    const amount = parseInt(document.getElementById('token-amount')?.value);

    if (!username || !amount || amount <= 0) {
        alert('Username dan jumlah token valid diperlukan!');
        return;
    }

    const user = users.find(u => u.username === username);
    if (user) {
        user.tokens += amount;
        localStorage.setItem('users', JSON.stringify(users));
        
        // Update jika user sedang login
        if (currentUser && currentUser.username === username) {
            currentUser.tokens = user.tokens;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        alert(`✅ Berhasil menambah ${amount} token untuk ${username}`);
        refreshUserList();
    } else {
        alert('User tidak ditemukan!');
    }
}

function reduceTokens() {
    if (!isAdmin()) {
        alert('Akses ditolak! Hanya admin (kaizer) yang bisa mengurangi token.');
        return;
    }

    const username = document.getElementById('token-username')?.value;
    const amount = parseInt(document.getElementById('token-amount')?.value);

    if (!username || !amount || amount <= 0) {
        alert('Username dan jumlah token valid diperlukan!');
        return;
    }

    const user = users.find(u => u.username === username);
    if (user) {
        user.tokens = Math.max(0, user.tokens - amount);
        localStorage.setItem('users', JSON.stringify(users));
        
        // Update jika user sedang login
        if (currentUser && currentUser.username === username) {
            currentUser.tokens = user.tokens;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        alert(`✅ Berhasil mengurangi ${amount} token untuk ${username}`);
        refreshUserList();
    } else {
        alert('User tidak ditemukan!');
    }
}

function deleteAccount() {
    if (!isAdmin()) {
        alert('Akses ditolak! Hanya admin (kaizer) yang bisa menghapus akun.');
        return;
    }

    const username = document.getElementById('delete-username')?.value;

    if (!username) {
        alert('Username diperlukan!');
        return;
    }

    if (username === 'kaizer') {
        alert('Tidak bisa menghapus akun admin utama (kaizer)!');
        return;
    }

    if (confirm(`Yakin hapus akun ${username}?`)) {
        users = users.filter(u => u.username !== username);
        localStorage.setItem('users', JSON.stringify(users));
        
        alert(`✅ Akun ${username} berhasil dihapus!`);
        refreshUserList();
    }
}

function refreshUserList() {
    const userListDiv = document.getElementById('user-list');
    if (!userListDiv) return;

    let html = '';
    users.forEach(user => {
        // Tandai admin dengan icon khusus
        const adminIcon = user.role === 'admin' ? '👑 ' : '';
        html += `
            <div class="user-item">
                <span>${adminIcon}${user.username} (${user.role})</span>
                <span>💎 ${user.tokens}</span>
            </div>
        `;
    });
    
    userListDiv.innerHTML = html;
}

// ================ INITIALIZATION ================
document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi 3D untuk semua halaman
    init3D();
    
    // Cek current user
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    
    // Proteksi halaman admin
    if (filename === 'admin.html') {
        if (!currentUser || currentUser.username !== 'kaizer' || currentUser.role !== 'admin') {
            alert('Akses ditolak! Halaman ini hanya untuk admin (kaizer).');
            window.location.href = 'login.html';
            return;
        }
    }
    
    // Proteksi halaman chat (index)
    if (filename === 'index.html' || filename === '' || filename === 'chatbot-3d/') {
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }
    }
    
    // Set username display di chat
    const usernameSpan = document.getElementById('username-display');
    if (usernameSpan && currentUser) {
        usernameSpan.textContent = currentUser.username;
    }
    
    // Update token display
    updateTokenDisplay();
    
    // Load prompt di admin panel
    if (filename === 'admin.html') {
        loadPrompt();
        refreshUserList();
        
        // Tambahkan pesan selamat datang untuk kaizer
        const adminHeader = document.querySelector('.admin-container h1');
        if (adminHeader && currentUser) {
            adminHeader.innerHTML = `⚙️ Admin Panel - Welcome ${currentUser.username} 👑`;
        }
    }
    
    // Auto-resize textarea
    const textarea = document.getElementById('user-input');
    if (textarea) {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
    
    // Enter to send (Shift+Enter untuk new line)
    if (textarea) {
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});
