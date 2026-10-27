import { useCallback, useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { Badge, Empty, ErrorNote, Field, Modal, PageHead, fmt } from '../components/ui';

function Feedback({ iv, onClose, onDone }) {
  const [f, setF] = useState({ rating: 3, recommendation: 'maybe', comments: iv.feedback?.comments || '' });
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { await api.patch(`/interviews/${iv._id}/feedback`, { ...f, rating: Number(f.rating) }); onDone(); } catch (x) { setErr(errMsg(x)); }
  };
  return (
    <Modal title={`Feedback: ${iv.candidate?.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote msg={err} />
        <Field label="Rating (1–5)"><input className="input" type="number" min="1" max="5" required value={f.rating} onChange={(e) => setF({ ...f, rating: e.target.value })} /></Field>
        <Field label="Recommendation"><select className="input" value={f.recommendation} onChange={(e) => setF({ ...f, recommendation: e.target.value })}><option value="hire">Hire</option><option value="maybe">Maybe</option><option value="no_hire">Do not hire</option></select></Field>
        <Field label="Comments"><textarea className="input" rows={4} value={f.comments} onChange={(e) => setF({ ...f, comments: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary">Save feedback</button></div>
      </form>
    </Modal>
  );
}

export default function Interviews() {
  const { isStaff, user } = useAuth();
  const [list, setList] = useState(null);
  const [fb, setFb] = useState(null);
  const [note, setNote] = useState('');
  const load = useCallback(() => api.get('/interviews').then((r) => setList(r.data)), []);
  useEffect(() => { load(); }, [load]);

  const cancel = async (i) => { if (!confirm('Cancel this interview?')) return; try { await api.patch(`/interviews/${i._id}/cancel`); load(); } catch (e) { setNote(errMsg(e)); } };

  return (
    <>
      <PageHead title="Interviews" />
      <ErrorNote msg={note} />
      {!list ? <p className="text-slate-500">Loading interviews…</p> : list.length === 0 ? <Empty title="No interviews scheduled" hint={isStaff ? 'Schedule one from an application.' : 'You will see interviews here once they are scheduled.'} /> : (
        <div className="card divide-y divide-slate-100">
          {list.map((i) => {
            const canFeedback = isStaff && i.status !== 'cancelled' && (user.role === 'admin' || i.interviewer?._id === user.id);
            return (
              <div key={i._id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{i.job?.title} <span className="font-normal text-slate-500">with {isStaff ? i.candidate?.name : i.interviewer?.name}</span></p>
                  <p className="text-sm text-slate-500">{fmt(i.start)} to {new Date(i.end).toLocaleTimeString([], { timeStyle: 'short' })} · {i.mode}{isStaff && ` · interviewer ${i.interviewer?.name}`}</p>
                  {i.link && <p className="truncate text-sm text-pine-600">{i.link}</p>}
                  {isStaff && i.feedback?.rating && <p className="mt-1 text-sm">Rated {i.feedback.rating}/5, {i.feedback.recommendation?.replace('_', ' ')}. {i.feedback.comments}</p>}
                </div>
                <Badge value={i.status} />
                {canFeedback && <button className="btn-ghost" onClick={() => setFb(i)}>{i.feedback?.rating ? 'Edit feedback' : 'Add feedback'}</button>}
                {isStaff && i.status === 'scheduled' && <button className="btn-danger" onClick={() => cancel(i)}>Cancel</button>}
              </div>
            );
          })}
        </div>
      )}
      {fb && <Feedback iv={fb} onClose={() => setFb(null)} onDone={() => { setFb(null); load(); }} />}
    </>
  );
}
