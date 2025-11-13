#!/usr/bin/env node

/**
 * Simple Mock SAML Identity Provider for Testing
 * Provides basic SAML authentication for development/testing
 */

import express from 'express';
import { createServer } from 'http';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 8080;

// Test users
const TEST_USERS = {
  testuser: {
    id: 'testuser',
    email: 'test@example.com',
    name: 'Test User',
    givenName: 'Test',
    familyName: 'User',
    groups: ['users', 'developers'],
    roles: ['user', 'developer'],
  },
  admin: {
    id: 'admin',
    email: 'admin@example.com',
    name: 'Admin User',
    givenName: 'Admin',
    familyName: 'User',
    groups: ['users', 'admins'],
    roles: ['user', 'admin'],
  },
};

// SAML Response template
const SAML_RESPONSE_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="_RESPONSE_ID_"
                Version="2.0"
                IssueInstant="_ISSUE_INSTANT_"
                Destination="_DESTINATION_"
                InResponseTo="_REQUEST_ID_">
  <saml:Issuer>mock-saml-idp</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                  ID="_ASSERTION_ID_"
                  Version="2.0"
                  IssueInstant="_ISSUE_INSTANT_">
    <saml:Issuer>mock-saml-idp</saml:Issuer>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">_USER_EMAIL_</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData InResponseTo="_REQUEST_ID_"
                                      NotOnOrAfter="_NOT_ON_OR_AFTER_"
                                      Recipient="_DESTINATION_"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="_NOT_BEFORE_" NotOnOrAfter="_NOT_ON_OR_AFTER_">
      <saml:AudienceRestriction>
        <saml:Audience>_AUDIENCE_</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="_ISSUE_INSTANT_"
                        SessionIndex="_SESSION_INDEX_">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>_USER_EMAIL_</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="name" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>_USER_NAME_</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="givenName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>_USER_GIVEN_NAME_</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="familyName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>_USER_FAMILY_NAME_</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="groups" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>_USER_GROUPS_</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Mock SAML IdP</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .user-card { border: 1px solid #ccc; padding: 20px; margin: 10px 0; border-radius: 5px; }
        .login-btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 3px; cursor: pointer; }
        .login-btn:hover { background: #0056b3; }
      </style>
    </head>
    <body>
      <h1>Mock SAML Identity Provider</h1>
      <p>Select a test user to authenticate:</p>

      ${Object.entries(TEST_USERS)
        .map(
          ([username, user]) => `
        <div class="user-card">
          <h3>${user.name} (${username})</h3>
          <p>Email: ${user.email}</p>
          <p>Groups: ${user.groups.join(', ')}</p>
          <p>Roles: ${user.roles.join(', ')}</p>
          <form method="POST" action="/saml/login">
            <input type="hidden" name="username" value="${username}">
            <input type="hidden" name="SAMLRequest" value="${req.query.SAMLRequest || ''}">
            <input type="hidden" name="RelayState" value="${req.query.RelayState || ''}">
            <button type="submit" class="login-btn">Login as ${user.name}</button>
          </form>
        </div>
      `
        )
        .join('')}

      <h2>Metadata</h2>
      <p><a href="/saml/metadata">SAML Metadata</a></p>
    </body>
    </html>
  `);
});

app.get('/saml/metadata', (req, res) => {
  const metadata = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="mock-saml-idp">
  <md:IDPSSODescriptor WantAuthnRequestsSigned="false"
                       protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>MIICiTCCAg+gAwIBAgIJAJ8l4HnPq7F1MAOGA1UEBhMCVVMxCzAJBgNVBAgTAkNB
          MRIwEAYDVQQHEwlQYWxvIEFsdG8xFTATBgNVBAoTDEV4YW1wbGUgQ29tcGFueTEZ
          MBcGA1UEAxMQZXhhbXBsZS5jb21wYW55LmNvbTAeFw0xMzEyMTExODQ1NTlaFw0x
          NDEyMTExODQ1NTlaMBgxFjAUBgNVBAoMDUV4YW1wbGUgQ29tcGFueTBcMA0GCSqG
          SIb3DQEBAQUAA0sAMEgCQQDTBP8lzufkHkZ1Ni3hWC6hZT2Hq7vBmKUz6wO6E3uY
          2jo7z7MH+KjWbGwT7h6EJ8W8wX3WKc1VxVQ8+Q+P5LAgMBAAGjUDBOMB0GA1UdDgQ
          WBBT5C0A0hzZ6fZG6AU61HzG1Uh2RaCBhQYIKwYBBQUHAwEwDAYDVR0TAQH/BAIwA
          DANBgkqhkiG9w0BAQUFAANBAE8WM8Q7o3s8lYqjL9VCgGJHG4nBQzAqO6hJLFGU
          8QkLk2Vx2F4V8PnZ6zUQp8vJfZ6Z6xUeF8vJfZ6Z6xUeF8=</ds:X509Certificate>
        </ds:KeyInfo>
      </md:KeyDescriptor>
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                           Location="http://localhost:8080/saml/sso"/>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                           Location="http://localhost:8080/saml/sso"/>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>`;

  res.set('Content-Type', 'application/xml');
  res.send(metadata);
});

