// /api/driver-application — receives a driver application form POST, generates
// a styled PDF of the submission, and emails it to recruiting via Resend.
//
// Required environment variable in Vercel project settings:
//   RESEND_API_KEY  — get one at https://resend.com/api-keys
//
// Optional (defaults shown):
//   APPLICATION_TO_EMAIL   = "imsexpress09@gmail.com"
//   APPLICATION_FROM_EMAIL = "IMS Express LLC <onboarding@resend.dev>"
//
// Until you verify a custom domain on Resend, leave the From as the default.
// Once your domain is verified, set APPLICATION_FROM_EMAIL to e.g.
// "IMS Express LLC <noreply@imsexpressllc.com>".

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Resend } from "resend";

const TO_EMAIL = process.env.APPLICATION_TO_EMAIL || "imsexpress09@gmail.com";
const FROM_EMAIL =
  process.env.APPLICATION_FROM_EMAIL ||
  "IMS Express LLC <onboarding@resend.dev>";

// Brand palette — matches the website
const INK = rgb(0.055, 0.055, 0.055);   // #0e0e0e
const INK_2 = rgb(0.227, 0.227, 0.215); // #3a3a37
const PAPER = rgb(0.957, 0.945, 0.918); // #f4f1ea
const AMBER = rgb(0.961, 0.62, 0.043);  // #f59e0b
const RULE = rgb(0.838, 0.823, 0.78);   // #d6d2c7

// Sections shown on the PDF (in order). For each field: label + the form key.
const SECTIONS = [
  {
    title: "APPLICANT INFORMATION",
    fields: [
      ["First Name", "firstName"],
      ["Last Name", "lastName"],
      ["Phone", "phone"],
      ["Email", "email"],
      ["Date of Birth", "dob"],
      ["Current Street Address", "address1"],
      ["Address Line 2", "address2"],
      ["City", "city"],
      ["State", "state"],
      ["ZIP Code", "zip"],
      ["How long at current address?", "addressDuration"],
    ],
  },
  {
    title: "POSITION & AVAILABILITY",
    fields: [
      ["Position applying for", "position"],
      ["Preferred Start Date", "startDate"],
      ["Legally eligible to work in the U.S.?", "workAuth"],
      ["Current employment status", "employmentStatus"],
    ],
  },
  {
    title: "CDL & COMPLIANCE",
    fields: [
      ["CDL Class", "cdlClass"],
      ["CDL State / Issuing Authority", "cdlState"],
      ["CDL Number", "cdlNumber"],
      ["CDL Expiration Date", "cdlExpiration"],
      ["DOT Medical Card Expiration", "medCardExpiration"],
      ["TWIC card status", "twic"],
      ["Endorsements", "endorsements"],
    ],
  },
  {
    title: "HEAVY HAUL & EQUIPMENT EXPERIENCE",
    fields: [
      ["Total CDL experience (years)", "experienceYears"],
      ["Oversized / heavy haul experience (years)", "heavyHaulYears"],
      ["Straight truck experience", "expStraightTruck"],
      ["Tractor and semi-trailer experience", "expTractorSemi"],
      ["RGN / RGNE experience", "expStepDeck"],
      ["RGN / lowboy experience", "expRgnLowboy"],
    ],
  },
  {
    title: "SAFETY & RECORD",
    fields: [
      ["Moving violations in last 3 years", "violations3Years"],
      ["Preventable accidents in last 3 years", "accidents3Years"],
      ["Any DUI/DWI ever?", "duiHistory"],
      ["Any license suspensions in last 5 years?", "suspensions5Years"],
      ["Safety explanation", "safetyExplanation"],
    ],
  },
  {
    title: "CONSENT & SIGNATURE",
    fields: [
      ["Background check authorization", "consentBackground"],
      ["Information accuracy certification", "consentAccuracy"],
      ["Applicant signature (typed)", "signature"],
      ["Signature date", "signatureDate"],
    ],
  },
];

