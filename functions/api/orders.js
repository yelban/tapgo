// 訂單 API - Cloudflare Functions
export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        // 解析請求資料
        const { customerName, tableNumber, items } = await request.json();
        
        // 驗證必要欄位
        if (!customerName || !items || items.length === 0) {
            return new Response(
                JSON.stringify({ error: '缺少必要欄位' }),
                { 
                    status: 400, 
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        // 驗證每個品項
        for (const item of items) {
            if (!item.name || !item.price || !item.quantity || 
                item.quantity < 1 || item.quantity > 9) {
                return new Response(
                    JSON.stringify({ error: '品項資料格式錯誤' }),
                    { 
                        status: 400, 
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }
        }
        
        // 準備批次插入的 SQL 語句
        const insertPromises = items.map(item => {
            return env.DB.prepare(`
                INSERT INTO orders (customer_name, table_number, item_name, item_price, quantity)
                VALUES (?, ?, ?, ?, ?)
            `).bind(
                customerName,
                tableNumber,
                item.name,
                item.price,
                item.quantity
            );
        });
        
        // 執行批次插入
        const results = await env.DB.batch(insertPromises);
        
        // 檢查是否所有插入都成功
        const allSuccess = results.every(result => result.success);
        
        if (!allSuccess) {
            throw new Error('部分訂單項目插入失敗');
        }
        
        // 計算訂單總金額
        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        return new Response(
            JSON.stringify({
                success: true,
                message: '訂單建立成功',
                orderId: results[0].meta.last_row_id,
                totalAmount,
                itemCount: items.length
            }),
            {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
    } catch (error) {
        console.error('建立訂單失敗:', error);
        
        return new Response(
            JSON.stringify({ 
                error: '建立訂單失敗',
                message: error.message 
            }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// 獲取訂單列表 (用於後台管理)
export async function onRequestGet(context) {
    const { env } = context;
    
    try {
        // 查詢所有訂單，按創建時間倒序排列
        const { results } = await env.DB.prepare(`
            SELECT 
                id,
                customer_name,
                table_number,
                item_name,
                item_price,
                quantity,
                created_at,
                (item_price * quantity) as subtotal
            FROM orders 
            ORDER BY created_at DESC
        `).all();
        
        return new Response(
            JSON.stringify({
                success: true,
                orders: results
            }),
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
    } catch (error) {
        console.error('獲取訂單失敗:', error);
        
        return new Response(
            JSON.stringify({ 
                error: '獲取訂單失敗',
                message: error.message 
            }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}