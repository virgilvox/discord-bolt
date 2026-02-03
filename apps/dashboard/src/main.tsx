import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/guild/:id" element={<GuildDashboard />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

function Home() {
  const [user, setUser] = React.useState<any>(null);
  const [guilds, setGuilds] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch('/api/user')
      .then((res) => res.ok ? res.json() : null)
      .then(setUser);

    fetch('/api/guilds')
      .then((res) => res.ok ? res.json() : [])
      .then(setGuilds);
  }, []);

  if (!user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>FURLOW Dashboard</h1>
        <p>Please log in to manage your bot.</p>
        <a href="/auth/discord" style={{
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          background: '#5865F2',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          marginTop: '1rem'
        }}>
          Login with Discord
        </a>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>FURLOW Dashboard</h1>
        <div>
          <span>Welcome, {user.username}</span>
          <a href="/auth/logout" style={{ marginLeft: '1rem' }}>Logout</a>
        </div>
      </header>

      <h2>Your Servers</h2>
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {guilds.map((guild) => (
          <a
            key={guild.id}
            href={`/guild/${guild.id}`}
            style={{
              padding: '1rem',
              background: '#2f3136',
              borderRadius: '8px',
              textDecoration: 'none',
              color: 'white'
            }}
          >
            <img
              src={guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : '/default-server.png'}
              alt=""
              style={{ width: '48px', height: '48px', borderRadius: '50%' }}
            />
            <h3>{guild.name}</h3>
          </a>
        ))}
      </div>
    </div>
  );
}

function GuildDashboard() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Guild Dashboard</h1>
      <p>Configure your bot settings here.</p>
    </div>
  );
}

function Login() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Login Required</h1>
      <a href="/auth/discord">Login with Discord</a>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
