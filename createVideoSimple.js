/**
 * VERSIONE SEMPLIFICATA DI createVideo() 
 * - Genera frame singolarmente
 * - Crea un video direttamente dai frame
 */

async function createVideoSimple() {
    if (!this.backgroundImage) {
        alert('Carica prima una foto di sfondo');
        return;
    }

    const useDemo = !this.videoElement;
    if (!useDemo && !this.videoFullyLoaded) {
        alert('Il video si sta ancora caricando. Attendi che sia completamente caricato prima di esportare.');
        return;
    }

    try {
        // Mostra pannello di progress
        const exportPanel = document.getElementById('exportPanel');
        const exportStatus = document.getElementById('exportStatus');
        const exportProgress = document.getElementById('exportProgress');
        
        exportPanel.style.display = 'block';
        exportStatus.textContent = 'Inizializzazione rendering video...';
        exportProgress.style.width = '0%';

        console.log('🎬 VERSIONE SEMPLIFICATA - Inizio creazione video...');

        // Parametri video
        const videoDurationReal = useDemo ? 5 : this.videoElement.duration;
        const fps = 25;
        const totalFrames = Math.ceil(videoDurationReal * fps);
        
        console.log('📊 Parametri:', {
            duration: `${videoDurationReal}s`,
            fps: fps,
            frames: totalFrames
        });

        // Crea canvas per rendering
        const renderCanvas = document.createElement('canvas');
        const renderCtx = renderCanvas.getContext('2d');
        renderCanvas.width = 1920;
        renderCanvas.height = 1080;

        // Array per salvare frame
        const frames = [];
        
        // Renderizza tutti i frame
        for (let i = 0; i < totalFrames; i++) {
            const currentTime = i / fps;
            
            // Non superare durata video
            if (currentTime >= videoDurationReal) break;
            
            // Se c'è video, posizionalo al tempo corrente
            if (!useDemo && this.videoElement) {
                this.videoElement.currentTime = currentTime;
                
                // Aspetta che il video si posizioni
                await new Promise(resolve => {
                    const onSeeked = () => {
                        this.videoElement.removeEventListener('seeked', onSeeked);
                        resolve();
                    };
                    this.videoElement.addEventListener('seeked', onSeeked);
                    setTimeout(resolve, 50); // Timeout fallback
                });
            }
            
            // Renderizza frame composito
            this.renderVideoFrame(renderCtx, renderCanvas.width, renderCanvas.height);
            
            // Salva frame come immagine
            const frameImageData = renderCanvas.toDataURL('image/jpeg', 0.9);
            frames.push(frameImageData);
            
            // Aggiorna progress
            const progress = (i / totalFrames) * 80; // 0% -> 80%
            exportProgress.style.width = `${progress}%`;
            exportStatus.textContent = `Frame ${i + 1}/${totalFrames} (${currentTime.toFixed(1)}s)`;
            
            // Log ogni secondo
            if (i % fps === 0) {
                console.log(`📸 Secondo ${Math.floor(i / fps)}: ${frames.length} frames catturati`);
            }
            
            // Pausa per UI
            if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }

        exportStatus.textContent = 'Creazione video finale...';
        exportProgress.style.width = '90%';

        // Crea video da frame usando MediaRecorder su canvas animato
        const videoStream = renderCanvas.captureStream(fps);
        const recorder = new MediaRecorder(videoStream, { videoBitsPerSecond: 4000000 });
        const chunks = [];
        
        recorder.ondataavailable = e => chunks.push(e.data);
        
        const recordingPromise = new Promise(resolve => {
            recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
        });
        
        recorder.start();
        
        // Anima i frame sul canvas alla velocità corretta
        let frameIndex = 0;
        const animateFrames = () => {
            if (frameIndex >= frames.length) {
                // Fine animazione
                setTimeout(() => recorder.stop(), 100);
                return;
            }
            
            // Disegna frame corrente
            const img = new Image();
            img.onload = () => {
                renderCtx.clearRect(0, 0, renderCanvas.width, renderCanvas.height);
                renderCtx.drawImage(img, 0, 0);
                frameIndex++;
                
                // Prossimo frame dopo 1/fps secondi
                setTimeout(animateFrames, 1000 / fps);
            };
            img.src = frames[frameIndex];
        };
        
        animateFrames();
        
        // Aspetta completamento
        const videoBlob = await recordingPromise;
        
        exportStatus.textContent = 'Download video...';
        exportProgress.style.width = '100%';
        
        // Scarica video
        const url = URL.createObjectURL(videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `led-mockup-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log('✅ Video esportato:', {
            frames: frames.length,
            duration: `${(frames.length / fps).toFixed(2)}s`,
            size: `${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`
        });
        
        // Nascondi pannello
        setTimeout(() => {
            exportPanel.style.display = 'none';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Errore export video:', error);
        alert('Errore durante l\'export del video: ' + error.message);
    }
}