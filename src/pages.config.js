import Home from './pages/Home';
import Wallet from './pages/Wallet';
import history from './pages/history';
import Dashboard from './pages/Dashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Wallet": Wallet,
    "history": history,
    "Dashboard": Dashboard,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};