/**
 * Helper per demo e testing dell'applicazione LED Mockup
 */

class DemoHelper {
    constructor(app) {
        this.app = app;
    }

    /**
     * Crea immagine di test per demo
     */
    createTestBackground() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');

        // Sfondo gradiente che simula una facciata di negozio
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB'); // Cielo azzurro
        gradient.addColorStop(0.3, '#E0F6FF');
        gradient.addColorStop(0.7, '#F5F5DC'); // Beige edificio
        gradient.addColorStop(1, '#D2B48C');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Disegna edificio semplificato
        ctx.fillStyle = '#8B4513'; // Marrone
        ctx.fillRect(0, canvas.height * 0.3, canvas.width, canvas.height * 0.7);

        // Porta del negozio
        ctx.fillStyle = '#654321';
        ctx.fillRect(canvas.width * 0.4, canvas.height * 0.5, canvas.width * 0.2, canvas.height * 0.5);

        // Finestre
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(canvas.width * 0.1, canvas.height * 0.35, canvas.width * 0.15, canvas.width * 0.1);
        ctx.fillRect(canvas.width * 0.75, canvas.height * 0.35, canvas.width * 0.15, canvas.width * 0.1);

        // Area per insegna LED (sopra la porta)
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(canvas.width * 0.25, canvas.height * 0.2, canvas.width * 0.5, canvas.height * 0.12);

        // Testo indicativo
        ctx.fillStyle = '#FF0000';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('← POSIZIONA INSEGNA LED QUI', canvas.width * 0.5, canvas.height * 0.15);

        ctx.fillStyle = '#333';
        ctx.font = '16px Arial';
        ctx.fillText('DEMO: Facciata Negozio per Test LED Mockup', canvas.width * 0.5, canvas.height * 0.95);

