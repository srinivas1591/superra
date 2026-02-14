import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LIMITS } from '../constants';

export default function Home({ socket, connected }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!socket) return;
    const onJoined = ({ inviteCode, game: g }) => {
      setLoading(false);
      navigate(`/play/${inviteCode}`, { replace: true, state: g ? { game: g } : undefined });
    };
    const onError = ({ message }) => {
      setError(message);
      setLoading(false);
    };
    socket.on('joined', onJoined);
    socket.on('error', onError);
    return () => {
      socket.off('joined', onJoined);
      socket.off('error', onError);
    };
  }, [socket, navigate]);

  const createGame = (e) => {
    e.preventDefault();
    if (!name.trim() || !socket || !connected) return;
    setError('');
    setLoading(true);
    const inviteCode = code.trim().toUpperCase().slice(0, 8) || Math.random().toString(36).slice(2, 8).toUpperCase();
    socket.emit('create', { inviteCode, name: name.trim() });
  };

  const joinGame = (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !socket || !connected) return;
    setError('');
    setLoading(true);
    socket.emit('join', { inviteCode: code.trim().toUpperCase(), name: name.trim() });
  };

  return (
    <>
      <h1 className="page-title">Super Ra</h1>
      <p className="page-sub">Word game · 3–15 players</p>

      {!connected && (
        <div className="card">
          <p className="text-muted text-center">Connecting to server…</p>
        </div>
      )}

      {connected && !mode && (
        <div className="card">
          <p className="label">How do you want to play?</p>
          <div className="flex gap-2 mt-2">
            <button className="flex-1" onClick={() => setMode('create')}>Create game</button>
            <button className="flex-1 secondary" onClick={() => setMode('join')}>Join with code</button>
          </div>
        </div>
      )}

      {connected && mode === 'create' && (
        <div className="card">
          <form onSubmit={createGame}>
            <label className="label">Your name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nickname" required maxLength={LIMITS.NAME_MAX_LENGTH} />
            <label className="label mt-2">Invite code (optional)</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. ABC12" maxLength={8} />
            <p className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>Leave blank for a random code. Share the link with friends.</p>
            {error && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
            <button type="submit" className="mt-2" style={{ width: '100%' }} disabled={loading}>Create & get link</button>
          </form>
          <button type="button" className="secondary mt-2" style={{ width: '100%' }} onClick={() => { setMode(null); setError(''); }}>Back</button>
        </div>
      )}

      {connected && mode === 'join' && (
        <div className="card">
          <form onSubmit={joinGame}>
            <label className="label">Your name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nickname" required maxLength={LIMITS.NAME_MAX_LENGTH} />
            <label className="label mt-2">Invite code</label>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="From host's link" required maxLength={8} />
            {error && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
            <button type="submit" className="mt-2" style={{ width: '100%' }} disabled={loading}>Join game</button>
          </form>
          <button type="button" className="secondary mt-2" style={{ width: '100%' }} onClick={() => { setMode(null); setError(''); }}>Back</button>
        </div>
      )}
    </>
  );
}
