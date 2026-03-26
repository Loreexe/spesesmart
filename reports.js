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
    // Default mock until settings page exists
    const budget = getBudget(now.getFullYear(), now.getMonth() + 1);
    const budgetTotal = budget ? (budget.budget_amount + budget.carried_over_from_previous) : 1500;
    
    // YYYY-MM-01
    let monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const txs = getTransactions().filter(t => t.date >= monthStart && t.type === 'expense');
    
    const spent = txs.reduce((sum, t) => sum + t.amount, 0);
    const available = budgetTotal - spent;
    
    el.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-end;">
            <div>
                <h3 class="title-md" style="color:var(--md-sys-color-on-primary-container);">Budget Disponibile</h3>
                <div class="display-lg">€${available.toFixed(2)}</div>
            </div>
            <div class="label-large">su €${budgetTotal.toFixed(2)}</div>
        </div>
        
        <div class="spending-pulse" style="margin-top: 1rem; background: rgba(255,255,255,0.2);">
            <div class="spending-pulse-fill" style="width: ${Math.min((spent / budgetTotal)*100, 100)}%; background: #fff;"></div>
        </div>
    `;
}
