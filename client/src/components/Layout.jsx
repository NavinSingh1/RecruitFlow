import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Layout() {
  const { user, logout, isStaff } = useAuth();
  const [open, setOpen] = useState(false);
  const links = [
    ['/', 'Dashboard'],
    ['/jobs', isStaff ? 'Jobs' : 'Browse jobs'],
    ['/applications', isStaff ? 'Applications' : 'My applications'],
    ['/interviews', 'Interviews'],
    ...(user.role === 'admin' ? [['/team', 'Team']] : []),
  ];
  const linkCls = ({ isActive }) =>
    `block rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-white/15 text-white' : 'text-pine-100 hover:bg-white/10'}`;

  return (
    <div className="min-h-screen lg:flex">
      <header className="flex items-center justify-between bg-pine-800 px-4 py-3 text-white lg:hidden">
        <span className="text-lg font-bold">RecruitFlow</span>
        <button className="btn bg-white/10" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle menu">Menu</button>
      </header>
      <aside className={`${open ? 'block' : 'hidden'} flex-col bg-pine-800 p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0`}>
        <div className="mb-6 hidden text-xl font-bold text-white lg:block">RecruitFlow</div>
        <nav className="space-y-1" onClick={() => setOpen(false)}>
          {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} className={linkCls}>{label}</NavLink>)}
        </nav>
        <div className="mt-6 border-t border-white/15 pt-4 text-sm text-pine-100 lg:mt-auto">
          <p className="font-semibold text-white">{user.name}</p>
          <p className="mb-3 capitalize">{user.role}</p>
          <button onClick={logout} className="btn w-full bg-white/10 text-white hover:bg-white/20">Sign out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  );
}
