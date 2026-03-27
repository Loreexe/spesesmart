import { addTransaction, updateTransaction, getAccounts, getTags } from '../db.js';

let sheetEl = null;

export function initTransactionSheet() {
    const btnAdd = document.getElementById('btn-add-transaction');
    if (!btnAdd) return;

    sheetEl = document.createElement('div');
    sheetEl.className = 'transaction-sheet-overlay';
    sheetEl.style.display = 'none';
    sheetEl.innerHTML = `
        <div class="transaction-modal">
            <div class="modal-header">
                <h2 class="headline-sm" id="sheet-title">Nuova Transazione</h2>
                <button class="icon-button" id="close-sheet"><span class="material-symbols-outlined">close</span></button>
            </div>
            
            <form id="tx-form">
                <input type="hidden" id="tx-edit-id" value="">
                <div class="amount-group">
                    <span class="currency-symbol">€</span>
                    <input type="number" step="0.01" id="tx-amount" class="amount-input" required placeholder="0.00">
                </div>

                <div class="segmented-control" id="tx-type-segments">
                    <button type="button" class="segment active" data-type="expense">Spesa</button>
                    <button type="button" class="segment" data-type="income">Entrata</button>
                    <button type="button" class="segment" data-type="transfer">Trasferimento</button>
                    <input type="hidden" id="tx-type" value="expense">
                </div>

                <div class="input-section" id="section-account-single">
                    <label class="section-label">CONTO</label>
                    <div class="account-grid" id="account-tiles"></div>
                    <input type="hidden" id="tx-account" required>
                </div>

                <div class="input-section" id="section-account-transfer" style="display: none; padding-bottom: 24px;">
                    <div class="row-group">
                        <div>
                            <label class="section-label">DAL CONTO</label>
                            <select id="tx-account-from" class="modern-field" style="width:100%; padding:12px; border:1px solid var(--md-sys-color-outline-variant); border-radius:12px;"></select>
                        </div>
                        <div>
                            <label class="section-label">AL CONTO</label>
                            <select id="tx-account-to" class="modern-field" style="width:100%; padding:12px; border:1px solid var(--md-sys-color-outline-variant); border-radius:12px;"></select>
                        </div>
                    </div>
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
                            <input type="text" id="tx-desc" class="modern-field" placeholder="Descrizione...">
                        </div>
                    </div>
                </div>

                <div class="input-section" id="section-tags">
                    <div class="section-header-row">
                        <label class="section-label">CATEGORIE</label>
                    </div>
                    <div class="chip-group" id="tag-chips"></div>
                    <input type="hidden" id="tx-tag">
                </div>

                <div class="actions">
                    <button type="button" class="btn-text" id="cancel-sheet">Annulla</button>
                    <div style="display: flex; align-items: center;">
                        <button type="button" class="icon-button" id="btn-scan-receipt" style="margin-right: 8px; color: var(--md-sys-color-primary); border: 1px solid var(--md-sys-color-primary); border-radius: 50%;" aria-label="Scansiona scontrino">
                            <span class="material-symbols-outlined">receipt_long</span>
                        </button>
                        <input type="file" id="receipt-upload" accept="image/*" capture="environment" style="display: none;">
                        <button type="submit" class="btn-primary" id="btn-save-tx">Salva</button>
                    </div>
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
            width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;
            border-radius: 32px; padding: 32px;
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
            font-family: var(--type-display-font); background: transparent;
        }
        .amount-input::-webkit-outer-spin-button,
        .amount-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        .amount-input[type=number] {
            -moz-appearance: textfield;
        }
        .amount-input::placeholder { color: var(--md-sys-color-surface-variant, #eee); }
        
        @keyframes fadeInSlide {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .anim-slide-in {
            animation: fadeInSlide 0.3s ease forwards;
        }
        
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
            display: flex; justify-content: space-between; align-items: center; margin-top: 10px;
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
        
        #btn-scan-receipt.loading {
            animation: pulse-icon 1s infinite alternate;
            pointer-events: none;
        }
        @keyframes pulse-icon {
            0% { transform: scale(1); opacity: 0.5; }
            100% { transform: scale(1.1); opacity: 1; }
        }
    `;

    document.head.appendChild(style);

    // Event listeners
    if(btnAdd) btnAdd.addEventListener('click', () => openTransactionSheet());
    sheetEl.querySelector('#close-sheet').addEventListener('click', closeTransactionSheet);
    sheetEl.querySelector('#cancel-sheet').addEventListener('click', closeTransactionSheet);
    sheetEl.addEventListener('click', (e) => {
        if (e.target === sheetEl) closeTransactionSheet();
    });

    // Segmented control logic
    const segments = sheetEl.querySelectorAll('.segment');
    const typeInput = sheetEl.querySelector('#tx-type');
    const secSingle = sheetEl.querySelector('#section-account-single');
    const secTransf = sheetEl.querySelector('#section-account-transfer');
    const secTags = sheetEl.querySelector('#section-tags');

    segments.forEach(seg => {
        seg.addEventListener('click', () => {
            if (seg.classList.contains('active')) return;
            
            segments.forEach(s => s.classList.remove('active'));
            seg.classList.add('active');
            typeInput.value = seg.dataset.type;

            secSingle.classList.remove('anim-slide-in');
            secTransf.classList.remove('anim-slide-in');
            secTags.classList.remove('anim-slide-in');
            
            void secSingle.offsetWidth;
            void secTransf.offsetWidth;
            void secTags.offsetWidth;

            if (seg.dataset.type === 'transfer') {
                secSingle.style.display = 'none';
                secTransf.style.display = 'block';
                secTransf.classList.add('anim-slide-in');
                
                secTags.style.display = 'none';
                document.getElementById('tx-account').removeAttribute('required');
            } else {
                secSingle.style.display = 'block';
                secSingle.classList.add('anim-slide-in');
                
                secTransf.style.display = 'none';
                
                secTags.style.display = 'block';
                secTags.classList.add('anim-slide-in');
                
                document.getElementById('tx-account').setAttribute('required', 'true');
            }
        });
    });

    // Receipt scan
    const btnScan = document.getElementById('btn-scan-receipt');
    const uploadInput = document.getElementById('receipt-upload');
    
    btnScan.addEventListener('click', (e) => {
        e.preventDefault();
        uploadInput.click();
    });

    uploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        
        btnScan.classList.add('loading');
        try {
            const base64 = await toBase64(file);
            await scanReceiptWithGemini(base64);
        } catch(err) {
            alert(err.message || "Errore lettura file.");
        } finally {
            btnScan.classList.remove('loading');
            uploadInput.value = '';
        }
    });

    // Form Submitter
    sheetEl.querySelector('#tx-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const type = document.getElementById('tx-type').value;
        const amount = parseFloat(document.getElementById('tx-amount').value);
        const description = document.getElementById('tx-desc').value;
        const date = document.getElementById('tx-date').value;
        const editId = document.getElementById('tx-edit-id').value;

        try {
            if (type === 'transfer') {
                const fromAcc = parseInt(document.getElementById('tx-account-from').value, 10);
                const toAcc = parseInt(document.getElementById('tx-account-to').value, 10);
                if (fromAcc === toAcc) {
                    alert("Seleziona due conti diversi.");
                    return;
                }
                const accs = getAccounts();
                const fromName = accs.find(a=>a.id === fromAcc)?.name || 'Conto';
                const toName = accs.find(a=>a.id === toAcc)?.name || 'Conto';

                if (editId) {
                    // Editing a transfer is too complex, we just treat edits normally for now
                    alert("I trasferimenti non possono essere modificati direttamente per ora.");
                    return;
                } else {
                    await addTransaction({ type: 'expense', amount, description: `Trasf a: ${toName} - ${description}`, account_id: fromAcc, date, tag: 'Trasferimento' });
                    await addTransaction({ type: 'income', amount, description: `Ricez da: ${fromName} - ${description}`, account_id: toAcc, date, tag: 'Trasferimento' });
                }
            } else {
                const tx = {
                    type,
                    amount,
                    description,
                    account_id: parseInt(document.getElementById('tx-account').value, 10),
                    date,
                    tag: document.getElementById('tx-tag').value || 'Acquisti'
                };
                if (editId) {
                    await updateTransaction(parseInt(editId, 10), tx);
                } else {
                    await addTransaction(tx);
                }
            }

            closeTransactionSheet();
            if (window.refreshApp) window.refreshApp();
        } catch (err) {
            console.error(err);
            alert("Errore salvataggio transazione.");
        }
    });
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

