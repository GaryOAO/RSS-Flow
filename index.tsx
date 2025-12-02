import React from 'react';
import './index.css';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SettingsProvider } from './contexts/SettingsContext';
import { FeedProvider } from './contexts/FeedContext';
import { NetworkProvider } from './contexts/NetworkContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <NetworkProvider>
        <SettingsProvider>
          <FeedProvider>
            <App />
          </FeedProvider>
        </SettingsProvider>
      </NetworkProvider>
    </ErrorBoundary>
  </React.StrictMode>
);