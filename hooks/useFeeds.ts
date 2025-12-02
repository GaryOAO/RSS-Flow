import { useState, useEffect, useRef, useCallback } from 'react';
import { Feed, Category, FeedItem } from '../types';
import { loadData, saveData, StorageQuotaError } from '../services/db';
import { fetchFeed } from '../services/rssParser';
import { ONBOARDING_FEED } from '../data/onboardingFeed';
import { useSettingsContext } from '../contexts/SettingsContext';
import { processContentForOffline } from '../services/contentProcessor';

const DATA_STORAGE_KEY = 'inkflow_data_v1';
const WELCOME_STORAGE_KEY = 'inkflow_welcome_seen';

// Concurrency Helper
const pMap = async <T, R>(array: T[], mapper: (item: T) => Promise<R>, concurrency: number): Promise<R[]> => {
    const results = new Array<R>(array.length);
    let index = 0;
    const next = async (): Promise<void> => {
        while (index < array.length) {
            const i = index++;
            results[i] = await mapper(array[i]);
        }
    };
    await Promise.all(Array.from({ length: concurrency }, next));
    return results;
};

const cleanupOldArticles = (feeds: Feed[]): Feed[] => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let hasChanges = false;

    const newFeeds = feeds.map(feed => {
        const originalCount = feed.items.length;
        const newItems = feed.items.filter(item => {
            // Keep if favorite or read later
            if (item.isFavorite || item.isReadLater) return true;

            // Keep if newer than 30 days
            const pubDate = new Date(item.pubDate).getTime();
            // If invalid date, keep it to be safe, or check if we want to delete. 
            // Let's assume valid dates for now, or default to keep.
            if (isNaN(pubDate)) return true;

            return pubDate > thirtyDaysAgo;
        });

        if (newItems.length !== originalCount) {
            hasChanges = true;
            return { ...feed, items: newItems };
        }
        return feed;
    });

    const uniqueItems = new Map();
    // Keep the first occurrence (usually the newest if sorted, but here we just want uniqueness)
    // Actually, we want to keep the one with more data (e.g. isRead status), but usually duplicates are identical content-wise.
    // We prioritize keeping the one that is already "read" or "favorite" if possible, but that's complex.
    // Simple approach: Keep the first one encountered.

    // However, we want to preserve the *oldest* one if we are appending new ones? 
    // No, usually we want to keep the existing state.

    // Let's just deduplicate based on ID/Link.
    const dedupedItems: FeedItem[] = [];
    const seenIds = new Set<string>();
    const seenLinks = new Set<string>();

    for (const item of newFeeds[0].items) { // This logic needs to apply to ALL feeds map
        // ... wait, we need to map over feeds.
    }

    const finalFeeds = newFeeds.map(feed => {
        const seen = new Set<string>();
        const uniqueFeedItems: FeedItem[] = [];

        for (const item of feed.items) {
            const key = item.id || item.guid || item.link;
            // Also check link explicitly if ID is unstable?
            // Let's use a composite check.
            const linkKey = item.link;

            if (!seen.has(key) && (!linkKey || !seen.has(linkKey))) {
                seen.add(key);
                if (linkKey) seen.add(linkKey);
                uniqueFeedItems.push(item);
            }
        }

        if (uniqueFeedItems.length !== feed.items.length) {
            hasChanges = true;
            return { ...feed, items: uniqueFeedItems };
        }
        return feed;
    });

    return hasChanges ? finalFeeds : feeds;
};

