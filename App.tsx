
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Feed, FeedItem, AppSettings, Category, Language } from './types';
import { fetchFeed } from './services/rssParser';
import { FeedList } from './components/FeedList';
import { ArticleList } from './components/ArticleList';
import { ArticleReader } from './components/ArticleReader';
import { PagingReader } from './components/PagingReader';
import { SettingsModal } from './components/SettingsModal';
import { WelcomeModal } from './components/WelcomeModal';
import { EmptyState } from './components/EmptyState';
import { Menu, Settings as SettingsIcon, Plus, X, Rss, Clock, Star, Bookmark, FolderOpen, Layout, PanelLeft, Search, Sparkles, Loader2 } from 'lucide-react';
import { saveData, loadData } from './services/db';
import { processContentForOffline, restoreOriginalImages, processFeedItemsForOffline } from './services/contentProcessor';
import { ONBOARDING_FEED } from './data/onboardingFeed';
import { generateOPML, parseOPML } from './services/opml';
import { RadarService } from './services/radar';
import { RSSHubDirectory } from './components/RSSHubDirectory';
import { DailyDigestView } from './components/DailyDigestView';
import { t } from './utils/i18n';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Toast } from '@capacitor/toast';




import { Capacitor } from '@capacitor/core';
import { SafeArea } from 'capacitor-plugin-safe-area';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import { useSettingsContext } from './contexts/SettingsContext';
import { useFeedContext } from './contexts/FeedContext';
import { DEFAULT_SETTINGS } from './hooks/useSettings';
import { useAppLifecycle } from './hooks/useAppLifecycle';
import { OfflineIndicator } from './components/OfflineIndicator';

const SETTINGS_STORAGE_KEY = 'inkflow_settings'; // Kept for migration if needed, but logic moved
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

// Concurrency Helper

