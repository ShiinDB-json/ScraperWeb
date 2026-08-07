import express from "express";
import path from "path";
import http from "http";
import https from "https";
import zlib from "zlib";
import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { request as undiciRequest } from "undici";
import { XMLParser } from "fast-xml-parser";
import iconv from "iconv-lite";

// Enable stealth evasions (webdriver flag, chrome runtime, plugins, etc.) for Puppeteer
puppeteerExtra.use(StealthPlugin());

const app = express();
const PORT = Number(process.env.PORT) || 3000;

type ScrapeEngine = "http" | "native" | "undici" | "puppeteer" | "playwright";
type PlaywrightBrowserName = "chromium" | "firefox" | "webkit";

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
// Helper: Extract metadata + selector-based (or auto) data from raw HTML.
// Shared by both the plain-HTTP (axios) path and the headless-browser paths
// (Puppeteer / Playwright) so all three engines return the same JSON shape.
function extractFromHtml(
  html: string,
  selectors: { name: string; selector: string; attribute?: string }[]
) {
  const $ = cheerio.load(html);
  const title = $("title").text().trim();
  const metaDescription = $('meta[name="description"]').attr("content") || "";
  const h1s = $("h1")
    .map((_, el) => $(el).text().trim())
    .get();

  const htmlMeta = {
    title,
    metaDescription,
    h1Count: h1s.length,
    linksCount: $("a").length,
    imagesCount: $("img").length,
    tablesCount: $("table").length,
    scriptsCount: $("script").length,
  };

  let extractedData: any;

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
    const items: any[] = [];
    const containerSelector = ".card, .item, .product, article, tr, li";
    $(containerSelector).each((i, el) => {
      if (i >= 15) return;
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

    extractedData = items.length > 0 ? items : { previewHtml: html.slice(0, 1500) };
  }

  return { htmlMeta, extractedData };
}

// Helper: Render a URL with a real headless browser (Puppeteer or Playwright)
// and return the fully-rendered HTML + status code. Used for JS-heavy sites,
// SPA content, or targets protected by bot-detection that a plain HTTP
// request (axios) can't get past.
async function fetchHtmlWithBrowser(
  engine: Exclude<ScrapeEngine, "http">,
  url: string,
  options: {
    headers?: Record<string, string>;
    timeoutMs?: number;
    waitForSelector?: string;
    browser?: PlaywrightBrowserName; // only used when engine === "playwright"
  }
) {
  const { headers = {}, timeoutMs = 30000, waitForSelector, browser = "chromium" } = options;

  if (engine === "puppeteer") {
    const browserInstance = await puppeteerExtra.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const page = await browserInstance.newPage();
      if (headers["User-Agent"]) await page.setUserAgent(headers["User-Agent"]);
      const { "User-Agent": _ua, ...restHeaders } = headers;
      if (Object.keys(restHeaders).length > 0) await page.setExtraHTTPHeaders(restHeaders as Record<string, string>);

      const response = await page.goto(url, { waitUntil: "networkidle2", timeout: timeoutMs });
      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout: timeoutMs }).catch(() => {});
      }
      const html = await page.content();
      const statusCode = response?.status() ?? 200;
      return { html, statusCode };
    } finally {
      await browserInstance.close();
    }
  }

  // Playwright path (chromium / firefox / webkit)
  const engines = { chromium, firefox, webkit } as const;
  const browserInstance = await engines[browser].launch({ headless: true });
  try {
    const context = await browserInstance.newContext({
      userAgent: headers["User-Agent"] || DEFAULT_USER_AGENT,
      extraHTTPHeaders: headers,
    });
    const page = await context.newPage();
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: timeoutMs });
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: timeoutMs }).catch(() => {});
    }
    const html = await page.content();
    const statusCode = response?.status() ?? 200;
    return { html, statusCode };
  } finally {
    await browserInstance.close();
  }
}

