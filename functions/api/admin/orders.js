// 後台管理 - 訂單管理 API
export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    try {
        // 構建查詢條件
        let sql = `
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
            WHERE 1=1
        `;
        
        const params = [];
        
        // 按客戶姓名搜尋
        if (searchParams.get('customer')) {
            sql += ` AND customer_name LIKE ?`;
            params.push(`%${searchParams.get('customer')}%`);
        }
        
        // 按桌號搜尋
        if (searchParams.get('table')) {
            sql += ` AND table_number = ?`;
            params.push(searchParams.get('table'));
        }
        
        // 按日期範圍搜尋
        if (searchParams.get('date_from')) {
            sql += ` AND DATE(created_at) >= ?`;
            params.push(searchParams.get('date_from'));
        }
        
        if (searchParams.get('date_to')) {
            sql += ` AND DATE(created_at) <= ?`;
            params.push(searchParams.get('date_to'));
        }
        
        // 排序
        sql += ` ORDER BY created_at DESC`;
        
        // 分頁
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;
        
        sql += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        
        const { results } = await env.DB.prepare(sql).bind(...params).all();
        
        // 獲取總數
        let countSql = `SELECT COUNT(*) as total FROM orders WHERE 1=1`;
        const countParams = [];
        
        if (searchParams.get('customer')) {
            countSql += ` AND customer_name LIKE ?`;
            countParams.push(`%${searchParams.get('customer')}%`);
        }
        
        if (searchParams.get('table')) {
            countSql += ` AND table_number = ?`;
            countParams.push(searchParams.get('table'));
        }
        
        if (searchParams.get('date_from')) {
            countSql += ` AND DATE(created_at) >= ?`;
            countParams.push(searchParams.get('date_from'));
        }
        
        if (searchParams.get('date_to')) {
            countSql += ` AND DATE(created_at) <= ?`;
            countParams.push(searchParams.get('date_to'));
        }
        
        const { results: countResults } = await env.DB.prepare(countSql).bind(...countParams).all();
        const total = countResults[0].total;
        
        return new Response(
            JSON.stringify({
                success: true,
                orders: results,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }),
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
    } catch (error) {
        console.error('獲取訂單列表失敗:', error);
        
        return new Response(
            JSON.stringify({ 
                error: '獲取訂單列表失敗',
                message: error.message 
            }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// 更新單筆訂單
export async function onRequestPut(context) {
    const { env, request, params } = context;
    const orderId = params.id;
    
    try {
        const { customer_name, table_number, item_name, item_price, quantity } = await request.json();
        
        // 驗證必要欄位
        if (!customer_name || !item_name || !item_price || !quantity) {
            return new Response(
                JSON.stringify({ error: '缺少必要欄位' }),
                { 
                    status: 400, 
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        // 驗證數量範圍
        if (quantity < 1 || quantity > 9) {
            return new Response(
                JSON.stringify({ error: '數量必須在 1-9 之間' }),
                { 
                    status: 400, 
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        // 更新訂單
        const result = await env.DB.prepare(`
            UPDATE orders 
            SET customer_name = ?, table_number = ?, item_name = ?, item_price = ?, quantity = ?
            WHERE id = ?
        `).bind(
            customer_name,
            table_number,
            item_name,
            parseInt(item_price),
            parseInt(quantity),
            orderId
        ).run();
        
        if (result.changes === 0) {
            return new Response(
                JSON.stringify({ error: '找不到指定的訂單' }),
                { 
                    status: 404, 
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        return new Response(
            JSON.stringify({
                success: true,
                message: '訂單更新成功'
            }),
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
    } catch (error) {
        console.error('更新訂單失敗:', error);
        
        return new Response(
            JSON.stringify({ 
                error: '更新訂單失敗',
                message: error.message 
            }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// 刪除單筆訂單
export async function onRequestDelete(context) {
    const { env, params } = context;
    const orderId = params.id;
    
    try {
        const result = await env.DB.prepare(`
            DELETE FROM orders WHERE id = ?
        `).bind(orderId).run();
        
        if (result.changes === 0) {
            return new Response(
                JSON.stringify({ error: '找不到指定的訂單' }),
                { 
                    status: 404, 
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        return new Response(
            JSON.stringify({
                success: true,
                message: '訂單刪除成功'
            }),
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
    } catch (error) {
        console.error('刪除訂單失敗:', error);
        
        return new Response(
            JSON.stringify({ 
                error: '刪除訂單失敗',
                message: error.message 
            }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}