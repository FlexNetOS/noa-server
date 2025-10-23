/**
 * @noa/cdn-manager
 *
 * Multi-CDN management and asset optimization system
 */

export {
  CDNManager,
  CDNManagerConfig,
  CDNProvider,
  UploadOptions,
  UploadResult,
  PurgeResult,
  URLOptions,
  DeploymentStatistics,
} from './CDNManager';

// Asset Pipeline
export { AssetPipeline } from './AssetPipeline';

// Providers
export { CloudFrontProvider } from './providers/CloudFrontProvider';
export { CloudflareProvider } from './providers/CloudflareProvider';
export { FastlyProvider } from './providers/FastlyProvider';
export { AkamaiProvider } from './providers/AkamaiProvider';

// Re-export for convenience
export default CDNManager;
