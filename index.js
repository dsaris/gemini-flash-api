import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash'; // Sesuai materi Sesi 2

// Inisialisasi Gemini AI Client
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Multer: simpan file di memory (lebih cepat & aman untuk API)
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// 🔹 Endpoint 1: Generate Text
app.post('/generate-text', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt wajib diisi' });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt
    });

    res.json({ response: response.text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔹 Helper: Proses file multimodal (gambar/dokumen/audio)
const generateWithFile = async (req, res, fieldKey, fallbackMime) => {
  try {
    const file = req.file;
    const prompt = req.body.prompt || 'Jelaskan atau analisis isi file ini secara detail.';
    if (!file) return res.status(400).json({ error: `File ${fieldKey} wajib diupload` });

    // Convert buffer ke Base64
    const base64Data = file.buffer.toString('base64');
    const mimeType = file.mimetype || fallbackMime;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        { text: prompt },
        { inlineData: { data: base64Data, mimeType: mimeType } }
      ]
    });

    res.json({ response: response.text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Endpoint 2: Generate from Image
app.post('/generate-from-image', upload.single('image'), (req, res) => 
  generateWithFile(req, res, 'image', 'image/png')
);

// 🔹 Endpoint 3: Generate from Document
app.post('/generate-from-document', upload.single('document'), (req, res) => 
  generateWithFile(req, res, 'document', 'application/pdf')
);

// 🔹 Endpoint 4: Generate from Audio
app.post('/generate-from-audio', upload.single('audio'), (req, res) => 
  generateWithFile(req, res, 'audio', 'audio/mpeg')
);

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});