/**
 * Generate Retention Report Script
 *
 * Monthly cron job to generate comprehensive retention reports
 * Run: npm run generate-report
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import { RetentionReport, PolicyStats } from '../../types';

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function generateReport() {
  console.log('Generating retention report...');
  const startTime = Date.now();

  try {
    const report: RetentionReport = {
      generatedAt: new Date(),
      totalRecords: 0,
      expiringSoon: 0,
      readyForArchival: 0,
      readyForDeletion: 0,
      onLegalHold: 0,
      byPolicy: {},
    };

    // Total records under lifecycle management
    const totalQuery = `
      SELECT COUNT(*) as count
      FROM data_lifecycle
      WHERE deleted_at IS NULL
    `;
    const totalResult = await db.query(totalQuery);
    report.totalRecords = parseInt(totalResult.rows[0].count);

    // Expiring soon (30 days)
    const expiringSoonQuery = `
      SELECT COUNT(*) as count
      FROM data_lifecycle
      WHERE deleted_at IS NULL
        AND legal_hold = false
        AND expires_at > NOW()
        AND expires_at <= NOW() + INTERVAL '30 days'
    `;
    const expiringSoonResult = await db.query(expiringSoonQuery);
    report.expiringSoon = parseInt(expiringSoonResult.rows[0].count);

    // Ready for archival
    const readyForArchivalQuery = `
      SELECT COUNT(*) as count
      FROM data_lifecycle dl
      JOIN retention_policies rp ON dl.policy_id = rp.id
      WHERE dl.archived_at IS NULL
        AND dl.deleted_at IS NULL
        AND dl.legal_hold = false
        AND rp.archive_days IS NOT NULL
        AND dl.created_at <= NOW() - (rp.archive_days || ' days')::INTERVAL
    `;
    const readyForArchivalResult = await db.query(readyForArchivalQuery);
    report.readyForArchival = parseInt(readyForArchivalResult.rows[0].count);

    // Ready for deletion
    const readyForDeletionQuery = `
      SELECT COUNT(*) as count
      FROM data_lifecycle
      WHERE deleted_at IS NULL
        AND legal_hold = false
        AND expires_at <= NOW()
    `;
    const readyForDeletionResult = await db.query(readyForDeletionQuery);
    report.readyForDeletion = parseInt(readyForDeletionResult.rows[0].count);

    // On legal hold
    const legalHoldQuery = `
      SELECT COUNT(*) as count
      FROM data_lifecycle
      WHERE deleted_at IS NULL
        AND legal_hold = true
    `;
    const legalHoldResult = await db.query(legalHoldQuery);
    report.onLegalHold = parseInt(legalHoldResult.rows[0].count);

    // Statistics by policy
    const byPolicyQuery = `
      SELECT
        rp.policy_name,
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE dl.expires_at <= NOW()) as expired,
        COUNT(*) FILTER (WHERE dl.archived_at IS NOT NULL) as archived,
        COUNT(*) FILTER (WHERE dl.deleted_at IS NOT NULL) as deleted
      FROM retention_policies rp
      LEFT JOIN data_lifecycle dl ON rp.id = dl.policy_id
      WHERE rp.active = true
      GROUP BY rp.policy_name
      ORDER BY total_records DESC
    `;
    const byPolicyResult = await db.query(byPolicyQuery);

    byPolicyResult.rows.forEach((row) => {
      report.byPolicy[row.policy_name] = {
        policyName: row.policy_name,
        totalRecords: parseInt(row.total_records),
        expired: parseInt(row.expired),
        archived: parseInt(row.archived),
        deleted: parseInt(row.deleted),
      };
    });

    // Print report
    printReport(report);

    // Save report to database
    await saveReport(report);

    // Export to JSON file
    await exportReport(report);

    const duration = Date.now() - startTime;
    console.log(`\nReport generation completed in ${duration}ms`);
  } catch (error) {
    console.error('Error generating report:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

function printReport(report: RetentionReport) {
  console.log('\n========================================');
  console.log('DATA RETENTION REPORT');
  console.log('========================================');
  console.log(`Generated: ${report.generatedAt.toISOString()}\n`);

  console.log('OVERVIEW:');
  console.log(`- Total records under management: ${report.totalRecords.toLocaleString()}`);
  console.log(`- Expiring within 30 days: ${report.expiringSoon.toLocaleString()}`);
  console.log(`- Ready for archival: ${report.readyForArchival.toLocaleString()}`);
  console.log(`- Ready for deletion: ${report.readyForDeletion.toLocaleString()}`);
  console.log(`- On legal hold: ${report.onLegalHold.toLocaleString()}\n`);

  console.log('BY POLICY:');
  Object.values(report.byPolicy).forEach((policy) => {
    console.log(`\n${policy.policyName}:`);
    console.log(`  - Total records: ${policy.totalRecords.toLocaleString()}`);
    console.log(`  - Expired: ${policy.expired.toLocaleString()}`);
    console.log(`  - Archived: ${policy.archived.toLocaleString()}`);
    console.log(`  - Deleted: ${policy.deleted.toLocaleString()}`);
  });

  console.log('\n========================================\n');
}

async function saveReport(report: RetentionReport) {
  const query = `
    INSERT INTO retention_reports
    (id, report_type, generated_at, report_data, generated_by)
    VALUES ($1, $2, $3, $4, $5)
  `;

  await db.query(query, [
    uuidv4(),
    'MONTHLY',
    report.generatedAt,
    JSON.stringify(report),
    'SYSTEM_AUTOMATED',
  ]);

  console.log('Report saved to database');
}

async function exportReport(report: RetentionReport) {
  const fs = require('fs');
  const path = require('path');

  const reportsDir = path.join(__dirname, '../../../reports');

  // Create reports directory if it doesn't exist
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const filename = `retention-report-${report.generatedAt.toISOString().split('T')[0]}.json`;
  const filepath = path.join(reportsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

  console.log(`Report exported to: ${filepath}`);
}

// Run the script
generateReport();
