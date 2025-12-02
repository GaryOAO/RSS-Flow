import { useEffect, useRef } from 'react';
import { App, AppState } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

interface AppLifecycleCallbacks {
    onPause?: () => void | Promise<void>;
    onResume?: () => void | Promise<void>;
    onStateChange?: (state: AppState) => void;
    onBackButton?: () => boolean; // Return true to prevent default
}

/**
 * Hook to manage app lifecycle events on mobile
 * Handles pause/resume, state changes, and back button
 */
export const useAppLifecycle = (callbacks: AppLifecycleCallbacks = {}) => {
    const callbacksRef = useRef(callbacks);

    // Update callbacks ref when they change
    useEffect(() => {
        callbacksRef.current = callbacks;
    }, [callbacks]);

    useEffect(() => {
        // Only run on native platforms
        if (Capacitor.getPlatform() === 'web') {
            return;
        }

        let stateListener: any;
        let backButtonListener: any;
        let pauseListener: any;
        let resumeListener: any;

        const setupListeners = async () => {
            // App state change listener
            stateListener = await App.addListener('appStateChange', async (state: AppState) => {
                console.log('App state changed:', state.isActive ? 'active' : 'background');

                if (callbacksRef.current.onStateChange) {
                    callbacksRef.current.onStateChange(state);
                }

                if (!state.isActive && callbacksRef.current.onPause) {
                    try {
                        await callbacksRef.current.onPause();
                    } catch (error) {
                        console.error('Error in onPause callback:', error);
                    }
                } else if (state.isActive && callbacksRef.current.onResume) {
                    try {
                        await callbacksRef.current.onResume();
                    } catch (error) {
                        console.error('Error in onResume callback:', error);
                    }
                }
            });

            // Back button listener (Android)
            backButtonListener = await App.addListener('backButton', (event) => {
                console.log('Back button pressed, canGoBack:', event.canGoBack);

                if (callbacksRef.current.onBackButton) {
                    const handled = callbacksRef.current.onBackButton();
                    if (handled) {
                        return; // Prevent default
                    }
                }

                // Default behavior: exit app if can't go back
                if (!event.canGoBack) {
                    App.exitApp();
                }
            });

            // Pause listener (alternative to state change)
            pauseListener = await App.addListener('pause', async () => {
                console.log('App paused');
                if (callbacksRef.current.onPause) {
                    try {
                        await callbacksRef.current.onPause();
                    } catch (error) {
                        console.error('Error in pause listener:', error);
                    }
                }
            });

            // Resume listener (alternative to state change)
            resumeListener = await App.addListener('resume', async () => {
                console.log('App resumed');
                if (callbacksRef.current.onResume) {
                    try {
                        await callbacksRef.current.onResume();
                    } catch (error) {
                        console.error('Error in resume listener:', error);
                    }
                }
            });
        };

        setupListeners();

        // Cleanup
        return () => {
            if (stateListener) stateListener.remove();
            if (backButtonListener) backButtonListener.remove();
            if (pauseListener) pauseListener.remove();
            if (resumeListener) resumeListener.remove();
        };
    }, []);

    return {
        isNative: Capacitor.getPlatform() !== 'web',
        platform: Capacitor.getPlatform()
    };
};

/**
 * Hook to auto-save data when app goes to background
 */
export const useAutoSave = (saveCallback: () => void | Promise<void>, dependencies: any[] = []) => {
    const saveCallbackRef = useRef(saveCallback);

    useEffect(() => {
        saveCallbackRef.current = saveCallback;
    }, [saveCallback]);

    useAppLifecycle({
        onPause: async () => {
            console.log('Auto-saving data before pause...');
            try {
                await saveCallbackRef.current();
                console.log('Auto-save completed');
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }
    });
};