function fmtValue(v) {
  if (v === undefined || v === null || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (v === true || v === "true" || v === "on") return "Yes";
  if (v === false || v === "false") return "No";
  return String(v);
}

// Wraps text into multiple lines that fit within a max width
function wrapLines(text, font, size, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";
  for (const w of words) {
    const test = current ? current + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function buildPDF(data) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(
    `Driver Application — ${data.firstName || ""} ${data.lastName || ""}`.trim()
  );
  pdf.setAuthor("IMS Express LLC");
  pdf.setSubject("Driver Application Submission");

  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Letter size, in points (72pt = 1 inch)
  const W = 612;
  const H = 792;
  const margin = 48;
  const contentW = W - margin * 2;

  let page = pdf.addPage([W, H]);
  let y = H;

  // ---------- Brand header ----------
  // Solid dark band at top
  page.drawRectangle({
    x: 0, y: H - 90, width: W, height: 90, color: INK,
  });
  // Amber accent bar
  page.drawRectangle({
    x: 0, y: H - 96, width: W, height: 6, color: AMBER,
  });

  // Wordmark "IMS EXPRESS LLC"
  page.drawText("IMS", {
    x: margin, y: H - 50, size: 22, font: helvBold, color: PAPER,
  });
  page.drawText("EXPRESS", {
    x: margin + helvBold.widthOfTextAtSize("IMS ", 22), y: H - 50, size: 22,
    font: helvBold, color: AMBER,
  });
  page.drawText("LLC", {
    x: margin + helvBold.widthOfTextAtSize("IMS EXPRESS ", 22),
    y: H - 50, size: 22, font: helvBold, color: PAPER,
  });

  // Right side: title + timestamp
  const titleStr = "DRIVER APPLICATION";
  const titleW = helvBold.widthOfTextAtSize(titleStr, 14);
  page.drawText(titleStr, {
    x: W - margin - titleW, y: H - 42, size: 14,
    font: helvBold, color: PAPER,
  });
  const ts = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
  const tsStr = `Submitted ${ts} ET`;
  const tsW = helv.widthOfTextAtSize(tsStr, 9);
  page.drawText(tsStr, {
    x: W - margin - tsW, y: H - 60, size: 9,
    font: helv, color: rgb(0.74, 0.71, 0.65),
  });

  y = H - 130;

  // ---------- Applicant name strip ----------
  const fullName =
    `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
    "Unnamed Applicant";
  page.drawText(fullName, {
    x: margin, y: y, size: 24, font: helvBold, color: INK,
  });
  y -= 14;
  const subline = [
    data.email,
    data.phone,
    data.position,
  ].filter(Boolean).join("  ·  ");
  if (subline) {
    page.drawText(subline, {
      x: margin, y: y - 8, size: 10, font: helv, color: INK_2,
    });
    y -= 22;
  } else {
    y -= 8;
  }

  // Hairline rule
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: W - margin, y: y },
    thickness: 0.7,
    color: RULE,
  });
  y -= 24;

  // ---------- Sections ----------
  const labelSize = 8.5;
  const valueSize = 11;
  const lineHeight = 14;
  const colGap = 18;
  const colW = (contentW - colGap) / 2;

  // Inner helpers that mutate `page` and `y`. addPageIfNeeded handles overflow.
  function ensureSpace(needed) {
    if (y - needed < margin) {
      page = pdf.addPage([W, H]);
      y = H - margin;
      // small footer note at top of overflow page
      page.drawText("Driver Application — continued", {
        x: margin, y: H - 24, size: 9,
        font: helv, color: rgb(0.5, 0.48, 0.43),
      });
      y = H - 50;
    }
  }

  function drawSectionHeader(title) {
    ensureSpace(40);
    // Amber tick + uppercase title bar
    page.drawRectangle({
      x: margin, y: y - 12, width: 18, height: 3, color: AMBER,
    });
    page.drawText(title, {
      x: margin + 26, y: y - 14, size: 11,
      font: helvBold, color: INK,
    });
    // bottom rule
    page.drawLine({
      start: { x: margin, y: y - 22 },
      end: { x: W - margin, y: y - 22 },
      thickness: 0.5,
      color: RULE,
    });
    y -= 36;
  }

  function drawField(label, value, columnIdx) {
    const x = margin + columnIdx * (colW + colGap);
    const valueLines = wrapLines(value, helv, valueSize, colW);
    const heightNeeded = 12 + valueLines.length * lineHeight + 6;
    return { x, valueLines, heightNeeded };
  }

  for (const section of SECTIONS) {
    drawSectionHeader(section.title);

    // Long fields (textareas / address) get their own row
    const rows = [];
    let rowBuf = [];
    for (const [label, key] of section.fields) {
      const value = fmtValue(data[key]);
      const isLong = value.length > 60 ||
        ["address1", "safetyExplanation", "permitEscortExperience"].includes(key);
      if (isLong) {
        if (rowBuf.length) { rows.push(rowBuf); rowBuf = []; }
        rows.push([{ label, value, full: true }]);
      } else {
        rowBuf.push({ label, value });
        if (rowBuf.length === 2) {
          rows.push(rowBuf);
          rowBuf = [];
        }
      }
    }
    if (rowBuf.length) rows.push(rowBuf);

    for (const row of rows) {
      // Calculate row height
      let rowHeight = 0;
      const renderable = row.map((cell, i) => {
        const w = cell.full ? contentW : colW;
        const valueLines = wrapLines(cell.value, helv, valueSize, w);
        const cellH = 12 + valueLines.length * lineHeight + 4;
        if (cellH > rowHeight) rowHeight = cellH;
        return { ...cell, valueLines };
      });
      ensureSpace(rowHeight + 8);

      // Draw cells in the row
      renderable.forEach((cell, idx) => {
        const x = cell.full ? margin : margin + idx * (colW + colGap);
        // Label
        page.drawText(cell.label.toUpperCase(), {
          x, y: y, size: labelSize,
          font: helvBold, color: rgb(0.36, 0.35, 0.33),
        });
        // Value lines
        cell.valueLines.forEach((line, i) => {
          page.drawText(line, {
            x, y: y - 14 - i * lineHeight, size: valueSize,
            font: helv, color: INK,
          });
        });
      });
      y -= rowHeight + 4;
    }
    y -= 14;
  }

  // ---------- Footer on last page ----------
  ensureSpace(40);
  page.drawLine({
    start: { x: margin, y: margin + 30 },
    end: { x: W - margin, y: margin + 30 },
    thickness: 0.5,
    color: RULE,
  });
  page.drawText("IMS EXPRESS LLC  ·  Heavy Haul · Oversized · Logistics", {
    x: margin, y: margin + 16, size: 9,
    font: helvBold, color: INK_2,
  });
  page.drawText("Submitted via imsexpressllc.com  ·  Reply directly to contact this applicant", {
    x: margin, y: margin + 4, size: 8,
    font: helv, color: rgb(0.5, 0.48, 0.43),
  });

  return await pdf.save();
}

// ---------- Vercel handler ----------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({
      error: "Resend not configured. Add RESEND_API_KEY to environment variables.",
    });
  }

  let data = req.body;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { data = {}; }
  }
  if (!data || typeof data !== "object") {
    return res.status(400).json({ error: "Invalid payload" });
  }

  // Basic validation
  if (!data.firstName || !data.lastName || !data.email) {
    return res.status(400).json({
      error: "Missing required fields: firstName, lastName, email",
    });
  }

  try {
    const pdfBytes = await buildPDF(data);
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    const safeName = `${data.firstName}-${data.lastName}`
      .replace(/[^a-zA-Z0-9-]/g, "_");
    const filename = `IMS-Driver-Application-${safeName}.pdf`;

    const summary = [
      `<strong>Name:</strong> ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}`,
      `<strong>Phone:</strong> ${escapeHtml(data.phone || "—")}`,
      `<strong>Email:</strong> ${escapeHtml(data.email)}`,
      `<strong>Position:</strong> ${escapeHtml(data.position || "—")}`,
      `<strong>Heavy haul experience:</strong> ${escapeHtml(data.heavyHaulYears || "—")} years`,
      `<strong>CDL #:</strong> ${escapeHtml(data.cdlNumber || "—")} (${escapeHtml(data.cdlState || "—")})`,
      `<strong>Preferred start:</strong> ${escapeHtml(data.startDate || "—")}`,
    ].join("<br>");

    const html = `
      <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #0e0e0e;">
        <div style="background: #0e0e0e; padding: 24px; border-bottom: 4px solid #f59e0b;">
          <div style="color: #f4f1ea; font-size: 22px; font-weight: 700;">
            IMS <span style="color:#f59e0b;">EXPRESS</span> LLC
          </div>
          <div style="color: #c9c4b6; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; margin-top: 6px;">
            New Driver Application
          </div>
        </div>
        <div style="padding: 24px; background: #f4f1ea;">
          <h2 style="margin: 0 0 12px; font-size: 18px; color: #0e0e0e;">
            ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)} applied for a driver position.
          </h2>
          <p style="font-size: 14px; color: #3a3a37; line-height: 1.55; margin: 0 0 16px;">
            Full application is attached as a PDF. A summary is below.
          </p>
          <div style="background: #ffffff; border: 1px solid #d6d2c7; border-left: 4px solid #f59e0b; padding: 16px; font-size: 14px; line-height: 1.7;">
            ${summary}
          </div>
          <p style="font-size: 12px; color: #5c5a55; margin: 24px 0 0;">
            Reply directly to this email to contact ${escapeHtml(data.firstName)} (${escapeHtml(data.email)}).
          </p>
        </div>
        <div style="background: #0e0e0e; padding: 16px 24px; color: #8c887b; font-size: 11px;">
          IMS Express LLC · (937) 999-4081 · Submitted via imsexpressllc.com
        </div>
      </div>
    `;

    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: data.email,
      subject: `New Driver Application — ${data.firstName} ${data.lastName}`,
      html,
      attachments: [
        { filename, content: pdfBase64 },
      ],
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return res.status(500).json({
        error: "Email delivery failed",
        detail: result.error.message || String(result.error),
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Application handler error:", err);
    return res.status(500).json({
      error: "Server error processing application",
      detail: err.message,
    });
  }
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
