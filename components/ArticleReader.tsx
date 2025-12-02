
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FeedItem, AppSettings } from '../types';
import { ArrowLeft, Clock, ExternalLink, Star, Sparkles, XCircle, Settings, Share2, MoreVertical } from 'lucide-react';
import { ImageLightbox } from './ImageLightbox';
import { t } from '../utils/i18n';
import { summarizeArticle } from '../services/ai';
import ReactMarkdown from 'react-markdown';

interface Props {
  article: FeedItem;
  settings: AppSettings;
  onBack: () => void;
  onOpenSettings: () => void;
  onToggleFavorite: (article: FeedItem) => void;
  onUpdateArticle?: (article: FeedItem) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const ArticleReader: React.FC<Props> = ({ article, settings, onBack, onOpenSettings, onToggleFavorite, onUpdateArticle, isSidebarOpen, onToggleSidebar }) => {
  // Removed scrollProgress state to prevent re-renders
  const [showFloatingControls, setShowFloatingControls] = useState(false);
  const [isFavorite, setIsFavorite] = useState(article.isFavorite || false);

  // Immersive Mode State
  const [showUI, setShowUI] = useState(true);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<number | null>(null);

  // AI Modal State (Step 2: Modal instead of inline)
  const [showAIModal, setShowAIModal] = useState(false);

  // AI State
  const [summary, setSummary] = useState<string | null>(article.aiSummary || null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const lang = settings.language;

  useEffect(() => {
    setIsFavorite(article.isFavorite || false);
    setSummary(article.aiSummary || null);
    setShowSummary(false); // Default to hidden when opening a new article
    setAiError(null);
    setIsSummarizing(false);
  }, [article.id]);

  useEffect(() => {
    setIsFavorite(article.isFavorite || false);
  }, [article.isFavorite]);

  useEffect(() => {
    // If summary arrives (e.g. from background or generation) and we don't have it yet, show it
    if (article.aiSummary && !summary) {
      setSummary(article.aiSummary);
      setShowSummary(true);
    }
  }, [article.aiSummary, summary]);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !progressBarRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;

    // Step 1: GPU-accelerated progress bar (transform instead of width)
    const progress = scrollHeight === clientHeight ? 0 : scrollTop / (scrollHeight - clientHeight);
    progressBarRef.current.style.transform = `scaleX(${progress})`;

    // Scroll direction detection
    const delta = scrollTop - lastScrollY.current;
    lastScrollY.current = scrollTop;

    // Clear any pending timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    // Step 4: Optimized scroll logic
    if (scrollTop < 50) {
      // At top: Always show UI
      setShowUI(true);
    } else if (Math.abs(delta) > 5) {
      // Significant scroll: Show on up, hide on down
      setShowUI(delta < 0);
    }

    // Auto-show UI after 2 seconds of inactivity
    scrollTimeout.current = window.setTimeout(() => {
      setShowUI(true);
    }, 2000);
  }, []);

  const toggleFav = () => {
    const newState = !isFavorite;
    setIsFavorite(newState);
    onToggleFavorite({ ...article, isFavorite: newState });
  };

  const handleSummarize = async () => {
    if (!settings.enableAI) return;

    setIsSummarizing(true);
    setShowSummary(true);
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
    // Always open modal - let the modal decide what to show
    setShowAIModal(true);
  };

  // Step 5: Optimized tap interaction
  const toggleImmersiveMode = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Exclude interactive elements
    if (
      target.tagName === 'A' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'IMG' ||
      target.closest('a') ||
      target.closest('button')
    ) {
      return;
    }

    // Exclude text selection
    if (window.getSelection()?.toString().length) {
      return;
    }

