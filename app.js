import { initDatabase, getAccounts, getTransactions, addAccount, addRecurringTransaction, getRecurringTransactions, addTransaction, deleteAccount, getAccountById, updateAccount, importFromCSV, setLocalFileHandle } from './db.js';
import { renderAccountCard } from './components/account-card.js';
import { initTransactionSheet } from './components/transaction-sheet.js';
import { renderReportsView } from './reports.js';
import { renderAssistantView } from './gemini.js';

const DOM = {
    mainContent: document.getElementById('main-content'),
    viewTitle: document.getElementById('view-title'),
    navItems: document.querySelectorAll('.nav-item'),
    btnAddTx: document.getElementById('btn-add-transaction')
};

// Main app logic continues below...


function setupNavigation() {
    DOM.navItems.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            DOM.navItems.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadView(view);
        });
    });
}

export async function loadView(view) {
    DOM.mainContent.innerHTML = '';

    if (view === 'dashboard') {
        DOM.viewTitle.textContent = 'Dashboard';
        await renderDashboard();
    } else if (view === 'transactions') {
        DOM.viewTitle.textContent = 'Spese';
        await renderTransactions();
    } else if (view === 'reports') {
        DOM.viewTitle.textContent = 'Report';
        await renderReportsView(DOM.mainContent);
    } else if (view === 'assistant') {
        DOM.viewTitle.textContent = 'Assistente IA';
        await renderAssistantView(DOM.mainContent);
    } else if (view === 'settings') {
        DOM.viewTitle.textContent = 'Impostazioni';
        renderSettingsView(DOM.mainContent);
    } else if (view === 'recurring') {
        DOM.viewTitle.textContent = 'Spese Ricorrenti';
        await renderRecurringView(DOM.mainContent);
    }
}

async function renderDashboard() {
    const allAccs = getAccounts();
    const standardAccs = allAccs.filter(a => a.type !== 'savings_fund');
    const goalAccs = allAccs.filter(a => a.type === 'savings_fund');
    const txs = getTransactions({ sortOrder: 'DESC' }).slice(0, 5);

    const totalBalance = allAccs.reduce((sum, a) => sum + a.balance, 0);
    const balanceStr = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(totalBalance);

    // Calculate Monthly Performance
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthTxs = getTransactions().filter(t => t.date.startsWith(currentMonth));
    const monthlyPerf = monthTxs.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
    const perfSign = monthlyPerf >= 0 ? '+' : '';
    const perfStr = `${perfSign}${new Intl.NumberFormat('it-IT').format(monthlyPerf)} €`;

    // Calculate Savings %
    const savingsBalance = goalAccs.reduce((sum, a) => sum + a.balance, 0);
    const savingsPercent = totalBalance > 0 ? Math.round((savingsBalance / totalBalance) * 100) : 0;

    // 1. Patrimonio Netto Card
    const patrimonioCard = document.createElement('div');
    patrimonioCard.className = 'net-worth-card';
    patrimonioCard.innerHTML = `
        <div class="net-worth-label">Patrimonio Netto</div>
        <div class="net-worth-amount">${balanceStr}</div>
        <div class="net-worth-stats">
            <div class="stat-item">
                <span class="stat-value">${perfStr}</span>
                <span class="stat-label">Rendimento Mensile</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${savingsPercent}%</span>
                <span class="stat-label">Risparmi</span>
            </div>
        </div>
    `;

    // 2. Conti Correnti Section
    const accSection = document.createElement('section');
    accSection.innerHTML = `
        <div class="section-header" style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
            <h2 class="headline-sm">I tuoi conti</h2>
            <button class="icon-button" style="background: var(--md-sys-color-surface-container-highest);" id="btn-add-account">
                <span class="material-symbols-outlined">add</span>
            </button>
        </div>
        <div class="accounts-grid">
            ${standardAccs.map(a => renderAccountCard(a)).join('')}
        </div>
    `;

    // 3. Salvadanaio e Fondi
    const goalSection = document.createElement('section');
    goalSection.style.marginTop = '1.5rem';
    goalSection.innerHTML = `
        <div class="section-header" style="display: flex; justify-content: space-between; align-items: center;">
            <h2 class="headline-sm">Salvadanaio e Fondi</h2>
            <div>
                <button class="icon-button" style="background: var(--md-sys-color-surface-container-highest); margin-right: 8px;" id="btn-add-fund">
                    <span class="material-symbols-outlined">add</span>
                </button>
                <button class="icon-button" style="background: var(--md-sys-color-surface-container-highest);" id="btn-settings-goals">
                    <span class="material-symbols-outlined">settings</span>
                </button>
            </div>
        </div>
        <div class="accounts-grid">
            ${goalAccs.map(g => renderAccountCard(g)).join('')}
        </div>
    `;

    // 4. Riepilogo Spese (Recent Txs)
    const txSection = document.createElement('section');
    txSection.style.marginTop = '1.5rem';
    txSection.innerHTML = `
        <div class="section-header">
            <div>
                <h2 class="headline-sm">Riepilogo Spese</h2>
                <p class="body-md" style="color: var(--md-sys-color-on-surface-variant)">Le tue ultime 5 transazioni</p>
            </div>
        </div>
        <div class="tx-list" style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${txs.length === 0 ? '<div class="filled-card"><p class="body-md">Nessuna transazione recente.</p></div>' : ''}
            ${txs.map(t => renderTransactionRow(t)).join('')}
        </div>
    `;

    DOM.mainContent.appendChild(patrimonioCard);
    DOM.mainContent.appendChild(accSection);
    DOM.mainContent.appendChild(goalSection);
    DOM.mainContent.appendChild(txSection);

    // Click Handlers
    const addAccBtn = accSection.querySelector('#btn-add-account');
    if (addAccBtn) addAccBtn.onclick = () => openAccountModal(null, 'account');
    
    const settingsBtn = goalSection.querySelector('#btn-settings-goals');
    if (settingsBtn) settingsBtn.onclick = () => loadView('recurring');

    const addFundBtn = goalSection.querySelector('#btn-add-fund');
    if (addFundBtn) addFundBtn.onclick = () => openAccountModal(null, 'savings_fund');
}

