import { NavLink, Outlet } from "react-router-dom";

const TABS = [
  { to: "/vocab", zh: "單字", cz: "Slovíčka" },
  { to: "/grammar", zh: "文法", cz: "Gramatika" },
  { to: "/practice", zh: "練習", cz: "Cvičení" },
  { to: "/me", zh: "我的", cz: "Já" },
];

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-full max-w-app flex-col">
      <main className="flex-1 px-4 pb-28 pt-4">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-[var(--rule)] bg-[var(--paper-2)]">
        <ul className="mx-auto flex max-w-app">
          {TABS.map((t) => (
            <li key={t.to} className="flex-1">
              <NavLink
                to={t.to}
                className={({ isActive }) =>
                  `hit flex flex-col items-center justify-center gap-0.5 py-2 ${
                    isActive ? "text-[var(--ink)]" : "text-[var(--ink-soft)]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="text-sm font-semibold">{t.zh}</span>
                    <span className="tag-mono">{t.cz}</span>
                    <span
                      className={`h-0.5 w-6 ${isActive ? "bg-[var(--ink)]" : "bg-transparent"}`}
                    />
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
}: {
  title: string;
  subtitle?: string;
  back?: () => void;
}) {
  return (
    <header className="mb-4 border-b border-[var(--rule)] pb-3">
      {back && (
        <button type="button" onClick={back} className="tag-mono mb-1 text-[var(--ink-soft)]">
          ← 返回
        </button>
      )}
      <h1 className="font-narrow text-2xl font-bold">{title}</h1>
      {subtitle && <p className="text-sm text-[var(--ink-soft)]">{subtitle}</p>}
    </header>
  );
}
