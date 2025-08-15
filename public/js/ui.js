// 檔案路徑: /public/js/ui.js
// 用途: 包含所有與 UI 渲染、DOM 操作相關的函式。

import { state, dom, getUnit, formatNumber, parseNumber } from './state.js';

/**
 * 顯示一個互動式彈窗
 * @param {string} title - 彈窗標題
 * @param {string|Array} content - 彈窗訊息或要顯示的更新項目列表
 * @param {object} [options] - 彈窗選項
 * @param {string} [options.confirmText='關閉'] - 確認按鈕文字
 * @param {string} [options.cancelText='取消'] - 取消按鈕文字
 * @param {Function} [options.onConfirm=null] - 點擊確認後的回呼函式
 * @param {boolean} [options.showCancel=false] - 是否顯示取消按鈕
 */
export function showModal(title, content, options = {}) {
    const modalContainer = document.getElementById('modal-container');
    const { confirmText = '關閉', cancelText = '取消', onConfirm = null, showCancel = false } = options;

    let messageContent = '';

    if (Array.isArray(content)) {
        let updateListHtml = content.map(update => {
            const item = state.allItems.find(i => i.pageId === update.pageId);
            const name = item ? (item.id ? `${item.id} (${item.name})` : item.name) : `ID: ${update.pageId}`;
            const unit = item ? getUnit(item) : '';
            return `<li class="text-sm text-gray-800"><span class="font-medium">${name}</span>: 更新為 <span class="font-mono">${formatNumber(update.newStock, item)} ${unit}</span></li>`;
        }).join('');

        if (content.length === 0) {
            messageContent = '<p class="text-sm text-gray-500">沒有項目被更新。</p>';
        } else {
             messageContent = `<p class="text-sm text-gray-600 mb-2">Notion 資料庫已成功更新以下項目：</p>
                             <ul class="list-disc list-inside my-2 space-y-2 bg-gray-50 p-3 rounded-md">
                                ${updateListHtml}
                             </ul>`;
        }
    } else {
        messageContent = `<p class="text-sm text-gray-600 mb-4">${content}</p>`;
    }

    const closeModal = () => modalContainer.innerHTML = '';

    const confirmButton = `<button id="modal-confirm-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-md">${confirmText}</button>`;
    const cancelButton = showCancel ? `<button id="modal-cancel-btn" class="px-4 py-2 bg-gray-200 rounded-md">${cancelText}</button>` : '';

    modalContainer.innerHTML = `<div class="modal fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50">
        <div class="modal-content bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 class="text-lg font-semibold mb-2">${title}</h3>
            ${messageContent}
            <div class="mt-4 flex justify-end gap-2">
                ${cancelButton}
                ${confirmButton}
            </div>
        </div>
    </div>`;

    document.getElementById('modal-confirm-btn').addEventListener('click', () => {
        if (onConfirm) onConfirm();
        closeModal();
    });

    if (showCancel) {
        document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    }
}

/**
 * 填充「產品系列」的下拉選單
 */
export function populateSeriesSelect() {
    const series = [...new Set(state.allProducts.map(r => r.series).filter(Boolean))];
    dom.seriesSelect.innerHTML = '<option value="">-- 請選擇系列 --</option>';
    series.forEach(s => {
        const option = document.createElement('option');
        option.value = s;
        option.textContent = s;
        dom.seriesSelect.appendChild(option);
    });
}

/**
 * 根據選擇的系列，填充「產品名稱」的下拉選單
 * @param {string} selectedSeries - 被選擇的產品系列
 */
export function populateFlavorSelect(selectedSeries) {
    const flavors = state.allProducts.filter(r => r.series === selectedSeries);
    dom.flavorSelect.innerHTML = '<option value="">-- 請選擇產品 --</option>';
    flavors.forEach(f => {
        const option = document.createElement('option');
        option.value = f.flavor;
        option.textContent = f.flavor;
        dom.flavorSelect.appendChild(option);
    });
    dom.flavorSelect.disabled = false;
}

/**
 * 渲染配方詳細資料區塊
 */