async function scanReceiptWithGemini(base64Image) {
    const apiKey = localStorage.getItem('GEMINI_API_KEY');
    if(!apiKey) {
        throw new Error("Devi inserire la API Key di Gemini in Impostazioni per scansionare scontrini.");
    }
    
    // Strip prefix from base64
    const base64Data = base64Image.split(',')[1];
    const mimeType = base64Image.substring(base64Image.indexOf(':') + 1, base64Image.indexOf(';'));

    const payload = {
        systemInstruction: { parts: [{ text: "Sei un parser di scontrini. Estrai: date (YYYY-MM-DD), amount (float), description (nome negozio o sintesi, max 3 parole), category (DEVE essere ESATTAMENTE uno tra questi in italiano: Cibo, Spesa, Trasporti, Bollette, Vario). Restituisci SOLO un blocco JSON con queste 4 chiavi." }] },
        contents: [
            {
                role: "user",
                parts: [
                    { text: "Estrai i dati da questo scontrino. Se l'immagine NON sembra essere uno scontrino valido o una ricevuta, restituisci: {\"error\": \"Non è uno scontrino\"}" },
                    { inlineData: { mimeType: mimeType, data: base64Data } }
                ]
            }
        ]
    };

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.error) {
        if(data.error.message.includes('quota')) throw new Error("Hai superato la quota gratuita di Gemini. Riprova più tardi.");
        throw new Error(data.error.message);
    }
    
    const reply = data.candidates[0].content.parts[0].text;
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Formato json non trovato dalla risposta IA.");
    
    const parsed = JSON.parse(jsonMatch[0]);
    if(parsed.error) throw new Error("Immagine non riconosciuta come scontrino.");
    
    // Apply parsed values
    if(parsed.amount && !isNaN(parsed.amount)) document.getElementById('tx-amount').value = parsed.amount;
    if(parsed.date) document.getElementById('tx-date').value = parsed.date;
    if(parsed.description) document.getElementById('tx-desc').value = parsed.description;
    
    if(parsed.category) {
        const chips = document.querySelectorAll('.chip[data-tag]');
        chips.forEach(c => {
            if(c.dataset.tag.toLowerCase() === parsed.category.toLowerCase()) {
                c.click();
            }
        });
    }
}