// Helper: raw Node.js `http` / `https` core modules — no HTTP client library
// at all. Useful when you need full manual control (custom redirect
// handling, manual gzip/deflate/br decompression via `zlib`, raw sockets)
// or just want a dependency-free scraper.
function fetchWithNativeHttpModule(
  targetUrl: string,
  options: { headers?: Record<string, string>; method?: string; timeoutMs?: number; maxRedirects?: number } = {}
): Promise<{ statusCode: number; statusText: string; headers: Record<string, any>; body: string }> {
  const { headers = {}, method = "GET", timeoutMs = 10000, maxRedirects = 5 } = options;

  return new Promise((resolve, reject) => {
    const visit = (currentUrl: string, redirectsLeft: number) => {
      const parsed = new URL(currentUrl);
      const client = parsed.protocol === "https:" ? https : http;

      const req = client.request(
        parsed,
        { method, headers, timeout: timeoutMs },
        (res) => {
          // Follow redirects manually (native http/https don't do this for you)
          if (
            res.statusCode &&
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location &&
            redirectsLeft > 0
          ) {
            res.resume();
            const nextUrl = new URL(res.headers.location, currentUrl).toString();
            visit(nextUrl, redirectsLeft - 1);
            return;
          }

          const chunks: Buffer[] = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => {
            let buffer = Buffer.concat(chunks);
            const encoding = res.headers["content-encoding"];
            try {
              if (encoding === "gzip") buffer = zlib.gunzipSync(buffer);
              else if (encoding === "br") buffer = zlib.brotliDecompressSync(buffer);
              else if (encoding === "deflate") buffer = zlib.inflateSync(buffer);
            } catch {
              // If decompression fails, fall back to raw buffer as-is
            }

            const contentType = String(res.headers["content-type"] || "");
            const charsetMatch = contentType.match(/charset=([^;]+)/i);
            const charset = charsetMatch ? charsetMatch[1].trim().toLowerCase() : "utf-8";
            const body = charset === "utf-8" ? buffer.toString("utf-8") : iconv.decode(buffer, charset);

            resolve({
              statusCode: res.statusCode || 200,
              statusText: res.statusMessage || "",
              headers: res.headers as Record<string, any>,
              body,
            });
          });
        }
      );

      req.on("timeout", () => req.destroy(new Error(`Request timed out after ${timeoutMs}ms`)));
      req.on("error", reject);
      req.end();
    };

    visit(targetUrl, maxRedirects);
  });
}

// Helper: undici — the modern, high-performance HTTP client that also powers
// Node's built-in `fetch`. Faster connection pooling than axios, good for
// high-volume scraping jobs.
async function fetchWithUndici(
  targetUrl: string,
  options: { headers?: Record<string, string>; method?: string; timeoutMs?: number } = {}
) {
  const { headers = {}, method = "GET", timeoutMs = 10000 } = options;
  const response = await undiciRequest(targetUrl, {
    method: method as any,
    headers,
    headersTimeout: timeoutMs,
    bodyTimeout: timeoutMs,
  });
  const body = await response.body.text();
  return {
    statusCode: response.statusCode,
    statusText: response.statusCode >= 200 && response.statusCode < 400 ? "OK" : "Error",
    headers: response.headers as Record<string, any>,
    body,
  };
}

