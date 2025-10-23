/**
 * Check Expiry Script
 *
 * Daily cron job to check for expiring data and send notifications
 * Run: npm run check-expiry
 */

import { Pool } from 'pg';

import { RetentionPolicyEngine } from '../../RetentionPolicyEngine';

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function checkExpiry() {
  console.log('Starting expiry check...');
  const startTime = Date.now();

  const engine = new RetentionPolicyEngine(db);

  try {
    // Get records expiring within 7, 30, and 90 days
    const expiring7Days = await engine.getExpiringRecords(7);
    const expiring30Days = await engine.getExpiringRecords(30);
    const expiring90Days = await engine.getExpiringRecords(90);

    console.log(`\nExpiry Report:`);
    console.log(`- Expiring within 7 days: ${expiring7Days.length}`);
    console.log(`- Expiring within 30 days: ${expiring30Days.length}`);
    console.log(`- Expiring within 90 days: ${expiring90Days.length}`);

    // Get expired records
    const expired = await engine.getExpiredRecords();
    console.log(`- Already expired: ${expired.length}`);

    // Send notifications for critical expirations
    if (expiring7Days.length > 0) {
      await sendExpiryNotification(expiring7Days, 7);
    }

    // Log results
    await logExpiryCheck({
      expiring7Days: expiring7Days.length,
      expiring30Days: expiring30Days.length,
      expiring90Days: expiring90Days.length,
      expired: expired.length,
    });

    const duration = Date.now() - startTime;
    console.log(`\nExpiry check completed in ${duration}ms`);
  } catch (error) {
    console.error('Error during expiry check:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

async function sendExpiryNotification(records: any[], days: number) {
  console.log(
    `\nSending expiry notifications for ${records.length} records expiring within ${days} days...`
  );

  // Group by policy
  const byPolicy: Record<string, number> = {};

  records.forEach((record) => {
    byPolicy[record.policy_name] = (byPolicy[record.policy_name] || 0) + 1;
  });

  console.log('By policy:');
  Object.entries(byPolicy).forEach(([policy, count]) => {
    console.log(`  - ${policy}: ${count} records`);
  });

  // In production, send email/slack notifications
  // await sendEmail({
  //   to: 'data-compliance@example.com',
  //   subject: `Data Expiry Alert: ${records.length} records expiring within ${days} days`,
  //   body: ...
  // });
}

async function logExpiryCheck(stats: any) {
  const query = `
    INSERT INTO retention_events
    (id, event_type, event_data)
    VALUES (gen_random_uuid(), 'EXPIRY_CHECK', $1)
  `;

  await db.query(query, [JSON.stringify(stats)]);
}

// Run the script
checkExpiry();
