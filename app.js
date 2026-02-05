// Cấu hình
const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR0NTNc6hIENjmwHxmUX6kbtyFiZqf3g62WdzaYNclAep7h3sCZGsNyfejkn5MHsOLKuVyucYkuhtmd/pub?output=csv";
const CACHE_DURATION = 5 * 60 * 1000;

// Unsplash images theo category và gender
const PLACEHOLDER_IMAGES = {
    'ÁO_MALE': [
        'https://images.unsplash.com/photo-1520975916090-3105956dac38?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500&q=80',
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500&q=80',
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500&q=80'
    ],
    'ÁO_FEMALE': [
        'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500&q=80',
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500&q=80',
        'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500&q=80'
    ],
    'QUẦN_MALE': [
        'https://images.unsplash.com/photo-1542272604-787c3835535d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500&q=80',
        'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500&q=80',
        'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500&q=80'
    ],
    'QUẦN_FEMALE': [
        'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500&q=80',
        'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500&q=80',
        'https://images.unsplash.com/photo-1544441893-675973e31985?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500&q=80'
    ]
};

// Biến toàn cục
let productsData = [];
let filteredProducts = [];
let imageCache = new Map();
let currentFilters = {
    gender: [], category: [], size: [], status: []
};

// DOM Elements
const productsContainer = document.getElementById('productsContainer');
const productCount = document.getElementById('productCount');
const noProducts = document.getElementById('noProducts');

// Hàm khởi tạo
async function init() {
    addCustomStyles();
    await loadProductsData();
    renderProducts();
    setupEventListeners();
    updateProductCount();
}

// Hàm lấy dữ liệu từ Google Sheets
async function loadProductsData() {
    try {
        console.log("Đang tải dữ liệu từ Google Sheets...");
        
        // Sử dụng CORS proxy miễn phí
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        //const response = await fetch(proxyUrl + encodeURIComponent(GOOGLE_SHEETS_URL));
        const response = await fetch(GOOGLE_SHEETS_URL);
        
        if (!response.ok) throw new Error(`Lỗi: ${response.status}`);
        
        const csvText = await response.text();
        productsData = parseCSV(csvText);
        filteredProducts = [...productsData];
        
        console.log(`Đã tải ${productsData.length} sản phẩm`);
        
    } catch (error) {
        console.error("Lỗi:", error);
        showNotification("Không thể tải dữ liệu. Vui lòng thử lại sau.", "warning");
        
        // Dùng dữ liệu mẫu
        productsData = getSampleData();
        filteredProducts = [...productsData];
    }
}

// Hàm parse CSV đơn giản
function parseCSV(csvText) {
    const products = [];
    const lines = csvText.split('\n');
    
    // Header: STT,Category,Gender,Size,URL,Status,Notes
    const headers = lines[0].split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',');
        if (values.length >= 7) {
            const product = {
                id: parseInt(values[0]) || i,
                category: values[1]?.trim() || '',
                gender: values[2]?.trim() || '',
                size: values[3]?.trim() || '',
                url: values[4]?.trim() || '',
                status: values[5]?.trim() || '',
                notes: values[6]?.trim() || ''
            };
            
            products.push(product);
        }
    }
    
    return products;
}

// Hàm lấy placeholder image phù hợp
function getPlaceholderImage(category, gender) {
    const key = `${category}_${gender}`;
    const images = PLACEHOLDER_IMAGES[key] || 
                   PLACEHOLDER_IMAGES['ÁO_MALE']; // fallback
    
    // Trả về ảnh ngẫu nhiên từ mảng
    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
}

// Hàm render sản phẩm
function renderProducts() {
    productsContainer.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        noProducts.style.display = 'block';
        return;
    }
    
    noProducts.style.display = 'none';
    
    filteredProducts.forEach(product => {
        const productCard = createProductCard(product);
        productsContainer.appendChild(productCard);
    });
}

