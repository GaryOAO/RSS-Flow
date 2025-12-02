
import { CapacitorHttp } from '@capacitor/core';

// Helper to fetch an image and convert to Base64
const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    // 1. Try Image Proxy first (wsrv.nl) - more reliable with CORS
    // Only use direct fetch in native environment
    const isNative = (window as any).Capacitor?.isNativePlatform?.();

    if (!isNative) {
      // In Web environment, skip direct fetch and use proxy directly
      const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg&maxage=7d`;
      const proxyResponse = await fetch(proxyUrl).catch(() => null);

      if (proxyResponse && proxyResponse.ok) {
        const blob = await proxyResponse.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
      return null;
    }

    // 2. In Native environment, try direct fetch first
    const response = await CapacitorHttp.get({
      url,
      responseType: 'arraybuffer', // Get raw binary data
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }).catch(() => null);

    if (response && response.status === 200 && response.data) {
      // Convert arraybuffer to base64
      if (response.data instanceof ArrayBuffer || typeof response.data === 'string') {
        let base64: string;
        if (typeof response.data === 'string') {
          base64 = response.data;
        } else {
          // Convert ArrayBuffer to base64
          const bytes = new Uint8Array(response.data);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          base64 = btoa(binary);
        }

        // Detect content type from URL or default to jpeg
        const ext = url.split('.').pop()?.toLowerCase();
        const contentType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
        return `data:${contentType};base64,${base64}`;
      }
    }

    // 3. If native direct failed, try proxy as fallback
    const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg&maxage=7d`;
    const proxyResponse = await fetch(proxyUrl).catch(() => null);

    if (proxyResponse && proxyResponse.ok) {
      const blob = await proxyResponse.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    }

    return null;
  } catch (e) {
    console.warn('Failed to cache image:', url, e);
    return null;
  }
};

export const processContentForOffline = async (htmlContent: string): Promise<string> => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const images = doc.querySelectorAll('img');

  if (images.length === 0) return htmlContent;

  const promises = Array.from(images).map(async (img) => {
    const src = img.getAttribute('src');
    if (src && src.startsWith('http')) {
      // Store original source for restoration later
      img.setAttribute('data-original-src', src);

      const base64 = await fetchImageAsBase64(src);
      if (base64) {
        img.setAttribute('src', base64);
        img.setAttribute('data-offline', 'true');
      }
    }
  });

  await Promise.all(promises);
  return doc.body.innerHTML;
};

export const restoreOriginalImages = (htmlContent: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const images = doc.querySelectorAll('img[data-original-src]');

  if (images.length === 0) return htmlContent;

  let restoredCount = 0;
  images.forEach(img => {
    const original = img.getAttribute('data-original-src');
    if (original) {
      img.setAttribute('src', original);
      img.removeAttribute('data-offline');
      // Keep data-original-src or remove it? Let's keep it just in case we re-download later, 
      // but for "clearing cache" purposes, we essentially just swapped src back.
      restoredCount++;
    }
  });

  return restoredCount > 0 ? doc.body.innerHTML : htmlContent;
};

import { FeedItem } from '../types';

export const processFeedItemsForOffline = async (items: FeedItem[]): Promise<FeedItem[]> => {
  return Promise.all(items.map(async (item) => {
    const processedItem = { ...item };
    if (processedItem.content) {
      processedItem.content = await processContentForOffline(processedItem.content);
    }

    return processedItem;
  }));
};
