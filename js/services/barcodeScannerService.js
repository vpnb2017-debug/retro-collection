/**
 * Barcode Scanner Service — RetroCollection v123
 * Uses native BarcodeDetector API (Chrome/Edge) with Quagga2 fallback
 * Supports EAN-13 and UPC-A for physical game box scanning
 */

export const barcodeScannerService = {
    stream: null,
    animFrameId: null,
    quaggaLoaded: false,

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
        const overlay = document.createElement('div');
        overlay.id = 'barcode-overlay';
        overlay.style.cssText = `
            position:fixed; inset:0; z-index:9000; background:#000;
            display:flex; flex-direction:column; align-items:center; justify-content:center;
        `;
        overlay.innerHTML = `
            <div style="position:relative; width:100%; max-width:480px;">
                <video id="barcode-video" autoplay muted playsinline
                    style="width:100%; border-radius:12px; display:block;"></video>
                <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none;">
                    <div style="width:80%; height:100px; border:3px solid #ff9f0a; border-radius:12px; box-shadow:0 0 0 4000px rgba(0,0,0,0.5);"></div>
                </div>
                <canvas id="barcode-canvas" style="display:none;"></canvas>
            </div>
            <p style="color:#ffc978; margin-top:20px; font-size:0.9rem; text-align:center;">
                Aponte a camera para o codigo de barras da caixa do jogo
            </p>
            <div id="barcode-status" style="color:#aaa; font-size:0.75rem; margin-top:8px;"></div>
            <button id="barcode-close" style="
                margin-top:20px; background:#ff4d4d; border:none; color:white;
                padding:12px 30px; border-radius:30px; font-weight:800; font-size:0.9rem; cursor:pointer;
            ">X Cancelar</button>
        `;
        document.body.appendChild(overlay);
        document.getElementById('barcode-close').onclick = () => this.stopScanner();

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            const video = document.getElementById('barcode-video');
            video.srcObject = this.stream;
            await video.play();
            const status = document.getElementById('barcode-status');
            status.textContent = 'Camera ativa. A procurar codigo...';
            if ('BarcodeDetector' in window) {
                await this._scanWithNativeAPI(onDetected);
            } else {
                await this._loadQuagga();
                await this._scanWithQuagga(onDetected);
            }
        } catch (err) {
            this.stopScanner();
            throw new Error('Nao foi possivel aceder a camera: ' + err.message);
        }
    },

    async _scanWithNativeAPI(onDetected) {
        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        const video = document.getElementById('barcode-video');
        const scan = async () => {
            if (!document.getElementById('barcode-overlay')) return;
            try {
                const barcodes = await detector.detect(video);
                if (barcodes.length > 0) {
                    const code = barcodes[0].rawValue;
                    this.stopScanner();
                    await onDetected(code);
                    return;
                }
            } catch (e) { /* continue */ }
            this.animFrameId = requestAnimationFrame(scan);
        };
        this.animFrameId = requestAnimationFrame(scan);
    },

    async _scanWithQuagga(onDetected) {
        const video = document.getElementById('barcode-video');
        const canvas = document.getElementById('barcode-canvas');
        const ctx = canvas.getContext('2d');
        const status = document.getElementById('barcode-status');
        status.textContent = 'Modo compativel ativo. A procurar codigo...';
        const scan = () => {
            if (!document.getElementById('barcode-overlay')) return;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            Quagga.decodeSingle({
                decoder: { readers: ['ean_reader', 'upc_reader'] },
                locate: true,
                src: canvas.toDataURL()
            }, result => {
                if (result && result.codeResult && result.codeResult.code) {
                    const code = result.codeResult.code;
                    this.stopScanner();
                    onDetected(code);
                    return;
                }
                setTimeout(scan, 500);
            });
        };
        setTimeout(scan, 500);
    },

    stopScanner() {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
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
