import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './app/Layout';
import { Dashboard } from './pages/Dashboard';
import { ModulePage } from './pages/ModulePage';
import { LessonPage } from './pages/LessonPage';
import { TaskPage } from './pages/TaskPage';
import { SettingsPage } from './pages/SettingsPage';
import { PlaygroundIndex } from './pages/PlaygroundIndex';
import { NotFound } from './pages/NotFound';
import { SignupPage } from './playground/SignupPage';
import { useSettings } from './features/progress/store';

export default function App() {
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <Routes>
      {/* Bug Playground pages are standalone (no app chrome) so they can be tested like a real site. */}
      <Route path="/playground/signup" element={<SignupPage />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="module/:moduleSlug" element={<ModulePage />} />
        <Route path="learn/:moduleSlug/:lessonSlug" element={<LessonPage />} />
        <Route path="learn/:moduleSlug/:lessonSlug/:taskSlug" element={<TaskPage />} />
        <Route path="playground" element={<PlaygroundIndex />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
