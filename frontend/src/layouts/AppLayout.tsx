import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import {
  User,
  Scan,
  List,
  LayoutDashboard,
  History,
  RotateCw,
  HelpCircle,
  Scale,
  Menu,
  X,
  Target,
  ArrowRight
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useProfile } from '../contexts/ProfileContext';

export default function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { profile } = useProfile();

  const navLinks = [
    { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/app/scan", icon: Scan, label: "Label Scanner" },
    { to: "/app/products", icon: List, label: "Product Catalog" },
    { to: "/app/compare", icon: Scale, label: "Smart Compare" },
    { to: "/app/profile", icon: User, label: "Fitness Profile" },
    { to: "/app/assistant", icon: HelpCircle, label: "Label Assistant" },
    { to: "/app/history", icon: History, label: "History" },
    { to: "/app/recheck", icon: RotateCw, label: "Re-check Formulation" },
  ];

  const goalLabels: Record<string, string> = {
    muscle_gain: "Muscle Gain",
    fat_loss: "Fat Loss",
    maintenance: "Maintenance",
    performance: "Athletic Performance"
  };

  return (
    <div className="flex h-screen bg-[#f6f4ee] text-[#171d18] font-sans overflow-hidden">

      {/* Desktop Deep Forest Green Sidebar */}
      <aside className="w-68 bg-[#122b1c] text-[#f5f8f5] flex-col hidden lg:flex border-r border-[#1a422b] shadow-health">
        {/* Brand Header */}
        <div className="p-6 border-b border-[#1a422b]/80">
          <Link to="/app" className="block focus-visible:ring-offset-2 focus-visible:ring-offset-[#122b1c]">
            <BrandLogo variant="dark" size="md" />
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
          <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold tracking-wider uppercase text-[#8ea891]">
            Packaged Intelligence
          </p>
          {navLinks.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              icon={<item.icon size={18} className="shrink-0 stroke-[2]" />}
              label={item.label}
              end={item.end}
            />
          ))}
        </nav>

        {/* Profile Card Footer */}
        <div className="p-4 border-t border-[#1a422b] bg-[#0c1f13]/60">
          <Link
            to="/app/profile"
            className="group flex items-center justify-between p-3 rounded-xl bg-[#183c27]/70 hover:bg-[#1a422b] border border-[#24593b]/60 transition-all"
          >
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5">
                <Target size={13} className="text-[#8ea891] shrink-0" />
                <span className="text-xs font-semibold text-white truncate">
                  {goalLabels[profile.goal] || profile.goal.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-[#8ea891] mt-0.5 truncate">
                {profile.daily_targets?.protein ? `${profile.daily_targets.protein}g protein goal` : 'Profile configured'}
              </p>
            </div>
            <ArrowRight size={14} className="text-[#8ea891] group-hover:text-white transition-transform group-hover:translate-x-0.5 shrink-0" />
          </Link>
        </div>
      </aside>

      {/* Main App Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top Header for Mobile & Tablet */}
        <header className="lg:hidden bg-[#122b1c] text-white px-4 py-3 flex items-center justify-between border-b border-[#1a422b] z-20">
          <BrandLogo variant="dark" size="sm" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-[#d2ded3] hover:text-white hover:bg-[#183c27] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8ea891]"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-30 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Drawer Panel */}
            <div className="relative w-72 max-w-[80vw] bg-[#122b1c] text-white h-full flex flex-col border-r border-[#1a422b] p-5 shadow-2xl z-40">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1a422b]">
                <BrandLogo variant="dark" size="sm" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-[#8ea891] hover:text-white hover:bg-[#183c27]"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto">
                {navLinks.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#1e4a31] text-white font-semibold border border-[#31744d]'
                          : 'text-[#d2ded3] hover:bg-[#183c27] hover:text-white'
                      }`
                    }
                  >
                    <item.icon size={18} className="shrink-0 stroke-[2]" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="pt-4 border-t border-[#1a422b]">
                <Link
                  to="/app/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#183c27] text-xs font-semibold text-white"
                >
                  <span>{goalLabels[profile.goal] || 'Fitness Profile'}</span>
                  <ArrowRight size={14} className="text-[#8ea891]" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Main Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label, end }: { to: string; icon: React.ReactNode; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${
          isActive
            ? 'bg-[#1b432a] text-[#f5f8f5] font-semibold shadow-xs border-l-[3px] border-[#8ea891] pl-[11px]'
            : 'text-[#cfded1] hover:bg-[#183c27]/70 hover:text-white font-medium'
        }`
      }
    >
      {icon}
      <span className="truncate">{label}</span>
    </NavLink>
  );
}