export function openTransactionSheet(editTx = null) {
    const accTiles = document.getElementById('account-tiles');
    const accs = getAccounts();
    const iconsMap = { 'Cash': 'payments', 'Bank': 'account_balance', 'Savings': 'savings' };

    accTiles.innerHTML = accs.map(a => `
        <div class="account-tile" data-id="${a.id}">
            <span class="material-symbols-outlined">${iconsMap[a.name] || 'account_balance_wallet'}</span>
            <span>${a.name}</span>
        </div>
    `).join('');

    const fromSel = document.getElementById('tx-account-from');
    const toSel = document.getElementById('tx-account-to');
    fromSel.innerHTML = accs.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    toSel.innerHTML = accs.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    if(accs.length > 1) toSel.value = accs[1].id;

    const tiles = accTiles.querySelectorAll('.account-tile');
    const accInput = document.getElementById('tx-account');
    tiles.forEach(tile => {
        tile.addEventListener('click', () => {
            tiles.forEach(t => t.classList.remove('active'));
            tile.classList.add('active');
            accInput.value = tile.dataset.id;
        });
    });

    // Italian categories
    const tagGroup = document.getElementById('tag-chips');
    const tags = ['Cibo', 'Spesa', 'Trasporti', 'Bollette', 'Vario'];
    const tagIcons = { 'Cibo': 'restaurant', 'Spesa': 'shopping_cart', 'Trasporti': 'directions_car', 'Bollette': 'article', 'Vario': 'category' };

    tagGroup.innerHTML = tags.map(t => `
        <button type="button" class="chip" data-tag="${t}">
            <span class="material-symbols-outlined">${tagIcons[t] || 'label'}</span>
            <span>${t}</span>
        </button>
    `).join('');

    const chips = tagGroup.querySelectorAll('.chip[data-tag]');
    const tagInput = document.getElementById('tx-tag');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            tagInput.value = chip.dataset.tag;
        });
    });

    // Reset fields
    document.getElementById('tx-edit-id').value = '';
    document.getElementById('tx-amount').value = '';
    document.getElementById('tx-desc').value = '';
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    
    // Default selects
    sheetEl.querySelector('#sheet-title').innerText = "Nuova Transazione";
    const segments = sheetEl.querySelectorAll('.segment');
    if (tiles.length > 0) tiles[0].click();
    if (chips.length > 0) chips[1].click();
    segments[0].click(); // Defaults to expense

    // If edit mode
    if (editTx) {
        sheetEl.querySelector('#sheet-title').innerText = "Modifica Transazione";
        document.getElementById('tx-edit-id').value = editTx.id;
        document.getElementById('tx-amount').value = editTx.amount;
        document.getElementById('tx-desc').value = editTx.description;
        document.getElementById('tx-date').value = editTx.date;
        
        segments.forEach(s => {
            if (s.dataset.type === editTx.type) s.click();
        });
        
        tiles.forEach(t => {
            if (parseInt(t.dataset.id, 10) === editTx.account_id) t.click();
        });
        
        chips.forEach(c => {
            if (c.dataset.tag === editTx.tag) c.click();
        });
        document.getElementById('tx-type-segments').style.display = 'none'; // Lock type edit
    } else {
        document.getElementById('tx-type-segments').style.display = 'flex';
    }

    sheetEl.style.display = 'flex';
}

export function closeTransactionSheet() {
    sheetEl.style.display = 'none';
    document.getElementById('tx-form').reset();
}

