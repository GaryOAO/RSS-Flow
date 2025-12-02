
import { Feed, Category } from '../types';

export const parseOPML = async (xmlContent: string): Promise<{ feeds: { title: string, url: string, categoryId?: string }[], categories: string[] }> => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');
  
  const outlines = doc.querySelectorAll('body > outline');
  const feeds: { title: string, url: string, categoryId?: string }[] = [];
  const categories = new Set<string>();

  outlines.forEach(outline => {
    const type = outline.getAttribute('type');
    const text = outline.getAttribute('text') || outline.getAttribute('title') || '';
    const xmlUrl = outline.getAttribute('xmlUrl');

    if (type === 'rss' && xmlUrl) {
      // Root level feed
      feeds.push({ title: text, url: xmlUrl });
    } else if (!type && text) {
      // Likely a category/folder
      const categoryName = text;
      categories.add(categoryName);
      
      const children = outline.querySelectorAll('outline[xmlUrl]');
      children.forEach(child => {
        const childUrl = child.getAttribute('xmlUrl');
        const childTitle = child.getAttribute('text') || child.getAttribute('title') || '';
        if (childUrl) {
          feeds.push({ title: childTitle, url: childUrl, categoryId: categoryName });
        }
      });
    }
  });

  return { feeds, categories: Array.from(categories) };
};

export const generateOPML = (feeds: Feed[], categories: Category[]): string => {
  const escape = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="1.0">\n<head>\n<title>RSS Flow Export</title>\n</head>\n<body>\n`;

  // 1. Process Categories and their feeds
  categories.forEach(cat => {
    xml += `<outline text="${escape(cat.name)}" title="${escape(cat.name)}">\n`;
    const catFeeds = feeds.filter(f => f.categoryId === cat.id);
    catFeeds.forEach(feed => {
        xml += `<outline type="rss" text="${escape(feed.title)}" title="${escape(feed.title)}" xmlUrl="${escape(feed.url)}"/>\n`;
    });
    xml += `</outline>\n`;
  });

  // 2. Process Uncategorized feeds
  const uncategorized = feeds.filter(f => !f.categoryId);
  uncategorized.forEach(feed => {
     xml += `<outline type="rss" text="${escape(feed.title)}" title="${escape(feed.title)}" xmlUrl="${escape(feed.url)}"/>\n`;
  });

  xml += `</body>\n</opml>`;
  return xml;
};
