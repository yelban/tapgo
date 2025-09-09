// 單個訂單操作 API
export async function onRequestGet(context) {
    const { env, params } = context;
    const orderId = params.id;
    
    try {
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
            WHERE id = ?
        `).bind(orderId).all();
        
        if (results.length === 0) {
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
                order: results[0]
            }),
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
    } catch (error) {
        console.error('獲取訂單詳情失敗:', error);
        
        return new Response(
            JSON.stringify({ 
                error: '獲取訂單詳情失敗',
                message: error.message 
            }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

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