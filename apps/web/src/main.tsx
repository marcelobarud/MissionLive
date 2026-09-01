import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MissionLiveWelcome } from './app';
import './styles.css';

function App() {
  return <main className="shell"><MissionLiveWelcome /></main>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>);
