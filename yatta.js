require("dotenv").config();

const baileys = require("@whiskeysockets/baileys");
const makeWASocket = baileys.default;
const { useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = baileys;

const mysql = require("mysql2/promise");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const qrcode = require("qrcode-terminal");
const Pino = require("pino");
const fetch = require("node-fetch");

// ================= CONFIG =================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OLLAMA_BASE = "http://localhost:11434";
const TRIGGER_REGEX = /^\s*halo[\s,!?.:]*/i;

if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY belum diset");
  process.exit(1);
}

// ================= MAIN =================
async function startBot() {
  console.clear();
  console.log("🚀 WA AI BOT BOOTING...\n");

  // ---------- DB ----------
  const db = await mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "transaksi_public",
    waitForConnections: true,
    connectionLimit: 10
  });
  console.log("🗄️  Database connected");

  // ---------- GEMINI ----------
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const geminiText = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const geminiVision = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  console.log("🧠 Gemini ready");

  // ---------- AI ----------
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

  async function ollamaPrompt(model, prompt) {
    const r = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false })
    });
    if (!r.ok) throw new Error("Ollama error");
    return (await r.json()).response;
  }

  async function askAI(prompt) {
    try { return await geminiPrompt(prompt); } catch {}
    try { return await ollamaPrompt("mistral:latest", prompt); } catch {}
    try { return await ollamaPrompt("llama3.2:3b", prompt); } catch {}
    return "Maaf, AI sedang sibuk 🙏";
  }

  async function logChat(sender, msg, reply) {
    await db.execute(
      "INSERT INTO chat_logs (sender, message, reply) VALUES (?, ?, ?)",
      [sender, msg, reply]
    );
  }

  // ---------- WHATSAPP ----------
  const { state, saveCreds } = await useMultiFileAuthState("auth");

  const sock = makeWASocket({
    auth: state,
    logger: Pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      console.clear();
      console.log("📱 SCAN QR WHATSAPP\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.clear();
      console.log("✅ BOT CONNECTED");
      console.log("🟢 CHATBOT SIAP DIGUNAKAN");
      console.log("📌 Trigger: Halo / halo\n");
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting...");
        setTimeout(startBot, 3000);
      }
    }
  });

  // ================= MESSAGE HANDLER =================
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message) return;

    const jid = msg.key.remoteJid;
    if (jid === "status@broadcast") return;

    const sender = jid.endsWith("@g.us")
      ? msg.key.participant || jid
      : jid;

    let text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption;

    text = text?.trim() || "";

    // cegah loop
    if (msg.key.fromMe && !TRIGGER_REGEX.test(text)) return;

    // IMAGE HANDLING
    if (msg.message.imageMessage && TRIGGER_REGEX.test(text)) {
      console.log("🖼️ Image received");

      const buffer = await downloadMediaMessage(
        msg,
        "buffer",
        {},
        { logger: Pino({ level: "silent" }) }
      );

      const prompt = text.replace(TRIGGER_REGEX, "").trim() || "Jelaskan gambar ini";
      const reply = await geminiVisionPrompt(prompt, buffer);

      await sock.sendMessage(jid, { text: reply });
      await logChat(sender, "[IMAGE]", reply);

      console.log("🤖 Image analyzed");
      return;
    }

    // TEXT HANDLING
    if (!TRIGGER_REGEX.test(text)) return;

    const prompt = text.replace(TRIGGER_REGEX, "").trim();
    const reply = await askAI(prompt || "Halo 👋");

    await sock.sendMessage(jid, { text: reply });
    await logChat(sender, text, reply);

    console.log("🤖 Reply sent");
  });
}

startBot().catch(console.error);
