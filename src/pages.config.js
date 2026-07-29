/**
 * pages.config.js - Page routing configuration
 *
 * STANDALONE VERSION: this repo is a duplicate of Mikud-QuickCheck-work,
 * trimmed down to just בדיקת מחזור מהירה (RefinanceQuickCheck). mainPage
 * is RefinanceQuickCheck since it's the only flow here.
 */
import RefinanceQuickCheck from './pages/RefinanceQuickCheck';
import __Layout from './Layout.jsx';


export const PAGES = {
    "RefinanceQuickCheck": RefinanceQuickCheck,
}

export const pagesConfig = {
    mainPage: "RefinanceQuickCheck",
    Pages: PAGES,
    Layout: __Layout,
};
