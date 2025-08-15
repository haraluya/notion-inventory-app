// 檔案路徑: /js/state.js
// 用途: 集中管理整個應用程式的共用狀態和通用輔助函式。

export const GET_API_ENDPOINT = '/api/getNotionData';
export const UPDATE_API_ENDPOINT = '/api/updateNotionData';
export const LOGIN_API_ENDPOINT = '/api/login';

// 應用程式狀態變數
export let state = {
    allMaterials: [],
    allFragrances: [],
    allProducts: [],
    allItems: [],
    selectedRecipe: null,
    pendingStockUpdates: {},
    orderList: [],
    fragranceSort: { key: 'id', order: 'asc' },
    materialSort: { key: 'name', order: 'asc' },
};

// DOM 元素 (在 main.js 中初始化)
export let dom = {
    loadingOverlay: null,
    seriesSelect: null,
    flavorSelect: null,
    tabs: null,
    tabContents: {},
};

// --- 通用輔助函式 ---

export function getUnit(item) {
    if (item.type === 'fragrance') return 'KG';
    return (item.unit || '').toUpperCase() === 'KG' ? 'KG' : '個';
}

export function formatNumber(num, item) {
    if (typeof num !== 'number' || isNaN(num)) return num;
    const unit = item ? getUnit(item) : 'KG';
    return unit === '個' ? num.toFixed(0) : parseFloat(num.toFixed(3));
}

export function parseNumber(value) {
    if (typeof value === 'string') return parseFloat(value.replace(/,/g, '')) || 0;
    return parseFloat(value) || 0;
}
