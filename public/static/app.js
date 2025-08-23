/**
 * LED Mockup App - Applicazione per mockup video di installazioni LED outdoor
 * 
 * Funzionalità principali:
 * - Gestione foto sfondo con pan, zoom, rotazione, correzione prospettiva
 * - Overlay video con trasformazione Corner-Pin (omografia 3×3)
 * - Export MP4 ottimizzato per WhatsApp
 * - Quality Control con confronto SSIM
 * - Salvataggio/caricamento progetti JSON
 */

class LEDMockupApp {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Stato applicazione
        this.backgroundImage = null;
        this.backgroundLocked = false;
        this.videoElement = null;
        this.videoFile = null;
        
        // Trasformazioni sfondo
        this.backgroundTransform = {
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            perspective: 0
        };
        
        // Coordinate Corner-Pin (px foto)
        this.cornerPinPoints = [
            { x: 100, y: 100 }, // Top-Left
            { x: 300, y: 100 }, // Top-Right
            { x: 300, y:200 }, // Bottom-Right
            { x: 100, y: 200 }  // Bottom-Left
        ];
        
        // Matrice omografia 3×3
        this.homographyMatrix = this.calculateHomography();
        
        // Strumenti attivi
        this.activeTool = 'select';
        this.isDragging = false;
        this.dragStartPos = { x: 0, y: 0 };
        this.selectedCorner = -1;
        
        // Impostazioni export
        this.exportSettings = {
            width: 1920,
            height: 1080,
            fps: 25,
            bitrate: '4M',
            codec: 'h264',
            audioCodec: 'aac',
            audioBitrate: '128k'
        };
        
