import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

@Injectable({ providedIn: 'root' })
export class PdfSchedaService {
  async buildDoc(scheda: any, cliente: any, logoPreviewUrl: string | null = null): Promise<any> {
    const doc: any = new jsPDF({ unit: 'mm', format: 'a4', hotfixes: ['px_scaling'] });
    const bluBarra: [number, number, number] = [26, 35, 126];
    const gialloBarra: [number, number, number] = [233, 186, 0];
    const verdeNote: [number, number, number] = [44, 122, 70];
    const barraH = 10;
    const barraNotaH = 8.5;
    const spazioBloccoLogoEsercizi = 12;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 14;
    const safetyBottom = 16;
    const contentW = pageW - marginX * 2;
    const headerH = 15;

    doc.setFillColor('#0b4fa3');
    doc.rect(0, 0, pageW, headerH, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor('#ffffff');
    doc.text('fitness&dance', pageW - marginX, headerH / 1.6, { align: 'right' });
    doc.setTextColor('#000000');

    let y = headerH + 6;
    const logoBoxW = 38, logoBoxH = 38;
    let logoDrawnH = 0;
    const nome = cliente?.name || '';
    if (logoPreviewUrl) {
      try {
        const dim = await new Promise<{ w: number; h: number }>((res, rej) => {
          const im = new Image();
          im.onload = () => res({ w: im.width, h: im.height });
          im.onerror = rej;
          im.src = logoPreviewUrl!;
        });
        let lw = logoBoxW, lh = logoBoxH;
        const ratio = dim.w / dim.h;
        if (ratio > 1) { lh = logoBoxH; lw = Math.min(logoBoxW, lh * ratio); }
        else { lw = logoBoxW; lh = Math.min(logoBoxH, lw / ratio); }
        const dataHQ = logoPreviewUrl;
        doc.addImage(dataHQ || logoPreviewUrl!, 'PNG', marginX, y, lw, lh, undefined, 'FAST');
        logoDrawnH = lh;
      } catch {}
    }

    const datiStartX = marginX + logoBoxW + 12;
    const datiStartY = y + 6;

    const labelX = datiStartX;
    const valueX = datiStartX + 16;
    let currY = datiStartY;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(nome, datiStartX, currY);
    currY += 10;

    let startDate = '-';
    if (scheda.dataInizio && /^\d{4}-\d{2}-\d{2}$/.test(scheda.dataInizio)) {
      const [yy, mm, dd] = scheda.dataInizio.split('-');
      startDate = `${dd}/${mm}/${yy}`;
    }
    const etichette = [
      { label: "Livello:", value: scheda.livello ?? '-' },
      { label: "Durata:", value: scheda.durata ?? '-' },
      { label: "Inizio:", value: startDate }
    ];

    doc.setFontSize(12);
    for (const et of etichette) {
      doc.setFont('Helvetica', 'bold');
      doc.text(et.label, labelX, currY);
      doc.setFont('Helvetica', 'normal');
      doc.text(et.value, valueX, currY);
      currY += 8;
    }

    const headerBlockHeight = Math.max(logoDrawnH, currY - y) + 2;
    y += headerBlockHeight;
    y += spazioBloccoLogoEsercizi;

    const exercisesPerRow = 3;
    const imgW = 50, imgH = 27;
    const cellW = contentW / exercisesPerRow;
    const colCount = 14;
    const rowH = 10;
    const colW = (contentW) / colCount;
    const esercizioFontSize = 11;
    const esercizioFontWeight = 'bold';

    for (const g of scheda.giorni) {
      if (!g.esercizi.length) continue;
      const rows: any[][] = [];
      for (let i = 0; i < g.esercizi.length; i += exercisesPerRow) {
        rows.push(g.esercizi.slice(i, i + exercisesPerRow));
      }
      let rowHeights = rows.map(() => imgH + 20);
      let primaRigaAltezza = barraH + rowHeights[0] + 3;
      const spazioDisponibile = pageH - safetyBottom - y;
      if (spazioDisponibile < primaRigaAltezza) {
        doc.addPage();
        y = 18;
      }
      doc.setFillColor(...gialloBarra);
      doc.rect(marginX, y, contentW, barraH, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13.2);
      doc.setTextColor('#ffffff');
      doc.text(g.nome, marginX + contentW / 2, y + barraH / 1.7, { align: 'center' });
      doc.setTextColor('#000000');
      y += barraH + 3;
      for (let rIndex = 0; rIndex < rows.length; rIndex++) {
        const r = rows[rIndex];
        const rHeight = rowHeights[rIndex];
        if (y + rHeight > pageH - safetyBottom) {
          doc.addPage();
          y = 18;
        }
        for (let c = 0; c < r.length; c++) {
          const ex = r[c];
          const cellX = marginX + c * cellW;
          const imgX = cellX + (cellW - imgW) / 2;
          const imgY = y;
          let imgData: string | undefined;
          try { if (ex.image?.startsWith('data:image/')) imgData = ex.image; } catch { }
          try { doc.addImage(imgData || ex.image, 'PNG', imgX, imgY, imgW, imgH, undefined, 'FAST'); } catch { }
          let tY = imgY + imgH + 5;
          doc.setFont('Helvetica', esercizioFontWeight);
          doc.setFontSize(esercizioFontSize);
          doc.setTextColor('#183047');
          doc.text(ex.nome || '', cellX + cellW / 2, tY, { align: 'center' });
          tY += 6;
          doc.setFont('Helvetica', esercizioFontWeight);
          doc.setFontSize(esercizioFontSize);
          doc.setTextColor('#000000');
          const valoriString = `${ex.serie}x${ex.ripetizioni} - ${ex.minuti}' ${ex.secondi}"`;
          doc.text(valoriString, cellX + cellW / 2, tY, { align: 'center' });
        }
        y += rHeight;
      }
      const eserciziConNote = g.esercizi.filter((ex: any) => ex.note && ex.note.trim().length > 0);
      if (eserciziConNote.length > 0) {
        const rowTabH = 8;
        const nameColW = contentW * 0.34;
        const valueColW = contentW - nameColW;
        if (y + barraNotaH + eserciziConNote.length * rowTabH > pageH - safetyBottom) {
          doc.addPage();
          y = 18;
        }
        doc.setFillColor(...verdeNote);
        doc.rect(marginX, y, contentW, barraNotaH, 'F');
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11.3);
        doc.setTextColor('#ffffff');
        doc.text('Note esercizi', marginX + 2.5, y + barraNotaH * 0.73, { align: 'left' });
        doc.setTextColor('#000000');
        y += barraNotaH;
        for (const ex of eserciziConNote) {
          if (y + rowTabH > pageH - safetyBottom) {
            doc.addPage();
            y = 18;
          }
          doc.rect(marginX, y, nameColW, rowTabH, 'S');
          doc.rect(marginX + nameColW, y, valueColW, rowTabH, 'S');
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(10.2);
          doc.text(ex.nome || '', marginX + 2, y + rowTabH * 0.68, { align: 'left' });
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(9.8);
          const cellNoteW = valueColW - 3;
          doc.text(ex.note, marginX + nameColW + 2, y + rowTabH * 0.68, { align: 'left' });
          y += rowTabH;
        }
        y += 5;
      }
      y += 6;
      if (y + barraH + g.esercizi.length * rowH > pageH - safetyBottom) {
        doc.addPage();
        y = 18;
      }
      doc.setFillColor(...bluBarra);
      doc.rect(marginX, y, contentW, barraH, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13.2);
      doc.setTextColor('#ffffff');
      doc.text('Tracking pesi', marginX + 2.5, y + barraH / 1.7, { align: 'left' });
      doc.setTextColor('#000000');
      y += barraH + 2;
      let yGrid = y;
      for (let r = 0; r < g.esercizi.length; r++) {
        if (yGrid + rowH > pageH - safetyBottom) {
          doc.addPage();
          yGrid = 18;
        }
        for (let c = 0; c < colCount; c++) {
          doc.rect(marginX + c * colW, yGrid, colW, rowH, 'S');
        }
        yGrid += rowH;
      }
      y = yGrid + 6;
    }
    if (y + barraH + 18 * rowH > pageH - safetyBottom) {
      doc.addPage();
      y = 18;
    }
    doc.setFillColor(...bluBarra);
    doc.rect(marginX, y, contentW, barraH, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13.2);
    doc.setTextColor('#ffffff');
    doc.text('Note personali', marginX + 2.5, y + barraH / 1.7, { align: 'left' });
    doc.setTextColor('#000000');
    y += barraH + 2;
    let yGrid = y;
    for (let r = 0; r < 18; r++) {
      if (yGrid + rowH > pageH - safetyBottom) {
        doc.addPage();
        yGrid = 18;
      }
      for (let c = 0; c < colCount; c++) {
        doc.rect(marginX + c * colW, yGrid, colW, rowH, 'S');
      }
      yGrid += rowH;
    }
    return doc;
  }

  async buildAndSavePdf(scheda: any, cliente: any, logoPreviewUrl: string | null = null): Promise<void> {
    const doc = await this.buildDoc(scheda, cliente, logoPreviewUrl);
    const nomeCliente = (cliente?.name || 'Cliente').replace(/\s+/g, '');
    const dataScheda = scheda.dataInizio || '';
    const fileName = `scheda-${nomeCliente}-${dataScheda}.pdf`;
    doc.save(fileName);
  }
}