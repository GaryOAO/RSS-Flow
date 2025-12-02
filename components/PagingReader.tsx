import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Settings, ChevronLeft, ChevronRight, Star, Sparkles, XCircle } from 'lucide-react';
import { ImageLightbox } from './ImageLightbox';
import { FeedItem, AppSettings } from '../types';
import { t } from '../utils/i18n';
import { summarizeArticle } from '../services/ai';
import ReactMarkdown from 'react-markdown';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface Props {
  article: FeedItem;
  settings: AppSettings;
  onBack: () => void;
  onUpdateSettings: <T extends keyof AppSettings>(key: T, value: AppSettings[T]) => void;
  onOpenSettings: () => void;
  onToggleFavorite: (article: FeedItem) => void;
  onUpdateArticle?: (article: FeedItem) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const PagingReader: React.FC<Props> = ({ article, settings, onBack, onUpdateSettings, onOpenSettings, onToggleFavorite, onUpdateArticle, isSidebarOpen, onToggleSidebar }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isFavorite, setIsFavorite] = useState(article.isFavorite || false);
  const lang = settings.language;
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // AI State
  const [summary, setSummary] = useState<string | null>(article.aiSummary || null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // View Mode: 'content' for article, 'summary' for AI summary pages
  const [viewMode, setViewMode] = useState<'content' | 'summary'>('content');
  const [summaryPage, setSummaryPage] = useState(0);
  const [summaryTotalPages, setSummaryTotalPages] = useState(1);

  // Immersive Reading Mode (E-Ink)
  const [showUI, setShowUI] = useState(true);

  // Quick Navigation State (E-Ink)
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreviewPage, setDragPreviewPage] = useState<number | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const lastPageTurnTime = useRef<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const summaryContentRef = useRef<HTMLDivElement>(null);

  // Layout State for synchronization
  const [columnLayout, setColumnLayout] = useState({ width: 0, gap: 0, stride: 0 });

  // Swipe Gesture State
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<{ x: number; y: number } | null>(null);
  const swipeThreshold = 30; // Minimum distance for swipe
  const swipeTimeLimit = 800; // Maximum time for swipe (ms)
  const verticalTolerance = 50; // Maximum vertical movement allowed

  useEffect(() => {
    setIsFavorite(article.isFavorite || false);
    setSummary(article.aiSummary || null);
    setViewMode('content'); // Reset to content view when article changes
    setSummaryPage(0);
    setAiError(null);
    setIsSummarizing(false);
  }, [article.id]);

  useEffect(() => {
    setIsFavorite(article.isFavorite || false);
  }, [article.isFavorite]);

  useEffect(() => {
    // If summary arrives (e.g. from background or generation) and we don't have it yet, update it
    if (article.aiSummary && !summary) {
      setSummary(article.aiSummary);
    }
  }, [article.aiSummary, summary]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };
  }, []);

  const toggleFav = () => {
    const newState = !isFavorite;
    setIsFavorite(newState);
    onToggleFavorite({ ...article, isFavorite: newState });
  };

  const handleSummarize = async () => {
    if (!settings.enableAI) return;

    setIsSummarizing(true);
    setViewMode('summary'); // Switch to summary view
    setAiError(null);
    // Don't clear summary here - keep old value until new one is ready

    try {
      const result = await summarizeArticle(article.content, settings);
      setSummary(result);
      if (onUpdateArticle) {
        onUpdateArticle({ ...article, aiSummary: result });
      }
    } catch (err) {
      setAiError(t(lang, 'aiError'));
      console.error(err);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAiButtonClick = () => {
    if (summary && summary.trim().length > 0) {
      // Toggle between content and summary view
      setViewMode(prev => prev === 'summary' ? 'content' : 'summary');
    } else {
      // No summary: show empty state and allow generation
      setViewMode('summary');
    }
  };

  const toggleImmersiveMode = () => {
    setShowUI(prev => !prev);
  };

  const calculatePages = useCallback(() => {
    if (contentRef.current && containerRef.current && viewMode === 'content') {
      const scrollWidth = contentRef.current.scrollWidth;
      const rect = containerRef.current.getBoundingClientRect();
      const clientWidth = rect.width;

      if (clientWidth === 0) return;

      // Update Layout State
      const margins = settings.margins;
      const colWidth = clientWidth - (margins * 2);
      const colGap = margins * 2;

      setColumnLayout({
        width: colWidth,
        gap: colGap,
        stride: clientWidth // Stride is exactly the container width
      });

      // Strict calculation with tolerance for sub-pixel rounding errors
      // scrollWidth is usually an integer, while clientWidth can be fractional.
      // This prevents 1.001 pages from becoming 2 pages.
      const pages = Math.round(scrollWidth / clientWidth);
      setTotalPages(Math.max(1, pages));

      // Ensure current page is valid
      if (currentPage >= pages) {
        setCurrentPage(Math.max(0, pages - 1));
      }
    }
  }, [currentPage, viewMode, settings.margins, showUI]);

  const calculateSummaryPages = useCallback(() => {
    if (summaryContentRef.current && containerRef.current && viewMode === 'summary') {
      const scrollWidth = summaryContentRef.current.scrollWidth;
      const rect = containerRef.current.getBoundingClientRect();
      const clientWidth = rect.width;

      if (clientWidth === 0) return;

      // Update Layout State (Same logic as content)
      const margins = settings.margins;
      const colWidth = clientWidth - (margins * 2);
      const colGap = margins * 2;

      setColumnLayout({
        width: colWidth,
        gap: colGap,
        stride: clientWidth
      });

      const pages = Math.round(scrollWidth / clientWidth);
      setSummaryTotalPages(Math.max(1, pages));

      // Ensure current summary page is valid
      if (summaryPage >= pages) {
        setSummaryPage(Math.max(0, pages - 1));
      }
    }
  }, [summaryPage, viewMode, settings.margins, showUI]);

  // Robust Resize and Image Load Handling
  useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(() => {
        calculatePages();
        calculateSummaryPages();
      });
    };

    // Use ResizeObserver for more accurate size detection
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (contentRef.current) resizeObserver.observe(contentRef.current);
    if (summaryContentRef.current) resizeObserver.observe(summaryContentRef.current);

    // Image loading handling
    const images = contentRef.current?.querySelectorAll('img');
    const handleImageLoad = () => handleResize();

    if (images) {
      images.forEach(img => {
        if (!img.complete) {
          img.addEventListener('load', handleImageLoad);
        }
      });
    }

    // Initial calculation
    handleResize();

    return () => {
      resizeObserver.disconnect();
      if (images) {
        images.forEach(img => img.removeEventListener('load', handleImageLoad));
      }
    };
  }, [calculatePages, calculateSummaryPages, viewMode, article.content, summary, showUI]);

  // Force recalculation when showUI changes
  useEffect(() => {
    const timer = setTimeout(() => {
      calculatePages();
      calculateSummaryPages();
    }, 100);

    return () => clearTimeout(timer);
  }, [showUI, calculatePages, calculateSummaryPages]);

  // const triggerHaptic = () => { ... } - Removed per user request

  const nextPage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (viewMode === 'content') {
      if (currentPage < totalPages - 1) {
        setCurrentPage(prev => prev + 1);
        // triggerHaptic();
      }
    } else {
      if (summaryPage < summaryTotalPages - 1) {
        setSummaryPage(prev => prev + 1);
        // triggerHaptic();
      }
    }
  };

  const prevPage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (viewMode === 'content') {
      if (currentPage > 0) {
        setCurrentPage(prev => prev - 1);
        // triggerHaptic();
      }
    } else {
      if (summaryPage > 0) {
        setSummaryPage(prev => prev - 1);
        // triggerHaptic();
      }
    }
  };

  const handlePageClick = (e: React.MouseEvent) => {
    // If clicking a link, don't turn page
    if ((e.target as HTMLElement).tagName === 'A') return;

    const width = window.innerWidth;
    const x = e.clientX;

    // Center tap toggles UI
    if (x > width * 0.25 && x < width * 0.75) {
      setShowUI(prev => !prev);
      return;
    }

    // Side taps turn pages
    if (x > width * 0.75) {
      nextPage();
    } else {
      prevPage();
    }
  };

  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      setLightboxSrc(img.src);
      e.stopPropagation(); // Prevent page turn
    }
  };

  // Swipe Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    // Don't interfere with progress bar dragging
    if (isDragging) return;

    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
    setTouchCurrent({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || isDragging) return;

    const touch = e.touches[0];
    setTouchCurrent({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !touchCurrent || isDragging) {
      setTouchStart(null);
      setTouchCurrent(null);
      return;
    }

    const deltaX = touchCurrent.x - touchStart.x;
    const deltaY = touchCurrent.y - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;

    // Reset touch state
    setTouchStart(null);
    setTouchCurrent(null);

    // Check if it's a valid swipe:
    // 1. Horizontal distance > threshold
    // 2. Vertical distance < tolerance (to avoid interfering with scrolling)
    // 3. Time < limit (to ensure it's a swipe, not a drag)
    const isHorizontalSwipe = Math.abs(deltaX) > swipeThreshold;
    const isVerticallyStable = Math.abs(deltaY) < verticalTolerance;
    const isQuickEnough = deltaTime < swipeTimeLimit;

    if (isHorizontalSwipe && isVerticallyStable && isQuickEnough) {
      if (deltaX > 0) {
        // Swipe right -> previous page
        prevPage();
      } else {
        // Swipe left -> next page
        nextPage();
      }
    }
  };

  // Quick Navigation Handlers
  const handleProgressBarTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!settings.eInkMode) return;

    longPressTimer.current = window.setTimeout(() => {
      setIsDragging(true);
      handleProgressBarDrag(e);
    }, 500);
  };

  const handleProgressBarDrag = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging && !longPressTimer.current) return;
    if (!progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newPage = Math.floor(percentage * totalPages);
    const clampedPage = Math.max(0, Math.min(totalPages - 1, newPage));

    setDragPreviewPage(clampedPage);

    if (isDragging && clampedPage !== currentPage) {
      // Haptic feedback on page change
      try {
        Haptics.impact({ style: ImpactStyle.Medium });
      } catch (e) { }
    }
  };

  const handleProgressBarTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (isDragging && dragPreviewPage !== null) {
      setCurrentPage(dragPreviewPage);
    }

    setIsDragging(false);
    setDragPreviewPage(null);
  };

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        if (currentPage < totalPages - 1) setCurrentPage(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (currentPage > 0) setCurrentPage(prev => prev - 1);
      } else if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, onBack]);

  const isDark = settings.theme === 'dark';
  const isPaper = settings.theme === 'paper';

  const borderColor = isDark ? 'border-zinc-700' : isPaper ? 'border-amber-900/10' : 'border-black';
  const bgColor = isDark ? 'bg-zinc-900' : isPaper ? 'bg-[#f7f1e3]' : 'bg-white';
  const textColor = isDark ? 'text-gray-200' : isPaper ? 'text-amber-900' : 'text-black';
  const iconColor = isDark ? 'text-gray-400' : isPaper ? 'text-amber-900/60' : 'text-black';

  // Define header height for calculations
  const HEADER_HEIGHT = 64; // h-16 = 64px

  return (
    <div className={`fixed inset-0 z-50 ${bgColor} ${textColor} overflow-hidden`}>

      {/* Top Bar - Overlay */}
      <div
        className={`absolute top-0 left-0 right-0 z-50 transition-opacity duration-300 ${showUI ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div
          className={`flex items-center justify-between px-4 ${isDark ? 'bg-zinc-900/95' : isPaper ? 'bg-[#f7f1e3]/95' : 'bg-white/95'} backdrop-blur-sm border-b ${settings.eInkMode ? 'border-black border-b-2' : isDark ? 'border-zinc-800' : isPaper ? 'border-amber-900/10' : 'border-gray-100'}`}
          style={{
            paddingTop: 'max(var(--safe-top), 12px)',
            height: 'calc(3.5rem + max(var(--safe-top), 12px))'
          }}
        >
          <div className="flex items-center gap-4">
            <button onClick={viewMode === 'summary' ? () => setViewMode('content') : onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
              <ChevronLeft size={24} />
            </button>
            {viewMode === 'summary' ? (
              <h1 className="font-bold text-lg truncate flex items-center gap-2">
                <Sparkles size={18} className="text-purple-500" />
                {t(lang, 'summary')}
              </h1>
            ) : (
              <h1 className={`font-bold text-lg truncate max-w-[200px] ${isPaper ? 'font-serif' : ''}`}>
                {article.feedTitle}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* AI Summary Button */}
            {settings.enableAI && (
              <button
                onClick={handleAiButtonClick}
                className={`p-2 rounded-full transition-colors ${summary
                  ? (viewMode === 'summary' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'text-purple-600 dark:text-purple-400')
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                title={summary ? t(lang, 'viewSummary') : t(lang, 'generateSummary')}
              >
                <Sparkles size={22} fill={summary ? 'currentColor' : 'none'} />
              </button>
            )}
            <button
              onClick={toggleFav}
              className={`p-2 rounded-full transition-colors ${isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              title={isFavorite ? "Remove Favorite" : "Add Favorite"}
            >
              <Star size={22} fill={isFavorite ? "currentColor" : "none"} />
            </button>
            <button
              onClick={onOpenSettings}
              className={`p-2 rounded-full transition-colors ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Settings size={22} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area - Full Screen Static */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 overflow-hidden w-full h-full"
        onClick={handlePageClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'none' }}
      >
        {/* Article Content */}
        <div
          ref={contentRef}
          className={`absolute inset-0 paging-content ${isDark ? 'prose-invert text-gray-300' : isPaper ? 'prose-stone text-amber-900' : 'text-gray-800'}`}
          style={{
            columnWidth: `${columnLayout.width}px`,
            columnGap: `${columnLayout.gap}px`,
            columnFill: 'auto',
            // Static Padding - Safe Area + Breathing Room
            paddingTop: 'max(var(--safe-top), 24px)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 40px)',
            paddingLeft: `${settings.margins}px`,
            paddingRight: `${settings.margins}px`,
            transform: `translateX(-${currentPage * columnLayout.stride}px)`,
            transition: settings.eInkMode ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
            fontSize: `${settings.fontSize}px`,
            fontFamily: settings.fontFamily === 'serif' ? 'Merriweather, serif' : settings.fontFamily === 'mono' ? 'monospace' : 'Inter, sans-serif',
            lineHeight: settings.lineHeight,
            textAlign: settings.textAlign as any,
            letterSpacing: `${settings.letterSpacing}px`,
            display: viewMode === 'content' ? 'block' : 'none', // Hide when in summary mode
            height: '100%',
            width: '100%'
          }}
        >
          <h1 className="text-3xl font-bold mb-4 break-inside-avoid">{article.title}</h1>
          {article.author && <p className="text-sm opacity-70 mb-8 break-inside-avoid">{t(lang, 'by')} {article.author}</p>}
          <div dangerouslySetInnerHTML={{ __html: article.content }} onClick={handleContentClick} />
        </div>

        {/* Summary Content (Paginated) */}
        <div
          ref={summaryContentRef}
          className={`absolute inset-0 paging-content ${isDark ? 'prose-invert text-gray-300' : isPaper ? 'prose-stone text-amber-900' : 'text-gray-800'}`}
          style={{
            columnWidth: `${columnLayout.width}px`,
            columnGap: `${columnLayout.gap}px`,
            columnFill: 'auto',
            paddingTop: 'max(var(--safe-top), 24px)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 40px)',
            paddingLeft: `${settings.margins}px`,
            paddingRight: `${settings.margins}px`,
            transform: `translateX(-${summaryPage * columnLayout.stride}px)`,
            transition: settings.eInkMode ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
            fontSize: `${settings.fontSize}px`,
            fontFamily: settings.fontFamily === 'serif' ? 'Merriweather, serif' : settings.fontFamily === 'mono' ? 'monospace' : 'Inter, sans-serif',
            lineHeight: settings.lineHeight,
            textAlign: settings.textAlign as any,
            letterSpacing: `${settings.letterSpacing}px`,
            display: viewMode === 'summary' ? 'block' : 'none', // Show only in summary mode
            height: '100%',
            width: '100%'
          }}
        >
          <div className="flex items-center gap-3 mb-6 break-inside-avoid">
            <button
              onClick={() => setViewMode('content')}
              className={`p-2 rounded-full transition-colors ${settings.eInkMode ? 'border-2 border-black hover:bg-black hover:text-white' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
              title={t(lang, 'back')}
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold flex items-center gap-2 m-0">
              <Sparkles className="text-purple-500" />
              {t(lang, 'aiSummary')}
            </h1>
          </div>

          {isSummarizing ? (
            <div className="flex flex-col items-center gap-6 text-gray-500 mt-10 justify-center break-inside-avoid relative">

              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="font-medium">{t(lang, 'summarizing')}</span>
            </div>
          ) : aiError ? (
            <div className="text-red-500 font-medium mt-10 text-center break-inside-avoid">{aiError}</div>
          ) : !summary ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8 break-inside-avoid">
              <Sparkles size={64} className="text-purple-500 mb-6" strokeWidth={1.5} />
              <h3 className="text-2xl font-bold mb-3">{t(lang, 'aiEmptyTitle')}</h3>
              <p className="mb-2 max-w-md opacity-70">{t(lang, 'aiEmptyDescription')}</p>
              <p className="text-sm mb-8 opacity-60">{t(lang, 'aiEmptyNote')}</p>
              <button
                onClick={handleSummarize}
                disabled={isSummarizing}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${settings.eInkMode ? 'bg-white border-2 border-black text-black hover:bg-black hover:text-white disabled:opacity-50' : 'bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50'}`}
              >
                <Sparkles size={20} />
                {t(lang, 'startGenerate')}
              </button>
            </div>
          ) : (
            <ReactMarkdown>{summary}</ReactMarkdown>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        src={lightboxSrc}
        onClose={() => setLightboxSrc(null)}
        isEInk={settings.eInkMode}
      />

      {/* Footer Navigation - Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-50 transition-opacity duration-300 ${showUI ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div className={`h-14 border-t-2 ${borderColor} flex items-center justify-between px-4 ${isDark ? 'bg-zinc-900/95' : isPaper ? 'bg-[#f7f1e3]/95' : 'bg-white/95'} backdrop-blur-sm flex-shrink-0 select-none pb-[env(safe-area-inset-bottom)] box-content`}>
          <button
            disabled={viewMode === 'content' ? currentPage === 0 : summaryPage === 0}
            onClick={prevPage}
            className="flex items-center gap-1 font-bold disabled:opacity-20 uppercase text-sm px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
          >
            <ChevronLeft size={22} /> <span className="hidden sm:inline">{t(lang, 'prev')}</span>
          </button>

          <div
            ref={progressBarRef}
            className={`flex-1 mx-4 h-1.5 rounded-full relative ${isDark ? 'bg-zinc-800' : isPaper ? 'bg-amber-900/10' : 'bg-gray-200'} ${settings.eInkMode ? 'cursor-pointer h-4 border-2 border-black bg-white p-0.5' : ''} ${isDragging ? 'scale-y-150' : ''} transition-all`}
            onTouchStart={handleProgressBarTouchStart}
            onTouchMove={handleProgressBarDrag}
            onTouchEnd={handleProgressBarTouchEnd}
            onMouseDown={handleProgressBarTouchStart}
            onMouseMove={handleProgressBarDrag}
            onMouseUp={handleProgressBarTouchEnd}
            onMouseLeave={handleProgressBarTouchEnd}
          >
            <div
              style={{
                width: `${Math.max(2, Math.min(100, (((dragPreviewPage !== null ? dragPreviewPage : (viewMode === 'content' ? currentPage : summaryPage)) + 1) / (viewMode === 'content' ? totalPages : summaryTotalPages)) * 100))}%`,
                height: '100%',
                transition: settings.eInkMode ? 'none' : 'all 0.3s'
              }}
              className={`rounded-full ${isDark ? 'bg-zinc-500' : isPaper ? 'bg-amber-900/40' : 'bg-black'} ${isDragging ? 'opacity-50' : ''}`}
            />
            {isDragging && dragPreviewPage !== null && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                {dragPreviewPage + 1} / {viewMode === 'content' ? totalPages : summaryTotalPages}
              </div>
            )}
          </div>

          <div className={`text-xs font-medium mr-2 ${settings.eInkMode ? 'text-black' : 'text-gray-500'}`}>
            {(viewMode === 'content' ? currentPage : summaryPage) + 1} / {viewMode === 'content' ? totalPages : summaryTotalPages}
          </div>

          <button
            disabled={viewMode === 'content' ? currentPage === totalPages - 1 : summaryPage === summaryTotalPages - 1}
            onClick={nextPage}
            className="flex items-center gap-1 font-bold disabled:opacity-20 uppercase text-sm px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 shrink-0 justify-end"
          >
            <span className="hidden sm:inline">{t(lang, 'next')}</span> <ChevronRight size={22} />
          </button>
        </div>
      </div>

      {/* Immersive Mode Info (Kindle-style) - Only when UI is hidden */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-40 pointer-events-none pb-[env(safe-area-inset-bottom)] transition-opacity duration-300 ${!showUI ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Progress Bar */}
        {(settings.showProgressInImmersive ?? true) && (
          <div className={`${settings.eInkMode ? 'h-1 border-t border-black bg-white' : 'h-[2px] bg-gray-300/30'}`}>
            <div
              className={`h-full ${settings.eInkMode ? 'bg-black' : 'bg-gray-600/50'}`}
              style={{ width: `${((viewMode === 'content' ? currentPage : summaryPage) + 1) / (viewMode === 'content' ? totalPages : summaryTotalPages) * 100}%` }}
            />
          </div>
        )}

        {/* Page Number / Time */}
        {((settings.showPageNumberInImmersive ?? true) || (settings.showTimeInImmersive ?? false)) && (
          <div className={`flex justify-between px-4 py-2 ${settings.eInkMode ? 'text-xs font-bold text-black' : 'text-[10px] text-gray-500/60'}`}>
            {(settings.showPageNumberInImmersive ?? true) && (
              <span>{(viewMode === 'content' ? currentPage : summaryPage) + 1} / {viewMode === 'content' ? totalPages : summaryTotalPages}</span>
            )}
            {(settings.showTimeInImmersive ?? false) && (
              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
        )}

      </div>

      {/* CSS Overrides for Paging specific needs */}
      <style>{`
        /* Prevent list containers from breaking across columns */
        .paging-content ul,
        .paging-content ol {
          break-inside: avoid-column;
          page-break-inside: avoid;
        }

        /* Paragraphs can break naturally - FORCE spacing to override Tailwind reset */
        .paging-content p,
        .paging-content div p {
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          padding-bottom: 1.5em !important;
          break-inside: auto;
          orphans: 2;
          widows: 2;
          overflow-wrap: break-word;
        }

        /* Specific rule for article content paragraphs */
        .paging-content > div > div > p,
        .paging-content > div > div p {
          padding-bottom: 1.5em !important;
          margin-bottom: 0 !important;
        }

        /* List items: avoid breaking but allow if necessary */
        .paging-content li {
          margin-bottom: 0.75em !important;
          break-inside: avoid;
          orphans: 2;
          widows: 2;
          overflow-wrap: break-word;
        }

        /* Add spacing after lists */
        .paging-content ul,
        .paging-content ol {
          margin-bottom: 1.5em !important;
        }

        .paging-content a {
          word-break: break-all;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        /* Force AI Summary to inherit font settings */
        .paging-content.prose p, 
        .paging-content.prose li,
        .paging-content.prose strong,
        .paging-content.prose em {
          font-family: inherit !important;
          font-size: inherit !important;
          line-height: inherit !important;
          padding-bottom: 1.5em !important;
          margin-bottom: 0 !important;
        }
        
        .paging-content .row, .paging-content .col-lg-6 {
          display: block !important; width: 100% !important; float: none !important;
        }

        .paging-content img {
          max-width: 100% !important;
          max-height: calc(100vh - 200px) !important;
          width: auto !important;
          height: auto !important;
          display: block;
          margin: 1.5rem auto;
          break-inside: avoid;
          box-shadow: 0 0 0 2px black;
        }
        
        .paging-content blockquote {
          border-left: 4px solid ${isDark ? '#52525b' : isPaper ? 'rgba(120, 53, 15, 0.2)' : 'black'};
          padding-left: 1rem;
          margin-left: 0;
          font-style: italic;
          break-inside: auto;
          page-break-inside: auto;
        }

        /* Fix for Code Blocks and Tables in Paging Mode */
        .paging-content pre {
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-x: hidden !important;
          max-width: 100% !important;
          break-inside: auto !important;
          page-break-inside: auto !important;
          background: ${isDark ? '#27272a' : '#f4f4f5'} !important;
          padding: 1rem !important;
          border-radius: 0.5rem !important;
          margin-bottom: 1rem !important;
        }

        .paging-content code {
          word-break: break-word !important;
        }

        .paging-content table {
          width: 100% !important;
          display: block !important;
          overflow-x: auto !important;
          margin-bottom: 1rem !important;
          border-collapse: collapse !important;
          break-inside: auto !important;
          page-break-inside: auto !important;
        }
        
        .paging-content th, .paging-content td {
          border: 1px solid ${isDark ? '#52525b' : '#e4e4e7'} !important;
          padding: 0.5rem !important;
        }
      `}</style>
    </div>
  );
};
