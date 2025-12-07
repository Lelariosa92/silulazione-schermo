import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// Enable CORS for all routes
app.use('*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// Serve test files from public root (for debugging)
app.use('/test-*', serveStatic({ root: './public' }))

// Serve test HTML files from project root (for debugging)
app.get('/test_drag.html', serveStatic({ root: './' }))
app.get('/test_all_controls.html', serveStatic({ root: './' }))

// API routes for project management
app.post('/api/project/save', async (c) => {
  const projectData = await c.req.json()
  
  // In a real app, save to Cloudflare KV or D1
  return c.json({ 
    success: true, 
    message: 'Progetto salvato con successo',
    id: 'project_' + Date.now()
  })
})

app.get('/api/project/:id', async (c) => {
  const id = c.req.param('id')
  
  // In a real app, retrieve from storage
  return c.json({ 
    success: true,
    project: null,
    message: 'Progetto non trovato'
  })
})

// ========================================
// V1 - VERSIONE LEGACY (ORIGINALE)
// ========================================
app.get('/v1', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LED Mockup Pro V1 - Versione Legacy</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            /* Stili critici per il canvas */
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            #mainCanvas {
                border-radius: 8px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                background: #f8fafc;
                border: 2px solid #e5e7eb;
            }
        </style>
        <style>
            .canvas-container {
                position: relative;
                border: 2px solid #e5e7eb;
                background: #f9fafb;
                cursor: crosshair;
            }
            
            .toolbar {
                background: #374151;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 16px;
            }
            
            .tool-btn {
                background: #6b7280;
                color: white;
                border: none;
                padding: 8px 12px;
                margin: 2px;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .tool-btn:hover {
                background: #9ca3af;
            }
            
            .tool-btn.active {
                background: #3b82f6;
            }
            
            .panel {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
            }
            
            .corner-pin-point {
                position: absolute;
                width: 12px;
                height: 12px;
                background: #ef4444;
                border: 2px solid white;
                border-radius: 50%;
                cursor: grab;
                transform: translate(-50%, -50%);
                z-index: 10;
            }
            
            .corner-pin-point:active {
                cursor: grabbing;
            }
            
            .progress-bar {
                width: 100%;
                height: 6px;
                background: #e5e7eb;
                border-radius: 3px;
                overflow: hidden;
                margin: 8px 0;
            }
            
            .progress-fill {
                height: 100%;
                background: #10b981;
                transition: width 0.3s ease;
            }
            
            .qc-frame {
                border: 2px solid #10b981;
                margin: 4px;
                display: inline-block;
            }
            
            .qc-failed {
                border-color: #ef4444;
            }
        </style>
    </head>
    <body class="bg-gray-100">
        <!-- Header -->
        <header class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-4">
                    <h1 class="text-2xl font-bold text-gray-900">
                        <i class="fas fa-video text-blue-600 mr-2"></i>
                        LED Mockup Pro <span class="text-sm text-gray-500">(V1 Legacy)</span>
                    </h1>
                    <div class="flex gap-2">
                        <a href="/" class="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm">
                            <i class="fas fa-arrow-right mr-2"></i>
                            Vai a V2 (Nuova)
                        </a>
                        <button id="exportBtn" class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors">
                            <i class="fas fa-download mr-2"></i>
                            Esporta per WhatsApp (HD)
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div class="grid grid-cols-12 gap-6">
                <!-- Main Canvas Area -->
                <div class="col-span-8">
                    <!-- Toolbar -->
                    <div class="toolbar">
                        <div class="flex flex-wrap gap-2">
                            <button class="tool-btn active" data-tool="select">
                                <i class="fas fa-mouse-pointer"></i> Seleziona
                            </button>
                            <button class="tool-btn" data-tool="move">
                                <i class="fas fa-arrows-alt"></i> Sposta
                            </button>
                            <button class="tool-btn" data-tool="scale" id="scaleBtn">
                                <i class="fas fa-expand-arrows-alt"></i> Scala
                            </button>
                            <button class="tool-btn" data-tool="rotate">
                                <i class="fas fa-undo"></i> Ruota
                            </button>
                            <button class="tool-btn" data-tool="corner-pin">
                                <i class="fas fa-vector-square"></i> Corner-Pin
                            </button>
                            <div class="border-l border-gray-500 mx-2"></div>
                            <button class="tool-btn" data-tool="reset">
                                <i class="fas fa-refresh"></i> Reset
                            </button>
                            <button class="tool-btn" data-tool="fit">
                                <i class="fas fa-compress"></i> Fit
                            </button>
                            <button class="tool-btn" id="lockBackgroundBtn">
                                <i class="fas fa-lock"></i> Blocca Sfondo
                            </button>
                            <div class="border-l border-gray-500 mx-2"></div>
                            <button class="tool-btn" id="gridBtn">
                                <i class="fas fa-th"></i> Griglia
                            </button>
                            <button class="tool-btn" id="snapBtn">
                                <i class="fas fa-magnet"></i> Snap
                            </button>
                        </div>
                    </div>

                    <!-- Canvas Container -->
                    <div class="canvas-container" style="width: 100%; min-height: 400px; height: 60vh; display: flex; justify-content: center; align-items: center;">
                        <canvas id="mainCanvas" width="800" height="500" style="max-width: 100%; max-height: 100%; border: 2px solid #e5e7eb; background: #f9fafb;"></canvas>
                    </div>

                    <!-- File Import Controls -->
                    <div class="mt-4 flex gap-4">
                        <div class="flex gap-2">
                            <label for="backgroundFile" class="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-700">
                                <i class="fas fa-image mr-2"></i>
                                Importa Foto Sfondo
                            </label>
                            <input type="file" id="backgroundFile" class="hidden" accept="image/*">
                            
                            <button id="testBackgroundBtn" class="bg-orange-600 text-white px-3 py-2 rounded hover:bg-orange-700 text-sm">
                                <i class="fas fa-test-tube mr-1"></i>
                                Test Sfondo
                            </button>
                        </div>
                        <div>
                            <label for="videoFile" class="bg-purple-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-purple-700">
                                <i class="fas fa-video mr-2"></i>
                                Importa Video Overlay
                            </label>
                            <input type="file" id="videoFile" class="hidden" accept="video/*">
                        </div>
                    </div>
                </div>

                <!-- Right Sidebar -->
                <div class="col-span-4">
                    <!-- Background Panel -->
                    <div class="panel">
                        <h3 class="font-semibold text-gray-800 mb-3">
                            <i class="fas fa-image mr-2"></i>
                            Controllo Sfondo
                        </h3>
                        <div class="space-y-3">
                            <div class="flex gap-2">
                                <button id="panBtn" class="flex-1 bg-gray-600 text-white py-1 px-2 rounded text-sm">Pan</button>
                                <button id="zoomBtn" class="flex-1 bg-gray-600 text-white py-1 px-2 rounded text-sm">Zoom</button>
                                <button id="rotateBtn" class="flex-1 bg-gray-600 text-white py-1 px-2 rounded text-sm">Ruota</button>
                            </div>
                            <div>
                                <label class="block text-sm text-gray-600 mb-1">Correzione Prospettiva</label>
                                <input type="range" id="perspectiveSlider" class="w-full" min="-50" max="50" value="0">
                            </div>
                            <div class="text-sm text-gray-600">
                                <div>Dimensioni: <span id="backgroundDimensions">-</span></div>
                                <div>Zoom: <span id="zoomLevel">100%</span></div>
                            </div>
                        </div>
                    </div>

                    <!-- Video Overlay Panel -->
                    <div class="panel">
                        <h3 class="font-semibold text-gray-800 mb-3">
                            <i class="fas fa-video mr-2"></i>
                            Controllo Video Overlay
                        </h3>
                        <div class="space-y-3">
                            <div class="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <label class="block text-gray-600">Larghezza (px):</label>
                                    <input type="number" id="videoWidth" class="w-full border rounded px-2 py-1" value="0" readonly>
                                </div>
                                <div>
                                    <label class="block text-gray-600">Altezza (px):</label>
                                    <input type="number" id="videoHeight" class="w-full border rounded px-2 py-1" value="0" readonly>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <label class="block text-gray-600 font-semibold">Pos X:</label>
                                    <input type="number" id="videoPosX" class="w-full border rounded px-2 py-1" value="0" step="1"
                                           oninput="window.ledMockupApp?.updateVideoTransform()"
                                           onchange="window.ledMockupApp?.updateVideoTransform()">
                                </div>
                                <div>
                                    <label class="block text-gray-600 font-semibold">Pos Y:</label>
                                    <input type="number" id="videoPosY" class="w-full border rounded px-2 py-1" value="0" step="1"
                                           oninput="window.ledMockupApp?.updateVideoTransform()"
                                           onchange="window.ledMockupApp?.updateVideoTransform()">
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <label class="block text-gray-600 font-semibold">Scala X (%):</label>
                                    <input type="range" id="videoScaleX" class="w-full" min="0.1" max="5" step="0.05" value="1"
                                           oninput="window.ledMockupApp?.updateVideoTransform()">
                                    <span id="videoScaleXValue" class="text-xs">100%</span>
                                </div>
                                <div>
                                    <label class="block text-gray-600 font-semibold">Scala Y (%):</label>
                                    <input type="range" id="videoScaleY" class="w-full" min="0.1" max="5" step="0.05" value="1"
                                           oninput="window.ledMockupApp?.updateVideoTransform()">
                                    <span id="videoScaleYValue" class="text-xs">100%</span>
                                </div>
                            </div>

                            <div class="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                    <label class="block text-gray-600">Inclinazione X:</label>
                                    <input type="range" id="videoSkewX" class="w-full" min="-45" max="45" step="1" value="0">
                                    <span id="videoSkewXValue">0°</span>
                                </div>
                                <div>
                                    <label class="block text-gray-600">Inclinazione Y:</label>
                                    <input type="range" id="videoSkewY" class="w-full" min="-45" max="45" step="1" value="0">
                                    <span id="videoSkewYValue">0°</span>
                                </div>
                                <div>
                                    <label class="block text-gray-600">Prospettiva:</label>
                                    <input type="range" id="videoPerspective" class="w-full" min="-50" max="50" step="1" value="0">
                                    <span id="videoPerspectiveValue">0</span>
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-gray-600 text-sm">Rotazione (°):</label>
                                <input type="range" id="rotationSlider" class="w-full" min="0" max="360" value="0">
                                <span id="rotationValue">0°</span>
                            </div>

                            <div class="flex gap-1">
                                <button id="centerVideoBtn" class="flex-1 bg-gray-600 text-white py-1 px-1 rounded text-xs">
                                    <i class="fas fa-crosshairs"></i>
                                </button>
                                <button id="fitVideoBtn" class="flex-1 bg-gray-600 text-white py-1 px-1 rounded text-xs">
                                    <i class="fas fa-expand-arrows-alt"></i>
                                </button>
                                <button id="resetVideoBtn" class="flex-1 bg-gray-600 text-white py-1 px-1 rounded text-xs">
                                    <i class="fas fa-undo"></i>
                                </button>
                                <button id="flipHorizontalBtn" class="flex-1 bg-purple-600 text-white py-1 px-1 rounded text-xs">
                                    <i class="fas fa-arrows-alt-h"></i>
                                </button>
                                <button id="flipVerticalBtn" class="flex-1 bg-purple-600 text-white py-1 px-1 rounded text-xs">
                                    <i class="fas fa-arrows-alt-v"></i>
                                </button>
                            </div>

                            <div class="text-xs text-gray-600 mt-2">
                                <div class="flex justify-between">
                                    <span>Modalità:</span>
                                    <select id="transformMode" class="text-xs border rounded px-1">
                                        <option value="free">Libera</option>
                                        <option value="corner-pin">Corner-Pin</option>
                                        <option value="perspective">Prospettiva 3D</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label class="block text-gray-600 text-sm mb-2">Coordinate Vertici (px foto):</label>
                                <div class="grid grid-cols-2 gap-1 text-xs">
                                    <div>
                                        <label>TL:</label>
                                        <input type="text" id="vertex1" class="w-full border rounded px-1" placeholder="0,0" readonly>
                                    </div>
                                    <div>
                                        <label>TR:</label>
                                        <input type="text" id="vertex2" class="w-full border rounded px-1" placeholder="0,0" readonly>
                                    </div>
                                    <div>
                                        <label>BR:</label>
                                        <input type="text" id="vertex3" class="w-full border rounded px-1" placeholder="0,0" readonly>
                                    </div>
                                    <div>
                                        <label>BL:</label>
                                        <input type="text" id="vertex4" class="w-full border rounded px-1" placeholder="0,0" readonly>
                                    </div>
                                </div>
                            </div>

                            <button id="copyMatrixBtn" class="w-full bg-indigo-600 text-white py-2 px-3 rounded text-sm hover:bg-indigo-700">
                                <i class="fas fa-copy mr-2"></i>
                                Copia Matrice 3×3
                            </button>

                            <button id="testVideoBtn" class="w-full bg-purple-600 text-white py-2 px-3 rounded text-sm hover:bg-purple-700">
                                <i class="fas fa-play mr-2"></i>
                                Test Video Rendering
                            </button>

                            <button id="debugVideoBtn" class="w-full bg-orange-600 text-white py-2 px-3 rounded text-sm hover:bg-orange-700">
                                <i class="fas fa-bug mr-2"></i>
                                Debug Video
                            </button>

                            <button id="diagnosticBtn" class="w-full bg-gray-600 text-white py-2 px-3 rounded text-sm hover:bg-gray-700" style="display: none;">
                                <i class="fas fa-stethoscope mr-2"></i>
                                Diagnosi Sistema
                            </button>

                            <div class="text-xs text-gray-600">
                                <div>FPS: <span id="videoFPS">-</span></div>
                                <div>Durata: <span id="videoDuration">-</span></div>
                            </div>
                        </div>
                    </div>

                    <!-- Project Management Panel -->
                    <div class="panel">
                        <h3 class="font-semibold text-gray-800 mb-3">
                            <i class="fas fa-project-diagram mr-2"></i>
                            Gestione Progetto
                        </h3>
                        <div class="space-y-2">
                            <button id="exportJsonBtn" class="w-full bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700">
                                <i class="fas fa-download mr-2"></i>
                                Esporta JSON
                            </button>
                            <div>
                                <label for="importJsonFile" class="w-full bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 cursor-pointer block text-center">
                                    <i class="fas fa-upload mr-2"></i>
                                    Importa JSON
                                </label>
                                <input type="file" id="importJsonFile" class="hidden" accept=".json">
                            </div>
                        </div>
                    </div>

                    <!-- Video Export Panel -->
                    <div class="panel">
                        <h3 class="font-semibold text-gray-800 mb-3">
                            <i class="fas fa-video mr-2"></i>
                            Export Video
                        </h3>
                        <div class="space-y-2">
                            <button id="createVideoBtn" class="w-full bg-red-600 text-white py-2 px-3 rounded text-sm hover:bg-red-700 font-semibold">
                                <i class="fas fa-film mr-2"></i>
                                Crea Video MP4
                            </button>
                            
                            <button id="exportWhatsappBtn" class="w-full bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700">
                                <i class="fab fa-whatsapp mr-2"></i>
                                Export per WhatsApp (HD)
                            </button>
                            
                            <div class="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                                <div class="font-medium mb-1">Specifiche Export:</div>
                                <div>• Risoluzione: Max 1920×1080</div>
                                <div>• Codec: H.264 + AAC</div>
                                <div>• Bitrate: 3-5 Mbps</div>
                                <div>• Limite: 16MB (WhatsApp)</div>
                            </div>
                        </div>
                    </div>

                    <!-- Export Progress Panel -->
                    <div class="panel" id="exportPanel" style="display: none;">
                        <h3 class="font-semibold text-gray-800 mb-3">
                            <i class="fas fa-cogs mr-2"></i>
                            Export in corso...
                        </h3>
                        <div class="progress-bar">
                            <div class="progress-fill" id="exportProgress" style="width: 0%;"></div>
                        </div>
                        <div class="text-sm text-gray-600 text-center" id="exportStatus">
                            Inizializzazione...
                        </div>
                    </div>

                    <!-- Quality Control Panel -->
                    <div class="panel" id="qcPanel" style="display: none;">
                        <h3 class="font-semibold text-gray-800 mb-3">
                            <i class="fas fa-check-circle mr-2"></i>
                            Quality Control (QC)
                        </h3>
                        <div id="qcResults"></div>
                        <div class="text-sm text-gray-600 mt-2">
                            <div>Errore Vertici: <span id="qcVertexError">-</span> px</div>
                            <div>SSIM Score: <span id="qcSSIM">-</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Canvas inizializzazione immediata -->
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            const canvas = document.getElementById('mainCanvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                
                // Disegna pattern di sfondo immediatamente
                const squareSize = 20;
                const lightColor = '#f8fafc';
                const darkColor = '#e2e8f0';
                
                for (let x = 0; x < canvas.width; x += squareSize) {
                    for (let y = 0; y < canvas.height; y += squareSize) {
                        const isEven = (Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0;
                        ctx.fillStyle = isEven ? lightColor : darkColor;
                        ctx.fillRect(x, y, squareSize, squareSize);
                    }
                }
                
                // Testo istruzioni
                ctx.fillStyle = '#6b7280';
                ctx.font = '16px -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(
                    'Canvas LED Mockup Caricato',
                    canvas.width / 2,
                    canvas.height / 2 - 10
                );
                
                ctx.font = '14px -apple-system, sans-serif';
                ctx.fillStyle = '#9ca3af';
                ctx.fillText(
                    'Carica una foto di sfondo per iniziare',
                    canvas.width / 2,
                    canvas.height / 2 + 15
                );
                
                console.log('✅ Canvas inizializzato con pattern di sfondo');
            }
        });
        </script>
        
        <!-- JavaScript Libraries -->
        <script src="/static/math-utils.js"></script>
        <script src="/static/video-export.js"></script>
        <script src="/static/demo-helper.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

