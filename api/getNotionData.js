const { Client } = require('@notionhq/client');

// 從 Vercel 的環境變數中讀取 API 金鑰
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// 你的三個 Notion 資料庫 ID
const DATABASE_IDS = {
    materials: '23cd43f1a90b814cb7a7e19e0396be93',
    products: '23cd43f1a90b8184bafdf51c7e18049c',
    fragrances: '23cd43f1a90b81859c92e8a4739786c8'
};

// 輔助函式：從 Notion 複雜的屬性物件中提取純文字或數值
const getPropertyValue = (property) => {
    if (!property) return null;
    switch (property.type) {
        case 'title':
            return property.title[0]?.plain_text || '';
        case 'rich_text':
            return property.rich_text[0]?.plain_text || '';
        case 'number':
            return property.number;
        case 'select':
            return property.select?.name || '';
        case 'formula':
            return property.formula.type === 'string' ? property.formula.string : property.formula.number;
        case 'relation':
            return property.relation.map(rel => rel.id);
        case 'date':
            return property.date?.start || null;
        default:
            return null;
    }
};

// Vercel Serverless Function 的主要處理函式
module.exports = async (req, res) => {
    try {
        // 設定 CORS 標頭
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        // 輔助函式：取得一個資料庫的所有頁面
        const getAllPages = async (databaseId) => {
            let allPages = [];
            let hasMore = true;
            let startCursor = undefined;

            while (hasMore) {
                const response = await notion.databases.query({
                    database_id: databaseId,
                    start_cursor: startCursor,
                });
                allPages.push(...response.results);
                hasMore = response.has_more;
                startCursor = response.next_cursor;
            }
            return allPages;
        };

        // 平行處理所有資料庫的請求
        const [materialsPages, productsPages, fragrancesPages] = await Promise.all([
            getAllPages(DATABASE_IDS.materials),
            getAllPages(DATABASE_IDS.products),
            getAllPages(DATABASE_IDS.fragrances)
        ]);

        // 解析材料
        const materials = materialsPages.map(page => ({
            pageId: page.id,
            name: getPropertyValue(page.properties['名稱 Name']),
            category: getPropertyValue(page.properties['類別 Category']),
            subCategory: getPropertyValue(page.properties['細分類別']),
            unit: getPropertyValue(page.properties['單位']),
            currentInv: getPropertyValue(page.properties['庫存']) || 0,
            lastUpdateTime: getPropertyValue(page.properties['庫存最後更新時間']),
            type: 'material'
        }));

        // 解析產品
        const products = productsPages.map(page => ({
            pageId: page.id,
            series: getPropertyValue(page.properties['產品系列']),
            flavor: getPropertyValue(page.properties['產品名稱']),
            nicotineMg: getPropertyValue(page.properties['濃度(MG)']),
            fragranceLogIds: getPropertyValue(page.properties['香精紀錄Flavour Log']),
            otherMaterialIds: getPropertyValue(page.properties['使用材料']),
            type: 'product'
        }));

        // 解析香精紀錄
        const fragrances = fragrancesPages.map(page => ({
            pageId: page.id,
            id: getPropertyValue(page.properties['香精代號']),
            name: getPropertyValue(page.properties['香精名稱']),
            status: getPropertyValue(page.properties['香精狀態']),
            // **已加入**：讀取供應商和芯種類欄位
            supplier: getPropertyValue(page.properties['供應商']),
            coreType: getPropertyValue(page.properties['芯種類']),
            percentage: getPropertyValue(page.properties['香精比例']),
            pgRatio: getPropertyValue(page.properties['PG使用量']),
            vgRatio: getPropertyValue(page.properties['VG使用量']),
            currentInv: getPropertyValue(page.properties['庫存']) || 0,
            lastUpdateTime: getPropertyValue(page.properties['庫存最後更新時間']),
            productIds: getPropertyValue(page.properties['產品名稱']),
            type: 'fragrance'
        }));

        // 對資料進行排序，確保順序穩定
        materials.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        fragrances.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        products.sort((a, b) => (a.flavor || '').localeCompare(b.flavor || ''));


        res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');
        res.status(200).json({
            materials,
            products,
            fragrances
        });

    } catch (error) {
        console.error('Error fetching from Notion:', error);
        res.status(500).json({ message: '從 Notion 讀取資料時發生錯誤', errorDetails: error.message });
    }
};
