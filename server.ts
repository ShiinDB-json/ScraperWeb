import express from "express";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "10mb" }));

// IP-isolated session store
interface ServerSession {
  id: string;
  ip: string;
  title: string;
  targetUrl: string;
  timestamp: number;
  result: any;
  refactorHistory?: { timestamp: number; prompt: string }[];
}

const sessionStore: Map<string, ServerSession> = new Map();

// Helper: Extract client IP
function getClientIp(req: express.Request): string {
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (typeof xForwardedFor === "string") {
    return xForwardedFor.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "127.0.0.1";
}

// Routes for IP-isolated sessions
app.get("/api/sessions", (req, res) => {
  const ip = getClientIp(req);
  const userSessions = Array.from(sessionStore.values())
    .filter((s) => s.ip === ip)
    .sort((a, b) => b.timestamp - a.timestamp);
  res.json({ success: true, ip, sessions: userSessions });
});

app.post("/api/sessions", (req, res) => {
  const ip = getClientIp(req);
  const { id, title, targetUrl, result, refactorPrompt } = req.body;

  if (!id || !result) {
    return res.status(400).json({ error: "Sesi ID dan result data wajib ada." });
  }

  const existing = sessionStore.get(id);
  if (existing && existing.ip !== ip) {
    return res.status(403).json({ error: "Akses ditolak: Sesi dimiliki oleh IP lain." });
  }

  const refactorHistory = existing?.refactorHistory || [];
  if (refactorPrompt) {
    refactorHistory.push({ timestamp: Date.now(), prompt: refactorPrompt });
  }

  const updatedSession: ServerSession = {
    id,
    ip,
    title: title || existing?.title || "Custom Scraper",
    targetUrl: targetUrl || existing?.targetUrl || "",
    timestamp: Date.now(),
    result,
    refactorHistory,
  };

  sessionStore.set(id, updatedSession);
  res.json({ success: true, session: updatedSession });
});

app.delete("/api/sessions/:id", (req, res) => {
  const ip = getClientIp(req);
  const { id } = req.params;
  const existing = sessionStore.get(id);

  if (existing && existing.ip === ip) {
    sessionStore.delete(id);
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Sesi tidak ditemukan atau tidak milik IP ini." });
});

app.delete("/api/sessions", (req, res) => {
  const ip = getClientIp(req);
  for (const [id, session] of sessionStore.entries()) {
    if (session.ip === ip) {
      sessionStore.delete(id);
    }
  }
  res.json({ success: true });
});

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Default Browser Headers
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

// Helper: Parse cURL command
function parseCurl(curlString: string) {
  const result: {
    url: string;
    method: string;
    headers: Record<string, string>;
    data?: string;
  } = {
    url: "",
    method: "GET",
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
    },
  };

  const urlMatch = curlString.match(/curl\s+["']?([^"'\s]+)["']?/i) || curlString.match(/https?:\/\/[^\s"']+/i);
  if (urlMatch) {
    result.url = urlMatch[1] || urlMatch[0];
  }

  const methodMatch = curlString.match(/-X\s+([A-Z]+)/i) || curlString.match(/--request\s+([A-Z]+)/i);
  if (methodMatch) {
    result.method = methodMatch[1].toUpperCase();
  } else if (curlString.includes("--data") || curlString.includes("-d ")) {
    result.method = "POST";
  }

  const headerMatches = curlString.matchAll(/-H\s+["']([^"']+)["']/g);
  for (const match of headerMatches) {
    const [key, ...valueParts] = match[1].split(":");
    if (key && valueParts.length > 0) {
      result.headers[key.trim()] = valueParts.join(":").trim();
    }
  }

  const dataMatch = curlString.match(/--(?:data|data-raw|data-binary)\s+["']([^"']+)["']/i) || curlString.match(/-d\s+["']([^"']+)["']/i);
  if (dataMatch) {
    result.data = dataMatch[1];
  }

  return result;
}

// Route: Parse cURL
app.post("/api/curl-parse", (req, res) => {
  try {
    const { curl } = req.body;
    if (!curl || typeof curl !== "string") {
      return res.status(400).json({ error: "Command cURL wajib disediakan" });
    }
    const parsed = parseCurl(curl);
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal memproses cURL" });
  }
});

// Route: Live Web Page / API Inspector & Scraper Test
app.post("/api/scrape-test", async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      url,
      method = "GET",
      headers = {},
      params = {},
      payload = null,
      selectors = [],
      jsonPaths = [],
      timeoutMs = 10000,
      followRedirects = true,
    } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "URL target tidak valid" });
    }

    const mergedHeaders = {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
      ...headers,
    };

    const response = await axios({
      url,
      method: method as any,
      headers: mergedHeaders,
      params,
      data: payload,
      timeout: timeoutMs,
      maxRedirects: followRedirects ? 5 : 0,
      validateStatus: () => true, // Don't throw on non-2xx so we can report status
    });

    const elapsedMs = Date.now() - startTime;
    const contentTypeStr = String(response.headers["content-type"] || "");
    const isJson = contentTypeStr.includes("application/json") || (response.data && typeof response.data === "object");

    let extractedData: any = null;
    let htmlMeta: any = null;

    if (isJson) {
      extractedData = response.data;

      // Filter by jsonPaths if provided
      if (jsonPaths && jsonPaths.length > 0 && typeof response.data === "object") {
        const filtered: Record<string, any> = {};
        for (const keyPath of jsonPaths) {
          const keys = keyPath.split(".");
          let current = response.data;
          for (const k of keys) {
            if (current && typeof current === "object" && k in current) {
              current = current[k];
            } else {
              current = undefined;
              break;
            }
          }
          filtered[keyPath] = current;
        }
        extractedData = filtered;
      }
    } else if (typeof response.data === "string") {
      const $ = cheerio.load(response.data);
      const title = $("title").text().trim();
      const metaDescription = $('meta[name="description"]').attr("content") || "";
      const h1s = $("h1")
        .map((_, el) => $(el).text().trim())
        .get();

      htmlMeta = {
        title,
        metaDescription,
        h1Count: h1s.length,
        linksCount: $("a").length,
        imagesCount: $("img").length,
        tablesCount: $("table").length,
        scriptsCount: $("script").length,
      };

      if (selectors && selectors.length > 0) {
        const results: Record<string, any[]> = {};
        for (const sel of selectors) {
          const { name, selector, attribute = "text" } = sel;
          const items: string[] = [];
          $(selector).each((_, el) => {
            let val = "";
            if (attribute === "text") {
              val = $(el).text().trim();
            } else if (attribute === "html") {
              val = $(el).html() || "";
            } else {
              val = $(el).attr(attribute) || "";
            }
            if (val) items.push(val);
          });
          results[name || selector] = items;
        }
        extractedData = results;
      } else {
        // Auto-extract common structured elements
        const items: any[] = [];
        // Try common item selectors (cards, rows, list items)
        const containerSelector = ".card, .item, .product, article, tr, li";
        $(containerSelector).each((i, el) => {
          if (i >= 15) return; // limit preview
          const itemTitle = $(el).find("h1, h2, h3, h4, .title, .name, a").first().text().trim();
          const itemLink = $(el).find("a").first().attr("href") || "";
          const itemDesc = $(el).find("p, .description, .summary").first().text().trim();
          const itemPrice = $(el).find(".price, .amount, span:contains('$'), span:contains('Rp')").first().text().trim();

          if (itemTitle) {
            items.push({
              title: itemTitle,
              link: itemLink,
              description: itemDesc || undefined,
              price: itemPrice || undefined,
            });
          }
        });

        extractedData = items.length > 0 ? items : { previewHtml: response.data.slice(0, 1500) };
      }
    }

    res.json({
      success: response.status >= 200 && response.status < 400,
      statusCode: response.status,
      statusText: response.statusText,
      elapsedMs,
      contentType: contentTypeStr,
      contentLength: response.data ? (typeof response.data === "string" ? response.data.length : JSON.stringify(response.data).length) : 0,
      headers: response.headers,
      htmlMeta,
      data: extractedData,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || "Gagal melakukan scraping test",
      elapsedMs: Date.now() - startTime,
    });
  }
});

