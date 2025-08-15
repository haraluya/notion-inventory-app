// 檔案路徑: /js/api.js
// 用途: 處理所有與後端 API 的通訊。**已移除所有 UI 相關的程式碼**。

import { GET_API_ENDPOINT, UPDATE_API_ENDPOINT } from './state.js';

/**
 * 從 Notion 後端代理載入所有資料。
 * 成功時回傳資料物件，失敗時拋出錯誤。
 */
export async function loadDataFromNotion() {
    try {
        const response = await fetch(`${GET_API_ENDPOINT}?t=${new Date().getTime()}`);
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(`API 請求失敗: ${response.status} - ${errData.message || '未知伺服器錯誤'}`);
        }
        return await response.json();
    } catch (error) {
        console.error("從 Notion API 代理讀取資料時發生錯誤:", error);
        // 將錯誤繼續往上拋，讓呼叫者處理
        throw error;
    }
}

/**
 * 將更新請求發送到 Notion 後端代理。
 * @param {Array} updates - 需要更新的項目陣列
 * 成功時回傳 true，失敗時拋出錯誤。
 */
export async function updateNotionData(updates) {
    if (!updates || updates.length === 0) {
        // 如果沒有更新，直接回傳 true 代表一個「無操作的成功」
        return true;
    }
    try {
        const response = await fetch(UPDATE_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates })
        });

        if (!response.ok) {
            let errorMsg = `伺服器回應錯誤: ${response.status}`;
            try {
                const errData = await response.json();
                errorMsg = errData.message || errData.errorDetails || JSON.stringify(errData);
            } catch (e) {
                // 如果解析 JSON 失敗，使用原始的 status text
                errorMsg = `伺服器回應錯誤: ${response.status} ${response.statusText}`;
            }
            throw new Error(errorMsg);
        }
        return true; // 更新成功
    } catch (error) {
        console.error('更新 Notion 資料時發生錯誤:', error);
        // 將錯誤繼續往上拋，讓呼叫者處理
        throw error;
    }
}
