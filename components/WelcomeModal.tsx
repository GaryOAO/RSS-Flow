
import React from 'react';
import { Rss, BookOpen, WifiOff, Layout, ArrowRight, Check, Sparkles, Monitor, ShieldCheck, Radio } from 'lucide-react';
import { t } from '../utils/i18n';
import { Language } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const WelcomeModal: React.FC<Props> = ({ isOpen, onClose, language }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pt-[calc(1rem+var(--safe-top))] animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col transform transition-all scale-100 max-h-[90vh]">

        <div className="p-8 pb-6 text-center bg-gradient-to-b from-slate-50 to-white dark:from-zinc-800 dark:to-zinc-900 border-b border-gray-100 dark:border-zinc-800">
          <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200 dark:shadow-none transform -rotate-6">
            <Rss size={40} strokeWidth={3} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">{t(language, 'welcomeTitle')}</h2>
          <p className="text-slate-600 dark:text-slate-300 text-lg max-w-md mx-auto leading-relaxed">
            {t(language, 'welcomeSubtitle')}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

          {/* Feature 1: Privacy */}
          <div className="flex gap-5">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t(language, 'privacyTitle')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {t(language, 'privacyText')}
              </p>
            </div>
          </div>

          {/* Feature 2: AI Intelligence */}
          <div className="flex gap-5">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
              <Sparkles size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t(language, 'aiFeatureTitle')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {t(language, 'aiFeatureText')}
              </p>
            </div>
          </div>

          {/* Feature 3: E-Ink */}
          <div className="flex gap-5">
            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 flex items-center justify-center flex-shrink-0">
              <Monitor size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t(language, 'einkTitle')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {t(language, 'einkText')}
              </p>
            </div>
          </div>

          {/* Feature 4: RSSHub */}
          <div className="flex gap-5">
            <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0">
              <Radio size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t(language, 'rssHubTitle')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {t(language, 'rssHubText')}
              </p>
            </div>
          </div>

        </div>

        <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex justify-between items-center gap-4">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium pl-2">
            {t(language, 'version')}
          </p>
          <button
            onClick={onClose}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
          >
            {t(language, 'startReading')} <ArrowRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
};