    setShowUI(prev => !prev);
  };

  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      setLightboxSrc(img.src);
      e.stopPropagation(); // Prevent immersive mode toggle
    }
  };

  const isDark = settings.theme === 'dark';
  const isPaper = settings.theme === 'paper';

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={`h-full overflow-y-auto overflow-x-hidden no-scrollbar pb-32 ${isDark ? 'bg-zinc-900 text-gray-200' : isPaper ? 'bg-[#f7f1e3] text-amber-900' : 'bg-white text-gray-900'}`}
    >
      {/* Fake Status Bar Background */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${isDark ? 'bg-zinc-900' : isPaper ? 'bg-[#f7f1e3]' : 'bg-white'}`}
        style={{ height: 'var(--safe-top)' }}
      />

      {/* Step 1: Independent GPU-Accelerated Progress Bar (Always Visible) */}
      <div className={`fixed top-0 left-0 right-0 z-40 bg-gray-200/50 dark:bg-zinc-800/50 pointer-events-none ${settings.eInkMode ? 'h-[2px]' : 'h-[3px]'}`} style={{ top: (showUI && !showAIModal) ? '56px' : '0', transition: 'top 0.3s' }}>
        <div
          ref={progressBarRef}
          className={`h-full origin-left transform-gpu transition-none ${settings.eInkMode ? 'bg-black' : 'bg-blue-500'}`}
          style={{ transform: 'scaleX(0)' }}
        />
      </div>

      {/* Step 2: Simplified Top Bar (Back + AI) */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${(showUI && !showAIModal) ? 'translate-y-0' : '-translate-y-full'}`}
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        {/* Top Navigation Bar */}
        <div className={`flex items-center justify-between px-4 h-14 ${isDark ? 'bg-zinc-900/95 border-b border-zinc-800' : isPaper ? 'bg-[#f7f1e3]/95 border-b border-amber-900/10' : 'bg-white/95 border-b border-gray-200'} backdrop-blur-lg`}>
          <button
            onClick={onBack}
            className={`flex items-center gap-2 text-sm font-medium ${isDark ? 'text-gray-300 hover:text-white' : isPaper ? 'text-amber-900/80 hover:text-amber-900' : 'text-gray-600 hover:text-black'} transition-colors`}
          >
            <ArrowLeft size={20} />
            <span>{t(lang, 'back')}</span>
          </button>

          {/* AI Summary Button (Moved to Top Bar) - Step 2: Visual State */}
          {settings.enableAI && (
            <button
              onClick={handleAiButtonClick}
              className={`p-2 rounded-lg transition-colors ${summary
                ? 'text-purple-500' // Has summary: purple highlight
                : (isDark ? 'text-gray-400 hover:text-purple-400 hover:bg-white/10' : isPaper ? 'text-amber-900/60 hover:text-purple-600 hover:bg-amber-900/10' : 'text-gray-600 hover:text-purple-600 hover:bg-black/5')
                }`}
              title={summary ? t(lang, 'viewSummary') : t(lang, 'generateSummary')}
            >
              <Sparkles
                size={20}
                fill={summary ? 'currentColor' : 'none'} // Has summary: filled icon
                className={isSummarizing ? "animate-pulse" : ""}
                strokeWidth={2}
              />
            </button>
          )}
        </div>
      </div>

      {/* Step 3: Updated Bottom Bar (Favorite, Share, Settings) */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${(showUI && !showAIModal) ? 'translate-y-0' : 'translate-y-full'} ${isDark ? 'bg-zinc-900/95 border-t border-zinc-800' : isPaper ? 'bg-[#f7f1e3]/95 border-t border-amber-900/10' : 'bg-white/95 border-t border-gray-200'} backdrop-blur-lg`}
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        <div className="flex items-center justify-around h-14 px-4">
          {/* Favorite */}
          <button
            onClick={toggleFav}
            className={`p-2 rounded-lg transition-colors ${isFavorite ? 'text-yellow-500' : (isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : isPaper ? 'text-amber-900/60 hover:text-amber-900 hover:bg-amber-900/10' : 'text-gray-600 hover:text-black hover:bg-black/5')}`}
            title={isFavorite ? "Remove Favorite" : "Add Favorite"}
          >
            <Star size={24} fill={isFavorite ? "currentColor" : "none"} strokeWidth={2} />
          </button>

          {/* Share */}
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: article.title,
                  text: article.title,
                  url: article.link
                }).catch(() => { });
              }
            }}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : isPaper ? 'text-amber-900/60 hover:text-amber-900 hover:bg-amber-900/10' : 'text-gray-600 hover:text-black hover:bg-black/5'}`}
            title={t(lang, 'share')}
          >
            <Share2 size={24} strokeWidth={2} />
          </button>

          {/* Settings (Replaces floating button) */}
          <button
            onClick={onOpenSettings}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : isPaper ? 'text-amber-900/60 hover:text-amber-900 hover:bg-amber-900/10' : 'text-gray-600 hover:text-black hover:bg-black/5'}`}
            title={t(lang, 'settings')}
          >
            <Settings size={24} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div
        className="mx-auto pb-24 md:py-10 transition-all duration-300 relative z-10 min-h-full"
        style={{
          maxWidth: `var(--max-width)`,
          marginTop: 'calc(var(--safe-top) + 70px)',
          paddingLeft: `${settings.margins}px`,
          paddingRight: `${settings.margins}px`
        }}
        onClick={toggleImmersiveMode}
      >
        <div style={{ pointerEvents: 'auto' }}>
          {/* AI Summary Section - Removed inline display, now using modal */}

          <header className={`mb-8 border-b pb-6 ${isDark ? 'border-zinc-800' : isPaper ? 'border-amber-900/10' : 'border-gray-100'}`}>
            <h1
              className="font-bold mb-4 leading-tight tracking-tight"
              style={{
                fontSize: 'calc(var(--font-size) * 1.5)',
                lineHeight: '1.2',
                fontFamily: 'var(--font-family)'
              }}
            >
              {article.title}
            </h1>

            <div className={`flex flex-wrap items-center gap-4 text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-500' : isPaper ? 'text-amber-900/50' : 'text-gray-400'}`}>
              <span className="flex items-center gap-1"><Clock size={12} /> {new Date(article.pubDate).toLocaleDateString()}</span>
              {article.feedTitle && <span className="before:content-['•'] before:mr-4 before:opacity-50">{article.feedTitle}</span>}
              {article.author && <span className="before:content-['•'] before:mr-4 before:opacity-50">{t(lang, 'by')} {article.author}</span>}
              <a href={article.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline ml-auto text-blue-500">
                {t(lang, 'original')} <ExternalLink size={12} />
              </a>
            </div>
          </header>

          {/* Main Content */}
          <article
            className={`
                prose 
                ${isDark ? 'prose-invert prose-p:text-gray-300 prose-headings:text-gray-100' : isPaper ? 'prose-stone prose-p:text-amber-900 prose-headings:text-amber-900' : 'prose-slate prose-p:text-gray-800 prose-headings:text-gray-900'} 
                max-w-none 
                prose-img:rounded-xl 
                prose-img:shadow-md
                prose-img:mx-auto
                prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-l-4 ${isPaper ? 'prose-blockquote:border-amber-900/40 prose-blockquote:bg-amber-900/5' : 'prose-blockquote:border-blue-500 prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-zinc-800/50'} prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:not-italic
                prose-video:w-full prose-video:rounded-xl
            `}
            // Important: We override Typography plugin defaults with our CSS variables
            style={{
              fontSize: 'var(--font-size)',
              lineHeight: 'var(--line-height)',
              textAlign: settings.textAlign as any,
              fontFamily: 'var(--font-family)',
            }}
            dangerouslySetInnerHTML={{ __html: article.content }}
            onClick={handleContentClick}
          />
        </div>
      </div >

      {/* Flattening styles for dual feed support AND Multimedia Enhancements */}
      < style > {`
        /* Dual Feed Flattening */
        .prose .row { display: flex; flex-direction: column; margin: 0; }
        .prose .col-lg-6, .prose .col-md-6, .prose [class*="col-"] {
            width: 100% !important; max-width: 100% !important; flex: none !important; margin-bottom: var(--para-spacing); padding: 0;
        }
        
        /* Typography */
        .prose img { max-width: 100%; height: auto; }
        .prose p { margin-bottom: var(--para-spacing); letter-spacing: var(--letter-spacing); }
        .prose figure { margin: 2em 0; }
        .prose figcaption { text-align: center; font-size: 0.875em; color: #6b7280; margin-top: 0.5em; }
        
        /* Multimedia Support */
        .prose iframe { 
            width: 100%; 
            aspect-ratio: 16/9; 
            border-radius: 0.5rem; 
            margin: 1.5em 0;
            background: #000;
        }
        .prose video {
            width: 100%;
            height: auto;
            border-radius: 0.5rem;
            margin: 1.5em 0;
        }
        .prose audio {
            width: 100%;
            margin: 1em 0;
        }
      `}</style >

      {/* Step 2: AI Summary Modal (Bottom Sheet) */}
      {showAIModal && (
        <div className={`fixed inset-0 z-50 flex items-end ${settings.eInkMode ? '' : 'animate-in fade-in duration-200'}`}>
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAIModal(false)}
          />

          {/* Modal Content */}
          <div className={`relative w-full h-[70vh] flex flex-col rounded-t-2xl ${isDark ? 'bg-zinc-900 border-t border-zinc-800' : isPaper ? 'bg-[#f7f1e3] border-t border-amber-900/20' : 'bg-white border-t border-gray-200'} shadow-2xl ${settings.eInkMode ? '' : 'animate-in slide-in-from-bottom duration-300'}`}
            style={{ paddingBottom: 'var(--safe-bottom)' }}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isDark ? 'border-zinc-800' : isPaper ? 'border-amber-900/20' : 'border-gray-200'}`}>
              <h3 className={`font-bold flex items-center gap-2 text-lg ${isDark ? 'text-purple-400' : isPaper ? 'text-purple-700' : 'text-purple-600'}`}>
                <Sparkles size={20} /> {t(lang, 'summary')}
              </h3>
              <div className="flex items-center gap-2">
                {summary && !isSummarizing && (
                  <button
                    onClick={() => {
                      handleSummarize();
                    }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${isDark ? 'text-purple-400 hover:bg-zinc-800' : isPaper ? 'text-purple-700 hover:bg-amber-900/10' : 'text-purple-600 hover:bg-purple-50'}`}
                  >
                    {t(lang, 'retry')}
                  </button>
                )}
                <button
                  onClick={() => setShowAIModal(false)}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-zinc-800' : isPaper ? 'text-amber-900/60 hover:text-amber-900 hover:bg-amber-900/10' : 'text-gray-600 hover:text-black hover:bg-gray-100'}`}
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6 flex-1">
              {isSummarizing ? (
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="font-medium">{t(lang, 'summarizing')}</span>
                </div>
              ) : aiError ? (
                <div className="text-red-500 font-medium">{aiError}</div>
              ) : !summary ? (
                // Empty State - Elegant prompt to generate
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <Sparkles size={64} className="text-purple-500 mb-6" strokeWidth={1.5} />
                  <h3 className={`text-2xl font-bold mb-3 ${isDark ? 'text-gray-100' : isPaper ? 'text-amber-900' : 'text-gray-900'}`}>
                    {t(lang, 'aiEmptyTitle')}
                  </h3>
                  <p className={`mb-2 max-w-md ${isDark ? 'text-gray-400' : isPaper ? 'text-amber-900/70' : 'text-gray-600'}`}>
                    {t(lang, 'aiEmptyDescription')}
                  </p>
                  <p className={`text-sm mb-8 ${isDark ? 'text-gray-500' : isPaper ? 'text-amber-900/60' : 'text-gray-500'}`}>
                    {t(lang, 'aiEmptyNote')}
                  </p>
                  <button
                    onClick={() => {
                      handleSummarize();
                    }}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${isDark ? 'bg-purple-600 hover:bg-purple-700 text-white' : isPaper ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                  >
                    <Sparkles size={20} />
                    {t(lang, 'startGenerate')}
                  </button>
                </div>
              ) : (
                <div
                  className={`leading-relaxed prose max-w-none ${isDark ? 'prose-invert text-gray-300' : isPaper ? 'prose-stone text-amber-900' : 'text-gray-700'}`}
                  style={{
                    fontSize: 'calc(var(--font-size) * 0.95)',
                    lineHeight: 'var(--line-height)',
                    fontFamily: 'var(--font-family)'
                  }}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => <p style={{ marginBottom: '0.75em' }} {...props} />,
                      li: ({ node, ...props }) => <li style={{ marginBottom: '0.25em' }} {...props} />,
                      h1: ({ node, ...props }) => <h1 style={{ fontSize: '1.5em', marginTop: '0.5em', marginBottom: '0.5em' }} {...props} />,
                      h2: ({ node, ...props }) => <h2 style={{ fontSize: '1.3em', marginTop: '0.5em', marginBottom: '0.5em' }} {...props} />,
                      h3: ({ node, ...props }) => <h3 style={{ fontSize: '1.1em', marginTop: '0.5em', marginBottom: '0.5em' }} {...props} />
                    }}
                  >
                    {summary}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        src={lightboxSrc}
        onClose={() => setLightboxSrc(null)}
        isEInk={settings.eInkMode}
      />
    </div >
  );
};