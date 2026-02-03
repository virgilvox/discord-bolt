/**
 * Moderation Cases Page
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { moderationApi, guildApi, userApi, type Guild, type User, type Warning } from '../api/client';
import { Layout } from '../components/Layout';
import { useGuildWebSocket } from '../hooks/useWebSocket';

export function Moderation() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [guild, setGuild] = useState<Guild | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { botStatus } = useGuildWebSocket(id);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      userApi.getUser(),
      guildApi.getGuilds().then((guilds) => guilds.find((g) => g.id === id) || null),
      moderationApi.getWarnings(id),
    ])
      .then(([userData, guildData, warningsResponse]) => {
        setUser(userData);
        setGuild(guildData);
        setWarnings(warningsResponse.warnings);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const filteredWarnings = warnings.filter((w) => {
    if (filter === 'active' && w.expired) return false;
    if (filter === 'expired' && !w.expired) return false;
    if (typeFilter !== 'all' && w.type !== typeFilter) return false;
    return true;
  });

  const warningTypes = Array.from(new Set(warnings.map((w) => w.type)));

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
      <div style={{ maxWidth: '1000px' }}>
        <h1 style={{ color: '#fff', marginBottom: '2rem' }}>Moderation Cases</h1>

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <FilterButton
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              All
            </FilterButton>
            <FilterButton
              active={filter === 'active'}
              onClick={() => setFilter('active')}
            >
              Active
            </FilterButton>
            <FilterButton
              active={filter === 'expired'}
              onClick={() => setFilter('expired')}
            >
              Expired
            </FilterButton>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              background: '#0f3460',
              border: '1px solid #0f3460',
              borderRadius: '6px',
              color: '#fff',
            }}
          >
            <option value="all">All Types</option>
            {warningTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Stats Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <StatBox label="Total Cases" value={warnings.length} color="#fff" />
          <StatBox
            label="Warnings"
            value={warnings.filter((w) => w.type === 'warn').length}
            color="#faa81a"
          />
          <StatBox
            label="Mutes"
            value={warnings.filter((w) => w.type === 'mute').length}
            color="#f47b67"
          />
          <StatBox
            label="Kicks"
            value={warnings.filter((w) => w.type === 'kick').length}
            color="#f04747"
          />
          <StatBox
            label="Bans"
            value={warnings.filter((w) => w.type === 'ban').length}
            color="#a83232"
          />
        </div>

        {/* Cases Table */}
        {filteredWarnings.length === 0 ? (
          <div style={{
            background: '#16213e',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
          }}>
            <p style={{ color: '#b9bbbe', fontSize: '1.125rem' }}>
              No moderation cases found.
            </p>
          </div>
        ) : (
          <div style={{
            background: '#16213e',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '80px 100px 1fr 1fr 150px 100px',
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #0f3460',
              gap: '1rem',
            }}>
              <span style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>Case</span>
              <span style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>Type</span>
              <span style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>User</span>
              <span style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>Reason</span>
              <span style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>Date</span>
              <span style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>Status</span>
            </div>

            {/* Rows */}
            {filteredWarnings.map((warning) => (
              <CaseRow key={warning.id} warning={warning} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.5rem 1rem',
        background: active ? '#e94560' : '#0f3460',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div style={{
      background: '#16213e',
      borderRadius: '8px',
      padding: '1rem',
      textAlign: 'center',
    }}>
      <div style={{ color, fontSize: '1.5rem', fontWeight: 'bold' }}>
        {value}
      </div>
      <div style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>
        {label}
      </div>
    </div>
  );
}

function CaseRow({ warning }: { warning: Warning }) {
  const typeColors: Record<string, string> = {
    warn: '#faa81a',
    mute: '#f47b67',
    kick: '#f04747',
    ban: '#a83232',
    unmute: '#43b581',
    unban: '#43b581',
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '80px 100px 1fr 1fr 150px 100px',
      padding: '1rem 1.5rem',
      borderBottom: '1px solid #0f3460',
      alignItems: 'center',
      gap: '1rem',
    }}>
      <span style={{ color: '#b9bbbe', fontFamily: 'monospace' }}>
        #{warning.id}
      </span>
      <span style={{
        color: typeColors[warning.type] || '#fff',
        fontWeight: 500,
        textTransform: 'capitalize',
      }}>
        {warning.type}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: '#5865F2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '0.75rem',
        }}>
          {warning.userId.charAt(0)}
        </div>
        <span style={{ color: '#fff', fontSize: '0.875rem' }}>
          {warning.userId.slice(0, 8)}...
        </span>
      </div>
      <span style={{
        color: '#b9bbbe',
        fontSize: '0.875rem',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {warning.reason || 'No reason provided'}
      </span>
      <span style={{ color: '#b9bbbe', fontSize: '0.875rem' }}>
        {formatDate(warning.createdAt)}
      </span>
      <span style={{
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        background: warning.expired ? 'rgba(67, 181, 129, 0.2)' : 'rgba(250, 168, 26, 0.2)',
        color: warning.expired ? '#43b581' : '#faa81a',
      }}>
        {warning.expired ? 'Expired' : 'Active'}
      </span>
    </div>
  );
}

export default Moderation;
