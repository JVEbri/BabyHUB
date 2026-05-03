import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TopBar from "./components/TopBar";
import DashboardPage from "./pages/DashboardPage";
import CameraPage from "./pages/CameraPage";
import ButtonsPage from "./pages/ButtonsPage";
import InventoryPage from "./pages/InventoryPage";
import CalendarPage from "./pages/CalendarPage";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "cameras", label: "Cámaras", icon: "📷" },
  { id: "reminders", label: "Recordatorios", icon: "⏰" },
  { id: "inventory", label: "Stock", icon: "📦" },
  { id: "calendar", label: "Calendario", icon: "📅" },
];

const PATH_TO_TAB: Record<string, string> = {
  "/": "cameras",
  "/cameras": "cameras",
  "/reminders": "reminders",
  "/inventory": "inventory",
  "/calendar": "calendar",
  "/dashboard": "dashboard",
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(() => PATH_TO_TAB[location.pathname] || "cameras");

  useEffect(() => {
    const tabFromPath = PATH_TO_TAB[location.pathname];
    if (tabFromPath && tabFromPath !== tab) {
      setTab(tabFromPath);
    }
  }, [location.pathname]);

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    const path = newTab === "cameras" ? "/" : `/${newTab}`;
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text pt-14 md:pt-16">
      <TopBar tabs={TABS} activeTab={tab} onTabChange={handleTabChange} />

      <main className="container mx-auto px-2 md:px-4 py-4 md:py-6 pb-20 md:pb-6 pt-16 md:pt-20">
        {tab === "dashboard" && <DashboardPage />}
        {tab === "cameras" && <CameraPage />}
        {tab === "reminders" && <ButtonsPage />}
        {tab === "inventory" && <InventoryPage />}
        {tab === "calendar" && <CalendarPage />}
      </main>
    </div>
  );
}

export default App;
