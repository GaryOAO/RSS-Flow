import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, RefreshCw, Calendar, ChevronLeft, ChevronRight, Share2, Trash2, ArrowLeft, History, PanelLeft } from 'lucide-react';
import { ImageLightbox } from './ImageLightbox';
import ReactMarkdown from 'react-markdown';
import { AppSettings, FeedItem } from '../types';
import { generateDailyDigest, generateDailyDigestStream } from '../services/ai';
import { t } from '../utils/i18n';
import { saveData, loadData } from '../services/db';
import { Share } from '@capacitor/share';

interface Props {
    articles: FeedItem[];
    settings: AppSettings;
    onNavigateToArticle?: (articleId: string) => void;
    onToggleSidebar?: () => void;
}

const DIGEST_HISTORY_KEY = 'inkflow_digest_history';

interface DigestEntry {
    id: string; // YYYY-MM-DD
    date: string;
    content: string;
    timestamp: number;
}

export const DailyDigestView: React.FC<Props> = ({ articles, settings, onNavigateToArticle, onToggleSidebar }) => {
    const [digest, setDigest] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lang = settings.language;

    // History State
    const [history, setHistory] = useState<DigestEntry[]>([]);

    // Date Selection
    const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
    const [showHistory, setShowHistory] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

    // E-ink Pagination State
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const contentRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isEInk = settings.eInkMode;
    const isDark = settings.theme === 'dark';
    const isPaper = settings.theme === 'paper';

    // Layout State for synchronization
    const [columnLayout, setColumnLayout] = useState({ width: 0, gap: 0, stride: 0 });

    const calculatePages = () => {
        if (!isEInk || !contentRef.current || !containerRef.current) return;

        const scrollWidth = contentRef.current.scrollWidth;
        const rect = containerRef.current.getBoundingClientRect();
        const clientWidth = rect.width;

        if (clientWidth === 0) return;

        // Update Layout State
        // Daily Digest has fixed 20px padding on each side -> 40px total margin/gap
        const colWidth = clientWidth - 40;
        const colGap = 40;

        setColumnLayout({
            width: colWidth,
            gap: colGap,
            stride: clientWidth
        });

        // Add a small tolerance (e.g., 10px) to avoid creating a new page for just a few pixels of overflow
        // This often happens due to whitespace or sub-pixel rendering
        const pages = Math.ceil((scrollWidth - 10) / clientWidth);
        setTotalPages(Math.max(1, pages));

        // Ensure current page is valid
        if (currentPage >= pages) {
            setCurrentPage(Math.max(0, pages - 1));
        }
    };

    useEffect(() => {
        if (isEInk) {
            const handleResize = () => {
                requestAnimationFrame(calculatePages);
            };

            const resizeObserver = new ResizeObserver(handleResize);

            if (containerRef.current) resizeObserver.observe(containerRef.current);
            if (contentRef.current) resizeObserver.observe(contentRef.current);

            // Initial calc
            handleResize();

            return () => {
                resizeObserver.disconnect();
            };
        }
    }, [digest, isEInk]); // Removed currentPage to avoid circular dependency/warning

    const nextPage = () => {
        if (currentPage < totalPages - 1) setCurrentPage(p => p + 1);
    };

    const prevPage = () => {
        if (currentPage > 0) setCurrentPage(p => p - 1);
    };

    // Load History
    useEffect(() => {
        loadData<DigestEntry[]>(DIGEST_HISTORY_KEY).then(data => {
            if (data && Array.isArray(data)) {
                setHistory(data);
                // Try to select today's digest if it exists, or the target date's digest
                const existing = data.find(e => e.id === targetDate);
                if (existing) {
                    setDigest(existing.content);
                }
            }
        });
    }, []);

    // When date changes, check history
    useEffect(() => {
        const existing = history.find(e => e.id === targetDate);
        if (existing) {
            setDigest(existing.content);
            setError(null);
        } else {
            setDigest(null); // Reset if no digest for this date
        }
    }, [targetDate, history]);

    const handleDeleteDigest = async () => {
        if (!confirm(t(lang, 'confirmDeleteCategory'))) return;

        const newHistory = history.filter(h => h.id !== targetDate);
        setHistory(newHistory);
        await saveData(DIGEST_HISTORY_KEY, newHistory);
        setDigest(null);
    };

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        try {
            // Filter articles for the selected date (and the day before, to capture full context)
            const dateObj = new Date(targetDate);
            const dayBefore = new Date(dateObj);
            dayBefore.setDate(dayBefore.getDate() - 1);
            dayBefore.setHours(0, 0, 0, 0);

            const endOfTargetDate = new Date(dateObj);
            endOfTargetDate.setHours(23, 59, 59, 999);

            const recentArticles = articles.filter(a => {
                const pubDate = new Date(a.pubDate);
                return pubDate >= dayBefore && pubDate <= endOfTargetDate;
            });

            if (recentArticles.length === 0) {
                throw new Error(t(lang, 'noArticles') || "No articles found for this date range.");
            }

            // Use Streaming
            setDigest(''); // Clear previous
            const result = await generateDailyDigestStream(recentArticles, settings, (chunk) => {
                setDigest(chunk);
            });

            // Save to History
            const newEntry: DigestEntry = {
                id: targetDate,
                date: targetDate,
                content: result,
                timestamp: Date.now()
            };

            const newHistory = [newEntry, ...history.filter(h => h.id !== targetDate)];
            setHistory(newHistory);
            await saveData(DIGEST_HISTORY_KEY, newHistory);

        } catch (err: any) {
            setError(err.message || t(lang, 'aiError'));
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!digest) return;
        try {
            await Share.share({
                title: `Daily Digest - ${targetDate}`,
                text: digest,
                dialogTitle: 'Share Digest'
            });
        } catch (e) {
            console.error('Share failed', e);
        }
    };

    return (
        <div className={`flex flex-col h-full ${isEInk ? 'bg-white text-black' : isDark ? 'text-gray-200' : isPaper ? 'text-amber-900' : 'text-gray-800'}`}>

            {/* Top Bar with Date Picker & Actions */}
            <div className={`pt-[calc(0.5rem+var(--safe-top))] pb-2 px-4 flex flex-col gap-4 border-b shrink-0 ${isEInk ? 'border-black' : isDark ? 'border-zinc-800 bg-zinc-900' : 'border-gray-200 bg-white'}`}>

                {/* Header Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onToggleSidebar} className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800">
                            <PanelLeft size={20} className={isEInk ? 'text-black' : isDark ? 'text-gray-300' : 'text-gray-600'} />
                        </button>
                        <div className="flex items-center gap-2">
                            <Sparkles size={20} className={isEInk ? 'text-black' : 'text-purple-500'} />
                            <h1 className={`font-bold text-lg ${isEInk ? 'text-black' : isDark ? 'text-white' : 'text-gray-900'}`}>
                                {t(lang, 'dailyDigest')}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {digest && (
                            <>
                                <button
                                    onClick={handleGenerate}
                                    className={`p-2 rounded-full ${isEInk ? 'border border-black' : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-300'}`}
                                    title={t(lang, 'regenerate')}
                                >
                                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                                </button>
                                <button
                                    onClick={handleShare}
                                    className={`p-2 rounded-full ${isEInk ? 'border border-black' : 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-300'}`}
                                >
                                    <Share2 size={20} />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isEInk ? 'border-black' : isDark ? 'border-zinc-700 bg-zinc-800' : 'border-gray-200 bg-white'}`}>
                            <Calendar size={18} className={isEInk ? 'text-black' : 'text-purple-500'} />
                            <input
                                type="date"
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                className={`bg-transparent outline-none font-medium text-sm ${isEInk ? 'text-black' : isDark ? 'text-white' : 'text-gray-900'}`}
                            />
                        </div>
                        {/* History Dropdown */}
                        {history.length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className={`p-2 rounded-lg border transition-colors ${isEInk ? 'border-black' : isDark ? 'border-zinc-700 hover:bg-zinc-800' : 'border-gray-200 hover:bg-gray-100'}`}
                                    title={t(lang, 'history')}
                                >
                                    <History size={20} className={isEInk ? 'text-black' : isDark ? 'text-gray-300' : 'text-gray-600'} />
                                </button>

                                {showHistory && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowHistory(false)} />
                                        <div className={`absolute top-full left-0 mt-2 w-48 max-h-60 overflow-y-auto rounded-xl shadow-xl border z-50 ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'}`}>
                                            <div className={`p-2 font-bold text-xs uppercase tracking-wider border-b ${isDark ? 'border-zinc-800 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                                                History
                                            </div>
                                            {history.map(h => (
                                                <button
                                                    key={h.id}
                                                    onClick={() => {
                                                        setTargetDate(h.id);
                                                        setDigest(h.content);
                                                        setShowHistory(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors ${h.id === targetDate ? (isDark ? 'text-blue-400 bg-blue-900/10' : 'text-blue-600 bg-blue-50') : (isDark ? 'text-gray-300' : 'text-gray-700')}`}
                                                >
                                                    {h.date}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className={`flex-1 overflow-hidden p-6 ${isEInk ? '' : 'custom-scrollbar overflow-y-auto'}`}>
                {loading && !digest ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in fade-in duration-500">
                        <div className="relative">
                            <Sparkles size={64} className={`${isEInk ? 'text-black' : 'text-purple-500 animate-pulse'}`} />
                        </div>
                        <p className="text-xl font-medium">{t(lang, 'summarizing')}</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
                        <p className="text-red-500 font-medium">{error}</p>
                        <button onClick={handleGenerate} className="px-4 py-2 bg-blue-500 text-white rounded-lg">
                            {t(lang, 'retry')}
                        </button>
                    </div>
                ) : (
                    <div className="h-full flex flex-col relative">
                        {digest ? (
                            isEInk ? (
                                // E-ink Paginated Layout
                                <div className="flex-1 overflow-hidden relative" ref={containerRef}>
                                    <div
                                        ref={contentRef}
                                        className="absolute inset-0 prose prose-p:text-black prose-headings:text-black max-w-none"
                                        style={{
                                            columnWidth: `${columnLayout.width}px`,
                                            columnGap: `${columnLayout.gap}px`,
                                            columnFill: 'auto',

                                            padding: '20px',
                                            paddingBottom: '80px', // Extra space for pagination controls
                                            transform: `translateX(-${currentPage * columnLayout.stride}px)`,
                                            transition: 'none', // No animation for E-ink
                                            width: '100%',
                                            fontSize: '16px',
                                            lineHeight: '1.8'
                                        }}
                                    >
                                        <ReactMarkdown components={{
                                            a: ({ node, ...props }) => {
                                                // Intercept internal links
                                                if (props.href && props.href.startsWith('#')) {
                                                    return (
                                                        <a
                                                            {...props}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                const id = props.href?.substring(1);
                                                                if (id && onNavigateToArticle) onNavigateToArticle(id);
                                                            }}
                                                            className="underline font-bold cursor-pointer"
                                                        />
                                                    );
                                                }
                                                return <span className="underline font-bold">{props.children}</span>; // Keep external links non-clickable or simplified if desired, or make them clickable too. Let's make internal ones clickable.
                                            },
                                            img: ({ node, ...props }) => (
                                                <img
                                                    {...props}
                                                    onClick={() => props.src && setLightboxSrc(props.src)}
                                                    className="cursor-zoom-in"
                                                />
                                            )
                                        }}>
                                            {digest}
                                        </ReactMarkdown>
                                    </div>

                                    {/* Pagination Controls */}
                                    <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center bg-white border-t-2 border-black p-3 z-10">
                                        <button
                                            onClick={prevPage}
                                            disabled={currentPage === 0}
                                            className="p-2 border-2 border-black rounded disabled:opacity-30"
                                        >
                                            <ChevronLeft size={24} />
                                        </button>
                                        <span className="font-bold text-lg">{currentPage + 1} / {totalPages}</span>
                                        <button
                                            onClick={nextPage}
                                            disabled={currentPage >= totalPages - 1}
                                            className="p-2 border-2 border-black rounded disabled:opacity-30"
                                        >
                                            <ChevronRight size={24} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // Standard Scrolling Layout
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                    <article className={`prose ${isDark ? 'prose-invert' : ''} max-w-none pb-10`}>
                                        <ReactMarkdown
                                            components={{
                                                a: ({ node, ...props }) => {
                                                    // Intercept internal links
                                                    if (props.href && props.href.startsWith('#')) {
                                                        return (
                                                            <a
                                                                {...props}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    const id = props.href?.substring(1);
                                                                    if (id && onNavigateToArticle) onNavigateToArticle(id);
                                                                }}
                                                                className="text-blue-600 hover:underline cursor-pointer"
                                                            />
                                                        );
                                                    }
                                                    return <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" />;
                                                },
                                                img: ({ node, ...props }) => (
                                                    <img
                                                        {...props}
                                                        onClick={() => props.src && setLightboxSrc(props.src)}
                                                        className="cursor-zoom-in"
                                                    />
                                                )
                                            }}
                                        >
                                            {digest}
                                        </ReactMarkdown>
                                        {loading && (
                                            <div className="flex items-center gap-2 text-gray-500 mt-4 animate-pulse">
                                                <RefreshCw size={16} className="animate-spin" />
                                                <span>{t(lang, 'generating')}</span>
                                            </div>
                                        )}
                                    </article>
                                </div>
                            )
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-60">
                                <Sparkles size={48} className="text-gray-400" />
                                <p>{t(lang, 'noDigest')}</p>
                                <button
                                    onClick={handleGenerate}
                                    className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 ${isEInk ? 'border-2 border-black text-black' : 'bg-purple-600 text-white shadow-lg hover:bg-purple-700'}`}
                                >
                                    <Sparkles size={20} />
                                    {t(lang, 'generateDigest')}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Image Lightbox */}
            <ImageLightbox
                src={lightboxSrc}
                onClose={() => setLightboxSrc(null)}
                isEInk={settings.eInkMode}
            />
        </div>
    );
};
