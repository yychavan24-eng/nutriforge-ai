import { Outlet, NavLink } from 'react-router-dom';
import { User, Scan, List, LayoutDashboard, History, RotateCw, HelpCircle, Activity } from 'lucide-react';

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="text-blue-500" />
            NutriForge AI
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItem to="/app" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem to="/app/profile" icon={<User size={20} />} label="Profile" />
          <NavItem to="/app/scan" icon={<Scan size={20} />} label="Label Scanner" />
          <NavItem to="/app/products" icon={<List size={20} />} label="Products" />
          <NavItem to="/app/compare" icon={<Activity size={20} />} label="Compare" />
          <NavItem to="/app/history" icon={<History size={20} />} label="History" />
          <NavItem to="/app/recheck" icon={<RotateCw size={20} />} label="Re-check" />
          <NavItem to="/app/assistant" icon={<HelpCircle size={20} />} label="Assistant" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header (simplified for demo) */}
        <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-blue-500" size={20} />
            NutriForge
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/app"}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
          isActive 
            ? 'bg-blue-600 text-white' 
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`
      }
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </NavLink>
  );
}
