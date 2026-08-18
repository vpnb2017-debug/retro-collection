/**
 * Barcode Scanner Service — RetroCollection v130
 * Uses native BarcodeDetector API (Chrome/Edge) with Quagga2 fallback.
 * Supports EAN-13 and UPC-A for physical game box scanning.
 * Includes Ultra-Wide (0.5x), Main (1x), and Telephoto (2x) lens switching,
 * digital zoom constraints, zoom selector pills, and torch support.
 */

export const barcodeScannerService = {
    stream: null,
    animFrameId: null,
    quaggaLoaded: false,
    currentTrack: null,
    currentZoom: 1,
    isTorchOn: false,
    activeOnDetected: null,
    backCameras: [],
    mainDeviceId: null,
    ultraWideDeviceId: null,
    teleDeviceId: null,

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
        this.stopScanner();
        this.activeOnDetected = onDetected;

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

                <!-- Zoom Controls (0.5x / 1x / 2x) -->
                <div id="barcode-zoom-controls" style="position:absolute; bottom:20px; display:flex; gap:8px; background:rgba(0,0,0,0.65); padding:6px 10px; border-radius:30px; backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.25); z-index:20;">
                    <button id="zoom-05x" class="zoom-btn" style="background:transparent; color:white; border:none; padding:5px 12px; border-radius:16px; font-size:0.8rem; font-weight:800; cursor:pointer; transition:all 0.2s;">0.5x</button>
                    <button id="zoom-1x" class="zoom-btn active" style="background:var(--accent-color, #ff9f0a); color:white; border:none; padding:5px 12px; border-radius:16px; font-size:0.8rem; font-weight:800; cursor:pointer; transition:all 0.2s;">1x</button>
                    <button id="zoom-2x" class="zoom-btn" style="background:transparent; color:white; border:none; padding:5px 12px; border-radius:16px; font-size:0.8rem; font-weight:800; cursor:pointer; transition:all 0.2s;">2x</button>
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
            await this._discoverCameraDevices();
            await this._startCameraStream(this.mainDeviceId, 1);

            const status = document.getElementById('barcode-status');
            if (status) status.textContent = 'Câmara ativa. A procurar código...';

            this._setupZoomButtons();

            if ('BarcodeDetector' in window) {
                await this._scanWithNativeAPI(this.activeOnDetected);
            } else {
                await this._loadQuagga();
                await this._scanWithQuagga(this.activeOnDetected);
            }
        } catch (err) {
            this.stopScanner();
            throw new Error('Não foi possível aceder à câmara: ' + err.message);
        }
    },

    async _discoverCameraDevices() {
        this.backCameras = [];
        this.mainDeviceId = null;
        this.ultraWideDeviceId = null;
        this.teleDeviceId = null;

        try {
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(d => d.kind === 'videoinput');
                
                this.backCameras = videoDevices.filter(d => {
                    const label = (d.label || '').toLowerCase();
                    return label.includes('back') || label.includes('rear') || label.includes('traseira') || label.includes('environment') || label.includes('0') || label.includes('camera2 0');
                });

                if (this.backCameras.length === 0 && videoDevices.length > 0) {
                    this.backCameras = videoDevices;
                }

                // Identify Ultra-Wide (0.5x), Main (1x), and Telephoto (2x) lenses
                this.backCameras.forEach(cam => {
                    const l = cam.label.toLowerCase();
                    if (l.includes('ultra') || l.includes('0.5') || l.includes('wide-angle') || l.includes('fov') || l.includes('camera2 2')) {
                        if (!this.ultraWideDeviceId) this.ultraWideDeviceId = cam.deviceId;
                    } else if (l.includes('tele') || l.includes('2x') || l.includes('3x') || l.includes('5x') || l.includes('zoom')) {
                        if (!this.teleDeviceId) this.teleDeviceId = cam.deviceId;
                    } else {
                        if (!this.mainDeviceId) this.mainDeviceId = cam.deviceId;
                    }
                });

                if (!this.mainDeviceId && this.backCameras.length > 0) {
                    this.mainDeviceId = this.backCameras[0].deviceId;
                }
                if (!this.ultraWideDeviceId && this.backCameras.length > 1) {
                    // In many Android devices with multiple back lenses, index 1 or 2 is the ultrawide
                    const otherCam = this.backCameras.find(c => c.deviceId !== this.mainDeviceId);
                    if (otherCam) this.ultraWideDeviceId = otherCam.deviceId;
                }
            }
        } catch (e) {
            console.warn('Camera device discovery error:', e);
        }
    },

    async _startCameraStream(preferredDeviceId, targetZoom = 1) {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }

        const videoConstraints = {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 }
        };

        if (preferredDeviceId) {
            videoConstraints.deviceId = { exact: preferredDeviceId };
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
        } catch (e) {
            // Fallback to basic environment facing mode
            this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        }

        const video = document.getElementById('barcode-video');
        if (video) {
            video.srcObject = this.stream;
            await video.play();
        }

        this.currentTrack = this.stream.getVideoTracks()[0];
        await this._applyZoomAndConfigureTrack(targetZoom);
    },

    async _applyZoomAndConfigureTrack(targetZoom) {
        if (!this.currentTrack) return;
        const capabilities = this.currentTrack.getCapabilities ? this.currentTrack.getCapabilities() : {};

        // Apply Zoom level (e.g. 0.5, 1.0, 2.0)
        if (capabilities.zoom) {
            const minZ = capabilities.zoom.min || 1;
            const maxZ = capabilities.zoom.max || 1;
            const clampedZoom = Math.max(minZ, Math.min(maxZ, targetZoom));
            this.currentZoom = clampedZoom;

            try {
                await this.currentTrack.applyConstraints({ advanced: [{ zoom: clampedZoom }] });
            } catch (e) {
                console.warn('Could not apply zoom level:', targetZoom, e);
            }
        }

        // Torch / Flashlight Button
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

    _setupZoomButtons() {
        const btn05 = document.getElementById('zoom-05x');
        const btn1x = document.getElementById('zoom-1x');
        const btn2x = document.getElementById('zoom-2x');

        const updateBtnStyles = (activeBtn) => {
            [btn05, btn1x, btn2x].forEach(b => {
                if (b) {
                    b.style.background = (b === activeBtn) ? 'var(--accent-color, #ff9f0a)' : 'transparent';
                    b.classList.toggle('active', b === activeBtn);
                }
            });
        };

        if (btn05) {
            btn05.onclick = async () => {
                updateBtnStyles(btn05);
                const status = document.getElementById('barcode-status');
                if (status) status.textContent = 'A mudar para 0.5x (Grande Angular)...';

                if (this.ultraWideDeviceId && this.ultraWideDeviceId !== this.mainDeviceId) {
                    await this._startCameraStream(this.ultraWideDeviceId, 0.5);
                } else {
                    await this._applyZoomAndConfigureTrack(0.5);
                }
                if (status) status.textContent = 'Modo 0.5x ativo.';
            };
        }

        if (btn1x) {
            btn1x.onclick = async () => {
                updateBtnStyles(btn1x);
                const status = document.getElementById('barcode-status');
                if (status) status.textContent = 'A mudar para 1x (Normal)...';

                if (this.mainDeviceId) {
                    await this._startCameraStream(this.mainDeviceId, 1);
                } else {
                    await this._applyZoomAndConfigureTrack(1);
                }
                if (status) status.textContent = 'Modo 1x ativo.';
            };
        }

        if (btn2x) {
            btn2x.onclick = async () => {
                updateBtnStyles(btn2x);
                const status = document.getElementById('barcode-status');
                if (status) status.textContent = 'A mudar para 2x (Zoom)...';

                if (this.teleDeviceId) {
                    await this._startCameraStream(this.teleDeviceId, 2);
                } else {
                    await this._applyZoomAndConfigureTrack(2);
                }
                if (status) status.textContent = 'Modo 2x ativo.';
            };
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
