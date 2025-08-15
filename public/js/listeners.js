// 檔案路徑: /js/listeners.js
// 用途: 初始化所有 DOM 事件監聽器。**現在接收一個回呼函式來觸發刷新**。

import { state, dom, parseNumber, formatNumber, getUnit } from './state.js';
import { updateNotionData } from './api.js';
import { 
    populateFlavorSelect, 
    renderRecipeDetails, 
    handleCalculation, 
    renderDeductionPreview, // <-- 已引入 renderDeductionPreview
    renderCheckTable, 
    exportToExcel, 
    renderOrderPage, 
    updateOrderBadge,
    showModal
} from './ui.js';

function savePendingUpdates(type) {
    const tableBody = document.getElementById(`${type}-check-results`);
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        const input = row.querySelector('.check-stock-input');
        const pageId = row.dataset.pageId;
        if (input && input.value !== '') {
            state.pendingStockUpdates[pageId] = input.value;
        } else if (input && input.value === '') {
            delete state.pendingStockUpdates[pageId];
        }
    });
}

/**
 * 初始化整個應用程式的事件監聽器
 * @param {Function} refreshAppCallback - 一個函式，呼叫它會重新載入並渲染整個應用的資料
 */
export function initializeEventListeners(refreshAppCallback) {
    dom.seriesSelect.addEventListener('change', (e) => {
        const series = e.target.value;
        document.getElementById('calculator-body').classList.add('hidden');
        document.getElementById('recipe-details-panel').classList.add('hidden');
        dom.flavorSelect.disabled = true;
        if (series) {
            populateFlavorSelect(series);
        }
    });

    dom.flavorSelect.addEventListener('change', (e) => {
        const flavor = e.target.value;
        state.selectedRecipe = state.allProducts.find(r => r.series === dom.seriesSelect.value && r.flavor === flavor) || null;
        document.getElementById('calculator-body').classList.toggle('hidden', !state.selectedRecipe);
        document.getElementById('deduction-preview-panel').classList.add('hidden');
        renderRecipeDetails();
    });
    
    // --- 已修復 ---
    // 在計算後，使用其結果來渲染扣除預覽
    document.getElementById('target-production').addEventListener('input', () => {
        const calculatedAmounts = handleCalculation();
        if (calculatedAmounts) {
            renderDeductionPreview(calculatedAmounts);
        }
    });
    
    document.getElementById('deduction-list').addEventListener('input', e => {
        if (e.target.classList.contains('deduction-input')) {
            const row = e.target.closest('.deduction-row');
            const initialStock = parseNumber(row.dataset.initialStock);
            const deduction = parseNumber(e.target.value);
            const remaining = initialStock - deduction;
            const item = state.allItems.find(i => i.pageId === row.dataset.pageId);
            
            const remainingEl = row.querySelector('.remaining-stock');
            remainingEl.textContent = `${formatNumber(remaining, item)} ${getUnit(item)}`;
            remainingEl.classList.toggle('text-red-600', remaining < 0);
            remainingEl.classList.toggle('font-bold', remaining < 0);
        }
    });

    document.getElementById('deduct-stock-btn').addEventListener('click', async () => {
        dom.loadingOverlay.classList.remove('hidden');
        try {
            const deductionRows = document.querySelectorAll('#deduction-list .deduction-row');
            let insufficientItems = [];
            const updates = [];

            deductionRows.forEach(row => {
                const initialStock = parseNumber(row.dataset.initialStock);
                const deductionInput = row.querySelector('.deduction-input');
                const deduction = parseNumber(deductionInput.value);

                if (initialStock < deduction) {
                    const itemName = row.querySelector('div:first-child').textContent;
                    insufficientItems.push(itemName);
                } else if (deduction > 0) {
                    const newStock = initialStock - deduction;
                    updates.push({ pageId: row.dataset.pageId, newStock: parseFloat(newStock.toFixed(3)) });
                }
            });

            if (insufficientItems.length > 0) {
                throw new Error(`庫存不足，無法扣除以下項目：<br>- ${insufficientItems.join('<br>- ')}`);
            }

            await updateNotionData(updates);
            showModal('更新成功', updates);
            // 成功後，呼叫回呼函式來刷新整個應用
            await refreshAppCallback();

        } catch (error) {
            showModal('操作失敗', error.message);
        } finally {
            dom.loadingOverlay.classList.add('hidden');
        }
    });

    dom.tabs.addEventListener('click', e => {
        if (e.target.tagName !== 'BUTTON') return;
        const tab = e.target.dataset.tab;
        dom.tabs.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        Object.values(dom.tabContents).forEach(content => content.classList.add('hidden'));
        dom.tabContents[tab].classList.remove('hidden');

        if (tab === 'fragrance-order') {
            renderOrderPage();
        }
    });

    // 全域 - 重新整理按鈕現在呼叫回呼函式
    document.getElementById('refresh-btn').addEventListener('click', refreshAppCallback);

    // 全域 - 登出按鈕
    document.getElementById('logout-btn').addEventListener('click', () => {
        // 顯示確認對話框，增加安全性
        if (confirm('您確定要登出嗎？')) {
            sessionStorage.removeItem('isAuthenticated');
            location.reload();
        }
    });
    document.getElementById('fragrance-search-input').addEventListener('input', (e) => {
        savePendingUpdates('fragrance');
        renderCheckTable('fragrance', e.target.value);
    });
    document.getElementById('material-search-input').addEventListener('input', (e) => {
        savePendingUpdates('material');
        renderCheckTable('material', e.target.value);
    });

    async function handleStockUpdateButtonClick(type) {
        dom.loadingOverlay.classList.remove('hidden');
        try {
            savePendingUpdates(type); 
            const updates = Object.keys(state.pendingStockUpdates).map(pageId => {
                const item = (type === 'fragrance' ? state.allFragrances : state.allMaterials).find(i => i.pageId === pageId);
                if (item) {
                    const newStockValue = state.pendingStockUpdates[pageId];
                    const newStock = parseNumber(newStockValue);
                    return { pageId: pageId, newStock: parseFloat(newStock.toFixed(3)) };
                }
                return null;
            }).filter(Boolean);

            if (updates.length === 0) {
                showModal('提示', '沒有需要更新的項目。');
                return;
            }
            
            await updateNotionData(updates);
            showModal('更新成功', updates);
            // 成功後，呼叫回呼函式來刷新整個應用
            await refreshAppCallback();

        } catch (error) {
            showModal('更新失敗', error.message);
        } finally {
            dom.loadingOverlay.classList.add('hidden');
        }
    }
    document.getElementById('update-fragrance-stock-btn').addEventListener('click', () => handleStockUpdateButtonClick('fragrance'));
    document.getElementById('update-material-stock-btn').addEventListener('click', () => handleStockUpdateButtonClick('material'));
    
    document.getElementById('export-fragrance-btn').addEventListener('click', () => exportToExcel('fragrance'));
    document.getElementById('export-material-btn').addEventListener('click', () => exportToExcel('material'));

    function handleSort(e, type) {
        const key = e.target.closest('th').dataset.sortKey;
        if (!key) return;

        const sortState = type === 'fragrance' ? state.fragranceSort : state.materialSort;
        if (sortState.key === key) {
            sortState.order = sortState.order === 'asc' ? 'desc' : 'asc';
        } else {
            sortState.key = key;
            sortState.order = 'asc';
        }
        renderCheckTable(type, document.getElementById(`${type}-search-input`).value);
    }
    document.getElementById('fragrance-check-head').addEventListener('click', (e) => handleSort(e, 'fragrance'));
    document.getElementById('material-check-head').addEventListener('click', (e) => handleSort(e, 'material'));

    document.body.addEventListener('click', e => {
        if (e.target.closest('.add-to-order-btn')) {
            const pageId = e.target.closest('.add-to-order-btn').dataset.pageId;
            const itemToAdd = state.allFragrances.find(f => f.pageId === pageId);
            if (itemToAdd && !state.orderList.some(item => item.pageId === pageId)) {
                state.orderList.push({ ...itemToAdd, quantity: '' });
                updateOrderBadge();
                renderCheckTable('fragrance', document.getElementById('fragrance-search-input').value);
            }
        }
        if (e.target.closest('.remove-from-order-btn')) {
            const pageId = e.target.closest('.remove-from-order-btn').dataset.pageId;
            state.orderList = state.orderList.filter(item => item.pageId !== pageId);
            updateOrderBadge();
            renderOrderPage();
            renderCheckTable('fragrance', document.getElementById('fragrance-search-input').value);
        }
    });

    document.body.addEventListener('change', e => {
        if (e.target.classList.contains('order-quantity-input')) {
            const pageId = e.target.closest('tr').dataset.pageId;
            const itemInOrder = state.orderList.find(item => item.pageId === pageId);
            if (itemInOrder) {
                itemInOrder.quantity = e.target.value;
            }
        }
    });

    document.getElementById('confirm-order-btn').addEventListener('click', () => {
        if (state.orderList.length === 0) {
            showModal('提示', '訂貨單是空的。');
            return;
        }

        const itemsWithMissingQuantity = state.orderList.filter(item => !item.quantity || parseNumber(item.quantity) <= 0);
        if (itemsWithMissingQuantity.length > 0) {
            const itemNames = itemsWithMissingQuantity.map(item => item.name).join(', ');
            showModal('錯誤', `以下項目未填寫訂貨數量或數量為0：<br>- ${itemNames}`);
            return;
        }

        const orderPerson = document.getElementById('order-person').value;
        const groupedBySupplier = state.orderList.reduce((acc, item) => {
            const supplier = item.supplier || '未知供應商';
            if (!acc[supplier]) acc[supplier] = [];
            acc[supplier].push(item);
            return acc;
        }, {});

        let mailBodyText = `香精訂貨需求\n訂貨人: ${orderPerson}\n\n此為系統自動產生的訂貨需求單，請確認以下內容：\n\n`;
        Object.entries(groupedBySupplier).forEach(([supplier, items]) => {
            mailBodyText += `================================\n| 供應商: ${supplier}\n--------------------------------\n| ${"產品編號".padEnd(15)}| ${"產品名稱".padEnd(15)}| 訂貨數量\n`;
            items.forEach(item => {
                const quantity = `${item.quantity || '未填寫'} KG`;
                mailBodyText += `| ${item.id.padEnd(15)}| ${item.name.padEnd(15)}| ${quantity}\n`;
            });
            mailBodyText += `\n`;
        });

        const mailSubject = `香精訂貨單 - ${new Date().toLocaleDateString()} - ${orderPerson}`;
        const mailtoLink = `mailto:haraluya777@gmail.com?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBodyText)}`;
        const confirmationHtml = `<pre class="text-sm text-gray-800 whitespace-pre-wrap">${mailBodyText}</pre>`;
        const modalContainer = document.getElementById('modal-container');
        modalContainer.innerHTML = `<div class="modal fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50"><div class="modal-content bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl"><h3 class="text-lg font-semibold mb-2">確認訂貨內容</h3><div class="text-sm text-gray-600 mb-4 max-h-96 overflow-y-auto bg-gray-50 p-3 rounded-md">${confirmationHtml}</div><div class="mt-4 flex justify-end gap-2"><button onclick="document.getElementById('modal-container').innerHTML = ''" class="px-4 py-2 bg-gray-200 rounded-md">取消</button><a href="${mailtoLink}" id="send-email-btn" class="px-4 py-2 bg-blue-600 text-white rounded-md">產生郵件</a></div></div></div>`;

        document.getElementById('send-email-btn').addEventListener('click', () => {
            state.orderList = [];
            updateOrderBadge();
            renderOrderPage();
            renderCheckTable('fragrance');
            document.getElementById('modal-container').innerHTML = '';
        });
    });
}
