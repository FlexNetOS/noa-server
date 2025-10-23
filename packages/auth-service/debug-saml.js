import dotenv from 'dotenv';
import { SAMLProvider } from './dist/providers/SAMLProvider.js';
import { AuthConfigLoader } from './dist/utils/config.js';

dotenv.config({ path: '.env.saml' });

try {
  const config = AuthConfigLoader.loadFromEnv();
  console.log('✅ Config loaded');

  if (!config.saml?.providers?.[0]) {
    console.error('❌ No SAML provider configured');
    process.exit(1);
  }

  console.log('✅ SAML provider config found');
  const samlProvider = new SAMLProvider(config.saml.providers[0]);
  console.log('✅ SAML provider created successfully');

  // Test getAuthUrl
  const authUrl = await samlProvider.getAuthUrl();
  console.log('✅ Auth URL generated:', authUrl);

} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}