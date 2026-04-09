// simple hashing for obfuscation
const SALT = 0x5EED;

export const encodeId = (id) => {
  if (!id) return '';
  const num = parseInt(id);
  if (isNaN(num)) return id;
  const salted = num ^ SALT;
  return salted.toString(36);
};

export const decodeId = (hash) => {
  if (!hash) return null;
  // If it's pure numeric, maybe it's an old ID? Handle both.
  if (/^\d+$/.test(hash)) return parseInt(hash);
  try {
    const salted = parseInt(hash, 36);
    if (isNaN(salted)) return null;
    return salted ^ SALT;
  } catch (e) {
    return null;
  }
};

export const slugify = (text) => {
  if (!text) return 'product';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

export const createProductUrl = (product) => {
  if (!product) return '#';
  const slug = slugify(product.name);
  const hash = encodeId(product.id);
  return `/products/${slug}-${hash}`;
};

export const createBlogUrl = (blog) => {
  if (!blog) return '#';
  const slug = slugify(blog.title);
  const hash = encodeId(blog.id);
  return `/blog/${slug}-${hash}`;
};
