import { Routes, Route } from 'react-router-dom';
import { useSocket } from './useSocket';
import Home from './pages/Home';
import Join from './pages/Join';
import Game from './pages/Game';

export default function App() {
  const { socket, connected } = useSocket();

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home socket={socket} connected={connected} />} />
        <Route path="/join/:code" element={<Join socket={socket} connected={connected} />} />
        <Route path="/play/:code" element={<Game socket={socket} connected={connected} />} />
      </Routes>
    </div>
  );
}
