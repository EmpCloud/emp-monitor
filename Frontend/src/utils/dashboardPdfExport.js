import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Use the shared logo loader from pdfBrand so the combined dashboard
// report and every other report PDF resolve the EmpMonitor logo the
// same way (via an <Image> element + canvas, which is reliable across
// production CSP / asset-routing setups where fetch was silently
// failing and leaving PDFs without a logo).
import { loadLogoDataUrl } from "./pdfBrand";

const slugify = (s) =>
  (s || "report")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

// ── Brand colors ────────────────────────────────────────────────────
// Aligned with the live dashboard (blue-500 / slate-50 surfaces) — the
// previous blue-600 + slate-100 combo printed noticeably darker than
// what users see on screen.
const BRAND = {
  primary: [59, 130, 246],    // #3B82F6 — blue-500
  primarySoft: [219, 234, 254], // #DBEAFE — blue-100
  accent: [16, 185, 129],     // emerald-500
  text: [15, 23, 42],         // slate-900
  muted: [100, 116, 139],     // slate-500
  subtle: [148, 163, 184],    // slate-400
  hairline: [226, 232, 240],  // slate-200
  band: [248, 250, 252],      // slate-50
};

// ── Capture-mode helpers ───────────────────────────────────────────
// We need two things at once:
//   1. Expand scrollable inner lists so all rows are captured (tables
//      that have 10+ rows but only 4–5 visible due to overflow-y-auto).
//   2. Preserve the rendered height of any flex-1 chart container, so
//      amCharts/apexcharts charts don't collapse to 0 when the card's
//      fixed h-[600px] is relaxed.
const isScrollContainer = (el) =>
  /\boverflow-y-(auto|scroll)\b|\boverflow-auto\b/.test(el.className || "");

const prepareCardForCapture = (target) => {
  target.classList.add("emp-pdf-capturing");
  const restore = [];

  // Lock chart-like flex children to their current pixel height so they
  // don't collapse when we relax the parent's h-[600px].
  target.querySelectorAll('[class*="flex-1"]').forEach((el) => {
    if (isScrollContainer(el)) return; // scroll containers are grown, not locked
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) return;
    restore.push({ el, style: el.style.cssText });
    el.style.height = `${rect.height}px`;
    el.style.minHeight = `${rect.height}px`;
    el.style.flexGrow = "0";
    el.style.flexShrink = "0";
  });

  // Expand any internal scroll containers so all rows are captured.
  target.querySelectorAll(".overflow-y-auto, .overflow-auto").forEach((el) => {
    restore.push({ el, style: el.style.cssText });
    el.style.maxHeight = "none";
    el.style.height = "auto";
    el.style.overflow = "visible";
    el.scrollTop = 0;
  });

  // Let the outer card grow so its visible area contains all rows.
  restore.push({ el: target, style: target.style.cssText });
  target.style.maxHeight = "none";
  target.style.height = "auto";
  target.style.overflow = "visible";

  return restore;
};

const restoreCard = (target, restore) => {
  if (Array.isArray(restore)) {
    restore.forEach(({ el, style }) => {
      el.style.cssText = style;
    });
  }
  target.classList.remove("emp-pdf-capturing");
};

// URL → PNG data URL cache. The same dicebear avatar (seed=emp) is
// reused across many cards in the combined report; rasterizing once
// and reusing the result cuts seconds off generation.
const rasterCache = new Map();
const inflight = new Map();

const rasterizeImageToPng = (url, size = 96) => {
  if (rasterCache.has(url)) return Promise.resolve(rasterCache.get(url));
  if (inflight.has(url)) return inflight.get(url);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => {
      try {
        const w = img.naturalWidth || size;
        const h = img.naturalHeight || size;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/png");
        rasterCache.set(url, dataUrl);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = url;
  }).finally(() => inflight.delete(url));
  inflight.set(url, promise);
  return promise;
};

