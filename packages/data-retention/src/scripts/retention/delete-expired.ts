/**
 * Delete Expired Data Script
 *
 * Daily cron job to delete expired data
 * Run: npm run delete-expired
 */

import { Pool } from 'pg';

import { SecureDeletion } from '../../deletion/SecureDeletion';
import { RetentionPolicyEngine } from '../../RetentionPolicyEngine';

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function deleteExpired() {
  console.log('Starting deletion of expired data...');
  const startTime = Date.now();

  const engine = new RetentionPolicyEngine(db);
  const deletionManager = new SecureDeletion(db);

  try {
    // Get expired records
    const expiredRecords = await engine.getExpiredRecords();

    console.log(`Found ${expiredRecords.length} expired records for deletion`);

    if (expiredRecords.length === 0) {
      console.log('No expired records to delete. Exiting...');
      return;
    }

    // Process in batches (smaller batch size for deletions)
    const batchSize = 50;
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;

    for (let i = 0; i < expiredRecords.length; i += batchSize) {
      const batch = expiredRecords.slice(i, i + batchSize);

      console.log(
        `\nProcessing batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)...`
      );

      const result = await deletionManager.bulkSecureDelete(
        batch.map((r) => ({
          tableName: r.table_name,
          recordId: r.record_id,
        })),
        'Automatic deletion - retention period expired',
        'SYSTEM_AUTOMATED'
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

      // Verify deletions
      for (const record of batch) {
        const verified = await deletionManager.verifyDeletion(record.table_name, record.record_id);

        if (!verified) {
          console.error(`WARNING: Deletion verification failed for ${record.record_id}`);
        }
      }

      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log(`\nDeletion Summary:`);
    console.log(`- Total processed: ${totalProcessed}`);
    console.log(`- Succeeded: ${totalSucceeded}`);
    console.log(`- Failed: ${totalFailed}`);

    // Get deletion statistics
    const stats = await deletionManager.getDeletionStatistics(1);
    console.log(`\nDeletion Statistics (last 24 hours):`);
    console.log(`- Total deletions: ${stats.totalDeletions}`);
    stats.byTable.forEach((table: any) => {
      console.log(`  - ${table.table_name}: ${table.total_deletions}`);
    });

    // Log results
    await logDeletionRun({
      totalProcessed,
      succeeded: totalSucceeded,
      failed: totalFailed,
      durationMs: Date.now() - startTime,
    });

    const duration = Date.now() - startTime;
    console.log(`\nDeletion completed in ${duration}ms`);
  } catch (error) {
    console.error('Error during deletion:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

async function logDeletionRun(stats: any) {
  const query = `
    INSERT INTO retention_events
    (id, event_type, event_data)
    VALUES (gen_random_uuid(), 'DELETION_RUN', $1)
  `;

  await db.query(query, [JSON.stringify(stats)]);
}

// Run the script
deleteExpired();
