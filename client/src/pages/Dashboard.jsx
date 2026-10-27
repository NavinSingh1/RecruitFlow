import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import { Badge, Empty, PageHead, fmt } from '../components/ui';

const Stat = ({ label, value, to }) => (
  <Link to={to} className="card block p-4 hover:border-pine-600">
    <p className="text-3xl font-bold text-pine-800">{value ?? 0}</p>
    <p className="mt-1 text-sm text-slate-600">{label}</p>
  </Link>
);

export default function Dashboard() {
  const { user, isStaff } = useAuth();
  const [d, setD] = useState(null);

  // "Real-time": refresh every 15 seconds and when the tab regains focus.
  useEffect(() => {
    const load = () => api.get('/dashboard').then((r) => setD(r.data)).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    window.addEventListener('focus', load);
    return () => { clearInterval(t); window.removeEventListener('focus', load); };
  }, []);

  if (!d) return <p className="text-slate-500">Loading dashboard…</p>;
  const sum = (o = {}) => Object.values(o).reduce((a, b) => a + b, 0);
  return (
    <>
      <PageHead title={`Welcome back, ${user.name.split(' ')[0]}`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isStaff && <Stat label="Published jobs" value={d.jobs?.published} to="/jobs" />}
        {isStaff && <Stat label="Draft jobs" value={d.jobs?.draft} to="/jobs" />}
        <Stat label={isStaff ? 'Total applications' : 'My applications'} value={sum(d.applications)} to="/applications" />
        <Stat label="In interview stage" value={d.applications.interview} to="/applications" />
        <Stat label="Upcoming interviews" value={d.upcomingCount} to="/interviews" />
        {isStaff && <Stat label="Offers made" value={d.applications.offered} to="/applications" />}
        {isStaff && <Stat label="Hired" value={d.applications.hired} to="/applications" />}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Next interviews</h2>
      {d.upcomingInterviews.length === 0 ? <Empty title="No upcoming interviews" hint={isStaff ? 'Schedule one from the Applications page.' : 'Interviews appear here once a recruiter schedules them.'} /> : (
        <div className="card divide-y divide-slate-100">
          {d.upcomingInterviews.map((i) => (
            <div key={i._id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <p className="font-semibold">{isStaff ? i.candidate?.name : i.job?.title}</p>
                <p className="text-sm text-slate-500">{isStaff ? i.job?.title : `with ${i.interviewer?.name}`}</p>
              </div>
              <p className="text-sm font-medium">{fmt(i.start)}</p>
            </div>
          ))}
        </div>
      )}
      <h2 className="mb-3 mt-8 text-lg font-bold">Applications by stage</h2>
      <div className="flex flex-wrap gap-2">
        {Object.entries(d.applications).length === 0 ? <span className="text-sm text-slate-500">Nothing yet.</span> :
          Object.entries(d.applications).map(([k, v]) => <span key={k} className="card flex items-center gap-2 px-3 py-1.5 text-sm"><Badge value={k} /> <b>{v}</b></span>)}
      </div>
    </>
  );
}
