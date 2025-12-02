import { useState, useEffect } from 'react';
import { AppSettings } from '../types';

const SETTINGS_STORAGE_KEY = 'inkflow_settings';

export const DEFAULT_SETTINGS: AppSettings = {
    language: 'en',
    eInkMode: false,
    theme: 'light',
    useSystemTheme: true,
    uiScale: 1.0,

    // Typography
    fontSize: 18,
    fontFamily: 'sans',
    lineHeight: 1.6,
    letterSpacing: 0,
    paragraphSpacing: 1.5,
    textAlign: 'left',

    // Layout
    pageWidth: 800,
    margins: 24,

    // System
    preferredProxy: 'auto',

    // Data
    refreshInterval: 360, // 6 hours (default for Android optimization)
    downloadImages: true, // Default to true as per user request for offline content

    // RSSHub
    rssHubInstance: 'https://rsshub.app',
    enableRadar: true,

    // AI Defaults
    enableAI: false,
    aiApiKey: '',
    aiBaseUrl: 'https://api.openai.com/v1',
    aiModel: 'gpt-3.5-turbo',
    showUnreadCount: true,
};

export const useSettings = () => {
    // Settings State with Persistence
    const [settings, setSettings] = useState<AppSettings>(() => {
        try {
            const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (saved) {
                return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load settings', e);
        }
        // Auto detect language
        const lang = navigator.language.startsWith('zh') ? 'zh' : 'en';
        return { ...DEFAULT_SETTINGS, language: lang };
    });

    // System Theme Listener
    useEffect(() => {
        if (!settings.useSystemTheme) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
            if (settings.useSystemTheme && !settings.eInkMode) {
                const newTheme = e.matches ? 'dark' : 'light';
                setSettings(prev => ({
                    ...prev,
                    theme: newTheme
                }));
            }
        };

        // Initial check
        handleChange(mediaQuery);

        // Listen for changes
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [settings.useSystemTheme, settings.eInkMode]);

    // Persist settings changes & Apply E-Ink Mode Globally
    useEffect(() => {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));

        // Toggle Global Class for CSS overrides
        if (settings.eInkMode) {
            document.body.classList.add('e-ink-optimized');
        } else {
            document.body.classList.remove('e-ink-optimized');
        }
    }, [settings]);

    const updateSettings = (partial: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...partial }));
    };

    const resetSettings = () => {
        setSettings(DEFAULT_SETTINGS);
    };

    return {
        settings,
        updateSettings,
        resetSettings
    };
};
