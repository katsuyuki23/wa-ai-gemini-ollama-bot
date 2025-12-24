// ================= FIX FINAL OLLAMA CONNECT =================
// WINDOWS SAFE | NODE 18+ | NO node-fetch | NO GHOST TIMEOUT

require("dotenv").config();

const baileys = require("@whiskeysockets/baileys");
const makeWASocket = baileys.default;
const { useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = baileys;

const mysql = require("mysql2/promise");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const qrcode = require("qrcode-terminal");
const Pino = require("pino");

// ================= CONFIG =================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OLLAMA_BASE = "http://127.0.0.1:11434";
const TRIGGER_REGEX = /^\s*halo[\s,!?.:]*/i;

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY belum diset");
  process.exit(1);
}

// ================= FETCH SAFE =================
async function fetchSafe(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// ================= MAIN =================
async function startBot() {
  console.clear();
  console.log("🚀 WA AI BOT BOOTING...\n");

  // ---------- TEST OLLAMA ----------
  try {
    const r = await fetchSafe(`${OLLAMA_BASE}/api/tags`, {}, 5000);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();

    console.log("🦙 Ollama CONNECTED");
    console.log("📦 Models:", data.models.map(m => m.name).join(", "));

    // 🔥 WARM UP MODEL (PENTING)
    await fetchSafe(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      body: JSON.stringify({
        model: data.models[0].name,
        prompt: "ping",
        stream: false
      })
    }, 60000);

    console.log("🔥 Ollama warmed up");

  } catch (e) {
    console.error("❌ OLLAMA GAGAL TERHUBUNG");
    console.error("👉 Pastikan jalankan: ollama serve");
    console.error("👉 Cek manual: http://127.0.0.1:11434/api/tags");
    process.exit(1);
  }

  // ---------- DB ----------
  const db = await mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "transaksi_public"
  });
  console.log("🗄️ Database connected");

  // ---------- GEMINI ----------
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const geminiText = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const geminiVision = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  console.log("🧠 Gemini ready");

  async function geminiPrompt(prompt) {
    const r = await geminiText.generateContent(prompt);
    return r.response.text();
  }

  async function geminiVisionPrompt(prompt, imageBuffer) {
    const r = await geminiVision.generateContent([
      { text: prompt },
      {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType: "image/jpeg"
        }
      }
    ]);
    return r.response.text();
  }

  // ---------- OLLAMA ----------
  async function ollamaPrompt(model, prompt) {
    const r = await fetchSafe(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      body: JSON.stringify({
        model,
        prompt,
        stream: false
      })
    }, 60000);

    if (!r.ok) throw new Error("Ollama error " + r.status);
    return (await r.json()).response;
  }

  // ---------- AI ROUTER ----------
  async function askAI(prompt) {
    try {
      console.log("🧠 Gemini");
      return await geminiPrompt(prompt);
    } catch {}

    try {
      console.log("🦙 Mistral");
      return await ollamaPrompt("mistral:latest", prompt);
    } catch {}

    try {
      console.log("🦙 LLaMA");
      return await ollamaPrompt("llama3.2:3b", prompt);
    } catch {}

    return "AI sedang istirahat sebentar ☕, Pertanyaanmu yang jelas napa kunyuk😡";
  }

  // ---------- WHATSAPP ----------
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const sock = makeWASocket({
    auth: state,
    logger: Pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, qr, lastDisconnect }) => {
    if (qr) qrcode.generate(qr, { small: true });

    if (connection === "open") {
      console.log("✅ BOT CONNECTED");
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        setTimeout(startBot, 3000);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message) return;

    let text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption;

    text = text?.trim() || "";
    if (!TRIGGER_REGEX.test(text)) return;

    const prompt = text.replace(TRIGGER_REGEX, "").trim() || "Halo";
    const reply = await askAI(prompt);
    await sock.sendMessage(msg.key.remoteJid, { text: reply });
  });
}

startBot().catch(err => {
  console.error("🔥 FATAL:", err);
});
