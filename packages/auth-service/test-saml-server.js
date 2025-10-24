#!/usr/bin/env node

/**
 * SAML Test Server
 * Simple Express server to test SAML authentication flow
 */

import dotenv from 'dotenv';
import express from 'express';
import passport from 'passport';
import { JWTProvider } from './dist/providers/JWTProvider.js';
import { SAMLProvider } from './dist/providers/SAMLProvider.js';
import { AuthConfigLoader } from './dist/utils/config.js';

// Load environment variables
dotenv.config({ path: '.env.saml' });

const app = express();
const PORT = 3000;

async function startServer() {
  try {
    console.log('🚀 Starting SAML Test Server...\n');

    // Load configuration
    const config = AuthConfigLoader.loadFromEnv();
    console.log('✅ Configuration loaded');

    // Create JWT provider
    const jwtProvider = new JWTProvider(config.jwt);
    console.log('✅ JWT provider initialized');

    // Create SAML provider
    if (!config.saml?.providers?.[0]) {
      throw new Error('No SAML provider configured. Check your .env.saml file.');
    }
    const samlProvider = new SAMLProvider(config.saml.providers[0]);
    console.log('✅ SAML provider initialized');

    // Set up Passport with SAML strategy
    passport.use('saml', samlProvider.getStrategy());
    console.log('✅ Passport SAML strategy configured');

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // SAML login endpoint
    app.get(
      '/auth/saml/login',
      passport.authenticate('saml', { failureRedirect: '/login' }),
      (req, res) => {
        // This should not be reached - passport will redirect to IdP
        res.redirect('/');
      }
    );

    // SAML callback endpoint
    app.post(
      '/auth/saml/callback',
      passport.authenticate('saml', { failureRedirect: '/login' }),
      async (req, res) => {
        try {
          console.log('📨 SAML callback received');

          const samlUser = req.user;
          console.log('✅ SAML authentication successful for user:', samlUser.email);

          // Generate JWT token
          const token = await jwtProvider.generateAccessToken({
            sub: samlUser.id || samlUser.email,
            email: samlUser.email,
            name: samlUser.name,
            groups: samlUser.groups || [],
            roles: samlUser.roles || [],
            permissions: samlUser.permissions || [],
          });

          console.log('🎫 JWT token generated');

          // Return success with token
          res.json({
            success: true,
            message: 'SAML authentication successful',
            user: {
              email: samlUser.email,
              name: samlUser.name,
              groups: samlUser.groups,
              roles: samlUser.roles,
            },
            token: {
              accessToken: token,
              tokenType: 'Bearer',
              expiresIn: config.jwt?.accessTokenExpiry || '15m',
            },
          });
        } catch (error) {
          console.error('❌ SAML callback error:', error);
          res.status(500).json({
            error: 'SAML authentication failed',
            details: error.message,
          });
        }
      }
    );

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        saml: {
          enabled: config.saml?.enabled || false,
          entryPoint: config.saml?.entryPoint,
          issuer: config.saml?.issuer,
        },
      });
    });

    // Root endpoint
    app.get('/', (req, res) => {
      res.send(`
        <html>
          <head>
            <title>SAML Test Server</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .button { background: #007acc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>🔐 SAML Authentication Test Server</h1>
            <p>Click below to test SAML authentication:</p>
            <a href="/auth/saml/login" class="button">Login with SAML</a>
            <br><br>
            <a href="/health">Health Check</a>
          </body>
        </html>
      `);
    });

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`\n🎉 Server running on http://localhost:${PORT}`);
      console.log(`🔗 SAML Login: http://localhost:${PORT}/auth/saml/login`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`\n📝 Test Instructions:`);
      console.log(`1. Click the "Login with SAML" link above`);
      console.log(`2. You'll be redirected to the mock IdP at http://localhost:8080`);
      console.log(`3. Select a test user (testuser or admin)`);
      console.log(`4. You'll be redirected back and should see a JWT token`);
      console.log(`\n🔍 Test Users:`);
      console.log(`   testuser: Test User (test@example.com) - Groups: users, developers`);
      console.log(`   admin: Admin User (admin@example.com) - Groups: users, admins`);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down server...');
      server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
