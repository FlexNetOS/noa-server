/**
 * Archive Data Script
 *
 * Weekly cron job to archive old data to cold storage
 * Run: npm run archive-data
 */

import { Pool } from 'pg';

import { ArchivalManager } from '../../lifecycle/ArchivalManager';
import { RetentionPolicyEngine } from '../../RetentionPolicyEngine';

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function archiveData() {
  console.log('Starting data archival process...');
  const startTime = Date.now();

  const engine = new RetentionPolicyEngine(db);
  const archivalManager = new ArchivalManager(db);

  try {
    // Get records ready for archival
    const recordsToArchive = await engine.getRecordsForArchival();

    console.log(`Found ${recordsToArchive.length} records ready for archival`);

    if (recordsToArchive.length === 0) {
      console.log('No records to archive. Exiting...');
      return;
    }

    // Process in batches
    const batchSize = 100;
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;

    for (let i = 0; i < recordsToArchive.length; i += batchSize) {
      const batch = recordsToArchive.slice(i, i + batchSize);

      console.log(
        `\nProcessing batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)...`
      );

      const result = await archivalManager.bulkArchive(
        batch.map((r) => ({
          tableName: r.table_name,
          recordId: r.record_id,
        }))
      );

      totalProcessed += batch.length;
      totalSucceeded += result.succeeded;
      totalFailed += result.failed;

      console.log(`Batch result: ${result.succeeded} succeeded, ${result.failed} failed`);

      if (result.errors.length > 0) {
        console.error('Errors in batch:');
        result.errors.forEach((error) => {
          console.error(`  - ${error.recordId}: ${error.error}`);
        });
      }

      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`\nArchival Summary:`);
    console.log(`- Total processed: ${totalProcessed}`);
    console.log(`- Succeeded: ${totalSucceeded}`);
    console.log(`- Failed: ${totalFailed}`);

    // Get archival statistics
    const stats = await archivalManager.getArchiveStatistics();
    console.log(`\nArchive Statistics:`);
    console.log(`- Total archives: ${stats.totalArchives}`);
    console.log(`- Total size: ${stats.totalSizeGB.toFixed(2)} GB`);

    // Log results
    await logArchivalRun({
      totalProcessed,
      succeeded: totalSucceeded,
      failed: totalFailed,
      durationMs: Date.now() - startTime,
    });

    const duration = Date.now() - startTime;
    console.log(`\nArchival completed in ${duration}ms`);
  } catch (error) {
    console.error('Error during archival:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

async function logArchivalRun(stats: any) {
  const query = `
    INSERT INTO retention_events
    (id, event_type, event_data)
    VALUES (gen_random_uuid(), 'ARCHIVAL_RUN', $1)
  `;

  await db.query(query, [JSON.stringify(stats)]);
}

// Run the script
archiveData();