// Hàm tạo card sản phẩm
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const categoryText = product.category === 'ÁO' ? 'Áo' : 'Quần';
    const genderText = product.gender === 'MALE' ? 'Nam' : 'Nữ';
    const statusText = product.status === 'AVAILABLE' ? 'Còn hàng' : 'Đã bán';
    const statusClass = product.status === 'AVAILABLE' ? 'status-available' : 'status-sold';
    
    // Lấy placeholder image phù hợp
    const placeholderImage = getPlaceholderImage(product.category, product.gender);
    
    // Tạo Instagram embed URL
    const embedUrl = getInstagramEmbedUrl(product.url);
    
    card.innerHTML = `
        <div class="product-image">
            <div class="image-container">
                <img src="${embedUrl ? embedUrl : placeholderImage}" 
                     alt="${categoryText} ${genderText} size ${product.size}" 
                     class="product-img" 
                     loading="lazy">
                <div class="instagram-overlay">
                    <i class="fab fa-instagram"></i>
                    <span>Xem ảnh thật trên Instagram</span>
                </div>
            </div>
            <div class="product-status ${statusClass}">${statusText}</div>
        </div>
        <div class="product-info">
            <div class="product-title">
                <span>${categoryText} ${genderText}</span>
                <span class="product-category">${categoryText}</span>
            </div>
            <div class="product-details">
                <div class="product-detail">
                    <i class="fas fa-user"></i>
                    <span>${genderText}</span>
                </div>
                <div class="product-detail">
                    <i class="fas fa-ruler"></i>
                    <span>Size: ${product.size}</span>
                </div>
                <div class="product-detail">
                    <i class="fas fa-tag"></i>
                    <span>${statusText}</span>
                </div>
            </div>
            <p class="product-description">
                <strong>Ghi chú:</strong> ${product.notes || 'Không có ghi chú'}
            </p>
            <button class="btn-view-instagram" data-url="${product.url}">
                <i class="fab fa-instagram"></i> Xem bài viết Instagram
            </button>
        </div>
    `;
    
    // Sự kiện click
    const viewBtn = card.querySelector('.btn-view-instagram');
    viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.open(product.url, '_blank', 'noopener,noreferrer');
    });
    
    // Click vào card để xem ảnh lớn
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-view-instagram')) {
            openImageModal(product.url, placeholderImage, categoryText, genderText);
        }
    });
    
    return card;
}

// Hàm lấy Instagram embed URL
function getInstagramEmbedUrl(instagramUrl) {
    try {
        const postId = extractPostId(instagramUrl);
        if (postId) {
            return `https://www.instagram.com/2hand.tiemnhalac/p/${postId}/?utm_source=ig_embed&amp;utm_campaign=loading`;
        }
    } catch (e) {
        console.error('Lỗi parse URL:', e);
    }
    return null;
}

// Hàm trích xuất post ID
function extractPostId(url) {
    const match = url.match(/instagram\.com\/[^\/]+\/p\/([^\/\?]+)/);
    return match ? match[1] : null;
}

