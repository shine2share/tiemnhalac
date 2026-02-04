// Cấu hình
const GOOGLE_SHEETS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR0NTNc6hIENjmwHxmUX6kbtyFiZqf3g62WdzaYNclAep7h3sCZGsNyfejkn5MHsOLKuVyucYkuhtmd/pub?output=csv";
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút cache

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
        await loadProductsData(true); // Force refresh
        filterProducts(); // Áp dụng lại bộ lọc
    }, CACHE_DURATION);
}

// Hàm lấy dữ liệu từ Google Sheets
async function loadProductsData(forceRefresh = false) {
    const now = Date.now();
    
    // Kiểm tra cache nếu không force refresh
    if (!forceRefresh && now - lastFetchTime < CACHE_DURATION && productsData.length > 0) {
        console.log("Đang sử dụng dữ liệu cache...");
        return;
    }
    
    try {
        console.log("Đang tải dữ liệu từ Google Sheets...");
        
        // Sử dụng Google Sheets CSV export
        // LƯU Ý: Bạn cần thay thế URL này bằng URL từ tính năng "Publish to web" của Google Sheets
        const response = await fetch(GOOGLE_SHEETS_URL);
        
        if (!response.ok) {
            throw new Error(`Lỗi khi tải dữ liệu: ${response.status}`);
        }
        
        const csvText = await response.text();
        productsData = parseCSV(csvText);
        
        // Log để debug
        console.log(`Đã tải ${productsData.length} sản phẩm`);
        console.log("Mẫu dữ liệu:", productsData[0]);
        
        lastFetchTime = now;
        
        // Cập nhật filteredProducts
        filteredProducts = [...productsData];
        
        // Reset bộ lọc nếu đang force refresh
        if (forceRefresh) {
            resetFilters();
        }
        
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu từ Google Sheets:", error);
        
        // Nếu không lấy được dữ liệu online, sử dụng dữ liệu mẫu
        if (productsData.length === 0) {
            console.log("Sử dụng dữ liệu mẫu...");
            productsData = getSampleData();
            filteredProducts = [...productsData];
        }
        
        // Hiển thị thông báo lỗi
        showNotification("Không thể tải dữ liệu mới. Đang sử dụng dữ liệu cache.", "warning");
    }
}

