export function renderAccountCard(acc) {
    const isFund = acc.type === 'savings_fund';
    const amountStr = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(acc.balance);
    const bgClass = isFund ? 'savings-card' : 'filled-card';
    
    let goalHtml = '';
    if (isFund && acc.goal_amount) {
        const progress = Math.min((acc.balance / acc.goal_amount) * 100, 100);
        goalHtml = `
            <div class="progress-container">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="label-sm" style="margin-top: 6px; color: var(--md-sys-color-on-surface-variant); display: flex; justify-content: space-between;">
                <span>Progress: ${Math.round(progress)}%</span>
                <span>Obiettivo: €${acc.goal_amount}</span>
            </div>
        `;
    }

    return `
        <div class="${bgClass}" style="display: flex; flex-direction: column; justify-content: space-between; min-height: 140px; border-left: 4px solid ${acc.color}; position: relative;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="material-symbols-outlined" style="color: ${acc.color}">${acc.icon}</span>
                <span class="title-md">${acc.name}</span>
            </div>
            
            <div style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px;">
                <button class="icon-button" onclick="event.stopPropagation(); editAccountUI(${acc.id})" style="color: var(--md-sys-color-primary);">
                    <span class="material-symbols-outlined" style="font-size: 20px;">edit</span>
                </button>
                <button class="icon-button" onclick="event.stopPropagation(); deleteAccountUI(${acc.id})" style="color: var(--md-sys-color-error);">
                    <span class="material-symbols-outlined" style="font-size: 20px;">delete</span>
                </button>
            </div>
            
            <div style="text-align: right; margin-top: 1rem;">
                <div class="display-lg" style="letter-spacing: -1px;">${amountStr}</div>
                ${goalHtml}
            </div>
        </div>
    `;
}
