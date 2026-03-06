// app/dashboard/utils/pdfGenerator.js
import jsPDF from "jspdf";

// Decode HTML entities like &quot; &#x27; &amp; &lt; &gt; etc.
const decodeHtml = (str) => {
  if (!str) return str;
  if (typeof document !== "undefined") {
    const el = document.createElement("textarea");
    el.innerHTML = str;
    return el.value;
  }
  // SSR fallback: handle common entities manually
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&apos;/g, "'");
};


// Generate PDF for Discharge Summary (uses provided section order)
export const generateDischargePDF = async (sections) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 36;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 1.35;
  const secHeaderH = 30;
  const secPadding = 10;

  let y = margin;

  const paginateIfNeeded = (needed, topPad = 0) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin + topPad;
    }
  };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Discharge Summary", pageWidth / 2, margin + 10, { align: "center" });
  y += 24;

  // Render sections in the order provided by the object
  Object.keys(sections || {}).forEach((key) => {
    const section = sections[key];
    if (!section) return;

    // Section header
    const headerH = secHeaderH;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);

    // Content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setLineHeightFactor(lineHeight);
    const rawContent = section.content && section.content.trim() ? section.content : "Not specified.";
    const transcriptText = ""; // Not used
    const text = decodeHtml(rawContent);
    const wrapped = doc.splitTextToSize(text, contentWidth - secPadding * 2);
    const lines = wrapped.length;
    const fontSize = 12;
    const textHeight = (lines * fontSize * lineHeight - fontSize * (lineHeight - 1)) / doc.internal.scaleFactor;

    const contentBoxH = textHeight + secPadding * 2;
    const blockH = headerH + 8 + contentBoxH;

    paginateIfNeeded(blockH);

    doc.setFillColor(210);
    doc.roundedRect(margin, y, contentWidth, headerH, 5, 5, "F");
    doc.setTextColor(0, 0, 0); // Pure black
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(decodeHtml(section.title) || "Section", margin + secPadding, y + headerH - 9);
    y += headerH + 8;

    doc.setFillColor(245);
    doc.roundedRect(margin, y, contentWidth, contentBoxH, 5, 5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12); // Increased
    doc.setTextColor(0, 0, 0);
    doc.text(wrapped, margin + secPadding, y + secPadding + 10);
    y += contentBoxH + 16;
  });

  doc.save("DischargeSummary.pdf");
};

// Generate PDF for Summary Only (no transcript)
export const generateSummaryOnlyPDF = async (sections, customTitle = "Clinical Summary") => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 36;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 1.35;
  const secHeaderH = 30;
  const secPadding = 10;

  const paginateIfNeeded = (needed) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
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
  doc.text(customTitle, pageWidth / 2, margin + 24, { align: "center" });

  // Top rule
  doc.setLineWidth(0.5);
  doc.setDrawColor(200);
  doc.line(margin, margin + 34, pageWidth - margin, margin + 34);

  let y = margin + 52;

  Object.keys(sections || {}).forEach((key) => {
    const section = sections[key];
    if (!section) return;

    // Prepare content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setLineHeightFactor(lineHeight);
    const rawContent = section.content && section.content.trim() ? section.content : "Not specified in the transcript.";
    const text = decodeHtml(rawContent);
    const wrapped = doc.splitTextToSize(text, contentWidth - secPadding * 2);
    const lines = wrapped.length;
    const fontSize = 12; // Increased
    const textHeight = (lines * fontSize * lineHeight - fontSize * (lineHeight - 1)) / doc.internal.scaleFactor;

    const contentBoxH = textHeight + secPadding * 2;
    const blockH = secHeaderH + 8 + contentBoxH;

    paginateIfNeeded(blockH);

    // Header box
    doc.setFillColor(210);
    doc.roundedRect(margin, y, contentWidth, secHeaderH, 5, 5, "F");
    doc.setTextColor(0, 0, 0); // Pure black
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(decodeHtml(section.title) || "Section", margin + secPadding, y + secHeaderH - 9);
    y += secHeaderH + 8;

    // Content box
    doc.setFillColor(245);
    doc.roundedRect(margin, y, contentWidth, contentBoxH, 5, 5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12); // Increased
    doc.setTextColor(0, 0, 0);
    doc.text(wrapped, margin + secPadding, y + secPadding + 10);
    y += contentBoxH + 16;
  });

  const fileName = customTitle.replace(/\s+/g, '') + ".pdf";
  doc.save(fileName);
};

// Generate PDF for Transcript Only (no summary sections)
export const generateTranscriptOnlyPDF = async (transcript) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 36;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 1.35;
  const secHeaderH = 26;
  const secPadding = 10;

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
  doc.text("Transcript", pageWidth / 2, margin + 24, { align: "center" });

  // Top rule
  doc.setLineWidth(0.5);
  doc.setDrawColor(200);
  doc.line(margin, margin + 34, pageWidth - margin, margin + 34);

  let y = margin + 52;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setLineHeightFactor(lineHeight);

  const transcriptText = transcript && transcript.trim() ? decodeHtml(transcript) : "Transcript will appear here...";
  const tWrapped = doc.splitTextToSize(transcriptText, contentWidth - secPadding * 2);
  const tLineH = (12 * lineHeight) / doc.internal.scaleFactor;

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
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setFillColor(230);
      doc.roundedRect(margin, y, contentWidth, secHeaderH, 5, 5, "F");
      doc.setTextColor(33, 37, 51);
      doc.text("Transcript (cont.)", margin + secPadding, y + secHeaderH - 8);
      y += secHeaderH + 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setLineHeightFactor(lineHeight);
    }
  }

  doc.save("Transcript.pdf");
};