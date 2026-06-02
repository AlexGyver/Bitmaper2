import './index.css'
import { initApp } from './scripts/app';
import { initUI } from './scripts/ui';

if ('serviceWorker' in navigator && typeof USE_SW !== 'undefined' && USE_SW) {
    navigator.serviceWorker.register('sw.js').catch(console.warn);
}

document.addEventListener("DOMContentLoaded", () => {
    initApp();
    initUI();
});