const rateBuckets = new Map();

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxAttempts = 5;
  const bucket = rateBuckets.get(ip) || [];
  const recent = bucket.filter((time) => now - time < windowMs);
  recent.push(now);
  rateBuckets.set(ip, recent);
  return recent.length > maxAttempts;
}

function clean(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body
  });

  if (!response.ok) return false;
  const result = await response.json();
  return Boolean(result.success);
}

async function sendWithResend({ name, email, company, need, message }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    throw new Error("Email service is not configured.");
  }

  const safeCompany = company || "Not provided";
  const text = [
    "New portfolio inquiry",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${safeCompany}`,
    `Need: ${need}`,
    "",
    "Message:",
    message
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `Portfolio inquiry from ${name}`,
      text
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Email delivery failed: ${detail}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { ok: false, message: "Method not allowed." });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return json(res, 429, { ok: false, message: "Too many attempts. Please wait a few minutes and try again." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});

    if (clean(body.website, 200)) {
      return json(res, 200, { ok: true, message: "Message received." });
    }

    const name = clean(body.name, 100);
    const email = clean(body.email, 254);
    const company = clean(body.company, 160);
    const need = clean(body.need, 120);
    const message = clean(body.message, 4000);
    const turnstileToken = clean(body.turnstileToken, 3000);

    if (!name || !email || !need || !message) {
      return json(res, 400, { ok: false, message: "Please complete all required fields." });
    }

    if (!validEmail(email)) {
      return json(res, 400, { ok: false, message: "Please enter a valid email address." });
    }

    if (message.length < 10) {
      return json(res, 400, { ok: false, message: "Please include a little more detail in your message." });
    }

    const human = await verifyTurnstile(turnstileToken, ip);
    if (!human) {
      return json(res, 403, { ok: false, message: "Verification failed. Please refresh the page and try again." });
    }

    await sendWithResend({ name, email, company, need, message });
    return json(res, 200, { ok: true, message: "Thanks — your message was sent successfully." });
  } catch (error) {
    console.error("Contact form error:", error);
    return json(res, 500, { ok: false, message: "I couldn't send your message right now. Please try again in a few minutes." });
  }
}
