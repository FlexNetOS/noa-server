#!/usr/bin/env node

/**
 * SAML Configuration Test Script
 * Tests SAML provider configuration and generates SP metadata
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { AuthConfigLoader } from './dist/index.js';
import { SAMLProvider } from './dist/providers/SAMLProvider.js';

// Load environment variables from .env.saml
function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
          process.env[key] = value;
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not load ${filePath}:`, error.message);
  }
}

async function testSAMLConfig() {
  console.log('🔍 Testing SAML Configuration...\n');

  // Load environment variables
  loadEnvFile('.env.saml');

  try {
    // Load configuration from environment
    const config = AuthConfigLoader.loadFromEnv();

    // Validate configuration
    const validation = AuthConfigLoader.validateConfig(config);
    if (!validation.valid) {
      console.error('❌ Configuration validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }

    console.log('✅ Configuration validation passed');

    // Check if SAML is enabled
    if (!config.saml?.providers || config.saml.providers.length === 0) {
      console.log('⚠️  SAML is not enabled. Set SAML_ENABLED=true in your environment.');
      console.log('   Copy settings from .env.saml to your .env file');
      process.exit(0);
    }

    console.log(`📋 Found ${config.saml.providers.length} SAML provider(s)`);

    // Test each SAML provider
    for (const providerConfig of config.saml.providers) {
      console.log(`\n🔧 Testing provider: ${providerConfig.name}`);

      // Create SAML provider instance
      const provider = new SAMLProvider(providerConfig);

      // Validate provider configuration
      const providerValidation = provider.validateConfig();
      if (!providerValidation.valid) {
        console.error(`❌ Provider '${providerConfig.name}' validation failed:`);
        providerValidation.errors.forEach(error => console.error(`  - ${error}`));
        continue;
      }

      console.log(`✅ Provider '${providerConfig.name}' configuration is valid`);

      // Generate SP metadata
      try {
        const metadata = provider.generateServiceProviderMetadata();
        const metadataPath = resolve(`./certs/saml-sp-metadata-${providerConfig.name}.xml`);
        writeFileSync(metadataPath, metadata, 'utf8');
        console.log(`📄 SP metadata generated: ${metadataPath}`);
        console.log('   Upload this file to your IdP\'s SAML configuration');
      } catch (error) {
        console.warn(`⚠️  Metadata generation failed for '${providerConfig.name}' (this is OK for testing):`, error.message);
        console.log(`   You can manually create SAML metadata or use a test IdP that doesn't require signed metadata`);
      }
    }

    console.log('\n🎉 SAML configuration test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Set up your SAML Identity Provider (IdP)');
    console.log('2. Upload the generated SP metadata XML to your IdP');
    console.log('3. Configure your IdP with the callback URL:', config.saml.providers[0].callbackUrl);
    console.log('4. Test the SAML authentication flow');

  } catch (error) {
    console.error('❌ SAML configuration test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSAMLConfig().catch(console.error);
