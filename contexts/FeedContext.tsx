import React, { createContext, useContext, ReactNode } from 'react';
import { Feed, Category } from '../types';
import { useFeeds } from '../hooks/useFeeds';

interface FeedContextType {
    feeds: Feed[];
    setFeeds: React.Dispatch<React.SetStateAction<Feed[]>>;
    categories: Category[];
    setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
    loading: boolean;
    refreshing: boolean;
    handleRefreshAll: (isBackground?: boolean) => Promise<void>;
    isWelcomeOpen: boolean;
    setIsWelcomeOpen: (isOpen: boolean) => void;
}

const FeedContext = createContext<FeedContextType | undefined>(undefined);

export const FeedProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const feedLogic = useFeeds();

    return (
        <FeedContext.Provider value={feedLogic}>
            {children}
        </FeedContext.Provider>
    );
};

export const useFeedContext = () => {
    const context = useContext(FeedContext);
    if (context === undefined) {
        throw new Error('useFeedContext must be used within a FeedProvider');
    }
    return context;
};
