const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Optimizes an image buffer and saves it to the specified path.
 * - Resizes to a maximum of 1200px width/height (optimal for web).
 * - Converts to WebP format (25-35% smaller than JPEG).
 * - Falls back to progressive JPEG if WebP fails.
 * - Strips all metadata.
 */
const optimizeImage = async (buffer, outputPath) => {
    try {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Force .webp extension for optimal compression
        const ext = path.extname(outputPath).toLowerCase();
        const webpPath = outputPath.replace(/\.[^.]+$/, '.webp');

        // Check if the input is a PNG with transparency
        const metadata = await sharp(buffer).metadata();
        const hasAlpha = metadata.hasAlpha;

        if (hasAlpha) {
            // Preserve transparency with WebP or PNG
            await sharp(buffer)
                .resize(1200, 1200, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .rotate()
                .webp({ quality: 75, effort: 4 })
                .toFile(webpPath);
        } else {
            // No transparency — use aggressive WebP compression
            await sharp(buffer)
                .resize(1200, 1200, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .rotate()
                .webp({ quality: 72, effort: 4 })
                .toFile(webpPath);
        }

        // If original path is different from webp path, remove original extension file if it exists
        if (webpPath !== outputPath && fs.existsSync(outputPath)) {
            try { fs.unlinkSync(outputPath); } catch {}
        }

        return webpPath;
    } catch (error) {
        console.error('WebP Optimization Error, falling back to JPEG:', error.message);
        try {
            // Fallback: progressive JPEG
            await sharp(buffer)
                .resize(1200, 1200, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .rotate()
                .jpeg({
                    quality: 70,
                    progressive: true,
                    mozjpeg: true
                })
                .toFile(outputPath);
            return outputPath;
        } catch (fallbackErr) {
            console.error('JPEG Fallback Error:', fallbackErr.message);
            // Last resort: write raw buffer
            fs.writeFileSync(outputPath, buffer);
            return outputPath;
        }
    }
};

module.exports = { optimizeImage };