// Preload every <img> in the target as a PNG data URL so html2canvas
// captures the fully-decoded raster image (avoids the SVG-canvas-taint
// and not-yet-loaded races that left dicebear avatars blank).
const preloadImages = async (target) => {
  const restore = [];
  const imgs = Array.from(target.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.src || img.getAttribute("src") || "";
      if (!src || src.startsWith("data:image/png")) return;
      try {
        const dataUrl = await rasterizeImageToPng(src);
        restore.push({ img, originalSrc: src });
        img.removeAttribute("srcset");
        img.src = dataUrl;
        // Wait for the browser to actually decode the freshly-set data
        // URL. Without this html2canvas can read the <img> before the
        // pixel data is ready and the avatar renders blank in the PDF.
        if (typeof img.decode === "function") {
          try { await img.decode(); } catch {}
        } else {
          // Older browsers: fall back to a load-event promise.
          await new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve();
            const done = () => {
              img.removeEventListener("load", done);
              img.removeEventListener("error", done);
              resolve();
            };
            img.addEventListener("load", done);
            img.addEventListener("error", done);
          });
        }
      } catch {
        // Network / CORS / decode failure — leave original src alone so
        // the live UI keeps working; the avatar may render blank in the
        // PDF for this row but the rest of the report is unaffected.
      }
    })
  );
  return restore;
};

const restoreImages = (restore) => {
  if (!Array.isArray(restore)) return;
  restore.forEach(({ img, originalSrc }) => {
    img.src = originalSrc;
  });
};

/**
 * Generate a polished native PDF report for a dashboard module.
 *
 * Text is rendered with jsPDF/autoTable so it's selectable and crisp.
 * No html2canvas is used when structured data is provided, which avoids
 * the cropping + low-quality "screenshot inside PDF" look. The chart
 * card's screenshot is only used as a last-resort visual fallback.
 */
