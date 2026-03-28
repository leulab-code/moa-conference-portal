import React, { useState } from 'react';
import { useApp } from '@/lib/app-context';
import { UserRole } from '@/lib/types';
import {
  Calendar,
  LayoutDashboard,
  Building2,
  PlusCircle,
  ClipboardList,
  Mail,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
  Bell,
  Home,
  Monitor,
  UtensilsCrossed,
  Users,
  Star
} from 'lucide-react';
import { Link } from 'react-router-dom';
import moaLogo from '@/assets/moa-logo.png';

const roleLabels: Record<UserRole, string> = {
  organizer: 'Event Organizer',
  event_management: 'Event Management',
  ict_admin: 'ICT / Sys Admin',
  catering_support: 'Catering & Support',
  admin_finance: 'Admin & Finance',
  leadership: 'Ministry Leadership',
  system_admin: 'System Administrator',
};

interface NavItem {
  label: string;
  icon: React.ReactNode;
  id: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={20} />, id: 'dashboard', roles: ['event_management', 'admin_finance', 'leadership', 'system_admin'] },
  { label: 'Calendar', icon: <Calendar size={20} />, id: 'calendar', roles: ['organizer', 'event_management', 'ict_admin', 'catering_support', 'admin_finance', 'leadership', 'system_admin'] },
  { label: 'Venues', icon: <Building2 size={20} />, id: 'venues', roles: ['organizer', 'event_management', 'ict_admin', 'catering_support', 'admin_finance', 'leadership', 'system_admin'] },
  { label: 'Venue Operations', icon: <ShieldCheck size={20} />, id: 'venue-operations', roles: ['event_management', 'system_admin'] },
  { label: 'My Bookings', icon: <ClipboardList size={20} />, id: 'my-bookings', roles: ['organizer', 'leadership'] },
  { label: 'VIP Override Booking', icon: <Star size={20} />, id: 'vip-booking', roles: ['event_management', 'leadership', 'system_admin'] },
  { label: 'Manage Bookings', icon: <ShieldCheck size={20} />, id: 'manage-bookings', roles: ['event_management', 'system_admin'] },
  { label: 'Manage Services', icon: <Zap size={20} />, id: 'manage-services', roles: ['event_management', 'admin_finance', 'leadership','system_admin'] },
  { label: 'Technical Tasks', icon: <Monitor size={20} />, id: 'technical-tasks', roles: ['ict_admin'] },
  { label: 'Catering Tasks', icon: <UtensilsCrossed size={20} />, id: 'catering-tasks', roles: ['catering_support'] },
  { label: 'Message Center', icon: <Mail size={20} />, id: 'message-center', roles: ['system_admin'] },
  { label: 'User Management', icon: <Users size={20} />, id: 'user-management', roles: ['system_admin'] },
];

interface AppShellProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
}

export default function AppShell({ currentPage, onNavigate, children }: AppShellProps) {
  const { role, user, logout, token } = useApp();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNav = navItems.filter(item => {
    if (!token && item.id === 'my-bookings') return false;
    return item.roles.includes(role);
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      
      {/* Floating Modern Sidebar */}
      <aside
        className={`flex flex-col bg-[#112a1f] text-white shadow-2xl transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] z-50 ${
          collapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Logo area */}
        <div className="flex items-center gap-4 px-6 py-8 border-b border-white/10">
          <div className="flex items-center justify-center w-12 h-12 shrink-0">
            <img src={moaLogo} alt="MoA Logo" className="w-full h-full object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
              <p className="text-base font-serif font-bold tracking-wide text-white">MoA Portal</p>
              <p className="text-[10px] font-bold tracking-[0.2em] text-[#8cbaa2] uppercase">Conference System</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 space-y-2 px-4 overflow-y-auto custom-scrollbar">
          {!collapsed && (
            <p className="text-[10px] font-bold tracking-widest text-[#5c8b74] uppercase mb-4 px-2">Menu</p>
          )}
          {filteredNav.map(item => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-[#1b4332] text-white shadow-inner border border-white/5'
                    : 'text-[#a3c4b3] hover:bg-white/5 hover:text-white'
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && !collapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#2ed18a] rounded-r-full shadow-[0_0_10px_#2ed18a]" />
                )}
                
                <div className={`${isActive ? 'text-[#2ed18a]' : 'text-[#8cbaa2] group-hover:text-[#2ed18a]'} transition-colors ml-1`}>
                  {item.icon}
                </div>
                {!collapsed && <span className="font-semibold text-sm">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Role switcher (Bottom profile block) */}
        {!collapsed && token && user && (
          <div className="px-6 py-6 border-t border-white/10 bg-black/20">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm border border-white/20 uppercase">
                 {user.name?.charAt(0) || 'U'}
               </div>
               <div className="min-w-0">
                 <p className="text-sm font-bold truncate text-white">{user.name}</p>
                 <p className="text-xs text-[#8cbaa2] truncate">{user.email}</p>
               </div>
            </div>
            
            <div className="w-full text-xs font-bold text-[#b4d1c3] bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-center truncate">
              {roleLabels[user.role as UserRole] || user.role}
            </div>
          </div>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center py-4 border-t border-white/10 bg-[#0d2218] text-[#8cbaa2] hover:text-white hover:bg-black/40 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : 
            <div className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
              <ChevronLeft size={16} /> Collapse
            </div>
          }
        </button>
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header Bar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-40 sticky top-0">
          <div className="flex items-center gap-4">
             <h2 className="text-lg font-bold text-slate-800 tracking-tight font-serif hidden sm:block">
               {navItems.find(n => n.id === currentPage)?.label || 'Conference Center'}
             </h2>
          </div>
          <div className="flex items-center gap-4">
             {token && (
               <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-500 transition-colors relative">
                 <Bell size={20} />
                 <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border-2 border-white"></span>
               </button>
             )}
             <Link 
               to="/"
               className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-slate-100 text-slate-600 font-bold text-sm transition-colors"
             >
               <Home size={16} /> <span className="hidden sm:inline">Portal Home</span>
             </Link>
             
             {token ? (
               <button onClick={logout} className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-red-50 text-slate-600 hover:text-red-600 font-bold text-sm transition-colors">
                 <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
               </button>
             ) : (
               <Link to="/login" className="flex items-center gap-2 px-6 py-2 rounded-full bg-[#268053] hover:bg-[#1b4332] text-white font-bold text-sm transition-colors shadow-md">
                 Log In to Book
               </Link>
             )}
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc] p-4 sm:p-8 lg:p-10" id="main-scroll-container">
          <div className="max-w-[1400px] mx-auto 2xl:max-w-[1600px]">
             {children}
          </div>
        </div>
      </main>
    </div>
  );
}