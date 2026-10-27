import { useEffect } from 'react';

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92vh] w-full overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl sm:rounded-xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Field = ({ label, children }) => (<div><label className="label">{label}</label>{children}</div>);

const TONES = {
  published: 'bg-emerald-50 text-emerald-700', draft: 'bg-slate-100 text-slate-600', closed: 'bg-red-50 text-red-700',
  applied: 'bg-sky-50 text-sky-700', shortlisted: 'bg-indigo-50 text-indigo-700', interview: 'bg-amber-500/15 text-amber-700',
  offered: 'bg-violet-50 text-violet-700', hired: 'bg-emerald-50 text-emerald-700', rejected: 'bg-red-50 text-red-700',
  scheduled: 'bg-sky-50 text-sky-700', completed: 'bg-emerald-50 text-emerald-700', cancelled: 'bg-slate-100 text-slate-500',
};
export const Badge = ({ value }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${TONES[value] || 'bg-slate-100'}`}>{value}</span>
);

export const Empty = ({ title, hint }) => (
  <div className="card p-8 text-center"><p className="font-semibold">{title}</p>{hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}</div>
);
export const ErrorNote = ({ msg }) => msg ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p> : null;
export const PageHead = ({ title, children }) => (
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">{title}</h1><div className="flex gap-2">{children}</div></div>
);
export const fmt = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
