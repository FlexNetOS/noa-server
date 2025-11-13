/**
 * Dashboard Page
 * Main dashboard with widgets and analytics
 */

import React from 'react';
import { Dashboard } from '../components/dashboard/Dashboard';

const DashboardPage: React.FC = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Overview of your system metrics and analytics
        </p>
      </div>

      <Dashboard
        showToolbar
        allowEditing
        className="mt-6"
      />
    </div>
  );
};

export default DashboardPage;
