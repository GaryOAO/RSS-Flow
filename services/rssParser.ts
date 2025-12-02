
import { Feed, FeedItem } from '../types';

export type LogFn = (msg: string, type?: 'info' | 'error' | 'success') => void;

// --- Helper: XML Cleaning & Parsing ---

const cleanXML = (xmlString: string): string => {
    if (!xmlString) return '';
    // Remove BOM and leading whitespace
    let clean = xmlString.trim().replace(/^[\s\uFEFF\xA0]+/, '');
    // Remove potentially invalid characters before XML declaration
    const xmlIndex = clean.indexOf('<?xml');
    if (xmlIndex > 0) {
        clean = clean.substring(xmlIndex);
    }
    return clean;
};

const getTagContent = (parent: Element | Document, tagName: string): string | null => {
    const el = parent.getElementsByTagName(tagName)[0];
    if (el) return el.textContent;

    // Try with namespace if standard fails
    const elNS = parent.getElementsByTagNameNS('*', tagName)[0];
    if (elNS) return elNS.textContent;

    return null;
};

export const parseWithFallback = (content: string, url: string, log?: LogFn): Feed => {
    log?.(`Parsing content for ${url} (Length: ${content.length})`, 'info');
    const parser = new DOMParser();
    const cleanedContent = cleanXML(content);

    // Attempt 1: Strict XML Parsing
    let doc = parser.parseFromString(cleanedContent, 'text/xml');

    const parserError = doc.querySelector('parsererror');
    if (parserError) {
        log?.(`Strict XML parsing failed: ${parserError.textContent?.slice(0, 100)}...`, 'error');
        log?.('Retrying with loose HTML parser...', 'info');
        // Attempt 2: Loose HTML Parsing
        doc = parser.parseFromString(cleanedContent, 'text/html');
    } else {
        log?.('Strict XML parsing successful', 'success');
    }

    const isRSS = doc.getElementsByTagName('channel').length > 0;
    const isAtom = doc.getElementsByTagName('feed').length > 0;

    log?.(`Detected format: ${isRSS ? 'RSS' : isAtom ? 'Atom' : 'Unknown'}`, 'info');

    let title = 'Untitled Feed';
    let description = '';
    let items: FeedItem[] = [];

    if (isRSS) {
        const channel = doc.getElementsByTagName('channel')[0];
        title = getTagContent(channel, 'title') || title;
        description = getTagContent(channel, 'description') || '';
        const entries = doc.getElementsByTagName('item');
        log?.(`Found ${entries.length} items`, 'info');

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const itemTitle = getTagContent(entry, 'title') || 'No Title';
            const itemLink = getTagContent(entry, 'link') || '';
            const pubDate = getTagContent(entry, 'pubDate') || getTagContent(entry, 'dc:date') || '';
            const guid = getTagContent(entry, 'guid') || itemLink;

            let itemContent = getTagContent(entry, 'content:encoded') ||
                getTagContent(entry, 'encoded') ||
                getTagContent(entry, 'description') || '';

            // Thumbnail extraction
            let thumbnail = '';
            const mediaContent = entry.getElementsByTagName('media:content')[0];
            if (mediaContent) thumbnail = mediaContent.getAttribute('url') || '';

            if (!thumbnail) {
                const enclosure = entry.getElementsByTagName('enclosure')[0];
                if (enclosure && enclosure.getAttribute('type')?.startsWith('image')) {
                    thumbnail = enclosure.getAttribute('url') || '';
                }
            }

            // Create snippet & extraction fallback
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = itemContent;
            const contentSnippet = tempDiv.textContent?.slice(0, 150).trim() + '...' || '';

            if (!thumbnail) {
                const img = tempDiv.querySelector('img');
                if (img) thumbnail = img.src;
            }

            items.push({
                title: itemTitle,
                link: itemLink,
                pubDate,
                content: itemContent,
                contentSnippet,
                guid,
                thumbnail
            });
        }
    } else if (isAtom) {
        const feed = doc.getElementsByTagName('feed')[0];
        title = getTagContent(feed, 'title') || title;
        description = getTagContent(feed, 'subtitle') || '';
        const entries = doc.getElementsByTagName('entry');
        log?.(`Found ${entries.length} Atom entries`, 'info');

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const itemTitle = getTagContent(entry, 'title') || 'No Title';

            let itemLink = '';
            const linkNode = entry.getElementsByTagName('link')[0];
            if (linkNode) itemLink = linkNode.getAttribute('href') || '';

            const pubDate = getTagContent(entry, 'published') || getTagContent(entry, 'updated') || '';
            const guid = getTagContent(entry, 'id') || itemLink;

            let itemContent = getTagContent(entry, 'content') || getTagContent(entry, 'summary') || '';

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = itemContent;
            const contentSnippet = tempDiv.textContent?.slice(0, 150).trim() + '...' || '';

            let thumbnail = '';
            const img = tempDiv.querySelector('img');
            if (img) thumbnail = img.src;

            items.push({
                title: itemTitle,
                link: itemLink,
                pubDate,
                content: itemContent,
                contentSnippet,
                guid,
                thumbnail
            });
        }
    } else {
        const rdf = doc.getElementsByTagName('rdf:RDF')[0];
        if (rdf) {
            log?.('Detected RDF format', 'info');
            const entries = doc.getElementsByTagName('item');
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                items.push({
                    title: getTagContent(entry, 'title') || 'No Title',
                    link: getTagContent(entry, 'link') || '',
                    pubDate: getTagContent(entry, 'dc:date') || '',
                    content: getTagContent(entry, 'description') || '',
                    contentSnippet: '',
                    guid: getTagContent(entry, 'link') || ''
                });
            }
        } else {
            log?.('No valid RSS/Atom/RDF channel found', 'error');
            throw new Error('Invalid RSS/Atom structure: No channel/feed found');
        }
    }

    let favicon;
    try {
        if (url.startsWith('http')) {
            favicon = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`;
        }
    } catch (e) { /* ignore */ }

    return {
        url,
        title,
        description,
        items,
        lastUpdated: Date.now(),
        favicon
    };
};

// --- Strategy Implementation ---

interface FetchStrategy {
    name: string;
    execute: (url: string, signal?: AbortSignal) => Promise<Feed>;
}

import { CapacitorHttp } from '@capacitor/core';

// Helper function to add timeout to promises
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout after ${timeoutMs}ms`));
        }, timeoutMs);

        // Listen to abort signal
        const onAbort = () => {
            clearTimeout(timer);
            reject(new Error('Request cancelled'));
        };

        if (signal) {
            signal.addEventListener('abort', onAbort);
        }

        promise
            .then((value) => {
                clearTimeout(timer);
                if (signal) signal.removeEventListener('abort', onAbort);
                resolve(value);
            })
            .catch((error) => {
                clearTimeout(timer);
                if (signal) signal.removeEventListener('abort', onAbort);
                reject(error);
            });
    });
};

