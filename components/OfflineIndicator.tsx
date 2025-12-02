import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetwork } from '../contexts/NetworkContext';

export const OfflineIndicator: React.FC = () => {
    const { isOnline, offlineWarningVisible, hideOfflineWarning, connectionType } = useNetwork();

    if (!offlineWarningVisible && isOnline) {
        return null;
    }

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-[9999] transition-transform duration-300 ${offlineWarningVisible ? 'translate-y-0' : '-translate-y-full'
                }`}
            style={{ paddingTop: 'var(--safe-top, 0px)' }}
        >
            <div
                className={`${isOnline
                        ? 'bg-green-600'
                        : 'bg-orange-600'
                    } text-white px-4 py-3 flex items-center justify-between shadow-lg`}
            >
                <div className="flex items-center gap-3">
                    {isOnline ? (
                        <Wifi size={20} className="shrink-0" />
                    ) : (
                        <WifiOff size={20} className="shrink-0 animate-pulse" />
                    )}
                    <div>
                        <p className="font-medium text-sm">
                            {isOnline ? 'Back Online' : 'You are offline'}
                        </p>
                        <p className="text-xs opacity-90">
                            {isOnline
                                ? `Connected via ${connectionType}`
                                : 'Some features may be limited'}
                        </p>
                    </div>
                </div>
                {isOnline && (
                    <button
                        onClick={hideOfflineWarning}
                        className="text-white/80 hover:text-white text-sm px-3 py-1 rounded"
                    >
                        Dismiss
                    </button>
                )}
            </div>
        </div>
    );
};