// ========================================
// V2 - VERSIONE NUOVA OTTIMIZZATA PER CHROME
// ========================================
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LED Mockup Pro V2 - Ottimizzato Chrome</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
            :root {
                --primary: #3b82f6;
                --primary-dark: #2563eb;
                --success: #10b981;
                --warning: #f59e0b;
                --danger: #ef4444;
                --bg-dark: #1f2937;
                --bg-light: #f8fafc;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
                min-height: 100vh;
            }
            
            /* Canvas optimizations for Chrome */
            #mainCanvas {
                border-radius: 12px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
                will-change: transform;
                transform: translateZ(0);
            }
            
            .canvas-container {
                position: relative;
                background: linear-gradient(45deg, #374151 25%, transparent 25%),
                            linear-gradient(-45deg, #374151 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #374151 75%),
                            linear-gradient(-45deg, transparent 75%, #374151 75%);
                background-size: 20px 20px;
                background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
                background-color: #4b5563;
                border-radius: 16px;
                padding: 20px;
            }
            
            /* Modern panel design */
            .panel-modern {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 16px;
                padding: 20px;
                margin-bottom: 16px;
                box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .panel-header {
                display: flex;
                align-items: center;
                gap: 10px;
                padding-bottom: 12px;
                border-bottom: 2px solid #e5e7eb;
                margin-bottom: 16px;
            }
            
            .panel-header i {
                font-size: 1.25rem;
                color: var(--primary);
            }
            
            .panel-header h3 {
                font-weight: 700;
                font-size: 1rem;
                color: #1f2937;
            }
            
            /* Simplified toolbar */
            .toolbar-modern {
                background: rgba(31, 41, 55, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                padding: 12px 16px;
                margin-bottom: 16px;
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                align-items: center;
            }
            
            .tool-group {
                display: flex;
                gap: 4px;
                padding: 4px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px;
            }
            
            .tool-btn-v2 {
                background: transparent;
                color: #9ca3af;
                border: none;
                padding: 10px 14px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.875rem;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .tool-btn-v2:hover {
                background: rgba(255, 255, 255, 0.15);
                color: white;
            }
            
            .tool-btn-v2.active {
                background: var(--primary);
                color: white;
            }
            
            /* Modern range inputs */
            .range-modern {
                -webkit-appearance: none;
                width: 100%;
                height: 6px;
                border-radius: 3px;
                background: #e5e7eb;
                outline: none;
            }
            
            .range-modern::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: var(--primary);
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
                transition: transform 0.2s;
            }
            
            .range-modern::-webkit-slider-thumb:hover {
                transform: scale(1.2);
            }
            
            /* Control groups */
            .control-group {
                background: #f1f5f9;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 12px;
            }
            
            .control-group-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            
            .control-group-title {
                font-weight: 600;
                color: #374151;
                font-size: 0.875rem;
            }
            
            /* Quick action buttons */
            .quick-actions {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
            }
            
            .quick-btn {
                background: white;
                border: 2px solid #e5e7eb;
                border-radius: 10px;
                padding: 12px 8px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }
            
            .quick-btn:hover {
                border-color: var(--primary);
                background: #eff6ff;
            }
            
            .quick-btn.active {
                border-color: var(--primary);
                background: var(--primary);
                color: white;
            }
            
            .quick-btn i {
                font-size: 1.25rem;
            }
            
            .quick-btn span {
                font-size: 0.7rem;
                font-weight: 500;
            }
            
            /* Modern buttons */
            .btn-primary {
                background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 10px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
            }
            
            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px -10px rgba(59, 130, 246, 0.5);
            }
            
            .btn-success {
                background: linear-gradient(135deg, var(--success) 0%, #059669 100%);
            }
            
            .btn-success:hover {
                box-shadow: 0 10px 20px -10px rgba(16, 185, 129, 0.5);
            }
            
            /* Import buttons */
            .import-zone {
                border: 3px dashed #cbd5e1;
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s;
                background: #f8fafc;
            }
            
            .import-zone:hover {
                border-color: var(--primary);
                background: #eff6ff;
            }
            
            .import-zone i {
                font-size: 2rem;
                margin-bottom: 8px;
            }
            
            /* Progress bar */
            .progress-modern {
                height: 8px;
                background: #e5e7eb;
                border-radius: 4px;
                overflow: hidden;
            }
            
            .progress-modern-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--primary) 0%, var(--success) 100%);
                border-radius: 4px;
                transition: width 0.3s ease;
            }
            
            /* Value display */
            .value-display {
                font-family: 'SF Mono', 'Consolas', monospace;
                background: #1f2937;
                color: #10b981;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 0.75rem;
                font-weight: 600;
            }
            
            /* Responsive grid */
            @media (max-width: 1024px) {
                .main-grid {
                    grid-template-columns: 1fr !important;
                }
            }
            
            /* Animations */
            @keyframes pulse-glow {
                0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
                50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
            }
            
            .recording {
                animation: pulse-glow 1.5s infinite;
            }
        </style>
    </head>
    <body>
        <!-- Header -->
        <header class="bg-gray-900/80 backdrop-blur-lg border-b border-gray-700 sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center gap-4">
                        <h1 class="text-2xl font-bold text-white flex items-center gap-3">
                            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <i class="fas fa-tv text-white"></i>
                            </div>
                            LED Mockup Pro
                            <span class="text-xs bg-green-500 text-white px-2 py-1 rounded-full">V2</span>
                        </h1>
                    </div>
                    <div class="flex gap-3">
                        <a href="/v1" class="bg-gray-700 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm flex items-center gap-2">
                            <i class="fas fa-history"></i>
                            Versione Legacy (V1)
                        </a>
                        <button id="exportBtnMain" class="btn-success">
                            <i class="fab fa-whatsapp"></i>
                            Esporta WhatsApp
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div class="main-grid grid grid-cols-12 gap-6">
                
                <!-- Main Canvas Area -->
                <div class="col-span-8">
                    <!-- Simplified Toolbar -->
                    <div class="toolbar-modern">
                        <div class="tool-group">
                            <button class="tool-btn-v2 active" data-tool="move" title="Sposta (M)">
                                <i class="fas fa-arrows-alt"></i>
                                <span>Sposta</span>
                            </button>
                            <button class="tool-btn-v2" data-tool="scale" title="Scala (S)">
                                <i class="fas fa-expand"></i>
                                <span>Scala</span>
                            </button>
                            <button class="tool-btn-v2" data-tool="rotate" title="Ruota (R)">
                                <i class="fas fa-redo"></i>
                                <span>Ruota</span>
                            </button>
                        </div>
                        
                        <div class="tool-group">
                            <button class="tool-btn-v2" data-tool="corner-pin" title="Corner Pin (C)">
                                <i class="fas fa-vector-square"></i>
                                <span>Prospettiva</span>
                            </button>
                        </div>
                        
                        <div class="flex-1"></div>
                        
                        <div class="tool-group">
                            <button class="tool-btn-v2" id="resetAllBtn" title="Reset (0)">
                                <i class="fas fa-undo"></i>
                            </button>
                            <button class="tool-btn-v2" id="fitAllBtn" title="Adatta">
                                <i class="fas fa-compress-arrows-alt"></i>
                            </button>
                            <button class="tool-btn-v2" id="gridBtnV2" title="Griglia (G)">
                                <i class="fas fa-th"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Canvas Container -->
                    <div class="canvas-container">
                        <canvas id="mainCanvas" width="900" height="550"></canvas>
                    </div>

                    <!-- Import Zone -->
                    <div class="grid grid-cols-2 gap-4 mt-4">
                        <label class="import-zone cursor-pointer block">
                            <input type="file" id="backgroundFile" class="hidden" accept="image/*">
                            <i class="fas fa-image text-blue-500"></i>
                            <div class="font-semibold text-gray-700">Carica Sfondo</div>
                            <div class="text-xs text-gray-500">JPG, PNG, WebP</div>
                        </label>
                        <label class="import-zone cursor-pointer block">
                            <input type="file" id="videoFile" class="hidden" accept="video/*">
                            <i class="fas fa-video text-purple-500"></i>
                            <div class="font-semibold text-gray-700">Carica Video</div>
                            <div class="text-xs text-gray-500">MP4, WebM, MOV</div>
                        </label>
                    </div>
                    
                    <!-- Quick test button -->
                    <button id="testBackgroundBtn" class="mt-3 w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition text-sm">
                        <i class="fas fa-flask mr-2"></i>
                        Carica Demo (Test Rapido)
                    </button>
                </div>

                <!-- Right Sidebar - Simplified -->
                <div class="col-span-4 space-y-4">
                    
                    <!-- SFONDO - Controlli Semplificati -->
                    <div class="panel-modern">
                        <div class="panel-header">
                            <i class="fas fa-image"></i>
                            <h3>Sfondo</h3>
                            <div class="flex-1"></div>
                            <button id="lockBackgroundBtn" class="text-gray-400 hover:text-blue-500 transition">
                                <i class="fas fa-unlock"></i>
                            </button>
                        </div>
                        
                        <div class="control-group">
                            <div class="control-group-header">
                                <span class="control-group-title">Zoom</span>
                                <span class="value-display" id="zoomLevel">100%</span>
                            </div>
                            <input type="range" class="range-modern" id="bgZoomSlider" min="10" max="300" value="100">
                        </div>
                        
                        <div class="grid grid-cols-2 gap-3 text-sm text-gray-600">
                            <div>Dimensioni: <span id="backgroundDimensions" class="font-mono">-</span></div>
                        </div>
                    </div>

                    <!-- VIDEO - Controlli Semplificati -->
                    <div class="panel-modern">
                        <div class="panel-header">
                            <i class="fas fa-film"></i>
                            <h3>Video Overlay</h3>
                        </div>
                        
                        <!-- Quick Actions -->
                        <div class="quick-actions mb-4">
                            <button class="quick-btn" id="centerVideoBtn" title="Centra">
                                <i class="fas fa-crosshairs text-blue-500"></i>
                                <span>Centra</span>
                            </button>
                            <button class="quick-btn" id="fitVideoBtn" title="Adatta">
                                <i class="fas fa-expand text-green-500"></i>
                                <span>Adatta</span>
                            </button>
                            <button class="quick-btn" id="flipHorizontalBtn" title="Flip H">
                                <i class="fas fa-arrows-alt-h text-purple-500"></i>
                                <span>Flip H</span>
                            </button>
                            <button class="quick-btn" id="flipVerticalBtn" title="Flip V">
                                <i class="fas fa-arrows-alt-v text-purple-500"></i>
                                <span>Flip V</span>
                            </button>
                        </div>
                        
                        <!-- Position Controls -->
                        <div class="control-group">
                            <div class="control-group-header">
                                <span class="control-group-title">Posizione</span>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="text-xs text-gray-500 block mb-1">X</label>
                                    <input type="number" id="videoPosX" class="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" value="0">
                                </div>
                                <div>
                                    <label class="text-xs text-gray-500 block mb-1">Y</label>
                                    <input type="number" id="videoPosY" class="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" value="0">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Scale Controls -->
                        <div class="control-group">
                            <div class="control-group-header">
                                <span class="control-group-title">Scala</span>
                                <label class="flex items-center gap-2 text-xs">
                                    <input type="checkbox" id="lockAspectRatio" checked class="rounded">
                                    Blocca proporzioni
                                </label>
                            </div>
                            <div class="space-y-3">
                                <div>
                                    <div class="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>Larghezza</span>
                                        <span class="value-display" id="videoScaleXValue">100%</span>
                                    </div>
                                    <input type="range" class="range-modern" id="videoScaleX" min="0.1" max="3" step="0.05" value="1">
                                </div>
                                <div>
                                    <div class="flex justify-between text-xs text-gray-500 mb-1">
                                        <span>Altezza</span>
                                        <span class="value-display" id="videoScaleYValue">100%</span>
                                    </div>
                                    <input type="range" class="range-modern" id="videoScaleY" min="0.1" max="3" step="0.05" value="1">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Rotation Control -->
                        <div class="control-group">
                            <div class="control-group-header">
                                <span class="control-group-title">Rotazione</span>
                                <span class="value-display" id="rotationValue">0°</span>
                            </div>
                            <input type="range" class="range-modern" id="rotationSlider" min="0" max="360" value="0">
                        </div>
                        
                        <!-- Advanced (Collapsed by default) -->
                        <details class="mt-3">
                            <summary class="cursor-pointer text-sm font-semibold text-gray-600 hover:text-blue-600">
                                <i class="fas fa-cog mr-2"></i>Controlli Avanzati
                            </summary>
                            <div class="mt-3 space-y-3 pt-3 border-t">
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="text-xs text-gray-500 block mb-1">Skew X</label>
                                        <input type="range" class="range-modern" id="videoSkewX" min="-45" max="45" value="0">
                                        <span class="text-xs text-gray-400" id="videoSkewXValue">0°</span>
                                    </div>
                                    <div>
                                        <label class="text-xs text-gray-500 block mb-1">Skew Y</label>
                                        <input type="range" class="range-modern" id="videoSkewY" min="-45" max="45" value="0">
                                        <span class="text-xs text-gray-400" id="videoSkewYValue">0°</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-500 block mb-1">Prospettiva 3D</label>
                                    <input type="range" class="range-modern" id="videoPerspective" min="-50" max="50" value="0">
                                    <span class="text-xs text-gray-400" id="videoPerspectiveValue">0</span>
                                </div>
                                
                                <div class="text-xs text-gray-500">
                                    <div class="flex justify-between">
                                        <span>Modalità:</span>
                                        <select id="transformMode" class="border rounded px-2 py-1">
                                            <option value="free">Libera</option>
                                            <option value="corner-pin">Corner-Pin</option>
                                            <option value="perspective">Prospettiva 3D</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <!-- Hidden inputs for compatibility -->
                                <input type="hidden" id="videoWidth" value="0">
                                <input type="hidden" id="videoHeight" value="0">
                                <input type="hidden" id="vertex1" value="0,0">
                                <input type="hidden" id="vertex2" value="0,0">
                                <input type="hidden" id="vertex3" value="0,0">
                                <input type="hidden" id="vertex4" value="0,0">
                                <input type="hidden" id="perspectiveSlider" value="0">
                            </div>
                        </details>
                        
                        <!-- Video Info -->
                        <div class="mt-3 text-xs text-gray-500 flex justify-between">
                            <span>FPS: <span id="videoFPS">-</span></span>
                            <span>Durata: <span id="videoDuration">-</span></span>
                        </div>
                    </div>

                    <!-- EXPORT - Semplificato -->
                    <div class="panel-modern">
                        <div class="panel-header">
                            <i class="fas fa-download"></i>
                            <h3>Esporta</h3>
                        </div>
                        
                        <button id="createVideoBtn" class="btn-primary mb-3">
                            <i class="fas fa-film"></i>
                            Crea Video MP4
                        </button>
                        
                        <button id="exportWhatsappBtn" class="btn-success mb-3">
                            <i class="fab fa-whatsapp"></i>
                            Export WhatsApp (HD)
                        </button>
                        
                        <div class="grid grid-cols-2 gap-2">
                            <button id="exportJsonBtn" class="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm hover:bg-gray-200 transition">
                                <i class="fas fa-download mr-1"></i>
                                Salva Progetto
                            </button>
                            <label class="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm hover:bg-gray-200 transition cursor-pointer text-center">
                                <input type="file" id="importJsonFile" class="hidden" accept=".json">
                                <i class="fas fa-upload mr-1"></i>
                                Carica Progetto
                            </label>
                        </div>
                        
                        <!-- Export Progress -->
                        <div id="exportPanel" class="mt-4 hidden">
                            <div class="text-sm text-gray-600 mb-2" id="exportStatus">Preparazione...</div>
                            <div class="progress-modern">
                                <div class="progress-modern-fill" id="exportProgress" style="width: 0%"></div>
                            </div>
                        </div>
                        
                        <!-- QC Panel -->
                        <div id="qcPanel" class="mt-4 hidden">
                            <div class="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                                <div id="qcResults"></div>
                                <div class="mt-2 flex justify-between">
                                    <span>Errore: <span id="qcVertexError">-</span>px</span>
                                    <span>SSIM: <span id="qcSSIM">-</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Keyboard Shortcuts -->
                    <div class="text-xs text-gray-400 text-center">
                        <span class="inline-flex items-center gap-1">
                            <kbd class="bg-gray-700 px-2 py-1 rounded">M</kbd> Sposta
                        </span>
                        <span class="inline-flex items-center gap-1 ml-2">
                            <kbd class="bg-gray-700 px-2 py-1 rounded">S</kbd> Scala
                        </span>
                        <span class="inline-flex items-center gap-1 ml-2">
                            <kbd class="bg-gray-700 px-2 py-1 rounded">R</kbd> Ruota
                        </span>
                        <span class="inline-flex items-center gap-1 ml-2">
                            <kbd class="bg-gray-700 px-2 py-1 rounded">0</kbd> Reset
                        </span>
                    </div>
                    
                    <!-- Hidden elements for compatibility with app.js -->
                    <div class="hidden">
                        <button id="testVideoBtn"></button>
                        <button id="debugVideoBtn"></button>
                        <button id="copyMatrixBtn"></button>
                        <button id="resetVideoBtn"></button>
                        <button id="exportBtn"></button>
                        <button id="panBtn"></button>
                        <button id="zoomBtn"></button>
                        <button id="rotateBtn"></button>
                        <button id="snapBtn"></button>
                        <button id="diagnosticBtn"></button>
                        <button id="gridBtn"></button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Canvas initialization -->
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            const canvas = document.getElementById('mainCanvas');
            if (canvas) {
                const ctx = canvas.getContext('2d', { 
                    alpha: false,
                    desynchronized: true // Chrome optimization
                });
                
                // GPU acceleration hint
                canvas.style.transform = 'translateZ(0)';
                
                // Draw initial pattern
                ctx.fillStyle = '#1f2937';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Centered text
                ctx.fillStyle = '#6b7280';
                ctx.font = '18px -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(
                    'Carica uno sfondo per iniziare',
                    canvas.width / 2,
                    canvas.height / 2 - 10
                );
                
                ctx.font = '14px -apple-system, sans-serif';
                ctx.fillStyle = '#4b5563';
                ctx.fillText(
                    'Trascina i file qui o usa i pulsanti qui sotto',
                    canvas.width / 2,
                    canvas.height / 2 + 15
                );
            }
            
            // V2 specific event handlers
            
            // Tool buttons
            document.querySelectorAll('.tool-btn-v2[data-tool]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tool = e.target.closest('.tool-btn-v2').dataset.tool;
                    
                    // Update UI
                    document.querySelectorAll('.tool-btn-v2[data-tool]').forEach(b => b.classList.remove('active'));
                    e.target.closest('.tool-btn-v2').classList.add('active');
                    
                    // Set tool in app
                    if (window.ledMockupApp) {
                        window.ledMockupApp.setActiveTool(tool);
                    }
                });
            });
            
            // Reset all button
            document.getElementById('resetAllBtn')?.addEventListener('click', () => {
                if (window.ledMockupApp) {
                    window.ledMockupApp.resetVideoTransform();
                    window.ledMockupApp.render();
                }
            });
            
            // Fit all button
            document.getElementById('fitAllBtn')?.addEventListener('click', () => {
                if (window.ledMockupApp) {
                    window.ledMockupApp.fitVideo();
                }
            });
            
            // Grid button V2
            document.getElementById('gridBtnV2')?.addEventListener('click', function() {
                this.classList.toggle('active');
                // Also toggle the hidden original grid button for compatibility
                document.getElementById('gridBtn')?.classList.toggle('active');
                if (window.ledMockupApp) {
                    window.ledMockupApp.render();
                }
            });
            
            // Zoom slider for background
            document.getElementById('bgZoomSlider')?.addEventListener('input', (e) => {
                const zoom = parseInt(e.target.value);
                document.getElementById('zoomLevel').textContent = zoom + '%';
                
                if (window.ledMockupApp && window.ledMockupApp.backgroundImage) {
                    window.ledMockupApp.backgroundTransform.scale = zoom / 100;
                    window.ledMockupApp.render();
                }
            });
            
            // Lock aspect ratio
            const lockAspectRatio = document.getElementById('lockAspectRatio');
            const scaleXInput = document.getElementById('videoScaleX');
            const scaleYInput = document.getElementById('videoScaleY');
            
            scaleXInput?.addEventListener('input', (e) => {
                if (lockAspectRatio?.checked) {
                    scaleYInput.value = e.target.value;
                    document.getElementById('videoScaleYValue').textContent = Math.round(e.target.value * 100) + '%';
                }
                document.getElementById('videoScaleXValue').textContent = Math.round(e.target.value * 100) + '%';
                window.ledMockupApp?.updateVideoTransform();
            });
            
            scaleYInput?.addEventListener('input', (e) => {
                if (lockAspectRatio?.checked) {
                    scaleXInput.value = e.target.value;
                    document.getElementById('videoScaleXValue').textContent = Math.round(e.target.value * 100) + '%';
                }
                document.getElementById('videoScaleYValue').textContent = Math.round(e.target.value * 100) + '%';
                window.ledMockupApp?.updateVideoTransform();
            });
            
            // Position inputs
            document.getElementById('videoPosX')?.addEventListener('input', () => {
                window.ledMockupApp?.updateVideoTransform();
            });
            document.getElementById('videoPosY')?.addEventListener('input', () => {
                window.ledMockupApp?.updateVideoTransform();
            });
            
            // Rotation slider
            document.getElementById('rotationSlider')?.addEventListener('input', (e) => {
                document.getElementById('rotationValue').textContent = e.target.value + '°';
                window.ledMockupApp?.updateVideoTransform();
            });
            
            // Advanced controls
            document.getElementById('videoSkewX')?.addEventListener('input', (e) => {
                document.getElementById('videoSkewXValue').textContent = e.target.value + '°';
                window.ledMockupApp?.updateVideoTransform();
            });
            
            document.getElementById('videoSkewY')?.addEventListener('input', (e) => {
                document.getElementById('videoSkewYValue').textContent = e.target.value + '°';
                window.ledMockupApp?.updateVideoTransform();
            });
            
            document.getElementById('videoPerspective')?.addEventListener('input', (e) => {
                document.getElementById('videoPerspectiveValue').textContent = e.target.value;
                window.ledMockupApp?.updateVideoTransform();
            });
            
            // Export button in header
            document.getElementById('exportBtnMain')?.addEventListener('click', () => {
                document.getElementById('exportWhatsappBtn')?.click();
            });
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                
                const keyMap = {
                    'm': 'move',
                    's': 'scale',
                    'r': 'rotate',
                    'c': 'corner-pin',
                    'g': () => document.getElementById('gridBtnV2')?.click()
                };
                
                const key = e.key.toLowerCase();
                if (keyMap[key]) {
                    if (typeof keyMap[key] === 'function') {
                        keyMap[key]();
                    } else {
                        const btn = document.querySelector(\`.tool-btn-v2[data-tool="\${keyMap[key]}"]\`);
                        btn?.click();
                    }
                }
            });
            
            console.log('✅ LED Mockup Pro V2 inizializzato');
        });
        </script>
        
        <!-- JavaScript Libraries -->
        <script src="/static/math-utils.js"></script>
        <script src="/static/video-export.js"></script>
        <script src="/static/demo-helper.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
