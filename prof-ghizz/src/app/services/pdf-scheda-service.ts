import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

@Injectable({ providedIn: 'root' })
export class PdfSchedaService {

  // Router: decide quale template stampare
  async buildDoc(scheda: any, cliente: any, logoPreviewUrl: string | null = null): Promise<any> {
    if (scheda?.templateType === 'profghizztemplate') {
      return this.buildAthletePdf(scheda, cliente, logoPreviewUrl);
    }
    return this.buildGymPdf(scheda, cliente, logoPreviewUrl);
  }

  // ======================= TEMPLATE "PALESTRA" =======================
  private async buildGymPdf(scheda: any, cliente: any, logoPreviewUrl: string | null = null): Promise<any> {
    const doc: any = new jsPDF({ unit: 'mm', format: 'a4', hotfixes: ['px_scaling'] });

    // Palette (dichiarate UNA SOLA VOLTA per funzione)
    const bluBarra: [number, number, number]   = [26, 35, 126];
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

    // Header con brand fitness&dance
    doc.setFillColor('#0b4fa3');
    doc.rect(0, 0, pageW, headerH, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor('#ffffff');
    doc.text('fitness&dance', pageW - marginX, headerH / 1.6, { align: 'right' });
    doc.setTextColor('#000000');

    // Blocco logo + dati
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
        doc.addImage(logoPreviewUrl!, 'PNG', marginX, y, lw, lh, undefined, 'FAST');
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
    if (scheda?.dataInizio && /^\d{4}-\d{2}-\d{2}$/.test(scheda.dataInizio)) {
      const [yy, mm, dd] = scheda.dataInizio.split('-');
      startDate = `${dd}/${mm}/${yy}`;
    }
    const etichette = [
      { label: 'Livello:', value: scheda?.livello ?? '-' },
      { label: 'Durata:', value: scheda?.durata ?? '-' },
      { label: 'Inizio:', value: startDate }
    ];

    doc.setFontSize(12);
    for (const et of etichette) {
      doc.setFont('Helvetica', 'bold');
      doc.text(et.label, labelX, currY);
      doc.setFont('Helvetica', 'normal');
      doc.text(String(et.value), valueX, currY);
      currY += 8;
    }

    const headerBlockHeight = Math.max(logoDrawnH, currY - y) + 2;
    y += headerBlockHeight + spazioBloccoLogoEsercizi;

    // Griglia esercizi 3-per-riga
    const exercisesPerRow = 3;
    const imgW = 50, imgH = 27;
    const cellW = contentW / exercisesPerRow;

    const colCount = 14;
    const rowH = 10;
    const colW = contentW / colCount;

    const esercizioFontSize = 11;
    const esercizioFontWeight = 'bold';

    for (const g of (scheda?.giorni || [])) {
      if (!g?.esercizi?.length) continue;

      const rows: any[][] = [];
      for (let i = 0; i < g.esercizi.length; i += exercisesPerRow) {
        rows.push(g.esercizi.slice(i, i + exercisesPerRow));
      }
      const rowHeights = rows.map(() => imgH + 20);
      if (pageH - safetyBottom - y < barraH + rowHeights[0] + 3) {
        doc.addPage();
        y = 18;
      }

      doc.setFillColor(...gialloBarra);
      doc.rect(marginX, y, contentW, barraH, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13.2);
      doc.setTextColor('#ffffff');
      doc.text(String(g?.nome || ''), marginX + contentW / 2, y + barraH / 1.7, { align: 'center' });
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

          try {
            if (ex?.image) {
              const format = (ex.image.startsWith('data:image/jpeg') || ex.image.toLowerCase().endsWith('.jpg') || ex.image.toLowerCase().endsWith('.jpeg')) ? 'JPEG' : 'PNG';
              doc.addImage(ex.image, format as any, imgX, imgY, imgW, imgH, undefined, 'FAST');
            }
          } catch {}

          let tY = imgY + imgH + 5;
          doc.setFont('Helvetica', esercizioFontWeight);
          doc.setFontSize(esercizioFontSize);
          doc.setTextColor('#183047');
          doc.text(String(ex?.nome || ''), cellX + cellW / 2, tY, { align: 'center' });
          tY += 6;

          const v0 = ex?.settimaneValori?.[0] || {};
          const serie = Number(v0.serie) || 0;
          const reps = Number(v0.ripetizioni) || 0;
          const mm = Number(v0.minuti) || 0;
          const ss = Number(v0.secondi) || 0;

          doc.setFont('Helvetica', esercizioFontWeight);
          doc.setFontSize(esercizioFontSize);
          doc.setTextColor('#000000');
          const valoriString = `${serie}x${reps} - ${mm}' ${ss}"`;
          doc.text(valoriString, cellX + cellW / 2, tY, { align: 'center' });
        }
        y += rHeight;
      }

      // Tracking pesi
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

    // Note personali finali
    if (y + barraH + 18 * 7 > pageH - safetyBottom) {
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

    const note = cliente?.personalNotes ?? scheda?.personalNotes ?? '';
    const splitted = typeof note === 'string' && note.trim() ? note.split('\n') : [];
    const maxFinaleRows = 18;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    const lineHeight = 7;
    for (let r = 0; r < maxFinaleRows; r++) {
      if (y + lineHeight > pageH - safetyBottom) {
        doc.addPage();
        y = 18;
      }
      doc.line(marginX, y, marginX + contentW, y);
      if (splitted[r]) {
        doc.text(splitted[r], marginX + 2.5, y + lineHeight * 0.68, { align: 'left' });
      }
      y += lineHeight;
    }
    doc.line(marginX, y, marginX + contentW, y);

    return doc;
  }

  // ======================= TEMPLATE "ATLETA" =======================
private async buildAthletePdf(scheda: any, cliente: any, logoPreviewUrl: string | null = null): Promise<any> {
  const doc: any = new jsPDF({ unit: 'mm', format: 'a4', hotfixes: ['px_scaling'] });

  const gialloBarra: [number, number, number]      = [233, 186, 0];
  const headerWeeksFill: [number, number, number]  = [245, 245, 210];
  const white: [number, number, number]            = [255, 255, 255];

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 10;
  const contentW = pageW - marginX * 2;
  const headerH = 15;
  const safetyBottom = 16;

  doc.setFillColor('#0b4fa3');
  doc.rect(0, 0, pageW, headerH, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor('#ffffff');
  doc.text('Prof Ghizz', pageW - marginX, headerH / 1.6, { align: 'right' });
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
      doc.addImage(logoPreviewUrl!, 'PNG', marginX, y, lw, lh, undefined, 'FAST');
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
  if (scheda?.dataInizio && /^\d{4}-\d{2}-\d{2}$/.test(scheda.dataInizio)) {
    const [yy, mm, dd] = scheda.dataInizio.split('-');
    startDate = `${dd}/${mm}/${yy}`;
  }
  const etichette = [
    { label: 'Livello:', value: scheda?.livello ?? '-' },
    { label: 'Durata:', value: scheda?.durata ?? '-' },
    { label: 'Inizio:', value: startDate }
  ];

  doc.setFontSize(12);
  for (const et of etichette) {
    doc.setFont('Helvetica', 'bold');
    doc.text(et.label, labelX, currY);
    doc.setFont('Helvetica', 'normal');
    doc.text(String(et.value), valueX, currY);
    currY += 8;
  }

  const headerBlockHeight = Math.max(logoDrawnH, currY - y) + 6;
  y += headerBlockHeight;

  const fotoW = 32;
  const fotoH = 26;
  const colHeaderH = 9;
  const minRowH = 26;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);

  for (const giorno of (scheda?.giorni || [])) {
    const settimane = Array.isArray(giorno?.settimane) && giorno.settimane.length
      ? giorno.settimane
      : Array.from({ length: 10 }, (_, i) => ({ nome: `Settim. ${i + 1}` }));

    if (y + 10 + colHeaderH + minRowH > pageH - safetyBottom) {
      doc.addPage();
      y = 18;
    }

    doc.setFillColor(...gialloBarra);
    doc.rect(marginX, y, contentW, 10, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor('#000000');
    doc.text(String(giorno?.nome || ''), marginX + contentW / 2, y + 7, { align: 'center' });
    y += 12;

    const colsW = contentW - fotoW;
    const colW = colsW / settimane.length;
    const startX = marginX;
    let startY = y;

    for (let s = 0; s < settimane.length; s++) {
      const x = startX + fotoW + s * colW;
      doc.setFillColor(...headerWeeksFill);
      doc.rect(x, startY, colW, colHeaderH, 'F');
      doc.rect(x, startY, colW, colHeaderH, 'S');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.2);
      doc.setTextColor(0, 0, 0);
      const nomeSett = (settimane[s]?.nome || `Settim. ${s + 1}`).replace('Settimana', 'Settim.');
      doc.text(nomeSett, x + colW / 2, startY + 5.6, { align: 'center' });
    }
    doc.rect(startX, startY, fotoW, colHeaderH, 'S');
    startY += colHeaderH;

    for (const ex of (giorno?.esercizi || [])) {
      let rowH = minRowH;

      const nomeLines = doc.splitTextToSize(String(ex?.nome || ''), fotoW - 2);
      let imgHCustom = fotoH - 13;
      let didascaliaHeight = 0;
      let nomeHeight = nomeLines.length * 4.7 + 2;

      if (ex?.didascalia) {
        didascaliaHeight = 4.5;
      }

      const cellContentHeight = 2 + imgHCustom + 2 + didascaliaHeight + 2 + nomeHeight;
      if (cellContentHeight > rowH) rowH = cellContentHeight + 2;

      if (startY + rowH > pageH - safetyBottom) {
        doc.addPage();
        startY = 18;
      }

      doc.rect(startX, startY, fotoW, rowH, 'S');

      let imgY = startY + 2;
      const imgX = startX + 2;
      const imgW = fotoW - 4;

      try {
        if (ex?.image) {
          const format = (ex.image.startsWith('data:image/jpeg') || ex.image.toLowerCase().endsWith('.jpg') || ex.image.toLowerCase().endsWith('.jpeg')) ? 'JPEG' : 'PNG';
          doc.addImage(ex.image, format as any, imgX, imgY, imgW, imgHCustom, undefined, 'FAST');
        }
      } catch {}

      let textY = imgY + imgHCustom + 2;
      if (ex?.didascalia) {
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text(String(ex.didascalia), startX + fotoW / 2, textY, { align: 'center', maxWidth: fotoW - 2 });
        textY += didascaliaHeight;
      }

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.6);
      doc.setTextColor(0, 0, 0);
      doc.text(nomeLines, startX + fotoW / 2, textY + 2, { align: 'center', maxWidth: fotoW - 2 });

      for (let s = 0; s < settimane.length; s++) {
        const x = startX + fotoW + s * colW;

        doc.setFillColor(...white);
        doc.rect(x, startY, colW, rowH, 'F');
        doc.rect(x, startY, colW, rowH, 'S');

        const wVals = (ex?.settimaneValori && ex.settimaneValori[s]) ? ex.settimaneValori[s] : null;
        const serie = wVals ? Number(wVals.serie) || 0 : 0;
        const reps  = wVals ? Number(wVals.ripetizioni) || 0 : 0;
        const kg    = wVals ? Number(wVals.caricoKg) || 0 : 0;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10.3);
        doc.setTextColor(0, 0, 0);
        const topLine = (serie || reps || kg) ? `${serie}*${reps} @ ${kg} kg` : `__*__ @ __ kg`;
        doc.text(topLine, x + colW / 2, startY + 8.5, { align: 'center' });
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.line(x + 1, startY + 11, x + colW - 1, startY + 11);
        doc.setLineWidth(0.3);

        const mm = wVals ? Number(wVals.minuti) || 0 : 0;
        const ss = wVals ? Number(wVals.secondi) || 0 : 0;
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9.2);
        const recLine = (mm || ss) ? `rec. ${mm}' ${ss}"` : 'rec. __';
        doc.text(recLine, x + colW / 2, startY + 15.5, { align: 'center' });

        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.line(x + 1, startY + 18, x + colW - 1, startY + 18);
        doc.setLineWidth(0.3);

        const note = wVals?.note || '';
        if (note) {
          doc.setFont('Helvetica', 'italic');
          doc.setFontSize(8.2);
          const wrapped = doc.splitTextToSize(String(note), colW - 4);
          const firstLine = Array.isArray(wrapped) ? wrapped[0] : wrapped;
          doc.text(firstLine, x + colW / 2, startY + 21.2, { align: 'center' });
        }
      }
      startY += rowH;
    }
    y = startY + 6;
  }
  return doc;
}

  // Retro-compatibilità
  async buildProfGhizzDoc(scheda: any, cliente: any, logoPreviewUrl: string | null = null): Promise<any> {
    return this.buildAthletePdf(scheda, cliente, logoPreviewUrl);
  }

  async buildAndSavePdf(scheda: any, cliente: any, logoPreviewUrl: string | null = null): Promise<void> {
    const doc = await this.buildDoc(scheda, cliente, logoPreviewUrl);
    const nomeCliente = (cliente?.name || 'Cliente').replace(/\s+/g, '');
    const dataScheda = scheda?.dataInizio || '';
    const fileName = `scheda-${nomeCliente}-${dataScheda}.pdf`;
    doc.save(fileName);
  }
}