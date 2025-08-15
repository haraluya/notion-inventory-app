const { Client } = require('@notionhq/client');

// 從 Vercel 的環境變數中讀取 API 金鑰
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Vercel Serverless Function 的主要處理函式
module.exports = async (req, res) => {
    // 設定 CORS 標頭，允許任何來源的請求
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 處理瀏覽器在正式發送 POST 前的 "preflight" OPTIONS 請求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 只接受 POST 方法的請求
    if (req.method !== 'POST') {
        return res.status(405).json({ message: '僅允許 POST 方法' });
    }

    try {
        // **新增日誌**：記錄收到的原始請求內容
        console.log('Received request body:', JSON.stringify(req.body, null, 2));

        if (typeof req.body !== 'object' || req.body === null) {
            console.error('Update Error: Request body is not a valid JSON object.', req.body);
            return res.status(400).json({ message: '請求格式錯誤，需要有效的 JSON 內文。' });
        }

        const { updates } = req.body;

        if (!updates || !Array.isArray(updates) || updates.length === 0) {
            console.log('Update Info: Received an empty or invalid updates array.');
            return res.status(400).json({ message: '沒有提供有效的更新資料。' });
        }
        
        console.log(`Update Info: Received ${updates.length} items to update.`);

        const updatePromises = updates.map(update => {
            const { pageId, newStock } = update;
            
            if (!pageId || typeof newStock !== 'number') {
                console.error('Update Error: Invalid update item found in batch.', update);
                throw new Error(`無效的更新項目: ${JSON.stringify(update)}`);
            }

            const propertiesToUpdate = {
                '庫存': {
                    number: newStock
                },
                '庫存最後更新時間': {
                    date: {
                        start: new Date().toISOString()
                    }
                }
            };

            // **新增日誌**：記錄每一筆準備要發送到 Notion 的請求
            console.log(`Attempting to update page ${pageId} with stock ${newStock}`);

            return notion.pages.update({
                page_id: pageId,
                properties: propertiesToUpdate
            });
        });

        await Promise.all(updatePromises);

        console.log('Update Success: All items updated successfully in Notion.');
        res.status(200).json({ message: 'Notion 資料庫更新成功' });

    } catch (error) {
        // **新增日誌**：記錄下完整的錯誤物件，這對除錯至關重要
        console.error('--- DETAILED NOTION API ERROR ---');
        console.error('Error Code:', error.code);
        console.error('Error Body:', JSON.stringify(error.body, null, 2));
        console.error('--- END OF DETAILED ERROR ---');
        
        // 回傳一個包含 Notion 原始錯誤訊息的標準 JSON
        res.status(500).json({ 
            message: 'Notion API 更新失敗', 
            // 嘗試從 Notion 的錯誤物件中提取更具體的訊息
            errorDetails: error.body ? error.body.message : error.message 
        });
    }
};
