# TapGo 線上點餐系統

基於 Cloudflare Pages + Functions + D1 的行動裝置優先線上點餐解決方案。

## 功能特色

- 🍽️ **直觀點餐介面** - 按分類瀏覽菜單，輕鬆點餐
- 🛒 **智慧購物車** - 本地儲存，支援數量調整
- 📱 **行動優先設計** - 針對手機螢幕最佳化
- 🔒 **安全可靠** - Cloudflare 全球 CDN 加速
- 📊 **後台管理** - 完整的訂單管理系統

## 技術架構

- **前端**: Vanilla HTML/CSS/JavaScript
- **後端**: Cloudflare Functions (JavaScript)
- **資料庫**: Cloudflare D1 (SQLite)
- **部署**: Cloudflare Pages

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 建立 D1 資料庫

```bash
# 建立資料庫
npm run db:create

# 執行遷移（本地測試）
npm run db:migrate
```

### 3. 本地開發

```bash
npm run dev
```

訪問：
- 前台點餐：http://localhost:8788
- 後台管理：http://localhost:8788/admin.html

### 4. 部署到 Cloudflare

```bash
# 部署網站
npm run deploy

# 執行生產環境資料庫遷移
npm run db:migrate:prod
```

## 設定說明

### wrangler.toml 設定

更新 `wrangler.toml` 中的 `database_id`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "tapgo"
database_id = "your-actual-database-id"  # 替換為實際的資料庫 ID
```

### 環境變數

在 Cloudflare Pages 設定中添加環境變數（如需要）。

## 資料庫結構

```sql
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    table_number TEXT,
    item_name TEXT NOT NULL,
    item_price INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0 AND quantity <= 9),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## API 端點

### 前台 API
- `POST /api/orders` - 提交訂單
- `GET /api/orders` - 獲取訂單列表

### 後台 API
- `GET /api/admin/orders` - 獲取訂單列表（支援篩選分頁）
- `GET /api/admin/orders/[id]` - 獲取單筆訂單
- `PUT /api/admin/orders/[id]` - 更新訂單
- `DELETE /api/admin/orders/[id]` - 刪除訂單

## 菜單資料格式

菜單資料存放在 `public/data.json`，格式如下：

```json
{
  "分類名稱": {
    "分類說明": "可選的分類說明",
    "品項": [
      {
        "名稱": "菜品名稱",
        "價格": 價格數字,
        "備註": "可選的備註"
      }
    ]
  }
}
```

## 專案結構

```
tapgo/
├── public/              # 靜態檔案
│   ├── index.html      # 前台點餐頁面
│   ├── admin.html      # 後台管理頁面
│   ├── styles.css      # 前台樣式
│   ├── admin.css       # 後台樣式
│   ├── app.js          # 前台邏輯
│   ├── admin.js        # 後台邏輯
│   └── data.json       # 菜單資料
├── functions/           # Cloudflare Functions
│   └── api/            # API 端點
├── migrations/          # 資料庫遷移檔案
├── wrangler.toml       # Cloudflare 設定
└── package.json        # 專案設定
```

## 常用指令

```bash
# 本地開發伺服器
npm run dev

# 部署到 Cloudflare Pages
npm run deploy

# 資料庫操作
npm run db:migrate          # 本地遷移
npm run db:migrate:prod     # 生產遷移
npm run db:console          # 本地資料庫控制台
npm run db:console:prod     # 生產資料庫控制台
```

## 授權條款

MIT License