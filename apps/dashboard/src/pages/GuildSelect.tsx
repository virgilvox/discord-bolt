/**
 * Guild Selection Page
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { guildApi, userApi, type Guild, type User } from '../api/client';
import { Layout } from '../components/Layout';
import { useWebSocket } from '../hooks/useWebSocket';

export function GuildSelect() {
  const [user, setUser] = useState<User | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { botStatus } = useWebSocket();

  useEffect(() => {
    Promise.all([
      userApi.getUser().catch(() => null),
      guildApi.getGuilds().catch(() => []),
    ])
      .then(([userData, guildsData]) => {
        setUser(userData);
        setGuilds(guildsData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout user={null} botStatus={botStatus}>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: '#b9bbbe' }}>Loading...</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout user={null} botStatus={botStatus}>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <h1 style={{ color: '#fff', marginBottom: '1rem' }}>Welcome to FURLOW Dashboard</h1>
          <p style={{ color: '#b9bbbe', marginBottom: '2rem' }}>
            Please log in with Discord to manage your bot.
          </p>
          <a
            href="/auth/discord"
            style={{
              display: 'inline-block',
              padding: '1rem 2rem',
              background: '#5865F2',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '1.125rem',
            }}
          >
            Login with Discord
          </a>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} botStatus={botStatus}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ color: '#fff', marginBottom: '0.5rem' }}>Your Servers</h1>
        <p style={{ color: '#b9bbbe', marginBottom: '2rem' }}>
          Select a server to manage. You can only see servers where you have the Manage Server permission.
        </p>

        {error && (
          <div style={{
            background: 'rgba(240, 71, 71, 0.1)',
            border: '1px solid #f04747',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            color: '#f04747',
          }}>
            {error}
          </div>
        )}

        {guilds.length === 0 ? (
          <div style={{
            background: '#16213e',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
          }}>
            <p style={{ color: '#b9bbbe' }}>
              No servers found. Make sure you have the Manage Server permission in at least one server.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.5rem',
          }}>
            {guilds.map((guild) => (
              <GuildCard key={guild.id} guild={guild} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function GuildCard({ guild }: { guild: Guild }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={`/guild/${guild.id}`}
      style={{
        display: 'block',
        background: hovered ? '#1e2a4a' : '#16213e',
        borderRadius: '12px',
        overflow: 'hidden',
        textDecoration: 'none',
        transition: 'all 0.2s',
        transform: hovered ? 'translateY(-4px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(0, 0, 0, 0.3)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Banner/Icon area */}
      <div style={{
        height: '80px',
        background: guild.icon
          ? `url(https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=512) center/cover`
          : 'linear-gradient(135deg, #5865F2, #e94560)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.4)',
        }} />
      </div>

      {/* Guild Info */}
      <div style={{ padding: '1rem', position: 'relative' }}>
        {/* Guild Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#16213e',
          border: '4px solid #16213e',
          marginTop: '-48px',
          overflow: 'hidden',
        }}>
          {guild.icon ? (
            <img
              src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
              alt=""
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#5865F2',
              color: '#fff',
              fontSize: '1.5rem',
              fontWeight: 'bold',
            }}>
              {guild.name.charAt(0)}
            </div>
          )}
        </div>

        <h3 style={{
          color: '#fff',
          margin: '0.75rem 0 0.25rem',
          fontSize: '1.125rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {guild.name}
        </h3>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {guild.owner && (
            <span style={{
              fontSize: '0.75rem',
              padding: '0.125rem 0.5rem',
              background: 'rgba(250, 168, 26, 0.2)',
              color: '#faa81a',
              borderRadius: '4px',
            }}>
              Owner
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default GuildSelect;
