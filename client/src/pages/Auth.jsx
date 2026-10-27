import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { errMsg } from '../api';
import { ErrorNote, Field } from '../components/ui';

function Shell({ title, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-pine-800 p-10 text-white lg:flex">
        <span className="text-xl font-bold">RecruitFlow</span>
        <div>
          <h2 className="max-w-md text-4xl font-bold leading-tight">Every role, applicant and interview in one place.</h2>
          <p className="mt-3 max-w-md text-pine-100">Post jobs, review resumes, and schedule interviews without double-booking anyone.</p>
        </div>
        <span className="text-sm text-pine-100">Demo logins are in the README.</span>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="mb-6 text-2xl font-bold">{title}</h1>
          {children}
          <p className="mt-5 text-sm text-slate-600">{footer}</p>
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login(f); nav('/'); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  const fill = (email, password) => setF({ email, password });
  return (
    <Shell title="Sign in" footer={<>New here? <Link className="font-semibold text-pine-600" to="/register">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote msg={err} />
        <Field label="Email"><input className="input" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password"><input className="input" type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="mt-5 rounded-md border border-dashed border-slate-300 p-3 text-xs text-slate-600">
        <p className="mb-2 font-semibold">Demo accounts (after running the seed)</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={() => fill('admin@recruitflow.com', 'Admin@123')}>Admin</button>
          <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={() => fill('recruiter@recruitflow.com', 'Recruiter@123')}>Recruiter</button>
          <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={() => fill('candidate@recruitflow.com', 'Candidate@123')}>Candidate</button>
        </div>
      </div>
    </Shell>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'candidate', organizationName: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await register(f); nav('/'); } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };
  return (
    <Shell title="Create your account" footer={<>Already registered? <Link className="font-semibold text-pine-600" to="/login">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote msg={err} />
        <Field label="I am">
          <select className="input" value={f.role} onChange={set('role')}>
            <option value="candidate">Looking for a job</option>
            <option value="admin">Hiring for a company</option>
          </select>
        </Field>
        {f.role === 'admin' && <Field label="Company name"><input className="input" required value={f.organizationName} onChange={set('organizationName')} /></Field>}
        <Field label="Full name"><input className="input" required value={f.name} onChange={set('name')} /></Field>
        <Field label="Email"><input className="input" type="email" required value={f.email} onChange={set('email')} /></Field>
        <Field label="Password (8+ characters)"><input className="input" type="password" minLength={8} required value={f.password} onChange={set('password')} /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>
    </Shell>
  );
}
