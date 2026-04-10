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
