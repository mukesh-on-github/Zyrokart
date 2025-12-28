// ========================================== // script.js - ZyroKart Core Logic // ==========================================

// --- UTILITIES --- 
const getElement = (id) => document.getElementById(id); const queryAll = (selector) => document.querySelectorAll(selector);

// --- CONFIGURATION --- 
const API_BASE = "http://localhost:5000/api"; const STORAGE_KEYS = { THEME: 'zyrokart_theme', CART: 'zyrokart_cart', WISHLIST: 'zyrokart_wishlist' };

// --- INITIALIZATION --- 
document.addEventListener('DOMContentLoaded', () => { console.log('🚀 ZyroKart Initializing...');

// Initialize Systems
initializeTheme();
initializeZyroLens();
initializeAIChat();
initializeAuthUI();

// Load Content
loadProducts();
updateUIBadgeCounts();

console.log('✅ System Ready');
});

// --- THEME SYSTEM --- 
function initializeTheme() { const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'light'; const isDark = savedTheme === 'dark'; document.body.classList.toggle('dark-mode', isDark);

const btn = getElement('theme-toggle');
if (btn) {
    btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    btn.addEventListener('click', () => {
        const currentIsDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem(STORAGE_KEYS.THEME, currentIsDark ? 'dark' : 'light');
        btn.innerHTML = currentIsDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });
}
}

// --- ZYRO LENS (Visual Search) --- 
function initializeZyroLens() { const trigger = getElement('ai-lens-trigger'); const modal = getElement('lens-modal'); const closeBtn = document.querySelector('.close-modal'); const dropZone = getElement('drop-zone'); const fileInput = getElement('lens-input'); const previewImg = getElement('lens-preview'); const analyzeBtn = getElement('analyze-btn'); const previewBox = getElement('lens-preview-box'); // Changed ID to match HTML

if (!trigger || !modal) return;

// Toggle Modal
trigger.addEventListener('click', () => modal.classList.add('active'));
closeBtn?.addEventListener('click', () => modal.classList.remove('active'));

// File Selection
dropZone?.addEventListener('click', () => fileInput.click());

fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (previewImg) previewImg.src = event.target.result;
            if (previewBox) previewBox.classList.remove('hidden');
            if (dropZone) dropZone.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// Analyze Action
analyzeBtn?.addEventListener('click', () => {
    if (analyzeBtn) {
        analyzeBtn.innerHTML = 'Scanning...';
        analyzeBtn.disabled = true;
    }
    
    // Mock API Call
    setTimeout(() => {
        showToast('Match Found! Redirecting...', 'success');
        setTimeout(() => {
            if (modal) modal.classList.remove('active');
            if (analyzeBtn) {
                analyzeBtn.innerHTML = 'Start AI Scan';
                analyzeBtn.disabled = false;
            }
        }, 1000);
    }, 1500);
});
}

// --- SMART CHATBOT --- 
function initializeAIChat() { const trigger = getElement('ai-chat-bubble'); 
// Matches HTML ID 
const windowEl = getElement('ai-chat-box'); 
// Matches HTML ID 
const closeBtn = getElement('close-chat'); const sendBtn = getElement('chat-send');
// Matches HTML ID 
const input = getElement('chat-input'); const msgs = getElement('chat-msgs'); 
// Matches HTML ID

if (!trigger) return;

trigger.addEventListener('click', () => windowEl.classList.toggle('hidden'));
closeBtn?.addEventListener('click', () => windowEl.classList.add('hidden'));

const addMessage = (role, text) => {
    const div = document.createElement('div');
    div.className = role === 'user' ? 'user-msg' : 'ai-msg';
    div.textContent = text;
    // Simple styling for JS-generated messages
    div.style.marginBottom = '10px';
    div.style.padding = '8px 12px';
    div.style.borderRadius = '12px';
    div.style.maxWidth = '80%';
    div.style.alignSelf = role === 'user' ? 'flex-end' : 'flex-start';
    div.style.background = role === 'user' ? 'var(--primary)' : '#f0f0f0';
    div.style.color = role === 'user' ? '#fff' : '#000';
    
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
};

const handleSend = () => {
    const text = input.value.trim();
    if (!text) return;
    
    addMessage('user', text);
    input.value = '';
    
    // Mock AI Response
    setTimeout(() => {
        addMessage('bot', "I'm searching for that right now...");
    }, 800);
};

sendBtn?.addEventListener('click', handleSend);
input?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});
}

// --- PRODUCT LOADER --- 
function initializeProducts() { const grid = getElement('product-list'); // Matches HTML ID 
if (!grid) return;

const products = [
    { id: 1, name: "Zyro Headphones", price: 299, img: "[https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400](https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400)", tag: "Tech" },
    { id: 2, name: "Smart Watch V2", price: 199, img: "[https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400](https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400)", tag: "Wearables" },
    { id: 3, name: "Leather Bag", price: 89, img: "[https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400](https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400)", tag: "Fashion" },
    { id: 4, name: "Running Shoes", price: 140, img: "[https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400](https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400)", tag: "Sports" }
];

grid.innerHTML = products.map(p => `
    <div class="product-card">
        <div style="height: 250px; overflow: hidden; position: relative;">
            <img src="${p.img}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <div style="padding: 15px;">
            <span style="font-size: 0.8rem; background: #eee; padding: 2px 6px; border-radius: 4px;">${p.tag}</span>
            <h3 style="margin: 5px 0;">${p.name}</h3>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; color: var(--primary);">₹${p.price}</span>
                <button class="btn-primary" onclick="addToCart(${p.id})">Add</button>
            </div>
        </div>
    </div>
`).join('');
}

// --- AUTH UI --- 
function initializeAuthUI() { const loginBtn = getElement('login-btn'); loginBtn?.addEventListener('click', () => { showToast("Redirecting to Login...", "info"); }); }

// --- CART LOGIC --- 
window.addToCart = (id) => { let cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '[]'); cart.push(id); localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart)); updateUIBadgeCounts(); showToast("Added to Cart!", "success"); };

function updateUIBadgeCounts() { const cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '[]'); const badge = getElement('cart-count'); if (badge) badge.innerText = cart.length; }

// --- TOAST HELPER --- 
function showToast(msg, type) { const toast = getElement('toast'); const msgEl = getElement('toast-message'); if (!toast || !msgEl) return;

msgEl.innerText = msg;
toast.className = `toast show ${type}`; // Add type class if needed

setTimeout(() => {
    toast.classList.remove('show');
}, 3000);
}