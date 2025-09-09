# TapGo 部署指南

本文檔說明如何將 TapGo 線上點餐系統部署到 Cloudflare Pages。

## 部署步驟

### 1. 安裝 Wrangler CLI

如果您還沒有安裝 Wrangler，請先安裝：

```bash
npm install -g wrangler
```

### 2. 登入 Cloudflare

```bash
wrangler login
```

### 3. 建立 D1 資料庫

```bash
# 建立資料庫
wrangler d1 create tapgo
```

記下返回的資料庫 ID，例如：
```
✅ Successfully created DB 'tapgo' in region APAC
Created your database using D1's new storage backend. The new storage backend is not yet recommended for production workloads, but is available for all to try. Read more here: https://blog.cloudflare.com/d1-turning-it-up-to-11/

[[d1_databases]]
binding = "DB"
database_name = "tapgo"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
migrations_dir = "./migrations"
```

### 4. 更新 wrangler.toml

將上一步獲得的 `database_id` 更新到 `wrangler.toml` 檔案中：

```toml
[[d1_databases]]
binding = "DB"
database_name = "tapgo"
database_id = "你的實際資料庫ID"  # 替換這裡
migrations_dir = "./migrations"
```

### 5. 執行資料庫遷移

```bash
# 執行生產環境資料庫遷移
wrangler d1 migrations apply tapgo
```

### 6. 部署到 Cloudflare Pages

有兩種部署方式：

#### 方式一：直接部署

```bash
npm run deploy
```

#### 方式二：通過 Git 連接部署

1. 將程式碼推送到 GitHub/GitLab
2. 在 Cloudflare Dashboard 中建立新的 Pages 專案
3. 連接您的 Git 儲存庫
4. 設定構建參數：
   - 構建命令：`npm run build`
   - 構建輸出目錄：`public`
   - 環境變數：設定 D1 資料庫綁定

### 7. 設定環境變數（通過 Dashboard）

在 Cloudflare Pages 專案設定中：

1. 進入 **Settings** > **Environment variables**
2. 添加 D1 資料庫綁定：
   - 變數名：`DB`
   - 值：選擇您建立的 D1 資料庫

### 8. 設定自訂網域（可選）

在 Cloudflare Pages 專案中：

1. 進入 **Custom domains**
2. 添加您的網域
3. 按照指示設定 DNS 記錄

## 部署後測試

### 測試前台功能
- 訪問主網址，確認菜單正常載入
- 測試添加商品到購物車
- 測試提交訂單功能

### 測試後台功能
- 訪問 `/admin.html`
- 測試訂單列表載入
- 測試訂單編輯和刪除功能

### 測試 API 端點

```bash
# 測試獲取訂單（應返回空列表或現有訂單）
curl https://your-domain.pages.dev/api/orders

# 測試提交訂單
curl -X POST https://your-domain.pages.dev/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "測試客戶",
    "tableNumber": "1",
    "items": [
      {
        "name": "測試菜品",
        "price": 100,
        "quantity": 1
      }
    ]
  }'
```

## 常見問題

### Q: 資料庫連接失敗
**A:** 檢查 `wrangler.toml` 中的 `database_id` 是否正確，以及是否已執行資料庫遷移。

### Q: API 回應 404 錯誤
**A:** 確認 Functions 檔案結構正確，路徑為 `functions/api/...`。

### Q: 靜態檔案無法載入
**A:** 檢查檔案是否在 `public` 目錄中，以及 `pages_build_output_dir` 設定是否正確。

### Q: 手機上樣式異常
**A:** 檢查 CSS 中的 viewport 設定和 responsive 斷點。

## 更新部署

當需要更新應用程式時：

```bash
# 如果有資料庫結構變更
wrangler d1 migrations apply tapgo

# 重新部署
npm run deploy
```

## 監控和日誌

在 Cloudflare Dashboard 中：

1. **Analytics** 標籤查看流量統計
2. **Functions** 標籤查看 API 呼叫日誌
3. **Real-time Logs** 查看即時錯誤日誌

## 備份資料庫

定期備份 D1 資料庫：

```bash
# 匯出資料庫
wrangler d1 execute tapgo --command "SELECT * FROM orders;" > backup.sql
```

## 效能優化建議

1. **啟用快取**：靜態資源自動快取，API 回應可設定適當的快取頭
2. **圖片最佳化**：如果有商品圖片，建議使用 Cloudflare Images
3. **監控使用量**：定期檢查 D1 和 Functions 使用量，避免超額
4. **設定警報**：在 Cloudflare 中設定錯誤警報通知

## 安全性檢查

- [ ] 確認沒有敏感資訊硬編碼在程式碼中
- [ ] 檢查 API 端點的輸入驗證
- [ ] 設定適當的 HTTP 安全頭（已在 `_headers` 中設定）
- [ ] 考慮添加管理員認證（後台頁面）

## 支援

如果遇到問題：

1. 查看 Cloudflare Pages 部署日誌
2. 檢查瀏覽器開發者工具中的錯誤
3. 參考 [Cloudflare Pages 文檔](https://developers.cloudflare.com/pages/)
4. 參考 [Cloudflare D1 文檔](https://developers.cloudflare.com/d1/)