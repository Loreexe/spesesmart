# SpeseSmart 💸

SpeseSmart è un'applicazione web moderna e intuitiva progettata per il monitoraggio e la gestione ottimale delle tue finanze personali, ispirata ai principi del Material Design. Con un'interfaccia pulita, l'aiuto dell'intelligenza artificiale e il pieno controllo sui tuoi dati, SpeseSmart rende il budgeting semplice e sicuro.

## ✨ Funzionalità Principali

### 📊 Dashboard Completa
- **Patrimonio Netto:** Monitora istantaneamente il saldo totale di liquidità e risparmi.
- **Gestione Multi-Conto:** Tieni traccia di più conti contemporaneamente (Contanti, Carte, Conto Corrente).
- **Salvadanai e Fondi:** Imposta obiettivi di risparmio e visualizza i tuoi progressi tramite barre di completamento.
- **Riepilogo Spese:** Visualizza rapidamente le ultime transazioni effettuate.

### 💳 Gestione Transazioni
- Registra facilmente **Entrate, Uscite e Trasferimenti** (es. dal conto corrente al salvadanaio).
- Classifica ogni movimento assegnando una categoria predefinita.
- Allega note personalizzate ad ogni transazione.

### 🤖 Assistente AI (Powered by Gemini)
- Chiedi all'Assistente IA integrata di analizzare le tue spese ("Quanto ho speso in Alimentari questo mese?").
- Fai aggiungere transazioni usando il linguaggio naturale (es. "Ho speso 20€ alla Conad per fare la spesa").
- *Nota: Richiede una chiave API di Google Gemini (ottenibile gratuitamente).*

### 🔄 Automazioni
- Crea transazioni ricorrenti (mensili, settimanali, giornaliere) in modo che l'app le registri automaticamente alla scadenza. Ottimo per abbonamenti, affitto o stipendio.

### 📈 Report e Grafici
- Analizza i tuoi flussi di cassa con grafici dettagliati per comprendere meglio le tue abitudini di spesa.

### 🔒 Persistenza Dati e Offline-First
SpeseSmart è pensata per essere sicura e mantenere i dati esclusivamente sul tuo dispositivo. Nessun server esterno, nessuna registrazione richiesta:
- **Database Locale SQL:** L'app utilizza SQLite (`sql.js`) lato client per eseguire le query localmente.
- **File System Sync:** Grazie alla File System Access API, puoi "collegare" un file `.sqlite` salvato sul desktop del tuo PC. L'applicazione lo aprirà in lettura/scrittura salvando automaticamente ogni modifica sul disco fisico oltre che nel browser (IndexedDB).
- **Import/Export CSV:** Esporta in ogni momento tutte le tue transazioni in formato CSV per consultarle su Excel. Puoi anche caricare un CSV esterno per migrare velocemente i tuoi vecchi dati sull'app.
- **Tasto Reset:** Consente un avvio pulito o l'eliminazione istantanea e definitiva dei dati dal database in uso al momento.

### 🌙 Interfaccia Personalizzabile
- Scegli tra **Tema Chiaro, Scuro, o Tema di Sistema**.
- Layout responsivo che scala in maniera confortevole se consulti l'app da schermi desktop larghi (formato con barra laterale) o da mobile. La messaggistica e le dashboard sfruttano box eleganti con effetto vetro (glassmorphism) ed estetica moderna.

## 🚀 Come avviare il progetto
Essendo l'applicazione puramente front-end (HTML/CSS/JS) e senza server backend, l'avvio è semplicissimo:
1. Clona la repository o scarica il codice sorgente: `git clone https://github.com/Loreexe/spesesmart.git`
2. Avvia un Live Server locale (es. tramite estensione VSCode "Live Server" o un server HTTP python) puntando alla cartella principale del progetto.
3. L'applicazione sarà visibile sul tuo `localhost`.
4. (Opzionale) Nelle `Impostazioni`, incolla la tua chiave API di Google Gemini per attivare il modulo Chatbot AI.

## 🛠 Tecnologie Utilizzate
- **Frontend Core:** HTML5, CSS3, Vanilla JavaScript (Moduli ES6).
- **Database:** `sql.js` (SQLite compilato in WebAssembly).
- **Charting:** `Chart.js` per i report visuali.
- **Markdown:** `marked.js` per una gradevole formattazione del testo del bot AI.
- **UI/UX Design:** Font "Google Sans" & "Roboto Flex", "Material Symbols", palette colori Material You, layout Flexbox e Grid CSS3.

---
*Progetto sviluppato per una gestione finanziaria locale, rapida, sicura e intelligente.*
