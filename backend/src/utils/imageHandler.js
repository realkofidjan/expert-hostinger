const fs = require('fs');
const path = require('path');

// ASSETS_DIR env var lets you point to a Railway persistent volume (e.g. /mnt/assets)
// so uploaded files survive container restarts/redeployments.
// Falls back to the local backend/assets directory for development.
const ASSETS_BASE = process.env.ASSETS_DIR || path.join(__dirname, '../../assets');

/**
 * Ensures a directory exists, creating it recursively if necessary
 * @param {string} dirPath 
 */
const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

/**
 * Gets a subfolder path for a specific type and ID
 * @param {string} type - 'products', 'brands', or 'content'
 * @param {string|number} id - The ID or slug for the subfolder
 * @returns {string} The relative path for storage
 */
const getAssetPath = (type, id = '') => {
    const typeFolder = type === 'brands' ? 'brands_imgs' : 
                      type === 'products' ? 'products_imgs' : 
                      'content_imgs';
    
    const relativeDir = path.join(typeFolder, id.toString());
    const absoluteDir = path.join(ASSETS_BASE, relativeDir);
    
    ensureDir(absoluteDir);
    return { relativeDir, absoluteDir };
};

module.exports = {
    ensureDir,
    getAssetPath,
    ASSETS_BASE
};
