import { getAccounts, getTransactions, addTransaction, addRecurringTransaction } from './db.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

let conversationHistory = [
    { role: "assistant", text: "Ciao! Sono l'assistente IA di SpeseSmart. Configura la tua API Key in Impostazioni. Puoi chiedermi di aggiungere spese o darti consigli sul budget!" }
];

export async function renderAssistantView(container) {
    container.innerHTML = `
        <div class="chat-container" style="display: flex; flex-direction: column; height: calc(100vh - 200px);">
            <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem;"></div>
            
            <form id="chat-form" style="display: flex; gap: 0.5rem; padding: 1rem; background: var(--surface-glass); border-top: 1px solid var(--ghost-border-outline);">
                <input type="text" id="chat-input" class="input-field" style="flex: 1; margin: 0; background: var(--md-sys-color-surface);" placeholder="Scrivi un messaggio..." required autocomplete="off">
                <button type="submit" class="fab-extended primary" style="position: static; border-radius: var(--radius-lg); height: 48px; width: 48px; padding: 0; justify-content: center; box-shadow: none;">
                    <span class="material-symbols-outlined">send</span>
                </button>
            </form>
        </div>
    `;

    // Restore history
    const list = document.getElementById('chat-messages');
    conversationHistory.forEach(msg => {
        addMessageToUI(msg.role, msg.text);
    });

    document.getElementById('chat-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if(!text) return;
        
        input.value = '';
        conversationHistory.push({ role: 'user', text });
        addMessageToUI('user', text);
        
        const typingId = 'typing-' + Date.now();
        addMessageToUI('assistant', '...', typingId);
        
        const responseText = await callGeminiAPI(text);
        
        const typingEl = document.getElementById(typingId);
        if(typingEl) typingEl.remove();
        
        conversationHistory.push({ role: 'assistant', text: responseText });
        addMessageToUI('assistant', responseText);
    });
}

function addMessageToUI(role, text, id = null) {
    const list = document.getElementById('chat-messages');
    if(!list) return;

    const div = document.createElement('div');
    if (id) div.id = id;
    const isUser = role === 'user';
    
    div.style.display = 'flex';
    div.style.flexDirection = 'column';
    div.style.alignItems = isUser ? 'flex-end' : 'flex-start';
    
    const bg = isUser ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-high)';
    const color = isUser ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-on-surface)';
    const radii = isUser ? 'var(--radius-lg) 0 var(--radius-lg) var(--radius-lg)' : '0 var(--radius-lg) var(--radius-lg) var(--radius-lg)';
    
    const content = isUser ? `<span>${text}</span>` : `<div class="markdown-body">${marked.parse(text)}</div>`;
    
    div.innerHTML = `
        <div style="background: ${bg}; color: ${color}; padding: 0.8rem 1.2rem; border-radius: ${radii}; max-width: 85%;">
            <div class="body-md" style="${isUser ? 'white-space: pre-wrap;' : ''}">${content}</div>
        </div>
    `;
    list.appendChild(div);
    list.scrollTop = list.scrollHeight;
}

async function callGeminiAPI(userText) {
    const apiKey = localStorage.getItem('GEMINI_API_KEY');
    if(!apiKey) {
        return "⚠️ Configura la API Key di Gemini nella sezione Impostazioni per potermi utilizzare!";
    }

    const ctx = {
        accounts: getAccounts(),
        recent: getTransactions().slice(0, 5),
        today: new Date().toISOString().split('T')[0]
    };

    const sysPrompt = `Sei l'assistente finanziario di SpeseSmart.
Dati correnti: ${JSON.stringify(ctx)}.
Rispondi in italiano. Sii amichevole e MOLTO conciso.

REGOLE AGGIUNTA TRANSAZIONE:
1. Se l'utente chiede di registrare una spesa/entrata SINGOLA (anche nel futuro), usa ADD_TRANSACTION.
2. Se l'utente usa parole come "ogni mese", "tutti i lunedì", "mensilmente", "in automatico ogni...", usa ADD_RECURRING_TRANSACTION.
3. Se l'utente NON specifica il conto, chiedi: "Con quale conto vuoi registrare questa operazione?" elencando i conti: ${ctx.accounts.map(a => a.name).join(', ')}.
4. Includi il blocco JSON ESATTO:

Per transazioni singole:
\`\`\`json
{
  "action": "ADD_TRANSACTION",
  "data": { "date": "YYYY-MM-DD", "description": "...", "tag": "...", "account_id": 1, "amount": 0.00, "type": "expense" }
}
\`\`\`

Per automazioni ricorrenti:
\`\`\`json
{
  "action": "ADD_RECURRING_TRANSACTION",
  "data": { "description": "...", "amount": 0.00, "type": "expense|income|transfer", "frequency": "monthly|weekly|daily", "next_date": "YYYY-MM-DD", "account_id": 1, "to_account_id": null }
}
\`\`\`

NOTA: Per i trasferimenti verso fondi risparmio, usa type: "transfer" e specifica to_account_id.

`;

    const payload = {
        systemInstruction: { parts: [{ text: sysPrompt }] },
        contents: conversationHistory
            .filter(msg => !msg.text.includes("⚠️") && !msg.text.includes("*(Transazione")) // Skip errors/confirmations
            .map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            })),
        generationConfig: { temperature: 0.4 }
    };

    const models = ['gemini-flash-latest', 'gemini-1.5-flash-8b', 'gemini-2.0-flash'];
    let lastError = null;

    for (const model of models) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            
            if (res.status === 429 || res.status === 503 || res.status === 404 || (data.error && data.error.message.toLowerCase().includes('quota'))) {
                lastError = "Quota/Traffico/NonTrovato";
                continue; // Try next model
            }
            
            if(data.error) return "Errore API (" + model + "): " + data.error.message;

            const reply = data.candidates[0].content.parts[0].text;
            
            // History management
            if (conversationHistory.length > 12) {
                conversationHistory = [conversationHistory[0], ...conversationHistory.slice(-11)];
            }
            
            return parseActions(reply);

        } catch(e) {
            console.error(`Errore di connessione con il modello ${model}:`, e);
            lastError = "Network";
            continue;
        }
    }
    
    if (lastError === "Quota/Traffico/NonTrovato") {
        return "⚠️ **Traffico elevato**: I server gratuiti di Gemini sono saturi o i modelli di fallback non sono supportati. Attendi 60 secondi e riprova.";
    }
    
    return "Errore di connessione a Gemini dopo vari tentativi.";
}

function parseActions(text) {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if(jsonMatch) {
        try {
            const actionInfo = JSON.parse(jsonMatch[1]);
            if(actionInfo.action === 'ADD_TRANSACTION') {
                addTransaction(actionInfo.data);
                if(window.refreshApp) window.refreshApp();
                let friendlyText = text.replace(jsonMatch[0], '').trim();
                return friendlyText + "\n\n*(Transazione registrata con successo)* ✅";
            }
            if(actionInfo.action === 'ADD_RECURRING_TRANSACTION') {
                addRecurringTransaction(actionInfo.data);
                if(window.refreshApp) window.refreshApp();
                let friendlyText = text.replace(jsonMatch[0], '').trim();
                return friendlyText + "\n\n*(Automazione registrata con successo)* ⚙️";
            }
        } catch(e) {
            console.error("JSON parse error from Gemini", e);
        }
    }
    return text;
}