async function renderTransactions() {
    const txSection = document.createElement('section');
    txSection.innerHTML = `
        <div class="section-header">
            <div>
                <h2 class="headline-sm">Storico Transazioni</h2>
                <p class="body-md" style="color: var(--md-sys-color-on-surface-variant)">Cerca e filtra le tue spese passate</p>
            </div>
        </div>
        <div class="filled-card" style="margin-bottom: 1rem; padding: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
            <input type="text" id="filter-text" class="input-field" placeholder="Cerca descrizione o tag..." style="flex: 1; min-width: 150px;">
            <select id="filter-type" class="input-field" style="min-width: 120px;">
                <option value="expense">Spese</option>
                <option value="income">Entrate</option>
            </select>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <label class="label-sm">Dal:</label>
                <input type="date" id="filter-date-from" class="input-field" style="max-width: 140px;">
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <label class="label-sm">Al:</label>
                <input type="date" id="filter-date-to" class="input-field" style="max-width: 140px;">
            </div>
        </div>
        <div id="tx-results" class="tx-list" style="display: flex; flex-direction: column; gap: 1rem;"></div>
    `;
    DOM.mainContent.appendChild(txSection);

    const resultsContainer = document.getElementById('tx-results');

    function applyFilters() {
        const text = document.getElementById('filter-text').value.toLowerCase();
        const type = document.getElementById('filter-type').value;
        const dateFrom = document.getElementById('filter-date-from').value;
        const dateTo = document.getElementById('filter-date-to').value;

        const allTxs = getTransactions({ type, dateFrom: dateFrom || null, dateTo: dateTo || null });
        const filtered = allTxs.filter(t => t.description.toLowerCase().includes(text) || t.tag.toLowerCase().includes(text));

        if (filtered.length === 0) {
            resultsContainer.innerHTML = '<div class="filled-card"><p class="body-md">Nessuna transazione trovata.</p></div>';
            return;
        }

        // Group by Month-Year
        const grouped = {};
        const monthNames = ["GEN", "FEB", "MAR", "APR", "MAG", "GIU", "LUG", "AGO", "SET", "OTT", "NOV", "DIC"];
        
        filtered.forEach(t => {
            let mYear = "Sconosciuto";
            if (t.date) {
                const parts = t.date.includes('/') ? t.date.split('/') : t.date.split('-');
                if (parts.length >= 2) {
                    const m = parseInt(t.date.includes('/') ? parts[1] : parts[1], 10) - 1;
                    const y = t.date.includes('/') ? parts[2] : parts[0];
                    if (m >= 0 && m <= 11) mYear = `${monthNames[m]} - ${y}`;
                }
            }
            if (!grouped[mYear]) grouped[mYear] = [];
            grouped[mYear].push(t);
        });

        let txHtml = '';
        for (const [mYear, txGroup] of Object.entries(grouped)) {
            txHtml += `<h3 class="title-md" style="margin-top: 0.5rem; margin-bottom: 0.5rem; color: var(--md-sys-color-on-surface-variant);">${mYear}</h3>`;
            txHtml += `<div style="display: flex; flex-direction: column; gap: 0.5rem;">`;
            txGroup.forEach(t => {
                txHtml += renderTransactionRow(t);
            });
            txHtml += `</div>`;
        }

        resultsContainer.innerHTML = txHtml;
    }

    applyFilters();

    let debounceTimer;
    document.getElementById('filter-text').addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilters, 300);
    });
    document.getElementById('filter-type').addEventListener('change', applyFilters);
    document.getElementById('filter-date-from').addEventListener('change', applyFilters);
    document.getElementById('filter-date-to').addEventListener('change', applyFilters);
}