export function renderRecipeDetails() {
    const detailsPanel = document.getElementById('recipe-details-panel');
    if (!state.selectedRecipe) {
        detailsPanel.classList.add('hidden');
        return;
    }
    detailsPanel.classList.remove('hidden');

    const fragranceContainer = document.getElementById('fragrance-details-container');
    const relatedFragranceLogs = state.allFragrances.filter(f => state.selectedRecipe.fragranceLogIds.includes(f.pageId));
    
    let headerHtml = `<div class="flex items-center gap-2 mb-2"><h3 class="font-semibold text-gray-800">香精組成</h3>`;
    if (relatedFragranceLogs.length > 0) {
        const mainFragrance = relatedFragranceLogs[0];
        if (mainFragrance.supplier) headerHtml += `<span class="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">${mainFragrance.supplier}</span>`;
        if (mainFragrance.coreType) headerHtml += `<span class="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">${mainFragrance.coreType}</span>`;
    }
    headerHtml += `</div>`;

    let tableHtml = `<div id="details-fragrances" class="text-sm space-y-1"><div class="grid grid-cols-3 gap-2 font-semibold text-gray-700 border-b pb-1 mb-1"><div>香精 (編號)</div><div class="text-center">比例(%)</div><div class="text-right">庫存</div></div>`;
    if (relatedFragranceLogs.length > 0) {
        tableHtml += relatedFragranceLogs.map(log => {
            const stock = `${formatNumber(log.currentInv, log)} ${getUnit(log)}`;
            const name = `${log.name} (${log.id})`;
            const percentageStr = log.percentage ? `${(log.percentage * 100).toFixed(1)}%` : 'N/A';
            return `<div class="grid grid-cols-3 gap-2 items-center"><div>${name}</div><div class="text-center font-mono">${percentageStr}</div><div class="text-right font-mono">${stock}</div></div>`;
        }).join('');
    } else {
        tableHtml += `<div class="text-gray-500">無香精資料</div>`;
    }
    tableHtml += `</div>`;
    fragranceContainer.innerHTML = headerHtml + tableHtml;

    const materialDetails = document.getElementById('details-materials');
    let materialHtml = `<div class="grid grid-cols-2 gap-2 font-semibold text-gray-700 border-b pb-1 mb-1"><div>原料名稱</div><div class="text-right">庫存</div></div>`;
    if (state.selectedRecipe.otherMaterialIds && state.selectedRecipe.otherMaterialIds.length > 0) {
         materialHtml += state.selectedRecipe.otherMaterialIds.map(matId => {
            const item = state.allItems.find(i => i.pageId === matId);
            const stock = item ? `${formatNumber(item.currentInv, item)} ${getUnit(item)}` : 'N/A';
            const name = item ? item.name : `<span class="text-red-500">未找到: ${matId}</span>`;
            return `<div class="grid grid-cols-2 gap-2 items-center"><div>${name}</div><div class="text-right font-mono">${stock}</div></div>`;
        }).join('');
    } else {
        materialHtml += `<div class="text-gray-500">無其他原料</div>`;
    }
    materialDetails.innerHTML = materialHtml;
    
    document.getElementById('details-concentration').textContent = `${state.selectedRecipe.nicotineMg} MG`;
}

/**
 * 根據目標產量計算所需用量，並回傳計算結果
 * @returns {object|null} - 包含各種原料扣除量的物件，或在無法計算時回傳 null
 */
