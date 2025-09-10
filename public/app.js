// TapGo 線上點餐系統前端邏輯
class TapGoApp {
    constructor() {
        this.menuData = {};
        this.cart = JSON.parse(localStorage.getItem('tapgo-cart') || '{}');
        this.currentItem = null;
        this.currentQuantity = 1;
        this.ORDER_LIMIT = 600; // 預設金額上限，將從 data.json 載入
        this.ORDER_LIMIT_MESSAGE = '每人點餐金額上限600元，不夠再加點'; // 預設訊息
        
        this.initializeElements();
        this.bindEvents();
        this.loadMenu();
        this.updateCartBadge();
        this.loadSavedCustomerName();
    }

    initializeElements() {
        // Main elements
        this.menuContainer = document.getElementById('menuContainer');
        this.cartBtn = document.getElementById('cartBtn');
        this.cartBadge = document.getElementById('cartBadge');
        
        // Item modal elements
        this.itemModal = document.getElementById('itemModal');
        this.modalBackdrop = document.getElementById('modalBackdrop');
        this.modalClose = document.getElementById('modalClose');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalPrice = document.getElementById('modalPrice');
        this.modalNote = document.getElementById('modalNote');
        this.qtyMinus = document.getElementById('qtyMinus');
        this.qtyPlus = document.getElementById('qtyPlus');
        this.qtyDisplay = document.getElementById('qtyDisplay');
        this.addToCartBtn = document.getElementById('addToCartBtn');
        
        // Cart modal elements
        this.cartModal = document.getElementById('cartModal');
        this.cartModalBackdrop = document.getElementById('cartModalBackdrop');
        this.cartModalClose = document.getElementById('cartModalClose');
        this.cartItems = document.getElementById('cartItems');
        this.totalAmount = document.getElementById('totalAmount');
        this.customerName = document.getElementById('customerName');
        this.tableNumber = document.getElementById('tableNumber');
        this.submitOrderBtn = document.getElementById('submitOrderBtn');
    }

