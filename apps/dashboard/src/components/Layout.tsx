/**
 * Dashboard Layout Component
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { User, Guild } from '../api/client';
import type { BotStatus } from '../hooks/useWebSocket';

interface LayoutProps {
  user: User | null;
  guild?: Guild | null;
  botStatus?: BotStatus | null;
  children: React.ReactNode;
}

export function Layout({ user, guild, botStatus, children }: LayoutProps) {
  const location = useLocation();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a2e' }}>
      {/* Header */}
      <header style={{
        background: '#16213e',
        borderBottom: '1px solid #0f3460',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link to="/" style={{ color: '#e94560', textDecoration: 'none', fontSize: '1.5rem', fontWeight: 'bold' }}>
            FURLOW
          </Link>

          {guild && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
              {guild.icon && (
                <img
                  src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                  alt=""
                  style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                />
              )}
              <span>{guild.name}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Bot Status Indicator */}
          {botStatus && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: botStatus.online ? 'rgba(67, 181, 129, 0.2)' : 'rgba(240, 71, 71, 0.2)',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: botStatus.online ? '#43b581' : '#f04747',
              }} />
              <span style={{ color: botStatus.online ? '#43b581' : '#f04747' }}>
                {botStatus.online ? 'Online' : 'Offline'}
              </span>
              {botStatus.online && (
                <span style={{ color: '#b9bbbe' }}>
                  {botStatus.ping}ms
                </span>
              )}
            </div>
          )}

          {/* User Menu */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <img
                src={user.avatar
                  ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                  : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`
                }
                alt=""
                style={{ width: '32px', height: '32px', borderRadius: '50%' }}
              />
              <span style={{ color: '#fff' }}>{user.username}</span>
              <a href="/auth/logout" style={{ color: '#b9bbbe', textDecoration: 'none', fontSize: '0.875rem' }}>
                Logout
              </a>
            </div>
          ) : (
            <a
              href="/auth/discord"
              style={{
                padding: '0.5rem 1rem',
                background: '#5865F2',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
              }}
            >
              Login
            </a>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar (when in guild context) */}
        {guild && (
          <nav style={{
            width: '240px',
            background: '#16213e',
            borderRight: '1px solid #0f3460',
            padding: '1rem 0',
          }}>
            <NavLink to={`/guild/${guild.id}`} active={location.pathname === `/guild/${guild.id}`}>
              Overview
            </NavLink>
            <NavLink to={`/guild/${guild.id}/settings`} active={location.pathname.includes('/settings')}>
              Settings
            </NavLink>
            <NavLink to={`/guild/${guild.id}/moderation`} active={location.pathname.includes('/moderation')}>
              Moderation
            </NavLink>
            <NavLink to={`/guild/${guild.id}/levels`} active={location.pathname.includes('/levels')}>
              Levels
            </NavLink>
            <NavLink to={`/guild/${guild.id}/welcome`} active={location.pathname.includes('/welcome')}>
              Welcome
            </NavLink>
            <NavLink to={`/guild/${guild.id}/logging`} active={location.pathname.includes('/logging')}>
              Logging
            </NavLink>
            <NavLink to={`/guild/${guild.id}/automod`} active={location.pathname.includes('/automod')}>
              AutoMod
            </NavLink>

            <div style={{ margin: '1rem 0', borderTop: '1px solid #0f3460' }} />

            <NavLink to="/" active={false}>
              ← Back to Servers
            </NavLink>
          </nav>
        )}

        {/* Main Content */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        display: 'block',
        padding: '0.75rem 1.5rem',
        color: active ? '#e94560' : '#b9bbbe',
        textDecoration: 'none',
        background: active ? 'rgba(233, 69, 96, 0.1)' : 'transparent',
        borderLeft: active ? '3px solid #e94560' : '3px solid transparent',
        transition: 'all 0.2s',
      }}
    >
      {children}
    </Link>
  );
}

export default Layout;
