// TapGo 廚房訂單列表
class KitchenDisplay {
    constructor() {
        this.orders = [];
        this.lastOrderCount = 0;
        this.refreshInterval = null;
        this.currentSort = { field: 'time', direction: 'desc' }; // 預設按時間倒序排列
        
        this.initializeElements();
        this.bindEvents();
        this.loadOrders();
        this.startAutoRefresh();
    }

    initializeElements() {
        this.refreshBtn = document.getElementById('refreshBtn');
        this.autoRefreshCheckbox = document.getElementById('autoRefresh');
        this.orderCount = document.getElementById('orderCount');
        this.loading = document.getElementById('loading');
        this.ordersTable = document.getElementById('ordersTable');
        this.tableBody = document.getElementById('tableBody');
        this.emptyState = document.getElementById('emptyState');
        this.todayCount = document.getElementById('todayCount');
        this.totalAmount = document.getElementById('totalAmount');
        this.lastUpdate = document.getElementById('lastUpdate');
    }

    bindEvents() {
        this.refreshBtn.addEventListener('click', () => this.loadOrders());
        this.autoRefreshCheckbox.addEventListener('change', () => {
            if (this.autoRefreshCheckbox.checked) {
                this.startAutoRefresh();
            } else {
                this.stopAutoRefresh();
            }
        });

        // 排序功能
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', (e) => {
                const sortField = e.currentTarget.dataset.sort;
                this.handleSort(sortField);
            });
        });

        // 鍵盤快捷鍵
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                e.preventDefault();
                this.loadOrders();
            }
        });

        // 頁面可見性變化時的處理
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.autoRefreshCheckbox.checked) {
                this.loadOrders();
            }
        });
    }

    async loadOrders() {
        this.showLoading(true);
        
        try {
            const response = await fetch('/api/orders');
            const data = await response.json();
            
            if (data.success) {
                const newOrderCount = data.orders.length;
                
                // 檢查是否有新訂單
                if (newOrderCount > this.lastOrderCount) {
                    this.highlightNewOrders(newOrderCount - this.lastOrderCount);
                }
                
                this.orders = data.orders;
                this.lastOrderCount = newOrderCount;
                this.renderOrders();
                this.updateStats();
                this.updateLastUpdateTime();
            } else {
                throw new Error(data.error || '載入訂單失敗');
            }
        } catch (error) {
            console.error('載入訂單失敗:', error);
            this.showError('載入訂單失敗：' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    renderOrders() {
        if (this.orders.length === 0) {
            this.showEmptyState();
            return;
        }

        this.hideEmptyState();

        // 根據當前排序設定排列
        const sortedOrders = this.sortOrders([...this.orders]);

        const ordersHTML = sortedOrders.map((order, index) => {
            const isNew = index < (this.orders.length - this.lastOrderCount + sortedOrders.length);
            return `
                <div class="order-row ${isNew ? 'new-order' : ''}" data-order-id="${order.id}">
                    <div class="col-time">${this.formatTime(order.created_at)}</div>
                    <div class="col-customer">${this.escapeHtml(order.customer_name)}</div>
                    <div class="col-table">${order.table_number || '-'}</div>
                    <div class="col-item">${this.escapeHtml(order.item_name)}</div>
                    <div class="col-qty">${order.quantity}</div>
                    <div class="col-price">$${order.subtotal || (order.item_price * order.quantity)}</div>
                </div>
            `;
        }).join('');

        this.tableBody.innerHTML = ordersHTML;
        this.orderCount.textContent = this.orders.length;
        this.updateSortIndicators();
    }

    handleSort(field) {
        if (this.currentSort.field === field) {
            // 同一欄位，切換排序方向
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // 不同欄位，預設升序
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }
        
        this.renderOrders();
    }

    sortOrders(orders) {
        const { field, direction } = this.currentSort;
        
        return orders.sort((a, b) => {
            let aValue, bValue;
            
            switch (field) {
                case 'time':
                    aValue = new Date(a.created_at);
                    bValue = new Date(b.created_at);
                    break;
                case 'table':
                    aValue = a.table_number || '';
                    bValue = b.table_number || '';
                    // 數字排序：先將字串轉為數字，如果不是數字則保持字串
                    const aNum = parseInt(aValue);
                    const bNum = parseInt(bValue);
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        aValue = aNum;
                        bValue = bNum;
                    }
                    break;
                case 'item':
                    aValue = a.item_name;
                    bValue = b.item_name;
                    break;
                default:
                    return 0;
            }
            
            let result;
            if (aValue < bValue) result = -1;
            else if (aValue > bValue) result = 1;
            else result = 0;
            
            return direction === 'desc' ? -result : result;
        });
    }

    updateSortIndicators() {
        // 清除所有排序指示器
        document.querySelectorAll('.sortable').forEach(header => {
            header.removeAttribute('data-sort-direction');
        });
        
        // 設定當前排序欄位的指示器
        const currentHeader = document.querySelector(`.sortable[data-sort="${this.currentSort.field}"]`);
        if (currentHeader) {
            currentHeader.setAttribute('data-sort-direction', this.currentSort.direction);
        }
    }

    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = this.orders.filter(order => 
            order.created_at.startsWith(today)
        );
        
        const totalAmount = this.orders.reduce((sum, order) => 
            sum + (order.subtotal || (order.item_price * order.quantity)), 0
        );
        
        const todayAmount = todayOrders.reduce((sum, order) => 
            sum + (order.subtotal || (order.item_price * order.quantity)), 0
        );

        this.todayCount.textContent = `${todayOrders.length} 筆 ($${todayAmount})`;
        this.totalAmount.textContent = `$${totalAmount}`;
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        
        // 使用 Asia/Taipei 時區顯示 24 小時制時間
        return date.toLocaleTimeString('zh-TW', {
            timeZone: 'Asia/Taipei',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    updateLastUpdateTime() {
        const now = new Date();
        this.lastUpdate.textContent = now.toLocaleTimeString('zh-TW', {
            timeZone: 'Asia/Taipei',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }

    highlightNewOrders(count) {
        // 播放提示音（如果瀏覽器支援）
        this.playNotificationSound();
        
        // 顯示新訂單提示
        this.showNotification(`🔔 有 ${count} 筆新訂單！`);
        
        // 閃爍標題
        this.blinkTitle();
    }

    playNotificationSound() {
        try {
            // 創建簡單的提示音
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('無法播放提示音:', error);
        }
    }

    blinkTitle() {
        const originalTitle = document.title;
        let blinkCount = 0;
        const blinkInterval = setInterval(() => {
            document.title = blinkCount % 2 === 0 ? '🔔 新訂單！' : originalTitle;
            blinkCount++;
            if (blinkCount >= 6) {
                clearInterval(blinkInterval);
                document.title = originalTitle;
            }
        }, 500);
    }

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            if (this.autoRefreshCheckbox.checked) {
                this.loadOrders();
            }
        }, 30000); // 30秒自動刷新
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    showLoading(show) {
        this.loading.style.display = show ? 'block' : 'none';
        this.ordersTable.style.opacity = show ? '0.5' : '1';
        this.refreshBtn.disabled = show;
        if (show) {
            this.refreshBtn.textContent = '載入中...';
        } else {
            this.refreshBtn.textContent = '🔄 重新整理';
        }
    }

    showEmptyState() {
        this.ordersTable.style.display = 'none';
        this.emptyState.style.display = 'block';
        this.orderCount.textContent = '0';
    }

    hideEmptyState() {
        this.ordersTable.style.display = 'block';
        this.emptyState.style.display = 'none';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 2000;
            animation: slideIn 0.3s ease-out;
            max-width: 400px;
            font-size: 1.1rem;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
            background: ${
                type === 'error' ? '#dc2626' : 
                type === 'success' ? '#059669' : 
                '#2563eb'
            };
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
        
        // 添加動畫樣式
        if (!document.querySelector('#kitchen-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'kitchen-notification-styles';
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

// 初始化廚房顯示系統
document.addEventListener('DOMContentLoaded', () => {
    window.kitchenDisplay = new KitchenDisplay();
});

// 頁面卸載時清理定時器
window.addEventListener('beforeunload', () => {
    if (window.kitchenDisplay) {
        window.kitchenDisplay.stopAutoRefresh();
    }
});