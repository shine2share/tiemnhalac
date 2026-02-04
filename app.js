// Cấu hình
const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR0NTNc6hIENjmwHxmUX6kbtyFiZqf3g62WdzaYNclAep7h3sCZGsNyfejkn5MHsOLKuVyucYkuhtmd/pub?output=csv";
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút cache
const INSTAGRAM_EMBED_URL = "https://www.instagram.com/p/";
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300&q=80";

// Biến toàn cục
let productsData = [];
let filteredProducts = [];
let currentFilters = {
    gender: [],
    category: [],
    size: [],
    status: []
};
let lastFetchTime = 0;

// DOM Elements
const productsContainer = document.getElementById('productsContainer');
const productCount = document.getElementById('productCount');
const noProducts = document.getElementById('noProducts');
const gridViewBtn = document.getElementById('gridView');
const listViewBtn = document.getElementById('listView');
const resetFiltersBtn = document.getElementById('resetFilters');

// Hàm khởi tạo
async function init() {
    await loadProductsData();
    renderProducts();
    setupEventListeners();
    updateProductCount();
    
    // Tự động refresh dữ liệu mỗi 5 phút
    setInterval(async () => {
        await loadProductsData(true);
        filterProducts();
    }, CACHE_DURATION);
}

// Hàm lấy dữ liệu từ Google Sheets
async function loadProductsData(forceRefresh = false) {
    const now = Date.now();
    
    if (!forceRefresh && now - lastFetchTime < CACHE_DURATION && productsData.length > 0) {
        console.log("Đang sử dụng dữ liệu cache...");
        return;
    }
    
    try {
        console.log("Đang tải dữ liệu từ Google Sheets...");
        
        // Sử dụng proxy để tránh CORS issues trên GitHub Pages
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const response = await fetch(proxyUrl + encodeURIComponent(GOOGLE_SHEETS_URL));
        
        if (!response.ok) {
            throw new Error(`Lỗi khi tải dữ liệu: ${response.status}`);
        }
        
        const csvText = await response.text();
        productsData = parseCSV(csvText);
        
        console.log(`Đã tải ${productsData.length} sản phẩm`);
        lastFetchTime = now;
        filteredProducts = [...productsData];
        
        if (forceRefresh) {
            resetFilters();
        }
        
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
        
        if (productsData.length === 0) {
            productsData = getSampleData();
            filteredProducts = [...productsData];
        }
        
        showNotification("Không thể tải dữ liệu mới. Đang sử dụng dữ liệu cache.", "warning");
    }
}

// Hàm parse CSV
function parseCSV(csvText) {
    const products = [];
    
    try {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(header => header.trim());
        
        const sttIndex = headers.findIndex(h => h.toUpperCase() === 'STT');
        const categoryIndex = headers.findIndex(h => h.toUpperCase().includes('CATEGORY'));
        const genderIndex = headers.findIndex(h => h.toUpperCase().includes('GENDER'));
        const sizeIndex = headers.findIndex(h => h.toUpperCase().includes('SIZE'));
        const urlIndex = headers.findIndex(h => h.toUpperCase().includes('URL'));
        const statusIndex = headers.findIndex(h => h.toUpperCase().includes('STATUS'));
        const notesIndex = headers.findIndex(h => h.toUpperCase().includes('NOTES'));
        
        if (sttIndex === -1 || categoryIndex === -1 || genderIndex === -1 || 
            sizeIndex === -1 || urlIndex === -1 || statusIndex === -1) {
            throw new Error("CSV không có đầy đủ các cột cần thiết");
        }
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Xử lý CSV với regex để hỗ trợ các trường có dấu phẩy
            const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
            let match;
            const fields = [];
            
            while ((match = regex.exec(line)) !== null) {
                if (match[1]) {
                    let field = match[1];
                    if (field.startsWith('"') && field.endsWith('"')) {
                        field = field.slice(1, -1).replace(/""/g, '"');
                    }
                    fields.push(field.trim());
                }
            }
            
            if (fields.length >= 7) {
                const product = {
                    id: parseInt(fields[sttIndex]) || i,
                    category: fields[categoryIndex] || '',
                    gender: fields[genderIndex] || '',
                    size: fields[sizeIndex] || '',
                    url: fields[urlIndex] || '',
                    status: fields[statusIndex] || '',
                    notes: fields[notesIndex] || ''
                };
                
                if (product.url && product.url.includes('instagram.com')) {
                    products.push(product);
                }
            }
        }
        
        console.log(`Đã parse được ${products.length} sản phẩm từ CSV`);
        
    } catch (error) {
        console.error("Lỗi khi parse CSV:", error);
        return [];
    }
    
    return products;
}

