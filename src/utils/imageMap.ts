// Dynamic image imports from assets/images
const imageModules = import.meta.glob('/src/assets/images/*.{jpg,jpeg,png,webp,JPG,PNG}', { eager: true }) as Record<string, { default: string }>;

// Build a map from filename -> imported URL
const imageMap: Record<string, string> = {};
for (const path in imageModules) {
  const filename = path.split('/').pop() || '';
  imageMap[filename] = imageModules[path].default;
}

// Fallback image - a simple coffee cup SVG data URI
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23f5ede4' width='200' height='200' rx='16'/%3E%3Ctext x='100' y='90' text-anchor='middle' font-size='48'%3E☕%3C/text%3E%3Ctext x='100' y='130' text-anchor='middle' font-size='14' fill='%238B5E3C' font-family='sans-serif'%3ENo Image%3C/text%3E%3C/svg%3E";

export function getProductImage(filename: string | null | undefined): string {
  if (!filename) return FALLBACK_IMAGE;

  if (/^(https?:)?\/\//.test(filename) || filename.startsWith('/uploads/')) return filename;
  
  // Direct match
  if (imageMap[filename]) return imageMap[filename];
  
  // Try case-insensitive match
  const lower = filename.toLowerCase();
  for (const key in imageMap) {
    if (key.toLowerCase() === lower) return imageMap[key];
  }
  
  return FALLBACK_IMAGE;
}

export function getOwnerImage(name: 'gerald' | 'des'): string {
  return getProductImage(`${name}.jpg`);
}

export function getLogoImage(): string {
  return getProductImage('blend_bond_logo.png') || getProductImage('logo.png') || getProductImage('cafe_logo.png');
}

export { imageMap, FALLBACK_IMAGE };
