/**
 * FURLOW Dashboard Server
 */

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { join } from 'node:path';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.DASHBOARD_SECRET ?? 'furlow-dashboard-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  })
);

// Passport configuration
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  passport.use(
    new DiscordStrategy(
      {
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL: process.env.DISCORD_CALLBACK_URL ?? '/auth/discord/callback',
        scope: ['identify', 'guilds'],
      },
      (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });

  app.use(passport.initialize());
  app.use(passport.session());
}

// Auth routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get(
  '/auth/discord/callback',
  passport.authenticate('discord', {
    failureRedirect: '/login',
  }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    res.redirect('/');
  });
});

// API routes
app.get('/api/user', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json(req.user);
});

app.get('/api/guilds', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  // Return guilds where user has MANAGE_GUILD permission
  const guilds = (req.user as any).guilds?.filter(
    (g: any) => (parseInt(g.permissions) & 0x20) === 0x20
  );
  res.json(guilds ?? []);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Metrics endpoint (for Prometheus)
app.get('/metrics', async (req, res) => {
  // Placeholder for Prometheus metrics
  res.set('Content-Type', 'text/plain');
  res.send('# FURLOW metrics endpoint\n');
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../client')));

  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../client/index.html'));
  });
}

// Start server
const PORT = process.env.DASHBOARD_PORT ?? 3000;

export function startDashboard(): void {
  app.listen(PORT, () => {
    console.log(`Dashboard running at http://localhost:${PORT}`);
  });
}

export default app;