// Optimized strategies: Direct connection first, proxies as fallback
const STRATEGIES: FetchStrategy[] = [
    {
        name: 'Native/Direct',
        execute: async (url: string, signal?: AbortSignal) => {
            // CapacitorHttp bypasses CORS on native Android/iOS
            // Adds proper headers for better compatibility
            const response = await CapacitorHttp.get({
                url,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*',
                }
            });

            if (response.status !== 200) throw new Error(`HTTP ${response.status}`);

            // CapacitorHttp returns data as string or object depending on content-type
            const content = typeof response.data === 'string'
                ? response.data
                : JSON.stringify(response.data);

            return parseWithFallback(content, url);
        }
    },
    {
        name: 'RSS2JSON Service',
        execute: async (url: string, signal?: AbortSignal) => {
            // Server-side parsing, good fallback for CORS issues
            const target = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
            const response = await fetch(target, { signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (data.status !== 'ok') throw new Error(`API Error: ${data.message}`);

            // Map RSS2JSON format to internal Feed format
            const items: FeedItem[] = data.items.map((item: any) => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = item.content || item.description || '';
                const contentSnippet = tempDiv.textContent?.slice(0, 150).trim() + '...' || '';

                return {
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    content: item.content || item.description,
                    contentSnippet,
                    guid: item.guid || item.link,
                    author: item.author,
                    thumbnail: item.thumbnail
                };
            });

            return {
                url,
                title: data.feed.title,
                description: data.feed.description,
                items,
                lastUpdated: Date.now(),
                favicon: data.feed.image
            };
        }
    },
    {
        name: 'AllOrigins',
        execute: async (url: string, signal?: AbortSignal) => {
            const target = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(target, { signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.json();
            if (!json.contents) throw new Error('No content in response');
            return parseWithFallback(json.contents, url);
        }
    },
    {
        name: 'CorsProxy',
        execute: async (url: string, signal?: AbortSignal) => {
            const target = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            const response = await fetch(target, { signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const text = await response.text();
            if (!text.trim()) throw new Error('Empty body');
            return parseWithFallback(text, url);
        }
    }
];

export const fetchFeed = async (url: string, log?: LogFn, signal?: AbortSignal): Promise<Feed> => {
    let errors: string[] = [];
    log?.(`Starting fetch for: ${url}`, 'info');

    for (const strategy of STRATEGIES) {
        // Check if already cancelled
        if (signal?.aborted) {
            throw new Error('Request cancelled');
        }

        try {
            log?.(`Attempting strategy: ${strategy.name}...`, 'info');

            // Add 10 second timeout per strategy
            const feed = await withTimeout(
                strategy.execute(url, signal),
                10000,
                signal
            );

            log?.(`Strategy ${strategy.name} succeeded! Found ${feed.items.length} items.`, 'success');

            // Ensure favicon
            if (!feed.favicon && url.startsWith('http')) {
                try {
                    feed.favicon = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}`;
                } catch (e) { }
            }

            return feed;
        } catch (e: any) {
            if (e.message === 'Request cancelled') {
                throw e; // Re-throw cancellation
            }

            const msg = `${strategy.name} failed: ${e.message}`;
            console.warn(msg);
            log?.(msg, 'error');
            errors.push(msg);
        }
    }

    throw new Error(`Unable to fetch feed. All strategies failed. Details: ${errors.join('; ')}`);
};
