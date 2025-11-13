import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Toast, ToastContainer } from '@/components/ui/toast';
import { api, type MCPServer } from '@/lib/api';
import { MCPServerList } from './MCPServerList';
import { MCPAddServer } from './MCPAddServer';
import { MCPImportExport } from './MCPImportExport';

interface MCPManagerProps {
  /**
   * Callback to go back to the main view
   */
  onBack: () => void;
  /**
   * Optional className for styling
   */
  className?: string;
}

/**
 * Main component for managing MCP (Model Context Protocol) servers
 * Provides a comprehensive UI for adding, configuring, and managing MCP servers
 */
export const MCPManager: React.FC<MCPManagerProps> = ({ className: _className }) => {
  const [activeTab, setActiveTab] = useState('servers');
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load servers on mount
  useEffect(() => {
    loadServers();
  }, []);

  /**
   * Loads all MCP servers
   */
  const loadServers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('MCPManager: Loading servers...');
      const serverList = await api.mcpList();
      console.log('MCPManager: Received server list:', serverList);
      console.log('MCPManager: Server count:', serverList.length);
      setServers(serverList);
    } catch (err) {
      console.error('MCPManager: Failed to load MCP servers:', err);
      setError('Failed to load MCP servers. Make sure Claude Code is installed.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles server added event
   */
  const handleServerAdded = () => {
    loadServers();
    setToast({ message: 'MCP server added successfully!', type: 'success' });
    setActiveTab('servers');
  };

  /**
   * Handles server removed event
   */
  const handleServerRemoved = (name: string) => {
    setServers((prev) => prev.filter((s) => s.name !== name));
    setToast({ message: `Server "${name}" removed successfully!`, type: 'success' });
  };

  /**
   * Handles import completed event
   */
  const handleImportCompleted = (imported: number, failed: number) => {
    loadServers();
    if (failed === 0) {
      setToast({
        message: `Successfully imported ${imported} server${imported > 1 ? 's' : ''}!`,
        type: 'success',
      });
    } else {
      setToast({
        message: `Imported ${imported} server${imported > 1 ? 's' : ''}, ${failed} failed`,
        type: 'error',
      });
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex h-full max-w-6xl flex-col">
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-heading-1">MCP Servers</h1>
              <p className="text-body-small text-muted-foreground mt-1">
                Manage Model Context Protocol servers
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-destructive/10 border-destructive/50 text-body-small text-destructive mx-6 mb-4 flex items-center gap-2 rounded-lg border p-3"
            >
              <AlertCircle className="h-4 w-4" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6 grid h-auto w-full max-w-md grid-cols-3 p-1">
                <TabsTrigger value="servers" className="px-3 py-2.5">
                  Servers
                </TabsTrigger>
                <TabsTrigger value="add" className="px-3 py-2.5">
                  Add Server
                </TabsTrigger>
                <TabsTrigger value="import" className="px-3 py-2.5">
                  Import/Export
                </TabsTrigger>
              </TabsList>

              {/* Servers Tab */}
              <TabsContent value="servers" className="mt-6 space-y-6">
                <Card>
                  <MCPServerList
                    servers={servers}
                    loading={false}
                    onServerRemoved={handleServerRemoved}
                    onRefresh={loadServers}
                  />
                </Card>
              </TabsContent>

              {/* Add Server Tab */}
              <TabsContent value="add" className="mt-6 space-y-6">
                <Card>
                  <MCPAddServer
                    onServerAdded={handleServerAdded}
                    onError={(message: string) => setToast({ message, type: 'error' })}
                  />
                </Card>
              </TabsContent>

              {/* Import/Export Tab */}
              <TabsContent value="import" className="mt-6 space-y-6">
                <Card className="overflow-hidden">
                  <MCPImportExport
                    onImportCompleted={handleImportCompleted}
                    onError={(message: string) => setToast({ message, type: 'error' })}
                  />
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      <ToastContainer>
        {toast && (
          <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
        )}
      </ToastContainer>
    </div>
  );
};