// Helper: parse XML / RSS / Atom feeds (e.g. sitemaps, news feeds) into JSON
function parseXml(xml: string) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  return parser.parse(xml);
}

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
      engine = "http", // "http" (axios) | "native" (Node http/https) | "undici" | "puppeteer" | "playwright"
      waitForSelector,
      playwrightBrowser = "chromium", // "chromium" | "firefox" | "webkit"
      parseAsXml = false,
    }: {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      params?: Record<string, any>;
      payload?: any;
      selectors?: { name: string; selector: string; attribute?: string }[];
      jsonPaths?: string[];
      timeoutMs?: number;
      followRedirects?: boolean;
      engine?: ScrapeEngine;
      waitForSelector?: string;
      playwrightBrowser?: PlaywrightBrowserName;
      parseAsXml?: boolean;
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

    let statusCode: number;
    let statusText: string;
    let responseHeaders: Record<string, any> = {};
    let rawData: any = "";
    let contentTypeStr = "text/html";

    if (engine === "puppeteer" || engine === "playwright") {
      // Headless-browser path: fully renders JS, good for SPA / anti-bot targets
      const browserTimeout = Math.max(timeoutMs, 20000);
      const { html, statusCode: renderedStatus } = await fetchHtmlWithBrowser(engine, url, {
        headers: mergedHeaders,
        timeoutMs: browserTimeout,
        waitForSelector,
        browser: playwrightBrowser,
      });
      rawData = html;
      statusCode = renderedStatus;
      statusText = statusCode >= 200 && statusCode < 400 ? "OK" : "Error";
    } else if (engine === "native") {
      // Zero-dependency path using Node's built-in http/https + zlib + iconv-lite
      const result = await fetchWithNativeHttpModule(url, {
        headers: mergedHeaders,
        method,
        timeoutMs,
        maxRedirects: followRedirects ? 5 : 0,
      });
      rawData = result.body;
      statusCode = result.statusCode;
      statusText = result.statusText;
      responseHeaders = result.headers;
      contentTypeStr = String(result.headers["content-type"] || "");
    } else if (engine === "undici") {
      // High-throughput path using undici (same engine that powers Node's native fetch)
      const result = await fetchWithUndici(url, { headers: mergedHeaders, method, timeoutMs });
      rawData = result.body;
      statusCode = result.statusCode;
      statusText = result.statusText;
      responseHeaders = result.headers;
      contentTypeStr = String(result.headers["content-type"] || "");
    } else {
      // Plain HTTP path via axios (fastest, no JS rendering)
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
      rawData = response.data;
      statusCode = response.status;
      statusText = response.statusText;
      responseHeaders = response.headers;
      contentTypeStr = String(response.headers["content-type"] || "");
    }

    const elapsedMs = Date.now() - startTime;
    const isJson = contentTypeStr.includes("application/json") || (rawData && typeof rawData === "object");
    const isXml =
      !isJson &&
      typeof rawData === "string" &&
      (contentTypeStr.includes("xml") || parseAsXml || /^\s*<\?xml/.test(rawData));

    let extractedData: any = null;
    let htmlMeta: any = null;

    if (isJson) {
      extractedData = rawData;

      // Filter by jsonPaths if provided
      if (jsonPaths && jsonPaths.length > 0 && typeof rawData === "object") {
        const filtered: Record<string, any> = {};
        for (const keyPath of jsonPaths) {
          const keys = keyPath.split(".");
          let current = rawData;
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
    } else if (isXml) {
      // Feed / sitemap path (RSS, Atom, XML sitemaps) via fast-xml-parser
      try {
        extractedData = parseXml(rawData as string);
      } catch (e: any) {
        extractedData = { error: `Gagal parsing XML: ${e.message}`, previewXml: (rawData as string).slice(0, 1500) };
      }
    } else if (typeof rawData === "string") {
      const extracted = extractFromHtml(rawData, selectors);
      htmlMeta = extracted.htmlMeta;
      extractedData = extracted.extractedData;
    }

    res.json({
      success: statusCode >= 200 && statusCode < 400,
      statusCode,
      statusText,
      elapsedMs,
      engine,
      contentType: contentTypeStr,
      contentLength: rawData ? (typeof rawData === "string" ? rawData.length : JSON.stringify(rawData).length) : 0,
      headers: responseHeaders,
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
    const { url, rawContent, curlInput, userPrompt = "", strictNoComments = true } = req.body;

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

PILIH SENDIRI library & teknik yang PALING TEPAT untuk target ini berdasarkan analisismu (proteksi anti-bot, apakah butuh render JS, dsb) — jangan tanya user, tentukan sendiri. Opsi yang tersedia dan SUDAH TERINSTALL di server ini:
1. 'axios' / 'cheerio': Untuk request HTTP direct REST/JSON & parsing HTML cepat. Default terbaik untuk situs statis / API biasa.
2. 'native-http' (modul bawaan Node http/https + zlib + iconv-lite, tanpa dependency eksternal): Cocok jika ingin kontrol penuh request tanpa library HTTP client.
3. 'undici': HTTP client performa tinggi (engine yang sama dengan fetch bawaan Node), cocok untuk scraping volume besar / concurrent request banyak.
4. 'jsdom': Jika website butuh manipulasi Client-Side DOM & simulasi script sederhana.
5. 'axios-cookiejar' (axios-cookiejar-support + tough-cookie): Jika butuh manajemen session cookie bertingkat & redirect auth.
6. 'cloudscraper': Jika target terproteksi Cloudflare Challenge / V2 WAF.
7. 'puppeteer-stealth' (puppeteer-extra + puppeteer-extra-plugin-stealth): Jika website sangat ketat, butuh rendering headless browser penuh, melewati Cloudflare Turnstile, hCaptcha, atau Akamai.
8. 'playwright-stealth' (playwright, chromium/firefox/webkit): Untuk headless browser modern anti-detection, cross-browser testing.
9. 'got-scraping': HTTP client khusus scraping dengan header & TLS fingerprint browser-like, cocok untuk anti-bot ringan tanpa perlu headless browser penuh.
10. 'fast-xml-parser': Jika target berupa RSS/Atom feed atau XML sitemap.
11. 'robots-parser': Untuk mengecek dan menghormati aturan robots.txt sebelum melakukan crawling massal.

Pertimbangkan trade-off: library HTTP ringan (axios/native-http/undici/got-scraping) jauh lebih cepat & murah resource dibanding headless browser (puppeteer/playwright), jadi hanya pakai headless browser kalau memang website butuh render JS atau terproteksi anti-bot berat. Jelaskan alasan pemilihanmu di libraryChoices.

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
      "name": "Library/teknik yang kamu pilih sendiri berdasarkan analisis di atas",
      "reason": "Alasan pemilihan library ini dibanding opsi lain"
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
        libraryChoices: [{ name: "axios", reason: "Fallback default HTTP client Node.js" }],
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
