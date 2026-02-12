import './index.css'
import { initApp } from './scripts/app';
import { initUI } from './scripts/ui';

if ('serviceWorker' in navigator && typeof USE_SW !== 'undefined') {
    navigator.serviceWorker.register('sw.js');
}

document.addEventListener("DOMContentLoaded", () => {
    initApp();
    initUI();
});