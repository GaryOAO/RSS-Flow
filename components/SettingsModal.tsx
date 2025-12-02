
import React, { useRef, useState } from 'react';
import { AppSettings } from '../types';
import { X, Type, Monitor, Cpu, RotateCcw, Download, Clock, Scaling, Database, Upload, FileText, Trash2, ImageOff, Globe, Rss, Sparkles, BookOpen, Settings2 } from 'lucide-react';
import { t as translate } from '../utils/i18n';

import { useSettingsContext } from '../contexts/SettingsContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // settings and onUpdate removed - using Context
  onReset: () => void;
  onExportOPML: () => void;
  onImportOPML: (file: File) => void;
  onClearCache: () => void;
  onClearAllData: () => void;
}
export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, onReset, onExportOPML, onImportOPML, onClearCache, onClearAllData }) => {
  // Adapter for compatibility with existing code structure
  const onUpdate = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    updateSettings({ [key]: value });
  };

  const { settings, updateSettings } = useSettingsContext();
  const [activeTab, setActiveTab] = React.useState<'appearance' | 'eink' | 'ai' | 'general'>('appearance');
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClearData, setConfirmClearData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lang = settings.language;

  if (!isOpen) return null;

  const fonts = [
    { id: 'sans', name: 'System Sans' },
    { id: 'serif', name: 'System Serif' },
    { id: 'mono', name: 'Monospace' },
    { id: 'georgia', name: 'Georgia' },
    { id: 'literata', name: 'Literata' },
  ];

  const proxies = [
    { id: 'auto', name: 'RSS2JSON' },
    { id: 'rss2json', name: 'RSS2JSON Service' },
    { id: 'codetabs', name: 'CodeTabs Proxy' },
    { id: 'corsproxy', name: 'CORS Proxy IO' },
  ];

  const refreshIntervals = [
    { val: 0, label: translate(lang, 'manual') },
    { val: 15, label: translate(lang, 'every15m') },
    { val: 30, label: translate(lang, 'every30m') },
    { val: 60, label: translate(lang, 'every1h') },
    { val: 120, label: translate(lang, 'every2h') },
    { val: 360, label: translate(lang, 'every6h') },
    { val: 720, label: translate(lang, 'every12h') },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImportOPML(e.target.files[0]);
    }
  };

  const handleClearCacheWrapper = async () => {
    setIsClearing(true);
    setTimeout(() => {
      onClearCache();
      setIsClearing(false);
    }, 100);
  };

  return (
    <div className="absolute inset-0 z-[50] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pt-[calc(1rem+var(--safe-top))] animate-in fade-in duration-200">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${settings.theme === 'dark' ? 'bg-zinc-900 text-gray-100 border border-zinc-700' : 'bg-white text-gray-900'}`}>

        {/* Header */}
        <div className={`px-6 pt-6 pb-3 border-b flex justify-between items-center ${settings.theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'}`}>
          <h2 className="font-bold text-xl tracking-tight">{translate(lang, 'settings')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${settings.theme === 'dark' ? 'border-zinc-800 bg-zinc-900' : 'border-gray-100 bg-white'} sticky top-0 z-10`}>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex-1 py-3 px-1 text-xs sm:text-sm font-bold flex items-center justify-center gap-1 sm:gap-2 border-b-2 transition-colors min-w-0 ${activeTab === 'appearance' ? (settings.eInkMode ? 'border-black text-black' : 'border-blue-500 text-blue-500') : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
          >
            <Monitor size={14} className="shrink-0" /> <span className="truncate">{translate(lang, 'appearance')}</span>
          </button>
          <button
            onClick={() => setActiveTab('eink')}
            className={`flex-1 py-3 px-1 text-xs sm:text-sm font-bold flex items-center justify-center gap-1 sm:gap-2 border-b-2 transition-colors min-w-0 ${activeTab === 'eink' ? (settings.eInkMode ? 'border-black text-black' : 'border-blue-500 text-blue-500') : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
          >
            <BookOpen size={14} className="shrink-0" /> <span className="truncate">E-ink</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex-1 py-3 px-1 text-xs sm:text-sm font-bold flex items-center justify-center gap-1 sm:gap-2 border-b-2 transition-colors min-w-0 ${activeTab === 'ai' ? (settings.eInkMode ? 'border-black text-black' : 'border-blue-500 text-blue-500') : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
          >
            <Sparkles size={14} className="shrink-0" /> <span className="truncate">AI</span>
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 px-1 text-xs sm:text-sm font-bold flex items-center justify-center gap-1 sm:gap-2 border-b-2 transition-colors min-w-0 ${activeTab === 'general' ? (settings.eInkMode ? 'border-black text-black' : 'border-blue-500 text-blue-500') : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'}`}
          >
            <Settings2 size={14} className="shrink-0" /> <span className="truncate">{translate(lang, 'general')}</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar touch-pan-y">

          {/* --- APPEARANCE TAB (Display + Typography) --- */}
          {activeTab === 'appearance' && (
            <div className="space-y-8">
              {/* Display Section */}
              <div className="space-y-6">
                <h3 className={`font-bold text-lg flex items-center gap-2 pb-2 ${settings.eInkMode ? 'border-b-2 border-black' : 'border-b border-gray-200 dark:border-zinc-700'}`}>
                  <Monitor size={20} /> {translate(lang, 'display')}
                </h3>

                {/* Language */}
                <div className="space-y-3">
                  <label className="font-bold text-sm text-gray-500 flex items-center gap-2">
                    <Globe size={16} /> {translate(lang, 'language')}
                  </label>
                  <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
                    <button
                      onClick={() => onUpdate('language', 'en')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${settings.language === 'en' ? 'bg-white dark:bg-zinc-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => onUpdate('language', 'zh')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${settings.language === 'zh' ? 'bg-white dark:bg-zinc-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      中文
                    </button>
                  </div>
                </div>

                <hr className={settings.theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'} />

                {/* UI Scale / DPI */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="font-bold text-sm text-gray-500 flex items-center gap-2">
                      <Scaling size={16} /> {translate(lang, 'uiScale')}
                    </label>
                    <span className="text-xs font-mono">{Math.round(settings.uiScale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={settings.uiScale}
                    onChange={(e) => onUpdate('uiScale', Number(e.target.value))}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${settings.eInkMode ? 'bg-black accent-black' : 'bg-gray-200 accent-blue-600'}`}
                  />
                  <p className="text-xs text-gray-500">
                    {translate(lang, 'uiScaleDesc')}
                  </p>
                </div>

                <hr className={settings.theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'} />

                {/* Theme */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-sm text-gray-500">{translate(lang, 'theme')}</label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{translate(lang, 'followSystem')}</span>
                      <button
                        onClick={() => onUpdate('useSystemTheme', !settings.useSystemTheme)}
                        disabled={settings.eInkMode}
                        className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${settings.eInkMode ? 'opacity-30 cursor-not-allowed' : ''} ${settings.useSystemTheme ? 'bg-blue-600' : 'bg-gray-300 dark:bg-zinc-600'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${settings.useSystemTheme ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                  {settings.eInkMode && (
                    <div className="flex items-center gap-2 p-2 border border-black rounded bg-gray-100">
                      <div className="w-4 h-4 bg-black rounded-full shrink-0" />
                      <p className="text-xs font-bold text-black">{translate(lang, 'themeSelectionDisabled')}</p>
                    </div>
                  )}
                  <div className={`grid grid-cols-3 gap-3 ${settings.useSystemTheme || settings.eInkMode ? 'opacity-50 pointer-events-none' : ''}`}>
                    <button
                      onClick={() => !settings.eInkMode && onUpdate('theme', 'light')}
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 ${settings.theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-zinc-800' : 'border-transparent bg-gray-100 dark:bg-zinc-800'}`}
                    >
                      <div className="w-6 h-6 rounded-full bg-white border border-gray-300"></div>
                      <span className="text-xs font-bold">{translate(lang, 'light')}</span>
                    </button>
                    <button
                      onClick={() => !settings.eInkMode && onUpdate('theme', 'dark')}
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 ${settings.theme === 'dark' ? 'border-blue-500 bg-zinc-800' : 'border-transparent bg-gray-100 dark:bg-zinc-800'}`}
                    >
                      <div className="w-6 h-6 rounded-full bg-black border border-gray-600"></div>
                      <span className="text-xs font-bold">{translate(lang, 'dark')}</span>
                    </button>
                    <button
                      onClick={() => !settings.eInkMode && onUpdate('theme', 'paper')}
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 ${settings.theme === 'paper' ? 'border-amber-600 bg-[#f7f1e3]' : 'border-transparent bg-gray-100 dark:bg-zinc-800'}`}
                    >
                      <div className="w-6 h-6 rounded-full bg-[#f7f1e3] border-2 border-amber-600"></div>
                      <span className="text-xs font-bold text-amber-900 dark:text-gray-300">{translate(lang, 'paper')}</span>
                    </button>
                  </div>
                </div>

                {/* Show Unread Count */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block font-bold text-gray-700 dark:text-gray-300">{translate(lang, 'showUnreadCount')}</label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{translate(lang, 'showUnreadCountDesc')}</p>
                    </div>
                    <button
                      onClick={() => onUpdate('showUnreadCount', !settings.showUnreadCount)}
                      className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${settings.showUnreadCount ? 'bg-blue-600' : 'bg-gray-300 dark:bg-zinc-600'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.showUnreadCount ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Max Width */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="font-bold text-sm text-gray-500">{translate(lang, 'readingWidth')}</label>
                    <span className="text-xs font-mono">{settings.pageWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="1200"
                    step="50"
                    value={settings.pageWidth}
                    onChange={(e) => onUpdate('pageWidth', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Margins */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="font-bold text-sm text-gray-500">{translate(lang, 'sideMargins')}</label>
                    <span className="text-xs font-mono">{settings.margins}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="4"
                    value={settings.margins}
                    onChange={(e) => onUpdate('margins', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>



              {/* Typography Section */}
              <div className="space-y-6">
                <h3 className={`font-bold text-lg flex items-center gap-2 pb-2 pt-4 ${settings.eInkMode ? 'border-b-2 border-black' : 'border-b border-gray-200 dark:border-zinc-700'}`}>
                  <Type size={20} /> {translate(lang, 'typography')}
                </h3>

                {/* Font Family */}
                <div className="space-y-3">
                  <label className="font-bold text-sm text-gray-500">{translate(lang, 'fontFamily')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {fonts.map(font => (
                      <button
                        key={font.id}
                        onClick={() => onUpdate('fontFamily', font.id as any)}
                        className={`p-2 text-sm border rounded-md transition-all ${settings.fontFamily === font.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                      >
                        {font.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="font-bold text-sm text-gray-500">{translate(lang, 'fontSize')}</label>
                    <span className="text-xs font-mono">{settings.fontSize}px</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs">A</span>
                    <input
                      type="range"
                      min="12"
                      max="40"
                      step="1"
                      value={settings.fontSize}
                      onChange={(e) => onUpdate('fontSize', Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="text-xl font-bold">A</span>
                  </div>
                </div>

                {/* Line Height */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="font-bold text-sm text-gray-500">{translate(lang, 'lineSpacing')}</label>
                    <span className="text-xs font-mono">{settings.lineHeight}</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.1"
                    value={settings.lineHeight}
                    onChange={(e) => onUpdate('lineHeight', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Paragraph Spacing */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <label className="font-bold text-sm text-gray-500">{translate(lang, 'paraSpacing')}</label>
                    <span className="text-xs font-mono">{settings.paragraphSpacing}em</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="3.0"
                    step="0.25"
                    value={settings.paragraphSpacing}
                    onChange={(e) => onUpdate('paragraphSpacing', Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                {/* Alignment */}
                <div className="space-y-3">
                  <label className="font-bold text-sm text-gray-500">{translate(lang, 'alignment')}</label>
                  <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-lg">
                    <button
                      onClick={() => onUpdate('textAlign', 'left')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${settings.textAlign === 'left' ? 'bg-white dark:bg-zinc-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      {translate(lang, 'leftAlign')}
                    </button>
                    <button
                      onClick={() => onUpdate('textAlign', 'justify')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${settings.textAlign === 'justify' ? 'bg-white dark:bg-zinc-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      {translate(lang, 'justify')}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* --- E-INK TAB --- */}
          {activeTab === 'eink' && (
            <div className="space-y-6">

              {/* E-ink Mode Toggle */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-lg">{translate(lang, 'eInkMode')}</label>
                  <button
                    onClick={() => onUpdate('eInkMode', !settings.eInkMode)}
                    className={`w-14 h-7 rounded-full transition-colors relative shrink-0 ${settings.eInkMode ? 'bg-black' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${settings.eInkMode ? 'left-8' : 'left-1'}`} />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {translate(lang, 'eInkDesc')}
                </p>
              </div>

              <hr className={settings.theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'} />

              {/* Paging Immersive Mode Info */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-gray-500">{translate(lang, 'immersiveInfo')}</h4>
                <p className="text-xs text-gray-500">{translate(lang, 'immersiveInfoDesc')}</p>

                {/* Show Progress Bar */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-sm">{translate(lang, 'showProgressInImmersive')}</label>
                    <p className="text-xs text-gray-500">{translate(lang, 'showProgressDesc')}</p>
                  </div>
                  <button
                    onClick={() => onUpdate('showProgressInImmersive', !(settings.showProgressInImmersive ?? true))}
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${(settings.showProgressInImmersive ?? true) ? 'bg-blue-600' : 'bg-gray-300 dark:bg-zinc-600'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${(settings.showProgressInImmersive ?? true) ? 'translate-x-6' : ''}`} />
                  </button>
                </div>

                {/* Show Page Number */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-sm">{translate(lang, 'showPageNumberInImmersive')}</label>
                    <p className="text-xs text-gray-500">{translate(lang, 'showPageNumberDesc')}</p>
                  </div>
                  <button
                    onClick={() => onUpdate('showPageNumberInImmersive', !(settings.showPageNumberInImmersive ?? true))}
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${(settings.showPageNumberInImmersive ?? true) ? 'bg-blue-600' : 'bg-gray-300 dark:bg-zinc-600'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${(settings.showPageNumberInImmersive ?? true) ? 'translate-x-6' : ''}`} />
                  </button>
                </div>

                {/* Show Time */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-bold text-sm">{translate(lang, 'showTimeInImmersive')}</label>
                    <p className="text-xs text-gray-500">{translate(lang, 'showTimeDesc')}</p>
                  </div>
                  <button
                    onClick={() => onUpdate('showTimeInImmersive', !(settings.showTimeInImmersive ?? false))}
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${(settings.showTimeInImmersive ?? false) ? 'bg-blue-600' : 'bg-gray-300 dark:bg-zinc-600'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${(settings.showTimeInImmersive ?? false) ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* --- GENERAL TAB (Data + System) --- */}
          {activeTab === 'general' && (
            <div className="space-y-8">
              {/* Data Section */}
              <div className="space-y-6">
                <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2">
                  <Database size={20} /> {translate(lang, 'data')}
                </h3>

                {/* OPML Section */}
                <div className={`p-4 rounded-xl border ${settings.eInkMode ? 'border-2 border-black bg-white' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/50'}`}>
                  <h3 className={`font-bold mb-2 flex items-center gap-2 ${settings.eInkMode ? 'text-black' : 'text-blue-900 dark:text-blue-100'}`}>
                    <FileText size={18} /> {translate(lang, 'opmlTitle')}
                  </h3>
                  <p className={`text-sm mb-4 ${settings.eInkMode ? 'text-black' : 'text-blue-800 dark:text-blue-200'}`}>
                    {translate(lang, 'opmlDesc')}
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="file"
                      accept=".opml,.xml"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex-1 py-2 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${settings.eInkMode ? 'bg-white border-2 border-black text-black hover:bg-black hover:text-white' : 'bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
                    >
                      <Upload size={16} /> {translate(lang, 'import')}
                    </button>
                    <button
                      onClick={onExportOPML}
                      className={`flex-1 py-2 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${settings.eInkMode ? 'bg-black text-white border-2 border-black hover:bg-white hover:text-black' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                      <Download size={16} /> {translate(lang, 'export')}
                    </button>
                  </div>
                </div>

                {/* Storage Management */}
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-gray-500 flex items-center gap-2">
                    <Database size={16} /> {translate(lang, 'storage')}
                  </h3>

                  <button
                    onClick={handleClearCacheWrapper}
                    disabled={isClearing}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors group ${settings.eInkMode ? 'border-2 border-black bg-white hover:bg-black hover:text-white' : 'border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${settings.eInkMode ? 'text-black group-hover:text-white' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
                        <ImageOff size={18} />
                      </div>
                      <div className="text-left">
                        <div className={`font-bold text-sm ${settings.eInkMode ? 'group-hover:text-white' : ''}`}>{isClearing ? translate(lang, 'clearing') : translate(lang, 'clearCache')}</div>
                        <div className={`text-xs ${settings.eInkMode ? 'text-black group-hover:text-white' : 'text-gray-500'}`}>{translate(lang, 'clearCacheDesc')}</div>
                      </div>
                    </div>
                    <div className={`text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity ${settings.eInkMode ? 'text-white' : 'text-orange-600'}`}>{translate(lang, 'clear')}</div>
                  </button>

                  <button
                    onClick={() => {
                      if (confirmClearData) {
                        onClearAllData();
                        setConfirmClearData(false);
                      } else {
                        setConfirmClearData(true);
                        setTimeout(() => setIsClearing(false), 2000);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors group ${confirmClearData ? 'bg-red-600 text-white border-red-600' : (settings.eInkMode ? 'border-2 border-black bg-white hover:bg-black hover:text-white' : 'border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20')}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${confirmClearData ? 'bg-white/20 text-white' : (settings.eInkMode ? 'text-black group-hover:text-white' : 'bg-red-200 dark:bg-red-900/50 text-red-700 dark:text-red-400')}`}>
                        <Trash2 size={18} />
                      </div>
                      <div className="text-left">
                        <div className={`font-bold text-sm ${confirmClearData ? 'text-white' : (settings.eInkMode ? 'text-black group-hover:text-white' : 'text-red-700 dark:text-red-400')}`}>{confirmClearData ? translate(lang, 'confirmDeleteData') : translate(lang, 'clearData')}</div>
                        {!confirmClearData && <div className={`text-xs ${settings.eInkMode ? 'text-black group-hover:text-white' : 'text-red-600/70 dark:text-red-400/70'}`}>{translate(lang, 'clearDataDesc')}</div>}
                      </div>
                    </div>
                    {!confirmClearData && <div className={`text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity ${settings.eInkMode ? 'text-white' : 'text-red-600'}`}>{translate(lang, 'delete')}</div>}
                  </button>
                </div>

                {/* Reset Settings Only */}
                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                  <button
                    onClick={onReset}
                    className={`flex items-center gap-2 text-sm font-medium p-2 rounded-lg w-full justify-center transition-colors ${settings.eInkMode ? 'text-black border-2 border-black hover:bg-black hover:text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}
                  >
                    <RotateCcw size={14} /> {translate(lang, 'resetPrefs')}
                  </button>
                </div>
              </div>




              {/* System Section */}
              <div className="space-y-6">
                <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2 pt-4">
                  <Cpu size={20} /> {translate(lang, 'system')}
                </h3>

                {/* Refresh Interval */}
                <div className="space-y-3">
                  <label className="font-bold text-sm text-gray-500 flex items-center gap-2">
                    <Clock size={16} /> {translate(lang, 'bgRefresh')}
                  </label>
                  <select
                    value={settings.refreshInterval}
                    onChange={(e) => onUpdate('refreshInterval', Number(e.target.value))}
                    className="w-full p-2 rounded-lg border bg-white dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {refreshIntervals.map(opt => (
                      <option key={opt.val} value={opt.val}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">
                    {translate(lang, 'bgRefreshDesc')}
                  </p>
                </div>

                {/* Offline Images */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-sm text-gray-500 flex items-center gap-2">
                      <Download size={16} /> {translate(lang, 'offlineImages')}
                    </label>
                    <button
                      onClick={() => onUpdate('downloadImages', !settings.downloadImages)}
                      className={`w-14 h-7 rounded-full transition-colors relative shrink-0 ${settings.downloadImages ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${settings.downloadImages ? 'left-8' : 'left-1'}`} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {translate(lang, 'offlineImagesDesc')} <br />
                    <span className="text-red-500">{translate(lang, 'offlineImagesWarning')}</span>
                  </p>
                </div>

                <hr className={settings.theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'} />

                {/* RSSHub Configuration */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-sm text-gray-500 flex items-center gap-2">
                      <Rss size={16} /> {translate(lang, 'rssHubRadar')}
                    </label>
                    <button
                      onClick={() => onUpdate('enableRadar', !settings.enableRadar)}
                      className={`w-14 h-7 rounded-full transition-colors relative shrink-0 ${settings.enableRadar ? 'bg-orange-500' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${settings.enableRadar ? 'left-8' : 'left-1'}`} />
                    </button>
                  </div>

                  {settings.enableRadar && (
                    <div className="mt-2">
                      <label className="text-xs font-bold text-gray-500 mb-1 block">{translate(lang, 'customUrl')}</label>
                      <input
                        type="text"
                        value={settings.rssHubInstance}
                        onChange={(e) => onUpdate('rssHubInstance', e.target.value)}
                        placeholder="https://rsshub.app"
                        className="w-full p-2 rounded-lg border bg-white dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {translate(lang, 'rssHubDesc')}
                      </p>
                    </div>
                  )}
                </div>

                <hr className={settings.theme === 'dark' ? 'border-zinc-800' : 'border-gray-100'} />

                {/* Proxy Selection */}
                <div className="space-y-3">
                  <label className="font-bold text-sm text-gray-500">{translate(lang, 'proxyStrategy')}</label>
                  <select
                    value={settings.preferredProxy}
                    onChange={(e) => onUpdate('preferredProxy', e.target.value as any)}
                    className="w-full p-2 rounded-lg border bg-white dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {proxies.map(p => (
                      <option key={p.id} value={p.id}>{p.id === 'auto' ? translate(lang, 'autoProxy') : p.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500">
                    {translate(lang, 'proxyDesc')}
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* --- AI TAB --- */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-lg flex items-center gap-2">
                    <Sparkles size={20} className="text-purple-500" />
                    {translate(lang, 'ai')}
                  </label>
                  <button
                    onClick={() => onUpdate('enableAI', !settings.enableAI)}
                    className={`w-14 h-7 rounded-full transition-colors relative shrink-0 ${settings.enableAI ? 'bg-purple-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${settings.enableAI ? 'left-8' : 'left-1'}`} />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {translate(lang, 'aiDesc')}
                </p>
              </div>

              {settings.enableAI && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <label className="font-bold text-sm text-gray-500">{translate(lang, 'apiKey')}</label>
                    <input
                      type="password"
                      value={settings.aiApiKey}
                      onChange={(e) => onUpdate('aiApiKey', e.target.value)}
                      placeholder="sk-..."
                      className="w-full p-2 rounded-lg border bg-white dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-sm text-gray-500">{translate(lang, 'baseUrl')}</label>
                    <input
                      type="text"
                      value={settings.aiBaseUrl}
                      onChange={(e) => onUpdate('aiBaseUrl', e.target.value)}
                      placeholder="https://api.openai.com/v1"
                      className="w-full p-2 rounded-lg border bg-white dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-sm text-gray-500">{translate(lang, 'model')}</label>
                    <input
                      type="text"
                      value={settings.aiModel}
                      onChange={(e) => onUpdate('aiModel', e.target.value)}
                      placeholder="gpt-3.5-turbo"
                      className="w-full p-2 rounded-lg border bg-white dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};