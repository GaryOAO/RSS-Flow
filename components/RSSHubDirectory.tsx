import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Search, ChevronRight, Loader2, Plus, Check } from 'lucide-react';
import { RadarService } from '../services/radar';
import { AppSettings, Language } from '../types';
import { t } from '../utils/i18n';

interface RSSHubDirectoryProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectFeed: (url: string) => void;
    onBatchAdd?: (urls: string[]) => void;
    settings: AppSettings;
    lang: Language;
}

interface DirectoryItem {
    domain: string;
    name: string;
    rules: any[];
}

export const RSSHubDirectory: React.FC<RSSHubDirectoryProps> = ({ isOpen, onClose, onSelectFeed, onBatchAdd, settings, lang }) => {
    const [items, setItems] = useState<{ category: string; sites: DirectoryItem[] }[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedSite, setSelectedSite] = useState<DirectoryItem | null>(null);
    const [selectedFeeds, setSelectedFeeds] = useState<Set<string>>(new Set());

    // Long press state
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isLongPress = useRef(false);

    useEffect(() => {
        if (isOpen && items.length === 0) {
            loadDirectory();
        }
    }, [isOpen]);

    const loadDirectory = async () => {
        setLoading(true);
        try {
            const dir = await RadarService.getDirectory(settings);
            setItems(dir);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Filter logic
    const displayData = useMemo(() => {
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            const allSites: (DirectoryItem & { category: string })[] = [];
            items.forEach(group => {
                group.sites.forEach(site => {
                    if (site.name.toLowerCase().includes(lower) || site.domain.toLowerCase().includes(lower)) {
                        allSites.push({ ...site, category: group.category });
                    }
                });
            });
            return { type: 'search', data: allSites };
        }

        if (selectedCategory) {
            const group = items.find(g => g.category === selectedCategory);
            return { type: 'sites', data: group ? group.sites : [] };
        }

        return { type: 'categories', data: items };
    }, [items, searchTerm, selectedCategory]);

    const getFeedUrl = (rule: any) => {
        let target = rule.target;
        if (typeof target === 'string') {
            target = target.replace(/\/:[a-zA-Z0-9_?]+\?/g, '');
            const hubBase = settings.rssHubInstance.replace(/\/$/, '');
            return `${hubBase}${target}`;
        }
        return '';
    };

    const handleFeedClick = (rule: any) => {
        if (isLongPress.current) {
            isLongPress.current = false;
            return;
        }

        const url = getFeedUrl(rule);
        if (!url) return;

        // If in selection mode, toggle
        if (selectedFeeds.size > 0) {
            toggleFeed(url);
            return;
        }

        // Normal click: Open feed
        let target = rule.target;
        if (typeof target === 'string') {
            if (target.includes(':')) {
                const param = window.prompt(`This feed requires a parameter.\nPath: ${target}\n\nEnter value to replace params (e.g. ID):`);
                if (!param) return;
                target = target.replace(/:[a-zA-Z0-9_?]+/g, param);
            }
            target = target.replace(/\/:[a-zA-Z0-9_?]+\?/g, '');
            const hubBase = settings.rssHubInstance.replace(/\/$/, '');
            onSelectFeed(`${hubBase}${target}`);
            onClose();
        }
    };

    const handleTouchStart = (url: string) => {
        isLongPress.current = false;
        timerRef.current = setTimeout(() => {
            isLongPress.current = true;
            // Trigger selection mode
            toggleFeed(url);
            // Haptic feedback could go here
            if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
    };

    const handleTouchEnd = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const toggleFeed = (url: string) => {
        const newSet = new Set(selectedFeeds);
        if (newSet.has(url)) {
            newSet.delete(url);
        } else {
            newSet.add(url);
        }
        setSelectedFeeds(newSet);
    };

    const handleBatchAddClick = () => {
        if (onBatchAdd) {
            onBatchAdd(Array.from(selectedFeeds));
            setSelectedFeeds(new Set());
            onClose();
        }
    };

    const getCategoryName = (catKey: string) => {
        const map: Record<string, { zh: string, en: string }> = {
            'social-media': { zh: '社交媒体', en: 'Social Media' },
            'new-media': { zh: '新媒体', en: 'New Media' },
            'programming': { zh: '编程', en: 'Programming' },
            'game': { zh: '游戏', en: 'Game' },
            'live': { zh: '直播', en: 'Live' },
            'multimedia': { zh: '多媒体', en: 'Multimedia' },
            'picture': { zh: '图片', en: 'Picture' },
            'anime': { zh: '二次元', en: 'Anime' },
            'program-update': { zh: '程序更新', en: 'App Update' },
            'university': { zh: '大学通知', en: 'University' },
            'forecast': { zh: '天气预报', en: 'Weather' },
            'travel': { zh: '出行旅游', en: 'Travel' },
            'shopping': { zh: '购物', en: 'Shopping' },
            'finance': { zh: '金融', en: 'Finance' },
            'other': { zh: '其他', en: 'Other' },
            'blog': { zh: '博客', en: 'Blog' },
            'journal': { zh: '期刊', en: 'Journal' },
            'reading': { zh: '阅读', en: 'Reading' },
            'government': { zh: '政府', en: 'Government' },
            'study': { zh: '学习', en: 'Study' },
            'bbs': { zh: '论坛', en: 'BBS' },
            'traditional-media': { zh: '传统媒体', en: 'Traditional Media' },
            'design': { zh: '设计', en: 'Design' }
        };

        const entry = map[catKey];
        if (!entry) return catKey;
        return lang === 'zh' ? entry.zh : entry.en;
    };

    if (!isOpen) return null;

    const isSelectionMode = selectedFeeds.size > 0;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pt-[calc(1rem+var(--safe-top))] animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                        <span className="text-orange-500">RSSHub</span> {t(lang, 'rssHubDirectory').replace('RSSHub ', '')}
                        {isSelectionMode && <span className="text-sm bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{t(lang, 'selected').replace('{count}', selectedFeeds.size.toString())}</span>}
                    </h3>
                    <div className="flex items-center gap-2">
                        {isSelectionMode && (
                            <button
                                onClick={() => setSelectedFeeds(new Set())}
                                className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400"
                            >
                                {t(lang, 'cancelSelection')}
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-950">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={selectedSite ? t(lang, 'searchIn').replace('{name}', selectedSite.name) : t(lang, 'searchSites')}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {loading ? (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 gap-2">
                            <Loader2 className="animate-spin" /> {t(lang, 'loading')}
                        </div>
                    ) : selectedSite ? (
                        // Level 3: Feeds List for Selected Site
                        <div className="w-full h-full flex flex-col">
                            <button
                                onClick={() => setSelectedSite(null)}
                                className="p-3 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 border-b dark:border-zinc-800"
                            >
                                <ChevronRight className="rotate-180 shrink-0" size={16} /> {selectedCategory ? t(lang, 'backToCategories') : t(lang, 'backToResults')}
                            </button>
                            <div className="flex-1 overflow-y-auto p-2 pb-20">
                                <div className="mb-4 px-2">
                                    <h2 className="text-xl font-bold dark:text-white">{selectedSite.name}</h2>
                                    <p className="text-sm text-gray-500">{selectedSite.domain}</p>
                                    {!isSelectionMode && <p className="text-xs text-gray-400 mt-1">{t(lang, 'longPressSelect')}</p>}
                                </div>
                                <div className="grid gap-2">
                                    {selectedSite.rules.map((rule, idx) => {
                                        const url = getFeedUrl(rule);
                                        const isSelected = selectedFeeds.has(url);
                                        return (
                                            <div
                                                key={idx}
                                                className={`flex items-center p-3 rounded-lg border transition-all duration-200 select-none ${isSelected ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                                                onTouchStart={() => handleTouchStart(url)}
                                                onTouchEnd={handleTouchEnd}
                                                onMouseDown={() => handleTouchStart(url)}
                                                onMouseUp={handleTouchEnd}
                                                onMouseLeave={handleTouchEnd}
                                                onClick={() => handleFeedClick(rule)}
                                            >
                                                {isSelectionMode && (
                                                    <div className={`mr-3 w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                        {isSelected && <Check size={12} className="text-white" />}
                                                    </div>
                                                )}
                                                <div className="flex-1 text-left">
                                                    <div className="font-medium dark:text-gray-200">
                                                        {rule.title}
                                                    </div>
                                                    {rule.docs && (
                                                        <div className="text-xs text-gray-400 mt-1 truncate">
                                                            {rule.docs}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : displayData.type === 'search' ? (
                        // Search Results (Global)
                        <div className="w-full h-full overflow-y-auto p-2">
                            {(displayData.data as any[]).length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    {t(lang, 'noSitesFound').replace('{query}', searchTerm)}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {(displayData.data as any[]).map((item) => (
                                        <button
                                            key={item.domain}
                                            onClick={() => {
                                                setSelectedSite(item);
                                            }}
                                            className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-left"
                                        >
                                            <div className="overflow-hidden">
                                                <div className="font-medium dark:text-gray-200 truncate">{item.name}</div>
                                                <div className="text-xs text-gray-400 truncate flex items-center gap-2">
                                                    <span className="bg-gray-100 dark:bg-zinc-700 px-1 rounded text-[10px]">{getCategoryName(item.category)}</span>
                                                    {item.domain}
                                                </div>
                                            </div>
                                            <div className="text-xs bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-gray-300 px-2 py-1 rounded-full">
                                                {item.rules.length}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : displayData.type === 'sites' ? (
                        // Level 2: Sites in Category
                        <div className="w-full h-full flex flex-col">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className="p-3 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 border-b dark:border-zinc-800"
                            >
                                <ChevronRight className="rotate-180 shrink-0" size={16} /> {t(lang, 'backToCategories')}
                            </button>
                            <div className="p-3 border-b dark:border-zinc-800 font-bold text-lg dark:text-white">
                                {getCategoryName(selectedCategory!)}
                            </div>
                            <div className="flex-1 overflow-y-auto p-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {(displayData.data as DirectoryItem[]).map((item) => (
                                        <button
                                            key={item.domain}
                                            onClick={() => setSelectedSite(item)}
                                            className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors text-left"
                                        >
                                            <div className="overflow-hidden">
                                                <div className="font-medium dark:text-gray-200 truncate">{item.name}</div>
                                                <div className="text-xs text-gray-400 truncate">{item.domain}</div>
                                            </div>
                                            <div className="text-xs bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-gray-300 px-2 py-1 rounded-full">
                                                {item.rules.length}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Level 1: Categories
                        <div className="w-full h-full overflow-y-auto p-2">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {(displayData.data as { category: string; sites: DirectoryItem[] }[]).map((group) => (
                                    <button
                                        key={group.category}
                                        onClick={() => setSelectedCategory(group.category)}
                                        className="p-4 rounded-xl border border-gray-100 dark:border-zinc-800 hover:bg-orange-50 dark:hover:bg-zinc-800 hover:border-orange-200 dark:hover:border-orange-900 transition-all text-left flex flex-col justify-between h-24 group"
                                    >
                                        <div className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-orange-600 dark:group-hover:text-orange-400">
                                            {getCategoryName(group.category)}
                                        </div>
                                        <div className="text-xs text-gray-400 flex justify-between items-center">
                                            <span>{t(lang, 'siteCount').replace('{count}', group.sites.length.toString())}</span>
                                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-orange-400" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Batch Add Button */}
                {selectedFeeds.size > 0 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-in slide-in-from-bottom-4 fade-in duration-200">
                        <button
                            onClick={handleBatchAddClick}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2"
                        >
                            <Plus size={20} className="shrink-0" />
                            {t(lang, 'addSelected').replace('{count}', selectedFeeds.size.toString())}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
