
import React, { useState } from 'react';
import { Feed, AppSettings, Category } from '../types';
import {
    Rss, Trash2, Plus, ChevronLeft, ChevronRight,
    Clock, Star, Folder, MoreVertical,
    ChevronDown, Edit2, ArrowLeft,
    CheckCheck, Bell, BellOff, X, Bookmark, RefreshCw, Search, Sparkles, Settings, PanelLeft
} from 'lucide-react';
import { t, formatTimeAgo } from '../utils/i18n';

interface Props {
    feeds: Feed[];
    categories: Category[];
    activeFeedUrl: string | null;
    activeCategory: string | null;
    specialView: 'timeline' | 'favorites' | 'read-later' | 'search' | 'daily-digest' | null;

    onSelectFeed: (url: string) => void;
    onSelectCategory: (id: string) => void;
    onSelectSpecialView: (view: 'timeline' | 'favorites' | 'read-later' | 'search' | 'daily-digest') => void;

    onDeleteFeed: (url: string) => void;
    onRenameCategory: (id: string, newName: string) => void;
    onDeleteCategory: (id: string) => void;

    onAddFeed: () => void;
    onAddCategory: (parentId?: string) => void;

    onMarkAllRead: (target?: { type: 'feed' | 'category' | 'all', id: string }) => void;
    onToggleMute: (feedUrl: string) => void;
    onRefreshAll: () => void;
    onMoveFeedToCategory: (feedUrl: string, categoryId: string | undefined) => void;
    onMoveCategory: (categoryId: string, newParentId: string | undefined) => void;
    onOpenSettings: () => void;
    onCloseSidebar: () => void;
    isRefreshing: boolean;

    searchQuery: string;
    onSearch: (query: string) => void;

    settings: AppSettings;
}