// Hàm mở modal xem ảnh
function openImageModal(instagramUrl, placeholderImage, category, gender) {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    
    const postId = extractPostId(instagramUrl);
    const embedUrl = postId ? 
        `https://www.instagram.com/p/${postId}/embed/captioned/` : 
        null;
    
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <button class="modal-close">
                <i class="fas fa-times"></i>
            </button>
            
            <div class="modal-header">
                <h3>${category} ${gender}</h3>
                <a href="${instagramUrl}" target="_blank" class="modal-instagram-link">
                    <i class="fab fa-instagram"></i> Mở trên Instagram
                </a>
            </div>
            
            <div class="modal-body">
                <div class="image-preview">
                    <img src="${placeholderImage}" alt="${category} ${gender}" id="modal-image">
                </div>
                
                ${embedUrl ? `
                <div class="instagram-embed-container">
                    <div class="embed-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Đang tải bài viết Instagram...</span>
                    </div>
                    <iframe src="${embedUrl}" 
                            frameborder="0" 
                            scrolling="no" 
                            allowtransparency="true"
                            onload="this.parentElement.querySelector('.embed-loading').style.display='none'">
                    </iframe>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Sự kiện đóng modal
    const closeBtn = modal.querySelector('.modal-close');
    const overlay = modal.querySelector('.modal-overlay');
    
    const closeModal = () => {
        modal.classList.add('closing');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = 'auto';
        }, 300);
    };
    
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    
    // Đóng bằng phím ESC
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

// Hàm setup
function setupEventListeners() {
    // Filter checkboxes
    document.querySelectorAll('.filter-checkbox input').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const id = this.id;
            
            if (id.includes('all') && this.checked) {
                const group = id.split('-')[1];
                document.querySelectorAll(`input[id^="filter-${group}-"]:not(#${id})`).forEach(cb => {
                    cb.checked = false;
                });
            }
            
            if (!id.includes('all') && this.checked) {
                const group = id.split('-')[1];
                const allCheckbox = document.getElementById(`filter-${group}-all`);
                if (allCheckbox) allCheckbox.checked = false;
            }
            
            filterProducts();
        });
    });
    
    // Reset filters
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // View controls
    document.getElementById('gridView').addEventListener('click', () => {
        productsContainer.className = 'products-container grid-view';
        document.getElementById('gridView').classList.add('active');
        document.getElementById('listView').classList.remove('active');
    });
    
    document.getElementById('listView').addEventListener('click', () => {
        productsContainer.className = 'products-container list-view';
        document.getElementById('listView').classList.add('active');
        document.getElementById('gridView').classList.remove('active');
    });
    
    // Refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.id = 'refreshDataBtn';
    refreshBtn.className = 'btn-refresh';
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Làm mới';
    refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
        
        await loadProductsData();
        filterProducts();
        
        setTimeout(() => {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Làm mới';
        }, 1000);
    });
    
    document.querySelector('.header-content').appendChild(refreshBtn);
}

// Filter functions
function filterProducts() {
    const genderFilters = getSelectedValues('gender');
    const categoryFilters = getSelectedValues('category');
    const sizeFilters = getSelectedValues('size');
    const statusFilters = getSelectedValues('status');
    
    currentFilters = {
        gender: genderFilters,
        category: categoryFilters,
        size: sizeFilters,
        status: statusFilters
    };
    
    filteredProducts = productsData.filter(product => {
        if (genderFilters.length > 0 && !genderFilters.includes('all')) {
            const genderText = product.gender === 'MALE' ? 'male' : 'female';
            if (!genderFilters.includes(genderText)) return false;
        }
        
        if (categoryFilters.length > 0 && !categoryFilters.includes('all')) {
            const categoryText = product.category === 'ÁO' ? 'ao' : 'quan';
            if (!categoryFilters.includes(categoryText)) return false;
        }
        
        if (sizeFilters.length > 0 && !sizeFilters.includes('all')) {
            if (!sizeFilters.includes(product.size.toLowerCase())) return false;
        }
        
        if (statusFilters.length > 0 && !statusFilters.includes('all')) {
            const statusText = product.status === 'AVAILABLE' ? 'available' : 'sold';
            if (!statusFilters.includes(statusText)) return false;
        }
        
        return true;
    });
    
    renderProducts();
    updateProductCount();
}

function getSelectedValues(type) {
    const checkboxes = document.querySelectorAll(`input[id^="filter-${type}-"]:checked`);
    return Array.from(checkboxes).map(cb => cb.id.replace(`filter-${type}-`, ''));
}

function resetFilters() {
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = checkbox.id.includes('all');
    });
    
    filteredProducts = [...productsData];
    renderProducts();
    updateProductCount();
}

function updateProductCount() {
    productCount.textContent = filteredProducts.length;
}