app.post('/saml/login', (req, res) => {
  const { username, SAMLRequest, RelayState } = req.body;

  if (!TEST_USERS[username]) {
    return res.status(400).send('Invalid user');
  }

  const user = TEST_USERS[username];

  // Generate SAML Response
  const now = new Date();
  const notOnOrAfter = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

  let samlResponse = SAML_RESPONSE_TEMPLATE.replace(/_RESPONSE_ID_/g, `_${Date.now()}_response`)
    .replace(/_ASSERTION_ID_/g, `_${Date.now()}_assertion`)
    .replace(/_ISSUE_INSTANT_/g, now.toISOString())
    .replace(/_NOT_BEFORE_/g, now.toISOString())
    .replace(/_NOT_ON_OR_AFTER_/g, notOnOrAfter.toISOString())
    .replace(/_SESSION_INDEX_/g, `_${Date.now()}_session`)
    .replace(/_REQUEST_ID_/g, SAMLRequest ? 'test-request-id' : '')
    .replace(/_DESTINATION_/g, 'http://localhost:3000/auth/saml/callback')
    .replace(/_AUDIENCE_/g, 'noa-server')
    .replace(/_USER_EMAIL_/g, user.email)
    .replace(/_USER_NAME_/g, user.name)
    .replace(/_USER_GIVEN_NAME_/g, user.givenName)
    .replace(/_USER_FAMILY_NAME_/g, user.familyName)
    .replace(/_USER_GROUPS_/g, user.groups.join(','));

  // Base64 encode the response
  const encodedResponse = Buffer.from(samlResponse).toString('base64');

  // Send the response
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SAML Response</title>
    </head>
    <body>
      <h1>Mock SAML IdP - Authentication Successful</h1>
      <p>User: ${user.name} (${user.email})</p>
      <p>Groups: ${user.groups.join(', ')}</p>

      <form method="POST" action="http://localhost:3000/auth/saml/callback">
        <input type="hidden" name="SAMLResponse" value="${encodedResponse}">
        ${RelayState ? `<input type="hidden" name="RelayState" value="${RelayState}">` : ''}
        <button type="submit">Continue to Application</button>
      </form>

      <script>
        // Auto-submit the form
        setTimeout(() => {
          document.forms[0].submit();
        }, 2000);
      </script>
    </body>
    </html>
  `);
});

// SAML SSO endpoint
app.post('/saml/sso', (req, res) => {
  const { SAMLRequest, RelayState } = req.body;

  // Redirect to login page with SAML request
  res.redirect(
    `/?SAMLRequest=${encodeURIComponent(SAMLRequest || '')}&RelayState=${encodeURIComponent(RelayState || '')}`
  );
});

app.get('/saml/sso', (req, res) => {
  const { SAMLRequest, RelayState } = req.query;

  // Redirect to login page with SAML request
  res.redirect(
    `/?SAMLRequest=${encodeURIComponent(SAMLRequest || '')}&RelayState=${encodeURIComponent(RelayState || '')}`
  );
});

// Start server
const server = createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Mock SAML IdP running at http://localhost:${PORT}`);
  console.log(`📋 Available test users:`);
  Object.entries(TEST_USERS).forEach(([username, user]) => {
    console.log(
      `   - ${username}: ${user.name} (${user.email}) - Groups: ${user.groups.join(', ')}`
    );
  });
  console.log(`📄 SAML Metadata: http://localhost:${PORT}/saml/metadata`);
});

export default app;
