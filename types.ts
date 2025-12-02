
export interface FeedItem {
  id?: string; // Unique identifier (hash or guid)
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  guid: string;
  author?: string;
  thumbnail?: string;
  isFavorite?: boolean;
  isRead?: boolean;
  isReadLater?: boolean;
  feedTitle?: string; // For Timeline context
  feedUrl?: string;
  aiSummary?: string; // Persisted AI Summary
}

export interface Feed {
  url: string;
  title: string;
  description: string;
  items: FeedItem[];
  lastUpdated: number;
  favicon?: string;
  categoryId?: string; // For grouping in Lists
  isMuted?: boolean; // If true, unread counts are ignored/hidden
}

export interface Category {
  id: string;
  name: string;
  parentId?: string; // For nested categories
}

export type Language = 'en' | 'zh';

export interface AppSettings {
  // General
  language: Language;
  eInkMode: boolean;
  theme: 'light' | 'dark' | 'paper';
  useSystemTheme: boolean; // Follow system dark mode
  uiScale: number; // Global UI Scale (0.8 - 1.3), affects REM base

  // Typography
  fontSize: number; // px, e.g. 16 to 32
  fontFamily: 'sans' | 'serif' | 'mono' | 'literata' | 'georgia';
  lineHeight: number; // unitless, e.g. 1.2 to 2.5
  letterSpacing: number; // px, e.g. -1 to 2
  paragraphSpacing: number; // em, e.g. 0.5 to 2.5
  textAlign: 'left' | 'justify';

  // Layout
  pageWidth: number; // max-width in px, e.g. 600 to 1200
  margins: number; // px, e.g. 10 to 100

  // System
  preferredProxy: 'auto' | 'corsproxy' | 'rss2json' | 'codetabs';

  // Data & Network
  refreshInterval: number; // Minutes. 0 = Manual
  downloadImages: boolean; // If true, attempts to download and cache images as Base64

  // RSSHub
  rssHubInstance: string; // e.g. 'https://rsshub.app'
  enableRadar: boolean; // Enable RSSHub Radar features

  // AI Features
  enableAI: boolean;
  aiApiKey: string;
  aiBaseUrl?: string;
  aiModel?: string;
  showUnreadCount: boolean;

  // PagingReader - Immersive Mode Info
  showProgressInImmersive?: boolean;     // Show progress bar in immersive mode (default: true)
  showPageNumberInImmersive?: boolean;   // Show page number in immersive mode (default: true)
  showTimeInImmersive?: boolean;         // Show current time in immersive mode (default: false)
}

export interface ViewState {
  currentFeedUrl: string | null; // null can mean "Timeline" or "Favorites"
  specialView: 'timeline' | 'favorites' | 'read-later' | null;
  currentArticle: FeedItem | null;
  isSidebarOpen: boolean;
  viewMode: 'list' | 'reader';
}