export const generateModulePdf = async ({
  title = "Dashboard Report",
  subtitle,
  target,
  data,
  columns,
  meta,
  fileName,
  includeVisual = true,
}) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - 2 * margin;

  // ── Header band ───────────────────────────────────────────────
  doc.setFillColor(...BRAND.band);
  doc.rect(0, 0, pageWidth, 84, "F");

  const logo = await loadLogoDataUrl();
  if (logo) {
    doc.addImage(logo, "PNG", margin, 22, 118, 38);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BRAND.text);
  doc.text(title, pageWidth - margin, 38, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    `Generated ${new Date().toLocaleString()}`,
    pageWidth - margin,
    56,
    { align: "right" }
  );

  // Brand accent stripe
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 84, pageWidth, 3, "F");

  let cursorY = 110;

  // ── Subtitle ──────────────────────────────────────────────────
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...BRAND.muted);
    const wrapped = doc.splitTextToSize(subtitle, contentWidth);
    doc.text(wrapped, margin, cursorY);
    cursorY += wrapped.length * 13 + 6;
  }

  // ── Meta summary card (key/value chip block) ─────────────────
  const metaEntries =
    meta && typeof meta === "object"
      ? Object.entries(meta).filter(([, v]) => v != null && v !== "")
      : [];

  const hasData =
    Array.isArray(data) && Array.isArray(columns) && columns.length > 0;
  const rowCount = hasData ? data.length : 0;

  if (metaEntries.length || hasData) {
    const summaryStartY = cursorY;
    const colCount = 2;
    const rowsNeeded = Math.max(1, Math.ceil(metaEntries.length / colCount));
    const metaRowHeight = 28;
    const padding = 16;
    const badgeHeight = 56;
    const blockHeight = Math.max(
      badgeHeight + padding,
      rowsNeeded * metaRowHeight + padding * 1.5
    );

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BRAND.hairline);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, summaryStartY, contentWidth, blockHeight, 6, 6, "FD");

    // Left chunk: row count badge — vertically centered
    const badgeY = summaryStartY + (blockHeight - badgeHeight) / 2;
    doc.setFillColor(...BRAND.primary);
    doc.roundedRect(margin + 12, badgeY, 76, badgeHeight, 5, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text(String(rowCount), margin + 50, badgeY + 30, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("RECORDS", margin + 50, badgeY + 44, { align: "center" });

    // Right chunk: meta key/value grid (2 columns, dynamic rows)
    if (metaEntries.length) {
      const startX = margin + 104;
      const innerW = contentWidth - 116;
      const colW = innerW / colCount;
      const gridStartY = summaryStartY + padding;

      metaEntries.forEach(([k, v], i) => {
        const col = i % colCount;
        const row = Math.floor(i / colCount);
        const x = startX + col * colW;
        const y = gridStartY + row * metaRowHeight;

        // Label
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...BRAND.subtle);
        doc.text(String(k).toUpperCase(), x, y);

        // Value (truncate to column width, single line)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...BRAND.text);
        const wrapped = doc.splitTextToSize(String(v), colW - 10);
        doc.text(wrapped[0] || "-", x, y + 12);
      });
    }
    cursorY = summaryStartY + blockHeight + 20;
  }

  // ── Visual snapshot (chart/graph) ──────────────────────────────
  // Captured BEFORE the data table so charts and graphs appear above
  // the records. Skipped when includeVisual=false or no DOM target.
  if (includeVisual && target) {
    const restore = prepareCardForCapture(target);
    const imgRestore = await preloadImages(target);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(target, {
        backgroundColor: "#ffffff",
        scale: 1.5,
        useCORS: true,
        logging: false,
        imageTimeout: 0,
      });
      const imgData = canvas.toDataURL("image/png");

      // Section heading
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(...BRAND.text);
      doc.text("Visual Overview", margin, cursorY);
      doc.setDrawColor(...BRAND.primary);
      doc.setLineWidth(1.5);
      doc.line(margin, cursorY + 4, margin + 90, cursorY + 4);
      cursorY += 14;

      const imgWidthFull = contentWidth;
      const naturalHeight = (canvas.height * imgWidthFull) / canvas.width;
      // Leave at least 200pt for the table below; cap visual at 320pt.
      const availableForVisual = pageHeight - cursorY - 240;
      const maxHeight = Math.min(320, Math.max(160, availableForVisual));
      const drawHeight = Math.min(naturalHeight, maxHeight);
      const drawWidth =
        naturalHeight > maxHeight
          ? (canvas.width * drawHeight) / canvas.height
          : imgWidthFull;
      const offsetX = margin + (imgWidthFull - drawWidth) / 2;
      doc.addImage(imgData, "PNG", offsetX, cursorY, drawWidth, drawHeight);
      cursorY += drawHeight + 20;
    } catch (err) {
      console.warn("PDF visual capture failed:", err);
    } finally {
      restoreImages(imgRestore);
      restoreCard(target, restore);
    }
  }

  // ── Data table (native text — selectable) ────────────────────
  if (hasData && data.length > 0) {
    // If we're already near the bottom from the visual, start the table
    // on a fresh page so it isn't cramped.
    if (cursorY > pageHeight - 200) {
      doc.addPage();
      cursorY = margin + 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...BRAND.text);
    doc.text("Detailed Records", margin, cursorY);
    doc.setDrawColor(...BRAND.primary);
    doc.setLineWidth(1.5);
    doc.line(margin, cursorY + 4, margin + 90, cursorY + 4);
    cursorY += 14;

    const headers = columns.map((c) => c.header);
    const body = data.map((row, rowIdx) =>
      columns.map((c) => {
        const val =
          typeof c.render === "function"
            ? c.render(row, rowIdx + 1)
            : row?.[c.accessor];
        return val == null || val === "" ? "-" : String(val);
      })
    );

    const columnStyles = {};
    columns.forEach((c, i) => {
      if (c.width) columnStyles[i] = { cellWidth: c.width };
    });

    autoTable(doc, {
      startY: cursorY,
      head: [headers],
      body,
      theme: "grid",
      headStyles: {
        fillColor: BRAND.primary,
        textColor: 255,
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: 7,
        halign: "left",
        lineColor: BRAND.primary,
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 6,
        textColor: BRAND.text,
        lineColor: BRAND.hairline,
        lineWidth: 0.4,
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles,
      margin: { left: margin, right: margin },
    });
  } else if (hasData && data.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.muted);
    doc.text("No data available for the selected filters.", margin, cursorY + 6);
    cursorY += 24;
  }

  // ── Footer (page numbers + brand) ────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...BRAND.hairline);
    doc.setLineWidth(0.5);
    doc.line(margin, ph - 28, pageWidth - margin, ph - 28);
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.subtle);
    doc.text("EmpMonitor • Your Workforce Productivity Compass", margin, ph - 14);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, ph - 14, {
      align: "right",
    });
  }

  doc.save(
    fileName || `${slugify(title)}-${new Date().toISOString().slice(0, 10)}.pdf`
  );
};

