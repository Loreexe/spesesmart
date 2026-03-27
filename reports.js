import { getTransactions, getBudget } from './db.js';

export async function renderReportsView(container) {
    container.innerHTML = `
        <div class="section-header" style="margin-bottom: 2rem;">
            <div>
                <h2 class="headline-sm">Analisi Finanziaria</h2>
                <p class="body-md" style="color: var(--md-sys-color-on-surface-variant)">Monitora l'andamento del tuo budget e delle tue abitudini</p>
            </div>
        </div>
        <div class="reports-grid" style="display: flex; flex-direction: column; gap: 2rem;">
            <div class="focus-card hero-card" id="budget-summary">
                <!-- Injected via updateBudgetSummary -->
            </div>
            
            <section>
                <div class="section-header">
                    <h2 class="title-lg">Andamento Mensile</h2>
                    <p class="body-md" style="color: var(--md-sys-color-on-surface-variant)">Confronto tra entrate e uscite nel tempo</p>
                </div>
                <div class="filled-card" style="position: relative; height: 300px; padding: 1rem;">
                    <canvas id="chart-timeline"></canvas>
                </div>
            </section>
            
            <section>
                <div class="section-header">
                    <h2 class="title-lg">Spese per Categoria</h2>
                    <p class="body-md" style="color: var(--md-sys-color-on-surface-variant)">Distribuzione dei costi per tipologia</p>
                </div>
                <div class="filled-card" style="position: relative; height: 300px; padding: 1rem;">
                    <canvas id="chart-tags"></canvas>
                </div>
            </section>
        </div>
    `;

    setTimeout(() => {
        updateBudgetSummary();
        if(window.initCharts) window.initCharts();
    }, 100);
}

function updateBudgetSummary() {
    const el = document.getElementById('budget-summary');
    if(!el) return;
    
    const now = new Date();
    
    // YYYY-MM-01
    const today = new Date().toISOString().split('T')[0];
    let monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    // Only count processed transactions for current budget stats
    const txs = getTransactions().filter(t => t.date >= monthStart && t.date <= today && t.type !== 'transfer' && t.is_imported !== 1);
    
    const spent = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const incomeThisMonth = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);

    const manualSalary = localStorage.getItem('SPESE_SMART_MANUAL_SALARY');
    const budgetTotal = manualSalary ? parseFloat(manualSalary) : incomeThisMonth;

    const available = budgetTotal - spent;
    
    el.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-end;">
            <div>
                <h3 class="title-md" style="color:var(--md-sys-color-on-primary-container);">Budget Disponibile</h3>
                <div class="display-lg">€${available.toFixed(2)}</div>
                <div class="label-medium" style="color:var(--md-sys-color-on-surface-variant); margin-top:4px;">
                    Basato su: ${manualSalary ? 'Stipendio Fisso' : 'Entrate Mese Corente'}
                </div>
            </div>
            <div style="text-align: right;">
                <div class="label-large">su €${budgetTotal.toFixed(2)}</div>
                <button id="btn-set-salary" class="btn-text" style="padding: 4px 8px; font-size: 11px; margin-top: 8px; border: 1px solid currentColor; border-radius: 8px;">Imposta Stipendio</button>
            </div>
        </div>
        
        <div class="spending-pulse" style="margin-top: 1rem; background: rgba(255,255,255,0.2);">
            <div class="spending-pulse-fill" style="width: ${budgetTotal > 0 ? Math.min((spent / budgetTotal)*100, 100) : 0}%; background: #fff;"></div>
        </div>
    `;

    document.getElementById('btn-set-salary').addEventListener('click', () => {
        const val = prompt("Inserisci il tuo stipendio base (lascia vuoto per il calcolo automatico tramite entrate mensili):", manualSalary || "");
        if (val === null) return;
        if (val.trim() === "") {
            localStorage.removeItem('SPESE_SMART_MANUAL_SALARY');
        } else {
            const num = parseFloat(val);
            if (!isNaN(num) && num > 0) {
                localStorage.setItem('SPESE_SMART_MANUAL_SALARY', num);
            } else {
                alert("Importo non valido.");
            }
        }
        updateBudgetSummary();
    });
}