// Hàm parse CSV từ Google Sheets
function parseCSV(csvText) {
    const products = [];
    
    try {
        // Tách thành các dòng
        const lines = csvText.split('\n');
        
        // Lấy header (dòng đầu tiên)
        const headers = lines[0].split(',').map(header => header.trim());
        
        // Tìm chỉ số của các cột
        const sttIndex = headers.findIndex(h => h.toUpperCase() === 'STT');
        const categoryIndex = headers.findIndex(h => h.toUpperCase() === 'CATEGORY');
        const genderIndex = headers.findIndex(h => h.toUpperCase() === 'GENDER');
        const sizeIndex = headers.findIndex(h => h.toUpperCase() === 'SIZE');
        const urlIndex = headers.findIndex(h => h.toUpperCase() === 'URL');
        const statusIndex = headers.findIndex(h => h.toUpperCase() === 'STATUS');
        const notesIndex = headers.findIndex(h => h.toUpperCase() === 'NOTES');
        
        // Kiểm tra nếu không tìm thấy các cột cần thiết
        if (sttIndex === -1 || categoryIndex === -1 || genderIndex === -1 || 
            sizeIndex === -1 || urlIndex === -1 || statusIndex === -1 || notesIndex === -1) {
            throw new Error("CSV không có đầy đủ các cột cần thiết");
        }
        
        // Xử lý từng dòng dữ liệu
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Xử lý CSV với các trường có dấu phẩy trong nội dung
            const regex = /(".*?"|[^",]+)(?=\s*,|\s*$)/g;
            const fields = [];
            let match;
            
            while ((match = regex.exec(line)) !== null) {
                let field = match[0];
                // Loại bỏ dấu ngoặc kép nếu có
                if (field.startsWith('"') && field.endsWith('"')) {
                    field = field.slice(1, -1);
                }
                fields.push(field.trim());
            }
            
            // Kiểm tra có đủ trường không
            if (fields.length >= 7) {
                const product = {
                    id: parseInt(fields[sttIndex]) || i,
                    category: fields[categoryIndex],
                    gender: fields[genderIndex],
                    size: fields[sizeIndex],
                    url: fields[urlIndex],
                    status: fields[statusIndex],
                    notes: fields[notesIndex]
                };
                
                // Chỉ thêm sản phẩm nếu có URL hợp lệ
                if (product.url && product.url.startsWith('http')) {
                    products.push(product);
                }
            }
        }
        
        console.log(`Đã parse được ${products.length} sản phẩm từ CSV`);
        
    } catch (error) {
        console.error("Lỗi khi parse CSV:", error);
        // Nếu có lỗi, trả về mảng rỗng
        return [];
    }
    
    return products;
}

// Hàm lấy dữ liệu mẫu (dùng khi không kết nối được)
function getSampleData() {
    return [
        {
            id: 1,
            category: "QUẦN",
            gender: "MALE",
            size: "XS",
            url: "https://www.instagram.com/2hand.tiemnhalac/p/DUVF5iiEmtI/",
            status: "SOLD",
            notes: "hàng tặng"
        },
        {
            id: 2,
            category: "ÁO",
            gender: "FEMALE",
            size: "S",
            url: "https://www.instagram.com/2hand.tiemnhalac/p/DUVFTo5krJA/",
            status: "AVAILABLE",
            notes: "độ mới 98%"
        },
        {
            id: 3,
            category: "QUẦN",
            gender: "MALE",
            size: "M",
            url: "https://www.instagram.com/2hand.tiemnhalac/p/DUVFK4skhKx/",
            status: "SOLD",
            notes: "độ mới 99%"
        },
        {
            id: 4,
            category: "ÁO",
            gender: "FEMALE",
            size: "L",
            url: "https://www.instagram.com/2hand.tiemnhalac/p/DUVFCemkiCZ/",
            status: "AVAILABLE",
            notes: "độ mới 98%"
        },
        {
            id: 5,
            category: "QUẦN",
            gender: "MALE",
            size: "XL",
            url: "https://www.instagram.com/2hand.tiemnhalac/p/DUVE3F_ErZr/",
            status: "SOLD",
            notes: "độ mới 98%"
        },
        {
            id: 6,
            category: "ÁO",
            gender: "FEMALE",
            size: "XXL",
            url: "https://www.instagram.com/2hand.tiemnhalac/p/DUVEwgWEtib/",
            status: "AVAILABLE",
            notes: "độ mới 98%"
        }
    ];
}

// Hàm hiển thị thông báo
function showNotification(message, type = "info") {
    // Kiểm tra xem đã có thông báo chưa
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
    
    // Thêm CSS cho notification nếu chưa có
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
    
    // Tự động ẩn sau 5 giây
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
    
    // Sự kiện đóng thông báo
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
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
    
    // Chuyển đổi dữ liệu để hiển thị
    const categoryText = product.category === 'ÁO' ? 'Áo' : (product.category === 'QUẦN' ? 'Quần' : product.category);
    const genderText = product.gender === 'MALE' ? 'Nam' : (product.gender === 'FEMALE' ? 'Nữ' : product.gender);
    const statusText = product.status === 'AVAILABLE' ? 'Còn hàng' : 'Đã bán';
    const statusClass = product.status === 'AVAILABLE' ? 'status-available' : 'status-sold';
    
    // Tạo URL ảnh placeholder với thông tin sản phẩm
    const imageUrl = `https://placehold.co/400x300/6c5ce7/ffffff?text=${encodeURIComponent(categoryText)}+${product.size}`;
    
    card.innerHTML = `
        <div class="product-image">
            <img src="${imageUrl}" alt="${categoryText} ${genderText} size ${product.size}" loading="lazy">
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
        </div>
    `;
    
    // Thêm sự kiện click để mở link Instagram
    card.addEventListener('click', () => {
        if (product.url && product.url.startsWith('http')) {
            window.open(product.url, '_blank');
        }
    });
    
    return card;
}

// Hàm cập nhật số lượng sản phẩm
function updateProductCount() {
    productCount.textContent = filteredProducts.length;
}

// Hàm lọc sản phẩm
function filterProducts() {
    // Lấy giá trị từ các checkbox
    const genderFilters = getSelectedValues('gender');
    const categoryFilters = getSelectedValues('category');
    const sizeFilters = getSelectedValues('size');
    const statusFilters = getSelectedValues('status');
    
    // Lưu filters hiện tại
    currentFilters = {
        gender: genderFilters,
        category: categoryFilters,
        size: sizeFilters,
        status: statusFilters
    };
    
    // Áp dụng bộ lọc
    filteredProducts = productsData.filter(product => {
        // Lọc theo giới tính
        if (genderFilters.length > 0 && !genderFilters.includes('all')) {
            const genderText = product.gender === 'MALE' ? 'male' : 'female';
            if (!genderFilters.includes(genderText)) return false;
        }
        
        // Lọc theo loại sản phẩm
        if (categoryFilters.length > 0 && !categoryFilters.includes('all')) {
            const categoryText = product.category === 'ÁO' ? 'ao' : 'quan';
            if (!categoryFilters.includes(categoryText)) return false;
        }
        
        // Lọc theo kích cỡ
        if (sizeFilters.length > 0 && !sizeFilters.includes('all')) {
            if (!sizeFilters.includes(product.size.toLowerCase())) return false;
        }
        
        // Lọc theo tình trạng
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
    // Reset tất cả checkbox về trạng thái mặc định
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        if (checkbox.id.includes('all')) {
            checkbox.checked = true;
        } else {
            checkbox.checked = false;
        }
    });
    
    // Reset bộ lọc
    currentFilters = {
        gender: [],
        category: [],
        size: [],
        status: []
    };
    
    // Hiển thị tất cả sản phẩm
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
    // Sự kiện cho các checkbox filter
    document.querySelectorAll('.filter-checkbox input').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const id = this.id;
            
            // Nếu chọn "Tất cả" thì bỏ chọn các option khác trong nhóm
            if (id.includes('all') && this.checked) {
                const group = id.split('-')[1];
                document.querySelectorAll(`input[id^="filter-${group}-"]:not(#${id})`).forEach(cb => {
                    cb.checked = false;
                });
            }
            
            // Nếu chọn một option cụ thể thì bỏ chọn "Tất cả"
            if (!id.includes('all') && this.checked) {
                const group = id.split('-')[1];
                const allCheckbox = document.getElementById(`filter-${group}-all`);
                if (allCheckbox) allCheckbox.checked = false;
            }
            
            // Áp dụng bộ lọc
            filterProducts();
        });
    });
    
    // Sự kiện cho nút reset
    resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Sự kiện cho chế độ xem
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
    
    // Sự kiện cho mobile toggle
    const mobileToggle = document.getElementById('mobileToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
        });
        
        // Đảm bảo sidebar hiển thị đúng trên desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 992) {
                sidebar.style.display = 'block';
            }
        });
    }
    
    // Thêm nút refresh dữ liệu
    const refreshBtn = document.createElement('button');
    refreshBtn.id = 'refreshDataBtn';
    refreshBtn.className = 'btn-refresh';
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Làm mới dữ liệu';
    refreshBtn.addEventListener('click', refreshData);
    
    // Thêm nút vào header
    const headerContent = document.querySelector('.header-content');
    if (headerContent) {
        headerContent.appendChild(refreshBtn);
        
        // Thêm CSS cho nút refresh
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

// Khởi chạy ứng dụng khi trang đã tải xong
document.addEventListener('DOMContentLoaded', init);