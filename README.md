# LED Mockup Pro

## 🎬 Simulazione Professionale Video LED Outdoor

**LED Mockup Pro** è un'applicazione web avanzata per la simulazione di contenuti video su installazioni LED outdoor. Permette di creare mockup realistici sovrapponendo video su foto di ambienti esterni, con controlli precisi di trasformazione e export ottimizzato per WhatsApp.

## ✨ Funzionalità Principali

### 📸 Gestione Immagini di Sfondo
- **Importazione foto**: Carica immagini dell'ambiente di installazione
- **Controlli trasformazione**: Pan, zoom, rotazione dell'immagine di sfondo
- **Correzione prospettiva**: Adatta l'immagine all'angolazione desiderata
- **Lock background**: Blocca lo sfondo per evitare modifiche accidentali

### 🎥 Overlay Video Avanzato
- **Import video**: Supporto per tutti i formati video comuni
- **Trasformazioni complete**:
  - **Posizione**: Controlli precisi X/Y in pixel
  - **Scala**: Ridimensionamento indipendente larghezza/altezza
  - **Rotazione**: Da 0° a 360°
  - **Inclinazione**: Skew X/Y per effetti prospettici
  - **Prospettiva**: Correzione prospettica avanzata
  - **Flip**: Specchiamento orizzontale e verticale

### 🛠️ Strumenti Interattivi
- **Move Tool**: Trascinamento libero del video
- **Scale Tool**: Ridimensionamento con mouse
- **Rotate Tool**: Rotazione interattiva
- **Corner Pin**: Mapping a 4 punti con matrici omografiche 3×3

### 📱 Export Ottimizzato WhatsApp
- **Formato H.264 + AAC**: Compatibilità universale
- **Risoluzione HD**: 1920×1080 per qualità ottimale
- **Bitrate 3-5 Mbps**: Bilanciamento qualità/dimensione file
- **Controllo qualità**: SSIM ≥0.99 per fedeltà immagine
- **Durata ottimizzata**: Limiti WhatsApp rispettati

### 💾 Gestione Progetti
- **Salvataggio JSON**: Esporta configurazione completa
- **Import progetti**: Ricarica sessioni precedenti
- **Coordinate sistema foto**: Sistema di coordinate in pixel immagine
- **Matrice omografica**: Calcolo automatico trasformazioni prospettiche

## 🚀 URLs Applicazione

### Produzione
- **App Principale**: https://3000-ivi1ie8kq06k1f0txwl8d-6532622b.e2b.dev
- **Piattaforma**: Cloudflare Pages
- **Stack Tecnologico**: Hono + TypeScript + Canvas HTML5

### Sviluppo
- **Repository**: Configurato per GitHub integration
- **Build System**: Vite + Wrangler
- **Development**: PM2 per gestione processi

## 🏗️ Architettura Tecnica

### Frontend
- **Framework**: Vanilla JavaScript + Canvas HTML5
- **UI**: TailwindCSS + FontAwesome icons
- **Interazioni**: Event-driven mouse/touch handlers
- **Rendering**: Canvas 2D con trasformazioni matriciali

### Backend
- **Runtime**: Hono su Cloudflare Workers
- **API**: RESTful endpoints per gestione progetti
- **Static Files**: Serving ottimizzato per assets
- **CORS**: Configurazione per cross-origin requests

### Export Engine
- **Video Processing**: MediaRecorder API
- **Frame Rendering**: Canvas-to-video pipeline
- **Sync Management**: Precisione temporale con eventi 'seeked'
- **Quality Control**: Validazione SSIM e parametri WhatsApp

## 📊 Caratteristiche Tecniche

### Prestazioni
- **Rendering Real-time**: 60fps smooth transformations
- **Memory Management**: Gestione ottimizzata risorse video
- **Loading Strategy**: Progressive video loading (preload='auto')
- **Error Handling**: Fallback graceful per errori video

### Compatibilità
- **Browser**: Chrome, Firefox, Safari, Edge (moderni)
- **Video Formats**: MP4, WebM, MOV, AVI
- **Image Formats**: JPEG, PNG, WebP, GIF
- **Mobile**: Responsive design per tablet/smartphone

### Sicurezza
- **CORS Policy**: Configurazione sicura cross-origin
- **File Validation**: Controlli tipo e dimensione file
- **Memory Limits**: Gestione memoria per file grandi
- **Error Boundaries**: Isolamento errori per stabilità

## 🎯 Casi d'Uso

### Marketing e Vendite
- **Presentazioni clienti**: Mockup realistici per proposte commerciali
- **Campagne social**: Content per Instagram, LinkedIn, Facebook
- **Portfolio**: Showcase progetti e competenze tecniche

### Progettazione
- **Concept validation**: Test visivo prima dell'installazione fisica
- **Client approval**: Approvazione progetti con preview realistici
- **Planning installazione**: Visualizzazione posizionamento ottimale

### Training e Formazione
- **Demo interattive**: Formazione team tecnico
- **Simulazioni**: Training su diverse configurazioni LED
- **Best practices**: Esempi di installazioni ottimali

## 🔧 Utilizzo Base

### 1. Setup Progetto
```bash
# Carica immagine di sfondo
Click "Importa Foto Sfondo" → Seleziona JPG/PNG dell'ambiente

# Carica video overlay  
Click "Importa Video Overlay" → Seleziona video content
```

### 2. Posizionamento Video
```javascript
// Controlli numerici precisi
Pos X: 150px    // Posizione orizzontale
Pos Y: 200px    // Posizione verticale

// Drag & Drop interattivo
Tool: Move → Trascina video sul canvas
```

### 3. Trasformazioni
```javascript
// Ridimensionamento
Scale X: 1.2    // Larghezza 120%
Scale Y: 0.8    // Altezza 80%

// Rotazione e prospettiva
Rotation: 45°   // Rotazione oraria
Skew X: 15°     // Inclinazione orizzontale
Perspective: 20 // Effetto prospettiva
```

### 4. Export Finale
```bash
# Configurazione ottimale WhatsApp
Resolution: HD (1920×1080)
Bitrate: 4 Mbps
Format: MP4 (H.264+AAC)
Duration: < 30s per WhatsApp Status
```

## 📈 Roadmap Sviluppo

### Features Implementate ✅
- [x] Import/Export immagini e video
- [x] Trasformazioni complete 2D/3D
- [x] Tools interattivi (Move, Scale, Rotate, Corner Pin)
- [x] Export MP4 ottimizzato WhatsApp
- [x] Sistema progetti JSON
- [x] UI responsive e intuitiva
- [x] Error handling e validazione
- [x] Performance optimization

### Prossimi Sviluppi 🚧
- [ ] Batch processing per multiple configurazioni
- [ ] Template library con preset comuni
- [ ] Integration API social media
- [ ] Advanced color correction tools
- [ ] Real-time collaboration features
- [ ] Cloud storage per progetti
- [ ] Analytics e reporting usage

## 🤝 Supporto

### Documentazione
- **Guide utente**: Tutorial step-by-step integrati
- **API Reference**: Documentazione endpoint disponibili
- **Video tutorials**: Playlist YouTube con esempi pratici

### Community
- **Forum supporto**: Discussioni e Q&A utenti
- **Feature requests**: Votazione nuove funzionalità
- **Bug reports**: Sistema ticketing per segnalazioni

---

**LED Mockup Pro** - *Trasforma le tue idee LED in realtà visiva*

© 2024 - Ottimizzato per installazioni LED professionali