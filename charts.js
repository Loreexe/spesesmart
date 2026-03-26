import { getTransactions } from './db.js';

let instances = [];

export function initCharts() {
    // Clear old instances
    instances.forEach(i => i.destroy());
    instances = [];

    const now = new Date();
    // YYYY-MM-01
    let monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const txs = getTransactions().filter(t => t.date >= monthStart);
    
    // Group by tags for expenses
    const expTxs = txs.filter(t => t.type === 'expense');
    const tagsMap = {};
    expTxs.forEach(t => {
        tagsMap[t.tag] = (tagsMap[t.tag] || 0) + t.amount;
    });

    const ctxTags = document.getElementById('chart-tags');
    if (ctxTags && Object.keys(tagsMap).length > 0) {
        const chart = new Chart(ctxTags.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(tagsMap),
                datasets: [{
                    data: Object.values(tagsMap),
                    backgroundColor: ['#1c6d25', '#9df197', '#d5e8cf', '#f9fbb7', '#a73b21', '#fd795a'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: getComputedStyle(document.body).getPropertyValue('--md-sys-color-on-surface') } }
                }
            }
        });
        instances.push(chart);
    }
    
    // Timeline Bar Chart (Daily Expenses)
    const timeMap = {};
    expTxs.forEach(t => {
        const d = t.date.split('T')[0];
        timeMap[d] = (timeMap[d] || 0) + t.amount;
    });
    const sortedDates = Object.keys(timeMap).sort();

    const ctxTime = document.getElementById('chart-timeline');
    if (ctxTime && sortedDates.length > 0) {
        const chart2 = new Chart(ctxTime.getContext('2d'), {
            type: 'bar',
            data: {
                labels: sortedDates,
                datasets: [{
                    label: 'Spese (€)',
                    data: sortedDates.map(d => timeMap[d]),
                    backgroundColor: '#1c6d25',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        grid: { color: 'rgba(173, 180, 168, 0.15)' },
                        ticks: { color: getComputedStyle(document.body).getPropertyValue('--md-sys-color-on-surface-variant') } 
                    },
                    x: { 
                        grid: { display: false },
                        ticks: { color: getComputedStyle(document.body).getPropertyValue('--md-sys-color-on-surface-variant') } 
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
        instances.push(chart2);
    }
}

window.initCharts = initCharts;