// ── Module section renderer (used by combined PDF) ────────────────
// Renders a single module's header + summary + visual + table into an
// already-open jsPDF doc, starting at the current page top. Returns the
// final cursorY (mostly informational; combined caller starts each new
// module on a fresh page).
const renderModuleSection = async (
  doc,
  { title, subtitle, target, data, columns, meta, includeVisual = true }
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - 2 * margin;

  // Module title strip (compact — not the full logo band; the cover
  // page already has the EmpMonitor branding)
  doc.setFillColor(...BRAND.band);
  doc.rect(0, 0, pageWidth, 46, "F");
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 46, pageWidth, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.text);
  doc.text(title || "Module", margin, 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    new Date().toLocaleString(),
    pageWidth - margin,
    30,
    { align: "right" }
  );

  let cursorY = 70;

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.muted);
    const wrapped = doc.splitTextToSize(subtitle, contentWidth);
    doc.text(wrapped, margin, cursorY);
    cursorY += wrapped.length * 13 + 6;
  }

  // Summary card
  const metaEntries =
    meta && typeof meta === "object"
      ? Object.entries(meta).filter(([, v]) => v != null && v !== "")
      : [];
  const hasData =
    Array.isArray(data) && Array.isArray(columns) && columns.length > 0;
  const rowCount = hasData ? data.length : 0;

  if (metaEntries.length || hasData) {
    const summaryStartY = cursorY;
    const colCount = 2;
    const rowsNeeded = Math.max(1, Math.ceil(metaEntries.length / colCount));
    const metaRowHeight = 28;
    const padding = 16;
    const badgeHeight = 56;
    const blockHeight = Math.max(
      badgeHeight + padding,
      rowsNeeded * metaRowHeight + padding * 1.5
    );

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BRAND.hairline);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, summaryStartY, contentWidth, blockHeight, 6, 6, "FD");

    const badgeY = summaryStartY + (blockHeight - badgeHeight) / 2;
    doc.setFillColor(...BRAND.primary);
    doc.roundedRect(margin + 12, badgeY, 76, badgeHeight, 5, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text(String(rowCount), margin + 50, badgeY + 30, { align: "center" });
    doc.setFontSize(7);
    doc.text("RECORDS", margin + 50, badgeY + 44, { align: "center" });

    if (metaEntries.length) {
      const startX = margin + 104;
      const innerW = contentWidth - 116;
      const colW = innerW / colCount;
      const gridStartY = summaryStartY + padding;
      metaEntries.forEach(([k, v], i) => {
        const col = i % colCount;
        const row = Math.floor(i / colCount);
        const x = startX + col * colW;
        const y = gridStartY + row * metaRowHeight;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...BRAND.subtle);
        doc.text(String(k).toUpperCase(), x, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...BRAND.text);
        const wrapped = doc.splitTextToSize(String(v), colW - 10);
        doc.text(wrapped[0] || "-", x, y + 12);
      });
    }
    cursorY = summaryStartY + blockHeight + 18;
  }

  // Visual snapshot
  if (includeVisual && target) {
    const restore = prepareCardForCapture(target);
    const imgRestore = await preloadImages(target);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(target, {
        backgroundColor: "#ffffff",
        scale: 1.5,
        useCORS: true,
        logging: false,
        imageTimeout: 0,
      });
      const imgData = canvas.toDataURL("image/png");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BRAND.text);
      doc.text("Visual Overview", margin, cursorY);
      doc.setDrawColor(...BRAND.primary);
      doc.setLineWidth(1.5);
      doc.line(margin, cursorY + 4, margin + 90, cursorY + 4);
      cursorY += 14;

      const imgWidthFull = contentWidth;
      const naturalHeight = (canvas.height * imgWidthFull) / canvas.width;
      const availableForVisual = pageHeight - cursorY - 240;
      const maxHeight = Math.min(280, Math.max(140, availableForVisual));
      const drawHeight = Math.min(naturalHeight, maxHeight);
      const drawWidth =
        naturalHeight > maxHeight
          ? (canvas.width * drawHeight) / canvas.height
          : imgWidthFull;
      const offsetX = margin + (imgWidthFull - drawWidth) / 2;
      doc.addImage(imgData, "PNG", offsetX, cursorY, drawWidth, drawHeight);
      cursorY += drawHeight + 18;
    } catch (err) {
      console.warn("Combined PDF: visual capture failed:", err);
    } finally {
      restoreImages(imgRestore);
      restoreCard(target, restore);
    }
  }

  // Detailed Records table
  if (hasData && data.length > 0) {
    if (cursorY > pageHeight - 180) {
      doc.addPage();
      cursorY = margin + 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.text);
    doc.text("Detailed Records", margin, cursorY);
    doc.setDrawColor(...BRAND.primary);
    doc.setLineWidth(1.5);
    doc.line(margin, cursorY + 4, margin + 90, cursorY + 4);
    cursorY += 14;

    const headers = columns.map((c) => c.header);
    const body = data.map((row, rowIdx) =>
      columns.map((c) => {
        const val =
          typeof c.render === "function"
            ? c.render(row, rowIdx + 1)
            : row?.[c.accessor];
        return val == null || val === "" ? "-" : String(val);
      })
    );
    const columnStyles = {};
    columns.forEach((c, i) => {
      if (c.width) columnStyles[i] = { cellWidth: c.width };
    });

    autoTable(doc, {
      startY: cursorY,
      head: [headers],
      body,
      theme: "grid",
      headStyles: {
        fillColor: BRAND.primary,
        textColor: 255,
        fontStyle: "bold",
        fontSize: 9,
        cellPadding: 7,
        lineColor: BRAND.primary,
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 6,
        textColor: BRAND.text,
        lineColor: BRAND.hairline,
        lineWidth: 0.4,
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles,
      margin: { left: margin, right: margin },
    });
  } else if (hasData && data.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.muted);
    doc.text("No data available for this section.", margin, cursorY + 6);
  }
};

