const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { chromium } = require('playwright');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class WebScraperMCP {
  constructor() {
    this.server = new Server({
      name: 'web-scraper',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.browser = null;
    this.scrapOwlApiKey = process.env.SCRAPOWL_API_KEY;
    this.scrapingConfig = this.loadScrapingConfig();

    if (!this.scrapOwlApiKey) {
      console.warn('Warning: SCRAPOWL_API_KEY not found. Search functionality will be limited.');
    }

    this.setupHandlers();
    this.setupHTTP();
  }

  loadScrapingConfig() {
    try {
      const configPath = path.join(__dirname, 'scraping-config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.warn('Warning: Could not load scraping-config.json, using defaults');
      return {
        problematic_sites: { domains: ['barrons.com', 'wsj.com'] },
        scraping_alternatives: { message: 'Site may be difficult to scrape' },
        timeout_settings: { default_timeout: 10000 }
      };
    }
  }

  isProblematicSite(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return this.scrapingConfig.problematic_sites.domains.some(domain =>
        hostname.includes(domain)
      );
    } catch (error) {
      return false;
    }
  }

  getTimeoutForSite(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      const slowSites = this.scrapingConfig.timeout_settings.slow_sites;

      if (slowSites && slowSites.domains.some(domain => hostname.includes(domain))) {
        return slowSites.timeout;
      }

      return this.scrapingConfig.timeout_settings.default_timeout;
    } catch (error) {
      return 10000; // Default fallback
    }
  }

  async setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_stock_news',
          description: 'Search for recent news about a stock ticker using DuckDuckGo',
          inputSchema: {
            type: 'object',
            properties: {
              ticker: {
                type: 'string',
                description: 'Stock ticker symbol (e.g., AAPL, TSLA)',
              },
              days: {
                type: 'number',
                description: 'Number of days to look back (default: 7)',
                default: 7,
              },
              recent_only: {
                type: 'boolean',
                description: 'Filter to content from past 30 days only (default: false)',
                default: false,
              },
            },
            required: ['ticker'],
          },
        },
        {
          name: 'scrape_url',
          description: 'Scrape content from a specific URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to scrape',
              },
              selector: {
                type: 'string',
                description: 'CSS selector to target specific content (optional)',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'search_and_scrape',
          description: 'Search for a topic using DuckDuckGo and scrape results',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results to scrape (default: 5)',
                default: 5,
              },
              recent_only: {
                type: 'boolean',
                description: 'Filter to content from past 30 days only (default: false)',
                default: false,
              },
            },
            required: ['query'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_stock_news':
            return await this.searchStockNews(args.ticker, args.days || 7, args.recent_only || false);
          case 'scrape_url':
            return await this.scrapeUrl(args.url, args.selector);
          case 'search_and_scrape':
            return await this.searchAndScrape(args.query, args.maxResults || 5, args.recent_only || false);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async getBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  async searchStockNews(ticker, days, recent_only = false) {
    if (!this.scrapOwlApiKey) {
      throw new Error('SCRAPOWL_API_KEY is required for search functionality');
    }

    try {
      console.log(`[DEBUG] Starting DuckDuckGo search for ticker: ${ticker}`);

      // Search DuckDuckGo for comprehensive company news that could impact stock
      const searchQuery = `${ticker} news earnings regulatory lawsuit partnership acquisition merger product launch`;
      let searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}`;

      // Add time filter if recent_only is requested
      if (recent_only) {
        searchUrl += '&df=m'; // Past month filter
      }

      console.log(`[DEBUG] Search URL: ${searchUrl}`);

      const response = await axios.post('https://api.scrapeowl.com/v1/scrape', {
        api_key: this.scrapOwlApiKey,
        url: searchUrl,
        render_js: true,
        premium_proxies: true,
        country: 'us',
        wait_for: 3000,
        block_resources: true,
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });

      console.log(`[DEBUG] ScrapOwl response status: ${response.status}`);

      // Log to temp file for debugging
      const logData = {
        timestamp: new Date().toISOString(),
        requestUrl: searchUrl,
        responseStatus: response.status,
        responseHeaders: response.headers,
        responseData: response.data
      };

      try {
        fs.writeFileSync('/tmp/temp.txt', JSON.stringify(logData, null, 2));
        console.log(`[DEBUG] Full response logged to /tmp/temp.txt`);
      } catch (e) {
        console.log(`[DEBUG] Could not write temp file: ${e.message}`);
      }

      if (response.data) {
        // Debug what ScrapOwl actually returns
        console.log(`[DEBUG] Response type:`, typeof response.data);
        console.log(`[DEBUG] Response data:`, JSON.stringify(response.data).substring(0, 500));

        // ScrapOwl returns JSON with HTML inside
        const html = response.data.html;
        console.log(`[DEBUG] Received HTML response, length: ${html?.length || 'undefined'}`);

        // Use a simple regex to extract links (basic parsing)
        const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)</gi;
        const links = [];
        let match;

        while ((match = linkRegex.exec(html)) !== null) {
          const url = match[1];
          const text = match[2].trim();

          if (url && !url.includes('duckduckgo.com') && !url.includes('duck.co') && url.startsWith('http')) {
            links.push({ href: url, text: text });
          }
        }

        console.log(`[DEBUG] Extracted ${links.length} links from HTML`);

        // Filter and process results
        const articles = [];
        const processedUrls = new Set();

        for (const link of links) {
          if (!link.href || processedUrls.has(link.href)) continue;

          try {
            const url = link.href;
            const hostname = new URL(url).hostname.toLowerCase();

            // Look for ANY credible news sources that could impact stock price
            // This includes: financial, tech, regulatory, industry, general news, legal, etc.
            const isCredibleNewsSource =
              // Financial & Business News
              hostname.includes('finance') ||
              hostname.includes('bloomberg') ||
              hostname.includes('marketwatch') ||
              hostname.includes('yahoo') ||
              hostname.includes('reuters') ||
              hostname.includes('wsj') ||
              hostname.includes('ft.com') ||
              hostname.includes('cnbc') ||
              hostname.includes('nasdaq') ||
              hostname.includes('seekingalpha') ||
              hostname.includes('fool') ||
              hostname.includes('barrons') ||
              hostname.includes('investors') ||
              hostname.includes('marketbeat') ||
              hostname.includes('benzinga') ||
              hostname.includes('investing.com') ||
              hostname.includes('marketscreener') ||

              // General News (can report company developments)
              hostname.includes('news') ||
              hostname.includes('cnn') ||
              hostname.includes('bbc') ||
              hostname.includes('nytimes') ||
              hostname.includes('washingtonpost') ||
              hostname.includes('guardian') ||
              hostname.includes('ap.org') ||
              hostname.includes('npr') ||
              hostname.includes('usatoday') ||
              hostname.includes('abcnews') ||
              hostname.includes('cbsnews') ||
              hostname.includes('nbcnews') ||
              hostname.includes('axios') ||
              hostname.includes('politico') ||

              // Tech News (critical for tech stocks)
              hostname.includes('techcrunch') ||
              hostname.includes('arstechnica') ||
              hostname.includes('theverge') ||
              hostname.includes('wired') ||
              hostname.includes('engadget') ||
              hostname.includes('gizmodo') ||
              hostname.includes('zdnet') ||
              hostname.includes('cnet') ||
              hostname.includes('venturebeat') ||
              hostname.includes('techreport') ||

              // Industry & Trade Publications
              hostname.includes('forbes') ||
              hostname.includes('fortune') ||
              hostname.includes('businessinsider') ||
              hostname.includes('inc.com') ||
              hostname.includes('entrepreneur') ||
              hostname.includes('fastcompany') ||

              // Regulatory & Legal News
              hostname.includes('sec.gov') ||
              hostname.includes('ftc.gov') ||
              hostname.includes('justice.gov') ||
              hostname.includes('law.com') ||
              hostname.includes('reuters.com/legal') ||

              // Fallback: Any site with substantial URL (likely an article)
              (url.length > 60 && !url.includes('search') && !url.includes('login'));

            // Skip obvious non-news sites
            const isNonNewsSource = hostname.includes('facebook') ||
                                   hostname.includes('twitter') ||
                                   hostname.includes('instagram') ||
                                   hostname.includes('youtube') ||
                                   hostname.includes('linkedin') ||
                                   hostname.includes('reddit') ||
                                   hostname.includes('wikipedia') ||
                                   hostname.includes('amazon.com') ||
                                   hostname.includes('ebay') ||
                                   hostname.includes('craigslist');

            if (isCredibleNewsSource && !isNonNewsSource) {
              let title = link.text?.trim() || `News from ${hostname}`;

              // Clean up title and improve description
              if (title.length < 10 || title.toLowerCase().includes('news from')) {
                title = `Article from ${hostname}`;
              }

              // Better categorization for description
              let category = 'General News';
              if (hostname.includes('finance') || hostname.includes('bloomberg') || hostname.includes('wsj') || hostname.includes('marketwatch')) {
                category = 'Financial News';
              } else if (hostname.includes('tech') || hostname.includes('verge') || hostname.includes('wired')) {
                category = 'Technology News';
              } else if (hostname.includes('sec.gov') || hostname.includes('ftc.gov') || hostname.includes('justice.gov')) {
                category = 'Regulatory News';
              }

              articles.push({
                title: title,
                url: url,
                description: `${category} from ${hostname}`,
              });

              processedUrls.add(url);

              if (articles.length >= 15) break; // Get more results for comprehensive analysis
            }
          } catch (error) {
            console.log(`[DEBUG] Error processing link: ${error.message}`);
            continue;
          }
        }

        console.log(`[DEBUG] Extracted ${articles.length} articles via DuckDuckGo + ScrapOwl`);
        articles.forEach((article, i) => {
          console.log(`[DEBUG] Article ${i}: ${article.title} - ${article.url}`);
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                ticker,
                articles,
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      } else {
        throw new Error('No data returned from ScrapOwl API');
      }
    } catch (error) {
      console.error(`[ERROR] DuckDuckGo search failed:`, error.message);
      if (error.response) {
        console.error(`[ERROR] Response status: ${error.response.status}`);
        console.error(`[ERROR] Response data:`, error.response.data);
      }
      throw error;
    }
  }

  async scrapeUrl(url, selector) {
    // Check if this is a problematic site
    if (this.isProblematicSite(url)) {
      console.log(`[WARNING] Skipping problematic site: ${url}`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              url,
              error: 'Site filtered as problematic',
              message: this.scrapingConfig.scraping_alternatives.message,
              content: 'Unable to scrape: This site is known to have strong anti-bot protection or requires subscription access.',
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Enhanced stealth mode - hide automation signatures
      await page.addInitScript(() => {
        // Hide webdriver property
        delete navigator.__proto__.webdriver;

        // Override automation detection properties
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });

        // Add realistic plugins array
        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
            { name: 'Native Client', filename: 'internal-nacl-plugin' }
          ]
        });

        // Override languages to be more realistic
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        });

        // Add realistic screen properties
        Object.defineProperty(screen, 'availTop', { get: () => 0 });
        Object.defineProperty(screen, 'availLeft', { get: () => 0 });
      });

      // Set realistic headers
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      });

      // Use dynamic timeout based on site
      const timeout = this.getTimeoutForSite(url);
      console.log(`[DEBUG] Using timeout ${timeout}ms for ${url}`);

      await page.goto(url, { waitUntil: 'networkidle', timeout });

      // Check for HUMAN challenge (PerimeterX CAPTCHA)
      const hasHumanChallenge = await page.evaluate(() => {
        return document.querySelector('#px-captcha-wrapper') !== null;
      });

      if (hasHumanChallenge) {
        console.log(`[DEBUG] HUMAN challenge detected on ${url}`);

        // Get viewport size to calculate coordinates
        const viewport = page.viewportSize() || { width: 1280, height: 720 };
        const x = Math.floor(viewport.width * 0.5);  // 50%
        const y = Math.floor(viewport.height * 0.55); // 55%

        console.log(`[DEBUG] Attempting HUMAN challenge bypass with advanced techniques`);

        try {
          // Step 1: Human-like preparation - start from a different location
          const startX = Math.floor(viewport.width * 0.2);   // Start at 20%
          const startY = Math.floor(viewport.height * 0.3);  // Start at 30%

          await page.mouse.move(startX, startY);
          await page.waitForTimeout(300 + Math.random() * 200); // Random delay 300-500ms

          // Step 2: Natural movement to target with steps
          const jitterX = (Math.random() - 0.5) * 8; // ±4px jitter
          const jitterY = (Math.random() - 0.5) * 8; // ±4px jitter
          const finalX = x + jitterX;
          const finalY = y + jitterY;

          console.log(`[DEBUG] Moving naturally from (${startX}, ${startY}) to (${Math.round(finalX)}, ${Math.round(finalY)})`);

          // Move in natural steps (not perfectly straight)
          await page.mouse.move(finalX, finalY, { steps: 15 });
          await page.waitForTimeout(150 + Math.random() * 100); // Brief pause before press

          // Step 3: Human-like press and hold with slight timing variation
          const holdTime = 7800 + Math.random() * 400; // 7.8-8.2 seconds
          console.log(`[DEBUG] Pressing and holding for ${Math.round(holdTime)}ms`);

          await page.mouse.down();

          // Add tiny micro-movements during hold (humans aren't perfectly still)
          const numMicroMoves = 2 + Math.floor(Math.random() * 3); // 2-4 micro movements
          for (let i = 0; i < numMicroMoves; i++) {
            await page.waitForTimeout(holdTime / (numMicroMoves + 1));
            const microX = finalX + (Math.random() - 0.5) * 2; // ±1px
            const microY = finalY + (Math.random() - 0.5) * 2; // ±1px
            await page.mouse.move(microX, microY);
          }

          // Final hold period
          await page.waitForTimeout(holdTime / (numMicroMoves + 1));
          await page.mouse.up();

          // Step 4: Natural post-release behavior
          console.log(`[DEBUG] Released mouse, behaving naturally...`);

          // Small natural movement after release (humans rarely stay perfectly still)
          const postReleaseX = finalX + (Math.random() - 0.5) * 6;
          const postReleaseY = finalY + (Math.random() - 0.5) * 6;
          await page.mouse.move(postReleaseX, postReleaseY);
          await page.waitForTimeout(500 + Math.random() * 500); // 0.5-1s natural delay

          // Wait for challenge resolution with longer timeout
          console.log(`[DEBUG] Waiting for challenge resolution...`);
          await page.waitForTimeout(4000 + Math.random() * 2000); // 4-6 seconds

          // Check if challenge was resolved
          const challengeResolved = await page.evaluate(() => {
            return document.querySelector('#px-captcha-wrapper') === null;
          });

          if (!challengeResolved) {
            console.log(`[DEBUG] HUMAN challenge still present after bypass attempt`);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    url,
                    error: 'HUMAN challenge could not be bypassed',
                    content: 'Site protected by HUMAN/PerimeterX CAPTCHA that could not be automatically solved.',
                    timestamp: new Date().toISOString(),
                  }, null, 2),
                },
              ],
            };
          }

          console.log(`[DEBUG] HUMAN challenge bypassed successfully!`);

        } catch (challengeError) {
          console.error(`[ERROR] Failed to handle HUMAN challenge: ${challengeError.message}`);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  url,
                  error: 'HUMAN challenge handling failed',
                  content: `Challenge bypass error: ${challengeError.message}`,
                  timestamp: new Date().toISOString(),
                }, null, 2),
              },
            ],
          };
        }
      }

      const content = await page.evaluate((sel) => {
        if (sel) {
          const element = document.querySelector(sel);
          return element ? element.textContent.trim() : 'Selector not found';
        } else {
          // Remove script and style elements
          const scripts = document.querySelectorAll('script, style');
          scripts.forEach(el => el.remove());
          
          // Get main content areas
          const contentSelectors = ['main', 'article', '[role="main"]', '.content', '#content'];
          for (const selector of contentSelectors) {
            const el = document.querySelector(selector);
            if (el) {
              return el.textContent.trim();
            }
          }
          
          // Fallback to body
          return document.body.textContent.trim();
        }
      }, selector);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              url,
              content: content.substring(0, 5000), // Limit content length
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } finally {
      await page.close();
    }
  }

  async searchAndScrape(query, maxResults, recent_only = false) {
    if (!this.scrapOwlApiKey) {
      throw new Error('SCRAPOWL_API_KEY is required for search functionality');
    }

    try {
      console.log(`[DEBUG] Starting DuckDuckGo search and scrape for query: ${query}`);

      // Search DuckDuckGo using ScrapOwl
      let searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;

      // Add time filter if recent_only is requested
      if (recent_only) {
        searchUrl += '&df=m'; // Past month filter
      }

      console.log(`[DEBUG] Search URL: ${searchUrl}`);

      const response = await axios.post('https://api.scrapeowl.com/v1/scrape', {
        api_key: this.scrapOwlApiKey,
        url: searchUrl,
        render_js: true,
        premium_proxies: true,
        country: 'us',
        wait_for: 3000,
        block_resources: true,
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });

      console.log(`[DEBUG] ScrapOwl response status: ${response.status}`);

      // Log to temp file for debugging
      const logData = {
        timestamp: new Date().toISOString(),
        requestUrl: searchUrl,
        responseStatus: response.status,
        responseHeaders: response.headers,
        responseData: response.data
      };

      try {
        fs.writeFileSync('/tmp/temp.txt', JSON.stringify(logData, null, 2));
        console.log(`[DEBUG] Full response logged to /tmp/temp.txt`);
      } catch (e) {
        console.log(`[DEBUG] Could not write temp file: ${e.message}`);
      }

      if (response.data) {
        // Debug what ScrapOwl actually returns
        console.log(`[DEBUG] Response type:`, typeof response.data);
        console.log(`[DEBUG] Response data:`, JSON.stringify(response.data).substring(0, 500));

        // ScrapOwl returns JSON with HTML inside
        const html = response.data.html;
        console.log(`[DEBUG] Received HTML response, length: ${html?.length || 'undefined'}`);

        // Use a simple regex to extract links (basic parsing)
        const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*)</gi;
        const links = [];
        let match;

        while ((match = linkRegex.exec(html)) !== null) {
          const url = match[1];
          const text = match[2].trim();

          if (url && !url.includes('duckduckgo.com') && !url.includes('duck.co') && url.startsWith('http')) {
            links.push({ href: url, text: text });
          }
        }

        console.log(`[DEBUG] Extracted ${links.length} links from HTML`);

        // Filter and process results
        const results = [];
        const processedUrls = new Set();

        for (const link of links) {
          if (!link.href || processedUrls.has(link.href)) continue;

          try {
            const url = link.href;
            const hostname = new URL(url).hostname.toLowerCase();

            // Skip search engine internal links
            if (hostname.includes('duckduckgo.com') || hostname.includes('bing.com')) {
              continue;
            }

            // Must be a real external URL
            if (url.length > 50 &&
                !url.includes('/search?') &&
                !url.includes('support.google.com') &&
                !url.includes('javascript:')) {

              let title = link.text?.trim() || `Result from ${hostname}`;

              // Clean up title
              if (title.length < 10) {
                title = `Result from ${hostname}`;
              }

              results.push({
                title: title,
                url: url,
                description: `Search result from ${hostname}`,
              });

              processedUrls.add(url);

              if (results.length >= maxResults) break;
            }
          } catch (error) {
            console.log(`[DEBUG] Error processing link: ${error.message}`);
            continue;
          }
        }

        console.log(`[DEBUG] Extracted ${results.length} search results via DuckDuckGo + ScrapOwl`);
        results.forEach((result, i) => {
          console.log(`[DEBUG] Result ${i}: ${result.title} - ${result.url}`);
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                query,
                results,
                timestamp: new Date().toISOString(),
              }, null, 2),
            },
          ],
        };
      } else {
        throw new Error('No data returned from ScrapOwl API');
      }
    } catch (error) {
      console.error(`[ERROR] DuckDuckGo search and scrape failed:`, error.message);
      if (error.response) {
        console.error(`[ERROR] Response status: ${error.response.status}`);
        console.error(`[ERROR] Response data:`, error.response.data);
      }
      throw error;
    }
  }

  setupHTTP() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // HTTP endpoints for direct access
    app.post('/search-stock-news', async (req, res) => {
      try {
        const { ticker, days = 7, recent_only = false } = req.body;
        const result = await this.searchStockNews(ticker, days, recent_only);
        res.json(JSON.parse(result.content[0].text));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/scrape-url', async (req, res) => {
      try {
        const { url, selector } = req.body;
        const result = await this.scrapeUrl(url, selector);
        res.json(JSON.parse(result.content[0].text));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/search-and-scrape', async (req, res) => {
      try {
        const { query, maxResults = 5, recent_only = false } = req.body;
        const result = await this.searchAndScrape(query, maxResults, recent_only);
        res.json(JSON.parse(result.content[0].text));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.listen(3000, () => {
      console.log('HTTP server running on port 3000');
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('MCP Web Scraper Server running');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  if (global.scraperInstance) {
    await global.scraperInstance.cleanup();
  }
  process.exit(0);
});

// Start the server
const scraper = new WebScraperMCP();
global.scraperInstance = scraper;
scraper.start();