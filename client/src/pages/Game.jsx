import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ROLE_LABELS, ROLE_KEYS, LIMITS } from '../constants';

const PHASES = {
  lobby: 'lobby',
  description: 'description',
  discussion: 'discussion',
  elimination: 'elimination',
  blank_guess: 'blank_guess',
  round_end: 'round_end',
  ended: 'ended',
};

export default function Game({ socket, connected }) {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [game, setGame] = useState(location.state?.game ?? null);
  const [isHost, setIsHost] = useState(false);
  const [myDescription, setMyDescription] = useState('');
  const [myVote, setMyVote] = useState(null);
  const [blankGuess, setBlankGuess] = useState('');
  const [error, setError] = useState('');

  const inviteCode = (code || '').toUpperCase();

  const storageKey = `superra_player_${inviteCode}`;

  useEffect(() => {
    if (!socket) return;
    const onJoined = ({ isHost: host, game: g }) => {
      setIsHost(host);
      setGame(g);
      setError('');
      if (g?.myPlayerId && typeof sessionStorage !== 'undefined') sessionStorage.setItem(storageKey, g.myPlayerId);
    };
    const onGame = (g) => {
      setGame(g);
      setError('');
      if (g?.myPlayerId && typeof sessionStorage !== 'undefined') sessionStorage.setItem(storageKey, g.myPlayerId);
    };
    const onError = ({ message }) => setError(message || 'Something went wrong');
    socket.on('joined', onJoined);
    socket.on('game', onGame);
    socket.on('error', onError);
    return () => {
      socket.off('joined', onJoined);
      socket.off('game', onGame);
      socket.off('error', onError);
    };
  }, [socket, storageKey]);

  useEffect(() => {
    if (!socket || !connected || !inviteCode) return;
    const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(storageKey) : null;
    if (stored && !game) {
      socket.emit('reconnect', { inviteCode, playerId: stored });
    }
  }, [socket, connected, inviteCode]);

  useEffect(() => {
    if (game?.myPlayerId && typeof sessionStorage !== 'undefined') sessionStorage.setItem(storageKey, game.myPlayerId);
  }, [game?.myPlayerId, storageKey]);

  useEffect(() => {
    if (!game) return;
    setMyVote(null);
    if (game.phase === PHASES.description) setMyDescription(game.descriptions?.[game.myPlayerId] ?? '');
    if (game.phase === PHASES.blank_guess) setBlankGuess('');
  }, [game?.phase, game?.round, game?.myPlayerId]);

  if (!inviteCode) {
    navigate('/', { replace: true });
    return null;
  }

  if (!connected) {
    return (
      <div className="card">
        <p className="text-muted text-center">Reconnecting…</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="card">
        <p className="text-muted text-center">Loading game…</p>
        <p className="text-muted text-center mt-2" style={{ fontSize: '0.9rem' }}>
          Refreshed? Re-join with the link below.
        </p>
        <button type="button" className="secondary mt-1" style={{ width: '100%' }} onClick={() => navigate(`/join/${inviteCode}`)}>
          Re-join game
        </button>
        <button className="secondary mt-2" style={{ width: '100%' }} onClick={() => navigate('/')}>Home</button>
      </div>
    );
  }

  const alivePlayers = game.players.filter((p) => !game.eliminated?.includes(p.id));
  const me = game.players.find((p) => p.id === game.myPlayerId);
  const myRole = game.myRole;
  const myWord = game.myWord;
  const isBlankEliminated = game.blankGuess?.playerId === game.myPlayerId;

  const shareLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${inviteCode}`;
  const amHost = isHost || game.hostId === game.myPlayerId;
  const isLobby = game.phase === PHASES.lobby;

  return (
    <div className={isLobby ? 'lobby-host' : ''}>
      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', marginBottom: 12 }}>
          <p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>
          <button type="button" className="secondary mt-1" style={{ fontSize: '0.875rem' }} onClick={() => setError('')}>Dismiss</button>
        </div>
      )}
      <div className="flex justify-between align-center mb-2">
        <h1 className="page-title" style={{ margin: 0, fontSize: '1.25rem' }}>Super Ra</h1>
        <span className="text-muted">Round {game.round}</span>
      </div>

      {game.phase === PHASES.lobby && (
        <>
          <div className="card">
            <p className="label">Invite link (share with friends)</p>
            <div className="flex gap-1">
              <input readOnly value={shareLink} style={{ fontSize: '0.85rem' }} />
              <button
                type="button"
                className="secondary"
                onClick={() => navigator.clipboard?.writeText(shareLink)}
              >
                Copy
              </button>
            </div>
            <p className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>Code: <strong>{inviteCode}</strong></p>
          </div>
          <div className="card">
            <p className="label">Players ({game.players.length} / 15)</p>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {game.players.map((p) => (
                <li key={p.id}>
                  {p.name} {p.id === game.hostId && '(host)'}
                </li>
              ))}
            </ul>
          </div>
          <div className="lobby-actions">
            <button
              style={{ width: '100%', padding: 14, maxWidth: '100%' }}
              disabled={!amHost || game.players.length < 3}
              onClick={() => amHost && socket.emit('start')}
            >
              {amHost
                ? `Start game (min 3 players)`
                : 'Waiting for host to start…'}
            </button>
          </div>
        </>
      )}

      {game.phase === PHASES.description && (
        <>
          <div className="card">
            <p className="text-muted">Your role: <strong>{ROLE_LABELS[myRole] ?? '—'}</strong></p>
            {myWord != null ? (
              <p>Your word: <strong style={{ fontSize: '1.2rem' }}>{myWord}</strong></p>
            ) : (
              <p className="text-muted">You have no word. Give a decoy clue so you blend in; listen to others. If eliminated, you get one guess at the Crew word.</p>
            )}
          </div>
          <div className="card">
            <p className="label">{myRole === ROLE_KEYS.BLANK ? 'Give a decoy clue (improvise so you blend in)' : 'Give a one-word (or short) clue'}</p>
            <input
              value={myDescription}
              onChange={(e) => setMyDescription(e.target.value)}
              placeholder={myRole === ROLE_KEYS.BLANK ? 'Any word that could fit…' : 'Your clue…'}
              maxLength={LIMITS.CLUE_MAX_LENGTH}
              aria-label="Clue"
            />
            <p className="text-muted mt-1" style={{ fontSize: '0.8rem' }}>{myDescription.length} / {LIMITS.CLUE_MAX_LENGTH} characters</p>
            <button
              className="mt-2"
              style={{ width: '100%' }}
              onClick={() => socket.emit('description', { text: myDescription })}
            >
              Submit
            </button>
          </div>
          <div className="card">
            <p className="label">Clues this round</p>
            {alivePlayers.map((p) => (
              <p key={p.id}>
                <strong>{p.name}</strong>: {game.descriptions?.[p.id] ?? '…'}
              </p>
            ))}
            {amHost && Object.keys(game.descriptions || {}).length >= alivePlayers.length && (
              <button className="mt-2" style={{ width: '100%' }} onClick={() => socket.emit('phase:discussion')}>
                Move to discussion
              </button>
            )}
          </div>
        </>
      )}

      {game.phase === PHASES.discussion && (
        <>
          <div className="card">
            <p className="label">Clues</p>
            {alivePlayers.map((p) => (
              <p key={p.id}><strong>{p.name}</strong>: {game.descriptions?.[p.id] ?? '—'}</p>
            ))}
          </div>
          {amHost && (
            <div className="card">
              <button style={{ width: '100%' }} onClick={() => socket.emit('phase:elimination')}>
                Start voting
              </button>
            </div>
          )}
        </>
      )}

      {game.phase === PHASES.elimination && (
        <>
          {alivePlayers.some((p) => p.id === game.myPlayerId) && (
          <div className="card">
            <p className="label">Vote who to eliminate</p>
            <div className="flex flex-wrap gap-1">
              {alivePlayers.filter((p) => p.id !== game.myPlayerId).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={myVote === p.id ? '' : 'secondary'}
                  onClick={() => {
                    setMyVote(p.id);
                    socket.emit('vote', { targetId: p.id });
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          )}
          {amHost && (
            <div className="card">
              <p className="text-muted">Votes: {Object.keys(game.votes || {}).length} / {alivePlayers.length}</p>
              <button
                style={{ width: '100%' }}
                disabled={Object.keys(game.votes || {}).length < alivePlayers.length}
                onClick={() => socket.emit('resolve')}
              >
                Resolve vote
              </button>
            </div>
          )}
        </>
      )}

      {game.phase === PHASES.blank_guess && (
        <>
          {isBlankEliminated ? (
            <div className="card">
              <p className="label">You were eliminated. Guess the Crew word to win!</p>
              <input
                value={blankGuess}
                onChange={(e) => setBlankGuess(e.target.value)}
                placeholder="Your guess…"
                maxLength={LIMITS.BLANK_GUESS_MAX_LENGTH}
                aria-label="Word guess"
              />
              <button
                className="mt-2"
                style={{ width: '100%' }}
                onClick={() => socket.emit('blankGuess', { guess: blankGuess })}
              >
                Submit guess
              </button>
            </div>
          ) : (
            <div className="card">
              <p className="text-muted">Waiting for eliminated player to guess the word…</p>
            </div>
          )}
        </>
      )}

      {game.phase === PHASES.round_end && (
        <div className="card">
          <p className="label">Round over. Someone was eliminated.</p>
          {amHost && (
            <button style={{ width: '100%' }} onClick={() => socket.emit('nextRound')}>
              Next round
            </button>
          )}
        </div>
      )}

      {game.phase === PHASES.ended && (
        <>
          <div className="card">
            <p className="page-title">Game over</p>
            <p className="text-muted">Winners: <strong>{ROLE_LABELS[game.winner] || game.winner}</strong></p>
            {game.wordPair && (
              <p className="text-muted">Words were: <strong>{game.wordPair[0]}</strong> / <strong>{game.wordPair[1]}</strong></p>
            )}
          </div>
          <div className="card">
            <p className="label">Scores</p>
            {[...game.players].sort((a, b) => (b.score || 0) - (a.score || 0)).map((p) => (
              <p key={p.id}>{p.name}: {p.score ?? 0}</p>
            ))}
          </div>
          <button className="secondary" style={{ width: '100%' }} onClick={() => navigate('/')}>
            Back home
          </button>
        </>
      )}

      <p className="text-muted text-center mt-2" style={{ fontSize: '0.75rem' }}>
        {me?.name} · {isHost ? 'Host' : 'Player'}
      </p>
    </div>
  );
}