// Hàm hiển thị thông báo
function showNotification(message, type = "info") {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Thêm custom styles
function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Modal styles */
        .image-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1000;
        }
        
        .modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
        }
        
        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 800px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            animation: modalFadeIn 0.3s ease;
        }
        
        @keyframes modalFadeIn {
            from {
                opacity: 0;
                transform: translate(-50%, -48%);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
        }
        
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 1.3rem;
            color: #333;
        }
        
        .modal-instagram-link {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #E1306C;
            text-decoration: none;
            font-weight: 500;
            padding: 8px 16px;
            border-radius: 6px;
            border: 2px solid #E1306C;
            transition: all 0.3s;
        }
        
        .modal-instagram-link:hover {
            background: #E1306C;
            color: white;
        }
        
        .modal-close {
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(0, 0, 0, 0.5);
            border: none;
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            z-index: 1001;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            transition: background 0.3s;
        }
        
        .modal-close:hover {
            background: rgba(0, 0, 0, 0.7);
        }
        
        .modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        
        .image-preview {
            margin-bottom: 20px;
        }
        
        #modal-image {
            width: 100%;
            max-height: 400px;
            object-fit: contain;
            border-radius: 8px;
        }
        
        .instagram-embed-container {
            position: relative;
            width: 100%;
            min-height: 400px;
        }
        
        .instagram-embed-container iframe {
            width: 100%;
            height: 400px;
            border: none;
            border-radius: 8px;
        }
        
        .embed-loading {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #f8f8f8;
            color: #666;
            gap: 10px;
        }
        
        .image-container {
            position: relative;
            overflow: hidden;
        }
        
        .instagram-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            opacity: 0;
            transition: opacity 0.3s;
            gap: 10px;
            font-size: 0.9rem;
        }
        
        .product-card:hover .instagram-overlay {
            opacity: 1;
        }
        
        .instagram-overlay i {
            font-size: 2rem;
            color: #E1306C;
        }
        
        .btn-view-instagram {
            width: 100%;
            padding: 12px;
            background: linear-gradient(45deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D);
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-top: 15px;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .btn-view-instagram:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(225, 48, 108, 0.3);
        }
        
        @media (max-width: 768px) {
            .modal-content {
                width: 95%;
                height: 95vh;
            }
            
            #modal-image {
                max-height: 300px;
            }
            
            .instagram-embed-container iframe {
                height: 300px;
            }
        }
        
        .closing {
            animation: modalFadeOut 0.3s ease forwards;
        }
        
        @keyframes modalFadeOut {
            to {
                opacity: 0;
                transform: translate(-50%, -48%);
            }
        }
    `;
    document.head.appendChild(style);
}

// Dữ liệu mẫu
function getSampleData() {
    return [
        {
            id: 1, category: "QUẦN", gender: "MALE", size: "XS",
            url: "https://www.instagram.com/p/DUVF5iiEmtI/",
            status: "SOLD", notes: "hàng tặng"
        },
        {
            id: 2, category: "ÁO", gender: "FEMALE", size: "S",
            url: "https://www.instagram.com/p/DUVFTo5krJA/",
            status: "AVAILABLE", notes: "độ mới 98%"
        },
        {
            id: 3, category: "QUẦN", gender: "MALE", size: "M",
            url: "https://www.instagram.com/p/DUVFK4skhKx/",
            status: "SOLD", notes: "độ mới 99%"
        },
        {
            id: 4, category: "ÁO", gender: "FEMALE", size: "L",
            url: "https://www.instagram.com/p/DUVFCemkiCZ/",
            status: "AVAILABLE", notes: "độ mới 98%"
        },
        {
            id: 5, category: "QUẦN", gender: "MALE", size: "XL",
            url: "https://www.instagram.com/p/DUVE3F_ErZr/",
            status: "SOLD", notes: "độ mới 98%"
        },
        {
            id: 6, category: "ÁO", gender: "FEMALE", size: "XXL",
            url: "https://www.instagram.com/p/DUVEwgWEtib/",
            status: "AVAILABLE", notes: "độ mới 98%"
        }
    ];
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', init);