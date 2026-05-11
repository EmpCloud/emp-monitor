import { jsPDF } from "jspdf";
import logoUrl from "@/assets/emp.png";

// Shared EmpMonitor brand palette for all report PDFs.
// Primary mirrors the live dashboard's blue-500 (Tailwind) — the same
// hue used on Top Bar accents, primary buttons, stat badges and the
// "View Report" links. Anything darker than this drifts away from the
// dashboard's actual on-screen tone.
export const PDF_BRAND = {
  primary: [59, 130, 246],    // #3B82F6 — blue-500 (matches dashboard)
  primarySoft: [219, 234, 254], // #DBEAFE — blue-100 (chips / soft fills)
  text: [15, 23, 42],         // slate-900
  muted: [100, 116, 139],     // slate-500
  subtle: [148, 163, 184],    // slate-400
  hairline: [226, 232, 240],  // slate-200
  band: [248, 250, 252],      // slate-50 (lighter, less heavy than slate-100)
};

// Rasterize the EmpMonitor logo asset to a PNG data URL via an off-DOM
// canvas. The previous fetch+FileReader approach silently failed on
// some production deploys (CSP, asset routing, etc.) which is why the
// branded header dropped the logo. Using an <Image> element bypasses
// those issues — the same approach used for dashboard avatars.
let cachedLogoDataUrl = null;
let logoInflight = null;
export const loadLogoDataUrl = () => {
  if (cachedLogoDataUrl) return Promise.resolve(cachedLogoDataUrl);
  if (logoInflight) return logoInflight;

  logoInflight = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      try {
        const w = img.naturalWidth || 220;
        const h = img.naturalHeight || 72;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        cachedLogoDataUrl = canvas.toDataURL("image/png");
        resolve(cachedLogoDataUrl);
      } catch {
        resolve(null);
      } finally {
        logoInflight = null;
      }
    };
    img.onerror = () => {
      logoInflight = null;
      resolve(null);
    };
    img.src = logoUrl;
  });

  return logoInflight;
};

/**
 * Create a jsPDF instance, draw the standard branded header band
 * (logo + title + generated timestamp + accent stripe), and return
 * { doc, pageWidth, pageHeight, margin, contentWidth, cursorY }.
 *
 * Used by every report PDF export so they share a single visual
 * identity tied to the dashboard theme.
 */
export const createBrandedPdf = async ({
  title,
  orientation = "landscape",
  format = "a4",
}) => {
  const doc = new jsPDF({ orientation, unit: "pt", format });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - 2 * margin;

  // Header band
  doc.setFillColor(...PDF_BRAND.band);
  doc.rect(0, 0, pageWidth, 70, "F");

  const logo = await loadLogoDataUrl();
  if (logo) doc.addImage(logo, "PNG", margin, 18, 100, 32);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...PDF_BRAND.text);
  doc.text(title || "Report", pageWidth - margin, 32, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_BRAND.muted);
  doc.text(`Generated ${new Date().toLocaleString()}`, pageWidth - margin, 48, {
    align: "right",
  });

  // Accent stripe
  doc.setFillColor(...PDF_BRAND.primary);
  doc.rect(0, 70, pageWidth, 2.5, "F");

  return { doc, pageWidth, pageHeight, margin, contentWidth, cursorY: 90 };
};

/**
 * Draw the standard summary card (records badge + meta key/value grid).
 * Returns the new cursorY after the card.
 *
 * @param {Object} opts
 * @param {jsPDF} opts.doc
 * @param {number} opts.cursorY            Y position to start at
 * @param {number} opts.pageWidth
 * @param {number} opts.margin
 * @param {number} opts.contentWidth
 * @param {number} opts.recordCount        Number shown in the badge
 * @param {Array<[string,string]>} opts.entries  Meta key/value pairs
 * @param {number} [opts.cols=3]           Meta grid column count
 */
export const drawSummaryCard = ({
  doc,
  cursorY,
  pageWidth,
  margin,
  contentWidth,
  recordCount,
  entries = [],
  cols = 3,
}) => {
  const rowsNeeded = Math.max(1, Math.ceil(entries.length / cols));
  const metaRowHeight = 24;
  const blockHeight = Math.max(60, rowsNeeded * metaRowHeight + 22);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PDF_BRAND.hairline);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, cursorY, contentWidth, blockHeight, 6, 6, "FD");

  // Badge
  const badgeH = 44;
  const badgeY = cursorY + (blockHeight - badgeH) / 2;
  doc.setFillColor(...PDF_BRAND.primary);
  doc.roundedRect(margin + 12, badgeY, 80, badgeH, 5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(String(recordCount ?? 0), margin + 52, badgeY + 22, { align: "center" });
  doc.setFontSize(7);
  doc.text("RECORDS", margin + 52, badgeY + 36, { align: "center" });

  // Meta grid
  const metaStartX = margin + 108;
  const metaInnerW = contentWidth - 120;
  const metaColW = metaInnerW / cols;
  const metaGridY = cursorY + 14;
  entries.forEach(([k, v], i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = metaStartX + col * metaColW;
    const y = metaGridY + row * metaRowHeight;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_BRAND.subtle);
    doc.text(String(k).toUpperCase(), x, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...PDF_BRAND.text);
    const wrapped = doc.splitTextToSize(String(v ?? "-"), metaColW - 8);
    doc.text(wrapped[0] || "-", x, y + 10);
  });

  return cursorY + blockHeight + 16;
};

/**
 * Draw the "Section Heading" with the accent underline used in
 * dashboard report sections.
 */
export const drawSectionHeading = (doc, text, x, y) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PDF_BRAND.text);
  doc.text(text, x, y);
  doc.setDrawColor(...PDF_BRAND.primary);
  doc.setLineWidth(1.5);
  doc.line(x, y + 4, x + 90, y + 4);
  return y + 14;
};

/** Adaptive autoTable style block sized by column count. */
export const adaptiveTableStyles = (colCount) => {
  const font =
    colCount > 14 ? 6.2 :
    colCount > 11 ? 7   :
    colCount > 8  ? 7.8 : 8.5;
  const pad =
    colCount > 14 ? 2.5 :
    colCount > 11 ? 3   :
    colCount > 8  ? 3.5 : 5;
  return {
    headStyles: {
      fillColor: PDF_BRAND.primary,
      textColor: 255,
      fontStyle: "bold",
      fontSize: font,
      cellPadding: pad + 2,
      lineColor: PDF_BRAND.primary,
      halign: "left",
    },
    bodyStyles: {
      fontSize: font,
      cellPadding: pad,
      textColor: PDF_BRAND.text,
      lineColor: PDF_BRAND.hairline,
      lineWidth: 0.3,
      overflow: "linebreak",
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  };
};

/** Branded footer on every page (hairline + tagline + page numbers). */
export const drawFooter = (doc, { margin, pageWidth }) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...PDF_BRAND.hairline);
    doc.setLineWidth(0.4);
    doc.line(margin, ph - 26, pageWidth - margin, ph - 26);
    doc.setFontSize(8);
    doc.setTextColor(...PDF_BRAND.subtle);
    doc.text(
      "EmpMonitor • Your Workforce Productivity Compass",
      margin,
      ph - 12
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, ph - 12, {
      align: "right",
    });
  }
};
