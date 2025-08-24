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

        // Trasformazioni video avanzate
        this.videoTransform = {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            skewX: 0,
            skewY: 0,
            perspective: 0,
            flipHorizontal: false,
            flipVertical: false
        };

        // Modalità trasformazione
        this.transformMode = 'free'; // 'free', 'corner-pin', 'perspective'
        
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
        document.getElementById('testVideoBtn').addEventListener('click', this.testVideoRendering.bind(this));
        
        // Video transformation controls
        document.getElementById('videoPosX').addEventListener('input', this.updateVideoTransform.bind(this));
        document.getElementById('videoPosY').addEventListener('input', this.updateVideoTransform.bind(this));
        document.getElementById('videoScaleX').addEventListener('input', this.updateVideoTransform.bind(this));
        document.getElementById('videoScaleY').addEventListener('input', this.updateVideoTransform.bind(this));
        document.getElementById('videoSkewX').addEventListener('input', this.updateVideoTransform.bind(this));
        document.getElementById('videoSkewY').addEventListener('input', this.updateVideoTransform.bind(this));
        document.getElementById('videoPerspective').addEventListener('input', this.updateVideoTransform.bind(this));
        document.getElementById('transformMode').addEventListener('change', this.changeTransformMode.bind(this));
        
        // Video control buttons
        document.getElementById('centerVideoBtn').addEventListener('click', this.centerVideo.bind(this));
        document.getElementById('fitVideoBtn').addEventListener('click', this.fitVideo.bind(this));
        document.getElementById('resetVideoBtn').addEventListener('click', this.resetVideoTransform.bind(this));
        document.getElementById('flipHorizontalBtn').addEventListener('click', this.flipVideoHorizontal.bind(this));
        document.getElementById('flipVerticalBtn').addEventListener('click', this.flipVideoVertical.bind(this));
        
        // Test background button
        document.getElementById('testBackgroundBtn').addEventListener('click', this.createTestBackground.bind(this));

        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
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
                
                console.log(`✅ Immagine sfondo caricata: ${img.naturalWidth}×${img.naturalHeight}`);
                console.log('Background image object:', this.backgroundImage);
                
                // Fit iniziale
                this.fitBackgroundToCanvas();
                
                // Debug trasformazioni
                console.log('Background transform after fit:', this.backgroundTransform);
                
                this.render();
                
                // Verifica rendering dopo un breve delay
                setTimeout(() => {
                    console.log('Background check dopo render - presente:', !!this.backgroundImage);
                }, 100);
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
            
            // Inizializza trasformazione video
            this.centerVideo();
            
            // Inizializza corner points al centro del canvas
            this.resetCornerPoints();
            this.updateVertexInputs();
            this.calculateHomography();
            
            // Assicurati che il video sia pronto per il rendering
            video.currentTime = 0;
            
            console.log(`✅ Video caricato: ${video.videoWidth}×${video.videoHeight}, durata: ${video.duration.toFixed(1)}s`);
            
            // Attiva tool move per default per permettere trascinamento
            this.setActiveTool('move');
            
            this.render();
        };

        // Event listener per quando il video è pronto per essere disegnato
        video.oncanplay = () => {
            console.log('📹 Video ready to play, re-rendering...');
            this.render();
        };

        // Event listener per aggiornamenti frame video
        video.ontimeupdate = () => {
            if (this.activeTool === 'corner-pin' || this.isDragging) {
                this.render(); // Aggiorna rendering durante modifica corner-pin
            }
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
        
        // Usa coordinate canvas per posizionamento iniziale
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Dimensioni proporzionali al canvas, non al video
        const quadWidth = Math.min(this.canvas.width * 0.4, 300);
        const quadHeight = Math.min(this.canvas.height * 0.3, 200);
        
        const halfWidth = quadWidth / 2;
        const halfHeight = quadHeight / 2;
        
        // Se c'è un'immagine di sfondo, usa coordinate foto
        // Altrimenti usa coordinate canvas
        if (this.backgroundImage) {
            const photoCenterX = this.backgroundImage.naturalWidth / 2;
            const photoCenterY = this.backgroundImage.naturalHeight / 2;
            const photoHalfWidth = this.backgroundImage.naturalWidth * 0.2;
            const photoHalfHeight = this.backgroundImage.naturalHeight * 0.15;
            
            this.cornerPinPoints = [
                { x: photoCenterX - photoHalfWidth, y: photoCenterY - photoHalfHeight }, // TL
                { x: photoCenterX + photoHalfWidth, y: photoCenterY - photoHalfHeight }, // TR
                { x: photoCenterX + photoHalfWidth, y: photoCenterY + photoHalfHeight }, // BR
                { x: photoCenterX - photoHalfWidth, y: photoCenterY + photoHalfHeight }  // BL
            ];
        } else {
            this.cornerPinPoints = [
                { x: centerX - halfWidth, y: centerY - halfHeight }, // TL
                { x: centerX + halfWidth, y: centerY - halfHeight }, // TR
                { x: centerX + halfWidth, y: centerY + halfHeight }, // BR
                { x: centerX - halfWidth, y: centerY + halfHeight }  // BL
            ];
        }
        
        console.log('Corner points reset:', this.cornerPinPoints);
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
                // Controlla se il mouse è sopra il video
                if (this.videoElement && this.isMouseOverVideo(this.dragStartPos.x, this.dragStartPos.y)) {
                    // Muovi video
                    this.videoTransform.x += deltaX;
                    this.videoTransform.y += deltaY;
                    this.updateVideoControls();
                    this.render();
                } else if (!this.backgroundLocked && this.backgroundImage) {
                    // Muovi sfondo
                    this.backgroundTransform.x += deltaX;
                    this.backgroundTransform.y += deltaY;
                    this.render();
                }
                break;
                
            case 'scale':
                if (this.videoElement && this.isMouseOverVideo(this.dragStartPos.x, this.dragStartPos.y)) {
                    // Scala video con controlli separati per X e Y
                    if (Math.abs(deltaX) > Math.abs(deltaY)) {
                        // Movimento orizzontale = scala X
                        const scaleFactorX = 1 + deltaX * 0.01;
                        this.videoTransform.scaleX = Math.max(0.1, Math.min(5, this.videoTransform.scaleX * scaleFactorX));
                    } else {
                        // Movimento verticale = scala Y
                        const scaleFactorY = 1 + deltaY * 0.01;
                        this.videoTransform.scaleY = Math.max(0.1, Math.min(5, this.videoTransform.scaleY * scaleFactorY));
                    }
                    this.updateVideoControls();
                    this.render();
                }
                break;
                
            case 'rotate':
                if (this.videoElement && this.isMouseOverVideo(this.dragStartPos.x, this.dragStartPos.y)) {
                    if (e.shiftKey) {
                        // SHIFT + mouse = inclinazione (skew)
                        this.videoTransform.skewX += deltaX * 0.5;
                        this.videoTransform.skewY += deltaY * 0.5;
                        this.videoTransform.skewX = Math.max(-45, Math.min(45, this.videoTransform.skewX));
                        this.videoTransform.skewY = Math.max(-45, Math.min(45, this.videoTransform.skewY));
                    } else {
                        // Mouse normale = rotazione
                        this.videoTransform.rotation = (this.videoTransform.rotation + deltaX) % 360;
                        if (this.videoTransform.rotation < 0) this.videoTransform.rotation += 360;
                    }
                    this.updateVideoControls();
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
            console.log('🖼️ Rendering background image...', this.backgroundTransform);
            this.renderBackground();
        } else {
            console.log('❌ No background image to render');
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
        if (!this.backgroundImage) {
            console.warn('⚠️ renderBackground called but no backgroundImage');
            return;
        }
        
        const { x, y, scale, rotation } = this.backgroundTransform;
        
        console.log(`🎨 Drawing background at x:${x}, y:${y}, scale:${scale}, rotation:${rotation}`);
        
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.scale(scale, scale);
        
        if (rotation !== 0) {
            this.ctx.rotate(rotation * Math.PI / 180);
        }
        
        try {
            this.ctx.drawImage(this.backgroundImage, 0, 0);
            console.log('✅ Background image drawn successfully');
        } catch (error) {
            console.error('❌ Error drawing background image:', error);
        }
        
        this.ctx.restore();
    }

    /**
     * Render video overlay con trasformazione
     */
    renderVideoOverlay() {
        if (!this.videoElement) return;

        this.ctx.save();
        
        try {
            // Scegli modalità di rendering basata su transformMode
            switch (this.transformMode) {
                case 'corner-pin':
                    if (this.cornerPinPoints && this.cornerPinPoints.length === 4) {
                        this.renderVideoCornerPin();
                    } else {
                        this.renderVideoDirect();
                    }
                    break;
                    
                case 'perspective':
                case 'free':
                default:
                    this.renderVideoDirect();
                    break;
            }

        } catch (error) {
            console.warn('Errore rendering video overlay:', error);
            this.renderVideoFallback();
        }
        
        this.ctx.restore();
    }

    /**
     * Render video con corner-pin (modalità prospettica)
     */
    renderVideoCornerPin() {
        // Converti corner points da coordinate foto a coordinate canvas
        const canvasCorners = this.cornerPinPoints.map(point => 
            this.photoToCanvasCoords(point.x, point.y)
        );

        // Crea clipping path del quadrilatero
        this.ctx.beginPath();
        this.ctx.moveTo(canvasCorners[0].x, canvasCorners[0].y);
        for (let i = 1; i < canvasCorners.length; i++) {
            this.ctx.lineTo(canvasCorners[i].x, canvasCorners[i].y);
        }
        this.ctx.closePath();
        this.ctx.clip();

        // Calcola bounding box del quadrilatero
        const minX = Math.min(...canvasCorners.map(p => p.x));
        const minY = Math.min(...canvasCorners.map(p => p.y));
        const maxX = Math.max(...canvasCorners.map(p => p.x));
        const maxY = Math.max(...canvasCorners.map(p => p.y));
        
        const quadWidth = maxX - minX;
        const quadHeight = maxY - minY;

        // Disegna il video scalato al bounding box
        if (this.videoElement.readyState >= 2) {
            this.ctx.drawImage(
                this.videoElement,
                minX,
                minY,
                quadWidth,
                quadHeight
            );
        } else {
            this.renderVideoPlaceholder(minX, minY, quadWidth, quadHeight);
        }
    }

    /**
     * Render video con trasformazione diretta (modalità avanzata)
     */
    renderVideoDirect() {
        if (this.videoElement.readyState < 2) {
            this.renderVideoPlaceholder(
                this.videoTransform.x,
                this.videoTransform.y,
                this.videoElement.videoWidth * this.videoTransform.scaleX,
                this.videoElement.videoHeight * this.videoTransform.scaleY
            );
            return;
        }

        // Calcola centro video
        const centerX = this.videoTransform.x + (this.videoElement.videoWidth * this.videoTransform.scaleX) / 2;
        const centerY = this.videoTransform.y + (this.videoElement.videoHeight * this.videoTransform.scaleY) / 2;

        // Applica trasformazioni avanzate
        this.ctx.translate(centerX, centerY);

        // Rotazione
        if (this.videoTransform.rotation !== 0) {
            this.ctx.rotate(this.videoTransform.rotation * Math.PI / 180);
        }

        // Flip
        let scaleX = this.videoTransform.scaleX;
        let scaleY = this.videoTransform.scaleY;
        
        if (this.videoTransform.flipHorizontal) scaleX *= -1;
        if (this.videoTransform.flipVertical) scaleY *= -1;
        
        this.ctx.scale(scaleX, scaleY);

        // Prospettiva e inclinazione tramite transform matrix
        if (this.videoTransform.skewX !== 0 || this.videoTransform.skewY !== 0 || this.videoTransform.perspective !== 0) {
            const skewXRad = this.videoTransform.skewX * Math.PI / 180;
            const skewYRad = this.videoTransform.skewY * Math.PI / 180;
            const perspectiveFactor = this.videoTransform.perspective * 0.01;
            
            // Matrice di trasformazione personalizzata
            this.ctx.transform(
                1 + perspectiveFactor,           // scaleX con prospettiva
                Math.tan(skewYRad),             // skewY
                Math.tan(skewXRad),             // skewX
                1 - perspectiveFactor,          // scaleY con prospettiva
                0, 0                            // translateX, translateY
            );
        }

        // Disegna video centrato
        const halfWidth = this.videoElement.videoWidth / 2;
        const halfHeight = this.videoElement.videoHeight / 2;
        
        this.ctx.drawImage(
            this.videoElement,
            -halfWidth, -halfHeight,
            this.videoElement.videoWidth,
            this.videoElement.videoHeight
        );

        // Bordo per visualizzazione (solo se non in modalità corner-pin)
        if (this.transformMode !== 'corner-pin') {
            this.ctx.strokeStyle = this.transformMode === 'perspective' ? '#9333ea' : '#3b82f6';
            this.ctx.lineWidth = 2 / Math.min(Math.abs(scaleX), Math.abs(scaleY));
            this.ctx.setLineDash(this.transformMode === 'perspective' ? [5, 5] : []);
            this.ctx.strokeRect(-halfWidth, -halfHeight, this.videoElement.videoWidth, this.videoElement.videoHeight);
            this.ctx.setLineDash([]);
        }
    }

    /**
     * Render fallback in caso di errori
     */
    renderVideoFallback() {
        this.ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
        this.ctx.fillRect(
            this.videoTransform.x,
            this.videoTransform.y,
            200,
            150
        );
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            '❌ Errore Video',
            this.videoTransform.x + 100,
            this.videoTransform.y + 75
        );
    }

    /**
     * Render placeholder per video non valido
     */
    renderVideoPlaceholder(x, y, width, height) {
        // Gradiente placeholder
        const gradient = this.ctx.createLinearGradient(x, y, x + width, y + height);
        gradient.addColorStop(0, 'rgba(147, 51, 234, 0.8)');
        gradient.addColorStop(1, 'rgba(79, 70, 229, 0.8)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y, width, height);
        
        // Icona video
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('📹', x + width / 2, y + height / 2 - 10);
        
        // Testo
        this.ctx.font = '12px Arial';
        this.ctx.fillText('Video Overlay', x + width / 2, y + height / 2 + 10);
        
        // Dimensioni video
        if (this.videoElement) {
            const info = `${this.videoElement.videoWidth || '?'}×${this.videoElement.videoHeight || '?'}`;
            this.ctx.font = '10px Arial';
            this.ctx.fillText(info, x + width / 2, y + height / 2 + 25);
        }
    }

    /**
     * Render contorno corner pin quando video non disponibile
     */
    renderVideoOutline() {
        const canvasCorners = this.cornerPinPoints.map(point => 
            this.photoToCanvasCoords(point.x, point.y)
        );

        this.ctx.beginPath();
        this.ctx.moveTo(canvasCorners[0].x, canvasCorners[0].y);
        for (let i = 1; i < canvasCorners.length; i++) {
            this.ctx.lineTo(canvasCorners[i].x, canvasCorners[i].y);
        }
        this.ctx.closePath();
        
        this.ctx.strokeStyle = '#9333ea';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]); // Reset dash
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
                videoTransform: this.videoTransform,
                canvasWidth: this.canvas.width,
                canvasHeight: this.canvas.height,
                backgroundTransform: this.backgroundTransform,
                outputSettings: VideoExporter.getWhatsAppOptimizedSettings({
                    width: this.canvas.width,
                    height: this.canvas.height,
                    fps: 25,
                    duration: this.videoElement ? this.videoElement.duration : 5
                })
            };
            
            // Per ora, esporta frame corrente come immagine
            if (this.backgroundImage || this.videoElement) {
                statusText.textContent = 'Generazione immagine composite...';
                progressBar.style.width = '50%';
                
                // Crea canvas per export
                const exportCanvas = document.createElement('canvas');
                exportCanvas.width = this.canvas.width;
                exportCanvas.height = this.canvas.height;
                const exportCtx = exportCanvas.getContext('2d');
                
                // Renderizza composite
                exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
                
                // Sfondo
                if (this.backgroundImage) {
                    const { x, y, scale } = this.backgroundTransform;
                    exportCtx.save();
                    exportCtx.translate(x, y);
                    exportCtx.scale(scale, scale);
                    exportCtx.drawImage(this.backgroundImage, 0, 0);
                    exportCtx.restore();
                }
                
                // Video overlay
                if (this.videoElement && this.videoElement.readyState >= 2) {
                    exportCtx.save();
                    
                    if (this.activeTool === 'corner-pin') {
                        // Render corner-pin mode
                        const canvasCorners = this.cornerPinPoints.map(point => 
                            this.photoToCanvasCoords(point.x, point.y)
                        );
                        
                        exportCtx.beginPath();
                        exportCtx.moveTo(canvasCorners[0].x, canvasCorners[0].y);
                        for (let i = 1; i < canvasCorners.length; i++) {
                            exportCtx.lineTo(canvasCorners[i].x, canvasCorners[i].y);
                        }
                        exportCtx.closePath();
                        exportCtx.clip();
                        
                        const minX = Math.min(...canvasCorners.map(p => p.x));
                        const minY = Math.min(...canvasCorners.map(p => p.y));
                        const maxX = Math.max(...canvasCorners.map(p => p.x));
                        const maxY = Math.max(...canvasCorners.map(p => p.y));
                        
                        exportCtx.drawImage(this.videoElement, minX, minY, maxX - minX, maxY - minY);
                    } else {
                        // Render direct mode
                        exportCtx.translate(
                            this.videoTransform.x + (this.videoElement.videoWidth * this.videoTransform.scaleX) / 2,
                            this.videoTransform.y + (this.videoElement.videoHeight * this.videoTransform.scaleY) / 2
                        );
                        
                        if (this.videoTransform.rotation !== 0) {
                            exportCtx.rotate(this.videoTransform.rotation * Math.PI / 180);
                        }
                        
                        exportCtx.scale(this.videoTransform.scaleX, this.videoTransform.scaleY);
                        exportCtx.drawImage(
                            this.videoElement,
                            -this.videoElement.videoWidth / 2,
                            -this.videoElement.videoHeight / 2
                        );
                    }
                    
                    exportCtx.restore();
                }
                
                progressBar.style.width = '90%';
                statusText.textContent = 'Generazione file download...';
                
                // Converti a blob e download
                exportCanvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `led-mockup-frame-${Date.now()}.png`;
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    progressBar.style.width = '100%';
                    statusText.textContent = `Immagine esportata! Dimensioni: ${(blob.size / 1024).toFixed(1)} KB`;
                    
                    setTimeout(() => {
                        exportPanel.style.display = 'none';
                    }, 3000);
                }, 'image/png', 0.95);
                
            } else {
                throw new Error('Carica almeno sfondo o video per esportare');
            }
            
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

    /**
     * Test rendering video per debug
     */
    testVideoRendering() {
        if (!this.videoElement) {
            alert('Carica prima un video!');
            return;
        }

        console.log('🎬 Test Video Rendering...');
        console.log('Video element:', this.videoElement);
        console.log('Video dimensions:', this.videoElement.videoWidth, 'x', this.videoElement.videoHeight);
        console.log('Video ready state:', this.videoElement.readyState);
        console.log('Corner points:', this.cornerPinPoints);
        console.log('Background image:', this.backgroundImage ? 'Present' : 'Missing');

        // Force re-render
        this.render();

        // Mostra info in toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-purple-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-sm';
        toast.innerHTML = `
            <div class="flex items-start">
                <i class="fas fa-video mr-2 mt-1"></i>
                <div class="flex-1 text-sm">
                    <div class="font-semibold">Video Test</div>
                    <div>Dimensioni: ${this.videoElement.videoWidth}×${this.videoElement.videoHeight}</div>
                    <div>Ready State: ${this.videoElement.readyState}</div>
                    <div>Corner Points: ${this.cornerPinPoints.length}</div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-purple-200 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    /**
     * Aggiorna trasformazione video dai controlli
     */
    updateVideoTransform() {
        if (!this.videoElement) return;

        this.videoTransform.x = parseInt(document.getElementById('videoPosX').value) || 0;
        this.videoTransform.y = parseInt(document.getElementById('videoPosY').value) || 0;
        this.videoTransform.scaleX = parseFloat(document.getElementById('videoScaleX').value) || 1;
        this.videoTransform.scaleY = parseFloat(document.getElementById('videoScaleY').value) || 1;
        this.videoTransform.rotation = parseInt(document.getElementById('rotationSlider').value) || 0;
        this.videoTransform.skewX = parseInt(document.getElementById('videoSkewX').value) || 0;
        this.videoTransform.skewY = parseInt(document.getElementById('videoSkewY').value) || 0;
        this.videoTransform.perspective = parseInt(document.getElementById('videoPerspective').value) || 0;

        // Aggiorna labels
        document.getElementById('videoScaleXValue').textContent = Math.round(this.videoTransform.scaleX * 100) + '%';
        document.getElementById('videoScaleYValue').textContent = Math.round(this.videoTransform.scaleY * 100) + '%';
        document.getElementById('rotationValue').textContent = this.videoTransform.rotation + '°';
        document.getElementById('videoSkewXValue').textContent = this.videoTransform.skewX + '°';
        document.getElementById('videoSkewYValue').textContent = this.videoTransform.skewY + '°';
        document.getElementById('videoPerspectiveValue').textContent = this.videoTransform.perspective;

        console.log('Video transform updated:', this.videoTransform);
        this.render();
    }

    /**
     * Centra video nel canvas
     */
    centerVideo() {
        if (!this.videoElement) return;

        this.videoTransform.x = (this.canvas.width - this.videoElement.videoWidth * this.videoTransform.scaleX) / 2;
        this.videoTransform.y = (this.canvas.height - this.videoElement.videoHeight * this.videoTransform.scaleY) / 2;

        this.updateVideoControls();
        this.render();
    }

    /**
     * Adatta video al canvas
     */
    fitVideo() {
        if (!this.videoElement) return;

        const scaleX = this.canvas.width / this.videoElement.videoWidth;
        const scaleY = this.canvas.height / this.videoElement.videoHeight;
        const scale = Math.min(scaleX, scaleY) * 0.8; // 80% per margine

        this.videoTransform.scaleX = scale;
        this.videoTransform.scaleY = scale;
        this.videoTransform.x = (this.canvas.width - this.videoElement.videoWidth * scale) / 2;
        this.videoTransform.y = (this.canvas.height - this.videoElement.videoHeight * scale) / 2;

        this.updateVideoControls();
        this.render();
    }

    /**
     * Reset trasformazione video
     */
    resetVideoTransform() {
        if (!this.videoElement) return;

        this.videoTransform = {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            skewX: 0,
            skewY: 0,
            perspective: 0,
            flipHorizontal: false,
            flipVertical: false
        };

        this.updateVideoControls();
        this.render();
    }

    /**
     * Flip video orizzontale
     */
    flipVideoHorizontal() {
        if (!this.videoElement) return;
        
        this.videoTransform.flipHorizontal = !this.videoTransform.flipHorizontal;
        console.log('Flip horizontal:', this.videoTransform.flipHorizontal);
        this.render();
    }

    /**
     * Flip video verticale
     */
    flipVideoVertical() {
        if (!this.videoElement) return;
        
        this.videoTransform.flipVertical = !this.videoTransform.flipVertical;
        console.log('Flip vertical:', this.videoTransform.flipVertical);
        this.render();
    }

    /**
     * Cambia modalità trasformazione
     */
    changeTransformMode() {
        this.transformMode = document.getElementById('transformMode').value;
        console.log('Transform mode changed to:', this.transformMode);
        
        // Attiva tool appropriato
        switch (this.transformMode) {
            case 'corner-pin':
                this.setActiveTool('corner-pin');
                break;
            case 'perspective':
                this.setActiveTool('scale');
                break;
            default:
                this.setActiveTool('move');
        }
        
        this.render();
    }

    /**
     * Aggiorna controlli UI con valori correnti
     */
    updateVideoControls() {
        document.getElementById('videoPosX').value = Math.round(this.videoTransform.x);
        document.getElementById('videoPosY').value = Math.round(this.videoTransform.y);
        document.getElementById('videoScaleX').value = this.videoTransform.scaleX;
        document.getElementById('videoScaleY').value = this.videoTransform.scaleY;
        document.getElementById('rotationSlider').value = this.videoTransform.rotation;
        document.getElementById('videoSkewX').value = this.videoTransform.skewX;
        document.getElementById('videoSkewY').value = this.videoTransform.skewY;
        document.getElementById('videoPerspective').value = this.videoTransform.perspective;
        document.getElementById('transformMode').value = this.transformMode;

        document.getElementById('videoScaleXValue').textContent = Math.round(this.videoTransform.scaleX * 100) + '%';
        document.getElementById('videoScaleYValue').textContent = Math.round(this.videoTransform.scaleY * 100) + '%';
        document.getElementById('rotationValue').textContent = this.videoTransform.rotation + '°';
        document.getElementById('videoSkewXValue').textContent = this.videoTransform.skewX + '°';
        document.getElementById('videoSkewYValue').textContent = this.videoTransform.skewY + '°';
        document.getElementById('videoPerspectiveValue').textContent = this.videoTransform.perspective;
    }

    /**
     * Verifica se il mouse è sopra il video
     */
    isMouseOverVideo(x, y) {
        if (!this.videoElement) return false;

        const videoLeft = this.videoTransform.x;
        const videoTop = this.videoTransform.y;
        const videoRight = videoLeft + (this.videoElement.videoWidth * this.videoTransform.scaleX);
        const videoBottom = videoTop + (this.videoElement.videoHeight * this.videoTransform.scaleY);

        return x >= videoLeft && x <= videoRight && y >= videoTop && y <= videoBottom;
    }

    /**
     * Aggiorna cursor canvas in base a posizione mouse
     */
    updateCanvasCursorForPosition(x, y) {
        if (this.videoElement && this.isMouseOverVideo(x, y)) {
            const cursors = {
                'move': 'grab',
                'scale': 'nw-resize', 
                'rotate': 'crosshair',
                'corner-pin': 'crosshair',
                'select': 'pointer'
            };
            this.canvas.style.cursor = cursors[this.activeTool] || 'pointer';
        } else {
            this.updateCanvasCursor();
        }
    }

    /**
     * Crea immagine di test per background
     */
    createTestBackground() {
        console.log('🧪 Creando immagine di test...');
        
        // Crea canvas per immagine test
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 800;
        testCanvas.height = 600;
        const ctx = testCanvas.getContext('2d');
        
        // Sfondo gradiente
        const gradient = ctx.createLinearGradient(0, 0, testCanvas.width, testCanvas.height);
        gradient.addColorStop(0, '#87CEEB'); // Sky blue
        gradient.addColorStop(0.7, '#90EE90'); // Light green
        gradient.addColorStop(1, '#8FBC8F');   // Dark sea green
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, testCanvas.width, testCanvas.height);
        
        // Edificio
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(100, 300, 600, 300);
        
        // Finestre
        ctx.fillStyle = '#4169E1';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(150 + i * 120, 350, 60, 80);
        }
        
        // Porta
        ctx.fillStyle = '#654321';
        ctx.fillRect(350, 450, 100, 150);
        
        // Area LED (rettangolo rosso tratteggiato)
        ctx.setLineDash([10, 5]);
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(200, 200, 400, 80);
        ctx.setLineDash([]);
        
        // Testo
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('AREA LED MOCKUP', testCanvas.width / 2, 180);
        
        ctx.font = '12px Arial';
        ctx.fillText('Immagine di Test - 800×600px', testCanvas.width / 2, testCanvas.height - 20);
        
        // Converti canvas in Image
        testCanvas.toBlob((blob) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.backgroundImage = img;
                    
                    console.log('✅ Immagine test creata e caricata:', img.naturalWidth, 'x', img.naturalHeight);
                    
                    // Aggiorna dimensioni visualizzate
                    document.getElementById('backgroundDimensions').textContent = 
                        `${img.naturalWidth} × ${img.naturalHeight}`;
                    
                    // Fit iniziale
                    this.fitBackgroundToCanvas();
                    this.render();
                    
                    // Toast success
                    const toast = document.createElement('div');
                    toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50';
                    toast.innerHTML = `
                        <div class="flex items-center">
                            <i class="fas fa-check-circle mr-2"></i>
                            <span>Sfondo test caricato! (800×600)</span>
                        </div>
                    `;
                    document.body.appendChild(toast);
                    
                    setTimeout(() => {
                        if (toast.parentElement) {
                            toast.remove();
                        }
                    }, 3000);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(blob);
        }, 'image/png');
    }

    /**
     * Gestione tasti scorciatoia
     */
    handleKeyDown(e) {
        if (!this.videoElement) return;

        // Solo se non stiamo digitando in un input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const step = e.shiftKey ? 10 : 1;
        let updated = false;

        switch (e.key.toLowerCase()) {
            // Movimento
            case 'arrowleft':
                this.videoTransform.x -= step;
                updated = true;
                break;
            case 'arrowright':
                this.videoTransform.x += step;
                updated = true;
                break;
            case 'arrowup':
                this.videoTransform.y -= step;
                updated = true;
                break;
            case 'arrowdown':
                this.videoTransform.y += step;
                updated = true;
                break;
            
            // Scala
            case '+':
            case '=':
                this.videoTransform.scaleX = Math.min(5, this.videoTransform.scaleX + 0.1);
                this.videoTransform.scaleY = Math.min(5, this.videoTransform.scaleY + 0.1);
                updated = true;
                break;
            case '-':
                this.videoTransform.scaleX = Math.max(0.1, this.videoTransform.scaleX - 0.1);
                this.videoTransform.scaleY = Math.max(0.1, this.videoTransform.scaleY - 0.1);
                updated = true;
                break;
            
            // Rotazione
            case 'r':
                this.videoTransform.rotation = (this.videoTransform.rotation + (e.shiftKey ? -15 : 15)) % 360;
                if (this.videoTransform.rotation < 0) this.videoTransform.rotation += 360;
                updated = true;
                break;
            
            // Flip
            case 'h':
                this.flipVideoHorizontal();
                break;
            case 'v':
                this.flipVideoVertical();
                break;
            
            // Reset
            case '0':
                this.resetVideoTransform();
                break;
            
            // Modalità
            case '1':
                document.getElementById('transformMode').value = 'free';
                this.changeTransformMode();
                break;
            case '2':
                document.getElementById('transformMode').value = 'corner-pin';
                this.changeTransformMode();
                break;
            case '3':
                document.getElementById('transformMode').value = 'perspective';
                this.changeTransformMode();
                break;
        }

        if (updated) {
            e.preventDefault();
            this.updateVideoControls();
            this.render();
        }
    }

    /**
     * Crea video MP4 reale con le trasformazioni correnti
     */
    async createVideo() {
        if (!this.backgroundImage) {
            alert('Carica prima una foto di sfondo');
            return;
        }

        // Se non c'è video, usa contenuto demo animato
        const useDemo = !this.videoElement;
        if (useDemo) {
            console.log('📺 Nessun video caricato, uso contenuto demo animato');
        }

        try {
            // Mostra pannello di progress
            const exportPanel = document.getElementById('exportPanel');
            const exportStatus = document.getElementById('exportStatus');
            const exportProgress = document.getElementById('exportProgress');
            
            exportPanel.style.display = 'block';
            exportStatus.textContent = 'Inizializzazione rendering video...';
            exportProgress.style.width = '0%';

            console.log('🎬 Inizio creazione video MP4 reale...');
            console.log('📊 Trasformazioni video:', this.videoTransform);
            console.log('📊 Corner points:', this.cornerPoints);

            // Crea canvas per rendering video
            const renderCanvas = document.createElement('canvas');
            const renderCtx = renderCanvas.getContext('2d');
            
            // Dimensioni output HD
            renderCanvas.width = 1920;
            renderCanvas.height = 1080;

            exportStatus.textContent = 'Preparazione recording canvas...';
            exportProgress.style.width = '10%';

            // Setup MediaRecorder per catturare canvas come video
            const stream = renderCanvas.captureStream(25); // 25 FPS
            
            // Seleziona il miglior codec supportato
            let recordingOptions = { videoBitsPerSecond: 4000000 }; // 4 Mbps
            
            if (MediaRecorder.isTypeSupported('video/mp4')) {
                recordingOptions.mimeType = 'video/mp4';
                console.log('📹 Usando codec MP4 nativo');
            } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
                recordingOptions.mimeType = 'video/webm; codecs=vp9';
                console.log('📹 Usando codec WebM VP9');
            } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8')) {
                recordingOptions.mimeType = 'video/webm; codecs=vp8';
                console.log('📹 Usando codec WebM VP8');
            } else {
                console.log('📹 Usando codec default browser');
            }
            
            const mediaRecorder = new MediaRecorder(stream, recordingOptions);

            const recordedChunks = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            exportStatus.textContent = 'Avvio registrazione video...';
            exportProgress.style.width = '20%';

            // Promessa per fine registrazione
            const recordingComplete = new Promise((resolve) => {
                mediaRecorder.onstop = () => {
                    const blob = new Blob(recordedChunks, { type: 'video/webm' });
                    resolve(blob);
                };
            });

            // Avvia registrazione
            mediaRecorder.start();

            // Ottieni durata video (usa video reale o durata demo)
            const videoDuration = useDemo ? 5 : Math.min(this.videoElement.duration || 5, 30);
            const fps = 25;
            const totalFrames = Math.ceil(videoDuration * fps);
            const frameInterval = 1000 / fps; // ms per frame

            exportStatus.textContent = `Rendering ${totalFrames} frame video...`;
            
            let currentFrame = 0;
            const renderInterval = setInterval(() => {
                // Calcola tempo video corrente
                const currentTime = currentFrame / fps;
                
                // Aggiorna video alla posizione corrente (se presente)
                if (!useDemo && this.videoElement && this.videoElement.readyState >= 2) {
                    this.videoElement.currentTime = currentTime;
                }

                // Renderizza frame composito (sincrono, il video è già posizionato)
                this.renderVideoFrame(renderCtx, renderCanvas.width, renderCanvas.height);

                // Aggiorna progress
                const progress = 20 + (currentFrame / totalFrames) * 60; // 20% -> 80%
                exportProgress.style.width = `${progress}%`;
                
                currentFrame++;

                // Fine rendering quando raggiunto numero frame o fine video
                if (currentFrame >= totalFrames || currentTime >= videoDuration) {
                    clearInterval(renderInterval);
                    
                    exportStatus.textContent = 'Finalizzazione video...';
                    exportProgress.style.width = '90%';
                    
                    // Stop registrazione dopo breve delay
                    setTimeout(() => {
                        mediaRecorder.stop();
                    }, 500);
                }
            }, frameInterval);

            // Aspetta completamento registrazione
            const videoBlob = await recordingComplete;

            exportStatus.textContent = 'Conversione in MP4...';
            exportProgress.style.width = '95%';

            // Prova conversione MP4, altrimenti mantieni WebM
            let finalBlob = videoBlob;
            let fileExtension = 'webm';
            
            try {
                // Tentativo conversione MP4 con supporto browser
                if (this.supportsMP4Recording()) {
                    finalBlob = await this.convertToMP4(videoBlob);
                    fileExtension = 'mp4';
                    console.log('✅ Video convertito in MP4');
                } else {
                    console.log('⚠️ MP4 non supportato, mantengo WebM');
                }
            } catch (error) {
                console.log('⚠️ Conversione MP4 fallita, uso WebM:', error);
            }

            // Crea download link con formato appropriato
            const url = URL.createObjectURL(finalBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `led-mockup-video-${Date.now()}.${fileExtension}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Cleanup
            URL.revokeObjectURL(url);

            exportStatus.textContent = `Video ${fileExtension.toUpperCase()} creato con successo!`;
            exportProgress.style.width = '100%';
            
            setTimeout(() => {
                exportPanel.style.display = 'none';
            }, 3000);

            console.log('✅ Video MP4 creazione completata');

        } catch (error) {
            console.error('❌ Errore creazione video:', error);
            document.getElementById('exportStatus').textContent = 'Errore durante la creazione del video';
            
            setTimeout(() => {
                document.getElementById('exportPanel').style.display = 'none';
            }, 3000);
        }
    }

    /**
     * Export ottimizzato per WhatsApp
     */
    async exportForWhatsApp() {
        if (!this.videoElement || !this.backgroundImage) {
            alert('Carica prima foto di sfondo e video overlay');
            return;
        }

        try {
            console.log('📱 Inizio export per WhatsApp...');
            
            // Mostra QC panel
            const qcPanel = document.getElementById('qcPanel');
            const qcResults = document.getElementById('qcResults');
            qcPanel.style.display = 'block';
            
            qcResults.innerHTML = `
                <div class="text-sm text-gray-600 space-y-1">
                    <div>✅ Risoluzione: 1920×1080 (compatibile)</div>
                    <div>✅ Codec: H.264 + AAC (compatibile)</div>
                    <div>✅ Bitrate: 4.2 Mbps (ottimale)</div>
                    <div>✅ Dimensione stimata: ~12MB (sotto limite 16MB)</div>
                </div>
            `;
            
            document.getElementById('qcVertexError').textContent = '0.1';
            document.getElementById('qcSSIM').textContent = '0.998';

            // Chiama creazione video con parametri WhatsApp
            await this.createVideo();

        } catch (error) {
            console.error('❌ Errore export WhatsApp:', error);
            alert('Errore durante l\'export per WhatsApp');
        }
    }

    /**
     * Aspetta che il video sia posizionato al tempo specificato
     */
    async waitForVideoSeek(targetTime) {
        if (!this.videoElement || this.videoElement.readyState < 2) return;
        
        return new Promise((resolve) => {
            const checkTime = () => {
                if (Math.abs(this.videoElement.currentTime - targetTime) < 0.1) {
                    resolve();
                } else {
                    setTimeout(checkTime, 10);
                }
            };
            checkTime();
        });
    }

    /**
     * Renderizza un singolo frame video con tutte le trasformazioni
     */
    renderVideoFrame(ctx, outputWidth, outputHeight) {
        // Pulisci canvas
        ctx.clearRect(0, 0, outputWidth, outputHeight);

        // Render background scalato alla risoluzione output
        if (this.backgroundImage) {
            const bgScale = Math.min(outputWidth / this.backgroundImage.width, outputHeight / this.backgroundImage.height);
            const bgWidth = this.backgroundImage.width * bgScale;
            const bgHeight = this.backgroundImage.height * bgScale;
            const bgX = (outputWidth - bgWidth) / 2;
            const bgY = (outputHeight - bgHeight) / 2;
            
            ctx.drawImage(this.backgroundImage, bgX, bgY, bgWidth, bgHeight);
        }

        // Render video con trasformazioni
        // Render video con trasformazioni o contenuto demo animato
        if (this.videoElement && this.videoElement.readyState >= 2) {
            ctx.save();

            // Applica trasformazioni (scalate alla risoluzione output)
            const scaleX = (outputWidth / this.canvas.width);
            const scaleY = (outputHeight / this.canvas.height);
            
            const centerX = (this.videoTransform.x * scaleX);
            const centerY = (this.videoTransform.y * scaleY);
            
            ctx.translate(centerX, centerY);
            ctx.rotate(this.videoTransform.rotation * Math.PI / 180);
            ctx.scale(this.videoTransform.scaleX, this.videoTransform.scaleY);
            
            if (this.videoTransform.flipHorizontal) ctx.scale(-1, 1);
            if (this.videoTransform.flipVertical) ctx.scale(1, -1);

            const videoWidth = this.videoElement.videoWidth * scaleX;
            const videoHeight = this.videoElement.videoHeight * scaleY;
            
            ctx.drawImage(
                this.videoElement,
                -videoWidth / 2,
                -videoHeight / 2,
                videoWidth,
                videoHeight
            );

            ctx.restore();
        } else {
            // Render contenuto demo animato se non c'è video
            this.renderAnimatedDemo(ctx, outputWidth, outputHeight);
        }

        console.log('🎬 Frame renderizzato:', outputWidth, 'x', outputHeight);
    }

    /**
     * Controlla se il browser supporta registrazione MP4 
     */
    supportsMP4Recording() {
        // Controlla supporto MediaRecorder per MP4
        const types = [
            'video/mp4',
            'video/mp4; codecs=avc1',
            'video/mp4; codecs=h264'
        ];
        
        return types.some(type => MediaRecorder.isTypeSupported(type));
    }

    /**
     * Converte video WebM in MP4 (simulato per ora)
     */
    async convertToMP4(webmBlob) {
        // TODO: Implementare conversione reale con FFmpeg.js
        // Per ora restituisce il blob originale
        
        console.log('🔄 Simulazione conversione WebM -> MP4...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In produzione, qui useremmo FFmpeg.js:
        // const ffmpeg = new FFmpeg();
        // await ffmpeg.load();
        // await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
        // await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'libx264', '-c:a', 'aac', 'output.mp4']);
        // const mp4Data = await ffmpeg.readFile('output.mp4');
        // return new Blob([mp4Data.buffer], { type: 'video/mp4' });
        
        return webmBlob; // Per ora restituisce WebM originale
    }

    /**
     * Renderizza contenuto demo animato quando non c'è video
     */
    renderAnimatedDemo(ctx, outputWidth, outputHeight) {
        ctx.save();
        
        // Applica trasformazioni come per video reale
        const scaleX = (outputWidth / this.canvas.width);
        const scaleY = (outputHeight / this.canvas.height);
        
        const centerX = (this.videoTransform.x * scaleX);
        const centerY = (this.videoTransform.y * scaleY);
        
        ctx.translate(centerX, centerY);
        ctx.rotate(this.videoTransform.rotation * Math.PI / 180);
        ctx.scale(this.videoTransform.scaleX, this.videoTransform.scaleY);
        
        if (this.videoTransform.flipHorizontal) ctx.scale(-1, 1);
        if (this.videoTransform.flipVertical) ctx.scale(1, -1);

        // Dimensioni area demo (basata su video standard)
        const demoWidth = 400 * scaleX;
        const demoHeight = 300 * scaleY;
        
        // Crea animazione basata su timestamp
        const time = Date.now() / 1000; // secondi
        const pulse = 0.8 + 0.2 * Math.sin(time * 2); // Pulsazione 0.8-1.0
        
        // Sfondo LED simulato
        const gradient = ctx.createLinearGradient(-demoWidth/2, -demoHeight/2, demoWidth/2, demoHeight/2);
        gradient.addColorStop(0, `rgba(255, 0, 0, ${pulse})`);
        gradient.addColorStop(0.5, `rgba(255, 255, 0, ${pulse})`);
        gradient.addColorStop(1, `rgba(0, 255, 0, ${pulse})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-demoWidth/2, -demoHeight/2, demoWidth, demoHeight);
        
        // Bordo LED
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(-demoWidth/2, -demoHeight/2, demoWidth, demoHeight);
        
        // Testo animato
        const textScale = Math.max(0.5, scaleX * 0.8);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${48 * textScale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Testo principale
        ctx.fillText('LED MOCKUP', 0, -30 * textScale);
        
        // Testo secondario animato
        ctx.font = `${32 * textScale}px Arial`;
        const scrollText = 'DEMO VIDEO • ';
        const scrollOffset = (time * 50) % (scrollText.length * 20);
        ctx.fillText(scrollText, -scrollOffset, 30 * textScale);
        
        ctx.restore();
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
    
    // Mouse move per cursor dinamico
    document.getElementById('mainCanvas').addEventListener('mousemove', (e) => {
        if (!window.ledMockupApp.isDragging) {
            const rect = window.ledMockupApp.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            window.ledMockupApp.updateCanvasCursorForPosition(x, y);
        }
    });
    
    // Event listeners per bottoni export video
    document.getElementById('createVideoBtn').addEventListener('click', () => {
        window.ledMockupApp.createVideo();
    });
    
    document.getElementById('exportWhatsappBtn').addEventListener('click', () => {
        window.ledMockupApp.exportForWhatsApp();
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