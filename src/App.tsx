import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './app/Layout';
import { CatalogPage } from './pages/CatalogPage';
import { CoursePage } from './pages/CoursePage';
import { ModulePage } from './pages/ModulePage';
import { LessonPage } from './pages/LessonPage';
import { TaskPage } from './pages/TaskPage';
import { SettingsPage } from './pages/SettingsPage';
import { AccountPage as YourAccountPage } from './pages/AccountPage';
import { PlaygroundIndex } from './pages/PlaygroundIndex';
import { NotFound } from './pages/NotFound';
import { SignupPage } from './playground/SignupPage';
import { LoginPage } from './playground/LoginPage';
import { CartPage } from './playground/CartPage';
import { SearchPage } from './playground/SearchPage';
import { OrderPage } from './playground/OrderPage';
import { TodoPage } from './playground/TodoPage';
import { DevToolsLabPage } from './playground/DevToolsLabPage';
import { ResponsivePage } from './playground/ResponsivePage';
import { ApiConsolePage } from './playground/ApiConsolePage';
import { AccountPage } from './playground/AccountPage';
import { CheckoutPage } from './playground/CheckoutPage';
import { ReturnsPage } from './playground/ReturnsPage';
import { DealPage } from './playground/DealPage';
import { A11yPage } from './playground/A11yPage';
import { HelpWidgetPage } from './playground/HelpWidgetPage';
import { TermsPage } from './playground/TermsPage';
import { useSettings } from './features/progress/store';

export default function App() {
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    // Phones colour the browser bar (and an installed app's status bar) with theme-color: match the top bar's paper.
    const paper = getComputedStyle(document.documentElement).getPropertyValue('--c-surface').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', paper);
  }, [theme]);

  return (
    <Routes>
      {/* Bug Playground pages are standalone (no app chrome) so they can be tested like a real site. */}
      <Route path="/playground/signup" element={<SignupPage />} />
      <Route path="/playground/login" element={<LoginPage />} />
      <Route path="/playground/cart" element={<CartPage />} />
      <Route path="/playground/search" element={<SearchPage />} />
      <Route path="/playground/order" element={<OrderPage />} />
      <Route path="/playground/todo" element={<TodoPage />} />
      <Route path="/playground/devtools" element={<DevToolsLabPage />} />
      <Route path="/playground/responsive" element={<ResponsivePage />} />
      <Route path="/playground/api" element={<ApiConsolePage />} />
      <Route path="/playground/account" element={<AccountPage />} />
      <Route path="/playground/checkout" element={<CheckoutPage />} />
      <Route path="/playground/returns" element={<ReturnsPage />} />
      <Route path="/playground/deal" element={<DealPage />} />
      <Route path="/playground/a11y" element={<A11yPage />} />
      <Route path="/playground/help-widget" element={<HelpWidgetPage />} />
      <Route path="/playground/terms" element={<TermsPage />} />
      <Route element={<Layout />}>
        <Route index element={<CatalogPage />} />
        <Route path="course/:courseId" element={<CoursePage />} />
        <Route path="module/:moduleSlug" element={<ModulePage />} />
        <Route path="learn/:moduleSlug/:lessonSlug" element={<LessonPage />} />
        <Route path="learn/:moduleSlug/:lessonSlug/:taskSlug" element={<TaskPage />} />
        <Route path="playground" element={<PlaygroundIndex />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="account" element={<YourAccountPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
