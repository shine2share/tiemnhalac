// Cấu hình
const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR0NTNc6hIENjmwHxmUX6kbtyFiZqf3g62WdzaYNclAep7h3sCZGsNyfejkn5MHsOLKuVyucYkuhtmd/pub?output=csv";

// Biến toàn cục
let productsData = [];
let filteredProducts = [];
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
    hideSkeletonLoader();
    renderProducts();
    setupEventListeners();
    updateProductCount();
}

function hideSkeletonLoader() {
    const skeletonLoader = document.getElementById('skeletonLoader');
    if (skeletonLoader) {
        skeletonLoader.parentElement.innerHTML = '';
    }
}

// Hàm lấy dữ liệu
async function loadProductsData() {
    try {
        const response = await fetch(GOOGLE_SHEETS_URL);
        if (!response.ok) throw new Error(`Lỗi: ${response.status}`);
        
        const csvText = await response.text();
        productsData = parseCSV(csvText);
        filteredProducts = [...productsData];
        
        console.log(`Đã tải ${productsData.length} sản phẩm`);
        
    } catch (error) {
        console.error("Lỗi:", error);
        showNotification("Không thể tải dữ liệu. Vui lòng thử lại sau.", "warning");
        productsData = getSampleData();
        filteredProducts = [...productsData];
    }
}

function parseCSV(csvText) {
    const products = [];
    const lines = csvText.split('\n');
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

function extractPostId(url) {
    if (!url) return null;
    const match = url.match(/instagram\.com\/[^\/]+\/p\/([^\/\?]+)/);
    return match ? match[1] : null;
}

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

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const categoryText = product.category === 'ÁO' ? 'Áo' : 'Quần';
    const genderText = product.gender === 'MALE' ? 'Nam' : 'Nữ';
    const statusText = product.status === 'AVAILABLE' ? 'Còn hàng' : 'Đã bán';
    const statusClass = product.status === 'AVAILABLE' ? 'status-available' : 'status-sold';
    const postId = extractPostId(product.url);
    
    card.innerHTML = `
        <div class="instagram-embed-card">
            ${postId ? `
            <div class="instagram-embed-wrapper">
                <div class="instagram-embed-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Đang tải bài viết Instagram...</span>
                </div>
                <iframe src="https://www.instagram.com/p/${postId}/embed/captioned/" 
                        frameborder="0" 
                        scrolling="no" 
                        allowtransparency="true"
                        onload="this.parentElement.querySelector('.instagram-embed-loading').style.display='none'">
                </iframe>
                <div class="product-status ${statusClass}">${statusText}</div>
            </div>
            ` : `
            <div class="instagram-error">
                <i class="fab fa-instagram"></i>
                <p>Không có link Instagram</p>
                <div class="product-status ${statusClass}">${statusText}</div>
            </div>
            `}
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
                <div class="product-detail">
                    <i class="fas fa-hashtag"></i>
                    <span>ID: ${product.id}</span>
                </div>
            </div>
            
            ${product.notes ? `
            <p class="product-description">
                <strong>Ghi chú:</strong> ${product.notes}
            </p>
            ` : ''}
            
            ${product.url ? `
            <a href="${product.url}" target="_blank" class="instagram-link-btn">
                <i class="fab fa-instagram"></i> Xem bài viết Instagram
            </a>
            ` : ''}
        </div>
    `;
    
    return card;
}

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
    setTimeout(() => notification.remove(), 3000);
}

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
    
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
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

function getSampleData() {
    return [
        { id: 1, category: "QUẦN", gender: "MALE", size: "XS", url: "https://www.instagram.com/p/DUVF5iiEmtI/", status: "SOLD", notes: "hàng tặng" },
        { id: 2, category: "ÁO", gender: "FEMALE", size: "S", url: "https://www.instagram.com/p/DUVFTo5krJA/", status: "AVAILABLE", notes: "độ mới 98%" },
        { id: 3, category: "QUẦN", gender: "MALE", size: "M", url: "https://www.instagram.com/p/DUVFK4skhKx/", status: "SOLD", notes: "độ mới 99%" },
        { id: 4, category: "ÁO", gender: "FEMALE", size: "L", url: "https://www.instagram.com/p/DUVFCemkiCZ/", status: "AVAILABLE", notes: "độ mới 98%" },
        { id: 5, category: "QUẦN", gender: "MALE", size: "XL", url: "https://www.instagram.com/p/DUVE3F_ErZr/", status: "SOLD", notes: "độ mới 98%" },
        { id: 6, category: "ÁO", gender: "FEMALE", size: "XXL", url: "https://www.instagram.com/p/DUVEwgWEtib/", status: "AVAILABLE", notes: "độ mới 98%" }
    ];
}

document.addEventListener('DOMContentLoaded', init);