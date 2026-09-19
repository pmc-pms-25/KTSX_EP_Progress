import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { appStore } from './store/appStore';
import './index.css';

document.documentElement.dataset.theme = appStore.getState().theme;
document.documentElement.lang = appStore.getState().lang;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
