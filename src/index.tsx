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

// Main application route
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LED Mockup Pro - Simulazione Video LED Outdoor</title>
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
                        LED Mockup Pro
                    </h1>
                    <div class="flex gap-2">
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
                        <!-- Corner pin points will be added dynamically -->
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
                                🎬 Crea Video MP4
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

export default app