export function renderTransactionRow(tx) {
    const isIncome = tx.type === 'income';
    const amountClass = isIncome ? 'color-income' : 'color-expense';
    const sign = isIncome ? '+' : '-';
    const color = isIncome ? 'var(--color-income)' : 'var(--color-expense)';
    const icon = isIncome ? 'arrow_downward' : 'arrow_upward';

    const receiptHtml = tx.receipt_image ? `
        <button class="icon-button" onclick="event.stopPropagation(); showReceipt('${tx.receipt_image}')" style="margin-right: 0.5rem; color: var(--md-sys-color-primary);">
            <span class="material-symbols-outlined" style="font-size: 20px;">receipt_long</span>
        </button>
    ` : '';

    return `
        <div class="filled-card" onclick="if(window.editTransactionUI) window.editTransactionUI(${tx.id})" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; cursor: pointer; transition: background 0.2s;">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="background: var(--md-sys-color-surface-container-highest); padding: 8px; border-radius: 50%; display:flex; align-items:center; justify-content:center; color: var(--md-sys-color-on-surface-variant);">
                    <span class="material-symbols-outlined">${icon}</span>
                </div>
                <div>
                    <div class="title-md">${tx.description}</div>
                    <div class="body-md" style="color: var(--md-sys-color-on-surface-variant)">${tx.date} • ${tx.account_name} &nbsp; <span class="label-sm">${tx.tag}</span></div>
                </div>
            </div>
            <div style="display: flex; align-items: center;">
                ${receiptHtml}
                <div class="title-md" style="color: ${color}">
                    ${sign}€${tx.amount.toFixed(2)}
                </div>
            </div>
        </div>
    `;
}

