import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Utensils, 
  Dumbbell, 
  LogOut, 
  Bell,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import ChatBox from './ChatBox';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Inicio', color: 'text-blue-500', bg: 'bg-blue-50' },
  { path: '/planner', icon: Calendar, label: 'Planificador', color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { path: '/nutrition', icon: Utensils, label: 'Nutrición', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { path: '/gym', icon: Dumbbell, label: 'Gimnasio', color: 'text-orange-500', bg: 'bg-orange-50' },
  { path: '/reminders', icon: Bell, label: 'Recordatorios', color: 'text-rose-500', bg: 'bg-rose-50' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col sticky top-0 h-screen shadow-sm">
        <div className="p-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">Tracker<span className="text-indigo-600">Pro</span></span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative overflow-hidden",
                  isActive 
                    ? "bg-indigo-50 text-indigo-700 font-semibold shadow-sm" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 w-1.5 h-8 bg-indigo-600 rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div className={cn(
                  "p-2 rounded-xl transition-colors",
                  isActive ? item.bg : "bg-transparent group-hover:bg-slate-100"
                )}>
                  <Icon className={cn("w-5 h-5", isActive ? item.color : "text-slate-400 group-hover:text-slate-600")} />
                </div>
                <span className="text-base tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <img 
              src={auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${auth.currentUser?.displayName}`} 
              alt="Profile" 
              className="w-10 h-10 rounded-xl border-2 border-white shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{auth.currentUser?.displayName}</p>
              <p className="text-xs text-slate-500 truncate">{auth.currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all font-medium group"
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-50 shadow-sm">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-slate-900">Tracker<span className="text-indigo-600">Pro</span></span>
        </Link>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="lg:hidden fixed inset-0 bg-white z-40 pt-20 px-6"
          >
            <nav className="space-y-4">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl text-lg font-medium transition-all",
                      isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600"
                    )}
                  >
                    <Icon className={cn("w-6 h-6", isActive ? item.color : "text-slate-400")} />
                    {item.label}
                  </Link>
                );
              })}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-4 p-4 text-slate-600 hover:text-red-600 transition-all text-lg font-medium"
              >
                <LogOut className="w-6 h-6" />
                Cerrar Sesión
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 pt-24 lg:pt-10 overflow-auto relative">
        <div className="max-w-7xl mx-auto pb-24">
          {children}
        </div>
        <ChatBox />
      </main>
    </div>
  );
}
