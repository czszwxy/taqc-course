import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { IS_STATIC_SITE, ROUTER_BASENAME } from './site';
import { installMockApi } from './site/mockApi';
// Fonts are bundled locally (the app works offline); all four include Cyrillic for the Ukrainian lessons.
import '@fontsource-variable/manrope';
import '@fontsource-variable/lora';
import '@fontsource-variable/caveat';
import '@fontsource-variable/jetbrains-mono';
import './index.css';

// The website has no server: answer the Gadgetly API in the browser before any page asks it for data.
if (IS_STATIC_SITE) installMockApi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={ROUTER_BASENAME || '/'}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
