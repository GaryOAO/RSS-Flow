import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Network, ConnectionStatus } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

interface NetworkContextValue {
    isOnline: boolean;
    connectionType: string;
    isConnectedToWifi: boolean;
    showOfflineWarning: () => void;
    hideOfflineWarning: () => void;
    offlineWarningVisible: boolean;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(true);
    const [connectionType, setConnectionType] = useState('unknown');
    const [offlineWarningVisible, setOfflineWarningVisible] = useState(false);

    const isConnectedToWifi = connectionType === 'wifi';

    useEffect(() => {
        const initNetwork = async () => {
            if (Capacitor.getPlatform() === 'web') {
                // Web fallback
                setIsOnline(navigator.onLine);
                setConnectionType(navigator.onLine ? 'wifi' : 'none');

                const handleOnline = () => {
                    setIsOnline(true);
                    setConnectionType('wifi');
                    console.log('Network: Back online');
                };

                const handleOffline = () => {
                    setIsOnline(false);
                    setConnectionType('none');
                    setOfflineWarningVisible(true);
                    console.log('Network: Offline');
                };

                window.addEventListener('online', handleOnline);
                window.addEventListener('offline', handleOffline);

                return () => {
                    window.removeEventListener('online', handleOnline);
                    window.removeEventListener('offline', handleOffline);
                };
            } else {
                // Native platform: Use Capacitor Network plugin
                try {
                    const status = await Network.getStatus();
                    setIsOnline(status.connected);
                    setConnectionType(status.connectionType);
                    console.log('Initial network status:', status);

                    if (!status.connected) {
                        setOfflineWarningVisible(true);
                    }
                } catch (error) {
                    console.error('Failed to get network status:', error);
                }

                let networkListener: any;
                const setupListener = async () => {
                    networkListener = await Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
                        console.log('Network status changed:', status);
                        setIsOnline(status.connected);
                        setConnectionType(status.connectionType);

                        if (!status.connected) {
                            setOfflineWarningVisible(true);
                        } else {
                            // Auto-hide warning after 2s when back online
                            setTimeout(() => {
                                setOfflineWarningVisible(false);
                            }, 2000);
                        }
                    });
                };

                setupListener();

                return () => {
                    if (networkListener) networkListener.remove();
                };
            }
        };

        const cleanup = initNetwork();
        return () => {
            cleanup.then(fn => fn && fn());
        };
    }, []);

    const showOfflineWarning = () => setOfflineWarningVisible(true);
    const hideOfflineWarning = () => setOfflineWarningVisible(false);

    return (
        <NetworkContext.Provider
            value={{
                isOnline,
                connectionType,
                isConnectedToWifi,
                showOfflineWarning,
                hideOfflineWarning,
                offlineWarningVisible
            }}
        >
            {children}
        </NetworkContext.Provider>
    );
};

export const useNetwork = (): NetworkContextValue => {
    const context = useContext(NetworkContext);
    if (!context) {
        throw new Error('useNetwork must be used within NetworkProvider');
    }
    return context;
};

/**
 * HOC to wrap components with network-aware logic
 */
export const withNetworkAware = <P extends object>(
    Component: React.ComponentType<P>,
    offlineMessage = 'This feature requires an internet connection'
) => {
    return (props: P) => {
        const { isOnline } = useNetwork();

        if (!isOnline) {
            return (
                <div className="flex items-center justify-center h-full p-8 text-center">
                    <div className="space-y-4">
                        <div className="text-6xl">📡</div>
                        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">Offline</h3>
                        <p className="text-gray-500">{offlineMessage}</p>
                    </div>
                </div>
            );
        }

        return <Component {...props} />;
    };
};