        return canvas;
    }

    /**
     * Carica immagine di test nell'app
     */
    async loadTestBackground() {
        const testCanvas = this.createTestBackground();
        
        // Converti canvas in blob e poi in File
        const blob = await new Promise(resolve => testCanvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], 'test-background.png', { type: 'image/png' });
        
        // Simula selezione file
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        const fileInput = document.getElementById('backgroundFile');
        fileInput.files = dataTransfer.files;
        
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);
        
        console.log('✅ Immagine di test caricata!');
    }

    /**
     * Crea video di test (simulato con canvas animato)
     */
    createTestVideo() {
        // Crea elemento video simulato
        const video = document.createElement('video');
        video.width = 400;
        video.height = 200;
        video.videoWidth = 400;
        video.videoHeight = 200;
        video.duration = 5; // 5 secondi
        video.currentTime = 0;
        
        // Simula metadata video
        Object.defineProperty(video, 'videoWidth', { value: 400, writable: false });
        Object.defineProperty(video, 'videoHeight', { value: 200, writable: false });
        
        return video;
    }

    /**
     * Setup demo completo
     */
    async setupDemo() {
        console.log('🎬 Configurazione demo LED Mockup...');
        
        // 1. Carica sfondo di test
        await this.loadTestBackground();
        
        // 2. Aspetta un po' per il caricamento
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 3. Simula caricamento video
        const testVideo = this.createTestVideo();
        this.app.videoElement = testVideo;
        
        // 4. Imposta corner points in area insegna
        const canvasWidth = this.app.canvas.width;
        const canvasHeight = this.app.canvas.height;
        
        // Coordinate proporzionali per area insegna
        this.app.cornerPinPoints = [
            { x: canvasWidth * 0.25, y: canvasHeight * 0.3 }, // TL
            { x: canvasWidth * 0.75, y: canvasHeight * 0.3 }, // TR  
            { x: canvasWidth * 0.75, y: canvasHeight * 0.45 }, // BR
            { x: canvasWidth * 0.25, y: canvasHeight * 0.45 }  // BL
        ];
        
        // 5. Aggiorna UI
        this.app.updateVertexInputs();
        this.app.calculateHomography();
        
        // 6. Attiva corner-pin tool
        this.app.setActiveTool('corner-pin');
        
        // 7. Render finale
        this.app.render();
        
        console.log('✅ Demo configurata! Corner points posizionati nell\'area insegna.');
        
        // 8. Mostra istruzioni
        this.showDemoInstructions();
    }

    /**
     * Mostra istruzioni demo
     */
    showDemoInstructions() {
        const instructions = `
🎯 DEMO LED MOCKUP APP

✅ Setup completato:
• Immagine sfondo: Facciata negozio test
• Corner points: Posizionati nell'area insegna (rettangolo rosso)
• Tool attivo: Corner-Pin

📋 Prossimi passi:
1. Trascina i punti rossi per adattare alla forma desiderata
2. Carica un video LED reale (o usa la simulazione)
3. Click "Esporta per WhatsApp" per generare MP4

🔧 Controlli:
• Toolbar: Cambia strumento attivo
• Pannello destro: Regola parametri
• Griglia: Attiva per allineamento preciso

📱 Output finale: MP4 HD compatibile WhatsApp
        `;
        
        console.log(instructions);
        
        // Mostra anche toast informativo
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 left-4 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-sm';
        toast.innerHTML = `
            <div class="flex items-start">
                <i class="fas fa-info-circle mr-3 mt-1"></i>
                <div class="flex-1">
                    <div class="font-semibold mb-1">Demo Configurata!</div>
                    <div class="text-sm opacity-90">Corner points posizionati. Trascina i punti rossi per adattare l'overlay video.</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-blue-200 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto-rimuovi dopo 8 secondi
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 8000);
    }

    /**
     * Reset dell'applicazione
     */
    resetApp() {
        this.app.backgroundImage = null;
        this.app.videoElement = null;
        this.app.videoFile = null;
        this.app.backgroundLocked = false;
        
        // Reset trasformazioni
        this.app.backgroundTransform = {
            x: 0, y: 0, scale: 1, rotation: 0, perspective: 0
        };
        
        // Reset corner points
        this.app.cornerPinPoints = [
            { x: 100, y: 100 }, { x: 300, y: 100 },
            { x: 300, y: 200 }, { x: 100, y: 200 }
        ];
        
        // Reset UI
        document.getElementById('backgroundDimensions').textContent = '-';
        document.getElementById('zoomLevel').textContent = '100%';
        document.getElementById('videoFPS').textContent = '-';
        document.getElementById('videoDuration').textContent = '-';
        
        this.app.updateVertexInputs();
        this.app.render();
        
        console.log('🔄 App resetata');
    }
}

// Aggiunge pulsante demo alla UI quando caricata
document.addEventListener('DOMContentLoaded', () => {
    // Aspetta che l'app sia inizializzata
    setTimeout(() => {
        if (window.ledMockupApp) {
            const demoHelper = new DemoHelper(window.ledMockupApp);
            
            // Aggiunge pulsante demo al header
            const headerButtons = document.querySelector('header .flex.gap-2');
            if (headerButtons) {
                const demoBtn = document.createElement('button');
                demoBtn.className = 'bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors text-sm';
                demoBtn.innerHTML = '<i class="fas fa-play mr-2"></i>Demo';
                demoBtn.onclick = () => demoHelper.setupDemo();
                
                const resetBtn = document.createElement('button');
                resetBtn.className = 'bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm';
                resetBtn.innerHTML = '<i class="fas fa-undo mr-2"></i>Reset';
                resetBtn.onclick = () => demoHelper.resetApp();
                
                headerButtons.insertBefore(demoBtn, headerButtons.firstChild);
                headerButtons.insertBefore(resetBtn, headerButtons.firstChild);
            }
            
            window.demoHelper = demoHelper;
        }
    }, 1000);
});

if (typeof window !== 'undefined') {
    window.DemoHelper = DemoHelper;
}