/**
 * Lighthouse Authenticated Testing
 * 
 * This script logs into the app and runs Lighthouse on authenticated pages
 */

const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const REPORTS_DIR = path.join(__dirname, '../lighthouse-reports');

// Pages to test after authentication
const AUTHENTICATED_PAGES = [
  { url: '/dashboard', name: 'dashboard-auth' },
  { url: '/gigs', name: 'gigs-auth' },
  { url: '/bands', name: 'bands-auth' },
  { url: '/profile', name: 'profile-auth' },
];

async function getCookies() {
  console.log('🔐 Attempting to get authentication cookies...\n');
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to sign-in page
    await page.goto(`${BASE_URL}/auth/sign-in`, { waitUntil: 'networkidle0' });
    
    console.log('📝 Please provide your test credentials:');
    console.log('   Email: ', process.env.TEST_EMAIL || '[Set TEST_EMAIL env var]');
    console.log('   Password: [Set TEST_PASSWORD env var]');
    console.log('');
    
    if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
      console.log('❌ ERROR: Missing credentials!');
      console.log('');
      console.log('Please set environment variables:');
      console.log('   export TEST_EMAIL="your-email@example.com"');
      console.log('   export TEST_PASSWORD="your-password"');
      console.log('');
      await browser.close();
      return null;
    }
    
    // Fill in credentials
    await page.type('input[type="email"]', process.env.TEST_EMAIL);
    await page.type('input[type="password"]', process.env.TEST_PASSWORD);
    
    // Submit form
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 })
    ]);
    
    // Check if we're on dashboard (successful login)
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/gigs')) {
      console.log('✅ Successfully authenticated!\n');
      const cookies = await page.cookies();
      await browser.close();
      return cookies;
    } else {
      console.log('❌ Authentication failed - still on sign-in page\n');
      await browser.close();
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error during authentication:', error.message);
    await browser.close();
    return null;
  }
}

async function runLighthouseWithAuth(url, name, cookies) {
  console.log(`🔍 Testing: ${url}`);
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set cookies
  await page.setCookie(...cookies);
  
  // Run Lighthouse
  const { lhr } = await lighthouse(
    `${BASE_URL}${url}`,
    {
      port: new URL(browser.wsEndpoint()).port,
      output: ['json', 'html'],
      onlyCategories: ['performance', 'accessibility', 'best-practices'],
      formFactor: 'desktop',
      screenEmulation: { disabled: true }
    }
  );
  
  // Save reports
  const jsonPath = path.join(REPORTS_DIR, `${name}.json`);
  const htmlPath = path.join(REPORTS_DIR, `${name}.html`);
  
  fs.writeFileSync(jsonPath, JSON.stringify(lhr, null, 2));
  
  // Generate HTML (using Lighthouse report generator)
  const reportHtml = require('lighthouse/report/generator/report-generator').generateReport(lhr, 'html');
  fs.writeFileSync(htmlPath, reportHtml);
  
  await browser.close();
  
  return {
    name,
    url,
    performance: Math.round(lhr.categories.performance.score * 100),
    fcp: lhr.audits['first-contentful-paint'].displayValue,
    lcp: lhr.audits['largest-contentful-paint'].displayValue,
    tbt: lhr.audits['total-blocking-time'].displayValue,
    cls: lhr.audits['cumulative-layout-shift'].displayValue,
  };
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║   🚀 Lighthouse Authenticated Testing 🚀            ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  // Ensure reports directory exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  // Step 1: Get authentication cookies
  const cookies = await getCookies();
  
  if (!cookies) {
    console.log('❌ Cannot proceed without authentication.\n');
    process.exit(1);
  }
  
  // Step 2: Run Lighthouse on each authenticated page
  console.log('📊 Running Lighthouse audits on authenticated pages...\n');
  const results = [];
  
  for (const page of AUTHENTICATED_PAGES) {
    try {
      const result = await runLighthouseWithAuth(page.url, page.name, cookies);
      results.push(result);
      console.log(`   ✅ ${page.name}: ${result.performance}/100\n`);
    } catch (error) {
      console.error(`   ❌ Failed to test ${page.name}:`, error.message, '\n');
    }
  }
  
  // Step 3: Display summary
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║              📊 RESULTS SUMMARY 📊                   ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  console.table(results);
  
  console.log('\n📁 Reports saved to: lighthouse-reports/');
  console.log('   View HTML reports: open lighthouse-reports/*-auth.html\n');
}

main().catch(console.error);

