import { Link } from "react-router-dom";

interface Tab {
  id: string;
  label: string;
  icon: string;
}

interface TopBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function TopBar({ tabs, activeTab, onTabChange }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-slate-900 text-white border-b border-dark-border shadow-lg">
      <div className="flex items-center justify-around md:justify-center md:space-x-8 px-2 py-2 md:py-3">
        {tabs.map((t) => (
          <Link
            key={t.id}
            to={`/${t.id}`}
            onClick={() => onTabChange(t.id)}
            className={`flex flex-col items-center p-1 md:p-2 min-w-0 transition-colors ${
              activeTab === t.id ? "text-cyan-400 font-bold" : "text-white/70 hover:text-white"
            }`}
          >
            <span className="text-xl md:text-2xl">{t.icon}</span>
            <span className="text-xs mt-1 truncate">{t.label}</span>
          </Link>
        ))}
      </div>
    </header>
  );
}