export function handleCalculation() {
    const resultsPanel = document.getElementById('calculation-results');
    const deductionPanel = document.getElementById('deduction-preview-panel');
    const targetProductionKG = parseNumber(document.getElementById('target-production').value);

    if (!state.selectedRecipe || targetProductionKG <= 0) {
        resultsPanel.classList.add('hidden');
        deductionPanel.classList.add('hidden');
        return null; // 回傳 null 表示不需渲染
    }
    resultsPanel.classList.remove('hidden');
    deductionPanel.classList.remove('hidden');

    const resultsList = document.getElementById('calculation-results-list');
    
    const relatedFragranceLogs = state.allFragrances.filter(f => state.selectedRecipe.fragranceLogIds.includes(f.pageId));
    const mainFragranceLog = relatedFragranceLogs[0];

    if (!mainFragranceLog) {
        resultsList.innerHTML = `<div class="text-red-500">錯誤：找不到對應的香精紀錄。</div>`;
        return null;
    }

    const totalFragranceKG = targetProductionKG * mainFragranceLog.percentage;
    const pgKG = targetProductionKG * mainFragranceLog.pgRatio;
    const vgKG = targetProductionKG * mainFragranceLog.vgRatio;
    const nicotineKG = targetProductionKG * state.selectedRecipe.nicotineMg / 250;

    let resultsHtml = '';
    resultsHtml += `<div class="font-medium text-gray-600">總香精量:</div><div class="text-right font-mono">${formatNumber(totalFragranceKG)} KG</div>`;
    resultsHtml += `<div class="font-medium text-gray-600">PG 量:</div><div class="text-right font-mono">${formatNumber(pgKG)} KG</div>`;
    resultsHtml += `<div class="font-medium text-gray-600">VG 量:</div><div class="text-right font-mono">${formatNumber(vgKG)} KG</div>`;
    resultsHtml += `<div class="font-medium text-gray-600">尼古丁鹽:</div><div class="text-right font-mono">${formatNumber(nicotineKG)} KG</div>`;
    resultsList.innerHTML = resultsHtml;

    return { totalFragranceKG, pgKG, vgKG, nicotineKG };
}

/**
 * 渲染生產扣除預覽列表
 * @param {object} amounts - 包含各種原料扣除量的物件
 */
export function renderDeductionPreview(amounts) {
    const deductionList = document.getElementById('deduction-list');
    let headerHtml = `<div class="grid grid-cols-[2fr_1fr_1fr_1fr] gap-x-2 md:gap-x-4 font-semibold text-gray-700 border-b pb-1 mb-1"><div>原料</div><div class="text-right">現有庫存</div><div class="text-right">扣除(手動)</div><div class="text-right">剩餘</div></div>`;
    
    let rowsHtml = '';
    const materialsToDeduct = [];
    const relatedFragranceLogs = state.allFragrances.filter(f => state.selectedRecipe.fragranceLogIds.includes(f.pageId));

    relatedFragranceLogs.forEach(log => {
        materialsToDeduct.push({ item: log, deduction: amounts.totalFragranceKG });
    });

    const pgItem = state.allItems.find(i => i.name && i.name.toUpperCase().includes('PG丙二醇'));
    const vgItem = state.allItems.find(i => i.name && i.name.toUpperCase().includes('VG甘油'));
    const nicotineItem = state.allItems.find(i => i.name && i.name.includes('NicSalt丁鹽'));

    if (pgItem) materialsToDeduct.push({ item: pgItem, deduction: amounts.pgKG });
    if (vgItem) materialsToDeduct.push({ item: vgItem, deduction: amounts.vgKG });
    if (nicotineItem) materialsToDeduct.push({ item: nicotineItem, deduction: amounts.nicotineKG });

    if (state.selectedRecipe.otherMaterialIds) {
        state.selectedRecipe.otherMaterialIds.forEach(matId => {
            const item = state.allItems.find(i => i.pageId === matId);
            if (item && !materialsToDeduct.some(m => m.item.pageId === item.pageId)) {
                materialsToDeduct.push({ item, deduction: 0 }); 
            }
        });
    }

    materialsToDeduct.forEach(({ item, deduction }) => {
        const currentInv = item.currentInv;
        const unit = getUnit(item);
        const remaining = currentInv - deduction;
        const displayName = item.type === 'fragrance' && item.id ? `${item.id} (${item.name})` : item.name;
        rowsHtml += `<div class="deduction-row grid grid-cols-[2fr_1fr_1fr_1fr] gap-x-2 md:gap-x-4 items-center py-1" data-page-id="${item.pageId}" data-initial-stock="${currentInv}"><div class="text-sm break-words pr-1">${displayName}</div><div class="text-right font-mono text-sm current-stock">${formatNumber(currentInv, item)} ${unit}</div><div class="text-right"><input type="number" inputmode="decimal" class="deduction-input font-mono" value="${formatNumber(deduction, item)}"></div><div class="text-right font-mono text-sm remaining-stock ${remaining >= 0 ? '' : 'text-red-600 font-bold'}">${formatNumber(remaining, item)} ${unit}</div></div>`;
    });
    deductionList.innerHTML = headerHtml + rowsHtml;
}

/**
 * 渲染盤點表格（香精或材料）
 * @param {('fragrance'|'material')} type - 要渲染的表格類型
 * @param {string} [searchTerm=''] - 用於過濾的搜尋關鍵字
 */
