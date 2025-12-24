# 🤖 wa-ai-gemini-ollama-bot

> WhatsApp AI Chatbot powered by **Gemini** & **Ollama** (Mistral + LLaMA).  
> Supports **text**, **image understanding**, **MySQL logging**, and **smart fallback**.  
> Built with **Node.js** & **Baileys**.

![Node.js](https://img.shields.io/badge/node-%3E%3D18-green)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Bot-success)
![AI](https://img.shields.io/badge/AI-Gemini%20%7C%20Ollama-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## ✨ Overview

**wa-ai-gemini-ollama-bot** adalah chatbot WhatsApp berbasis **AI multimodal** yang:
- Menggunakan **Google Gemini** sebagai model utama
- Otomatis fallback ke **Ollama (LLM lokal)** saat API limit / error
- Bisa **membaca teks & memahami gambar**
- Berjalan full di **Node.js**, tanpa WhatsApp Business API

Dirancang untuk **eksperimen AI**, **asisten pribadi**, atau **automation berbasis chat**.

---

## 🚀 Features

- 🔗 WhatsApp Web API (Baileys)
- 🧠 AI Text:
  - Gemini (primary)
  - Mistral → LLaMA (fallback otomatis)
- 🖼️ Vision AI:
  - Membaca & menjelaskan gambar dari WhatsApp
- 🎯 Trigger berbasis keyword (`Halo / halo`)
- 👥 Support **Private Chat & Group**
- 🗄️ Logging percakapan ke MySQL
- 🔄 Auto reconnect
- 🛡️ Anti infinite loop bot

---

## 🧩 Architecture

WhatsApp
↓
Baileys Socket
↓
Trigger ("Halo")
↓
Gemini API (Primary)
↓ (on failure)
Ollama (Mistral → LLaMA)
↓
Reply to WhatsApp
↓
MySQL Chat Logs

---

## 📦 Requirements

- Node.js **v18+** (recommended v20)
- MySQL / MariaDB
- Google Gemini API Key
- (Optional) Ollama for local LLM

---

## 🔧 Installation

### 1️⃣ Clone Repository
git clone https://github.com/USERNAME/wa-ai-gemini-ollama-bot.git
cd wa-ai-gemini-ollama-bot

### 2️⃣ Install Dependencies
npm install
🔐 Environment Variables

Create file .env:
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

🗄️ Database Setup
CREATE TABLE chat_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender VARCHAR(100),
  message TEXT,
  reply TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

▶️ Run Bot
node yatta.js

Jika berhasil:
✅ BOT CONNECTED
🟢 CHATBOT SIAP DIGUNAKAN
📌 Trigger: Halo / halo

Scan QR WhatsApp saat pertama kali dijalankan.
💬 Usage
Text Chat
Halo jelaskan relativitas secara singkat

Image Understanding

Kirim gambar dengan caption:

Halo jelaskan gambar ini


Bot akan:

Mengunduh gambar

Menganalisis via Gemini Vision

Mengirimkan penjelasan ke WhatsApp

👥 Group Chat

Tambahkan bot ke grup

Gunakan trigger:

Halo ringkas diskusi ini

🧠 AI Fallback Logic

Gemini (Primary)

Ollama mistral:latest

Ollama llama3.2:3b

Safe fallback response

🚫 Limitations

Tidak mendukung text-to-image

Tidak mendukung voice note

Tidak auto-reply tanpa trigger

🛠️ Troubleshooting

Bot tidak membalas

Pastikan pesan diawali Halo

Cek log terminal

Gemini error

API key invalid / limit

Bot otomatis fallback ke Ollama

Ollama tidak aktif

ollama serve
ollama pull mistral

🗺️ Roadmap

Image generation

Voice note transcription

Memory per user

Web dashboard

Streaming response

📄 License

MIT License
© 2025 Katsuyuki_exe
