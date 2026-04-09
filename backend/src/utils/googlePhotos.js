const axios = require('axios');
const fs = require('fs-extra');

// Mimic a real browser to avoid bot blocking
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
};

/**
 * Downloads an image from a URL and saves it to a specific path
 */
const downloadImage = async (url, outputPath) => {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        timeout: 30000,
        headers: { ...BROWSER_HEADERS, 'Accept': 'image/webp,image/png,image/jpeg,*/*' },
        maxRedirects: 5,
    });

    // Validate it looks like an image, not HTML
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html')) {
        throw new Error(`URL returned HTML instead of an image (${url})`);
    }

    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
};

/**
 * Extracts direct image URLs from a Google Photos / Drive / direct URL.
 * Returns [] if nothing usable is found (never returns non-image URLs).
 */
const resolveImageUrls = async (sourceUrl) => {
    if (!sourceUrl || !sourceUrl.trim()) return [];
    const url = sourceUrl.trim();

    // 1. Already a direct lh3 image — just append high-res suffix if missing
    if (url.includes('lh3.googleusercontent.com')) {
        const base = url.split('=')[0]; // strip any existing size params
        return [`${base}=w2048-h2048`];
    }

    // 2. Google Drive
    if (url.includes('drive.google.com')) {
        const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
        if (m && m[1]) {
            return [`https://lh3.googleusercontent.com/d/${m[1]}=w2048-h2048`];
        }
    }

    // 3. Google Photos share links (photos.app.goo.gl or photos.google.com)
    if (url.includes('photos.app.goo.gl') || url.includes('photos.google.com')) {
        try {
            const response = await axios.get(url, {
                headers: BROWSER_HEADERS,
                timeout: 15000,
                maxRedirects: 5,
            });
            const html = response.data;

            // Strategy A: og:image meta tag — most reliable for single photos
            const ogMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
                         || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i);
            if (ogMatch && ogMatch[1] && ogMatch[1].includes('lh3.googleusercontent.com')) {
                const base = ogMatch[1].split('=')[0];
                return [`${base}=w2048-h2048`];
            }

            // Strategy B: scan all lh3 URLs embedded in the page (albums)
            const regex = /(https:\/\/lh3\.googleusercontent\.com\/[A-Za-z0-9\-_]+)/g;
            const matches = [...new Set([...html.matchAll(regex)].map(m => m[1]))];
            const filtered = matches.filter(u => u.length > 60);

            if (filtered.length > 0) {
                return filtered
                    .slice(0, 15)
                    .map(u => `${u}=w2048-h2048`);
            }

            console.warn(`resolveImageUrls: no images found in Google Photos page: ${url}`);
            return [];
        } catch (err) {
            console.error(`resolveImageUrls: failed to fetch Google Photos page: ${err.message}`);
            return [];
        }
    }

    // 4. Fallback — treat as a direct image URL
    return [url];
};

module.exports = { downloadImage, resolveImageUrls };
