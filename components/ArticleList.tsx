
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FeedItem, AppSettings, Language } from '../types';
import { BookOpen, Calendar, ChevronLeft, ChevronRight, Star, Clock, BarChart, Bookmark, Check } from 'lucide-react';
import { t } from '../utils/i18n';

interface Props {
    articles: FeedItem[];
    onSelectArticle: (article: FeedItem) => void;
    onToggleReadLater?: (article: FeedItem) => void;
    onMarkAsRead?: (article: FeedItem) => void;
    isLoading: boolean;
    settings: AppSettings;
    feedTitle: string; // "Timeline", "Favorites" or Specific Feed Title
    isTimelineMode?: boolean;
}

// --- HELPER: Group articles by date ---
const groupArticlesByDate = (articles: FeedItem[], lang: Language) => {
    const groups: { [key: string]: FeedItem[] } = {};
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();

    articles.forEach(article => {
        const d = new Date(article.pubDate);
        let key = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

        if (d.toLocaleDateString() === today) key = t(lang, 'today');
        else if (d.toLocaleDateString() === yesterday) key = t(lang, 'yesterday');

        if (!groups[key]) groups[key] = [];
        groups[key].push(article);
    });

    return Object.entries(groups).sort((a, b) => {
        // Sort groups by the date of the first item in the group (descending)
        return new Date(b[1][0].pubDate).getTime() - new Date(a[1][0].pubDate).getTime();
    });
};

interface SwipeableItemProps {
    children: React.ReactNode;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    isReadLater?: boolean;
    disabled?: boolean;
    lang: Language;
}