// Hàm lấy dữ liệu mẫu
function getSampleData() {
    return [
        {
            id: 1,
            category: "QUẦN",
            gender: "MALE",
            size: "XS",
            url: "https://www.instagram.com/p/DUVF5iiEmtI/",
            status: "SOLD",
            notes: "hàng tặng"
        },
        {
            id: 2,
            category: "ÁO",
            gender: "FEMALE",
            size: "S",
            url: "https://www.instagram.com/p/DUVFTo5krJA/",
            status: "AVAILABLE",
            notes: "độ mới 98%"
        },
        {
            id: 3,
            category: "QUẦN",
            gender: "MALE",
            size: "M",
            url: "https://www.instagram.com/p/DUVFK4skhKx/",
            status: "SOLD",
            notes: "độ mới 99%"
        },
        {
            id: 4,
            category: "ÁO",
            gender: "FEMALE",
            size: "L",
            url: "https://www.instagram.com/p/DUVFCemkiCZ/",
            status: "AVAILABLE",
            notes: "độ mới 98%"
        },
        {
            id: 5,
            category: "QUẦN",
            gender: "MALE",
            size: "XL",
            url: "https://www.instagram.com/p/DUVE3F_ErZr/",
            status: "SOLD",
            notes: "độ mới 98%"
        },
        {
            id: 6,
            category: "ÁO",
            gender: "FEMALE",
            size: "XXL",
            url: "https://www.instagram.com/p/DUVEwgWEtib/",
            status: "AVAILABLE",
            notes: "độ mới 98%"
        }
    ];
}

// Hàm lấy Instagram image URL từ post URL
function getInstagramImageUrl(instagramUrl) {
    try {
        // Trích xuất post ID từ URL Instagram
        const urlParts = instagramUrl.split('/');
        const postId = urlParts[urlParts.length - 2];
        
        if (!postId) return PLACEHOLDER_IMAGE;
        
        // Sử dụng Instagram oEmbed API để lấy thông tin hình ảnh
        // Lưu ý: Instagram API có giới hạn, nên chúng ta sẽ sử dụng proxy
        const proxyUrl = 'https://api.allorigins.win/get?url=';
        const oembedUrl = `https://www.instagram.com/p/${postId}/media/?size=m`;
        
        return oembedUrl;
        
    } catch (error) {
        console.error("Lỗi khi xử lý URL Instagram:", error);
        return PLACEHOLDER_IMAGE;
    }
}

// Hàm tải hình ảnh với fallback
async function loadProductImage(product) {
    try {
        const imageUrl = getInstagramImageUrl(product.url);
        
        // Tạo một promise để kiểm tra hình ảnh
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(imageUrl);
            img.onerror = () => {
                console.log(`Không thể tải hình ảnh từ ${imageUrl}, sử dụng placeholder`);
                resolve(PLACEHOLDER_IMAGE);
            };
            img.src = imageUrl;
        });
        
    } catch (error) {
        console.error("Lỗi khi tải hình ảnh:", error);
        return PLACEHOLDER_IMAGE;
    }
}

