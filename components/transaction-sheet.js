import { addTransaction, getAccounts, getTags } from '../db.js';

let sheetEl = null;

export function initTransactionSheet() {
    const btnAdd = document.getElementById('btn-add-transaction');
    if (!btnAdd) return;

    // Create bottom sheet DOM
    sheetEl = document.createElement('div');
    sheetEl.className = 'transaction-sheet-overlay';
    sheetEl.style.display = 'none';
    sheetEl.innerHTML = `
        <div class="transaction-modal">
            <div class="modal-header">
                <h2 class="headline-sm">Nuova Transazione</h2>
                <button class="icon-button" id="close-sheet"><span class="material-symbols-outlined">close</span></button>
            </div>
            
            <form id="tx-form">
                <div class="amount-group">
                    <span class="currency-symbol">€</span>
                    <input type="number" step="0.01" id="tx-amount" class="amount-input" required placeholder="0.00">
                </div>

                <div class="segmented-control">
                    <button type="button" class="segment active" data-type="expense">Spesa</button>
                    <button type="button" class="segment" data-type="income">Entrata</button>
                    <input type="hidden" id="tx-type" value="expense">
                </div>

                <div class="input-section">
                    <label class="section-label">CONTO</label>
                    <div class="account-grid" id="account-tiles">
                        <!-- Tiles will be injected here -->
                    </div>
                    <input type="hidden" id="tx-account" required>
                </div>

                <div class="row-group">
                    <div class="input-group-modern">
                        <label class="input-label">DATA</label>
                        <div class="input-wrapper">
                            <span class="material-symbols-outlined input-icon">calendar_month</span>
                            <input type="date" id="tx-date" class="modern-field" required>
                        </div>
                    </div>
                    <div class="input-group-modern">
                        <label class="input-label">NOTA</label>
                        <div class="input-wrapper">
                            <span class="material-symbols-outlined input-icon">description</span>
                            <input type="text" id="tx-desc" class="modern-field" placeholder="Per cosa è questa spesa?">
                        </div>
                    </div>
                </div>

                <div class="input-section">
                    <div class="section-header-row">
                        <label class="section-label">CATEGORIE</label>
                        <a href="#" class="manage-link">Gestisci</a>
                    </div>
                    <div class="chip-group" id="tag-chips">
                        <!-- Chips will be injected here -->
                    </div>
                    <input type="hidden" id="tx-tag" required>
                </div>

                <div class="actions">
                    <button type="button" class="btn-text" id="cancel-sheet">Annulla</button>
                    <button type="submit" class="btn-primary">Salva transazione</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(sheetEl);

    // Styling for the overlay
    const style = document.createElement('style');
    style.textContent = `
        .transaction-sheet-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.4); z-index: 2000;
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(2px);
        }
        .transaction-modal {
            background: var(--md-sys-color-surface-container-lowest, white);
            color: var(--md-sys-color-on-surface, #333);
            width: 90%; max-width: 500px;
            border-radius: 32px;
            padding: 32px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes modalPop {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        .modal-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 24px;
        }
        .amount-group {
            display: flex; align-items: center; justify-content: center;
            gap: 12px; margin-bottom: 24px;
        }
        .currency-symbol {
            font-size: 32px; color: var(--md-sys-color-primary, #1c6d25); font-weight: 500; opacity: 0.6;
        }
        .amount-input {
            border: none; outline: none; font-size: 64px; font-weight: 700;
            width: 200px; text-align: center; color: var(--md-sys-color-on-surface, #333);
            font-family: var(--type-display-font);
            background: transparent;
        }
        .amount-input::placeholder { color: var(--md-sys-color-surface-variant, #eee); }
        
        .segmented-control {
            display: flex; background: var(--md-sys-color-surface-container-highest, #f0f4f0); border-radius: 32px;
            padding: 4px; margin-bottom: 32px;
        }
        .segment {
            flex: 1; border: none; background: none; padding: 10px;
            border-radius: 28px; font-weight: 600; cursor: pointer;
            transition: all 0.2s; color: var(--md-sys-color-on-surface-variant, #666); font-size: 14px;
        }
        .segment.active {
            background: var(--md-sys-color-primary, #1c6d25); color: var(--md-sys-color-on-primary, white);
            box-shadow: 0 4px 12px rgba(28, 109, 37, 0.2);
        }

        .section-label {
            font-size: 10px; font-weight: 800; color: var(--md-sys-color-on-surface-variant, #999);
            letter-spacing: 0.05em; margin-bottom: 12px; display: block;
        }
        .section-header-row {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 12px;
        }
        .manage-link {
            font-size: 12px; font-weight: 700; color: var(--md-sys-color-primary, #1c6d25); text-decoration: none;
        }

        .account-grid {
            display: grid; grid-template-columns: repeat(3, 1fr);
            gap: 12px; margin-bottom: 24px; background: var(--md-sys-color-surface-container-low, #f8faf8);
            padding: 12px; border-radius: 16px;
        }
        .account-tile {
            display: flex; flex-direction: column; align-items: center;
            gap: 8px; padding: 16px 8px; border-radius: 12px;
            cursor: pointer; border: 2px solid transparent;
            transition: all 0.2s;
        }
        .account-tile.active {
            background: var(--md-sys-color-surface-container-lowest, white); border-color: var(--md-sys-color-outline-variant, #e0eee0);
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .account-tile .material-symbols-outlined {
            font-size: 24px; color: var(--md-sys-color-on-surface, #333);
        }
        .account-tile span:not(.material-symbols-outlined) {
            font-size: 11px; font-weight: 500; color: var(--md-sys-color-on-surface-variant, #666);
        }

        .row-group {
            display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
            margin-bottom: 24px;
        }
        .input-group-modern { display: flex; flex-direction: column; gap: 6px; }
        .input-label { font-size: 10px; font-weight: 800; color: var(--md-sys-color-on-surface-variant, #999); }
        .input-wrapper {
            display: flex; align-items: center; gap: 8px;
            padding: 12px; border: 1.5px solid var(--md-sys-color-primary, #1c6d25); border-radius: 12px;
        }
        .input-wrapper:has(input:placeholder-shown) { border-color: var(--md-sys-color-outline-variant, #f0f0f0); }
        .input-icon { font-size: 20px; color: var(--md-sys-color-on-surface, #333); }
        .modern-field {
            border: none; outline: none; width: 100%; font-size: 13px;
            font-weight: 500; color: var(--md-sys-color-on-surface, #333); background: transparent;
        }

        .chip-group { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 32px; }
        .chip {
            display: flex; align-items: center; gap: 6px;
            padding: 8px 16px; border-radius: 32px; background: var(--md-sys-color-secondary-container, #e8f0e8);
            cursor: pointer; transition: all 0.2s; border: none;
            color: var(--md-sys-color-on-secondary-container, #333);
        }
        .chip.active { background: var(--md-sys-color-primary, #1c6d25); color: var(--md-sys-color-on-primary, white); }
        .chip .material-symbols-outlined { font-size: 18px; }
        .chip span { font-size: 12px; font-weight: 600; }

        .actions {
            display: flex; justify-content: space-between; align-items: center;
        }
        .btn-text {
            border: none; background: none; color: var(--md-sys-color-on-surface-variant, #666); font-weight: 600;
            cursor: pointer; padding: 12px 24px;
        }
        .btn-primary {
            background: var(--md-sys-color-primary, #1c6d25); color: var(--md-sys-color-on-primary, white); border: none;
            padding: 16px 32px; border-radius: 16px; font-weight: 700;
            cursor: pointer; box-shadow: 0 8px 24px rgba(28, 109, 37, 0.2);
            font-size: 15px;
        }
    `;

    document.head.appendChild(style);

    // Event listeners
    btnAdd.addEventListener('click', openTransactionSheet);
    sheetEl.querySelector('#close-sheet').addEventListener('click', closeTransactionSheet);
    sheetEl.querySelector('#cancel-sheet').addEventListener('click', closeTransactionSheet);
    sheetEl.addEventListener('click', (e) => {
        if (e.target === sheetEl) closeTransactionSheet();
    });

    // Segmented control logic
    const segments = sheetEl.querySelectorAll('.segment');
    const typeInput = sheetEl.querySelector('#tx-type');
    segments.forEach(seg => {
        seg.addEventListener('click', () => {
            segments.forEach(s => s.classList.remove('active'));
            seg.classList.add('active');
            typeInput.value = seg.dataset.type;
        });
    });

    sheetEl.querySelector('#tx-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const tx = {
            type: document.getElementById('tx-type').value,
            amount: parseFloat(document.getElementById('tx-amount').value),
            description: document.getElementById('tx-desc').value,
            account_id: parseInt(document.getElementById('tx-account').value, 10),
            date: document.getElementById('tx-date').value,
            tag: document.getElementById('tx-tag').value,
        };

        if (isNaN(tx.account_id)) {
            alert("Seleziona un conto");
            return;
        }

        try {
            await addTransaction(tx);
            closeTransactionSheet();
            if (window.refreshApp) window.refreshApp();
        } catch (err) {
            console.error(err);
            alert("Errore salvataggio transazione.");
        }
    });
}

export function openTransactionSheet() {
    // Populate Accounts
    const accTiles = document.getElementById('account-tiles');
    const accs = getAccounts();
    const iconsMap = { 'Cash': 'payments', 'Bank': 'account_balance', 'Savings': 'savings' };

    accTiles.innerHTML = accs.map(a => `
        <div class="account-tile" data-id="${a.id}">
            <span class="material-symbols-outlined">${iconsMap[a.name] || 'account_balance_wallet'}</span>
            <span>${a.name}</span>
        </div>
    `).join('');

    const tiles = accTiles.querySelectorAll('.account-tile');
    const accInput = document.getElementById('tx-account');
    tiles.forEach(tile => {
        tile.addEventListener('click', () => {
            tiles.forEach(t => t.classList.remove('active'));
            tile.classList.add('active');
            accInput.value = tile.dataset.id;
        });
    });

    // Populate Categories (Tags)
    const tagGroup = document.getElementById('tag-chips');
    const tags = ['Food', 'Groceries', 'Transport', 'Bills'];
    const tagIcons = { 'Food': 'restaurant', 'Groceries': 'shopping_cart', 'Transport': 'directions_car', 'Bills': 'article' };

    tagGroup.innerHTML = tags.map(t => `
        <button type="button" class="chip" data-tag="${t}">
            <span class="material-symbols-outlined">${tagIcons[t] || 'label'}</span>
            <span>${t}</span>
        </button>
    `).join('') + `
        <button type="button" class="chip" style="background:none; border: 1px dashed #ccc; color: #999;">
             <span class="material-symbols-outlined">add</span>
        </button>
    `;

    const chips = tagGroup.querySelectorAll('.chip[data-tag]');
    const tagInput = document.getElementById('tx-tag');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            tagInput.value = chip.dataset.tag;
        });
    });

    // Set default date to today
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];

    sheetEl.style.display = 'flex';
}

export function closeTransactionSheet() {
    sheetEl.style.display = 'none';
    document.getElementById('tx-form').reset();
    // Reset selections
    sheetEl.querySelectorAll('.segment').forEach((s, i) => {
        if (i === 0) s.classList.add('active');
        else s.classList.remove('active');
        if (i === 0) document.getElementById('tx-type').value = s.dataset.type;
    });
}
