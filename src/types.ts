export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ScraperLibrary =
  | 'axios'
  | 'fetch'
  | 'cheerio'
  | 'axios-cheerio'
  | 'jsdom'
  | 'axios-cookiejar'
  | 'cloudscraper'
  | 'puppeteer-stealth'
  | 'playwright-stealth';

export interface RequestDetail {
  targetEndpoint: string;
  method: HttpMethod | string;
  recommendedHeaders: Record<string, string>;
  cookies?: string;
  authentication?: string;
  queryParameters?: string;
  payload?: string;
}

export interface LibraryChoice {
  name: string;
  reason: string;
}

export interface AnalysisResult {
  analisisWebsite: string;
  requestDetail: RequestDetail;
  libraryChoices: LibraryChoice[];
  sourceCode: string;
  caraMenjalankan: string;
  contohOutputJson: any;
  technicalNotes?: string;
}

export interface ScraperPreset {
  id: string;
  title: string;
  description: string;
  category: 'E-Commerce' | 'News/Articles' | 'Jobs' | 'Finance/API' | 'Social/Media';
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  library: ScraperLibrary;
  selectors?: { name: string; selector: string; attribute: string }[];
  sampleCurl?: string;
}

export interface ScrapeTestResponse {
  success: boolean;
  statusCode?: number;
  statusText?: string;
  elapsedMs?: number;
  contentType?: string;
  contentLength?: number;
  headers?: Record<string, string>;
  htmlMeta?: {
    title: string;
    metaDescription: string;
    h1Count: number;
    linksCount: number;
    imagesCount: number;
    tablesCount: number;
    scriptsCount: number;
  };
  data?: any;
  error?: string;
}

export interface SavedSession {
  id: string;
  title: string;
  targetUrl: string;
  timestamp: number;
  result: AnalysisResult;
  refactorHistory?: { timestamp: number; prompt: string }[];
}