// --- COMPONENT: Swipeable Article Item ---
const SwipeableItem: React.FC<SwipeableItemProps> = ({
    children,
    onSwipeLeft,
    onSwipeRight,
    isReadLater,
    disabled = false,
    lang
}) => {
    const [offsetX, setOffsetX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const startX = useRef(0);
    const startY = useRef(0);
    const isScrolling = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const THRESHOLD = 80;

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        if (disabled) return;
        setIsSwiping(true);
        isScrolling.current = false;
        // Use clientX for both touch and mouse
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        startX.current = clientX;
        startY.current = clientY;
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isSwiping || disabled || isScrolling.current) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        const diffX = clientX - startX.current;
        const diffY = clientY - startY.current;

        // If vertical scroll is detected (and significant), lock horizontal swipe
        if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 5) {
            isScrolling.current = true;
            return;
        }

        // Limit swipe range slightly for resistance
        const limit = 150;
        const limitedDiff = Math.max(Math.min(diffX, limit), -limit);

        setOffsetX(limitedDiff);
    };

    const handleTouchEnd = () => {
        if (!isSwiping || disabled) return;
        setIsSwiping(false);

        if (offsetX > THRESHOLD && onSwipeRight) {
            onSwipeRight();
        } else if (offsetX < -THRESHOLD && onSwipeLeft) {
            onSwipeLeft();
        }

        // Reset position
        setOffsetX(0);
    };

    // Background color based on swipe direction
    let bgColor = 'transparent';
    let icon = null;
    let opacity = Math.min(Math.abs(offsetX) / (THRESHOLD * 1.5), 1);

    if (offsetX > 0) {
        // Swipe Right -> Read Later
        bgColor = 'rgb(16, 185, 129)'; // Emerald 500
        icon = <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white flex flex-col items-center gap-1">
            <Bookmark fill={isReadLater ? "white" : "none"} size={24} />
            <span className="text-[10px] font-bold uppercase">{isReadLater ? t(lang, 'delete') : t(lang, 'readLater')}</span>
        </div>;
    } else if (offsetX < 0) {
        // Swipe Left -> Mark Read
        bgColor = 'rgb(100, 116, 139)'; // Slate 500
        icon = <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white flex flex-col items-center gap-1">
            <Check size={24} />
            <span className="text-[10px] font-bold uppercase">{t(lang, 'markRead')}</span>
        </div>;
    }

    return (
        <div
            className="relative overflow-hidden"
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            // Add Mouse handlers for desktop testing
            onMouseDown={handleTouchStart}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
            onMouseLeave={() => { if (isSwiping) handleTouchEnd(); }}
            style={{ touchAction: 'pan-y' }}
        >
            {/* Background Actions */}
            <div
                className="absolute inset-0 flex items-center justify-between pointer-events-none transition-colors duration-200"
                style={{ backgroundColor: Math.abs(offsetX) > 10 ? bgColor : 'transparent', opacity: opacity }}
            >
                {icon}
            </div>

            {/* Foreground Content */}
            <div
                className="relative bg-inherit transition-transform duration-200 ease-out"
                style={{
                    transform: `translateX(${offsetX}px)`,
                    // Disable transition during drag for immediate response
                    transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
            >
                {children}
            </div>
        </div>
    );
};

// --- COMPONENT: Activity Chart ---
const DailyActivityChart = ({ articles, isDark, lang }: { articles: FeedItem[], isDark: boolean, lang: string }) => {
    const data = useMemo(() => {
        const days = 7;
        const counts = new Array(days).fill(0);
        const labels = new Array(days).fill('');
        const now = new Date();

        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(now.getDate() - (days - 1 - i));
            labels[i] = d.toLocaleDateString(undefined, { weekday: 'narrow' }); // M, T, W

            const start = new Date(d.setHours(0, 0, 0, 0)).getTime();
            const end = new Date(d.setHours(23, 59, 59, 999)).getTime();

            counts[i] = articles.filter(a => {
                const t = new Date(a.pubDate).getTime();
                return t >= start && t <= end;
            }).length;
        }
        return { counts, labels, max: Math.max(...counts, 1) };
    }, [articles]);

    return (
        <div className={`p-4 mb-4 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-slate-100 shadow-sm'}`}>
            <div className={`flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-400'}`}>
                <BarChart size={14} /> {t(lang, 'activityLast7Days')}
            </div>
            <div className="flex items-end justify-between h-32 gap-1">
                {data.counts.map((count, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <div
                            className={`w-full min-w-[4px] rounded-t-sm transition-all duration-500 relative ${isDark ? 'bg-blue-500' : 'bg-blue-200'}`}
                            style={{ height: `${(count / data.max) * 100}%`, minHeight: count > 0 ? '4px' : '2px' }}
                        >
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                {count} {t(lang, 'posts')}
                            </div>
                        </div>
                        <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{data.labels[i]}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ArticleList: React.FC<Props> = ({ articles, onSelectArticle, onToggleReadLater, onMarkAsRead, isLoading, settings, feedTitle, isTimelineMode }) => {
    const isDark = settings.theme === 'dark';
    const isPaper = settings.theme === 'paper';
    const lang = settings.language;
    const [page, setPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(6);
    const listContainerRef = useRef<HTMLDivElement>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: FeedItem } | null>(null);

    const handleContextMenu = (e: React.MouseEvent, item: FeedItem) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, item });
    };

    // Reset page when feed changes (only if actually different)
    const prevFeedTitleRef = useRef(feedTitle);
    useEffect(() => {
        // Only reset if feedTitle actually changed to prevent unnecessary resets
        if (prevFeedTitleRef.current !== feedTitle) {
            setPage(0);
            prevFeedTitleRef.current = feedTitle;
        }
    }, [feedTitle]);

    // Calculate items per page for E-Ink mode
    useEffect(() => {
        if (settings.eInkMode && listContainerRef.current) {
            const updateItemsPerPage = () => {
                if (listContainerRef.current) {
                    const height = listContainerRef.current.clientHeight;
                    // Safety check: If container is hidden or initializing, don't update (or keep previous)
                    if (height === 0) return;

                    const remBase = 16 * settings.uiScale;

                    // Footer (~4.5rem) + List Padding (~1rem) = 5.5rem
                    const reservedHeight = 5.5 * remBase;
                    const availableHeight = height - reservedHeight;

                    // Dynamic Measurement: Try to find the first item to measure its actual height
                    // We default to the estimate if no items are rendered yet
                    let itemHeight = (6.5 * remBase) + 4; // Default estimate

                    const firstItem = listContainerRef.current.querySelector('.article-item');
                    if (firstItem) {
                        // Get actual height + gap (space-y-4 = 1rem)
                        const style = window.getComputedStyle(firstItem);
                        const marginTop = parseFloat(style.marginTop);
                        const marginBottom = parseFloat(style.marginBottom);
                        // The space-y-4 adds margin-top to subsequent siblings, but we can approximate gap
                        // Best way: item.offsetHeight + 1rem (gap)
                        // Note: space-y-4 adds margin-top: 1rem to children except first.
                        // So effective height for packing is height + 1rem.
                        itemHeight = firstItem.getBoundingClientRect().height + remBase;
                    }

                    const count = Math.max(1, Math.floor(availableHeight / itemHeight));

                    // Only update if changed to avoid loops, but we need to be careful
                    setItemsPerPage(prev => {
                        if (prev !== count) return count;
                        return prev;
                    });
                }
            };

            // Initial calculation
            updateItemsPerPage();

            // Recalculate when content might have changed size (e.g. images loading, though unlikely in list)
            // or when window resizes
            window.addEventListener('resize', updateItemsPerPage);

            // We also need to check after render if the estimate was wrong
            // Use a timeout to allow render
            const timer = setTimeout(updateItemsPerPage, 100);

            return () => {
                window.removeEventListener('resize', updateItemsPerPage);
                clearTimeout(timer);
            };
        }
    }, [settings.eInkMode, settings.uiScale, articles, page]); // Add dependencies to trigger recalc

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center h-full ${isDark ? 'bg-zinc-900 text-gray-400' : 'bg-white text-gray-500'}`}>
                <div className="animate-pulse flex flex-col items-center gap-2">
                    <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>{t(lang, 'loading')}</span>
                </div>
            </div>
        );
    }

    // --- E-INK MODE: Paginated List ---
    if (settings.eInkMode) {
        const totalPages = Math.ceil(articles.length / itemsPerPage);
        const displayedArticles = articles.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
        return (
            <div className="flex flex-col h-full bg-white border-r-2 border-black" ref={listContainerRef}>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                    {displayedArticles.map((item, idx) => (
                        <div
                            key={item.id || item.guid || idx}
                            onClick={() => onSelectArticle(item)}
                            onContextMenu={(e) => handleContextMenu(e, item)}
                            className={`block p-4 rounded-xl border-2 border-black transition-all active:bg-black active:text-white article-item group relative ${item.isRead ? '' : 'border-l-[6px]'}`}
                        >
                            {item.isFavorite && <div className="absolute top-2 right-2 text-black group-hover:text-white"><Star size={12} fill="currentColor" /></div>}
                            <h3 className={`font-bold text-lg mb-1 leading-tight pr-4 line-clamp-2 ${item.isRead ? 'font-normal' : 'font-black'}`}>
                                {item.title}
                            </h3>
                            <div className="text-xs flex justify-between items-center mt-2">
                                <span className="font-mono">{new Date(item.pubDate).toLocaleDateString()}</span>
                                {isTimelineMode && <span className="font-bold truncate max-w-[120px]">{item.feedTitle}</span>}
                            </div>
                        </div>
                    ))}
                    {displayedArticles.length === 0 && (
                        <div className="p-4 text-center italic">{t(lang, 'noArticles')}</div>
                    )}
                </div>

                {/* Pagination Footer */}
                <div className="border-t-2 border-black p-4 flex items-center justify-between shrink-0 bg-white">
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className={`p-2 border-2 border-black rounded-lg shrink-0 ${page === 0 ? 'opacity-30' : 'active:bg-black active:text-white'}`}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <span className="font-bold text-xl flex-1 text-center">
                        {page + 1} / {Math.max(1, totalPages)}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className={`p-2 border-2 border-black rounded-lg shrink-0 ${page >= totalPages - 1 ? 'opacity-30' : 'active:bg-black active:text-white'}`}
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* E-ink Context Menu */}
                {
                    contextMenu && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 p-4" onClick={(e) => { e.stopPropagation(); setContextMenu(null); }}>
                            <div className="bg-white border-4 border-black p-4 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" onClick={e => e.stopPropagation()}>
                                <h3 className="font-black text-lg mb-4 truncate">{contextMenu.item.title}</h3>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => { onToggleReadLater?.(contextMenu.item); setContextMenu(null); }}
                                        className="w-full flex items-center gap-3 p-4 border-2 border-black font-bold text-lg hover:bg-black hover:text-white transition-none"
                                    >
                                        <Bookmark size={20} className={contextMenu.item.isReadLater ? "fill-current" : ""} />
                                        {contextMenu.item.isReadLater ? t(lang, 'removeReadLater') : t(lang, 'readLater')}
                                    </button>
                                    {!contextMenu.item.isRead && (
                                        <button
                                            onClick={() => { onMarkAsRead?.(contextMenu.item); setContextMenu(null); }}
                                            className="w-full flex items-center gap-3 p-4 border-2 border-black font-bold text-lg hover:bg-black hover:text-white transition-none"
                                        >
                                            <Check size={20} /> {t(lang, 'markAsRead')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        );
    }

    // --- STANDARD MODE ---

    // Visual Timeline Layout
    if (isTimelineMode && !settings.eInkMode) {
        const groupedArticles = groupArticlesByDate(articles, lang);

        return (
            <div className={`flex flex-col h-full overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-800' : isPaper ? 'bg-[#f7f1e3] border-amber-900/10' : 'bg-white border-slate-200'}`}>
                <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">

                    {/* Activity Chart */}
                    <DailyActivityChart articles={articles} isDark={isDark} lang={lang} />

                    <div className="relative pl-2">
                        {/* Continuous Vertical Line */}
                        <div className={`absolute left-[19px] top-2 bottom-0 w-0.5 ${isDark ? 'bg-zinc-700' : isPaper ? 'bg-amber-900/10' : 'bg-slate-200'}`} />

                        {groupedArticles.map(([dateLabel, items]) => (
                            <div key={dateLabel} className="mb-8 relative">
                                {/* Date Header Node */}
                                <div className="flex items-center gap-4 mb-4 relative z-10">
                                    <div className={`w-3 h-3 rounded-full border-2 ${isDark ? 'bg-zinc-900 border-blue-500' : isPaper ? 'bg-[#f7f1e3] border-amber-900' : 'bg-white border-blue-500'} ml-[14px]`} />
                                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${isDark ? 'bg-zinc-800 text-gray-200' : isPaper ? 'bg-amber-900/10 text-amber-900' : 'bg-slate-100 text-slate-600'}`}>
                                        {dateLabel}
                                    </span>
                                </div>

                                {/* Articles */}
                                <div className="space-y-4 pl-10">
                                    {items.map((item) => (
                                        <SwipeableItem
                                            key={item.id}
                                            onSwipeRight={() => onToggleReadLater?.(item)}
                                            onSwipeLeft={() => onMarkAsRead?.(item)}
                                            isReadLater={item.isReadLater}
                                            lang={lang}
                                        >
                                            <div
                                                onClick={() => onSelectArticle(item)}
                                                onContextMenu={(e) => handleContextMenu(e, item)}
                                                className={`p-4 rounded-xl border cursor-pointer transition-all hover:translate-x-1 relative group
                                                ${isDark
                                                        ? 'bg-zinc-800/40 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600'
                                                        : isPaper
                                                            ? 'bg-white/60 border-amber-900/10 hover:bg-white hover:border-amber-900/20'
                                                            : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'
                                                    }
                                                ${item.isRead ? 'opacity-70' : ''}
                                            `}
                                            >
                                                {item.isReadLater && (
                                                    <div className="absolute -top-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-sm z-10">
                                                        <Bookmark size={10} fill="currentColor" />
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-start gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                        {new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {item.isFavorite && <Star size={14} className="text-yellow-500 fill-current" />}
                                                </div>

                                                <h3 className={`font-bold text-base mb-2 leading-snug ${isDark ? 'text-gray-200' : isPaper ? 'text-amber-900' : 'text-slate-800'} ${item.isRead ? 'font-normal' : ''}`}>
                                                    {item.title}
                                                </h3>

                                                <div className="flex items-center gap-2 text-xs opacity-60">
                                                    <span className={`font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{item.feedTitle}</span>
                                                </div>
                                            </div>
                                        </SwipeableItem>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {articles.length === 0 && (
                            <div className="p-10 text-center text-gray-400 pl-10">{t(lang, 'noActivity')}</div>
                        )}
                    </div>
                </div>

                {/* Context Menu Overlay */}
                {contextMenu && (
                    <>
                        <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
                        <div
                            className={`fixed z-50 rounded-lg shadow-xl border py-1 w-48 backdrop-blur-md select-none
                            ${isDark ? 'bg-zinc-800/95 border-zinc-700 text-gray-200' : 'bg-white/95 border-gray-200 text-slate-800'}
                        `}
                            style={{
                                top: Math.min(contextMenu.y, window.innerHeight - 120),
                                left: Math.min(contextMenu.x, window.innerWidth - 200)
                            }}
                        >
                            <button
                                onClick={() => { onToggleReadLater?.(contextMenu.item); setContextMenu(null); }}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors
                                ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-slate-100'}
                            `}
                            >
                                <Bookmark size={16} className={contextMenu.item.isReadLater ? "fill-emerald-500 text-emerald-500" : ""} />
                                {contextMenu.item.isReadLater ? t(lang, 'removeReadLater') : t(lang, 'readLater')}
                            </button>

                            {!contextMenu.item.isRead && (
                                <button
                                    onClick={() => { onMarkAsRead?.(contextMenu.item); setContextMenu(null); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors
                                    ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-slate-100'}
                                `}
                                >
                                    <Check size={16} />
                                    {t(lang, 'markAsRead')}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Standard Scrollable List (For Single Feeds / Favorites / Read Later)
    return (
        <div className={`flex flex-col h-full overflow-hidden ${isDark ? 'bg-zinc-900 border-zinc-800' : isPaper ? 'bg-[#f7f1e3] border-amber-900/10' : 'bg-white border-slate-200'}`}>
            <div className="flex-1 overflow-y-auto">
                {articles.length === 0 && (
                    <div className="p-10 text-center text-gray-400">{t(lang, 'noArticles')}</div>
                )}
                {articles.map((item, idx) => {
                    const isRead = item.isRead;
                    return (
                        <SwipeableItem
                            key={item.id || item.guid || idx}
                            onSwipeRight={() => onToggleReadLater?.(item)}
                            onSwipeLeft={() => onMarkAsRead?.(item)}
                            isReadLater={item.isReadLater}
                            lang={lang}
                        >
                            <div
                                onClick={() => onSelectArticle(item)}
                                onContextMenu={(e) => handleContextMenu(e, item)}
                                className={`p-5 border-b cursor-pointer transition-all hover:pl-6 relative group
                        ${isDark
                                        ? 'border-zinc-800 hover:bg-zinc-800 text-gray-300'
                                        : isPaper
                                            ? 'border-amber-900/10 hover:bg-white/50 text-amber-900'
                                            : 'border-slate-100 hover:bg-slate-50 text-slate-800'
                                    }
                        ${isRead ? 'opacity-75' : ''}
                        ${!isDark && !isRead ? 'bg-white' : ''}
                    `}
                            >
                                {item.isReadLater && (
                                    <div className="absolute top-0 right-0 bg-emerald-500 text-white p-1 rounded-bl-lg shadow-sm z-10">
                                        <Bookmark size={12} fill="currentColor" />
                                    </div>
                                )}
                                <div className="flex justify-between items-start gap-2">
                                    <h3 className={`text-lg mb-2 leading-tight ${settings.fontFamily === 'serif' ? 'font-serif' : 'font-sans'}
                            ${isRead
                                            ? (isDark ? 'font-normal text-gray-400' : isPaper ? 'font-normal text-amber-900/70' : 'font-normal text-slate-600')
                                            : (isDark ? 'font-bold text-gray-100' : isPaper ? 'font-bold text-amber-900' : 'font-bold text-slate-900')
                                        }
                        `}>
                                        {item.title}
                                    </h3>
                                    {item.isFavorite && <Star size={16} className="text-yellow-500 fill-current shrink-0 mt-1" />}
                                </div>

                                <div className={`text-sm mb-3 line-clamp-2 ${isDark ? 'text-gray-400' : isPaper ? 'text-amber-900/70' : 'text-slate-500'}`}>
                                    {item.contentSnippet}
                                </div>

                                <div className={`flex items-center gap-4 text-xs ${isDark ? 'text-gray-400' : isPaper ? 'text-amber-900/50' : 'text-slate-400'}`}>
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(item.pubDate).toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center gap-1 text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                        <BookOpen size={12} /> {t(lang, 'read')}
                                    </span>
                                </div>
                            </div>
                        </SwipeableItem>
                    )
                })}
            </div>

            {/* Context Menu Overlay (Standard) */}
            {contextMenu && (
                <>
                    <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
                    <div
                        className={`fixed z-50 rounded-lg shadow-xl border py-1 w-48 backdrop-blur-md select-none
                        ${isDark ? 'bg-zinc-800/95 border-zinc-700 text-gray-200' : 'bg-white/95 border-gray-200 text-slate-800'}
                    `}
                        style={{
                            top: Math.min(contextMenu.y, window.innerHeight - 120),
                            left: Math.min(contextMenu.x, window.innerWidth - 200)
                        }}
                    >
                        <button
                            onClick={() => { onToggleReadLater?.(contextMenu.item); setContextMenu(null); }}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors
                            ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-slate-100'}
                        `}
                        >
                            <Bookmark size={16} className={contextMenu.item.isReadLater ? "fill-emerald-500 text-emerald-500" : ""} />
                            {contextMenu.item.isReadLater ? t(lang, 'removeReadLater') : t(lang, 'readLater')}
                        </button>

                        {!contextMenu.item.isRead && (
                            <button
                                onClick={() => { onMarkAsRead?.(contextMenu.item); setContextMenu(null); }}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors
                                ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-slate-100'}
                            `}
                            >
                                <Check size={16} />
                                {t(lang, 'markAsRead')}
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};