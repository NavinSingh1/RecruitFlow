import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { Badge, Empty, ErrorNote, Field, Modal, PageHead } from '../components/ui';

const TYPES = ['full-time', 'part-time', 'contract', 'internship'];
const blank = { title: '', description: '', location: '', type: 'full-time', skills: '', salary: '', status: 'draft' };

function JobForm({ job, onClose, onSaved }) {
  const [f, setF] = useState(job ? { ...job, skills: (job.skills || []).join(', '), salary: job.salary || '' } : blank);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    const body = { ...f, skills: f.skills.split(',').map((s) => s.trim()).filter(Boolean) };
    try { job ? await api.put(`/jobs/${job._id}`, body) : await api.post('/jobs', body); onSaved(); } catch (x) { setErr(errMsg(x)); }
  };
  return (
    <Modal title={job ? 'Edit job' : 'New job'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote msg={err} />
        <Field label="Title"><input className="input" required value={f.title} onChange={set('title')} /></Field>
        <Field label="Description"><textarea className="input" rows={5} required value={f.description} onChange={set('description')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location"><input className="input" required value={f.location} onChange={set('location')} /></Field>
          <Field label="Type"><select className="input" value={f.type} onChange={set('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Skills (comma separated)"><input className="input" value={f.skills} onChange={set('skills')} /></Field>
          <Field label="Salary range"><input className="input" value={f.salary} onChange={set('salary')} /></Field>
        </div>
        <Field label="Status"><select className="input" value={f.status} onChange={set('status')}><option>draft</option><option>published</option><option>closed</option></select></Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">Save job</button></div>
      </form>
    </Modal>
  );
}

function ApplyForm({ job, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [cover, setCover] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (!file) return setErr('Please attach your resume');
    const fd = new FormData();
    fd.append('job', job._id); fd.append('coverLetter', cover); fd.append('resume', file);
    setBusy(true);
    try { await api.post('/applications', fd); onDone(); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  return (
    <Modal title={`Apply: ${job.title}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote msg={err} />
        <Field label="Resume (PDF, DOC or DOCX, up to 5 MB)"><input className="input" type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files[0])} /></Field>
        <Field label="Cover letter (optional)"><textarea className="input" rows={4} value={cover} onChange={(e) => setCover(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit application'}</button></div>
      </form>
    </Modal>
  );
}

export default function Jobs() {
  const { isStaff, user } = useAuth();
  const [jobs, setJobs] = useState(null);
  const [q, setQ] = useState({ q: '', type: '', location: '', status: '' });
  const [edit, setEdit] = useState(null);   // job | 'new'
  const [apply, setApply] = useState(null);
  const [note, setNote] = useState('');

  const load = useCallback(() => {
    const params = Object.fromEntries(Object.entries(q).filter(([, v]) => v));
    api.get('/jobs', { params }).then((r) => setJobs(r.data));
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]); // debounce typing

  const setStatus = async (j, status) => { try { await api.patch(`/jobs/${j._id}/status`, { status }); load(); } catch (e) { setNote(errMsg(e)); } };
  const remove = async (j) => { if (!confirm(`Delete "${j.title}"?`)) return; try { await api.delete(`/jobs/${j._id}`); load(); } catch (e) { setNote(errMsg(e)); } };

  return (
    <>
      <PageHead title={isStaff ? 'Jobs' : 'Open jobs'}>{isStaff && <button className="btn-primary" onClick={() => setEdit('new')}>New job</button>}</PageHead>
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input className="input" placeholder="Search title, skill or keyword" value={q.q} onChange={(e) => setQ({ ...q, q: e.target.value })} aria-label="Search" />
        <input className="input" placeholder="Location" value={q.location} onChange={(e) => setQ({ ...q, location: e.target.value })} aria-label="Location" />
        <select className="input" value={q.type} onChange={(e) => setQ({ ...q, type: e.target.value })} aria-label="Job type"><option value="">All types</option>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        {isStaff && <select className="input" value={q.status} onChange={(e) => setQ({ ...q, status: e.target.value })} aria-label="Status"><option value="">All statuses</option><option>draft</option><option>published</option><option>closed</option></select>}
      </div>
      <ErrorNote msg={note} />
      {!jobs ? <p className="text-slate-500">Loading jobs…</p> : jobs.length === 0 ? <Empty title="No jobs match" hint={isStaff ? 'Create your first job to get started.' : 'Try a different search.'} /> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {jobs.map((j) => (
            <article key={j._id} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div><h3 className="font-bold">{j.title}</h3><p className="text-sm text-slate-500">{!isStaff && `${j.organization?.name} · `}{j.location} · {j.type}</p></div>
                {isStaff && <Badge value={j.status} />}
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-slate-700">{j.description}</p>
              {j.skills?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{j.skills.map((s) => <span key={s} className="rounded bg-pine-50 px-2 py-0.5 text-xs text-pine-700">{s}</span>)}</div>}
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                {isStaff ? (<>
                  <span className="mr-auto text-sm text-slate-500">{j.applicationCount} applicant{j.applicationCount === 1 ? '' : 's'}</span>
                  <button className="btn-ghost" onClick={() => setEdit(j)}>Edit</button>
                  {j.status !== 'published' && <button className="btn-primary" onClick={() => setStatus(j, 'published')}>Publish</button>}
                  {j.status === 'published' && <button className="btn-ghost" onClick={() => setStatus(j, 'closed')}>Close</button>}
                  {user.role === 'admin' && <button className="btn-danger" onClick={() => remove(j)}>Delete</button>}
                </>) : (<>
                  <span className="mr-auto text-sm text-slate-500">{j.salary}</span>
                  {j.applied ? <Badge value="applied" /> : <button className="btn-primary" onClick={() => setApply(j)}>Apply</button>}
                </>)}
              </div>
            </article>
          ))}
        </div>
      )}
      {edit && <JobForm job={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {apply && <ApplyForm job={apply} onClose={() => setApply(null)} onDone={() => { setApply(null); load(); }} />}
    </>
  );
}
