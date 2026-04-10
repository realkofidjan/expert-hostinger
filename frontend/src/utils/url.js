const getBackendUrl = () => {
    // Get the base API URL from environment variables
    let url = import.meta.env.VITE_API_BASE_URL || '';
    
    // Remove trailing /api to get the root backend URL
    url = url.replace(/\/api$/, '').replace(/\/$/, '');

    // DEFENSIVE RECOVERY: 
    // If we're on a production domain (not localhost) but the URL is still localhost,
    // we return an empty string to use RELATIVE paths. This fixes "Mixed Content" 
    // errors caused by contaminated production builds.
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        if (url.includes('localhost') || url.includes('127.0.0.1')) {
            return ''; 
        }
    }
    
    return url;
};

export const BACKEND_URL = getBackendUrl();

export const getImageUrl = (path) => {
    if (!path) return '';
    // If it's already an absolute URL, return it
    if (path.startsWith('http')) return path;
    
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    
    // Combine with backend URL
    return `${BACKEND_URL}${cleanPath}`;
};

/**
 * Creates a slugified product URL for SEO-friendly navigation
 */
export const createProductUrl = (product) => {
    if (!product) return '#';
    const id = encodeId(product.id);
    const name = product.name || '';
    const slug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    
    return `/product/${id}/${slug}`;
};

/**
 * Creates a slugified blog URL
 */
export const createBlogUrl = (post) => {
    if (!post) return '#';
    const id = encodeId(post.id);
    const title = post.title || '';
    const slug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    
    return `/blog/${id}/${slug}`;
};

/**
 * URL ID Encoding/Decoding utilities
 */
export const encodeId = (id) => {
    if (!id) return '';
    return btoa(id.toString()).replace(/=/g, '');
};

export const decodeId = (encodedId) => {
    if (!encodedId) return null;
    try {
        return parseInt(atob(encodedId));
    } catch {
        return null;
    }
};
