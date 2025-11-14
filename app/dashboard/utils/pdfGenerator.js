// app/dashboard/utils/pdfGenerator.js
import jsPDF from "jspdf";

export const generatePDF = async (sections, transcript) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  // ... (paste your entire generatePDF function here, exactly as it was) ...
  const margin = 36; 
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 1.35; 
  const secHeaderH = 26;
  const secPadding = 10;

  const paginateIfNeeded = (needed, topPad = 0) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin + topPad;
    }
  };

  // Logo
  const logoImg = new Image();
  logoImg.src = "/images/app-logo.png";
  await new Promise((resolve) => { logoImg.onload = resolve; });
  const logoWidth = 36;
  const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
  doc.addImage(logoImg, "PNG", pageWidth - margin - logoWidth, margin, logoWidth, logoHeight);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Clinical Summary & Transcript", pageWidth / 2, margin + 24, { align: "center" });

  // Top rule
  doc.setLineWidth(0.5);
  doc.setDrawColor(200);
  doc.line(margin, margin + 34, pageWidth - margin, margin + 34);

  let y = margin + 52;

  const sectionsOrder = ["hpi", "physicalExam", "investigations", "prescription", "assessment"];

  sectionsOrder.forEach((key) => {
    const section = sections[key];
    if (!section) return;

    // Section header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    const headerH = secHeaderH;

    // Prepare content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setLineHeightFactor(lineHeight);
    const text = section.content && section.content.trim() ? section.content : "Not specified in the transcript.";
    const wrapped = doc.splitTextToSize(text, contentWidth - secPadding * 2);
    const lines = wrapped.length;
    const fontSize = 12;
    const textHeight = (lines * fontSize * lineHeight - fontSize * (lineHeight - 1)) / doc.internal.scaleFactor;

    // Total block height = header + content box + padding
    const contentBoxH = textHeight + secPadding * 2;
    const blockH = headerH + 8 + contentBoxH;

    paginateIfNeeded(blockH);

    // Header box
    doc.setFillColor(230);
    doc.roundedRect(margin, y, contentWidth, headerH, 5, 5, "F");
    doc.setTextColor(33, 37, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(section.title, margin + secPadding, y + headerH - 8);
    y += headerH + 8;

    // Content box
    doc.setFillColor(245);
    doc.roundedRect(margin, y, contentWidth, contentBoxH, 5, 5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(wrapped, margin + secPadding, y + secPadding + 10);
    y += contentBoxH + 16;
  });

  // Transcript page
  doc.addPage();
  y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const tHeader = "Transcript";
  const tHeaderH = secHeaderH;
  doc.setFillColor(230);
  doc.roundedRect(margin, y, contentWidth, tHeaderH, 5, 5, "F");
  doc.setTextColor(33, 37, 51);
  doc.text(tHeader, margin + secPadding, y + tHeaderH - 8);
  y += tHeaderH + 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setLineHeightFactor(lineHeight);

  const transcriptText = transcript && transcript.trim() ? transcript : "Transcript will appear here...";
  const tWrapped = doc.splitTextToSize(transcriptText, contentWidth - secPadding * 2);
  const tLineH = (12 * lineHeight) / doc.internal.scaleFactor;

  // Stream transcript across pages
  let start = 0;
  while (start < tWrapped.length) {
    const availableHeight = pageHeight - margin - y - secPadding * 2;
    const fitLines = Math.max(1, Math.floor(availableHeight / tLineH));
    const slice = tWrapped.slice(start, start + fitLines);
    const sliceHeight = slice.length * tLineH + secPadding * 2;

    doc.setFillColor(230, 245, 255);
    doc.roundedRect(margin, y, contentWidth, sliceHeight, 5, 5, "F");
    doc.text(slice, margin + secPadding, y + secPadding + 10);

    start += fitLines;
    y += sliceHeight + 12;

    if (start < tWrapped.length) {
      doc.addPage();
      y = margin;
      // Re-draw transcript header on new page
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setFillColor(230);
      doc.roundedRect(margin, y, contentWidth, tHeaderH, 5, 5, "F");
      doc.setTextColor(33, 37, 51);
      doc.text(tHeader + " (cont.)", margin + secPadding, y + tHeaderH - 8);
      y += tHeaderH + 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setLineHeightFactor(lineHeight);
    }
  }

  doc.save("ClinicalSummary.pdf");
};