window.showReceipt = (base64) => {
    const modal = document.createElement('div');
    modal.className = 'bottom-sheet-overlay';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.innerHTML = `
        <div class="filled-card" style="padding: 1rem; max-width: 90vw; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; align-items: center;">
            <img src="${base64}" style="max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 8px;">
            <button class="fab-extended primary" onclick="this.closest('.bottom-sheet-overlay').remove()" style="position: static; margin-top: 1rem; width: 100%; justify-content: center;">Chiudi</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
};

window.deleteAccountUI = async (id) => {
    if (confirm("Sei sicuro di voler eliminare questo conto? Verranno eliminate anche tutte le transazioni associate.")) {
        await deleteAccount(id);
        window.refreshApp();
    }
};

window.editAccountUI = (id) => {
    const acc = getAccountById(id);
    if(acc) openAccountModal(acc);
};

window.editTransactionUI = (id) => {
    import('./components/transaction-sheet.js').then(module => {
        const txs = getTransactions();
        const tx = txs.find(t => t.id === id);
        if (tx) {
            module.openTransactionSheet(tx);
        }
    });
};


// Global dispatcher to refresh UI
function renderSettingsView(container) {
    container.innerHTML = `
        <div class="filled-card" style="padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem;">
            <h2 class="headline-sm">Preferenze App</h2>
            
            <div class="input-group">
                <label class="label-large">Tema Dark Mode</label>
                <select id="theme-select" class="input-field">
                    <option value="system">Sistema</option>
                    <option value="light">Chiaro</option>
                    <option value="dark">Scuro</option>
                </select>
            </div>
            
            <div class="input-group">
                <label class="label-large">Gemini API Key</label>
                <input type="password" id="api-key-input" class="input-field" placeholder="AIzaSy...">
                <p class="body-md" style="color:var(--md-sys-color-on-surface-variant); font-size:12px;">Necessaria per usare l'Assistente IA. Salvata localmente.</p>
            </div>
            
            <div class="input-group">
                <label class="label-large">Automazioni</label>
                <button id="btn-manage-recurring" class="input-field" style="cursor: pointer; text-align: center; color: var(--md-sys-color-primary); font-weight: 500;">
                    Gestisci Spese Ricorrenti & Risparmi
                </button>
            </div>

            <div class="input-group">
                <label class="label-large">Gestione Dati</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.5rem;">
                    <button id="btn-export-csv" class="input-field" style="cursor: pointer; text-align: center; color: var(--md-sys-color-primary); font-weight: 500;">
                        Esporta CSV
                    </button>
                    <button id="btn-import-csv" class="input-field" style="cursor: pointer; text-align: center; color: var(--md-sys-color-primary); font-weight: 500;">
                        Importa CSV
                    </button>
                </div>
                <button id="btn-sync-file" class="input-field" style="cursor: pointer; text-align: center; color: var(--md-sys-color-primary); font-weight: 500; margin-bottom: 0.5rem;">
                    Collega Database a File Locale (.sqlite)
                </button>
                <button id="btn-reset-db" class="input-field" style="cursor: pointer; text-align: center; color: var(--md-sys-color-error); font-weight: 500;">
                    Resetta Database (Pulisce tutto)
                </button>
                <input type="file" id="csv-upload" accept=".csv" style="display: none;">
                <p class="body-md" style="color:var(--md-sys-color-on-surface-variant); font-size:12px; margin-top: 4px;">
                    * Il collegamento locale salva automaticamente ogni modifica sul tuo PC.
                </p>
            </div>
            
            <button id="btn-save-settings" class="fab-extended primary" style="position:static; margin-top:1rem; width:100%; justify-content:center; box-shadow:none;">
                Salva Impostazioni
            </button>
        </div>
    `;

    document.getElementById('btn-manage-recurring').onclick = () => loadView('recurring');

    const select = document.getElementById('theme-select');
    const apiKeyIn = document.getElementById('api-key-input');

    select.value = localStorage.getItem('THEME') || 'system';
    apiKeyIn.value = localStorage.getItem('GEMINI_API_KEY') || '';

    document.getElementById('btn-save-settings').addEventListener('click', () => {
        localStorage.setItem('GEMINI_API_KEY', apiKeyIn.value.trim());
        localStorage.setItem('THEME', select.value);
        applyTheme(select.value);
        alert('Impostazioni salvate!');
    });

    document.getElementById('btn-export-csv').addEventListener('click', () => {
        const txs = getTransactions();
        let csv = 'Data,Descrizione,Tag,Conto,Importo,Tipo,Note\n';
        txs.forEach(t => {
            csv += `${t.date},"${t.description}",${t.tag},"${t.account_name}",${t.amount},${t.type},"${t.notes}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'SpeseSmart_Export.csv';
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('btn-import-csv').onclick = () => {
        document.getElementById('csv-upload').click();
    };

    document.getElementById('csv-upload').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            try {
                await importFromCSV(text);
                alert('Importazione completata!');
                location.reload(); // Hard refresh to update everything
            } catch (err) {
                alert('Errore durante l\'importazione: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    document.getElementById('btn-sync-file').onclick = async () => {
        if (!window.showSaveFilePicker) {
            alert("Il tuo browser non supporta il salvataggio diretto su file locale. Usa Chrome o Edge aggiornati.");
            return;
        }
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'SpeseSmart.sqlite',
                types: [{
                    description: 'SQLite Database',
                    accept: { 'application/x-sqlite3': ['.sqlite'] },
                }],
            });
            await setLocalFileHandle(handle);
            alert("Database collegato con successo! Le modifiche verranno salvate automaticamente sul file scelto.");
        } catch (err) {
            if (err.name !== 'AbortError') {
                alert("Errore nel collegamento: " + err.message);
            }
        }
    };

    document.getElementById('btn-reset-db').onclick = async () => {
        if (confirm("Sei sicuro di voler cancellare TUTTI i dati? L'operazione non è reversibile.")) {
            const { resetDatabase } = await import('./db.js');
            await resetDatabase();
            location.reload();
        }
    };
}