export function renderCheckTable(type, searchTerm = '') {
    const sourceData = type === 'fragrance' ? state.allFragrances : state.allMaterials;
    const tableBody = document.getElementById(`${type}-check-results`);
    const tableHead = document.getElementById(`${type}-check-head`);
    const term = searchTerm.toLowerCase();

    let dataToRender = searchTerm ? sourceData.filter(item => (item.name || '').toLowerCase().includes(term) || (item.id || '').toLowerCase().includes(term) || (item.category || '').toLowerCase().includes(term) || (item.subCategory || '').toLowerCase().includes(term)) : [...sourceData]; 
    
    const sortState = type === 'fragrance' ? state.fragranceSort : state.materialSort;
    if (sortState.key) {
        dataToRender.sort((a, b) => {
            const valA = a[sortState.key] || '';
            const valB = b[sortState.key] || '';
            const comparison = valA.localeCompare(valB, 'zh-Hant');
            return sortState.order === 'asc' ? comparison : -comparison;
        });
    }

    tableHead.querySelectorAll('th[data-sort-key]').forEach(th => {
        const key = th.dataset.sortKey;
        const indicator = th.querySelector('.sort-indicator');
        if (key === sortState.key) {
            indicator.textContent = sortState.order === 'asc' ? ' ▲' : ' ▼';
        } else {
            indicator.textContent = '';
        }
    });
    
    if (dataToRender.length === 0) {
        const cols = type === 'material' ? 6 : 6;
        tableBody.innerHTML = `<tr><td colspan="${cols}" class="text-center text-gray-500 p-4">找不到符合的項目</td></tr>`;
        return;
    }

    const materialCategoryColors = { '通用材料': 'bg-slate-50', '紙盒': 'bg-orange-50', '貼紙/鋁箔袋': 'bg-lime-50', '煙彈': 'bg-purple-50', '瓶子': 'bg-pink-50', '瓶蓋': 'bg-cyan-50' };

    tableBody.innerHTML = dataToRender.map(item => {
        const unit = getUnit(item);
        const lastUpdate = item.lastUpdateTime ? new Date(item.lastUpdateTime).toLocaleDateString() : 'N/A';
        const pendingValue = state.pendingStockUpdates[item.pageId] || '';
        
        let rowClass = 'transition-colors duration-150';
        if (type === 'fragrance') {
            if (item.status === '下架') rowClass += ' bg-red-100 hover:bg-red-200';
            else if (item.status === '備用') rowClass += ' bg-amber-100 hover:bg-amber-200';
            else rowClass += ' hover:bg-gray-50';
        } else {
            const categoryColor = materialCategoryColors[item.category];
            rowClass += categoryColor ? ` ${categoryColor} hover:brightness-95` : ' hover:bg-gray-50';
        }

        if (type === 'fragrance') {
            const name = `${item.id} (${item.name})`;
            const isInOrder = state.orderList.some(orderItem => orderItem.pageId === item.pageId);
            const orderButtonHtml = isInOrder ? `<span class="text-green-500 font-bold text-xl">✓</span>` : `<button class="add-to-order-btn p-1 bg-blue-500 text-white rounded-full hover:bg-blue-600" data-page-id="${item.pageId}"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg></button>`;
            return `<tr data-page-id="${item.pageId}" class="${rowClass}"><td class="px-4 py-3 text-sm font-medium text-gray-800">${name}</td><td class="px-4 py-3 text-sm text-gray-600 stock-cell">${formatNumber(item.currentInv, item)} ${unit}</td><td class="px-4 py-3"><input type="number" inputmode="decimal" class="check-stock-input" placeholder="輸入盤點量" value="${pendingValue}"></td><td class="px-4 py-3 text-sm text-gray-600">${item.status || 'N/A'}</td><td class="px-4 py-3 text-sm text-gray-600 last-update-cell">${lastUpdate}</td><td class="px-4 py-3 text-center">${orderButtonHtml}</td></tr>`;
        } else {
            return `<tr data-page-id="${item.pageId}" class="${rowClass}"><td class="px-4 py-3 text-sm font-medium text-gray-800">${item.name}</td><td class="px-4 py-3 text-sm text-gray-600">${item.category || ''}</td><td class="px-4 py-3 text-sm text-gray-600">${item.subCategory || ''}</td><td class="px-4 py-3 text-sm text-gray-600 stock-cell">${formatNumber(item.currentInv, item)} ${unit}</td><td class="px-4 py-3"><input type="number" inputmode="decimal" class="check-stock-input" placeholder="輸入盤點量" value="${pendingValue}"></td><td class="px-4 py-3 text-sm text-gray-600 last-update-cell">${lastUpdate}</td></tr>`;
        }
    }).join('');
}

