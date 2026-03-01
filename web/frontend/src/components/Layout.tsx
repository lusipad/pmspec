import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConnectionStatus } from './ConnectionStatus';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSelector } from './LanguageSelector';

export function Layout() {
  const { t } = useTranslation();

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 transition-colors dark:from-[#111214] dark:to-[#1A1C1F]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#111214]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">PMSpec</h1>
              <ConnectionStatus />
            </div>
            <nav className="flex items-center space-x-3">
              <NavLink
                to="/dashboard"
                className={navClass}
              >
                {t('nav.dashboard')}
              </NavLink>
              <NavLink
                to="/plan/new"
                className={navClass}
              >
                🧭 {t('nav.quickPlan')}
              </NavLink>
              <NavLink
                to="/kanban"
                className={navClass}
              >
                {t('nav.kanban')}
              </NavLink>
              <NavLink
                to="/gantt"
                className={navClass}
              >
                {t('nav.gantt')}
              </NavLink>
              <NavLink
                to="/integrations"
                className={navClass}
              >
                🔌 {t('nav.integrations')}
              </NavLink>
              <details className="relative">
                <summary className="list-none cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white">
                  {t('nav.more')}
                </summary>
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-black/10 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-[#1C1C1E]">
                  <Link
                    to="/features"
                    className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                  >
                    {t('nav.features')}
                  </Link>
                  <Link
                    to="/epics"
                    className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                  >
                    {t('nav.epics')}
                  </Link>
                  <Link
                    to="/milestones"
                    className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                  >
                    {t('nav.milestones')}
                  </Link>
                  <Link
                    to="/import"
                    className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                  >
                    📥 {t('nav.import')}
                  </Link>
                  <Link
                    to="/ai"
                    className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                  >
                    🤖 {t('nav.aiAssistant')}
                  </Link>
                </div>
              </details>
              <div className="flex items-center gap-2 ml-4 pl-4 border-l dark:border-gray-600">
                <LanguageSelector />
                <ThemeToggle />
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
