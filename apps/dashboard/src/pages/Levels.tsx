/**
 * Levels Leaderboard Page
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { levelingApi, guildApi, userApi, type Guild, type User, type LeaderboardResponse } from '../api/client';
import { Layout } from '../components/Layout';
import { useGuildWebSocket } from '../hooks/useWebSocket';

export function Levels() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const { botStatus } = useGuildWebSocket(id);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      userApi.getUser(),
      guildApi.getGuilds().then((guilds) => guilds.find((g) => g.id === id) || null),
    ])
      .then(([userData, guildData]) => {
        setUser(userData);
        setGuild(guildData);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;

    levelingApi.getLeaderboard(id, page)
      .then(setLeaderboard)
      .catch(console.error);
  }, [id, page]);

  if (loading || !guild) {
    return (
      <Layout user={user} guild={guild} botStatus={botStatus}>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: '#b9bbbe' }}>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user} guild={guild} botStatus={botStatus}>
      <div style={{ maxWidth: '800px' }}>
        <h1 style={{ color: '#fff', marginBottom: '2rem' }}>Leaderboard</h1>

        {!leaderboard || leaderboard.leaderboard.length === 0 ? (
          <div style={{
            background: '#16213e',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
          }}>
            <p style={{ color: '#b9bbbe', fontSize: '1.125rem' }}>
              No leveling data yet. Members will appear here as they earn XP.
            </p>
          </div>
        ) : (
          <>
            {/* Leaderboard Table */}
            <div style={{
              background: '#16213e',
              borderRadius: '12px',
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 100px 100px 100px',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #0f3460',
              }}>
                <span style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>Rank</span>
                <span style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>User</span>
                <span style={{ color: '#b9bbbe', fontSize: '0.875rem', textAlign: 'right' }}>Level</span>
                <span style={{ color: '#b9bbbe', fontSize: '0.875rem', textAlign: 'right' }}>XP</span>
                <span style={{ color: '#b9bbbe', fontSize: '0.875rem', textAlign: 'right' }}>Messages</span>
              </div>

              {/* Rows */}
              {leaderboard.leaderboard.map((entry, i) => (
                <LeaderboardRow
                  key={entry.userId}
                  rank={((page - 1) * leaderboard.limit) + i + 1}
                  userId={entry.userId}
                  level={entry.level}
                  xp={entry.xp}
                  messages={entry.messages}
                />
              ))}
            </div>

            {/* Pagination */}
            {leaderboard.pages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.5rem',
                marginTop: '1.5rem',
              }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={paginationButtonStyle(page === 1)}
                >
                  Previous
                </button>

                <span style={{ color: '#b9bbbe', padding: '0.5rem 1rem' }}>
                  Page {page} of {leaderboard.pages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(leaderboard.pages, p + 1))}
                  disabled={page === leaderboard.pages}
                  style={paginationButtonStyle(page === leaderboard.pages)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function LeaderboardRow({
  rank,
  userId,
  level,
  xp,
  messages,
}: {
  rank: number;
  userId: string;
  level: number;
  xp: number;
  messages: number;
}) {
  const isTopThree = rank <= 3;
  const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32'];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '60px 1fr 100px 100px 100px',
      padding: '1rem 1.5rem',
      borderBottom: '1px solid #0f3460',
      alignItems: 'center',
    }}>
      <span style={{
        color: isTopThree ? rankColors[rank - 1] : '#b9bbbe',
        fontWeight: isTopThree ? 'bold' : 'normal',
        fontSize: isTopThree ? '1.25rem' : '1rem',
      }}>
        #{rank}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: '#5865F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '0.875rem',
        }}>
          {/* In production, fetch user avatar */}
          {userId.charAt(0)}
        </div>
        <span style={{ color: '#fff' }}>User {userId.slice(0, 8)}</span>
      </div>
      <span style={{ color: '#e94560', textAlign: 'right', fontWeight: 'bold' }}>
        {level}
      </span>
      <span style={{ color: '#fff', textAlign: 'right' }}>
        {xp.toLocaleString()}
      </span>
      <span style={{ color: '#b9bbbe', textAlign: 'right' }}>
        {messages.toLocaleString()}
      </span>
    </div>
  );
}

function paginationButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.5rem 1rem',
    background: disabled ? '#4f545c' : '#e94560',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  };
}

export default Levels;
