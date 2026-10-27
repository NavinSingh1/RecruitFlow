import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { Badge, Empty, ErrorNote, Field, Modal, PageHead, fmt } from '../components/ui';

const STATUSES = ['applied', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'];

function Schedule({ app, onClose, onDone }) {
  const [team, setTeam] = useState([]);
  const [f, setF] = useState({ interviewer: '', start: '', end: '', mode: 'video', link: '' });
  const [err, setErr] = useState('');
  useEffect(() => { api.get('/users').then((r) => setTeam(r.data)); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try {
      await api.post('/interviews', { ...f, application: app._id, start: new Date(f.start).toISOString(), end: new Date(f.end).toISOString() });
      onDone();
    } catch (x) { setErr(errMsg(x)); }
  };
  return (
    <Modal title={`Schedule interview: ${app.candidate?.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote msg={err} />
        <Field label="Interviewer"><select className="input" required value={f.interviewer} onChange={set('interviewer')}><option value="">Choose…</option>{team.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.role})</option>)}</select></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts"><input className="input" type="datetime-local" required value={f.start} onChange={set('start')} /></Field>
          <Field label="Ends"><input className="input" type="datetime-local" required value={f.end} onChange={set('end')} /></Field>
        </div>
        <Field label="Format"><select className="input" value={f.mode} onChange={set('mode')}><option value="video">Video call</option><option value="phone">Phone</option><option value="onsite">On-site</option></select></Field>
        <Field label="Meeting link or location"><input className="input" value={f.link} onChange={set('link')} /></Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">Schedule</button></div>
      </form>
    </Modal>
  );
}

export default function Applications() {
  const { isStaff } = useAuth();
  const [apps, setApps] = useState(null);
  const [status, setStatus] = useState('');
  const [sched, setSched] = useState(null);
  const [note, setNote] = useState('');

  const load = useCallback(() => api.get('/applications', { params: status ? { status } : {} }).then((r) => setApps(r.data)), [status]);
  useEffect(() => { load(); }, [load]);

  const change = async (a, s) => { try { await api.patch(`/applications/${a._id}/status`, { status: s }); load(); } catch (e) { setNote(errMsg(e)); } };
  const resume = async (a) => {
    try {
      const r = await api.get(`/applications/${a._id}/resume`, { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      Object.assign(document.createElement('a'), { href: url, download: a.resume?.originalName || 'resume' }).click();
      URL.revokeObjectURL(url);
    } catch (e) { setNote('Could not download the resume.'); }
  };

  return (
    <>
      <PageHead title={isStaff ? 'Applications' : 'My applications'}>
        <select className="input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
      </PageHead>
      <ErrorNote msg={note} />
      {!apps ? <p className="text-slate-500">Loading applications…</p> : apps.length === 0 ? <Empty title="No applications yet" hint={isStaff ? 'They appear here as candidates apply.' : 'Browse open jobs and apply to get started.'} /> : (
        <div className="card divide-y divide-slate-100">
          {apps.map((a) => (
            <div key={a._id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{isStaff ? a.candidate?.name : a.job?.title}</p>
                <p className="truncate text-sm text-slate-500">{isStaff ? `${a.candidate?.email} · ${a.job?.title}` : a.job?.location} · applied {fmt(a.createdAt)}</p>
              </div>
              {isStaff ? (<>
                <select className="input !w-auto" value={a.status} onChange={(e) => change(a, e.target.value)} aria-label="Status">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                <button className="btn-ghost" onClick={() => resume(a)}>Resume</button>
                <button className="btn-primary" onClick={() => setSched(a)}>Schedule</button>
              </>) : (<><Badge value={a.status} /><button className="btn-ghost" onClick={() => resume(a)}>My resume</button></>)}
            </div>
          ))}
        </div>
      )}
      {sched && <Schedule app={sched} onClose={() => setSched(null)} onDone={() => { setSched(null); load(); }} />}
    </>
  );
}