/**
 * 將目前表格中的資料匯出為 Excel 檔案
 * @param {('fragrance'|'material')} type - 要匯出的資料類型
 */
export function exportToExcel(type) {
    const sourceData = type === 'fragrance' ? state.allFragrances : state.allMaterials;
    const searchTerm = document.getElementById(`${type}-search-input`).value.toLowerCase();

    let dataToExport = searchTerm ? sourceData.filter(item => (item.name || '').toLowerCase().includes(searchTerm) || (item.id || '').toLowerCase().includes(searchTerm) || (item.category || '').toLowerCase().includes(searchTerm) || (item.subCategory || '').toLowerCase().includes(searchTerm)) : [...sourceData];

    const sortState = type === 'fragrance' ? state.fragranceSort : state.materialSort;
    if (sortState.key) {
        dataToExport.sort((a, b) => {
            const valA = a[sortState.key] || '';
            const valB = b[sortState.key] || '';
            const comparison = valA.localeCompare(valB, 'zh-Hant');
            return sortState.order === 'asc' ? comparison : -comparison;
        });
    }

    let formattedData, filename;
    
    if (type === 'fragrance') {
        formattedData = dataToExport.map(item => ({ '編號': item.id, '品名': item.name, '庫存 (KG)': item.currentInv, '狀態': item.status || 'N/A', '庫存最後更新時間': item.lastUpdateTime ? new Date(item.lastUpdateTime).toLocaleString() : 'N/A' }));
        filename = '香精盤點報表.xlsx';
    } else {
        formattedData = dataToExport.map(item => ({ '品名': item.name, '類別': item.category || '', '細分類別': item.subCategory || '', '庫存': item.currentInv, '單位': getUnit(item), '庫存最後更新時間': item.lastUpdateTime ? new Date(item.lastUpdateTime).toLocaleString() : 'N/A' }));
        filename = '材料盤點報表.xlsx';
    }

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '盤點資料');
    XLSX.writeFile(workbook, filename);
}

/**
 * 渲染訂貨單頁面
 */
export function renderOrderPage() {
    const container = document.getElementById('order-list-container');
    if (state.orderList.length === 0) {
        container.innerHTML = `<p class="p-8 text-center text-gray-500">訂貨單是空的。請至「香精盤點」頁面點擊 [+] 加入項目。</p>`;
        return;
    }

    container.innerHTML = `<table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50 sticky top-0"><tr><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">供應商</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">產品編號</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">產品名稱</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">數量</th><th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">目前庫存</th><th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">移除</th></tr></thead><tbody class="bg-white divide-y divide-gray-200">${state.orderList.map(item => `<tr data-page-id="${item.pageId}"><td class="px-4 py-3 text-sm text-gray-600">${item.supplier || 'N/A'}</td><td class="px-4 py-3 text-sm font-medium text-gray-800">${item.id}</td><td class="px-4 py-3 text-sm text-gray-600">${item.name}</td><td class="px-4 py-3"><input type="number" inputmode="decimal" class="order-quantity-input" placeholder="數量" value="${item.quantity || ''}"></td><td class="px-4 py-3 text-sm text-gray-600">${formatNumber(item.currentInv, item)} ${getUnit(item)}</td><td class="px-4 py-3 text-center"><button class="remove-from-order-btn p-1 bg-red-500 text-white rounded-full hover:bg-red-600" data-page-id="${item.pageId}"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" /></svg></button></td></tr>`).join('')}</tbody></table>`;
}

/**
 * 更新訂貨單右上角的紅色計數徽章
 */
export function updateOrderBadge() {
    const badge = document.getElementById('order-count-badge');
    if (state.orderList.length > 0) {
        badge.textContent = state.orderList.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}
