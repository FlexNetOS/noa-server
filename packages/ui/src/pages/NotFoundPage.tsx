/**
 * 404 Not Found Page
 * Shown when user navigates to non-existent route
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const NotFoundPage: React.FC = () => {
  const location = useLocation();

  return (
    <div className="page-container flex items-center justify-center min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        {/* 404 illustration */}
        <div className="mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-9xl font-bold text-blue-600 dark:text-blue-400"
          >
            404
          </motion.div>
        </div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold mb-4"
        >
          Page Not Found
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 dark:text-gray-400 mb-2"
        >
          The page you're looking for doesn't exist.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-gray-500 dark:text-gray-500 mb-8"
        >
          Path: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{location.pathname}</code>
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-4"
        >
          <Link
            to="/"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Go Back
          </button>
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-12"
        >
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            Quick links:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/chat"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Chat
            </Link>
            <Link
              to="/files"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Files
            </Link>
            <Link
              to="/analytics"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Analytics
            </Link>
            <Link
              to="/settings"
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Settings
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
