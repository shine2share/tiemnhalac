// Cấu hình
const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR0NTNc6hIENjmwHxmUX6kbtyFiZqf3g62WdzaYNclAep7h3sCZGsNyfejkn5MHsOLKuVyucYkuhtmd/pub?output=csv";
const CACHE_DURATION = 5 * 60 * 1000;
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=500&q=80";

// Biến toàn cục
let productsData = [];
let filteredProducts = [];
let imageCache = new Map(); // Cache hình ảnh
let currentFilters = {
    gender: [], category: [], size: [], status: []
};

// DOM Elements
const productsContainer = document.getElementById('productsContainer');
const productCount = document.getElementById('productCount');
const noProducts = document.getElementById('noProducts');

// Hàm khởi tạo
async function init() {
    await loadProductsData();
    renderProducts();
    setupEventListeners();
    updateProductCount();
}

// Hàm lấy dữ liệu từ Google Sheets
async function loadProductsData() {
    try {
        console.log("Đang tải dữ liệu từ Google Sheets...");
        
        // Sử dụng CORS proxy cho GitHub Pages
        const proxyUrl = 'https://corsproxy.io/?';
        const response = await fetch(proxyUrl + encodeURIComponent(GOOGLE_SHEETS_URL));
        
        if (!response.ok) throw new Error(`Lỗi: ${response.status}`);
        
        const csvText = await response.text();
        productsData = parseCSV(csvText);
        filteredProducts = [...productsData];
        
        console.log(`Đã tải ${productsData.length} sản phẩm`);
        
    } catch (error) {
        console.error("Lỗi:", error);
        productsData = getSampleData();
        filteredProducts = [...productsData];
        showNotification("Đang sử dụng dữ liệu mẫu", "warning");
    }
}

// Hàm parse CSV
function parseCSV(csvText) {
    const products = [];
    const lines = csvText.split('\n');
    
    // Skip header và xử lý từ dòng 2
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Đơn giản hóa: split bằng dấu phẩy
        const fields = line.split(',').map(f => f.trim());
        
        if (fields.length >= 6) {
            const product = {
                id: i,
                category: fields[0] || '',
                gender: fields[1] || '',
                size: fields[2] || '',
                url: fields[3] || '',
                status: fields[4] || '',
                notes: fields[5] || ''
            };
            
            if (product.url.includes('instagram.com')) {
                products.push(product);
            }
        }
    }
    
    return products;
}

// Hàm lấy thumbnail từ Instagram sử dụng oEmbed
async function getInstagramThumbnail(instagramUrl) {
    try {
        // Kiểm tra cache trước
        if (imageCache.has(instagramUrl)) {
            return imageCache.get(instagramUrl);
        }
        
        // Trích xuất post ID
        const postId = extractInstagramPostId(instagramUrl);
        if (!postId) return PLACEHOLDER_IMAGE;
        
        // Sử dụng oEmbed endpoint
        const oembedUrl = `https://www.instagram.com/p/${postId}/embed/captioned/`;
        
        // Tạo iframe để lấy thumbnail
        // Phương pháp này sẽ tải trang embed và trích xuất hình ảnh
        const thumbnailUrl = await getThumbnailViaEmbed(oembedUrl, postId);
        
        // Cache kết quả
        imageCache.set(instagramUrl, thumbnailUrl);
        return thumbnailUrl;
        
    } catch (error) {
        console.error("Lỗi lấy thumbnail:", error);
        return PLACEHOLDER_IMAGE;
    }
}

