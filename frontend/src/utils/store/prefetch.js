import { getAllProducts } from "../../api/store/products";
import { getAllBlogs } from "../../api/store/blog";
import dataCache, { CACHE_KEYS } from "./dataCache";

// Prefetch products for faster navigation
export const prefetchProducts = async () => {
  try {
    if (dataCache.has(CACHE_KEYS.HOME_PRODUCTS)) {
      return;
    }

    const result = await getAllProducts({ limit: 8 });
    const data = result.products || [];

    if (data.length > 0) {
      dataCache.set(CACHE_KEYS.HOME_PRODUCTS, data.slice(0, 4));

      data.forEach((product) => {
        dataCache.set(CACHE_KEYS.PRODUCT(product.id), product);
      });
    }
  } catch (error) {
    console.log("Prefetch products failed:", error);
  }
};

// Prefetch blogs for faster navigation
export const prefetchBlogs = async () => {
  try {
    if (dataCache.has(CACHE_KEYS.ALL_BLOGS)) {
      return;
    }

    const result = await getAllBlogs({ limit: 10 });
    const data = result.blogs || [];

    if (data.length > 0) {
      dataCache.set(CACHE_KEYS.ALL_BLOGS, data);
      dataCache.set(CACHE_KEYS.HOME_BLOGS, data.slice(0, 3));

      data.forEach((blog) => {
        dataCache.set(CACHE_KEYS.BLOG_POST(blog.id), blog);
      });
    }
  } catch (error) {
    console.log("Prefetch blogs failed:", error);
  }
};

// Prefetch all data when app starts
export const prefetchAllData = async () => {
  await Promise.all([prefetchProducts(), prefetchBlogs()]);
};

// Background prefetching - runs with low priority
export const backgroundPrefetch = () => {
  if (window.requestIdleCallback) {
    window.requestIdleCallback(() => {
      prefetchAllData();
    });
  } else {
    setTimeout(() => {
      prefetchAllData();
    }, 1000);
  }
};

export default {
  prefetchProducts,
  prefetchBlogs,
  prefetchAllData,
  backgroundPrefetch,
};
