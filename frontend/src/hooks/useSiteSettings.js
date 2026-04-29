/**
 * useSiteSettings — fetches public site settings from the API once per page load
 * and caches the result module-wide so Footer, Home, etc. share a single request.
 */
import { useState, useEffect } from 'react';
import api from '../api';

// Module-level cache — shared across all hook instances in the same page session
let _cache = null;
let _inflight = null;

const fetchSettings = () => {
  if (_cache) return Promise.resolve(_cache);
  if (_inflight) return _inflight;
  _inflight = api.get('/settings')
    .then(res => { _cache = res.data || {}; return _cache; })
    .catch(() => { _inflight = null; return {}; });
  return _inflight;
};

export const useSiteSettings = () => {
  const [settings, setSettings] = useState(_cache || {});

  useEffect(() => {
    if (_cache) { setSettings(_cache); return; }
    fetchSettings().then(data => setSettings(data));
  }, []);

  return settings;
};

/** Clear the cache (call after saving settings so next page load gets fresh data) */
export const clearSiteSettingsCache = () => { _cache = null; _inflight = null; };

export default useSiteSettings;