/**
 * Generate one combined PDF containing every dashboard module.
 *
 * @param {Object} opts
 * @param {string} [opts.title]    Overall report title (cover page)
 * @param {string} [opts.subtitle] Subtitle on the cover page
 * @param {Array}  opts.modules    Array of module configs (same shape as generateModulePdf args)
 * @param {string} [opts.fileName]
 */
export const generateCombinedDashboardPdf = async ({
  title = "EmpMonitor Dashboard Report",
  subtitle = "Consolidated view of every dashboard module for the selected period.",
  modules = [],
  fileName,
}) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  // ── Cover page ────────────────────────────────────────────────
  doc.setFillColor(...BRAND.band);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, pageWidth, 6, "F");
  doc.rect(0, pageHeight - 6, pageWidth, 6, "F");

  const logo = await loadLogoDataUrl();
  if (logo) {
    const logoW = 220;
    const logoH = 72;
    doc.addImage(
      logo,
      "PNG",
      (pageWidth - logoW) / 2,
      pageHeight / 3 - logoH / 2,
      logoW,
      logoH
    );
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...BRAND.text);
  doc.text(title, pageWidth / 2, pageHeight / 2 + 10, { align: "center" });

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND.muted);
    const wrapped = doc.splitTextToSize(subtitle, pageWidth - 160);
    doc.text(wrapped, pageWidth / 2, pageHeight / 2 + 36, { align: "center" });
  }

  // Stats strip
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.muted);
  doc.text(
    `Generated ${new Date().toLocaleString()}`,
    pageWidth / 2,
    pageHeight - 80,
    { align: "center" }
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.primary);
  doc.text(
    `${modules.length} module${modules.length === 1 ? "" : "s"} included`,
    pageWidth / 2,
    pageHeight - 60,
    { align: "center" }
  );

  // ── Table of contents (if more than 2 modules) ────────────────
  if (modules.length > 1) {
    doc.addPage();
    doc.setFillColor(...BRAND.band);
    doc.rect(0, 0, pageWidth, 46, "F");
    doc.setFillColor(...BRAND.primary);
    doc.rect(0, 46, pageWidth, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...BRAND.text);
    doc.text("Table of Contents", margin, 30);

    let tocY = 80;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    modules.forEach((m, i) => {
      doc.setTextColor(...BRAND.primary);
      doc.text(`${String(i + 1).padStart(2, "0")}.`, margin, tocY);
      doc.setTextColor(...BRAND.text);
      doc.text(m.title || `Module ${i + 1}`, margin + 30, tocY);
      tocY += 22;
      if (tocY > pageHeight - 60) {
        doc.addPage();
        tocY = margin + 20;
      }
    });
  }

  // ── Each module on its own page ───────────────────────────────
  for (const mod of modules) {
    doc.addPage();
    await renderModuleSection(doc, mod);
  }

  // ── Footer on every page ──────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BRAND.hairline);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28);
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.subtle);
    doc.text("EmpMonitor • Your Workforce Productivity Compass", margin, pageHeight - 14);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 14, {
      align: "right",
    });
  }

  doc.save(
    fileName ||
      `empmonitor-dashboard-report-${new Date().toISOString().slice(0, 10)}.pdf`
  );
};