// Hàm trích xuất post ID từ URL
function extractInstagramPostId(url) {
    try {
        const match = url.match(/instagram\.com\/p\/([^\/]+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

// Phương pháp sử dụng embed để lấy thumbnail
function getThumbnailViaEmbed(oembedUrl, postId) {
    return new Promise((resolve) => {
        // Tạo một iframe ẩn
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.src = oembedUrl;
        
        // Sử dụng fallback URL dựa trên postId
        // Instagram thường có pattern cho thumbnail
        const fallbackUrl = `https://instagram.com/p/${postId}/media/?size=m`;
        
        // Đặt timeout
        const timeout = setTimeout(() => {
            document.body.removeChild(iframe);
            resolve(fallbackUrl);
        }, 3000);
        
        iframe.onload = () => {
            clearTimeout(timeout);
            try {
                // Cố gắng lấy hình ảnh từ iframe
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const img = iframeDoc.querySelector('img');
                
                if (img && img.src) {
                    resolve(img.src);
                } else {
                    resolve(fallbackUrl);
                }
            } catch (e) {
                resolve(fallbackUrl);
            }
            
            document.body.removeChild(iframe);
        };
        
        iframe.onerror = () => {
            clearTimeout(timeout);
            resolve(fallbackUrl);
            document.body.removeChild(iframe);
        };
        
        document.body.appendChild(iframe);
    });
}

// Hàm render sản phẩm
async function renderProducts() {
    productsContainer.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        noProducts.style.display = 'block';
        return;
    }
    
    noProducts.style.display = 'none';
    
    // Hiển thị tất cả sản phẩm với placeholder trước
    filteredProducts.forEach(product => {
        const productCard = createProductCardSkeleton(product);
        productsContainer.appendChild(productCard);
    });
    
    // Sau đó tải hình ảnh từng cái một
    await loadImagesSequentially();
}

// Tạo card skeleton trước
function createProductCardSkeleton(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id;
    
    const categoryText = product.category === 'ÁO' ? 'Áo' : 'Quần';
    const genderText = product.gender === 'MALE' ? 'Nam' : 'Nữ';
    const statusText = product.status === 'AVAILABLE' ? 'Còn hàng' : 'Đã bán';
    const statusClass = product.status === 'AVAILABLE' ? 'status-available' : 'status-sold';
    
    card.innerHTML = `
        <div class="product-image">
            <div class="image-placeholder">
                <i class="fas fa-spinner fa-spin"></i>
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
            <div class="instagram-link">
                <i class="fab fa-instagram"></i>
                <span>Xem trên Instagram</span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => {
        window.open(product.url, '_blank');
    });
    
    return card;
}

// Tải hình ảnh tuần tự
async function loadImagesSequentially() {
    const cards = document.querySelectorAll('.product-card');
    
    for (const card of cards) {
        const productId = card.dataset.productId;
        const product = filteredProducts.find(p => p.id == productId);
        
        if (product) {
            try {
                const thumbnailUrl = await getInstagramThumbnail(product.url);
                await updateCardImage(card, thumbnailUrl);
            } catch (error) {
                console.error(`Lỗi tải hình ảnh cho sản phẩm ${productId}:`, error);
                await updateCardImage(card, PLACEHOLDER_IMAGE);
            }
            
            // Delay giữa các request để tránh bị block
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

// Cập nhật hình ảnh cho card
async function updateCardImage(card, imageUrl) {
    const imageContainer = card.querySelector('.product-image');
    const placeholder = card.querySelector('.image-placeholder');
    
    if (placeholder) {
        // Tạo thẻ img mới
        const img = new Image();
        img.src = imageUrl;
        img.alt = 'Sản phẩm';
        img.className = 'product-img';
        
        img.onload = () => {
            placeholder.remove();
            imageContainer.insertBefore(img, imageContainer.firstChild);
            img.style.opacity = '0';
            
            // Hiệu ứng fade in
            setTimeout(() => {
                img.style.transition = 'opacity 0.5s ease';
                img.style.opacity = '1';
            }, 10);
        };
        
        img.onerror = () => {
            placeholder.innerHTML = '<i class="fas fa-image"></i>';
            placeholder.style.background = '#f0f0f0';
            placeholder.style.color = '#999';
        };
    }
}

// Thêm CSS cho placeholder
function addCustomStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .image-placeholder {
            width: 100%;
            height: 250px;
            background: linear-gradient(45deg, #f6f6f6 25%, #ffffff 25%, #ffffff 50%, #f6f6f6 50%, #f6f6f6 75%, #ffffff 75%, #ffffff);
            background-size: 40px 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ddd;
            font-size: 2rem;
        }
        
        .product-img {
            width: 100%;
            height: 250px;
            object-fit: cover;
            display: block;
        }
        
        .instagram-link {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #E1306C;
            font-size: 0.9rem;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #eee;
        }
        
        .instagram-link i {
            font-size: 1.1rem;
        }
        
        .fa-spin {
            animation: fa-spin 2s infinite linear;
        }
        
        @keyframes fa-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
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
    });
    
    document.getElementById('listView').addEventListener('click', () => {
        productsContainer.className = 'products-container list-view';
    });
    
    // Refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.id = 'refreshDataBtn';
    refreshBtn.className = 'btn-refresh';
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Làm mới';
    refreshBtn.addEventListener('click', () => {
        location.reload();
    });
    
    document.querySelector('.header-content').appendChild(refreshBtn);
}

// Các hàm filter khác giữ nguyên
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
        // ... thêm các sản phẩm khác
    ];
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
    addCustomStyles();
    init();
});