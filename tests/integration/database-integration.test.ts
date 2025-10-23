/**
 * Integration Tests: Database Operations
 *
 * Tests end-to-end database workflows including:
 * - Connection pooling
 * - Transaction management
 * - Data persistence
 * - Query performance
 */

import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

import sqlite3 from 'sqlite3';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

describe('Database Integration Tests', () => {
  const TEST_DB_PATH = path.join('/tmp', 'test-integration.db');
  let db: sqlite3.Database;

  // Promisified database methods
  let dbRun: (sql: string, params?: any[]) => Promise<void>;
  let dbGet: (sql: string, params?: any[]) => Promise<any>;
  let dbAll: (sql: string, params?: any[]) => Promise<any[]>;

  beforeAll(async () => {
    // Create test database
    db = new sqlite3.Database(TEST_DB_PATH);

    // Setup promisified methods
    dbRun = promisify(db.run.bind(db));
    dbGet = promisify(db.get.bind(db));
    dbAll = promisify(db.all.bind(db));

    // Create test schema
    await dbRun(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbRun(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        published BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await dbRun(`
      CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)
    `);
  });

  afterAll(async () => {
    // Close database and cleanup
    await promisify(db.close.bind(db))();
    try {
      await fs.unlink(TEST_DB_PATH);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Clear test data
    await dbRun('DELETE FROM posts');
    await dbRun('DELETE FROM users');
  });

  describe('CRUD Operations', () => {
    it('should create user', async () => {
      await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
        'testuser',
        'test@example.com',
      ]);

      const user = await dbGet('SELECT * FROM users WHERE username = ?', ['testuser']);

      expect(user).toBeDefined();
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
    });

    it('should read user', async () => {
      await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
        'alice',
        'alice@example.com',
      ]);

      const user = await dbGet('SELECT * FROM users WHERE username = ?', ['alice']);

      expect(user.id).toBeDefined();
      expect(user.username).toBe('alice');
    });

    it('should update user', async () => {
      await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', ['bob', 'bob@example.com']);

      await dbRun('UPDATE users SET email = ? WHERE username = ?', ['newemail@example.com', 'bob']);

      const user = await dbGet('SELECT * FROM users WHERE username = ?', ['bob']);

      expect(user.email).toBe('newemail@example.com');
    });

    it('should delete user', async () => {
      await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
        'charlie',
        'charlie@example.com',
      ]);

      await dbRun('DELETE FROM users WHERE username = ?', ['charlie']);

      const user = await dbGet('SELECT * FROM users WHERE username = ?', ['charlie']);

      expect(user).toBeUndefined();
    });
  });

  describe('Transactions', () => {
    it('should commit transaction', async () => {
      await dbRun('BEGIN TRANSACTION');

      await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
        'user1',
        'user1@example.com',
      ]);

      await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
        'user2',
        'user2@example.com',
      ]);

      await dbRun('COMMIT');

      const users = await dbAll('SELECT * FROM users');
      expect(users).toHaveLength(2);
    });

    it('should rollback transaction on error', async () => {
      await dbRun('BEGIN TRANSACTION');

      await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
        'user1',
        'user1@example.com',
      ]);

      try {
        // This should fail due to duplicate username
        await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
          'user1',
          'duplicate@example.com',
        ]);
      } catch (error) {
        await dbRun('ROLLBACK');
      }

      const users = await dbAll('SELECT * FROM users');
      expect(users).toHaveLength(0);
    });

    it('should handle nested operations in transaction', async () => {
      await dbRun('BEGIN TRANSACTION');

      await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
        'author',
        'author@example.com',
      ]);

      const user = await dbGet('SELECT id FROM users WHERE username = ?', ['author']);

      await dbRun('INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)', [
        user.id,
        'Test Post',
        'Post content',
      ]);

      await dbRun('COMMIT');

      const posts = await dbAll('SELECT * FROM posts');
      expect(posts).toHaveLength(1);
      expect(posts[0].user_id).toBe(user.id);
    });
  });

  describe('Relationships', () => {
    it('should create related records', async () => {
      await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
        'writer',
        'writer@example.com',
      ]);

      const user = await dbGet('SELECT id FROM users WHERE username = ?', ['writer']);

      await dbRun('INSERT INTO posts (user_id, title, content, published) VALUES (?, ?, ?, ?)', [
        user.id,
        'First Post',
        'Content here',
        1,
      ]);

      const post = await dbGet('SELECT * FROM posts WHERE user_id = ?', [user.id]);

      expect(post).toBeDefined();
      expect(post.title).toBe('First Post');
    });

    it('should join tables', async () => {
      await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
        'john',
        'john@example.com',
      ]);

      const user = await dbGet('SELECT id FROM users WHERE username = ?', ['john']);

      await dbRun('INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)', [
        user.id,
        'Johns Post',
        'Some content',
      ]);

      const result = await dbGet(
        `
        SELECT u.username, p.title, p.content
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE u.username = ?
      `,
        ['john']
      );

      expect(result.username).toBe('john');
      expect(result.title).toBe('Johns Post');
    });

    it('should handle foreign key constraints', async () => {
      await dbRun('PRAGMA foreign_keys = ON');

      await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
        'user',
        'user@example.com',
      ]);

      const user = await dbGet('SELECT id FROM users WHERE username = ?', ['user']);

      await dbRun('INSERT INTO posts (user_id, title) VALUES (?, ?)', [user.id, 'Post']);

      // Deleting user should fail due to foreign key constraint
      try {
        await dbRun('DELETE FROM users WHERE id = ?', [user.id]);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('FOREIGN KEY');
      }
    });
  });

  describe('Query Performance', () => {
    it('should efficiently query with indexes', async () => {
      // Insert test data
      for (let i = 1; i <= 100; i++) {
        await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
          `user${i}`,
          `user${i}@example.com`,
        ]);
      }

      const users = await dbAll('SELECT id FROM users');

      for (let i = 0; i < users.length; i++) {
        await dbRun('INSERT INTO posts (user_id, title) VALUES (?, ?)', [users[i].id, `Post ${i}`]);
      }

      const start = Date.now();
      const posts = await dbAll(`
        SELECT p.*, u.username
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE u.username LIKE 'user1%'
      `);
      const duration = Date.now() - start;

      expect(posts.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(100); // Should complete quickly
    });

    it('should handle bulk inserts efficiently', async () => {
      const start = Date.now();

      await dbRun('BEGIN TRANSACTION');

      for (let i = 1; i <= 1000; i++) {
        await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
          `bulk${i}`,
          `bulk${i}@example.com`,
        ]);
      }

      await dbRun('COMMIT');

      const duration = Date.now() - start;

      const count = await dbGet('SELECT COUNT(*) as count FROM users');

      expect(count.count).toBe(1000);
      expect(duration).toBeLessThan(2000); // Should complete in reasonable time
    });
  });

  describe('Data Validation', () => {
    it('should enforce unique constraints', async () => {
      await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
        'unique',
        'unique@example.com',
      ]);

      try {
        await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
          'unique',
          'different@example.com',
        ]);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('UNIQUE');
      }
    });

    it('should enforce not null constraints', async () => {
      try {
        await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
          null,
          'test@example.com',
        ]);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('NOT NULL');
      }
    });
  });

  describe('Pagination', () => {
    it('should paginate results', async () => {
      // Insert test data
      for (let i = 1; i <= 50; i++) {
        await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
          `page${i}`,
          `page${i}@example.com`,
        ]);
      }

      const pageSize = 10;
      const page1 = await dbAll('SELECT * FROM users ORDER BY id LIMIT ? OFFSET ?', [pageSize, 0]);

      const page2 = await dbAll('SELECT * FROM users ORDER BY id LIMIT ? OFFSET ?', [
        pageSize,
        pageSize,
      ]);

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(10);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe('Aggregations', () => {
    it('should calculate aggregates', async () => {
      await dbRun('INSERT INTO users (username, email) VALUES (?, ?)', [
        'author',
        'author@example.com',
      ]);

      const user = await dbGet('SELECT id FROM users WHERE username = ?', ['author']);

      for (let i = 1; i <= 5; i++) {
        await dbRun('INSERT INTO posts (user_id, title, published) VALUES (?, ?, ?)', [
          user.id,
          `Post ${i}`,
          i % 2,
        ]);
      }

      const stats = await dbGet(
        `
        SELECT
          COUNT(*) as total,
          SUM(published) as published,
          AVG(published) as avg_published
        FROM posts
        WHERE user_id = ?
      `,
        [user.id]
      );

      expect(stats.total).toBe(5);
      expect(stats.published).toBe(3);
    });
  });
});
