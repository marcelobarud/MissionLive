import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app';
import { FeedbackProvider } from './feedback';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><FeedbackProvider><App /></FeedbackProvider></BrowserRouter></StrictMode>);

if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