function applyTheme(themeVal) {
    if (themeVal === 'dark') {
        document.body.className = 'dark-theme';
    } else if (themeVal === 'light') {
        document.body.className = 'light-theme';
    } else {
        document.body.className = 'system-theme';
    }
}

// Initial theme setup
applyTheme(localStorage.getItem('THEME') || 'system');

async function renderRecurringView(container) {
    const rtxs = getRecurringTransactions();
    const accs = getAccounts();

    container.innerHTML = `
        <div class="section-header" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h2 class="headline-sm">Automazioni</h2>
                <p class="body-md" style="color: var(--md-sys-color-on-surface-variant)">Spese ed entrate che si ripetono nel tempo</p>
            </div>
            <button class="fab-extended primary" id="btn-new-recurring" style="position: static; border-radius: 12px;">
                <span class="material-symbols-outlined">add</span> Nuovo
            </button>
        </div>

        <div id="recurring-list" style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
            ${rtxs.length === 0 ? '<div class="filled-card"><p>Nessuna automazione attiva.</p></div>' : ''}
            ${rtxs.map(r => `
                <div class="filled-card" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem;">
                    <div>
                        <div class="title-md">${r.description}</div>
                        <div class="label-sm" style="color: var(--md-sys-color-on-surface-variant)">
                            Ogni ${r.frequency === 'monthly' ? 'Mese' : r.frequency === 'weekly' ? 'Settimana' : 'Giorno'} • Prossimo: ${r.next_date}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div class="title-lg" style="color: ${r.type === 'expense' ? 'var(--color-expense)' : 'var(--md-sys-color-primary)'}">
                            ${r.type === 'expense' ? '-' : '+'}${r.amount} €
                        </div>
                        <div class="label-sm">${accs.find(a => a.id === r.account_id)?.name || 'Conto'}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    container.querySelector('#btn-new-recurring').onclick = () => openRecurringModal(accs);
}

