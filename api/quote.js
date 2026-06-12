// /api/quote — receives a quote request form POST, emails dispatch via Resend.
import { Resend } from "resend";

const TO_EMAIL = process.env.APPLICATION_TO_EMAIL || "imsexpress09@gmail.com";
const FROM_EMAIL =
  process.env.APPLICATION_FROM_EMAIL ||
  "IMS Express LLC <onboarding@resend.dev>";

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function row(label, value) {
  const v = value && String(value).trim() ? escapeHtml(value) : "—";
  return `<tr>
    <td style="padding:10px 14px;background:#f4f1ea;border-bottom:1px solid #d6d2c7;font-weight:600;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#5c5a55;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:10px 14px;background:#ffffff;border-bottom:1px solid #d6d2c7;font-size:14px;color:#0e0e0e;vertical-align:top;">${v}</td>
  </tr>`;
}

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

  // honeypot — bots fill the hidden "fax" field; accept silently, send nothing
  if (data.fax) return res.status(200).json({ ok: true });

  const { name, company, phone, email, pickup, delivery, dimensions, details } = data;

  if (!name || !email || !phone) {
    return res.status(400).json({
      error: "Missing required fields: name, email, phone",
    });
  }

  const ts = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:620px;margin:0 auto;color:#0e0e0e;">
      <div style="background:#0e0e0e;padding:24px;border-bottom:4px solid #f59e0b;">
        <div style="color:#f4f1ea;font-size:22px;font-weight:700;">
          IMS <span style="color:#f59e0b;">EXPRESS</span> LLC
        </div>
        <div style="color:#c9c4b6;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;margin-top:6px;">
          New Quote Request
        </div>
      </div>
      <div style="padding:24px;background:#f4f1ea;">
        <h2 style="margin:0 0 6px;font-size:18px;color:#0e0e0e;">
          Quote request from ${escapeHtml(name)}${company ? ` — ${escapeHtml(company)}` : ""}
        </h2>
        <p style="font-size:12px;color:#5c5a55;margin:0 0 18px;">${ts} ET</p>

        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;border:1px solid #d6d2c7;border-radius:6px;overflow:hidden;">
          ${row("Name", name)}
          ${row("Company", company)}
          ${row("Phone", phone)}
          ${row("Email", email)}
          ${row("Pickup Location", pickup)}
          ${row("Delivery Location", delivery)}
          ${row("Load Dimensions", dimensions)}
          ${details ? row("Additional Details", details) : ""}
        </table>

        <p style="font-size:12px;color:#5c5a55;margin:20px 0 0;">
          Reply directly to contact ${escapeHtml(name)} at ${escapeHtml(email)}.
        </p>
      </div>
      <div style="background:#0e0e0e;padding:16px 24px;color:#8c887b;font-size:11px;">
        IMS Express LLC · (937) 999-4081 · Submitted via the website
      </div>
    </div>
  `;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: email,
      subject: `Quote Request — ${name}${company ? ` (${company})` : ""}`,
      html,
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
    console.error("Quote handler error:", err);
    return res.status(500).json({
      error: "Server error processing quote",
      detail: err.message,
    });
  }
}
