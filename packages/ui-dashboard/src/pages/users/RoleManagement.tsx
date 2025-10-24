import React, { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import type { UserRole, Permission } from '../../types/user';

export function RoleManagement() {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles');
      const data = await response.json();
      setRoles(data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/admin/permissions');
      const data = await response.json();
      setAvailablePermissions(data);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const handleEdit = (role: UserRole) => {
    setSelectedRole(role);
    setShowEditModal(true);
  };

  const handleDelete = async (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (role?.isSystem) {
      alert('System roles cannot be deleted');
      return;
    }

    if (!confirm('Are you sure you want to delete this role?')) {
      return;
    }

    try {
      await fetch(`/api/admin/roles/${roleId}`, { method: 'DELETE' });
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  };

  // Group permissions by resource
  const groupedPermissions = availablePermissions.reduce(
    (acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6 flex flex-none items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Role Management</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage user roles and permissions
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Add Role
        </button>
      </div>

      {/* Roles Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="p-6">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {role.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {role.description}
                    </p>
                  </div>

                  {role.isSystem && (
                    <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      System
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Permission Level</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {role.level}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: `${(role.level / 100) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    Permissions ({role.permissions.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 6).map((permission) => (
                      <span
                        key={permission.id}
                        className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                      >
                        {permission.resource}:{permission.action}
                      </span>
                    ))}
                    {role.permissions.length > 6 && (
                      <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                        +{role.permissions.length - 6} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(role)}
                    className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(role.id)}
                    disabled={role.isSystem}
                    className="rounded bg-red-100 px-3 py-2 text-sm text-red-700 transition-colors hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                    aria-label="Delete role"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {(showEditModal || showCreateModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={() => {
              setShowEditModal(false);
              setShowCreateModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-gray-800"
            >
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                {showEditModal ? 'Edit Role' : 'Create Role'}
              </h3>

              <div className="mb-6 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role Name
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedRole?.name}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    defaultValue={selectedRole?.description}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Permission Level (0-100)
                  </label>
                  <input
                    type="number"
                    defaultValue={selectedRole?.level}
                    min="0"
                    max="100"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Permissions
                  </label>
                  <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-300 p-4 dark:border-gray-600">
                    {Object.entries(groupedPermissions).map(([resource, permissions]) => (
                      <div key={resource} className="mb-4 last:mb-0">
                        <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                          {resource.charAt(0).toUpperCase() + resource.slice(1)}
                        </h4>
                        <div className="space-y-2 pl-4">
                          {permissions.map((permission) => (
                            <label key={permission.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                defaultChecked={selectedRole?.permissions.some(
                                  (p) => p.id === permission.id
                                )}
                                className="rounded border-gray-300 dark:border-gray-600"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {permission.action}
                                {permission.scope && ` (${permission.scope})`}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setShowCreateModal(false);
                  }}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
                  {showEditModal ? 'Save Changes' : 'Create Role'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RoleManagement;