function openRecurringModal(accs) {
    const modal = document.createElement('div');
    modal.className = 'bottom-sheet-overlay';
    modal.innerHTML = `
        <div class="bottom-sheet" style="padding: 1.5rem; max-width: 450px; margin: auto; position: relative; top: 10%;">
            <h2 class="headline-sm" style="margin-bottom: 1rem;">Nuova Automazione</h2>
            <form id="recurring-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <input type="text" id="rtx-desc" class="input-field" placeholder="Descrizione (es. Affitto, Netflix)" required>
                <input type="number" id="rtx-amount" class="input-field" placeholder="Importo (€)" step="0.01" required>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <select id="rtx-frequency" class="input-field">
                        <option value="monthly">Mensile</option>
                        <option value="weekly">Settimanale</option>
                        <option value="daily">Giornaliera</option>
                    </select>
                    <select id="rtx-type" class="input-field">
                        <option value="expense">Spesa</option>
                        <option value="transfer">Risparmio (Trasferimento)</option>
                        <option value="income">Entrata</option>
                    </select>
                </div>

                <div class="input-group">
                    <label class="label-large">Dal conto:</label>
                    <select id="rtx-account" class="input-field">
                        ${accs.filter(a => a.type !== 'savings_fund').map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                    </select>
                </div>

                <div id="rtx-to-account-group" class="input-group" style="display: none;">
                    <label class="label-large">Al salvadanaio:</label>
                    <select id="rtx-to-account" class="input-field">
                        ${accs.filter(a => a.type === 'savings_fund').map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                    </select>
                </div>

                <div class="input-group">
                    <label class="label-large">Data del primo addebito:</label>
                    <input type="date" id="rtx-date" class="input-field" required value="${new Date().toISOString().split('T')[0]}">
                </div>

                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button type="button" class="text-button" id="btn-cancel-rtx" style="flex: 1;">Annulla</button>
                    <button type="submit" class="fab-extended primary" style="position: static; flex: 2; border-radius: 12px; height: 48px;">Attiva</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const typeSel = modal.querySelector('#rtx-type');
    const toAccGroup = modal.querySelector('#rtx-to-account-group');
    typeSel.addEventListener('change', () => {
        toAccGroup.style.display = typeSel.value === 'transfer' ? 'flex' : 'none';
    });

    modal.querySelector('#btn-cancel-rtx').onclick = () => modal.remove();
    modal.querySelector('#recurring-form').onsubmit = async (e) => {
        e.preventDefault();
        await addRecurringTransaction({
            description: document.getElementById('rtx-desc').value,
            amount: parseFloat(document.getElementById('rtx-amount').value),
            type: typeSel.value,
            frequency: document.getElementById('rtx-frequency').value,
            next_date: document.getElementById('rtx-date').value,
            account_id: parseInt(document.getElementById('rtx-account').value),
            to_account_id: typeSel.value === 'transfer' ? parseInt(document.getElementById('rtx-to-account').value) : null,
            tag: typeSel.value === 'transfer' ? 'Risparmio' : 'Ricorrente'
        });
        modal.remove();
        loadView('recurring');
    };
}

window.refreshApp = () => {
    const activeView = document.querySelector('.nav-item.active').dataset.view;
    loadView(activeView);
};


export async function init() {
    await initDatabase();
    setupNavigation();
    initTransactionSheet();
    loadView('dashboard');
}

function openAccountModal(targetAcc = null, initialType = 'account') {
    const isEdit = !!targetAcc;
    const defaultType = isEdit ? targetAcc.type : initialType;
    const modal = document.createElement('div');
    modal.className = 'bottom-sheet-overlay';
    modal.innerHTML = `
        <div class="bottom-sheet" style="padding: 1.5rem; max-width: 450px; margin: auto; position: relative; top: 15%;">
            <h2 class="headline-sm" style="margin-bottom: 1rem;">${isEdit ? 'Modifica Conto' : 'Aggiungi Conto'}</h2>
            <form id="account-form" style="display: flex; flex-direction: column; gap: 1rem;">
                <div class="input-group">
                    <label class="label-large">Nome Conto / Carta</label>
                    <input type="text" id="new-acc-name" class="input-field" placeholder="Es. Visa, Revolut, Risparmi..." required value="${isEdit ? targetAcc.name : ''}">
                </div>
                <div class="input-group">
                    <label class="label-large">Saldo ${isEdit ? 'Attuale' : 'Iniziale'}</label>
                    <input type="number" id="new-acc-balance" class="input-field" placeholder="0.00 €" step="0.01" value="${isEdit ? targetAcc.balance : '0'}" ${isEdit ? 'disabled' : ''}>
                    ${isEdit ? '<p class="label-sm" style="color:var(--md-sys-color-on-surface-variant)">Per cambiare il saldo, aggiungi una transazione di correzione.</p>' : ''}
                </div>
                <div class="input-group">
                    <label class="label-large">Tipo</label>
                    <select id="new-acc-type" class="input-field">
                        <option value="account" ${defaultType === 'account' ? 'selected' : ''}>Conto / Carta standard</option>
                        <option value="savings_fund" ${defaultType === 'savings_fund' ? 'selected' : ''}>Salvadanaio (Risparmi con obiettivo)</option>
                    </select>
                </div>
                <div id="goal-container" class="input-group" style="display: ${defaultType === 'savings_fund' ? 'flex' : 'none'};">
                    <label class="label-large">Obbiettivo Economico (€)</label>
                    <input type="number" id="new-acc-goal" class="input-field" placeholder="Quanto vuoi risparmiare?" value="${isEdit ? (targetAcc.goal_amount || '') : ''}">
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button type="button" class="text-button" id="btn-cancel-acc" style="flex: 1;">Annulla</button>
                    <button type="submit" class="fab-extended primary" style="position: static; flex: 2; border-radius: 12px; height: 48px;">Salva</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const typeSel = modal.querySelector('#new-acc-type');
    const goalCont = modal.querySelector('#goal-container');
    typeSel.addEventListener('change', () => {
        goalCont.style.display = typeSel.value === 'savings_fund' ? 'flex' : 'none';
    });

    modal.querySelector('#btn-cancel-acc').onclick = () => modal.remove();
    modal.querySelector('#account-form').onsubmit = async (e) => {
        e.preventDefault();
        const type = typeSel.value;
        const accData = {
            name: document.getElementById('new-acc-name').value,
            balance: parseFloat(document.getElementById('new-acc-balance').value),
            type: type,
            goal_amount: type === 'savings_fund' ? parseFloat(document.getElementById('new-acc-goal').value) : null,
            color: type === 'savings_fund' ? '#60622d' : '#1c6d25',
            icon: type === 'savings_fund' ? 'savings' : 'credit_card'
        };

        if (isEdit) {
            await updateAccount(targetAcc.id, accData);
        } else {
            await addAccount(accData);
        }
        
        modal.remove();
        loadView('dashboard');
    };
}

// Start app
window.addEventListener('DOMContentLoaded', init);
