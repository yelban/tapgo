// TapGo 後台管理系統
class TapGoAdmin {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalPages = 1;
        this.currentFilters = {};
        this.orders = [];
        this.editingOrderId = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadOrders();
        this.loadStatistics();
    }

    initializeElements() {
        // Tab elements
        this.navBtns = document.querySelectorAll('.nav-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // Orders tab elements
        this.refreshBtn = document.getElementById('refreshBtn');
        this.filterCustomer = document.getElementById('filterCustomer');
        this.filterTable = document.getElementById('filterTable');
        this.filterDateFrom = document.getElementById('filterDateFrom');
        this.filterDateTo = document.getElementById('filterDateTo');
        this.applyFiltersBtn = document.getElementById('applyFilters');
        this.clearFiltersBtn = document.getElementById('clearFilters');
        this.ordersLoading = document.getElementById('ordersLoading');
        this.ordersList = document.getElementById('ordersList');
        this.pagination = document.getElementById('pagination');
        
        // Edit modal elements
        this.editModal = document.getElementById('editModal');
        this.editModalClose = document.getElementById('editModalClose');
        this.editForm = document.getElementById('editForm');
        this.editOrderId = document.getElementById('editOrderId');
        this.editCustomerName = document.getElementById('editCustomerName');
        this.editTableNumber = document.getElementById('editTableNumber');
        this.editItemName = document.getElementById('editItemName');
        this.editItemPrice = document.getElementById('editItemPrice');
        this.editQuantity = document.getElementById('editQuantity');
        this.editCancel = document.getElementById('editCancel');
        this.editSave = document.getElementById('editSave');
        
        // Delete modal elements
        this.deleteModal = document.getElementById('deleteModal');
        this.deleteModalClose = document.getElementById('deleteModalClose');
        this.deleteOrderDetails = document.getElementById('deleteOrderDetails');
        this.deleteCancel = document.getElementById('deleteCancel');
        this.deleteConfirm = document.getElementById('deleteConfirm');
        
        // Statistics elements
        this.statsContainer = document.getElementById('statsContainer');
    }

    bindEvents() {
        // Tab navigation
        this.navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Orders tab events
        this.refreshBtn.addEventListener('click', () => this.loadOrders());
        this.applyFiltersBtn.addEventListener('click', () => this.applyFilters());
        this.clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        
        // Filter inputs - Enter key to search
        [this.filterCustomer, this.filterTable].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.applyFilters();
                }
            });
        });
        
        // Edit modal events
        this.editModalClose.addEventListener('click', () => this.hideEditModal());
        this.editCancel.addEventListener('click', () => this.hideEditModal());
        this.editSave.addEventListener('click', () => this.saveOrder());
        this.editModal.querySelector('.modal-backdrop').addEventListener('click', () => this.hideEditModal());
        
        // Delete modal events
        this.deleteModalClose.addEventListener('click', () => this.hideDeleteModal());
        this.deleteCancel.addEventListener('click', () => this.hideDeleteModal());
        this.deleteConfirm.addEventListener('click', () => this.confirmDelete());
        this.deleteModal.querySelector('.modal-backdrop').addEventListener('click', () => this.hideDeleteModal());
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideEditModal();
                this.hideDeleteModal();
            }
        });
    }

    switchTab(tabName) {
        // Update nav buttons
        this.navBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
        
        // Load data for the new tab
        if (tabName === 'orders') {
            this.loadOrders();
        } else if (tabName === 'statistics') {
            this.loadStatistics();
        }
    }

    async loadOrders() {
        this.showLoading(true);
        
        try {
            const params = new URLSearchParams({
                page: this.currentPage.toString(),
                limit: this.pageSize.toString(),
                ...this.currentFilters
            });
            
            const response = await fetch(`/api/admin/orders?${params}`);
            const data = await response.json();
            
            if (data.success) {
                this.orders = data.orders;
                this.totalPages = data.pagination.totalPages;
                this.renderOrders();
                this.renderPagination(data.pagination);
            } else {
                throw new Error(data.error || '載入訂單失敗');
            }
        } catch (error) {
            console.error('載入訂單失敗:', error);
            this.showError('載入訂單失敗：' + error.message);
            this.ordersList.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>載入訂單失敗</p></div>';
        } finally {
            this.showLoading(false);
        }
    }

    renderOrders() {
        if (this.orders.length === 0) {
            this.ordersList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <p>沒有找到訂單</p>
                </div>
            `;
            return;
        }
        
        const ordersHTML = this.orders.map(order => `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-header">
                    <span class="order-id">#${order.id}</span>
                    <span class="order-time">${this.formatDateTime(order.created_at)}</span>
                </div>
                <div class="order-info">
                    <div class="order-field">
                        <span class="order-label">客戶姓名</span>
                        <span class="order-value">${order.customer_name}</span>
                    </div>
                    <div class="order-field">
                        <span class="order-label">桌號</span>
                        <span class="order-value">${order.table_number || '無'}</span>
                    </div>
                    <div class="order-field">
                        <span class="order-label">菜品</span>
                        <span class="order-value">${order.item_name}</span>
                    </div>
                    <div class="order-field">
                        <span class="order-label">單價</span>
                        <span class="order-value">$${order.item_price}</span>
                    </div>
                    <div class="order-field">
                        <span class="order-label">數量</span>
                        <span class="order-value">${order.quantity}</span>
                    </div>
                    <div class="order-field">
                        <span class="order-label">小計</span>
                        <span class="order-value">$${order.subtotal}</span>
                    </div>
                </div>
                <div class="order-actions">
                    <button class="edit-btn" onclick="tapgoAdmin.editOrder(${order.id})">編輯</button>
                    <button class="delete-btn" onclick="tapgoAdmin.deleteOrder(${order.id})">刪除</button>
                </div>
            </div>
        `).join('');
        
        this.ordersList.innerHTML = ordersHTML;
    }

    renderPagination(pagination) {
        const { page, totalPages, total } = pagination;
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="tapgoAdmin.goToPage(${page - 1})">
                ← 上一頁
            </button>
        `;
        
        // Page numbers
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(totalPages, page + 2);
        
        if (startPage > 1) {
            paginationHTML += `<button class="page-btn" onclick="tapgoAdmin.goToPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span class="page-info">...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-btn ${i === page ? 'active' : ''}" onclick="tapgoAdmin.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span class="page-info">...</span>`;
            }
            paginationHTML += `<button class="page-btn" onclick="tapgoAdmin.goToPage(${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        paginationHTML += `
            <button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="tapgoAdmin.goToPage(${page + 1})">
                下一頁 →
            </button>
        `;
        
        // Page info
        paginationHTML += `
            <div class="page-info">
                第 ${page} 頁，共 ${totalPages} 頁 (${total} 筆記錄)
            </div>
        `;
        
        this.pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.loadOrders();
    }

    applyFilters() {
        this.currentFilters = {};
        
        if (this.filterCustomer.value.trim()) {
            this.currentFilters.customer = this.filterCustomer.value.trim();
        }
        
        if (this.filterTable.value.trim()) {
            this.currentFilters.table = this.filterTable.value.trim();
        }
        
        if (this.filterDateFrom.value) {
            this.currentFilters.date_from = this.filterDateFrom.value;
        }
        
        if (this.filterDateTo.value) {
            this.currentFilters.date_to = this.filterDateTo.value;
        }
        
        this.currentPage = 1;
        this.loadOrders();
    }

    clearFilters() {
        this.filterCustomer.value = '';
        this.filterTable.value = '';
        this.filterDateFrom.value = '';
        this.filterDateTo.value = '';
        this.currentFilters = {};
        this.currentPage = 1;
        this.loadOrders();
    }

    editOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        
        this.editingOrderId = orderId;
        this.editOrderId.value = orderId;
        this.editCustomerName.value = order.customer_name;
        this.editTableNumber.value = order.table_number || '';
        this.editItemName.value = order.item_name;
        this.editItemPrice.value = order.item_price;
        this.editQuantity.value = order.quantity;
        
        this.showEditModal();
    }

    showEditModal() {
        this.editModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    hideEditModal() {
        this.editModal.classList.remove('show');
        document.body.style.overflow = '';
        this.editingOrderId = null;
        this.editForm.reset();
    }

    async saveOrder() {
        if (!this.editForm.checkValidity()) {
            this.showError('請填寫所有必要欄位');
            return;
        }
        
        const orderData = {
            customer_name: this.editCustomerName.value.trim(),
            table_number: this.editTableNumber.value.trim() || null,
            item_name: this.editItemName.value.trim(),
            item_price: parseInt(this.editItemPrice.value),
            quantity: parseInt(this.editQuantity.value)
        };
        
        this.editSave.disabled = true;
        this.editSave.textContent = '儲存中...';
        
        try {
            const response = await fetch(`/api/admin/orders/${this.editingOrderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.hideEditModal();
                this.showSuccess('訂單更新成功');
                this.loadOrders();
            } else {
                throw new Error(data.error || '更新訂單失敗');
            }
        } catch (error) {
            console.error('更新訂單失敗:', error);
            this.showError('更新訂單失敗：' + error.message);
        } finally {
            this.editSave.disabled = false;
            this.editSave.textContent = '儲存';
        }
    }

    deleteOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        
        this.editingOrderId = orderId;
        
        // Show order details in delete modal
        this.deleteOrderDetails.innerHTML = `
            <div class="detail-item">
                <span class="detail-label">訂單編號</span>
                <span class="detail-value">#${order.id}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">客戶姓名</span>
                <span class="detail-value">${order.customer_name}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">菜品</span>
                <span class="detail-value">${order.item_name}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">小計</span>
                <span class="detail-value">$${order.subtotal}</span>
            </div>
        `;
        
        this.showDeleteModal();
    }

    showDeleteModal() {
        this.deleteModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    hideDeleteModal() {
        this.deleteModal.classList.remove('show');
        document.body.style.overflow = '';
        this.editingOrderId = null;
    }

    async confirmDelete() {
        if (!this.editingOrderId) return;
        
        this.deleteConfirm.disabled = true;
        this.deleteConfirm.textContent = '刪除中...';
        
        try {
            const response = await fetch(`/api/admin/orders/${this.editingOrderId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.hideDeleteModal();
                this.showSuccess('訂單刪除成功');
                this.loadOrders();
            } else {
                throw new Error(data.error || '刪除訂單失敗');
            }
        } catch (error) {
            console.error('刪除訂單失敗:', error);
            this.showError('刪除訂單失敗：' + error.message);
        } finally {
            this.deleteConfirm.disabled = false;
            this.deleteConfirm.textContent = '刪除';
        }
    }

    async loadStatistics() {
        try {
            const response = await fetch('/api/admin/statistics');
            const data = await response.json();
            
            if (data.success) {
                this.renderStatistics(data.statistics);
            } else {
                throw new Error(data.error || '載入統計資料失敗');
            }
        } catch (error) {
            console.error('載入統計資料失敗:', error);
            // 顯示錯誤狀態或預設值
            this.renderStatistics({
                totalOrders: 0,
                totalRevenue: 0,
                todayOrders: 0,
                popularItem: '載入失敗'
            });
        }
    }

    renderStatistics(stats) {
        this.statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.totalOrders}</div>
                <div class="stat-label">總訂單數</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">$${stats.totalRevenue}</div>
                <div class="stat-label">總營業額</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.todayOrders}</div>
                <div class="stat-label">今日訂單</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.popularItem}</div>
                <div class="stat-label">熱門商品</div>
            </div>
        `;
    }

    showLoading(show) {
        this.ordersLoading.style.display = show ? 'block' : 'none';
        this.ordersList.style.display = show ? 'none' : 'block';
    }

    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 2000;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
            background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#059669' : '#2563eb'};
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
        
        // Add animation styles
        if (!document.querySelector('#admin-toast-styles')) {
            const style = document.createElement('style');
            style.id = 'admin-toast-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(100%); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideOut {
                    from { opacity: 1; transform: translateX(0); }
                    to { opacity: 0; transform: translateX(100%); }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// 初始化後台管理
document.addEventListener('DOMContentLoaded', () => {
    window.tapgoAdmin = new TapGoAdmin();
});