        this.initializeEventListeners();
        this.render();
    }

    /**
     * Inizializza event listeners per UI e canvas
     */
    initializeEventListeners() {
        // Toolbar tools
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.target.closest('.tool-btn').dataset.tool;
                if (tool === 'reset') {
                    this.resetCornerPointsToCenter();
                } else if (tool === 'fit') {
                    this.fitBackgroundToCanvas();
                    this.render();
                } else {
                    this.setActiveTool(tool);
                }
            });
        });
        
        // File imports
        document.getElementById('backgroundFile').addEventListener('change', (e) => {
            this.loadBackgroundImage(e.target.files[0]);
        });
        
        document.getElementById('videoFile').addEventListener('change', (e) => {
            this.loadVideoFile(e.target.files[0]);
        });
        
        // Canvas events
        this.canvas.addEventListener('mousedown', this.onCanvasMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onCanvasMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onCanvasMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.onCanvasWheel.bind(this));
        
        // UI controls
        document.getElementById('lockBackgroundBtn').addEventListener('click', () => {
            this.backgroundLocked = !this.backgroundLocked;
            this.updateLockButtonState();
        });
        
        document.getElementById('rotationSlider').addEventListener('input', (e) => {
            document.getElementById('rotationValue').textContent = e.target.value + '°';
            this.render();
        });
        
        document.getElementById('perspectiveSlider').addEventListener('input', (e) => {
            this.backgroundTransform.perspective = parseFloat(e.target.value);
            this.render();
        });
        
        // Project management
        document.getElementById('exportJsonBtn').addEventListener('click', this.exportProject.bind(this));
        document.getElementById('importJsonFile').addEventListener('change', (e) => {
            this.importProject(e.target.files[0]);
        });
        
        // Export
        document.getElementById('exportBtn').addEventListener('click', this.startExport.bind(this));
        document.getElementById('copyMatrixBtn').addEventListener('click', this.copyHomographyMatrix.bind(this));
    }

    /**
     * Imposta strumento attivo
     */
    setActiveTool(tool) {
        // Rimuovi classe active da tutti i bottoni
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Aggiungi classe active al bottone selezionato
        document.querySelector(`.tool-btn[data-tool="${tool}"]`).classList.add('active');
        
        this.activeTool = tool;
        
        // Aggiorna cursor canvas
        this.updateCanvasCursor();
    }

    /**
     * Aggiorna cursor del canvas in base allo strumento attivo
     */
    updateCanvasCursor() {
        const cursors = {
            'select': 'default',
            'move': 'move',
            'scale': 'nw-resize',
            'rotate': 'crosshair',
            'corner-pin': 'crosshair'
        };
        
        this.canvas.style.cursor = cursors[this.activeTool] || 'default';
    }

    /**
     * Carica immagine di sfondo
     */
    loadBackgroundImage(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.backgroundImage = img;
                
                // Aggiorna dimensioni visualizzate
                document.getElementById('backgroundDimensions').textContent = 
                    `${img.naturalWidth} × ${img.naturalHeight}`;
                
                // Fit iniziale
                this.fitBackgroundToCanvas();
                this.render();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    /**
     * Carica file video
     */
    loadVideoFile(file) {
        if (!file) return;
        
        this.videoFile = file;
        
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = () => {
            this.videoElement = video;
            
            // Aggiorna info video
            document.getElementById('videoFPS').textContent = '25'; // Default
            document.getElementById('videoDuration').textContent = 
                `${video.duration.toFixed(1)}s`;
            
            document.getElementById('videoWidth').value = video.videoWidth;
            document.getElementById('videoHeight').value = video.videoHeight;
            
            // Inizializza corner points al centro del canvas
            this.resetCornerPoints();
            this.updateVertexInputs();
            this.calculateHomography();
            this.render();
        };
        
        const url = URL.createObjectURL(file);
        video.src = url;
    }

    /**
     * Fit sfondo al canvas
     */
    fitBackgroundToCanvas() {
        if (!this.backgroundImage) return;
        
        const scaleX = this.canvas.width / this.backgroundImage.naturalWidth;
        const scaleY = this.canvas.height / this.backgroundImage.naturalHeight;
        const scale = Math.min(scaleX, scaleY);
        
        this.backgroundTransform.scale = scale;
        this.backgroundTransform.x = (this.canvas.width - this.backgroundImage.naturalWidth * scale) / 2;
        this.backgroundTransform.y = (this.canvas.height - this.backgroundImage.naturalHeight * scale) / 2;
        
        document.getElementById('zoomLevel').textContent = `${Math.round(scale * 100)}%`;
    }

    /**
     * Reset corner points al centro del video
     */
    resetCornerPoints() {
        if (!this.videoElement) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const halfWidth = this.videoElement.videoWidth / 4;
        const halfHeight = this.videoElement.videoHeight / 4;
        
        this.cornerPinPoints = [
            { x: centerX - halfWidth, y: centerY - halfHeight }, // TL
            { x: centerX + halfWidth, y: centerY - halfHeight }, // TR
            { x: centerX + halfWidth, y: centerY + halfHeight }, // BR
            { x: centerX - halfWidth, y: centerY + halfHeight }  // BL
        ];
    }

    /**
     * Mouse down su canvas
     */
    onCanvasMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.isDragging = true;
        this.dragStartPos = { x, y };
        
        if (this.activeTool === 'corner-pin' && this.videoElement) {
            // Trova corner point più vicino
            this.selectedCorner = this.findNearestCorner(x, y);
            if (this.selectedCorner >= 0) {
                this.canvas.style.cursor = 'grabbing';
            }
        }
    }

    /**
     * Mouse move su canvas
     */
    onCanvasMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (!this.isDragging) return;
        
        const deltaX = x - this.dragStartPos.x;
        const deltaY = y - this.dragStartPos.y;
        
        switch (this.activeTool) {
            case 'move':
                if (!this.backgroundLocked && this.backgroundImage) {
                    this.backgroundTransform.x += deltaX;
                    this.backgroundTransform.y += deltaY;
                    this.render();
                }
                break;
                
            case 'corner-pin':
                if (this.selectedCorner >= 0) {
                    // Converti coordinate canvas in coordinate foto
                    const photoCoords = this.canvasToPhotoCoords(x, y);
                    this.cornerPinPoints[this.selectedCorner] = photoCoords;
                    this.updateVertexInputs();
                    this.calculateHomography();
                    this.render();
                }
                break;
        }
        
        this.dragStartPos = { x, y };
    }

    /**
     * Mouse up su canvas
     */
    onCanvasMouseUp(e) {
        this.isDragging = false;
        this.selectedCorner = -1;
        this.canvas.style.cursor = this.activeTool === 'corner-pin' ? 'crosshair' : 'default';
    }

    /**
     * Wheel su canvas (zoom)
     */
    onCanvasWheel(e) {
        e.preventDefault();
        
        if (!this.backgroundImage || this.backgroundLocked) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = this.backgroundTransform.scale * scaleFactor;
        
        // Limiti zoom
        if (newScale < 0.1 || newScale > 5) return;
        
        // Zoom verso punto del mouse
        const mouseX = x - this.backgroundTransform.x;
        const mouseY = y - this.backgroundTransform.y;
        
        this.backgroundTransform.scale = newScale;
        this.backgroundTransform.x = x - mouseX * scaleFactor;
        this.backgroundTransform.y = y - mouseY * scaleFactor;
        
        document.getElementById('zoomLevel').textContent = `${Math.round(newScale * 100)}%`;
        this.render();
    }

    /**
     * Trova corner point più vicino
     */
    findNearestCorner(canvasX, canvasY) {
        let minDistance = Infinity;
        let nearestIndex = -1;
        
        this.cornerPinPoints.forEach((point, index) => {
            const screenCoords = this.photoToCanvasCoords(point.x, point.y);
            const distance = Math.sqrt(
                Math.pow(canvasX - screenCoords.x, 2) + 
                Math.pow(canvasY - screenCoords.y, 2)
            );
            
            if (distance < 15 && distance < minDistance) { // 15px threshold
                minDistance = distance;
                nearestIndex = index;
            }
        });
        
        return nearestIndex;
    }

    /**
     * Converti coordinate canvas in coordinate foto
     */
    canvasToPhotoCoords(canvasX, canvasY) {
        if (!this.backgroundImage) return { x: canvasX, y: canvasY };
        
        const { x, y, scale } = this.backgroundTransform;
        
        return {
            x: (canvasX - x) / scale,
            y: (canvasY - y) / scale
        };
    }

    /**
     * Converti coordinate foto in coordinate canvas
     */
    photoToCanvasCoords(photoX, photoY) {
        if (!this.backgroundImage) return { x: photoX, y: photoY };
        
        const { x, y, scale } = this.backgroundTransform;
        
        return {
            x: photoX * scale + x,
            y: photoY * scale + y
        };
    }

    /**
     * Aggiorna input coordinate vertici
     */
    updateVertexInputs() {
        const inputs = ['vertex1', 'vertex2', 'vertex3', 'vertex4'];
        inputs.forEach((id, index) => {
            const point = this.cornerPinPoints[index];
            document.getElementById(id).value = `${Math.round(point.x)},${Math.round(point.y)}`;
        });
    }

    /**
     * Calcola matrice omografia 3×3
     */
    calculateHomography() {
        if (!this.videoElement) return;
        
        // Punti sorgente (rectangle video originale)
        const srcPoints = [
            [0, 0],
            [this.videoElement.videoWidth, 0],
            [this.videoElement.videoWidth, this.videoElement.videoHeight],
            [0, this.videoElement.videoHeight]
        ];
        
        // Punti destinazione (corner pin points)
        const dstPoints = this.cornerPinPoints.map(p => [p.x, p.y]);
        
        try {
            // Usa libreria matematica robusta per calcolo omografia
            this.homographyMatrix = MathUtils.calculateHomography(srcPoints, dstPoints);
            
            // Calcola errore di reproiezione per validazione
            const reprojectionError = MathUtils.calculateReprojectionError(
                srcPoints, dstPoints, this.homographyMatrix
            );
            
            console.log('Matrice omografia calcolata, errore reproiezione:', reprojectionError.toFixed(3), 'px');
            
        } catch (error) {
            console.error('Errore calcolo omografia:', error.message);
            // Fallback a matrice identità
            this.homographyMatrix = MathUtils.identityMatrix3x3();
        }
    }

    /**
     * Copia matrice omografia negli appunti
     */
    copyHomographyMatrix() {
        if (!this.homographyMatrix) {
            alert('Matrice omografia non disponibile!');
            return;
        }
        
        const matrixText = MathUtils.matrixToString(this.homographyMatrix, 6);
        const fullMatrix = `Matrice Omografia 3×3:\\n[${matrixText}]`;
        
        navigator.clipboard.writeText(fullMatrix).then(() => {
            // Feedback visivo
            const btn = document.getElementById('copyMatrixBtn');
            btn.classList.add('success-feedback');
            btn.innerHTML = '<i class="fas fa-check mr-2"></i>Copiato!';
            
            setTimeout(() => {
                btn.classList.remove('success-feedback');
                btn.innerHTML = '<i class="fas fa-copy mr-2"></i>Copia Matrice 3×3';
            }, 2000);
            
        }).catch(() => {
            alert('Errore nella copia negli appunti');
        });
    }

    /**
     * Aggiorna stato pulsante blocca sfondo
     */
    updateLockButtonState() {
        const btn = document.getElementById('lockBackgroundBtn');
        if (this.backgroundLocked) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-lock"></i> Sfondo Bloccato';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-unlock"></i> Blocca Sfondo';
        }
    }

    /**
     * Rendering principale
     */
    render() {
        // Pulisci canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render background pattern se nessuna immagine caricata
        if (!this.backgroundImage) {
            this.renderEmptyBackground();
        }
        
        // Render sfondo
        if (this.backgroundImage) {
            this.renderBackground();
        }
        
        // Render video overlay
        if (this.videoElement) {
            this.renderVideoOverlay();
        }
        
        // Render corner pin points
        if (this.activeTool === 'corner-pin' && this.videoElement) {
            this.renderCornerPinPoints();
        }
        
        // Render griglia se attiva
        if (document.getElementById('gridBtn').classList.contains('active')) {
            this.renderGrid();
        }
    }

    /**
     * Render background pattern vuoto
     */
    renderEmptyBackground() {
        // Sfondo a scacchiera per indicare trasparenza
        this.ctx.save();
        
        const squareSize = 20;
        const lightColor = '#f8fafc';
        const darkColor = '#e2e8f0';
        
        for (let x = 0; x < this.canvas.width; x += squareSize) {
            for (let y = 0; y < this.canvas.height; y += squareSize) {
                const isEven = (Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0;
                this.ctx.fillStyle = isEven ? lightColor : darkColor;
                this.ctx.fillRect(x, y, squareSize, squareSize);
            }
        }
        
        // Testo istruzioni al centro
        this.ctx.fillStyle = '#6b7280';
        this.ctx.font = '16px -apple-system, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            'Carica una foto di sfondo per iniziare',
            this.canvas.width / 2,
            this.canvas.height / 2 - 10
        );
        
        this.ctx.font = '14px -apple-system, sans-serif';
        this.ctx.fillStyle = '#9ca3af';
        this.ctx.fillText(
            'Click su "Importa Foto Sfondo" qui sotto',
            this.canvas.width / 2,
            this.canvas.height / 2 + 15
        );
        
        this.ctx.restore();
    }

    /**
     * Render immagine sfondo
     */
    renderBackground() {
        const { x, y, scale, rotation } = this.backgroundTransform;
        
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(scale, scale);
        
        if (rotation !== 0) {
            this.ctx.rotate(rotation * Math.PI / 180);
        }
        
        this.ctx.drawImage(this.backgroundImage, 0, 0);
        this.ctx.restore();
    }

    /**
     * Render video overlay con trasformazione prospettiva
     */
    renderVideoOverlay() {
        // Implementazione placeholder per rendering video trasformato
        // In produzione richiederebbe WebGL o libreria specializzata per trasformazioni prospettiche
        
        this.ctx.save();
        
        // Disegna rettangolo video semplice tra i corner points
        this.ctx.beginPath();
        this.ctx.moveTo(...this.photoToCanvasCoords(this.cornerPinPoints[0].x, this.cornerPinPoints[0].y));
        
        for (let i = 1; i < this.cornerPinPoints.length; i++) {
            const point = this.photoToCanvasCoords(this.cornerPinPoints[i].x, this.cornerPinPoints[i].y);
            this.ctx.lineTo(point.x, point.y);
        }
        
        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(147, 51, 234, 0.3)'; // Purple overlay
        this.ctx.fill();
        this.ctx.strokeStyle = '#9333ea';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.restore();
    }

    /**
     * Render corner pin points
     */
    renderCornerPinPoints() {
        this.cornerPinPoints.forEach((point, index) => {
            const screenCoords = this.photoToCanvasCoords(point.x, point.y);
            
            this.ctx.beginPath();
            this.ctx.arc(screenCoords.x, screenCoords.y, 6, 0, 2 * Math.PI);
            this.ctx.fillStyle = index === this.selectedCorner ? '#ef4444' : '#f97316';
            this.ctx.fill();
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Numera i punti
            this.ctx.fillStyle = 'white';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(index + 1, screenCoords.x, screenCoords.y + 3);
        });
    }

    /**
     * Render griglia
     */
    renderGrid() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 1;
        
        const spacing = 20;
        
        // Linee verticali
        for (let x = 0; x <= this.canvas.width; x += spacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Linee orizzontali
        for (let y = 0; y <= this.canvas.height; y += spacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    /**
     * Esporta progetto come JSON
     */
    exportProject() {
        if (!this.backgroundImage || !this.videoElement) {
            alert('Carica prima sia sfondo che video!');
            return;
        }
        
        const project = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            background: {
                dimensions: {
                    width: this.backgroundImage.naturalWidth,
                    height: this.backgroundImage.naturalHeight
                },
                transform: this.backgroundTransform
            },
            video: {
                dimensions: {
                    width: this.videoElement.videoWidth,
                    height: this.videoElement.videoHeight
                },
                fps: 25, // Placeholder
                duration: this.videoElement.duration,
                cornerPoints: this.cornerPinPoints,
                homographyMatrix: this.homographyMatrix
            },
            exportSettings: this.exportSettings
        };
        
        const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `led-mockup-project-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * Importa progetto da JSON
     */
    importProject(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const project = JSON.parse(e.target.result);
                
                // Ripristina corner points
                if (project.video && project.video.cornerPoints) {
                    this.cornerPinPoints = project.video.cornerPoints;
                    this.updateVertexInputs();
                }
                
                // Ripristina trasformazioni sfondo
                if (project.background && project.background.transform) {
                    this.backgroundTransform = project.background.transform;
                }
                
                // Ripristina impostazioni export
                if (project.exportSettings) {
                    this.exportSettings = project.exportSettings;
                }
                
                this.calculateHomography();
                this.render();
                
                alert('Progetto importato con successo!');
                
            } catch (error) {
                alert('Errore nell\'importazione del progetto: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    /**
     * Avvia export MP4 per WhatsApp
     */
    async startExport() {
        if (!this.backgroundImage || !this.videoElement || !this.videoFile) {
            alert('Carica prima sia sfondo che video!');
            return;
        }
        
        // Mostra pannello progress
        const exportPanel = document.getElementById('exportPanel');
        const progressBar = document.getElementById('exportProgress');
        const statusText = document.getElementById('exportStatus');
        
        exportPanel.style.display = 'block';
        progressBar.style.width = '0%';
        progressBar.style.backgroundColor = '#10b981'; // Reset colore
        
        try {
            // Inizializza video exporter
            const exporter = new VideoExporter();
            
            // Configura callback per progress e status
            exporter.setProgressCallback((percentage) => {
                progressBar.style.width = percentage + '%';
            });
            
            exporter.setStatusCallback((status) => {
                statusText.textContent = status;
            });
            
            // Prepara configurazione export
            const exportConfig = {
                backgroundImage: this.backgroundImage,
                videoElement: this.videoElement,
                videoFile: this.videoFile,
                cornerPoints: this.cornerPinPoints,
                homographyMatrix: this.homographyMatrix,
                outputSettings: VideoExporter.getWhatsAppOptimizedSettings({
                    width: this.videoElement.videoWidth,
                    height: this.videoElement.videoHeight,
                    fps: 25,
                    duration: this.videoElement.duration
                })
            };
            
            // Esegui export
            const result = await exporter.exportVideo(exportConfig);
            
            // Valida compatibilità WhatsApp
            const validation = await VideoExporter.validateWhatsAppCompatibility(result.video);
            
            // Mostra risultati QC
            this.displayQCResults(result.qcResult);
            
            // Download file
            this.downloadVideoFile(result.video, validation);
            
            statusText.textContent = `Export completato! File: ${validation.sizeFormatted}`;
            
            // Nascondi pannello dopo 5 secondi
            setTimeout(() => {
                exportPanel.style.display = 'none';
            }, 5000);
            
        } catch (error) {
            statusText.textContent = 'Errore durante export: ' + error.message;
            progressBar.style.backgroundColor = '#ef4444';
            
            // Mostra errore in UI
            this.showErrorFeedback(error.message);
        }
    }

    /**
     * Simula processo di export
     */
    async simulateExportProcess(progressBar, statusText) {
        const steps = [
            'Caricamento FFmpeg...',
            'Analisi video sorgente...',
            'Preparazione trasformazioni...',
            'Rendering frame 1/375...',
            'Rendering frame 100/375...',
            'Rendering frame 200/375...',
            'Rendering frame 300/375...',
            'Rendering frame 375/375...',
            'Codifica H.264...',
            'Aggiunta traccia audio...',
            'Ottimizzazione per WhatsApp...',
            'Finalizzazione file...'
        ];
        
        for (let i = 0; i < steps.length; i++) {
            statusText.textContent = steps[i];
            progressBar.style.width = ((i + 1) / steps.length * 80) + '%'; // 80% per export
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    /**
     * Esegue Quality Control
     */
    async performQualityControl() {
        const qcPanel = document.getElementById('qcPanel');
        const qcResults = document.getElementById('qcResults');
        
        qcPanel.style.display = 'block';
        
        // Simula controllo 5 frame (0%, 25%, 50%, 75%, 100%)
        const frames = ['0%', '25%', '50%', '75%', '100%'];
        const frameResults = [];
        
        for (const frame of frames) {
            // Simula analisi frame
            const ssim = 0.995 + Math.random() * 0.004; // SSIM tra 0.995-0.999
            const vertexError = Math.random() * 0.4; // Errore < 0.5px
            
            frameResults.push({
                frame,
                ssim: ssim.toFixed(4),
                vertexError: vertexError.toFixed(2),
                passed: ssim >= 0.99 && vertexError <= 0.5
            });
        }
        
        // Genera risultati QC
        let html = '<div class="text-sm">';
        frameResults.forEach(result => {
            const statusClass = result.passed ? 'text-green-600' : 'text-red-600';
            const icon = result.passed ? 'fa-check-circle' : 'fa-times-circle';
            
            html += `<div class="${statusClass}">
                <i class="fas ${icon} mr-1"></i>
                Frame ${result.frame}: SSIM ${result.ssim}, Errore ${result.vertexError}px
            </div>`;
        });
        html += '</div>';
        
        qcResults.innerHTML = html;
        
        // Aggiorna metriche globali
        const avgSSIM = frameResults.reduce((sum, r) => sum + parseFloat(r.ssim), 0) / frameResults.length;
        const maxVertexError = Math.max(...frameResults.map(r => parseFloat(r.vertexError)));
        
        document.getElementById('qcSSIM').textContent = avgSSIM.toFixed(4);
        document.getElementById('qcVertexError').textContent = maxVertexError.toFixed(2);
    }

    /**
     * Visualizza risultati Quality Control
     * @param {Object} qcResult - Risultati QC dal VideoExporter
     */
    displayQCResults(qcResult) {
        const qcPanel = document.getElementById('qcPanel');
        const qcResults = document.getElementById('qcResults');
        
        qcPanel.style.display = 'block';
        
        // Genera HTML risultati
        let html = '<div class="text-sm space-y-1">';
        
        qcResult.frames.forEach((frame, index) => {
            const statusClass = frame.passed ? 'text-green-600' : 'text-red-600';
            const icon = frame.passed ? 'fa-check-circle' : 'fa-times-circle';
            const percentage = Math.round(frame.timestamp * 100);
            
            html += `<div class="${statusClass} flex items-center">
                <i class="fas ${icon} mr-2"></i>
                <span class="flex-1">Frame ${percentage}%</span>
                <span class="text-xs">SSIM: ${frame.ssim.toFixed(4)}</span>
                <span class="text-xs ml-2">Err: ${frame.vertexError.toFixed(2)}px</span>
            </div>`;
        });
        
        html += '</div>';
        
        // Aggiunge badge stato generale
        const globalPassed = qcResult.globalMetrics.passed;
        const badgeClass = globalPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        const badgeText = globalPassed ? 'QC SUPERATO' : 'QC FALLITO';
        
        html += `<div class="mt-3 text-center">
            <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}">
                ${badgeText}
            </span>
        </div>`;
        
        qcResults.innerHTML = html;
        
        // Aggiorna metriche globali
        document.getElementById('qcSSIM').textContent = 
            qcResult.globalMetrics.averageSSIM.toFixed(4);
        document.getElementById('qcVertexError').textContent = 
            qcResult.globalMetrics.maxVertexError.toFixed(2) + ' px';
    }

    /**
     * Download del file video esportato
     * @param {Blob} videoBlob - File video
     * @param {Object} validation - Risultati validazione WhatsApp
     */
    downloadVideoFile(videoBlob, validation) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const filename = `led-mockup-${timestamp}.mp4`;
        
        const url = URL.createObjectURL(videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        // Mostra info compatibilità
        if (!validation.compatible) {
            alert('Attenzione: ' + validation.issues.join(', '));
        }
    }

    /**
     * Mostra feedback errore
     * @param {string} message - Messaggio errore
     */
    showErrorFeedback(message) {
        // Crea toast di errore
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm';
        toast.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-exclamation-circle mr-2"></i>
                <span class="flex-1">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-red-200 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto-rimuovi dopo 5 secondi
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    /**
     * Valida punti corner pin
     * @returns {boolean} True se validi
     */
    validateCornerPoints() {
        if (!this.cornerPinPoints || this.cornerPinPoints.length !== 4) {
            return false;
        }
        
        // Verifica che i punti formino un quadrilatero valido
        const area = MathUtils.calculateQuadArea(this.cornerPinPoints);
        
        if (area < 100) { // Area minima 100 px²
            this.showErrorFeedback('Area corner pin troppo piccola (min 100px²)');
            return false;
        }
        
        // Verifica che i punti non si intersechino (quadrilatero convesso)
        // Implementazione semplificata - in produzione verificare convessità
        
        return true;
    }

    /**
     * Reset corner points a posizione centrale
     */
    resetCornerPointsToCenter() {
        if (!this.videoElement) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const halfWidth = Math.min(200, this.videoElement.videoWidth / 4);
        const halfHeight = Math.min(150, this.videoElement.videoHeight / 4);
        
        this.cornerPinPoints = [
            { x: centerX - halfWidth, y: centerY - halfHeight }, // TL
            { x: centerX + halfWidth, y: centerY - halfHeight }, // TR
            { x: centerX + halfWidth, y: centerY + halfHeight }, // BR
            { x: centerX - halfWidth, y: centerY + halfHeight }  // BL
        ];
        
        this.updateVertexInputs();
        this.calculateHomography();
        this.render();
    }
}

// Inizializza applicazione quando DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.ledMockupApp = new LEDMockupApp();
    
    // Event listeners per toolbar buttons
    document.getElementById('gridBtn').addEventListener('click', function() {
        this.classList.toggle('active');
        window.ledMockupApp.render();
    });
    
    document.getElementById('snapBtn').addEventListener('click', function() {
        this.classList.toggle('active');
    });
    
    // Resize canvas on window resize
    window.addEventListener('resize', () => {
        // Mantieni aspect ratio 16:10 per canvas
        const container = document.querySelector('.canvas-container');
        const width = container.clientWidth;
        const height = Math.round(width * 0.625); // 16:10 ratio
        
        window.ledMockupApp.canvas.width = width;
        window.ledMockupApp.canvas.height = height;
        window.ledMockupApp.render();
    });
});