// Route: AI Website Analysis & Code Generation
app.post("/api/analyze", async (req, res) => {
  try {
    const { url, rawContent, curlInput, userPrompt = "", strictNoComments = true, preferredLibrary = "axios" } = req.body;

    if (!url && !rawContent && !curlInput && !userPrompt) {
      return res.status(400).json({ error: "Sediakan URL, cURL, konten, atau deskripsi website." });
    }

    let targetUrl = url || "";
    let pageSample = "";
    let statusCode = 200;
    let detectedHeaders: Record<string, string> = {};

    // If URL provided, try fetching live sample
    if (targetUrl) {
      try {
        const fetchRes = await axios.get(targetUrl, {
          headers: {
            "User-Agent": DEFAULT_USER_AGENT,
            Accept: "text/html,application/json,*/*",
          },
          timeout: 8000,
          validateStatus: () => true,
        });
        statusCode = fetchRes.status;
        detectedHeaders = fetchRes.headers as any;
        if (typeof fetchRes.data === "object") {
          pageSample = JSON.stringify(fetchRes.data).slice(0, 3000);
        } else if (typeof fetchRes.data === "string") {
          pageSample = fetchRes.data.slice(0, 3000);
        }
      } catch (e: any) {
        pageSample = `Gagal fetch langsung: ${e.message}`;
      }
    }

    const systemPrompt = `Kamu adalah Web Scraping Engineer profesional Node.js.
Tugas utama: Analisis website / URL / cURL yang diberikan, identifikasi endpoint API atau struktur HTML-nya, lalu hasilkan scraper Node.js yang modular, tangguh, dan memproduksi JSON konsisten.

PILIHAN LIBRARY & TEKNIK:
1. 'axios' / 'cheerio': Untuk request HTTP direct REST/JSON & parsing HTML cepat.
2. 'jsdom': Jika website butuh manipulasi Client-Side DOM & simulasi script sederhana.
3. 'axios-cookiejar' (axios-cookiejar-support + tough-cookie): Jika butuh manajemen session cookie bertingkat & redirect auth.
4. 'cloudscraper': Jika target terproteksi Cloudflare Challenge / V2 WAF.
5. 'puppeteer-stealth' (puppeteer-extra + puppeteer-extra-plugin-stealth): Jika website sangat ketat, butuh rendering headless browser penuh, melewati Cloudflare Turnstile, hCaptcha, atau Akamai.
6. 'playwright-stealth' (playwright + chromium): Untuk headless browser modern anti-detection.

ATURAN KERAS KODE SCRAPER:
1. Bahasa: Node.js (JavaScript ES Module or CommonJS async/await).
2. Jika mode strictNoComments = ${strictNoComments ? "true" : "false"}:
   - Jika strictNoComments = true, TIDAK BOLEH ADA KOMENTAR APAPUN (tidak ada // maupun /* */) pada source code Node.js!
3. Tambahkan error handling, retry dengan exponential backoff, timeout, dan validasi response status.
4. Gunakan User-Agent browser modern dan header penyamaran lengkap.
5. Output akhir scraper saat dijalankan WAJIB berupa JSON terstruktur yang rapi.
6. Berikan output dalam format JSON yang valid mengikuti schema berikut.

Kembalikan respon JSON persis dengan struktur berikut:
{
  "analisisWebsite": "Penjelasan mendalam tentang struktur website, proteksi anti-bot (Cloudflare/Turnstile/Rate Limit), rendering JS vs REST API, dan strategi yang dipakai.",
  "requestDetail": {
    "targetEndpoint": "URL endpoint API atau HTML yang dituju",
    "method": "GET / POST / GraphQL",
    "recommendedHeaders": {
      "User-Agent": "Mozilla/5.0 ...",
      "Accept": "application/json, text/html, */*"
    },
    "cookies": "Session cookie jika dibutuhkan",
    "authentication": "Bearer token / API Key / None",
    "queryParameters": "Penjelasan query string / pagination param",
    "payload": "Payload request jika POST"
  },
  "libraryChoices": [
    {
      "name": "${preferredLibrary}",
      "reason": "Alasan pemilihan library ini"
    }
  ],
  "sourceCode": "Source code Node.js lengkap siap jalan (tanpa komentar jika strictNoComments=true)",
  "caraMenjalankan": "Langkah-langkah install dependency dan cara jalankan di local / Railway",
  "contohOutputJson": [
    {
      "title": "Contoh Judul Data",
      "url": "https://example.com/item/1",
      "price": "Rp 150.000",
      "updatedAt": "2026-08-04T07:00:00Z"
    }
  ],
  "technicalNotes": "Catatan teknis proteksi Cloudflare, CAPTCHA, Rate Limit, atau tips jalankan di Railway."
}`;

    const userPromptContent = `URL Target: ${targetUrl || "N/A"}
cURL Input: ${curlInput || "N/A"}
Catatan User / Prompt: ${userPrompt || "N/A"}
Sample Konten / HTTP Status ${statusCode}: ${pageSample || rawContent || "N/A"}
Header yang terdeteksi: ${JSON.stringify(detectedHeaders)}
Library Pilihan: ${preferredLibrary}
Strict No Comments: ${strictNoComments}`;

    const geminiRes = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: userPromptContent,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const text = geminiRes.text || "{}";
    let parsedResult;
    try {
      parsedResult = JSON.parse(text);
    } catch {
      parsedResult = {
        analisisWebsite: text,
        requestDetail: {
          targetEndpoint: targetUrl,
          method: "GET",
          recommendedHeaders: { "User-Agent": DEFAULT_USER_AGENT },
        },
        libraryChoices: [{ name: preferredLibrary, reason: "Pilihan utama HTTP client Node.js" }],
        sourceCode: `import axios from 'axios';\n\nasync function run() {\n  // Code generated\n}\nrun();`,
        caraMenjalankan: "node scraper.js",
        contohOutputJson: [],
      };
    }

    res.json({
      success: true,
      targetUrl,
      result: parsedResult,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || "Gagal menganalisis website dengan Gemini AI",
    });
  }
});

