import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { Badge, ErrorNote, Field, Modal, PageHead } from '../components/ui';

export default function Team() {
  const [team, setTeam] = useState(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'recruiter' });
  const [err, setErr] = useState('');
  const load = () => api.get('/users').then((r) => setTeam(r.data));
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { await api.post('/users', f); setOpen(false); setF({ name: '', email: '', password: '', role: 'recruiter' }); load(); } catch (x) { setErr(errMsg(x)); }
  };
  return (
    <>
      <PageHead title="Team"><button className="btn-primary" onClick={() => setOpen(true)}>Add team member</button></PageHead>
      {!team ? <p className="text-slate-500">Loading team…</p> : (
        <div className="card divide-y divide-slate-100">
          {team.map((u) => (
            <div key={u._id} className="flex items-center justify-between gap-3 p-4"><div><p className="font-semibold">{u.name}</p><p className="text-sm text-slate-500">{u.email}</p></div><Badge value={u.role} /></div>
          ))}
        </div>
      )}
      {open && (
        <Modal title="Add team member" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <ErrorNote msg={err} />
            <Field label="Full name"><input className="input" required value={f.name} onChange={set('name')} /></Field>
            <Field label="Email"><input className="input" type="email" required value={f.email} onChange={set('email')} /></Field>
            <Field label="Temporary password (8+ characters)"><input className="input" type="password" minLength={8} required value={f.password} onChange={set('password')} /></Field>
            <Field label="Role"><select className="input" value={f.role} onChange={set('role')}><option value="recruiter">Recruiter</option><option value="admin">Admin</option></select></Field>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn-primary">Add member</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