export const FeedList: React.FC<Props> = ({
    feeds, categories, activeFeedUrl, activeCategory, specialView,
    onSelectFeed, onSelectCategory, onSelectSpecialView,
    onDeleteFeed, onRenameCategory, onDeleteCategory,
    onAddFeed, onAddCategory, onMarkAllRead, onToggleMute,
    onRefreshAll, onMoveFeedToCategory, onMoveCategory, onOpenSettings, onCloseSidebar, isRefreshing,
    searchQuery, onSearch,
    settings
}) => {
    const lang = settings.language;
    const totalUnread = feeds.reduce((acc, f) => acc + (f.isMuted ? 0 : f.items.filter(i => !i.isRead).length), 0);

    const lastUpdated = feeds.length > 0 ? Math.max(...feeds.map(f => f.lastUpdated)) : 0;
    const timeSinceUpdate = lastUpdated ? Math.floor((Date.now() - lastUpdated) / 60000) : -1;
    let timeLabel = t(lang, 'never');
    if (timeSinceUpdate >= 0) {
        timeLabel = formatTimeAgo(timeSinceUpdate, lang);
    }

    const handleMarkAllClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onMarkAllRead({ type: 'all', id: '' });
    };

    // Filter lists based on search
    const filteredFeeds = searchQuery
        ? feeds.filter(f => f.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : feeds;

    const filteredCategories = searchQuery
        ? categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || feeds.some(f => f.categoryId === c.id && f.title.toLowerCase().includes(searchQuery.toLowerCase())))
        : categories;

    // Root categories (only those without parents, or all if searching)
    const rootCategories = searchQuery
        ? filteredCategories
        : filteredCategories.filter(c => !c.parentId);

    // --- E-INK MODE LOGIC ---
    const [eInkNavStack, setEInkNavStack] = useState<string | null>(null);
    const [eInkPage, setEInkPage] = useState(0);
    const [isEInkSearchOpen, setIsEInkSearchOpen] = useState(false);
    const ITEMS_PER_PAGE = 7;

    if (settings.eInkMode) {
        const rootFeeds = filteredFeeds.filter(f => !f.categoryId);
        const currentCategory = categories.find(c => c.id === eInkNavStack);

        const listItems = eInkNavStack
            ? [
                // Back Button
                {
                    id: 'back',
                    special: true,
                    icon: ArrowLeft,
                    name: t(lang, 'back'),
                    onClick: () => setEInkNavStack(currentCategory?.parentId || null)
                },
                ...filteredCategories.filter(c => c.parentId === eInkNavStack),
                ...filteredFeeds.filter(f => f.categoryId === eInkNavStack)
            ]
            : [
                // Special Views for E-Ink (matching normal theme order)
                { id: 'timeline', name: t(lang, 'timeline'), icon: Clock, special: true },
                ...(settings.enableAI ? [{ id: 'daily-digest', name: t(lang, 'dailyDigest'), icon: Sparkles, special: true }] : []),
                { id: 'favorites', name: t(lang, 'favorites'), icon: Star, special: true },
                { id: 'read-later', name: t(lang, 'readLater'), icon: Bookmark, special: true },
                ...filteredCategories.filter(c => !c.parentId), // Only root categories
                ...rootFeeds
            ];

        const totalPages = Math.ceil(listItems.length / ITEMS_PER_PAGE);
        const displayedItems = listItems.slice(eInkPage * ITEMS_PER_PAGE, (eInkPage + 1) * ITEMS_PER_PAGE);

        return (
            <div className="flex flex-col h-full bg-white border-r-2 border-black relative select-none">
                {/* E-ink Header */}
                <div className="p-3 pt-[calc(0.75rem+var(--safe-top))] border-b-2 border-black flex flex-col gap-3 bg-white shrink-0">
                    {/* App Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="font-black text-xl flex items-center gap-2">
                            <Rss size={24} strokeWidth={3} />
                            RSS Flow
                        </h2>
                        <div className="flex items-center gap-1 shrink-0">
                            <button onClick={onRefreshAll} className="p-1.5 rounded-md hover:bg-gray-100 transition-none" title={t(lang, 'refresh')}>
                                <RefreshCw size={20} />
                            </button>
                            <button onClick={handleMarkAllClick} className="p-1.5 rounded-md hover:bg-gray-100 transition-none" title={t(lang, 'markAllRead')}>
                                <CheckCheck size={20} />
                            </button>
                            <button onClick={onAddFeed} className="p-1.5 rounded-md hover:bg-gray-100 transition-none" title={t(lang, 'addFeed')}>
                                <Plus size={20} />
                            </button>
                            <button onClick={() => onAddCategory(eInkNavStack || undefined)} className="p-1.5 rounded-md hover:bg-gray-100 transition-none" title={t(lang, 'newList')}>
                                <Folder size={20} />
                            </button>
                        </div>
                    </div>

                    {/* E-ink Search Bar */}
                    <div className="flex items-center border-2 border-black rounded px-2 py-1.5">
                        <Search size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearch(e.target.value)}
                            placeholder={t(lang, 'searchPlaceholder')}
                            className="flex-1 ml-2 outline-none font-bold placeholder-gray-400 bg-transparent min-w-0"
                        />
                        {searchQuery && (
                            <button onClick={() => onSearch('')}><X size={18} /></button>
                        )}
                    </div>

                    {/* Last Updated */}
                    <div className="text-[10px] font-mono text-gray-500 text-right">
                        {isRefreshing ? t(lang, 'updating') : `${t(lang, 'updated')} ${timeLabel}`}
                    </div>
                </div>

                {/* E-ink Content */}
                <div className="flex-1 overflow-hidden p-2 space-y-2">
                    {displayedItems.map((item: any) => {
                        if ('special' in item) { // Special View
                            if (item.id === 'timeline') {
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onSelectSpecialView('timeline')}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 border-black font-semibold text-base transition-none ${specialView === 'timeline' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}`}
                                    >
                                        <Clock size={20} className="shrink-0" />
                                        <span className="flex-1 text-left truncate">{t(lang, 'timeline')}</span>
                                        <ChevronRight size={20} className="shrink-0" />
                                    </button>
                                );
                            } else if (item.id === 'daily-digest') {
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onSelectSpecialView('daily-digest')}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-black font-semibold text-base bg-white text-black hover:bg-gray-50 transition-none"
                                    >
                                        <Sparkles size={20} className="shrink-0" />
                                        <span className="flex-1 text-left truncate">{t(lang, 'dailyDigest')}</span>
                                        <ChevronRight size={20} className="shrink-0" />
                                    </button>
                                );
                            } else if (item.id === 'favorites') {
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onSelectSpecialView('favorites')}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 border-black font-semibold text-base transition-none ${specialView === 'favorites' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}`}
                                    >
                                        <Star size={20} className="shrink-0" />
                                        <span className="flex-1 text-left truncate">{t(lang, 'favorites')}</span>
                                        <ChevronRight size={20} className="shrink-0" />
                                    </button>
                                );
                            } else if (item.id === 'read-later') {
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => onSelectSpecialView('read-later')}
                                        className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 border-black font-semibold text-base transition-none ${specialView === 'read-later' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}`}
                                    >
                                        <Bookmark size={20} className="shrink-0" />
                                        <span className="flex-1 text-left truncate">{t(lang, 'readLater')}</span>
                                        {feeds.flatMap(f => f.items).filter(i => i.isReadLater).length > 0 && (
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border border-current ${specialView === 'read-later' ? 'bg-white text-black' : 'bg-black text-white'}`}>
                                                {feeds.flatMap(f => f.items).filter(i => i.isReadLater).length}
                                            </span>
                                        )}
                                        <ChevronRight size={20} className="shrink-0" />
                                    </button>
                                );
                            } else if (item.id === 'back') {
                                return (
                                    <button
                                        key="back"
                                        onClick={item.onClick}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-black font-black text-lg bg-white text-black hover:bg-gray-100 transition-none"
                                    >
                                        <ArrowLeft size={24} className="shrink-0" />
                                        <span className="flex-1 text-left">{item.name}</span>
                                    </button>
                                );
                            }
                            return null; // Should not happen
                        } else if ('name' in item) { // Category
                            return (
                                <div key={item.id} className="rounded-lg border-2 border-black overflow-hidden mb-1">
                                    <EInkCategoryRow
                                        category={item}
                                        onClick={() => setEInkNavStack(item.id)}
                                        onRename={onRenameCategory}
                                        onDelete={onDeleteCategory}
                                        onMarkRead={() => onMarkAllRead({ type: 'category', id: item.id })}
                                        lang={lang}
                                        feeds={filteredFeeds.filter(f => f.categoryId === item.id)}
                                        showUnreadCount={settings.showUnreadCount}
                                    />
                                </div>
                            );
                        } else { // Feed
                            return (
                                <div key={item.url} className="rounded-lg border-2 border-black overflow-hidden mb-1">
                                    <EInkFeedRow
                                        feed={item}
                                        categories={categories}
                                        lang={lang}
                                        isActive={activeFeedUrl === item.url}
                                        onClick={() => onSelectFeed(item.url)}
                                        onToggleMute={() => onToggleMute(item.url)}
                                        onMarkRead={() => onMarkAllRead({ type: 'feed', id: item.url })}
                                        onDelete={() => onDeleteFeed(item.url)}
                                        onMoveToCategory={onMoveFeedToCategory}
                                        showUnreadCount={settings.showUnreadCount}
                                    />
                                </div>
                            );
                        }
                    })}
                </div>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="p-2 border-t-2 border-black flex justify-between items-center h-16 shrink-0 bg-white">
                        <button disabled={eInkPage === 0} onClick={() => setEInkPage(p => p - 1)} className="p-2 border-2 border-black rounded-lg"><ChevronLeft size={24} /></button>
                        <span className="font-bold">{eInkPage + 1} / {totalPages}</span>
                        <button disabled={eInkPage >= totalPages - 1} onClick={() => setEInkPage(p => p + 1)} className="p-2 border-2 border-black rounded-lg"><ChevronRight size={24} /></button>
                    </div>
                )}
            </div>
        );
    }

    // --- STANDARD MODE LOGIC ---
    const isPaper = settings.theme === 'paper';
    return (
        <div className={`flex flex-col h-full border-r select-none ${isPaper ? 'bg-[#f7f1e3] border-amber-900/10 text-amber-900' : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-slate-200'}`}>
            {/* 1. Header (Branding + Actions) */}
            <div className={`px-4 py-3 pt-[calc(0.75rem+var(--safe-top))] flex justify-between items-center shrink-0 ${isPaper ? 'bg-[#f7f1e3]' : 'bg-white dark:bg-zinc-900'}`}>
                <div className="flex flex-col min-w-0">
                    <h2 className={`font-black text-xl leading-none tracking-tight flex items-center gap-2 ${isPaper ? 'text-amber-900' : 'text-slate-800 dark:text-slate-100'}`}>
                        <Rss size={20} className="text-blue-600" strokeWidth={3} />
                        RSS Flow
                    </h2>
                    <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-1 truncate">
                        {isRefreshing ? t(lang, 'updating') : `${t(lang, 'updated')} ${timeLabel}`}
                    </div>
                </div>
                <div className="flex gap-1 shrink-0">
                    <button
                        onClick={onRefreshAll}
                        className={`p-2 rounded-xl transition-colors ${isPaper ? 'hover:bg-amber-900/10 text-amber-800/60 hover:text-amber-900' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'} ${isRefreshing ? (isPaper ? 'text-amber-900' : 'text-blue-600 dark:text-blue-400') : ''}`}
                        title={t(lang, 'refreshAll')}
                    >
                        <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={handleMarkAllClick}
                        className={`p-2 rounded-xl transition-colors ${isPaper ? 'hover:bg-amber-900/10 text-amber-800/60 hover:text-amber-900' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400'}`}
                        title={t(lang, 'markAllRead')}
                    >
                        <CheckCheck size={18} />
                    </button>
                    <button
                        onClick={onAddFeed}
                        className={`p-2 rounded-xl transition-colors ${isPaper ? 'hover:bg-amber-900/10 text-amber-800/60 hover:text-amber-900' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'}`}
                        title={t(lang, 'addFeed')}
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {/* 2. Search Bar */}
            <div className={`px-3 pb-2 border-b sticky top-0 z-10 ${isPaper ? 'bg-[#f7f1e3] border-amber-900/10' : 'bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800'}`}>
                <div className="relative group">
                    <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isPaper ? 'text-amber-900/40 group-focus-within:text-amber-900' : 'text-slate-400 group-focus-within:text-blue-500'}`} />
                    <input
                        type="text"
                        placeholder={t(lang, 'searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => onSearch(e.target.value)}
                        className={`w-full pl-9 pr-3 py-2 border-none rounded-xl text-sm focus:ring-2 transition-all outline-none ${isPaper ? 'bg-amber-900/5 focus:bg-white focus:ring-amber-900/20 text-amber-900 placeholder-amber-900/40' : 'bg-slate-100 dark:bg-zinc-800 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-zinc-900 text-slate-700 dark:text-slate-200 placeholder-slate-400'}`}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* 3. List Content */}
            <div className="flex-1 overflow-y-auto py-2 custom-scrollbar px-2">

                {/* Special Views */}
                {!searchQuery && (
                    <div className="mb-4 space-y-1 mt-1">
                        <div
                            onClick={() => onSelectSpecialView('timeline')}
                            className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer text-sm font-semibold transition-all duration-200 ${specialView === 'timeline' ? (isPaper ? 'bg-amber-900/10 text-amber-900' : 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none') : (isPaper ? 'hover:bg-white/50 text-amber-900/70' : 'hover:bg-white dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-400')}`}
                        >
                            <Clock size={18} className={specialView === 'timeline' ? 'text-white' : 'text-slate-400'} />
                            {t(lang, 'timeline')}
                        </div>

                        {settings.enableAI && (
                            <div
                                onClick={() => onSelectSpecialView('daily-digest')}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer text-sm font-semibold transition-all duration-200 ${specialView === 'daily-digest' ? (isPaper ? 'bg-amber-900/10 text-amber-900' : 'bg-purple-600 text-white shadow-md shadow-purple-200 dark:shadow-none') : (isPaper ? 'hover:bg-white/50 text-amber-900/70' : 'hover:bg-white dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-400')}`}
                            >
                                <Sparkles size={18} className={specialView === 'daily-digest' ? 'text-white' : (isPaper ? 'text-amber-900/70' : 'text-purple-500')} />
                                {t(lang, 'dailyDigest')}
                            </div>
                        )}

                        <div
                            onClick={() => onSelectSpecialView('favorites')}
                            className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer text-sm font-semibold transition-all duration-200 ${specialView === 'favorites' ? (isPaper ? 'bg-amber-900/10 text-amber-900' : 'bg-yellow-500 text-white shadow-md shadow-yellow-200 dark:shadow-none') : (isPaper ? 'hover:bg-white/50 text-amber-900/70' : 'hover:bg-white dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-400')}`}
                        >
                            <Star size={18} className={specialView === 'favorites' ? 'text-white fill-white' : 'text-slate-400'} />
                            {t(lang, 'favorites')}
                        </div>
                        <div
                            onClick={() => onSelectSpecialView('read-later')}
                            className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer text-sm font-semibold transition-all duration-200 ${specialView === 'read-later' ? (isPaper ? 'bg-amber-900/10 text-amber-900' : 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none') : (isPaper ? 'hover:bg-white/50 text-amber-900/70' : 'hover:bg-white dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-400')}`}
                        >
                            <Bookmark size={18} className={specialView === 'read-later' ? 'text-white fill-white' : 'text-slate-400'} />
                            <span className="flex-1">{t(lang, 'readLater')}</span>
                            {feeds.flatMap(f => f.items).filter(i => i.isReadLater).length > 0 && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${specialView === 'read-later' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400'}`}>
                                    {feeds.flatMap(f => f.items).filter(i => i.isReadLater).length}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Lists / Categories */}
                {/* Lists / Categories */}
                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center group">
                    {t(lang, 'lists')}
                    <button onClick={() => onAddCategory()} className="text-slate-400 hover:text-blue-600 transition-colors p-1" title={t(lang, 'newList')}>
                        <Plus size={14} />
                    </button>
                </div>
                {rootCategories.length > 0 && (
                    <div className="space-y-1 mb-4">
                        {rootCategories.map(cat => (
                            <CategoryRow
                                key={cat.id}
                                category={cat}
                                allCategories={categories}
                                allFeeds={filteredFeeds}
                                activeFeedUrl={activeFeedUrl}
                                activeCategory={activeCategory}
                                onSelectCategory={onSelectCategory}
                                onSelectFeed={onSelectFeed}
                                onDeleteFeed={onDeleteFeed}
                                onRename={onRenameCategory}
                                onDelete={onDeleteCategory}
                                onMarkRead={onMarkAllRead}
                                onToggleMute={onToggleMute}
                                onMoveToCategory={onMoveFeedToCategory}
                                onMoveCategory={onMoveCategory}
                                onAddCategory={onAddCategory}
                                lang={lang}
                                showUnreadCount={settings.showUnreadCount}
                                depth={0}
                                searchQuery={searchQuery}
                            />
                        ))}
                    </div>
                )}

                {/* Uncategorized Feeds */}
                {filteredFeeds.filter(f => !f.categoryId).length > 0 && (
                    <>
                        <div className="px-3 py-2 mt-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {t(lang, 'feeds')}
                        </div>
                        <div className="space-y-1">
                            {filteredFeeds.filter(f => !f.categoryId).map(feed => (
                                <FeedItemRow
                                    key={feed.url}
                                    feed={feed}
                                    isActive={activeFeedUrl === feed.url}
                                    onClick={() => onSelectFeed(feed.url)}
                                    onDelete={() => onDeleteFeed(feed.url)}
                                    onMarkRead={() => onMarkAllRead({ type: 'feed', id: feed.url })}
                                    onToggleMute={() => onToggleMute(feed.url)}
                                    onMoveToCategory={onMoveFeedToCategory}
                                    categories={categories}
                                    lang={lang}
                                    showUnreadCount={settings.showUnreadCount}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Empty State for Search */}
                {searchQuery && filteredFeeds.length === 0 && filteredCategories.length === 0 && (
                    <div className="text-center p-4 text-slate-400 text-sm">
                        {t(lang, 'emptySearch')} "{searchQuery}"
                    </div>
                )}
            </div>
        </div>
    );
};

const EInkFeedRow = ({ feed, categories, isActive, onClick, onToggleMute, onMarkRead, onDelete, onMoveToCategory, lang, showUnreadCount }: any) => {
    const [showMenu, setShowMenu] = useState(false);
    const unreadCount = feed.items.filter((i: any) => !i.isRead).length;

    return (
        <>
            <div
                className={`flex items-center justify-between p-3 border-b border-gray-300 cursor-pointer transition-none relative
                    ${isActive ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}
                `}
                onClick={onClick}
                onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
            >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                    {feed.isMuted && <BellOff size={16} />}
                    <span className={`text-base truncate ${unreadCount > 0 && !feed.isMuted ? 'font-black' : 'font-bold'}`}>
                        {feed.title}
                    </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {!feed.isMuted && unreadCount > 0 && (
                        showUnreadCount ? (
                            <span className="font-mono font-bold text-base">({unreadCount})</span>
                        ) : (
                            <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-white' : 'bg-black'}`} />
                        )
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(true); }}
                        className={`p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-zinc-700 ${isActive ? 'text-white hover:text-black' : 'text-black'}`}
                    >
                        <MoreVertical size={16} />
                    </button>
                </div>
            </div>

            {showMenu && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 p-4" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}>
                    <div className="bg-white border-4 border-black p-4 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-2">
                            <h3 className="font-black text-xl truncate pr-4">{feed.title}</h3>
                            <button onClick={() => setShowMenu(false)}><X size={24} /></button>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={() => { onToggleMute(); setShowMenu(false); }}
                                className="w-full flex items-center gap-3 p-4 border-2 border-black font-bold text-lg hover:bg-black hover:text-white transition-none"
                            >
                                {feed.isMuted ? <Bell size={20} /> : <BellOff size={20} />}
                                {feed.isMuted ? t(lang, 'unmuteFeed') : t(lang, 'muteFeed')}
                            </button>
                            <button
                                onClick={() => { onMarkRead(); setShowMenu(false); }}
                                className="w-full flex items-center gap-3 p-4 border-2 border-black font-bold text-lg hover:bg-black hover:text-white transition-none"
                            >
                                <CheckCheck size={20} /> {t(lang, 'markAllRead')}
                            </button>
                            <button
                                onClick={() => {
                                    if (window.confirm(t(lang, 'confirmDeleteFeed'))) {
                                        onDelete();
                                    }
                                    setShowMenu(false);
                                }}
                                className="w-full flex items-center gap-3 p-4 border-2 border-black font-bold text-lg hover:bg-black hover:text-white transition-none text-red-600 hover:border-red-600"
                            >
                                <Trash2 size={20} /> {t(lang, 'deleteFeed')}
                            </button>
                            <div className="pt-2 border-t border-gray-200">
                                <div className="text-sm font-bold mb-2 px-1">{t(lang, 'moveTo')}:</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => { onMoveToCategory(feed.url, undefined); setShowMenu(false); }}
                                        className={`p-2 border border-black text-sm font-bold ${!feed.categoryId ? 'bg-black text-white' : ''}`}
                                    >
                                        {t(lang, 'uncategorized')}
                                    </button>
                                    {categories.map((c: any) => (
                                        <button
                                            key={c.id}
                                            onClick={() => { onMoveToCategory(feed.url, c.id); setShowMenu(false); }}
                                            className={`p-2 border border-black text-sm font-bold ${feed.categoryId === c.id ? 'bg-black text-white' : ''}`}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const CategoryRow = ({
    category, allCategories, allFeeds, activeFeedUrl, activeCategory,
    onSelectCategory, onSelectFeed, onDeleteFeed, onRename, onDelete,
    onMarkRead, onToggleMute, onMoveToCategory, onMoveCategory, onAddCategory,
    lang, showUnreadCount, depth = 0, searchQuery
}: any) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showMenu, setShowMenu] = useState(false);

    // Filter children
    const childCategories = allCategories.filter((c: any) => c.parentId === category.id);
    const childFeeds = allFeeds.filter((f: any) => f.categoryId === category.id);

    // If searching, we might want to show everything flattened or keep structure.
    // For now, if searching, we rely on the parent component passing flattened list or we just show matches.
    // But since we are recursive, if searchQuery is present, we might want to force expand.
    const hasMatches = searchQuery && (
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        childFeeds.length > 0 ||
        childCategories.length > 0
    );

    if (searchQuery && !hasMatches) return null;

    // Calculate unread count (recursive)
    const getUnreadCount = (catId: string): number => {
        const directFeeds = allFeeds.filter((f: any) => f.categoryId === catId);
        const directUnread = directFeeds.reduce((acc: number, f: any) => acc + f.items.filter((i: any) => !i.isRead).length, 0);
        const subCats = allCategories.filter((c: any) => c.parentId === catId);
        const subUnread = subCats.reduce((acc: number, c: any) => acc + getUnreadCount(c.id), 0);
        return directUnread + subUnread;
    };

    const unreadCount = getUnreadCount(category.id);
    const isActiveView = activeCategory === category.id && !activeFeedUrl;

    return (
        <div className="select-none">
            <div
                className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 ${isActiveView ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300'}`}
                style={{ marginLeft: `${depth * 12}px` }}
                onClick={() => onSelectCategory(category.id)}
                onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
            >
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className={`p-0.5 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded transition-colors ${(childCategories.length === 0 && childFeeds.length === 0) ? 'invisible' : ''}`}
                    >
                        {isExpanded || searchQuery ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <Folder size={16} className={isActiveView ? 'fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400' : 'text-slate-400'} />
                    <span className="font-medium text-sm truncate">{category.name}</span>
                </div>

                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        showUnreadCount ? (
                            <span className={`text-xs font-bold ${isActiveView ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                                {unreadCount}
                            </span>
                        ) : (
                            <div className={`w-2 h-2 rounded-full ${isActiveView ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-400'}`} />
                        )
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(true); }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded transition-all"
                    >
                        <MoreVertical size={14} />
                    </button>
                </div>
            </div>

            {showMenu && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-64 overflow-hidden border border-gray-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-3 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-800/50">
                            <h3 className="font-bold text-sm truncate pr-2 dark:text-white">{category.name}</h3>
                            <button onClick={() => setShowMenu(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={16} /></button>
                        </div>
                        <div className="p-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <button
                                onClick={() => { setShowMenu(false); onAddCategory(category.id); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"
                            >
                                <Plus size={16} /> {t(lang, 'newList')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowMenu(false);
                                    const newName = prompt(t(lang, 'rename') + ':', category.name);
                                    if (newName) onRename(category.id, newName);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"
                            >
                                <Edit2 size={16} /> {t(lang, 'rename')}
                            </button>
                            <button
                                onClick={() => { onMarkRead({ type: 'category', id: category.id }); setShowMenu(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg"
                            >
                                <CheckCheck size={16} /> {t(lang, 'markAllRead')}
                            </button>

                            <div className="h-px bg-gray-100 dark:bg-zinc-800 my-1"></div>
                            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">{t(lang, 'moveTo')}</div>
                            <button
                                onClick={() => { setShowMenu(false); onMoveCategory(category.id, undefined); }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg ${!category.parentId ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                            >
                                {t(lang, 'root')}
                            </button>
                            {allCategories.filter((c: any) => c.id !== category.id).map((c: any) => (
                                <button
                                    key={c.id}
                                    onClick={() => { setShowMenu(false); onMoveCategory(category.id, c.id); }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg ${category.parentId === c.id ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-bold' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                                >
                                    {c.name}
                                </button>
                            ))}

                            <div className="h-px bg-gray-100 dark:bg-zinc-800 my-1"></div>

                            <button
                                onClick={() => {
                                    if (window.confirm(t(lang, 'confirmDeleteCategory'))) {
                                        onDelete(category.id);
                                    }
                                    setShowMenu(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            >
                                <Trash2 size={16} /> {t(lang, 'deleteList')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {(isExpanded || searchQuery) && (
                <div className="mt-1 space-y-1">
                    {childCategories.map((cat: any) => (
                        <CategoryRow
                            key={cat.id}
                            category={cat}
                            allCategories={allCategories}
                            allFeeds={allFeeds}
                            activeFeedUrl={activeFeedUrl}
                            activeCategory={activeCategory}
                            onSelectCategory={onSelectCategory}
                            onSelectFeed={onSelectFeed}
                            onDeleteFeed={onDeleteFeed}
                            onRename={onRename}
                            onDelete={onDelete}
                            onMarkRead={onMarkRead}
                            onToggleMute={onToggleMute}
                            onMoveToCategory={onMoveToCategory}
                            onMoveCategory={onMoveCategory}
                            onAddCategory={onAddCategory}
                            lang={lang}
                            showUnreadCount={showUnreadCount}
                            depth={depth + 1}
                            searchQuery={searchQuery}
                        />
                    ))}
                    {childFeeds.map((feed: any) => (
                        <div key={feed.url} style={{ marginLeft: `${(depth + 1) * 12}px` }}>
                            <FeedItemRow
                                feed={feed}
                                isActive={activeFeedUrl === feed.url}
                                onClick={() => onSelectFeed(feed.url)}
                                onDelete={() => onDeleteFeed(feed.url)}
                                onMarkRead={() => onMarkRead({ type: 'feed', id: feed.url })}
                                onToggleMute={() => onToggleMute(feed.url)}
                                onMoveToCategory={onMoveToCategory}
                                categories={allCategories}
                                lang={lang}
                                showUnreadCount={showUnreadCount}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


interface FeedItemRowProps {
    feed: Feed;
    isActive: boolean;
    onClick: () => void;
    onDelete: () => void;
    onMarkRead: () => void;
    onToggleMute: () => void;
    onMoveToCategory: (url: string, catId: string | undefined) => void;
    categories: Category[];
    lang: any;
    showUnreadCount: boolean;
}

const FeedItemRow: React.FC<FeedItemRowProps> = ({ feed, isActive, onClick, onDelete, onMarkRead, onToggleMute, onMoveToCategory, categories, lang, showUnreadCount }) => {
    const unreadCount = feed.items.filter(i => !i.isRead).length;
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div
            className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all select-none ${isActive ? 'bg-white dark:bg-zinc-800 shadow-sm ring-1 ring-slate-100 dark:ring-zinc-700 text-blue-700 dark:text-blue-400' : 'hover:bg-white dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'} group`}
            onClick={onClick}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setIsMenuOpen(true); }}
        >
            <div className={`flex items-center gap-3 overflow-hidden flex-1 ${feed.isMuted ? 'opacity-50 grayscale' : ''}`}>
                {feed.favicon ? (
                    <img
                        src={feed.favicon}
                        alt=""
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                    />
                ) : null}
                <div className={`w-4 h-4 bg-slate-200 dark:bg-zinc-700 rounded-sm flex-shrink-0 ${feed.favicon ? 'hidden' : ''}`} />

                <div className="flex flex-col overflow-hidden">
                    <span className={`text-sm truncate ${isActive || (unreadCount > 0 && !feed.isMuted) ? 'font-semibold' : 'font-normal'}`}>
                        {feed.title}
                    </span>
                </div>

                {feed.isMuted && <BellOff size={12} className="text-slate-400 flex-shrink-0" />}

                {!feed.isMuted && unreadCount > 0 && (
                    showUnreadCount ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto mr-2 shrink-0 ${isActive ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-zinc-700'}`}>
                            {unreadCount}
                        </span>
                    ) : (
                        <div className={`w-2 h-2 rounded-full ml-auto mr-2 shrink-0 ${isActive ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-400'}`} />
                    )
                )}
            </div>

            <div className="relative">
                <button
                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                    className={`p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 transition-opacity ${isMenuOpen ? 'bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-slate-200 opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                    <MoreVertical size={14} />
                </button>
                {isMenuOpen && (
                    <>
                        <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); }} />
                        <div className="absolute right-0 top-8 z-30 bg-white dark:bg-zinc-800 shadow-xl border border-slate-100 dark:border-zinc-700 ring-1 ring-black/5 rounded-xl w-40 py-1 flex flex-col overflow-hidden">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onToggleMute(); }}
                                className="flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-700 text-left w-full text-slate-700 dark:text-slate-200"
                            >
                                {feed.isMuted ? <Bell size={14} /> : <BellOff size={14} />}
                                {feed.isMuted ? t(lang, 'unmuteFeed') : t(lang, 'muteFeed')}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); setIsMenuOpen(false);
                                    onMarkRead();
                                }}
                                className="flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-zinc-700 text-left w-full text-slate-700 dark:text-slate-200"
                            >
                                <CheckCheck size={14} /> {t(lang, 'markRead')}
                            </button>
                            <div className="h-px bg-slate-100 dark:bg-zinc-700 my-1"></div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(t(lang, 'confirmDeleteFeed'))) {
                                        onDelete();
                                    }
                                    setIsMenuOpen(false);
                                }}
                                className="flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-left w-full"
                            >
                                <Trash2 size={14} /> {t(lang, 'deleteFeed')}
                            </button>
                            <div className="h-px bg-slate-100 dark:bg-zinc-700 my-1"></div>
                            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">{t(lang, 'moveTo')}</div>
                            <div className="max-h-32 overflow-y-auto">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onMoveToCategory(feed.url, undefined); }}
                                    className={`flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-zinc-700 text-left w-full ${!feed.categoryId ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-200'}`}
                                >
                                    {t(lang, 'uncategorized')}
                                </button>
                                {categories.map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={(e) => { e.stopPropagation(); setIsMenuOpen(false); onMoveToCategory(feed.url, c.id); }}
                                        className={`flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-zinc-700 text-left w-full ${feed.categoryId === c.id ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-200'}`}
                                    >
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
};

const EInkCategoryRow = ({ category, feeds, onClick, onRename, onDelete, onMarkRead, lang, showUnreadCount }: any) => {
    const [showMenu, setShowMenu] = useState(false);
    const unreadCount = feeds ? feeds.reduce((acc: number, feed: any) => acc + feed.items.filter((i: any) => !i.isRead).length, 0) : 0;

    return (
        <>
            <div
                onClick={onClick}
                onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
                className="flex items-center justify-between p-3 border-b border-gray-300 font-semibold bg-white text-black hover:bg-gray-50"
            >
                <span className="flex items-center gap-2 text-base truncate flex-1">
                    <Folder size={20} className="shrink-0" />
                    <span className="truncate">{category.name}</span>
                </span>
                <div className="flex items-center gap-3 shrink-0">
                    {unreadCount > 0 && (
                        showUnreadCount ? (
                            <span className="font-mono font-bold text-base">({unreadCount})</span>
                        ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-black" />
                        )
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(true); }}
                        className="p-1.5 rounded-md hover:bg-gray-200"
                    >
                        <MoreVertical size={20} />
                    </button>
                    <ChevronRight size={20} />
                </div>
            </div>

            {showMenu && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 p-4" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}>
                    <div className="bg-white border-4 border-black p-4 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-2">
                            <h3 className="font-black text-xl truncate pr-4">{category.name}</h3>
                            <button onClick={() => setShowMenu(false)}><X size={24} /></button>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={() => {
                                    setShowMenu(false);
                                    const newName = prompt(t(lang, 'rename') + ':', category.name);
                                    if (newName) onRename(category.id, newName);
                                }}
                                className="w-full flex items-center gap-3 p-4 border-2 border-black font-bold text-lg hover:bg-black hover:text-white transition-none"
                            >
                                <Edit2 size={20} /> {t(lang, 'rename')}
                            </button>
                            <button
                                onClick={() => { onMarkRead(); setShowMenu(false); }}
                                className="w-full flex items-center gap-3 p-4 border-2 border-black font-bold text-lg hover:bg-black hover:text-white transition-none"
                            >
                                <CheckCheck size={20} /> {t(lang, 'markAllRead')}
                            </button>
                            <button
                                onClick={() => {
                                    if (window.confirm(t(lang, 'confirmDeleteCategory'))) {
                                        onDelete(category.id);
                                    }
                                    setShowMenu(false);
                                }}
                                className="w-full flex items-center gap-3 p-4 border-2 border-black font-bold text-lg hover:bg-black hover:text-white transition-none text-red-600 hover:border-red-600"
                            >
                                <Trash2 size={20} /> {t(lang, 'deleteList')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};