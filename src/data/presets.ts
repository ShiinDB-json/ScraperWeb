import { ScraperPreset } from '../types';

export const SCRAPER_PRESETS: ScraperPreset[] = [
  {
    id: 'fdown-facebook-downloader',
    title: 'FDown.net Facebook Video Downloader Scraper',
    description: 'POST request ke fdown.net/download.php untuk mengekstrak link video Facebook SD/HD (.mp4) langsung.',
    category: 'Social/Media',
    url: 'https://fdown.net/download.php',
    method: 'POST',
    library: 'axios-cheerio',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'https://fdown.net',
      'Referer': 'https://fdown.net/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    sampleCurl: `curl -X POST "https://fdown.net/download.php" -H "Content-Type: application/x-www-form-urlencoded" -H "Origin: https://fdown.net" -H "Referer: https://fdown.net/" --data-raw "URL=https%3A%2F%2Fwww.facebook.com%2Fshare%2Fv%2F19GnZqXchj%2F"`
  },
  {
    id: 'json-placeholder-posts',
    title: 'REST API Products / Posts JSON Feed',
    description: 'Scrape direct JSON REST API with pagination & retry logic.',
    category: 'E-Commerce',
    url: 'https://jsonplaceholder.typicode.com/posts',
    method: 'GET',
    library: 'axios',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    sampleCurl: `curl -X GET "https://jsonplaceholder.typicode.com/posts?_limit=10" -H "Accept: application/json"`
  },
  {
    id: 'quotes-toscrape-html',
    title: 'HTML DOM Scraping with Cheerio',
    description: 'Extract quotes, authors, and tags from static HTML website.',
    category: 'News/Articles',
    url: 'https://quotes.toscrape.com/',
    method: 'GET',
    library: 'axios-cheerio',
    selectors: [
      { name: 'quote', selector: '.quote .text', attribute: 'text' },
      { name: 'author', selector: '.quote .author', attribute: 'text' },
      { name: 'tags', selector: '.quote .tags .tag', attribute: 'text' }
    ],
    sampleCurl: `curl "https://quotes.toscrape.com/" -H "User-Agent: Mozilla/5.0"`
  },
  {
    id: 'crypto-coingecko-api',
    title: 'Crypto Market Live Ticker API',
    description: 'Fetch real-time coin prices, market cap, and volume via API endpoint.',
    category: 'Finance/API',
    url: 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1',
    method: 'GET',
    library: 'axios',
    headers: {
      'Accept': 'application/json'
    }
  },
  {
    id: 'dummyjson-products',
    title: 'E-Commerce Catalog & Ratings API',
    description: 'Extract product catalog, prices, categories, and stock counts.',
    category: 'E-Commerce',
    url: 'https://dummyjson.com/products?limit=10',
    method: 'GET',
    library: 'axios'
  },
  {
    id: 'tech-news-rss',
    title: 'Hacker News Frontpage HTML Extractor',
    description: 'Scrape top story titles, links, points, and authors with Cheerio.',
    category: 'News/Articles',
    url: 'https://news.ycombinator.com/',
    method: 'GET',
    library: 'axios-cheerio',
    selectors: [
      { name: 'title', selector: '.titleline > a', attribute: 'text' },
      { name: 'link', selector: '.titleline > a', attribute: 'href' },
      { name: 'points', selector: '.score', attribute: 'text' }
    ]
  }
];