export const useFeeds = () => {
    const { settings } = useSettingsContext();
    const [feeds, setFeeds] = useState<Feed[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);

    // Simple internal logger
    const log = useCallback((msg: string, type: 'info' | 'error' | 'success' = 'info') => {
        console.log(`[${type.toUpperCase()}] ${msg}`);
    }, []);

    // Persistence: Load on mount (IndexedDB)
    useEffect(() => {
        const init = async () => {
            setLoading(true);

            // Check Welcome Flag
            const hasSeenWelcome = localStorage.getItem(WELCOME_STORAGE_KEY);
            if (!hasSeenWelcome) {
                setIsWelcomeOpen(true);
            }

            try {
                const savedData = await loadData<any>(DATA_STORAGE_KEY);
                if (savedData && savedData.feeds && Array.isArray(savedData.feeds) && savedData.feeds.length > 0) {
                    let loadedFeeds = savedData.feeds;
                    // Run cleanup on load
                    const cleanedFeeds = cleanupOldArticles(loadedFeeds);
                    if (cleanedFeeds !== loadedFeeds) {
                        log(`Cleaned up ${loadedFeeds.reduce((acc: number, f: any) => acc + f.items.length, 0) - cleanedFeeds.reduce((acc: number, f: any) => acc + f.items.length, 0)} old articles.`, 'info');
                        loadedFeeds = cleanedFeeds;
                        // Trigger save immediately after cleanup
                        saveData(DATA_STORAGE_KEY, { feeds: loadedFeeds, categories: savedData.categories || [] });
                    }

                    setFeeds(loadedFeeds);
                    setCategories(savedData.categories || []);
                    log(`Loaded ${loadedFeeds.length} feeds from local DB.`, 'success');
                } else if (!hasSeenWelcome) {
                    // Only load demo feed if it's truly the first run (welcome not seen)
                    log('First run detected. Loading Guide.', 'info');
                    const demoFeed = { ...ONBOARDING_FEED };
                    demoFeed.items = demoFeed.items.map(item => ({
                        ...item,
                        feedTitle: demoFeed.title,
                        feedUrl: demoFeed.url,
                    }));
                    setFeeds([demoFeed]);
                } else {
                    // User has seen welcome but DB is empty (e.g., deleted all feeds)
                    log('DB empty but user has seen welcome. Staying empty.', 'info');
                    setFeeds([]);
                }
            } catch (e) {
                console.error('Failed to load data from DB', e);
                log('DB load error.', 'error');
            }
            setLoading(false);
        };
        init();
    }, [log]);

    // Persistence: Save on change (IndexedDB)
    const saveTimeoutRef = useRef<number>(0);
    const lastRefreshTimeRef = useRef<number>(0);

    useEffect(() => {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = window.setTimeout(() => {
            saveData(DATA_STORAGE_KEY, { feeds, categories })
                .catch(e => {
                    if (e instanceof StorageQuotaError) {
                        console.error('Storage quota exceeded:', e.message);
                        alert('Storage is full! Please clear cache in Settings to free up space.');
                    } else {
                        console.error('Failed to save to DB', e);
                    }
                });
        }, 1000);
    }, [feeds, categories]);

    const handleRefreshAll = async (isBackground = false) => {
        if (refreshing) return;
        setRefreshing(true);
        if (!isBackground) log('Refreshing all feeds...', 'info');

        const feedsToUpdate = feeds.filter(f => !f.url.startsWith('local://'));

        if (feedsToUpdate.length === 0) {
            if (!isBackground) log('No remote feeds to update.', 'info');
            setRefreshing(false);
            return;
        }

        let updatedCount = 0;
        let failedCount = 0;

        try {
            const results = await pMap(feedsToUpdate, async (feed) => {
                try {
                    // Use proxy if configured
                    const proxyUrl = settings.preferredProxy !== 'auto' ? settings.preferredProxy : undefined;
                    const fetched = await fetchFeed(feed.url, undefined);



                    // ... inside handleRefreshAll ...

                    // Merge items
                    // Merge items
                    // Robust Deduplication: Check both GUID and Link
                    const existingGuids = new Set(feed.items.map(i => i.guid));
                    const existingLinks = new Set(feed.items.map(i => i.link));

                    let newItems = fetched.items.filter(i => {
                        const hasGuid = i.guid && existingGuids.has(i.guid);
                        const hasLink = i.link && existingLinks.has(i.link);
                        return !hasGuid && !hasLink;
                    }).map(item => ({
                        ...item,
                        id: item.guid || item.link, // Ensure ID is set!
                        feedTitle: feed.title,
                        feedUrl: feed.url
                    }));

                    // Process for Offline (Images)
                    if (settings.downloadImages && newItems.length > 0) {
                        // Only process first 20 new items to save bandwidth/time
                        const itemsToProcess = newItems.slice(0, 20);
                        const remainingItems = newItems.slice(20);

                        const processed = await Promise.all(itemsToProcess.map(async (item) => {
                            try {
                                const newContent = await processContentForOffline(item.content);
                                return { ...item, content: newContent };
                            } catch (e) {
                                return item;
                            }
                        }));
                        newItems = [...processed, ...remainingItems];
                    }

                    if (newItems.length > 0) {
                        return { ...feed, items: [...newItems, ...feed.items], lastUpdated: Date.now() };
                    }
                    return feed;
                } catch (e) {
                    failedCount++;
                    return feed;
                }
            }, 3); // Concurrency 3

            // Update state with results
            // We need to map back to the original feeds array to preserve order and local feeds
            setFeeds(prevFeeds => {
                const resultMap = new Map(results.map(f => [f.url, f]));
                return prevFeeds.map(f => resultMap.get(f.url) || f);
            });

            updatedCount = feedsToUpdate.length - failedCount;
            lastRefreshTimeRef.current = Date.now();

        } catch (e) {
            console.error("Refresh failed", e);
        } finally {
            setRefreshing(false);
            if (!isBackground) log(`Refresh Complete. Updated ${updatedCount}, Failed ${failedCount}`, 'success');
        }
    };

    // Auto Refresh Logic
    const handleRefreshAllRef = useRef(handleRefreshAll);
    useEffect(() => {
        handleRefreshAllRef.current = handleRefreshAll;
    }, [handleRefreshAll]);

    useEffect(() => {
        let intervalId: number | undefined;

        const startTimer = () => {
            if (settings.refreshInterval === 0) return;
            // Clear existing to be safe, though useEffect cleanup handles it
            if (intervalId) clearInterval(intervalId);

            // Only log in development to avoid console noise
            if (process.env.NODE_ENV === 'development') {
                console.debug(`[AUTO-REFRESH] Timer started: ${settings.refreshInterval} mins`);
            }
            intervalId = window.setInterval(() => {
                handleRefreshAllRef.current(true);
            }, settings.refreshInterval * 60 * 1000);
        };

        startTimer();

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [settings.refreshInterval]); // Only re-run if interval setting changes, NOT when feeds change

    return {
        feeds,
        setFeeds,
        categories,
        setCategories,
        loading,
        refreshing,
        handleRefreshAll,
        isWelcomeOpen,
        setIsWelcomeOpen
    };
};
