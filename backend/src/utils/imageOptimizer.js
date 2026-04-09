const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Optimizes an image buffer and saves it to the specified path.
 * - Resizes to a maximum of 1600px width/height (responsive-friendly).
 * - Compresses using progressive JPEG (quality 80) or WebP.
 * - Strip metadata to save space.
 */
const optimizeImage = async (buffer, outputPath) => {
    try {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // We'll use JPEG with progressive loading for the best balance of quality and size
        // Progressive JPEGs show a low-res version first, improving perceived load speed.
        await sharp(buffer)
            .resize(1600, 1600, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .rotate() // Auto-rotate based on EXIF
            .jpeg({
                quality: 80,
                progressive: true,
                mozjpeg: true // Better compression
            })
            .toFile(outputPath);
            
        return true;
    } catch (error) {
        console.error('Image Optimization Error:', error);
        // Fallback: if sharp fails, write raw buffer
        fs.writeFileSync(outputPath, buffer);
        return false;
    }
};

module.exports = { optimizeImage };