// Hàm hiển thị thông báo
function showNotification(message, type = "info") {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        </div>
    `;
    
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-left: 4px solid #6c5ce7;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border-radius: 8px;
                padding: 15px;
                z-index: 1000;
                max-width: 350px;
                animation: slideIn 0.3s ease;
            }
            .notification-warning {
                border-left-color: #f39c12;
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .notification-content i {
                font-size: 1.2rem;
            }
            .notification-warning .notification-content i {
                color: #f39c12;
            }
            .notification-content span {
                flex: 1;
                font-size: 0.9rem;
            }
            .notification-close {
                background: none;
                border: none;
                color: #777;
                cursor: pointer;
                font-size: 1rem;
                padding: 0;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
    
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
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
    
    // Hiển thị loading skeleton
    showProductSkeletons();
    
    // Tải và hiển thị từng sản phẩm
    for (const product of filteredProducts) {
        const productCard = await createProductCard(product);
        productsContainer.appendChild(productCard);
    }
    
    // Xóa skeleton nếu còn
    const skeletons = document.querySelectorAll('.product-skeleton');
    skeletons.forEach(skeleton => skeleton.remove());
}

// Hàm hiển thị skeleton loading
function showProductSkeletons() {
    const skeletonCount = Math.min(filteredProducts.length, 6);
    
    for (let i = 0; i < skeletonCount; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'product-skeleton';
        skeleton.innerHTML = `
            <div class="skeleton-image"></div>
            <div class="skeleton-info">
                <div class="skeleton-line skeleton-title"></div>
                <div class="skeleton-line skeleton-detail"></div>
                <div class="skeleton-line skeleton-detail"></div>
                <div class="skeleton-line skeleton-description"></div>
            </div>
        `;
        productsContainer.appendChild(skeleton);
    }
}

// Hàm tạo card sản phẩm
async function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const categoryText = product.category === 'ÁO' ? 'Áo' : (product.category === 'QUẦN' ? 'Quần' : product.category);
    const genderText = product.gender === 'MALE' ? 'Nam' : (product.gender === 'FEMALE' ? 'Nữ' : product.gender);
    const statusText = product.status === 'AVAILABLE' ? 'Còn hàng' : 'Đã bán';
    const statusClass = product.status === 'AVAILABLE' ? 'status-available' : 'status-sold';
    
    // Tải hình ảnh
    const imageUrl = await loadProductImage(product);
    
    card.innerHTML = `
        <div class="product-image">
            <img src="${imageUrl}" alt="${categoryText} ${genderText} size ${product.size}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMAGE}'">
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
            <div class="product-instagram">
                <i class="fab fa-instagram"></i>
                <span>Xem trên Instagram</span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', (e) => {
        // Không mở link khi click vào các phần tử không phải là card chính
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('button') || e.target.closest('a')) {
            return;
        }
        
        if (product.url && product.url.includes('instagram.com')) {
            window.open(product.url, '_blank');
        }
    });
    
    return card;
}

// Các hàm còn lại giữ nguyên...
// [Các hàm updateProductCount, filterProducts, getSelectedValues, resetFilters, refreshData, setupEventListeners vẫn giữ nguyên như code trước]

// Hàm cập nhật số lượng sản phẩm
function updateProductCount() {
    productCount.textContent = filteredProducts.length;
}

// Hàm lọc sản phẩm
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

// Hàm lấy giá trị từ các checkbox được chọn
function getSelectedValues(type) {
    const checkboxes = document.querySelectorAll(`input[id^="filter-${type}-"]:checked`);
    return Array.from(checkboxes).map(cb => {
        const id = cb.id;
        return id.replace(`filter-${type}-`, '');
    });
}

// Hàm đặt lại bộ lọc
function resetFilters() {
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        if (checkbox.id.includes('all')) {
            checkbox.checked = true;
        } else {
            checkbox.checked = false;
        }
    });
    
    currentFilters = {
        gender: [],
        category: [],
        size: [],
        status: []
    };
    
    filteredProducts = [...productsData];
    renderProducts();
    updateProductCount();
}

// Hàm refresh dữ liệu thủ công
async function refreshData() {
    showNotification("Đang làm mới dữ liệu...", "info");
    await loadProductsData(true);
    showNotification("Đã cập nhật dữ liệu mới!", "info");
}

// Hàm thiết lập event listeners
function setupEventListeners() {
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
    
    resetFiltersBtn.addEventListener('click', resetFilters);
    
    gridViewBtn.addEventListener('click', () => {
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        productsContainer.classList.remove('list-view');
        productsContainer.classList.add('grid-view');
    });
    
    listViewBtn.addEventListener('click', () => {
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        productsContainer.classList.remove('grid-view');
        productsContainer.classList.add('list-view');
    });
    
    const mobileToggle = document.getElementById('mobileToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
        });
        
        window.addEventListener('resize', () => {
            if (window.innerWidth > 992) {
                sidebar.style.display = 'block';
            }
        });
    }
    
    const refreshBtn = document.createElement('button');
    refreshBtn.id = 'refreshDataBtn';
    refreshBtn.className = 'btn-refresh';
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Làm mới dữ liệu';
    refreshBtn.addEventListener('click', refreshData);
    
    const headerContent = document.querySelector('.header-content');
    if (headerContent) {
        headerContent.appendChild(refreshBtn);
        
        const style = document.createElement('style');
        style.textContent = `
            .btn-refresh {
                background-color: var(--secondary-color);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: var(--radius);
                font-size: 0.9rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s;
            }
            .btn-refresh:hover {
                background-color: #5b4fcf;
                transform: scale(1.05);
            }
            .btn-refresh i {
                transition: transform 0.5s;
            }
            .btn-refresh:active i {
                transform: rotate(360deg);
            }
            @media (max-width: 768px) {
                .btn-refresh {
                    padding: 6px 12px;
                    font-size: 0.8rem;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Khởi chạy ứng dụng
document.addEventListener('DOMContentLoaded', init);