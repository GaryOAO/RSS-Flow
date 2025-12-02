import React from 'react';
import { Plus, Settings, Rss } from 'lucide-react';
import { t } from '../utils/i18n';
import { Language } from '../types';

interface Props {
  onAddFeed: () => void;
  onOpenSettings: () => void;
  language: Language;
}

export const EmptyState: React.FC<Props> = ({ onAddFeed, onOpenSettings, language }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50 dark:bg-black/50">
      <div className="w-24 h-24 bg-white dark:bg-zinc-800 rounded-3xl shadow-xl flex items-center justify-center mb-8 transform -rotate-3 transition-transform hover:rotate-0 duration-300">
        <Rss size={48} className="text-blue-500" strokeWidth={2.5} />
      </div>

      <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-3">
        {t(language, 'noFeeds')}
      </h2>

      <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-8 leading-relaxed">
        {t(language, 'emptyMessage')}
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onAddFeed}
          className="flex items-center justify-center gap-3 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
        >
          <Plus size={20} strokeWidth={3} />
          {t(language, 'addSubscription')}
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center gap-3 px-6 py-3.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors"
        >
          <Settings size={20} />
          {t(language, 'importSettings')}
        </button>
      </div>
    </div>
  );
};