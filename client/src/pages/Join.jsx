import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LIMITS } from '../constants';

export default function Join({ socket, connected }) {
  const { code } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(null);

  const inviteCode = (code || '').toUpperCase().slice(0, 8);

  useEffect(() => {
    if (!inviteCode) {
      navigate('/', { replace: true });
      return;
    }
    fetch(`${import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3001`}/api/game/${inviteCode}`)
      .then((r) => r.json())
      .then((data) => setInfo(data))
      .catch(() => setInfo({ valid: false }));
  }, [inviteCode, navigate]);

  const join = (e) => {
    e.preventDefault();
    if (!name.trim() || !socket || !connected) return;
    setError('');
    setLoading(true);
    socket.emit('join', { inviteCode, name: name.trim() });
  };

  useEffect(() => {
    if (!socket) return;
    const onJoined = ({ game: g }) => navigate(`/play/${inviteCode}`, { replace: true, state: g ? { game: g } : undefined });
    const onError = ({ message }) => { setError(message); setLoading(false); };
    socket.on('joined', onJoined);
    socket.on('error', onError);
    return () => {
      socket.off('joined', onJoined);
      socket.off('error', onError);
    };
  }, [socket, inviteCode, navigate]);

  return (
    <>
      <h1 className="page-title">Join game</h1>
      <p className="page-sub">Code: {inviteCode}</p>

      {info === null && <div className="card"><p className="text-muted text-center">Checking invite…</p></div>}
      {info?.valid === false && (
        <div className="card">
          <p className="text-muted text-center">Invalid or expired invite code.</p>
          <button className="mt-2" style={{ width: '100%' }} onClick={() => navigate('/')}>Back home</button>
        </div>
      )}
      {info?.valid && !info?.canJoin && (
        <div className="card">
          <p className="text-muted text-center">This game is full or already started.</p>
          <button className="mt-2" style={{ width: '100%' }} onClick={() => navigate('/')}>Back home</button>
        </div>
      )}
      {info?.valid && info?.canJoin && connected && (
        <div className="card">
          {info.hostName && <p className="text-muted text-center mb-2">Host: {info.hostName} · {info.playerCount} player(s)</p>}
          <form onSubmit={join}>
            <label className="label">Your name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nickname" required maxLength={LIMITS.NAME_MAX_LENGTH} />
            {error && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
            <button type="submit" className="mt-2" style={{ width: '100%' }} disabled={loading}>Join</button>
          </form>
        </div>
      )}
      {info?.valid && info?.canJoin && !connected && (
        <div className="card"><p className="text-muted text-center">Connecting…</p></div>
      )}
    </>
  );
}
