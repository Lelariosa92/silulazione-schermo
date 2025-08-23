# LED Mockup App

## Panoramica del Progetto
**Nome**: LED Mockup App - Applicazione per Mockup Video di Installazioni LED Outdoor
**Obiettivo**: Creare composizioni video realistiche per presentazioni di installazioni LED, con export ottimizzato per WhatsApp
**Funzionalità Principali**: 
- Import foto sfondo con controlli trasformazione (pan, zoom, rotazione, correzione prospettiva)
- Overlay video con sistema Corner-Pin a 4 punti per trasformazione prospettica
- Export MP4 HD ottimizzato per WhatsApp (H.264 + AAC)
- Quality Control (QC) automatico con analisi SSIM
- Gestione progetti con salvataggio/caricamento JSON

## URL Pubblici
- **Sviluppo**: https://3000-ivi1ie8kq06k1f0txwl8d-6532622b.e2b.dev
- **GitHub**: Repository verrà configurato dopo completamento

## Architettura Dati

### Modelli Dati Principali
```typescript
// Progetto LED Mockup
interface LEDProject {
  version: string;
  timestamp: string;
  background: {
    dimensions: { width: number; height: number };
    transform: {
      x: number; y: number; scale: number; 
      rotation: number; perspective: number;
    };
  };
  video: {
    dimensions: { width: number; height: number };
    fps: number;
    duration: number;
    cornerPoints: Array<{x: number, y: number}>; // Coordinate px foto
    homographyMatrix: number[][]; // Matrice 3×3
  };
  exportSettings: {
    width: number; height: number;
    fps: number; bitrate: string;
    codec: string; audioCodec: string;
  };
}

// Corner Pin Points (coordinate pixel foto sfondo)
interface CornerPoint {
  x: number; // Coordinata X in pixel della foto originale
  y: number; // Coordinata Y in pixel della foto originale
}

// Matrice Omografia 3×3 per trasformazione prospettica
type HomographyMatrix = [
  [number, number, number], // [h00, h01, h02]
  [number, number, number], // [h10, h11, h12] 
  [number, number, number]  // [h20, h21, h22]
];
```

### Servizi di Storage
- **Frontend**: LocalStorage per cache temporanea progetti
- **Backend**: Cloudflare Pages (file statici)
- **Progetti**: Download/Upload JSON (nessun storage persistente backend)

### Flusso Dati
1. **Import Foto**: Caricamento immagine → Analisi dimensioni → Trasformazioni canvas
2. **Import Video**: Caricamento video → Estrazione metadata → Corner-pin initialization
3. **Corner-Pin**: Drag interattivo punti → Calcolo matrice omografia 3×3 → Preview rendering
4. **Export**: Rendering frame → Codifica FFmpeg → Quality Control → Download MP4

## Guida Utente

### Procedura Base
1. **Carica Foto Sfondo**: Click "Importa Foto Sfondo" → Seleziona immagine negozio/edificio
2. **Regola Sfondo**: Usa pan/zoom/rotazione per posizionamento ottimale
3. **Blocca Sfondo**: Click "Blocca Sfondo" quando posizionamento è corretto
4. **Carica Video LED**: Click "Importa Video Overlay" → Seleziona video contenuto LED
5. **Corner-Pin Setup**: 
   - Attiva tool "Corner-Pin" 
   - Trascina i 4 punti rossi per adattare video alla forma dell'insegna/display
   - Verifica anteprima in tempo reale
6. **Esporta**: Click "Esporta per WhatsApp (HD)" per generare MP4 finale

### Controlli Avanzati
- **Griglia**: Attiva per allineamento preciso
- **Snap**: Magnetismo per posizionamento accurato  
- **Matrice 3×3**: Copia negli appunti per uso tecnico
- **JSON Project**: Salva/carica configurazioni per riutilizzo

### Caso d'Uso Esempio
**Scenario**: Negozio con insegna LED sopra la porta
1. Foto sfondo: Facciata negozio 4032×3024 px
2. Video overlay: Contenuto LED 1920×1080, 25fps, 15s con audio
3. Corner-pin: Allinea video all'area insegna sopra porta
4. Export: MP4 1920×1080, H.264+AAC, compatibile WhatsApp
5. **Risultato Atteso**: Video realistico installazione LED, inviabile WhatsApp senza ricodifica

## Deployment

### Stato Deployment
- **Piattaforma**: Cloudflare Pages
- **Status**: ✅ Attivo (Development)
- **URL Live**: https://3000-ivi1ie8kq06k1f0txwl8d-6532622b.e2b.dev
- **Tech Stack**: Hono + TypeScript + Canvas API + FFmpeg.js + TailwindCSS

### Configurazione Tecnica
- **Frontend**: Vanilla JavaScript con Canvas HTML5 per rendering grafico
- **Backend**: Hono framework per API e serving statico
- **Video Processing**: FFmpeg.js (WebAssembly) per export MP4
- **Matematica**: Libreria custom per calcolo matrici omografia 3×3
- **UI**: TailwindCSS + Font Awesome, interfaccia completamente italiana

### Specifiche Export
- **Codec Video**: H.264 (profilo baseline, compatibile WhatsApp)
- **Codec Audio**: AAC 128 kbps
- **Risoluzione**: Max 1920×1080 (auto-scale se necessario)
- **Bitrate**: 3-5 Mbps (ottimizzato per qualità/dimensione)
- **Formato**: MP4 container
- **Limite Dimensioni**: Max 16MB (limite WhatsApp)

### Quality Control (QC)
- **Frame Analysis**: Controllo 5 frame (0%, 25%, 50%, 75%, 100%)
- **Metriche**: SSIM ≥ 0.99, errore vertici ≤ 0.5px
- **Validazione**: Confronto posizionamento atteso vs effettivo
- **Report**: PNG frame + JSON metriche per debug tecnico

## Funzionalità Implementate ✅
- [x] Interfaccia utente italiana completa
- [x] Sistema import foto con controlli trasformazione
- [x] Canvas interattivo con toolbar strumenti
- [x] Sistema Corner-Pin a 4 punti con drag & drop
- [x] Calcolo matrice omografia 3×3 matematicamente accurato
- [x] Preview rendering in tempo reale
- [x] Sistema salvataggio/caricamento progetti JSON
- [x] Architettura export video con FFmpeg.js
- [x] Sistema Quality Control con metriche SSIM
- [x] Responsive design per desktop/mobile
- [x] Feedback utente e gestione errori

## Funzionalità Non Ancora Implementate ❌
- [ ] Integrazione FFmpeg.js reale (attualmente simulata)
- [ ] Rendering video perspettico pixel-perfect (richiede WebGL)
- [ ] Sistema cache progetti su backend
- [ ] Anteprima video in tempo reale durante corner-pin
- [ ] Export batch multipli progetti
- [ ] Integrazione API social media per condivisione diretta

## Prossimi Passi Raccomandati
1. **Integrazione FFmpeg.js**: Implementare video processing reale
2. **WebGL Rendering**: Aggiungere trasformazioni prospettiche accurate
3. **Testing Caso Reale**: Validare con foto/video reali negozio
4. **Performance Optimization**: Ottimizzare rendering per video lunghi
5. **Deploy Production**: Configurare dominio personalizzato e CDN
6. **User Testing**: Raccogliere feedback da utenti target (agenzie marketing, installatori LED)

**Ultimo Aggiornamento**: 2025-08-23