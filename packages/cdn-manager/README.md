# @noa/cdn-manager

📚 [Master Documentation Index](docs/INDEX.md)


Multi-CDN management and asset optimization system supporting CloudFront,
Cloudflare, Fastly, and Akamai.

## Features

- **Multi-CDN Support**
  - AWS CloudFront
  - Cloudflare
  - Fastly
  - Akamai

- **Asset Management**
  - Automated asset upload
  - Cache purging/invalidation
  - URL generation with versioning
  - Geographic routing
  - Failover handling

- **Optimization**
  - Image optimization (WebP, AVIF)
  - JavaScript/CSS minification
  - HTML minification
  - Compression (gzip, brotli)
  - Automatic format conversion

- **Versioning**
  - Content-based hashing
  - Timestamp versioning
  - Semantic versioning
  - Cache busting

## Installation

```bash
npm install @noa/cdn-manager
# or
pnpm add @noa/cdn-manager
```

## Quick Start

```typescript
import { CDNManager } from '@noa/cdn-manager';

const cdnManager = new CDNManager({
  providers: {
    cloudfront: {
      enabled: true,
      distributionId: 'E1234567890ABC',
      region: 'us-east-1',
      s3Bucket: 'my-assets-bucket',
    },
    cloudflare: {
      enabled: true,
      email: 'admin@example.com',
      apiKey: 'your-api-key',
      zoneId: 'your-zone-id',
    },
  },
  optimization: {
    enableCompression: true,
    enableMinification: true,
    enableImageOptimization: true,
    imageFormats: ['webp', 'avif'],
  },
  caching: {
    defaultMaxAge: 86400, // 24 hours
    staleWhileRevalidate: 3600, // 1 hour
    customMaxAge: {
      js: 31536000, // 1 year for JS
      css: 31536000, // 1 year for CSS
      html: 3600, // 1 hour for HTML
    },
  },
  versioning: {
    enabled: true,
    strategy: 'hash',
  },
});

// Upload single asset
const content = await fs.readFile('./assets/logo.png');
const results = await cdnManager.uploadAsset('logo.png', content, {
  contentType: 'image/png',
});

for (const result of results) {
  if (result.success) {
    console.log(`Uploaded to ${result.provider}: ${result.url}`);
  }
}

// Deploy entire directory
const stats = await cdnManager.deployAssets('./dist');
console.log('Deployment stats:', stats);

// Purge cache
await cdnManager.purgeCache(['logo.png', 'styles.css']);

// Get CDN URL
const url = cdnManager.getUrl('logo.png');
console.log('CDN URL:', url);

// Get URL from specific provider
const cfUrl = cdnManager.getUrl('logo.png', 'cloudfront');
console.log('CloudFront URL:', cfUrl);
```

## Provider Configuration

### AWS CloudFront

```typescript
const cdnManager = new CDNManager({
  providers: {
    cloudfront: {
      enabled: true,
      distributionId: 'E1234567890ABC',
      region: 'us-east-1',
      s3Bucket: 'my-assets-bucket',
    },
  },
});

// Assets are uploaded to S3 and served via CloudFront
```

**Setup:**

1. Create S3 bucket
2. Create CloudFront distribution
3. Configure origin as S3 bucket
4. Set up AWS credentials

### Cloudflare

```typescript
const cdnManager = new CDNManager({
  providers: {
    cloudflare: {
      enabled: true,
      email: 'admin@example.com',
      apiKey: 'your-api-key',
      zoneId: 'your-zone-id',
    },
  },
});

// Cloudflare caches from your origin server
```

**Setup:**

1. Add domain to Cloudflare
2. Get API key from dashboard
3. Get Zone ID from dashboard
4. Configure cache rules

### Fastly

```typescript
const cdnManager = new CDNManager({
  providers: {
    fastly: {
      enabled: true,
      apiKey: 'your-api-key',
      serviceId: 'your-service-id',
    },
  },
});
```

**Setup:**

1. Create Fastly service
2. Get API token
3. Configure origin server
4. Set up VCL rules

### Akamai

```typescript
const cdnManager = new CDNManager({
  providers: {
    akamai: {
      enabled: true,
      clientToken: 'your-client-token',
      clientSecret: 'your-client-secret',
      accessToken: 'your-access-token',
      baseUri: 'https://your-base-uri.akamai.com',
    },
  },
});
```

**Setup:**

1. Create Akamai property
2. Get API credentials
3. Configure CP code
4. Set up behaviors

## Asset Optimization

### Image Optimization

```typescript
import sharp from 'sharp';

// Automatic WebP/AVIF conversion
const imageBuffer = await fs.readFile('image.jpg');

const webpBuffer = await sharp(imageBuffer).webp({ quality: 80 }).toBuffer();

await cdnManager.uploadAsset('image.webp', webpBuffer);

const avifBuffer = await sharp(imageBuffer).avif({ quality: 70 }).toBuffer();

await cdnManager.uploadAsset('image.avif', avifBuffer);
```

### JavaScript Minification

```typescript
import { minify } from 'terser';

const jsContent = await fs.readFile('script.js', 'utf-8');
const minified = await minify(jsContent, {
  compress: {
    dead_code: true,
    drop_console: true,
  },
  mangle: true,
});

await cdnManager.uploadAsset('script.min.js', Buffer.from(minified.code!));
```

### CSS Minification

```typescript
import csso from 'csso';

const cssContent = await fs.readFile('styles.css', 'utf-8');
const minified = csso.minify(cssContent);

await cdnManager.uploadAsset('styles.min.css', Buffer.from(minified.css));
```

## Cache Control

### Default Caching

