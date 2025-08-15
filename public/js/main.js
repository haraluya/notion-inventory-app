// 檔案路徑: /public/js/main.js
// 用途: 應用程式的主進入點。負責協調資料獲取和 UI 更新。

import { state, dom } from './state.js';
import { loadDataFromNotion } from './api.js';
import { initializeEventListeners } from './listeners.js';
import { 
    populateSeriesSelect, 
    renderCheckTable, 
    showModal, 
    renderRecipeDetails,
    handleCalculation,
    renderDeductionPreview
} from './ui.js';

// --- 新增：密碼設定 ---
// 您可以在這裡修改密碼
const PASSWORD = '60087'; 

/**
 * 應用程式的核心刷新函式。
 * 負責獲取最新資料、更新狀態並重新渲染整個 UI。
 */
async function initializeApp() {
    dom.loadingOverlay.classList.remove('hidden');
    state.pendingStockUpdates = {};
    try {
        const data = await loadDataFromNotion();
        
        // 更新全域狀態
        state.allMaterials = data.materials;
        state.allFragrances = data.fragrances;
        state.allProducts = data.products;
        state.allItems = [...data.materials, ...data.fragrances];
        
        // 根據新資料重新渲染 UI
        populateSeriesSelect();
        document.getElementById('fragrance-search-input').value = '';
        document.getElementById('material-search-input').value = '';
        renderCheckTable('fragrance');
        renderCheckTable('material');

        // 如果之前有選中的配方，也嘗試重新渲染它
        if (state.selectedRecipe) {
            state.selectedRecipe = state.allProducts.find(p => p.pageId === state.selectedRecipe.pageId) || null;
            if (state.selectedRecipe) {
                renderRecipeDetails();
                const calculatedAmounts = handleCalculation();
                if (calculatedAmounts) {
                    renderDeductionPreview(calculatedAmounts);
                }
            }
        }

    } catch (error) {
        showModal('載入失敗', `無法從 Notion 載入資料，請檢查網路連線或後端服務。<br><br>錯誤: ${error.message}`);
    } finally {
        dom.loadingOverlay.classList.add('hidden');
    }
}

// --- 修改：應用程式啟動流程 ---
// 當 DOM 載入完成後，啟動整個應用程式
document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化所有 DOM 元素參照，包含密碼相關元素
    dom.loadingOverlay = document.getElementById('loading-overlay');
    dom.seriesSelect = document.getElementById('recipe-series');
    dom.flavorSelect = document.getElementById('recipe-flavor');
    dom.tabs = document.getElementById('tabs');
    dom.tabContents = {
        recipes: document.getElementById('recipes-content'),
        'fragrance-check': document.getElementById('fragrance-check-content'),
        'material-check': document.getElementById('material-check-content'),
        'fragrance-order': document.getElementById('fragrance-order-content'),
    };
    
    const passwordModal = document.getElementById('password-modal');
    const passwordInput = document.getElementById('password-input');
    const passwordSubmit = document.getElementById('password-submit');
    const passwordError = document.getElementById('password-error');
    const appContainer = document.getElementById('app-container');

    // 驗證成功後執行的函式
    function startApplication() {
        passwordModal.classList.add('hidden');
        appContainer.classList.remove('hidden');
        initializeEventListeners(initializeApp);
        initializeApp();
    }

    // 檢查密碼的函式
    function checkPassword() {
        if (passwordInput.value === PASSWORD) {
            // 密碼正確，在 session 中記錄狀態並啟動應用
            sessionStorage.setItem('isAuthenticated', 'true');
            startApplication();
        } else {
            // 密碼錯誤，顯示提示
            passwordError.classList.remove('hidden');
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    // 2. 檢查使用者是否已在本機 session 中驗證過
    if (sessionStorage.getItem('isAuthenticated') === 'true') {
        startApplication();
    } else {
        // 若尚未驗證，則顯示密碼彈窗並設定監聽
        passwordSubmit.addEventListener('click', checkPassword);
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });
        passwordInput.focus(); // 自動聚焦到輸入框
    }
});
