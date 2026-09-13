import { NavLink, Outlet } from "react-router-dom";

const TABS = [
  { to: "/vocab", zh: "單字", cz: "Slovíčka" },
  { to: "/grammar", zh: "文法", cz: "Gramatika" },
  { to: "/practice", zh: "練習", cz: "Cvičení" },
  { to: "/me", zh: "我的", cz: "Já" },
];

export function AppShell() {
  return (
    <div className="mx-auto min-h-full max-w-app">
      {/* 底部固定，內容要留出它的高度＋ iOS 安全區，捲動時不會被蓋住 */}
      <main className="px-4 pt-4" style={{ paddingBottom: "calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px) + 1rem)" }}>
        <Outlet />
      </main>

      <nav
        aria-label="主要分頁"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--rule)] bg-[var(--paper-2)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="mx-auto flex max-w-app">
          {TABS.map((t) => (
            <li key={t.to} className="flex-1">
              <NavLink
                to={t.to}
                className={({ isActive }) =>
                  `relative flex h-14 flex-col items-center justify-center gap-0.5 ${
                    isActive ? "text-[var(--ink)]" : "text-[var(--ink-soft)]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* 指示線畫在分頁頂緣，不佔行高，四個分頁高度才會一致 */}
                    <span
                      aria-hidden
                      className={`absolute inset-x-0 top-0 h-0.5 ${
                        isActive ? "bg-[var(--ink)]" : "bg-transparent"
                      }`}
                    />
                    <span className={`text-sm leading-none ${isActive ? "font-semibold" : ""}`}>
                      {t.zh}
                    </span>
                    <span className="tag-mono leading-none">{t.cz}</span>
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