const App: React.FC = () => {
    // Context
    const { settings, updateSettings, resetSettings } = useSettingsContext();
    const {
        feeds, setFeeds,
        categories, setCategories,
        loading, refreshing,
        handleRefreshAll,
        isWelcomeOpen, setIsWelcomeOpen
    } = useFeedContext();

    // View State
    const [activeFeedUrl, setActiveFeedUrl] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null); // For Folder View
    const [specialView, setSpecialView] = useState<'timeline' | 'favorites' | 'read-later' | 'search' | 'daily-digest' | null>('timeline');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeArticle, setActiveArticle] = useState<FeedItem | null>(null);

    const [showSidebar, setShowSidebar] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    // isWelcomeOpen moved to Context

    // Modals State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
    const [isDailyDigestOpen, setIsDailyDigestOpen] = useState(false);
    const [newFeedUrl, setNewFeedUrl] = useState('');
    const [selectedCatForNewFeed, setSelectedCatForNewFeed] = useState<string>(''); // '' = none, 'new' = create
    const [newCategoryName, setNewCategoryName] = useState('');
    const [addFeedLoading, setAddFeedLoading] = useState(false);
    const [addFeedError, setAddFeedError] = useState<string | null>(null);
    const [addFeedAbortController, setAddFeedAbortController] = useState<AbortController | null>(null);

    const lang = settings.language;

    // Simple internal logger
    const log = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
        console.log(`[${type.toUpperCase()}] ${msg}`);
    };

    const lastBackPressRef = useRef<number>(0);

    // App Lifecycle Management
    useAppLifecycle({
        onPause: () => {
            console.log('App pausing - auto-save handled by FeedContext');
        },
        onResume: () => {
            console.log('App resumed - consider refreshing feeds');
        },
        onBackButton: () => {
            // Handle back button for modals/readers
            if (activeArticle) {
                setActiveArticle(null);
                return true; // Prevent default
            }
            if (isSettingsOpen) {
                setIsSettingsOpen(false);
                return true;
            }
            if (isAddModalOpen) {
                setIsAddModalOpen(false);
                return true;
            }
            if (isDailyDigestOpen) {
                setIsDailyDigestOpen(false);
                return true;
            }
            if (isDirectoryOpen) {
                setIsDirectoryOpen(false);
                return true;
            }

            // Close Sidebar on Mobile if open
            if (showSidebar && window.innerWidth < 768) {
                setShowSidebar(false);
                return true;
            }

            // Double tap to exit
            const now = Date.now();
            if (now - lastBackPressRef.current < 2000) {
                // Double tap detected exit
                return false; // Allow default (exit app)
            } else {
                lastBackPressRef.current = now;
                Toast.show({ text: t(lang, 'pressAgainToExit'), duration: 'short' });
                return true; // Prevent default
            }
        }
    });

    // Persistence & Auto Refresh logic moved to FeedContext


    // --- NATIVE OPTIMIZATIONS ---

    // 1. Status Bar & Navigation Bar
    // 1. Status Bar & Navigation Bar

    // ... imports ...

    // 1. Status Bar & Navigation Bar
    useEffect(() => {
        const configStatusBar = async () => {
            try {
                const platform = Capacitor.getPlatform();

                // Only configure StatusBar on native platforms
                if (platform !== 'web') {
                    const isDark = settings.theme === 'dark';
                    const isPaper = settings.theme === 'paper';

                    // Set status bar style (icon colors)
                    await StatusBar.setStyle({
                        style: isDark ? Style.Dark : Style.Light
                    });

                    // Set status bar background to transparent so app background shows through
                    // The app will handle the spacing via CSS padding
                    await StatusBar.setBackgroundColor({ color: '#00000000' });

                    // Set overlay to true to let app draw behind status bar
                    await StatusBar.setOverlaysWebView({ overlay: true });
                }

                // --- Safe Area Logic (Platform Specific) ---
                if (platform === 'android') {
                    try {
                        // 1. Try to get dynamic height from plugin
                        const insets = await SafeArea.getSafeAreaInsets() as any;

                        // 2. Determine top value (Dynamic or Fallback)
                        // If plugin returns > 0, use it. Otherwise use 35px fallback.
                        const topValue = insets.top > 0 ? `${insets.top}px` : '35px';

                        // 3. Inject variable
                        document.documentElement.style.setProperty('--safe-top', topValue);

                        // Also inject other insets for completeness
                        for (const [key, value] of Object.entries(insets)) {
                            document.documentElement.style.setProperty(`--safe-area-inset-${key}`, `${value}px`);
                        }

                        // Listen for changes
                        SafeArea.addListener('safeAreaChanged', (data) => {
                            const newTop = data.insets.top > 0 ? `${data.insets.top}px` : '35px';
                            document.documentElement.style.setProperty('--safe-top', newTop);
                            for (const [key, value] of Object.entries(data.insets)) {
                                document.documentElement.style.setProperty(`--safe-area-inset-${key}`, `${value}px`);
                            }
                        });

                    } catch (e) {
                        console.warn('Safe Area plugin failed on Android', e);
                        // Fallback if plugin fails completely
                        document.documentElement.style.setProperty('--safe-top', '35px');
                    }
                } else {
                    // Web & iOS: Use standard env()
                    // On Web, env() is 0px, so no gap.
                    // On iOS, env() works perfectly.
                    document.documentElement.style.setProperty('--safe-top', 'env(safe-area-inset-top)');
                }

            } catch (e) {
                console.warn('StatusBar config failed', e);
            }
        };
        configStatusBar();

        return () => {
            if (Capacitor.getPlatform() === 'android') {
                try {
                    SafeArea.removeAllListeners();
                } catch (e) {
                    console.warn('Failed to remove SafeArea listeners', e);
                }
            }
        };
    }, [settings.theme]);

    // Legacy Back Button Logic Removed (Moved to useAppLifecycle)

    const handleWelcomeClose = () => {
        localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
        setIsWelcomeOpen(false);
    };




    const handleAddFeedSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFeedUrl.trim()) return;

        // Create AbortController for this request
        const controller = new AbortController();
        setAddFeedAbortController(controller);
        setAddFeedLoading(true);
        setAddFeedError(null);
        log(`Attempting to add feed: ${newFeedUrl}`, 'info');

        try {
            if (feeds.some(f => f.url === newFeedUrl)) {
                throw new Error(t(lang, 'feedExists'));
            }

            let finalCategoryId = selectedCatForNewFeed === 'new' ? undefined : selectedCatForNewFeed;
            if (selectedCatForNewFeed === 'new' && newCategoryName.trim()) {
                const newId = Date.now().toString();
                setCategories(prev => [...prev, { id: newId, name: newCategoryName.trim() }]);
                finalCategoryId = newId;
                log(`Created new category: ${newCategoryName}`, 'success');
            }

            const newFeed = await fetchFeed(newFeedUrl, log, controller.signal);

            if (settings.downloadImages) {
                log('Downloading images for offline use...', 'info');
                newFeed.items = await processFeedItemsForOffline(newFeed.items);
            }

            newFeed.items = newFeed.items.map(item => ({
                ...item,
                id: item.guid || item.link,
                feedTitle: newFeed.title,
                feedUrl: newFeed.url,
                isFavorite: false,
                isRead: false
            }));
            newFeed.categoryId = finalCategoryId || undefined;

            setFeeds(prev => [...prev, newFeed]);

            setActiveFeedUrl(newFeed.url);
            setSpecialView(null);
            setSearchQuery('');
            setIsAddModalOpen(false);
            setNewFeedUrl('');
            setNewCategoryName('');
            setSelectedCatForNewFeed('');

            log(`${t(lang, 'feedAdded')}: ${newFeed.title}`, 'success');
        } catch (e: any) {
            if (e.message === 'Request cancelled') {
                setAddFeedError(t(lang, 'requestCancelled'));
                log('Feed loading cancelled by user', 'info');
            } else {
                setAddFeedError(e.message || t(lang, 'errorLoading'));
                log(e.message, 'error');
            }
        } finally {
            setAddFeedLoading(false);
            setAddFeedAbortController(null);
        }
    };

    const handleCancelAddFeed = () => {
        if (addFeedAbortController) {
            addFeedAbortController.abort();
            setAddFeedAbortController(null);
        }
    };

    const handleAddCategory = (parentId?: string) => {
        const name = prompt(t(lang, 'createNewList').replace('+ ', '').replace('...', ''));
        if (name) {
            const id = Date.now().toString();
            setCategories(prev => [...prev, { id, name, parentId }]);
        }
    };

    const handleMoveCategory = (categoryId: string, newParentId: string | undefined) => {
        if (categoryId === newParentId) return;
        setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, parentId: newParentId } : c));
    };

    const handleRenameCategory = (id: string, newName: string) => {
        setCategories(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
    };

    const handleDeleteCategory = (id: string) => {
        setFeeds(prev => prev.map(f => f.categoryId === id ? { ...f, categoryId: undefined } : f));
        setCategories(prev => prev.filter(c => c.id !== id));
        if (activeCategory === id) setActiveCategory(null);
    };

    const handleDeleteFeed = (url: string) => {
        log(`Delete Feed Triggered: ${url}`, 'info');

        // 1. Clear Active Feed if matched
        if (activeFeedUrl === url) {
            setActiveFeedUrl(null);
            setSpecialView('timeline');
            setActiveArticle(null);
        }

        // 2. Clear Active Article if it belongs to the deleted feed
        if (activeArticle && activeArticle.feedUrl === url) {
            setActiveArticle(null);
        }

        // 3. Update Feeds State
        setFeeds(prev => {
            const newFeeds = prev.filter(f => f.url !== url);
            log(`Feeds count: ${prev.length} -> ${newFeeds.length}`, 'info');
            return newFeeds;
        });
    };

    const handleMoveFeedToCategory = (feedUrl: string, categoryId: string | undefined) => {
        setFeeds(prev => prev.map(f => f.url === feedUrl ? { ...f, categoryId } : f));
    };

    const handleClearImageCache = () => {
        console.log('Clearing Image Cache');
        setFeeds(prevFeeds => {
            return prevFeeds.map(feed => ({
                ...feed,
                items: feed.items.map(item => ({
                    ...item,
                    content: restoreOriginalImages(item.content)
                }))
            }));
        });
    };

    const handleClearAllData = () => {
        console.log('Clearing All Data');

        setCategories([]);
        setActiveFeedUrl(null);
        setActiveCategory(null);
        setSpecialView('timeline');
        setActiveArticle(null);
        resetSettings();

        // Clear DB but MARK Welcome as seen so we get a truly empty state, not the guide again.
        saveData(DATA_STORAGE_KEY, { feeds: [], categories: [] }).then(() => {
            console.log('DB Wiped');
            // Ensure welcome key is present so we don't reload guide
            localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
            window.location.reload();
        });
    };

    const handleToggleFavorite = (item: FeedItem) => {
        setFeeds(prevFeeds => prevFeeds.map(feed => {
            const itemExists = feed.items.find(i => (i.id === item.id) || (i.link === item.link));
            if (itemExists) {
                return {
                    ...feed,
                    items: feed.items.map(i => {
                        if ((i.id === item.id) || (i.link === item.link)) {
                            return { ...i, isFavorite: !i.isFavorite };
                        }
                        return i;
                    })
                };
            }
            return feed;
        }));

        if (activeArticle && (activeArticle.id === item.id || activeArticle.link === item.link)) {
            setActiveArticle(prev => prev ? ({ ...prev, isFavorite: !prev.isFavorite }) : null);
        }
    };

    const handleToggleReadLater = (item: FeedItem) => {
        setFeeds(prevFeeds => prevFeeds.map(feed => {
            const itemExists = feed.items.find(i => (i.id === item.id) || (i.link === item.link));
            if (itemExists) {
                return {
                    ...feed,
                    items: feed.items.map(i => {
                        if ((i.id === item.id) || (i.link === item.link)) {
                            const newIsReadLater = !i.isReadLater;
                            const newIsRead = newIsReadLater ? false : i.isRead;
                            return { ...i, isReadLater: newIsReadLater, isRead: newIsRead };
                        }
                        return i;
                    })
                };
            }
            return feed;
        }));
    };

    const handleMarkAsRead = (item: FeedItem) => {
        if (item.isRead) return;

        setFeeds(prevFeeds => prevFeeds.map(feed => {
            if (item.feedUrl && feed.url !== item.feedUrl) return feed;

            const itemIndex = feed.items.findIndex(i => (i.id === item.id) || (i.link === item.link));
            if (itemIndex !== -1) {
                const newItems = [...feed.items];
                newItems[itemIndex] = { ...newItems[itemIndex], isRead: true };
                return { ...feed, items: newItems };
            }
            return feed;
        }));
    };

    const handleUpdateArticle = (updatedItem: FeedItem) => {
        setFeeds(prevFeeds => prevFeeds.map(feed => {
            const itemExists = feed.items.find(i => (i.id === updatedItem.id) || (i.link === updatedItem.link));
            if (itemExists) {
                return {
                    ...feed,
                    items: feed.items.map(i => {
                        if ((i.id === updatedItem.id) || (i.link === updatedItem.link)) {
                            return updatedItem;
                        }
                        return i;
                    })
                };
            }
            return feed;
        }));

        if (activeArticle && (activeArticle.id === updatedItem.id || activeArticle.link === updatedItem.link)) {
            setActiveArticle(updatedItem);
        }
    };

    const handleMarkAllRead = (target?: { type: 'feed' | 'category' | 'all', id: string }) => {
        const type = target?.type || 'all';
        log(`Mark All Read Request - Type: ${type}`, 'info');

        setFeeds(prevFeeds => {
            return prevFeeds.map(feed => {
                let shouldUpdate = false;
                if (type === 'all') shouldUpdate = true;
                else if (type === 'feed' && feed.url === target?.id) shouldUpdate = true;
                else if (type === 'category' && feed.categoryId === target?.id) shouldUpdate = true;

                if (shouldUpdate) {
                    const unreadCount = feed.items.filter(i => !i.isRead).length;
                    if (unreadCount > 0) {
                        return {
                            ...feed,
                            items: feed.items.map(i => ({ ...i, isRead: true }))
                        };
                    }
                }
                return feed;
            });
        });
        Toast.show({ text: t(lang, 'markedAllRead') });
    };

    const handleToggleMute = (feedUrl: string) => {
        setFeeds(prev => prev.map(f => f.url === feedUrl ? { ...f, isMuted: !f.isMuted } : f));
    };

    const handleExportOPML = async () => {
        const xml = generateOPML(feeds, categories);
        const fileName = `rss-flow-export-${new Date().toISOString().slice(0, 10)}.opml`;

        try {
            if (Capacitor.getPlatform() !== 'web') {
                // Native: Write to cache and share
                await Filesystem.writeFile({
                    path: fileName,
                    data: xml,
                    directory: Directory.Cache,
                    encoding: Encoding.UTF8,
                });

                const uriResult = await Filesystem.getUri({
                    directory: Directory.Cache,
                    path: fileName,
                });

                await Share.share({
                    title: t(lang, 'exportOPMLTitle'),
                    text: t(lang, 'exportOPMLText'),
                    url: uriResult.uri,
                    dialogTitle: t(lang, 'exportOPMLDialogTitle'),
                });
            } else {
                // Web: Download directly
                const blob = new Blob([xml], { type: 'text/xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (e: any) {
            console.error('Export failed', e);
            Toast.show({ text: `${t(lang, 'errorLoading')}: ${e.message}` });
        }
    };
    const handleImportOPML = async (file: File) => {
        const text = await file.text();
        try {
            const { feeds: parsedFeeds, categories: parsedCategories } = await parseOPML(text);

            const newCategories = [...categories];
            const categoryMap = new Map<string, string>(categories.map(c => [c.name, c.id]));

            parsedCategories.forEach(catName => {
                if (!categoryMap.has(catName)) {
                    const newId = Date.now().toString() + Math.random().toString().slice(2, 5);
                    newCategories.push({ id: newId, name: catName });
                    categoryMap.set(catName, newId);
                }
            });
            setCategories(newCategories);

            const currentUrls = new Set(feeds.map(f => f.url));
            const feedsToAdd = parsedFeeds.filter(f => !currentUrls.has(f.url));

            if (feedsToAdd.length === 0) {
                alert(t(lang, 'noNewFeeds'));
                return;
            }

            setIsSettingsOpen(false);
            // setLoading(true); // Managed by context

            const newFeedObjects: Feed[] = [];

            for (const f of feedsToAdd) {
                try {
                    const feed = await fetchFeed(f.url);
                    if (f.categoryId && categoryMap.has(f.categoryId)) {
                        feed.categoryId = categoryMap.get(f.categoryId);
                    }

                    feed.items = feed.items.map(item => ({
                        ...item,
                        id: item.guid || item.link,
                        feedTitle: feed.title,
                        feedUrl: feed.url,
                        isFavorite: false,
                        isRead: false
                    }));

                    newFeedObjects.push(feed);
                } catch (e) {
                    console.warn(`Failed to import ${f.url}`, e);
                }
            }

            setFeeds(prev => [...prev, ...newFeedObjects]);

        } catch (e) {
            console.error(e);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim()) {
            setSpecialView('search');
            setActiveFeedUrl(null);
            setActiveCategory(null);
            setActiveArticle(null);
        } else {
            setSpecialView('timeline');
        }
    };

    const updateSetting = <T extends keyof AppSettings>(key: T, value: AppSettings[T]) => {
        // setSettings(prev => ({ ...prev, [key]: value })); // Original line
        // Assuming `updateSettings` is a function provided by a context or hook
        // that handles updating the settings state.
        updateSettings({ [key]: value });
    };



    const displayedArticles = useMemo(() => {
        if (specialView === 'search' && searchQuery) {
            const query = searchQuery.toLowerCase();
            const allItems = feeds.flatMap(f => f.items);
            return allItems.filter(item =>
                item.title.toLowerCase().includes(query) ||
                item.contentSnippet?.toLowerCase().includes(query) ||
                item.feedTitle?.toLowerCase().includes(query)
            ).sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        }
        if (specialView === 'timeline') {
            const all = feeds.flatMap(f => f.items);
            return all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        }
        if (specialView === 'favorites') {
            return feeds.flatMap(f => f.items).filter(i => i.isFavorite);
        }
        if (specialView === 'read-later') {
            const allItems = feeds.flatMap(f => f.items).filter(i => i.isReadLater);
            // Deduplicate by ID or Link
            const uniqueItems = new Map();
            allItems.forEach(item => {
                const key = item.id || item.link;
                if (!uniqueItems.has(key)) {
                    uniqueItems.set(key, item);
                }
            });
            return Array.from(uniqueItems.values());
        }
        if (specialView === 'daily-digest') {
            // Daily digest shows its own UI, not article list
            return [];
        }
        if (activeFeedUrl) {
            const feed = feeds.find(f => f.url === activeFeedUrl);
            return feed ? feed.items : [];
        }
        if (activeCategory) {
            const catFeeds = feeds.filter(f => f.categoryId === activeCategory);
            const allCatItems = catFeeds.flatMap(f => f.items);
            return allCatItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        }
        // Default to Timeline (All Feeds) if nothing selected
        const all = feeds.flatMap(f => f.items);
        return all.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    }, [feeds, activeFeedUrl, activeCategory, specialView, searchQuery]);

    const viewTitle = useMemo(() => {
        if (specialView === 'search') return `${t(lang, 'searchPlaceholder')} "${searchQuery}"`;
        if (specialView === 'timeline') return t(lang, 'timeline');
        if (specialView === 'favorites') return t(lang, 'favorites');
        if (specialView === 'read-later') return t(lang, 'readLater');
        if (specialView === 'daily-digest') return t(lang, 'dailyDigest');
        if (activeFeedUrl) return feeds.find(f => f.url === activeFeedUrl)?.title || t(lang, 'feed');
        if (activeCategory) return categories.find(c => c.id === activeCategory)?.name || t(lang, 'list');
        if (activeCategory) return categories.find(c => c.id === activeCategory)?.name || t(lang, 'list');
        return t(lang, 'timeline'); // Default title
    }, [specialView, activeFeedUrl, activeCategory, feeds, categories, searchQuery, lang]);

    const getViewIcon = () => {
        if (specialView === 'search') return <Search size={20} className="text-blue-500" />;
        if (specialView === 'timeline') return <Clock size={20} className="text-blue-500" />;
        if (specialView === 'favorites') return <Star size={20} className="text-yellow-500 fill-current" />;
        if (specialView === 'read-later') return <Bookmark size={20} className="text-emerald-500 fill-current" />;
        if (specialView === 'daily-digest') return <Sparkles size={20} className="text-purple-500" />;
        if (activeCategory) return <FolderOpen size={20} className="text-blue-500" />;
        if (activeFeedUrl) {
            const feed = feeds.find(f => f.url === activeFeedUrl);
            if (feed?.favicon) return <img src={feed.favicon} className="w-5 h-5 rounded-sm" alt="" />;
            return <Rss size={20} className="text-orange-500" />;
        }
        return <Layout size={20} className="text-gray-500" />;
    };

    const getFontFamily = () => {
        switch (settings.fontFamily) {
            case 'serif': return '"Merriweather", serif';
            case 'mono': return 'monospace';
            case 'georgia': return 'Georgia, serif';
            case 'literata': return '"Literata", serif';
            case 'sans':
            default: return '"Inter", sans-serif';
        }
    };

    const isReaderOpen = !!activeArticle;

    const effectiveSettings = settings.eInkMode ? { ...settings, theme: 'light' as const } : settings;

    return (
        <div className={`flex h-screen w-screen overflow-hidden ${settings.eInkMode ? 'bg-white text-black' : (settings.theme === 'dark' ? 'dark bg-black' : settings.theme === 'paper' ? 'bg-[#f7f1e3] text-amber-900' : 'bg-gray-50')} ${settings.eInkMode ? 'e-ink-optimized' : ''}`}>

            <style>{`
        :root {
            font-size: ${settings.uiScale * 100}%;
            --font-size: ${settings.fontSize}px;
            --line-height: ${settings.lineHeight};
            --letter-spacing: ${settings.letterSpacing}px;
            --para-spacing: ${settings.paragraphSpacing}em;
            --max-width: ${settings.pageWidth}px;
            --margin: ${settings.margins}px;
            --font-family: ${getFontFamily()};
        }
        /* Disable tap highlight and focus outline for E-Ink */
        * {
            -webkit-tap-highlight-color: transparent;
        }
        button:focus, button:focus-visible {
            outline: none !important;
            box-shadow: none !important;
            --tw-ring-offset-width: 0px;
            --tw-ring-color: transparent;
        }
      `}</style>



            <WelcomeModal
                isOpen={isWelcomeOpen}
                onClose={handleWelcomeClose}
                language={lang}
            />

            <div className={`${showSidebar ? 'w-72 border-r' : 'w-0'} flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden border-gray-200 z-50 bg-white relative h-full max-w-[100vw]`}>
                <FeedList
                    feeds={feeds}
                    categories={categories}
                    activeFeedUrl={activeFeedUrl}
                    activeCategory={activeCategory}
                    specialView={specialView}
                    isRefreshing={refreshing}
                    searchQuery={searchQuery}
                    onSelectFeed={(url) => {
                        setActiveFeedUrl(url);
                        setActiveCategory(null);
                        setSpecialView(null);
                        setActiveArticle(null);
                        if (window.innerWidth < 768) setShowSidebar(false);
                    }}
                    onSelectCategory={(id) => {
                        setActiveCategory(id);
                        setActiveFeedUrl(null);
                        setSpecialView(null);
                        setActiveArticle(null);
                        if (window.innerWidth < 768) setShowSidebar(false);
                    }}
                    onSelectSpecialView={(view) => {
                        setSpecialView(view);
                        setActiveFeedUrl(null);
                        setActiveCategory(null);
                        setActiveArticle(null);
                        if (window.innerWidth < 768) setShowSidebar(false);
                    }}
                    onSearch={handleSearch}
                    onDeleteFeed={handleDeleteFeed}
                    onRenameCategory={handleRenameCategory}
                    onDeleteCategory={handleDeleteCategory}
                    onAddFeed={() => setIsAddModalOpen(true)}
                    onAddCategory={handleAddCategory}
                    onMarkAllRead={handleMarkAllRead}
                    onToggleMute={handleToggleMute}
                    onRefreshAll={() => handleRefreshAll(false)}
                    onMoveFeedToCategory={handleMoveFeedToCategory}
                    onMoveCategory={handleMoveCategory}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onCloseSidebar={() => setShowSidebar(false)}
                    settings={effectiveSettings}
                />
            </div>

            <div className={`flex-1 flex flex-col min-w-0 relative ${settings.eInkMode ? 'bg-white' : (settings.theme === 'dark' ? 'bg-zinc-900' : 'bg-white')}`}>
                <SettingsModal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    onReset={resetSettings}
                    onExportOPML={handleExportOPML}
                    onImportOPML={handleImportOPML}
                    onClearCache={handleClearImageCache}
                    onClearAllData={handleClearAllData}
                />
                {!isReaderOpen && specialView !== 'daily-digest' && (
                    <header className={`min-h-[calc(3.5rem+var(--safe-top))] pt-[var(--safe-top)] border-b flex items-center justify-between px-4 py-2 gap-2 ${settings.theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                            <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex-shrink-0">
                                {showSidebar ? <PanelLeft size={20} className="text-blue-600" /> : <PanelLeft size={20} />}
                            </button>
                            <div className="flex flex-col overflow-hidden min-w-0">
                                <h1 className="font-bold text-lg tracking-tight flex items-center gap-2 truncate">
                                    {getViewIcon()}
                                    <span className="truncate">{viewTitle}</span>
                                </h1>
                                <span className={`text-[10px] font-medium ml-7 -mt-1 truncate ${settings.theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>
                                    {displayedArticles.length} results
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                title="Settings"
                            >
                                <SettingsIcon size={20} />
                            </button>
                        </div>
                    </header>
                )}

                <div className="flex-1 relative overflow-hidden">
                    {/* Reader View (Overlay) */}
                    {isReaderOpen && (
                        <div className="absolute inset-0 z-30 bg-white dark:bg-zinc-900 animate-in slide-in-from-bottom duration-300">
                            {settings.eInkMode ? (
                                <PagingReader
                                    article={activeArticle}
                                    settings={effectiveSettings}
                                    onBack={() => setActiveArticle(null)}
                                    onUpdateSettings={updateSetting}
                                    onOpenSettings={() => setIsSettingsOpen(true)}
                                    onToggleFavorite={handleToggleFavorite}
                                    onUpdateArticle={handleUpdateArticle}
                                />
                            ) : (
                                <ArticleReader
                                    article={activeArticle}
                                    settings={effectiveSettings}
                                    onBack={() => setActiveArticle(null)}
                                    onOpenSettings={() => setIsSettingsOpen(true)}
                                    onToggleFavorite={handleToggleFavorite}
                                    onUpdateArticle={handleUpdateArticle}
                                />
                            )}
                        </div>
                    )}

                    {/* Main List / Digest View */}
                    <div className={`h-full flex flex-col ${isReaderOpen ? 'hidden' : ''}`}>
                        {specialView === 'daily-digest' ? (
                            <DailyDigestView
                                articles={feeds.flatMap(f => f.items)}
                                settings={effectiveSettings}
                                onNavigateToArticle={(id) => {
                                    const article = feeds.flatMap(f => f.items).find(i => i.id === id || i.guid === id);
                                    if (article) {
                                        setActiveArticle(article);
                                    } else {
                                        console.warn('Article not found:', id);
                                    }
                                }}
                                onToggleSidebar={() => setShowSidebar(!showSidebar)}
                            />
                        ) : (
                            feeds.length === 0 && !loading ? (
                                <EmptyState
                                    onAddFeed={() => setIsAddModalOpen(true)}
                                    onOpenSettings={() => setIsSettingsOpen(true)}
                                    language={lang}
                                />
                            ) : (
                                <ArticleList
                                    articles={displayedArticles}
                                    feedTitle={viewTitle}
                                    isTimelineMode={specialView === 'timeline' || specialView === 'search' || !!activeCategory}
                                    isLoading={loading}
                                    onSelectArticle={(item) => {
                                        handleMarkAsRead(item);
                                        setActiveArticle({ ...item, isRead: true });
                                        // Force sidebar closed when reading to ensure full screen focus
                                        setShowSidebar(false);
                                    }}
                                    onToggleReadLater={handleToggleReadLater}
                                    onMarkAsRead={handleMarkAsRead}
                                    settings={settings}
                                />
                            )
                        )}
                    </div>
                </div>


            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg dark:text-white">{t(lang, 'subscribeTitle')}</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddFeedSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t(lang, 'feedUrl')}</label>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={newFeedUrl}
                                        onChange={(e) => setNewFeedUrl(e.target.value)}
                                        placeholder="https://example.com/feed.xml"
                                        className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                        autoFocus
                                        required
                                    />
                                    {settings.enableRadar && (
                                        <button
                                            type="button"
                                            onClick={() => setIsDirectoryOpen(true)}
                                            className="p-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                                            title="Browse RSSHub Directory"
                                        >
                                            <Rss size={20} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t(lang, 'addTo')}</label>
                                <select
                                    value={selectedCatForNewFeed}
                                    onChange={(e) => setSelectedCatForNewFeed(e.target.value)}
                                    className="w-full p-3 border rounded-lg bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">{t(lang, 'uncategorized')}</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                    <option value="new">{t(lang, 'createNewList')}</option>
                                </select>
                            </div>

                            {selectedCatForNewFeed === 'new' && (
                                <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t(lang, 'newListName')}</label>
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="e.g., Tech News"
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                        required
                                    />
                                </div>
                            )}

                            {addFeedError && (
                                <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-red-600 text-sm">
                                    {addFeedError}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleCancelAddFeed();
                                        setIsAddModalOpen(false);
                                    }}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                                    disabled={addFeedLoading}
                                >
                                    {t(lang, 'cancel')}
                                </button>
                                {addFeedLoading ? (
                                    <button
                                        type="button"
                                        onClick={handleCancelAddFeed}
                                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-sm transition-colors"
                                    >
                                        <X size={18} className="inline mr-1" /> {t(lang, 'cancelLoading')}
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-bold shadow-sm transition-colors"
                                    >
                                        <Plus size={18} /> {t(lang, 'subscribeBtn')}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <RSSHubDirectory
                isOpen={isDirectoryOpen}
                onClose={() => setIsDirectoryOpen(false)}
                onSelectFeed={(url) => {
                    setNewFeedUrl(url);
                    // Optionally auto-submit or focus
                }}
                onBatchAdd={async (urls) => {
                    const newUrls = urls.filter(u => !feeds.some(f => f.url === u));
                    if (newUrls.length === 0) {
                        Toast.show({ text: t(lang, 'feedExists') });
                        return;
                    }

                    // Close the Add Feed modal and Directory since we are handling this in background
                    setIsAddModalOpen(false);
                    setIsDirectoryOpen(false);

                    setAddFeedLoading(true);
                    Toast.show({ text: t(lang, 'addingFeeds').replace('{count}', newUrls.length.toString()) });

                    let addedCount = 0;
                    const newFeeds: Feed[] = [];
                    const failedUrls: string[] = [];

                    for (const url of newUrls) {
                        try {
                            // Add a small delay to avoid overwhelming the server/network
                            if (addedCount > 0) await new Promise(resolve => setTimeout(resolve, 500));

                            const newFeed = await fetchFeed(url);
                            if (settings.downloadImages) {
                                newFeed.items = await processFeedItemsForOffline(newFeed.items);
                            }
                            newFeed.items = newFeed.items.map(item => ({
                                ...item,
                                id: item.guid || item.link,
                                feedTitle: newFeed.title,
                                feedUrl: newFeed.url,
                                isFavorite: false,
                                isRead: false
                            }));
                            newFeeds.push(newFeed);
                            addedCount++;
                        } catch (e: any) {
                            console.error(`Failed to add ${url}`, e);
                            failedUrls.push(url);
                        }
                    }

                    if (newFeeds.length > 0) {
                        setFeeds(prev => [...prev, ...newFeeds]);
                        Toast.show({ text: t(lang, 'addSuccess').replace('{count}', addedCount.toString()) });
                    }

                    if (failedUrls.length > 0) {
                        Toast.show({ text: t(lang, 'addFailed').replace('{count}', failedUrls.length.toString()) });
                    }
                    setAddFeedLoading(false);
                }}
                settings={settings}
                lang={lang}
            />

        </div>
    );
}

export default App;