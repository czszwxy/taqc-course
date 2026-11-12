import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
// Fonts are bundled locally (the app works offline); all four include Cyrillic for the Ukrainian lessons.
import '@fontsource-variable/manrope';
import '@fontsource-variable/lora';
import '@fontsource-variable/caveat';
import '@fontsource-variable/jetbrains-mono';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
