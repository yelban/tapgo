// 統計資料 API
export async function onRequestGet(context) {
    const { env } = context;
    
    try {
        // 獲取總訂單數和總營業額
        const totalStats = await env.DB.prepare(`
            SELECT 
                COUNT(*) as totalOrders,
                COALESCE(SUM(item_price * quantity), 0) as totalRevenue
            FROM orders
        `).first();
        
        // 獲取今日訂單數
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStats = await env.DB.prepare(`
            SELECT COUNT(*) as todayOrders
            FROM orders
            WHERE datetime(created_at) >= datetime(?)
        `).bind(today.toISOString()).first();
        
        // 獲取熱門商品（訂購次數最多的）
        const popularItem = await env.DB.prepare(`
            SELECT 
                item_name,
                COUNT(*) as order_count,
                SUM(quantity) as total_quantity
            FROM orders
            GROUP BY item_name
            ORDER BY order_count DESC
            LIMIT 1
        `).first();
        
        return new Response(JSON.stringify({
            success: true,
            statistics: {
                totalOrders: totalStats.totalOrders || 0,
                totalRevenue: totalStats.totalRevenue || 0,
                todayOrders: todayStats.todayOrders || 0,
                popularItem: popularItem ? popularItem.item_name : '暫無資料'
            }
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('獲取統計資料失敗:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '獲取統計資料失敗'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}