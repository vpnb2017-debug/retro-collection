/**
 * Export Service — RetroCollection v123
 * Exports collection to PDF (jsPDF) and Excel (SheetJS)
 */

export const exportService = {

    async exportPDF(games, consoles) {
        if (typeof window.jspdf === 'undefined') {
            await this._loadJsPDF();
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const all = [
            ...games.filter(g => !g.isWishlist).map(g => ({...g, _t: 'Jogo'})),
            ...consoles.filter(c => !c.isWishlist).map(c => ({...c, _t: 'Hardware'}))
        ].sort((a,b) => a.title.localeCompare(b.title));

        // Header
        doc.setFillColor(30, 30, 36);
        doc.rect(0, 0, 210, 297, 'F');
        doc.setTextColor(255, 159, 10);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('RetroCollection', 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(200, 200, 200);
        doc.text(`Catalogo gerado em ${new Date().toLocaleDateString('pt-PT')}`, 105, 28, { align: 'center' });
        doc.text(`Total: ${all.length} itens`, 105, 34, { align: 'center' });

        let y = 45;
        const itemsPerRow = 3;
        const colW = 60;
        const rowH = 60;
        const marginX = 15;

        for (let i = 0; i < all.length; i++) {
            const item = all[i];
            const col = i % itemsPerRow;
            const row = Math.floor(i / itemsPerRow);
            const x = marginX + col * colW;
            const pageRow = Math.floor(row * rowH + y);

            if (pageRow + rowH > 280) {
                doc.addPage();
                doc.setFillColor(30, 30, 36);
                doc.rect(0, 0, 210, 297, 'F');
                y = 15;
            }

            const cardY = (Math.floor(i / itemsPerRow) * rowH % (280 - y)) + y;

            // Card background
            doc.setFillColor(43, 43, 54);
            doc.roundedRect(x, cardY, colW - 5, rowH - 5, 3, 3, 'F');

            // Cover image
            if (item.image && item.image.startsWith('data:image')) {
                try {
                    doc.addImage(item.image, 'JPEG', x + 2, cardY + 2, colW - 9, 30, '', 'FAST');
                } catch(e) { /* skip */ }
            } else {
                doc.setFillColor(60, 60, 70);
                doc.rect(x + 2, cardY + 2, colW - 9, 30, 'F');
                doc.setTextColor(100, 100, 120);
                doc.setFontSize(8);
                doc.text('Sem Capa', x + (colW - 9) / 2 + 2, cardY + 17, { align: 'center' });
            }

            // Title
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            const titleLines = doc.splitTextToSize(item.title, colW - 8);
            doc.text(titleLines.slice(0,2), x + 3, cardY + 36);

            // Platform
            doc.setTextColor(255, 159, 10);
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.text(item.platform || 'Geral', x + 3, cardY + 46);

            // Year & Price
            doc.setTextColor(180, 180, 180);
            const info = [item.year, item.price ? `${item.price}€` : ''].filter(Boolean).join(' | ');
            doc.text(info, x + 3, cardY + 52);
        }

        doc.save(`RetroCollection_${new Date().toISOString().split('T')[0]}.pdf`);
    },

    async exportExcel(games, consoles, platforms) {
        if (typeof XLSX === 'undefined') throw new Error('SheetJS nao carregado.');
        const all = [
            ...games.map(g => ({...g, _t: 'Jogo'})),
            ...consoles.map(c => ({...c, _t: 'Hardware'}))
        ].sort((a,b) => a.title.localeCompare(b.title));

        const rows = all.map(item => ({
            'Titulo': item.title || '',
            'Tipo': item._t,
            'Plataforma': item.platform || '',
            'Ano': item.year || '',
            'Genero': item.genre || '',
            'Developer': item.developer || '',
            'Preco (EUR)': item.price || 0,
            'Data Aquisicao': item.acquiredDate || '',
            'Estado': item.isWishlist ? 'Wishlist' : (item.isValidated ? 'Validado' : 'Nao Validado'),
            'Notas': item.notes || ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);

        // Column widths
        ws['!cols'] = [
            {wch:35},{wch:10},{wch:20},{wch:8},{wch:15},{wch:20},{wch:12},{wch:15},{wch:15},{wch:40}
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Colecao');

        // Stats sheet
        const platMap = {};
        all.forEach(i => { platMap[i.platform || 'Geral'] = (platMap[i.platform || 'Geral'] || 0) + 1; });
        const statsRows = Object.entries(platMap).sort((a,b)=>b[1]-a[1]).map(([p,n]) => ({ 'Plataforma': p, 'Total': n }));
        const wsStats = XLSX.utils.json_to_sheet(statsRows);
        XLSX.utils.book_append_sheet(wb, wsStats, 'Estatisticas');

        XLSX.writeFile(wb, `RetroCollection_${new Date().toISOString().split('T')[0]}.xlsx`);
    },

    async _loadJsPDF() {
        return new Promise(resolve => {
            if (document.getElementById('jspdf-cdn')) { resolve(); return; }
            const script = document.createElement('script');
            script.id = 'jspdf-cdn';
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = resolve;
            script.onerror = resolve;
            document.head.appendChild(script);
        });
    }
};