    bindEvents() {
        // Cart button
        this.cartBtn.addEventListener('click', () => this.showCartModal());
        
        // Item modal events
        this.modalBackdrop.addEventListener('click', () => this.hideItemModal());
        this.modalClose.addEventListener('click', () => this.hideItemModal());
        this.qtyMinus.addEventListener('click', () => this.decreaseQuantity());
        this.qtyPlus.addEventListener('click', () => this.increaseQuantity());
        this.addToCartBtn.addEventListener('click', () => this.addToCart());
        
        // Cart modal events
        this.cartModalBackdrop.addEventListener('click', () => this.hideCartModal());
        this.cartModalClose.addEventListener('click', () => this.hideCartModal());
        this.customerName.addEventListener('input', () => {
            this.validateForm();
            this.saveCustomerName();
        });
        this.submitOrderBtn.addEventListener('click', () => this.submitOrder());
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideItemModal();
                this.hideCartModal();
            }
        });
    }

    async loadMenu() {
        try {
            // 載入本地 menu data - 使用版本號破壞快取
            const response = await fetch('/data.json');
            const data = await response.json();
            
            // 提取版本號並重新載入（如果需要）
            const version = data._version || '1.0.0';
            
            // 如果版本號與快取不同，使用版本號參數重新載入
            const cachedVersion = localStorage.getItem('tapgo-menu-version');
            if (cachedVersion !== version) {
                const versionedResponse = await fetch(`/data.json?v=${version}`);
                this.menuData = await versionedResponse.json();
                localStorage.setItem('tapgo-menu-version', version);
            } else {
                this.menuData = data;
            }
            
            // 讀取配置
            if (this.menuData._config) {
                this.ORDER_LIMIT = this.menuData._config.orderLimit || 600;
                this.ORDER_LIMIT_MESSAGE = this.menuData._config.orderLimitMessage || '每人點餐金額上限600元，不夠再加點';
            }
            
            // 移除私有欄位以避免渲染
            delete this.menuData._version;
            delete this.menuData._config;
            
            this.renderMenu();
            this.updateOrderLimitMessage();
        } catch (error) {
            console.error('載入菜單失敗:', error);
            this.showError('載入菜單失敗，請重新整理頁面');
        }
    }

    renderMenu() {
        this.menuContainer.innerHTML = '';
        
        Object.entries(this.menuData).forEach(([categoryName, categoryData]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category';
            
            let categoryHTML = `
                <h2 class="category-title">${categoryName}</h2>
            `;
            
            if (categoryData.分類說明) {
                categoryHTML += `<p class="category-description">${categoryData.分類說明}</p>`;
            }
            
            categoryHTML += '<div class="items-grid">';
            
            categoryData.品項.forEach(item => {
                const itemId = `${categoryName}-${item.名稱}`;
                categoryHTML += `
                    <div class="item-card" data-item-id="${itemId}" data-category="${categoryName}">
                        <div class="item-content">
                            <div class="item-main">
                                <span class="item-name">${item.名稱}</span>
                                <span class="item-price">$${item.價格}</span>
                            </div>
                            ${item.備註 ? `<div class="item-note">${item.備註}</div>` : ''}
                        </div>
                    </div>
                `;
            });
            
            categoryHTML += '</div>';
            categoryDiv.innerHTML = categoryHTML;
            this.menuContainer.appendChild(categoryDiv);
            
            // 綁定點擊事件
            categoryDiv.querySelectorAll('.item-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    const itemId = e.currentTarget.dataset.itemId;
                    const category = e.currentTarget.dataset.category;
                    this.showItemModal(category, itemId);
                });
            });
        });
    }

    showItemModal(category, itemId) {
        const itemName = itemId.replace(`${category}-`, '');
        const item = this.menuData[category].品項.find(i => i.名稱 === itemName);
        
        if (!item) return;
        
        this.currentItem = { category, ...item };
        this.currentQuantity = 1;
        
        this.modalTitle.textContent = item.名稱;
        this.modalPrice.textContent = `$${item.價格}`;
        this.modalNote.textContent = item.備註 || '';
        this.qtyDisplay.textContent = '1';
        
        this.updateQuantityButtons();
        this.itemModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    hideItemModal() {
        this.itemModal.classList.remove('show');
        document.body.style.overflow = '';
        this.currentItem = null;
        this.currentQuantity = 1;
    }

    increaseQuantity() {
        if (this.currentQuantity < 9) {
            this.currentQuantity++;
            this.qtyDisplay.textContent = this.currentQuantity;
            this.updateQuantityButtons();
        }
    }

    decreaseQuantity() {
        if (this.currentQuantity > 1) {
            this.currentQuantity--;
            this.qtyDisplay.textContent = this.currentQuantity;
            this.updateQuantityButtons();
        }
    }

    updateQuantityButtons() {
        this.qtyMinus.disabled = this.currentQuantity <= 1;
        this.qtyPlus.disabled = this.currentQuantity >= 9;
    }

    addToCart() {
        if (!this.currentItem) return;
        
        const itemKey = `${this.currentItem.category}-${this.currentItem.名稱}`;
        
        if (this.cart[itemKey]) {
            const newQuantity = this.cart[itemKey].quantity + this.currentQuantity;
            this.cart[itemKey].quantity = Math.min(newQuantity, 9);
        } else {
            this.cart[itemKey] = {
                name: this.currentItem.名稱,
                price: this.currentItem.價格,
                quantity: this.currentQuantity,
                category: this.currentItem.category
            };
        }
        
        this.saveCart();
        this.updateCartBadge();
        this.hideItemModal();
        
        // 顯示成功提示
        this.showSuccess('已加入購物車');
    }

    showCartModal() {
        this.renderCartItems();
        this.validateForm(); // 確保按鈕狀態正確
        this.updateOrderLimitMessage(); // 更新限制訊息
        this.cartModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    hideCartModal() {
        this.cartModal.classList.remove('show');
        document.body.style.overflow = '';
    }

    renderCartItems() {
        const cartItemsArray = Object.entries(this.cart);
        
        if (cartItemsArray.length === 0) {
            this.cartItems.innerHTML = `
                <div class="empty-cart">
                    <div class="empty-cart-icon">🛒</div>
                    <p>購物車是空的</p>
                </div>
            `;
            this.totalAmount.textContent = '$0';
            return;
        }
        
        let total = 0;
        let cartHTML = '';
        
        cartItemsArray.forEach(([itemKey, item]) => {
            const subtotal = item.price * item.quantity;
            total += subtotal;
            
            cartHTML += `
                <div class="cart-item" data-item-key="${itemKey}">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">$${item.price} x ${item.quantity} = $${subtotal}</div>
                    </div>
                    <div class="cart-item-controls">
                        <button class="cart-qty-btn cart-decrease" data-item-key="${itemKey}">−</button>
                        <span class="cart-qty-display">${item.quantity}</span>
                        <button class="cart-qty-btn cart-increase" data-item-key="${itemKey}">+</button>
                        <button class="cart-remove-btn" data-item-key="${itemKey}">刪除</button>
                    </div>
                </div>
            `;
        });
        
        this.cartItems.innerHTML = cartHTML;
        this.totalAmount.textContent = `$${total}`;
        
        // 檢查是否超過上限並更新樣式
        const isOverLimit = total > this.ORDER_LIMIT;
        if (isOverLimit) {
            this.totalAmount.classList.add('over-limit');
        } else {
            this.totalAmount.classList.remove('over-limit');
        }
        
        // 重新驗證表單
        this.validateForm();
        
        // 綁定購物車控制事件
        this.cartItems.querySelectorAll('.cart-decrease').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemKey = e.target.dataset.itemKey;
                this.decreaseCartQuantity(itemKey);
            });
        });
        
        this.cartItems.querySelectorAll('.cart-increase').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemKey = e.target.dataset.itemKey;
                this.increaseCartQuantity(itemKey);
            });
        });
        
        this.cartItems.querySelectorAll('.cart-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemKey = e.target.dataset.itemKey;
                this.removeFromCart(itemKey);
            });
        });
    }

    decreaseCartQuantity(itemKey) {
        if (this.cart[itemKey] && this.cart[itemKey].quantity > 1) {
            this.cart[itemKey].quantity--;
            this.saveCart();
            this.updateCartBadge();
            this.renderCartItems();
        }
    }

    increaseCartQuantity(itemKey) {
        if (this.cart[itemKey] && this.cart[itemKey].quantity < 9) {
            this.cart[itemKey].quantity++;
            this.saveCart();
            this.updateCartBadge();
            this.renderCartItems();
        }
    }

    removeFromCart(itemKey) {
        if (this.cart[itemKey]) {
            delete this.cart[itemKey];
            this.saveCart();
            this.updateCartBadge();
            this.renderCartItems();
        }
    }

    updateCartBadge() {
        const totalItems = Object.values(this.cart).reduce((sum, item) => sum + item.quantity, 0);
        
        if (totalItems === 0) {
            this.cartBadge.classList.add('hidden');
        } else {
            this.cartBadge.classList.remove('hidden');
            this.cartBadge.textContent = totalItems > 99 ? '99+' : totalItems.toString();
        }
    }

    validateForm() {
        const name = this.customerName.value.trim();
        const total = this.getCartTotal();
        const isOverLimit = total > this.ORDER_LIMIT;
        
        // 按鈕停用條件：沒有姓名 或 超過金額上限
        this.submitOrderBtn.disabled = !name || isOverLimit;
        
        // 更新按鈕文字和樣式
        if (isOverLimit) {
            this.submitOrderBtn.textContent = `超過上限 $${this.ORDER_LIMIT}`;
            this.submitOrderBtn.classList.add('over-limit');
        } else {
            this.submitOrderBtn.textContent = '送出訂單';
            this.submitOrderBtn.classList.remove('over-limit');
        }
    }

    getCartTotal() {
        return Object.values(this.cart).reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    }

    async submitOrder() {
        const name = this.customerName.value.trim();
        if (!name) {
            this.showError('請輸入姓名');
            return;
        }
        
        const cartItems = Object.values(this.cart);
        if (cartItems.length === 0) {
            this.showError('購物車是空的');
            return;
        }
        
        const total = this.getCartTotal();
        if (total > this.ORDER_LIMIT) {
            this.showError(`訂單金額不能超過 $${this.ORDER_LIMIT}`);
            return;
        }
        
        const orderData = {
            customerName: name,
            tableNumber: this.tableNumber.value.trim() || null,
            items: cartItems
        };
        
        this.submitOrderBtn.disabled = true;
        this.submitOrderBtn.textContent = '送出中...';
        
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });
            
            if (response.ok) {
                this.clearCart();
                this.hideCartModal();
                this.showSuccess('訂單送出成功！');
                // 保持姓名不清空，只清空桌號
                this.tableNumber.value = '';
            } else {
                throw new Error('送出訂單失敗');
            }
        } catch (error) {
            console.error('送出訂單失敗:', error);
            this.showError('送出訂單失敗，請稍後再試');
        } finally {
            this.submitOrderBtn.disabled = false;
            this.submitOrderBtn.textContent = '送出訂單';
        }
    }

    clearCart() {
        this.cart = {};
        this.saveCart();
        this.updateCartBadge();
    }

    saveCart() {
        localStorage.setItem('tapgo-cart', JSON.stringify(this.cart));
    }

    saveCustomerName() {
        const name = this.customerName.value.trim();
        if (name) {
            localStorage.setItem('tapgo-customer-name', name);
        } else {
            localStorage.removeItem('tapgo-customer-name');
        }
    }

    loadSavedCustomerName() {
        const savedName = localStorage.getItem('tapgo-customer-name');
        if (savedName) {
            this.customerName.value = savedName;
            this.validateForm();
        }
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    updateOrderLimitMessage() {
        const limitNotice = document.querySelector('.amount-limit-notice');
        if (limitNotice) {
            limitNotice.textContent = this.ORDER_LIMIT_MESSAGE;
        }
    }

    showToast(message, type = 'info') {
        // 簡單的 toast 實現
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 2000;
            animation: slideDown 0.3s ease-out;
            background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#2563eb'};
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease-in';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 2000);
        
        // 添加動畫樣式
        if (!document.querySelector('#toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                @keyframes slideDown {
                    from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
                @keyframes slideUp {
                    from { opacity: 1; transform: translateX(-50%) translateY(0); }
                    to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// 初始化應用
document.addEventListener('DOMContentLoaded', () => {
    window.tapgoApp = new TapGoApp();
});