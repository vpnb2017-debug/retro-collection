/**
 * Barcode Scanner Service — RetroCollection v129
 * Uses native BarcodeDetector API (Chrome/Edge) with Quagga2 fallback.
 * Supports EAN-13 and UPC-A for physical game box scanning.
 * Includes intelligent lens selection (preventing telephoto zoom),
 * explicit 1x zoom constraints, zoom toggling, and torch support.
 */

export const barcodeScannerService = {
    stream: null,
    animFrameId: null,
    quaggaLoaded: false,
    currentTrack: null,
    currentZoom: 1,
    isTorchOn: false,

    async isSupported() {
        return ('BarcodeDetector' in window) || await this._loadQuagga();
    },

    async _loadQuagga() {
        if (this.quaggaLoaded) return true;
        if (typeof Quagga !== 'undefined') { this.quaggaLoaded = true; return true; }
        return new Promise(resolve => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/quagga/0.12.1/quagga.min.js';
            script.onload = () => { this.quaggaLoaded = true; resolve(true); };
            script.onerror = () => resolve(false);
            document.head.appendChild(script);
        });
    },

    async openScanner(onDetected) {
        // Stop any existing stream
        this.stopScanner();

        const overlay = document.createElement('div');
        overlay.id = 'barcode-overlay';
        overlay.style.cssText = `
            position:fixed; inset:0; z-index:9000; background:#000;
            display:flex; flex-direction:column; align-items:center; justify-content:space-between;
            padding:20px 15px 30px; box-sizing:border-box; overflow:hidden;
            font-family:'Outfit', -apple-system, sans-serif;
        `;
        overlay.innerHTML = `
            <!-- Top Controls Row -->
            <div style="width:100%; max-width:480px; display:flex; justify-content:space-between; align-items:center; z-index:10;">
                <div style="color:white; font-size:1rem; font-weight:700; display:flex; align-items:center; gap:8px;">
                    <span>📷</span> Leitor de Código
                </div>
                <div id="barcode-extra-controls" style="display:flex; gap:10px; align-items:center;">
                    <button id="barcode-torch-btn" style="display:none; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3); color:white; padding:8px 14px; border-radius:20px; font-size:0.85rem; font-weight:700; cursor:pointer; backdrop-filter:blur(5px);">🔦 Lanterna</button>
                    <button id="barcode-close-top" style="background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3); color:white; width:36px; height:36px; border-radius:50%; font-size:1.1rem; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
                </div>
            </div>

            <!-- Video Viewport -->
            <div style="position:relative; width:100%; max-width:480px; flex:1; display:flex; align-items:center; justify-content:center; margin:15px 0;">
                <video id="barcode-video" autoplay muted playsinline
                    style="width:100%; height:100%; max-height:65vh; object-fit:cover; border-radius:18px; display:block; background:#111;"></video>
                
                <!-- Target Frame with Scanning Laser -->
                <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none;">
                    <div style="position:relative; width:85%; height:130px; border:2px solid var(--accent-color, #ff9f0a); border-radius:16px; box-shadow:0 0 0 4000px rgba(0,0,0,0.55); overflow:hidden;">
                        <!-- Corner Markers -->
                        <div style="position:absolute; top:0; left:0; width:16px; height:16px; border-top:4px solid var(--accent-color, #ff9f0a); border-left:4px solid var(--accent-color, #ff9f0a);"></div>
                        <div style="position:absolute; top:0; right:0; width:16px; height:16px; border-top:4px solid var(--accent-color, #ff9f0a); border-right:4px solid var(--accent-color, #ff9f0a);"></div>
                        <div style="position:absolute; bottom:0; left:0; width:16px; height:16px; border-bottom:4px solid var(--accent-color, #ff9f0a); border-left:4px solid var(--accent-color, #ff9f0a);"></div>
                        <div style="position:absolute; bottom:0; right:0; width:16px; height:16px; border-bottom:4px solid var(--accent-color, #ff9f0a); border-right:4px solid var(--accent-color, #ff9f0a);"></div>
                        
                        <!-- Animated Scanning Laser Line -->
                        <div style="position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg, transparent, var(--accent-color, #ff9f0a), #ffffff, var(--accent-color, #ff9f0a), transparent); box-shadow:0 0 8px var(--accent-color, #ff9f0a); animation:scannerLaser 2s ease-in-out infinite;"></div>
                    </div>
                </div>

                <!-- Zoom Controls (1x / 2x) -->
                <div id="barcode-zoom-controls" style="position:absolute; bottom:20px; display:none; gap:10px; background:rgba(0,0,0,0.6); padding:6px 12px; border-radius:30px; backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.2);">
                    <button id="zoom-1x" class="zoom-btn active" style="background:var(--accent-color, #ff9f0a); color:white; border:none; padding:4px 12px; border-radius:15px; font-size:0.75rem; font-weight:800; cursor:pointer;">1x</button>
                    <button id="zoom-2x" class="zoom-btn" style="background:transparent; color:white; border:none; padding:4px 12px; border-radius:15px; font-size:0.75rem; font-weight:800; cursor:pointer;">2x</button>
                </div>

                <canvas id="barcode-canvas" style="display:none;"></canvas>
            </div>

            <!-- Bottom Information & Cancel -->
            <div style="width:100%; max-width:480px; display:flex; flex-direction:column; align-items:center; gap:8px;">
                <p style="color:var(--text-muted, #ffc978); font-size:0.85rem; text-align:center; margin:0; font-weight:600;">
                    Aponte a câmara para o código de barras (EAN/UPC) da caixa
                </p>
                <div id="barcode-status" style="color:#aaa; font-size:0.75rem;">A iniciar câmara...</div>
                <button id="barcode-close-bottom" style="
                    margin-top:10px; background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#fca5a5;
                    padding:12px 36px; border-radius:30px; font-weight:700; font-size:0.85rem; cursor:pointer; width:100%; max-width:280px;
                ">Cancelar ✕</button>
            </div>

            <!-- Laser Animation CSS -->
            <style>
                @keyframes scannerLaser {
                    0% { top: 0%; opacity: 0.2; }
                    50% { top: 100%; opacity: 1; }
                    100% { top: 0%; opacity: 0.2; }
                }
            </style>
        `;
        document.body.appendChild(overlay);

        const closeHandler = () => this.stopScanner();
        document.getElementById('barcode-close-top').onclick = closeHandler;
        document.getElementById('barcode-close-bottom').onclick = closeHandler;

        try {
            // Intelligent camera selection: Prefer standard wide-angle rear camera (prevent telephoto zoom)
            const constraints = await this._getOptimalCameraConstraints();
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            const video = document.getElementById('barcode-video');
            if (!video) return;
            video.srcObject = this.stream;
            await video.play();

            this.currentTrack = this.stream.getVideoTracks()[0];
            await this._configureTrackFeatures();

            const status = document.getElementById('barcode-status');
            if (status) status.textContent = 'Câmara ativa (1x). A procurar código...';

            if ('BarcodeDetector' in window) {
                await this._scanWithNativeAPI(onDetected);
            } else {
                await this._loadQuagga();
                await this._scanWithQuagga(onDetected);
            }
        } catch (err) {
            this.stopScanner();
            throw new Error('Não foi possível aceder à câmara: ' + err.message);
        }
    },

    async _getOptimalCameraConstraints() {
        let bestDeviceId = null;
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(d => d.kind === 'videoinput');
                
                // Filter rear cameras
                const backCameras = videoDevices.filter(d => {
                    const label = (d.label || '').toLowerCase();
                    return label.includes('back') || label.includes('rear') || label.includes('traseira') || label.includes('environment');
                });

                if (backCameras.length > 0) {
                    // Pick the standard wide camera (avoid telephoto, macro, depth, ultra-wide)
                    const standardBack = backCameras.find(d => {
                        const l = d.label.toLowerCase();
                        return !l.includes('tele') && !l.includes('macro') && !l.includes('2x') && !l.includes('3x') && !l.includes('5x') && !l.includes('wide') && !l.includes('ultra');
                    }) || backCameras[0];
                    
                    bestDeviceId = standardBack.deviceId;
                }
            }
        } catch (e) {
            console.warn('Device enumeration not supported or failed:', e);
        }

        const videoConstraint = {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 }
        };

        if (bestDeviceId) {
            videoConstraint.deviceId = { ideal: bestDeviceId };
        }

        return { video: videoConstraint };
    },

    async _configureTrackFeatures() {
        if (!this.currentTrack) return;
        const capabilities = this.currentTrack.getCapabilities ? this.currentTrack.getCapabilities() : {};

        // 1. Force Minimum Zoom 1.0x (Eliminate default lens zoom)
        if (capabilities.zoom) {
            const minZoom = capabilities.zoom.min || 1;
            this.currentZoom = minZoom;
            try {
                await this.currentTrack.applyConstraints({ advanced: [{ zoom: minZoom }] });
            } catch (e) { console.warn('Failed to set zoom 1x:', e); }

            // Show Zoom Controls if multiple zoom levels exist
            if (capabilities.zoom.max > minZoom) {
                const zoomCtrl = document.getElementById('barcode-zoom-controls');
                const btn1x = document.getElementById('zoom-1x');
                const btn2x = document.getElementById('zoom-2x');

                if (zoomCtrl && btn1x && btn2x) {
                    zoomCtrl.style.display = 'flex';
                    const target2x = Math.min(2, capabilities.zoom.max);

                    btn1x.onclick = async () => {
                        try {
                            await this.currentTrack.applyConstraints({ advanced: [{ zoom: minZoom }] });
                            this.currentZoom = minZoom;
                            btn1x.style.background = 'var(--accent-color, #ff9f0a)';
                            btn2x.style.background = 'transparent';
                        } catch (e) { }
                    };

                    btn2x.onclick = async () => {
                        try {
                            await this.currentTrack.applyConstraints({ advanced: [{ zoom: target2x }] });
                            this.currentZoom = target2x;
                            btn2x.style.background = 'var(--accent-color, #ff9f0a)';
                            btn1x.style.background = 'transparent';
                        } catch (e) { }
                    };
                }
            }
        }

        // 2. Torch / Flashlight Control
        if (capabilities.torch) {
            const torchBtn = document.getElementById('barcode-torch-btn');
            if (torchBtn) {
                torchBtn.style.display = 'block';
                this.isTorchOn = false;
                torchBtn.onclick = async () => {
                    this.isTorchOn = !this.isTorchOn;
                    try {
                        await this.currentTrack.applyConstraints({ advanced: [{ torch: this.isTorchOn }] });
                        torchBtn.style.background = this.isTorchOn ? 'var(--accent-color, #ff9f0a)' : 'rgba(255,255,255,0.15)';
                        torchBtn.style.color = this.isTorchOn ? '#000' : '#fff';
                    } catch (e) { console.warn('Torch toggle failed:', e); }
                };
            }
        }
    },

    async _scanWithNativeAPI(onDetected) {
        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'] });
        const video = document.getElementById('barcode-video');
        const scan = async () => {
            if (!document.getElementById('barcode-overlay')) return;
            try {
                if (video && video.readyState >= 2) {
                    const barcodes = await detector.detect(video);
                    if (barcodes && barcodes.length > 0) {
                        const code = barcodes[0].rawValue;
                        this.stopScanner();
                        await onDetected(code);
                        return;
                    }
                }
            } catch (e) { /* continue detection loop */ }
            this.animFrameId = requestAnimationFrame(scan);
        };
        this.animFrameId = requestAnimationFrame(scan);
    },

    async _scanWithQuagga(onDetected) {
        const video = document.getElementById('barcode-video');
        const canvas = document.getElementById('barcode-canvas');
        if (!video || !canvas) return;
        const ctx = canvas.getContext('2d');
        const status = document.getElementById('barcode-status');
        if (status) status.textContent = 'Modo compatível ativo. A procurar código...';
        
        const scan = () => {
            if (!document.getElementById('barcode-overlay')) return;
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0);
                Quagga.decodeSingle({
                    decoder: { readers: ['ean_reader', 'upc_reader', 'code_128_reader'] },
                    locate: true,
                    src: canvas.toDataURL()
                }, result => {
                    if (result && result.codeResult && result.codeResult.code) {
                        const code = result.codeResult.code;
                        this.stopScanner();
                        onDetected(code);
                        return;
                    }
                    setTimeout(scan, 300);
                });
            } else {
                setTimeout(scan, 300);
            }
        };
        setTimeout(scan, 300);
    },

    stopScanner() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(t => {
                try {
                    // Turn off torch before stopping track
                    if (t.getCapabilities && t.getCapabilities().torch) {
                        t.applyConstraints({ advanced: [{ torch: false }] });
                    }
                } catch (e) { }
                t.stop();
            });
            this.stream = null;
            this.currentTrack = null;
        }
        const overlay = document.getElementById('barcode-overlay');
        if (overlay) overlay.remove();
    },

    async lookupBarcode(barcode) {
        try {
            const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${barcode}&format=json&jscmd=data`);
            const data = await res.json();
            const key = `ISBN:${barcode}`;
            if (data[key]) return { title: data[key].title, platform: '' };
        } catch (e) { }
        try {
            const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
            const data = await res.json();
            if (data.items && data.items.length > 0) {
                const item = data.items[0];
                const title = item.title || item.description || '';
                if (title) return { title, platform: '' };
            }
        } catch (e) { }
        return null;
    }
};
