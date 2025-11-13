import * as core from '@actions/core';
import * as github from '@actions/github';
import * as glob from '@actions/glob';
import { promises as fs } from 'fs';
import * as path from 'path';

interface PackageInfo {
  name: string;
  version: string;
  path: string;
  hasTests: boolean;
  hasBuild: boolean;
}

async function run(): Promise<void> {
  try {
    const operation = core.getInput('operation', { required: true });
    const targetPackage = core.getInput('package');
    const environment = core.getInput('environment') || 'development';

    core.info(`🔧 Executing operation: ${operation}`);
    core.info(`📦 Target package: ${targetPackage || 'all'}`);
    core.info(`🌍 Environment: ${environment}`);

    switch (operation) {
      case 'status':
        await getRepositoryStatus();
        break;
      case 'packages':
        await analyzePackages(targetPackage);
        break;
      case 'dependencies':
        await checkDependencies(targetPackage);
        break;
      case 'build-status':
        await checkBuildStatus(targetPackage);
        break;
      default:
        core.setFailed(`Unknown operation: ${operation}`);
    }

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed: ${error.message}`);
    } else {
      core.setFailed('Action failed with unknown error');
    }
  }
}

async function getRepositoryStatus(): Promise<void> {
  const context = github.context;

  core.info('📊 Repository Status:');
  core.info(`- Repository: ${context.repo.owner}/${context.repo.repo}`);
  core.info(`- Event: ${context.eventName}`);
  core.info(`- Branch: ${context.ref}`);
  core.info(`- SHA: ${context.sha}`);
  core.info(`- Actor: ${context.actor}`);

  // Check for package.json
  try {
    const packageJson = await fs.readFile('package.json', 'utf8');
    const pkg = JSON.parse(packageJson);
    core.info(`- Version: ${pkg.version}`);
    core.info(`- Scripts: ${Object.keys(pkg.scripts || {}).length}`);
  } catch (error) {
    core.warning('No package.json found in root');
  }
}

async function analyzePackages(targetPackage?: string): Promise<void> {
  const packages: PackageInfo[] = [];

  // Find all package.json files
  const globber = await glob.create('packages/*/package.json');
  const packageFiles = await globber.glob();

  for (const packageFile of packageFiles) {
    try {
      const content = await fs.readFile(packageFile, 'utf8');
      const pkg = JSON.parse(content);
      const packagePath = path.dirname(packageFile);

      if (targetPackage && pkg.name !== targetPackage) {
        continue;
      }

      // Check for tests and build scripts
      const hasTests = !!(pkg.scripts?.test || pkg.scripts?.['test:unit']);
      const hasBuild = !!pkg.scripts?.build;

      packages.push({
        name: pkg.name,
        version: pkg.version,
        path: packagePath,
        hasTests,
        hasBuild
      });
    } catch (error) {
      core.warning(`Failed to parse ${packageFile}: ${error}`);
    }
  }

  core.info(`📦 Found ${packages.length} packages:`);
  packages.forEach(pkg => {
    core.info(`- ${pkg.name}@${pkg.version} (${pkg.path})`);
    core.info(`  Tests: ${pkg.hasTests ? '✅' : '❌'}, Build: ${pkg.hasBuild ? '✅' : '❌'}`);
  });

  // Set output for other actions to use
  core.setOutput('package-count', packages.length.toString());
  core.setOutput('packages', JSON.stringify(packages));
}

async function checkDependencies(targetPackage?: string): Promise<void> {
  const globber = await glob.create(targetPackage ? `packages/${targetPackage}/package.json` : 'packages/*/package.json');
  const packageFiles = await globber.glob();

  for (const packageFile of packageFiles) {
    try {
      const content = await fs.readFile(packageFile, 'utf8');
      const pkg = JSON.parse(content);

      core.info(`🔍 Checking dependencies for ${pkg.name}:`);

      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      const depCount = Object.keys(deps).length;

      core.info(`- Total dependencies: ${depCount}`);

      // Check for outdated patterns
      const outdated = Object.entries(deps).filter(([name, version]) => {
        const ver = version as string;
        return ver.includes('^0.') || ver.includes('~0.');
      });

      if (outdated.length > 0) {
        core.warning(`- Potentially outdated dependencies: ${outdated.length}`);
        outdated.forEach(([name, version]) => {
          core.info(`  - ${name}: ${version}`);
        });
      }

    } catch (error) {
      core.warning(`Failed to check dependencies for ${packageFile}: ${error}`);
    }
  }
}

async function checkBuildStatus(targetPackage?: string): Promise<void> {
  const globber = await glob.create(targetPackage ? `packages/${targetPackage}/package.json` : 'packages/*/package.json');
  const packageFiles = await globber.glob();

  for (const packageFile of packageFiles) {
    try {
      const content = await fs.readFile(packageFile, 'utf8');
      const pkg = JSON.parse(content);
      const packagePath = path.dirname(packageFile);

      core.info(`🔨 Checking build status for ${pkg.name}:`);

      // Check for dist/build directories
      const distExists = await fs.access(path.join(packagePath, 'dist')).then(() => true).catch(() => false);
      const buildExists = await fs.access(path.join(packagePath, 'build')).then(() => true).catch(() => false);
      const libExists = await fs.access(path.join(packagePath, 'lib')).then(() => true).catch(() => false);

      core.info(`- Build artifacts: ${distExists || buildExists || libExists ? '✅' : '❌'}`);
      core.info(`- Has build script: ${!!pkg.scripts?.build ? '✅' : '❌'}`);

    } catch (error) {
      core.warning(`Failed to check build status for ${packageFile}: ${error}`);
    }
  }
}

run();