```typescript
const cdnManager = new CDNManager({
  caching: {
    defaultMaxAge: 86400, // 24 hours
    staleWhileRevalidate: 3600, // 1 hour
  },
});

// Generates header:
// Cache-Control: public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600
```

### Per-File-Type Caching

```typescript
const cdnManager = new CDNManager({
  caching: {
    defaultMaxAge: 86400,
    customMaxAge: {
      // Long cache for static assets
      js: 31536000, // 1 year
      css: 31536000, // 1 year
      jpg: 31536000,
      png: 31536000,
      woff2: 31536000,

      // Short cache for dynamic content
      html: 3600, // 1 hour
      json: 300, // 5 minutes
    },
  },
});
```

### Custom Cache Control

```typescript
await cdnManager.uploadAsset('api-data.json', buffer, {
  contentType: 'application/json',
  cacheControl: 'public, max-age=60, s-maxage=60, must-revalidate',
});
```

## Versioning Strategies

### Content Hash (Recommended)

```typescript
const cdnManager = new CDNManager({
  versioning: {
    enabled: true,
    strategy: 'hash', // MD5 hash of content
  },
});

// Generates URL: https://cdn.example.com/app.js?v=a1b2c3d4
// Hash changes only when content changes
```

### Timestamp

```typescript
const cdnManager = new CDNManager({
  versioning: {
    enabled: true,
    strategy: 'timestamp',
  },
});

// Generates URL: https://cdn.example.com/app.js?v=1640000000000
// New version on every deployment
```

### Semantic

```typescript
const cdnManager = new CDNManager({
  versioning: {
    enabled: true,
    strategy: 'semantic', // Managed externally
  },
});

// Generates URL: https://cdn.example.com/app.js?v=1.0.0
// Version managed by your build process
```

## Deployment Workflows

### Build and Deploy

```typescript
import { CDNManager } from '@noa/cdn-manager';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function buildAndDeploy() {
  console.log('Building assets...');
  await execAsync('npm run build');

  console.log('Deploying to CDN...');
  const cdnManager = new CDNManager({...});

  const stats = await cdnManager.deployAssets('./dist');

  console.log(`Deployed ${stats.uploadedAssets}/${stats.totalAssets} assets`);
  console.log(`Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Duration: ${(stats.duration / 1000).toFixed(2)}s`);

  if (stats.failedAssets > 0) {
    console.error('Failed uploads:', stats.errors);
    process.exit(1);
  }

  // Purge old cache
  console.log('Purging cache...');
  await cdnManager.purgeCache(['index.html', 'manifest.json']);

  console.log('Deployment complete!');
}

buildAndDeploy().catch(console.error);
```

### CI/CD Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy to CDN

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to CDN
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          CLOUDFLARE_API_KEY: ${{ secrets.CLOUDFLARE_API_KEY }}
        run: node scripts/deploy-cdn.js
```

## Cache Invalidation

### Purge Specific Files

```typescript
// Purge individual files
await cdnManager.purgeCache(['index.html', 'app.js', 'styles.css']);
```

### Purge All

```typescript
// Purge entire cache (use with caution)
await cdnManager.purgeCache(['/*']);
```

### Event-Based Invalidation

```typescript
cdnManager.on('asset-uploaded', async ({ provider, file, result }) => {
  console.log(`Asset uploaded to ${provider}: ${file}`);

  // Auto-purge HTML files
  if (file.endsWith('.html')) {
    await cdnManager.purgeCache([file]);
    console.log(`Cache purged for ${file}`);
  }
});
```

## Multi-Region Deployment

```typescript
// Deploy to multiple regions
const cdnManager = new CDNManager({
  providers: {
    cloudfront: {
      enabled: true,
      distributionId: 'E1234567890ABC', // US distribution
    },
    cloudfrontEU: {
      enabled: true,
      distributionId: 'E9876543210XYZ', // EU distribution
    },
    cloudfrontAPAC: {
      enabled: true,
      distributionId: 'EASDFGHJKLQWER', // APAC distribution
    },
  },
});

// Assets are deployed to all enabled providers
const stats = await cdnManager.deployAssets('./dist');
console.log('Deployed to regions:', stats.providers);
```

## Events

```typescript
cdnManager.on('asset-uploaded', ({ provider, file, result }) => {
  console.log(`Uploaded ${file} to ${provider}`);
});

cdnManager.on('cache-purged', ({ provider, paths }) => {
  console.log(`Purged ${paths.length} paths from ${provider}`);
});

cdnManager.on('deployment-completed', (stats) => {
  console.log('Deployment completed:', stats);

  // Send notification
  slack.send({
    message: `Deployed ${stats.uploadedAssets} assets in ${stats.duration}ms`,
  });
});
```

## Best Practices

1. **Use Content Hashing**
   - Enables long cache times
   - Automatic cache invalidation
   - No manual purging needed

2. **Optimize Assets**
   - Minify JavaScript/CSS
   - Compress images
   - Use modern formats (WebP, AVIF)
   - Enable gzip/brotli

3. **Set Long Cache Times**
   - Use versioning for cache busting
   - Set 1 year max-age for static assets
   - Short cache for HTML/JSON

4. **Monitor Performance**
   - Track CDN hit rates
   - Monitor response times
   - Alert on high error rates

5. **Use Multiple CDNs**
   - Redundancy and failover
   - Geographic optimization
   - Cost optimization

## Troubleshooting

### Upload Failures

- Check provider credentials
- Verify bucket/zone permissions
- Review error logs
- Check file size limits

### Cache Not Purging

- Verify API credentials
- Check distribution IDs
- Wait for propagation
- Use wildcard purge

### High CDN Costs

- Optimize asset sizes
- Enable compression
- Use longer cache times
- Review traffic patterns

## License

MIT

> Last updated: 2025-11-20