// Route: Refactor & Improve Scraper Code
app.post("/api/refactor", async (req, res) => {
  try {
    const { currentCode, refactorPrompt, targetUrl, strictNoComments = true } = req.body;

    if (!currentCode || !refactorPrompt) {
      return res.status(400).json({ error: "Kode saat ini dan instruksi refaktor wajib disediakan." });
    }

    const systemPrompt = `Kamu adalah Web Scraping Engineer profesional Node.js.
Tugas utama: Merefaktor, memperbaiki, memperbagus, atau menambahkan fitur pada kode Node.js scraper yang diberikan berdasarkan instruksi permintaan pengguna.

ATURAN REFAKTOR:
1. Bahasa: Node.js (JavaScript async/await).
2. Jika strictNoComments = ${strictNoComments ? "true" : "false"}:
   - Jika strictNoComments = true, SANGAT DILARANG ADA KOMENTAR APAPUN (tidak ada // maupun /* */) pada source code Node.js!
3. Pastikan kode tetap modular, tangguh, menambahkan error handling, retry backoff, dan validasi response.
4. Perbarui contoh JSON output yang dihasilkan sesuai perubahan struktur data terbaru.
5. Berikan output dalam format JSON yang valid mengikuti schema berikut.

Kembalikan respon JSON persis dengan struktur berikut:
{
  "analisisWebsite": "Penjelasan ringkas tentang perubahan/refactoring yang dilakukan pada scraper (penambahan fitur, perbaikan selector, penanganan error, pagination, dll).",
  "requestDetail": {
    "targetEndpoint": "${targetUrl || "Endpoint Target"}",
    "method": "GET / POST",
    "recommendedHeaders": {
      "User-Agent": "Mozilla/5.0 ..."
    }
  },
  "libraryChoices": [
    {
      "name": "axios",
      "reason": "Alasan pemilihan library"
    }
  ],
  "sourceCode": "Source code Node.js terrefaktor dan disempurnakan (tanpa komentar jika strictNoComments=true)",
  "caraMenjalankan": "Panduan langkah jalanin kode hasil refaktor",
  "contohOutputJson": [
    {
      "example": "Hasil JSON data terstruktur terbaru"
    }
  ],
  "technicalNotes": "Catatan teknik perbaikan atau peningkatan"
}`;

    const userPromptContent = `KODE SAAT INI:
\`\`\`javascript
${currentCode}
\`\`\`

TARGET URL: ${targetUrl || "N/A"}
INSTRUKSI REFAKTOR / PERBAIKAN PENGGUNA:
${refactorPrompt}

Aturan Strict No Comments: ${strictNoComments}`;

    const geminiRes = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: userPromptContent,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const text = geminiRes.text || "{}";
    let parsedResult;
    try {
      parsedResult = JSON.parse(text);
    } catch {
      parsedResult = {
        analisisWebsite: "Refactoring selesai",
        requestDetail: {
          targetEndpoint: targetUrl || "",
          method: "GET",
          recommendedHeaders: { "User-Agent": DEFAULT_USER_AGENT },
        },
        libraryChoices: [{ name: "axios", reason: "Direct HTTP Client" }],
        sourceCode: currentCode,
        caraMenjalankan: "node scraper.js",
        contohOutputJson: [],
      };
    }

    res.json({
      success: true,
      result: parsedResult,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || "Gagal merefaktor kode scraper",
    });
  }
});

// Start Server & Integrate Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Web Scraping Expert Studio running at http://localhost:${PORT}`);
  });
}

startServer();
