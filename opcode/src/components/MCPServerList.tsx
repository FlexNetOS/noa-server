import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  Globe,
  Terminal,
  Trash2,
  Play,
  CheckCircle,
  Loader2,
  RefreshCw,
  FolderOpen,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, type MCPServer } from '@/lib/api';
import { useTrackEvent } from '@/hooks';

interface MCPServerListProps {
  /**
   * List of MCP servers to display
   */
  servers: MCPServer[];
  /**
   * Whether the list is loading
   */
  loading: boolean;
  /**
   * Callback when a server is removed
   */
  onServerRemoved: (name: string) => void;
  /**
   * Callback to refresh the server list
   */
  onRefresh: () => void;
}

/**
 * Component for displaying a list of MCP servers
 * Shows servers grouped by scope with status indicators
 */
export const MCPServerList: React.FC<MCPServerListProps> = ({
  servers,
  loading,
  onServerRemoved,
  onRefresh,
}) => {
  const [removingServer, setRemovingServer] = useState<string | null>(null);
  const [testingServer, setTestingServer] = useState<string | null>(null);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const [copiedServer, setCopiedServer] = useState<string | null>(null);
  const [connectedServers] = useState<string[]>([]);

  // Analytics tracking
  const trackEvent = useTrackEvent();

  // Group servers by scope
  const serversByScope = servers.reduce(
    (acc, server) => {
      const scope = server.scope || 'local';
      if (!acc[scope]) acc[scope] = [];
      acc[scope].push(server);
      return acc;
    },
    {} as Record<string, MCPServer[]>
  );

  /**
   * Toggles expanded state for a server
   */
  const toggleExpanded = (serverName: string) => {
    setExpandedServers((prev) => {
      const next = new Set(prev);
      if (next.has(serverName)) {
        next.delete(serverName);
      } else {
        next.add(serverName);
      }
      return next;
    });
  };

  /**
   * Copies command to clipboard
   */
  const copyCommand = async (command: string, serverName: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedServer(serverName);
      setTimeout(() => setCopiedServer(null), 2000);
    } catch (error) {
      console.error('Failed to copy command:', error);
    }
  };

  /**
   * Removes a server
   */
  const handleRemoveServer = async (name: string) => {
    try {
      setRemovingServer(name);

      // Check if server was connected
      const wasConnected = connectedServers.includes(name);

      await api.mcpRemove(name);

      // Track server removal
      trackEvent.mcpServerRemoved({
        server_name: name,
        was_connected: wasConnected,
      });

      onServerRemoved(name);
    } catch (error) {
      console.error('Failed to remove server:', error);
    } finally {
      setRemovingServer(null);
    }
  };

  /**
   * Tests connection to a server
   */
  const handleTestConnection = async (name: string) => {
    try {
      setTestingServer(name);
      const result = await api.mcpTestConnection(name);
      const server = servers.find((s) => s.name === name);

      // Track connection result - result is a string message
      trackEvent.mcpServerConnected(name, true, server?.transport || 'unknown');

      // TODO: Show result in a toast or modal
      console.log('Test result:', result);
    } catch (error) {
      console.error('Failed to test connection:', error);

      trackEvent.mcpConnectionError({
        server_name: name,
        error_type: 'test_failed',
        retry_attempt: 0,
      });
    } finally {
      setTestingServer(null);
    }
  };

  /**
   * Gets icon for transport type
   */
  const getTransportIcon = (transport: string) => {
    switch (transport) {
      case 'stdio':
        return <Terminal className="h-4 w-4 text-amber-500" />;
      case 'sse':
        return <Globe className="h-4 w-4 text-emerald-500" />;
      default:
        return <Network className="h-4 w-4 text-blue-500" />;
    }
  };

  /**
   * Gets icon for scope
   */
  const getScopeIcon = (scope: string) => {
    switch (scope) {
      case 'local':
        return <User className="h-3 w-3 text-slate-500" />;
      case 'project':
        return <FolderOpen className="h-3 w-3 text-orange-500" />;
      case 'user':
        return <FileText className="h-3 w-3 text-purple-500" />;
      default:
        return null;
    }
  };

  /**
   * Gets scope display name
   */
  const getScopeDisplayName = (scope: string) => {
    switch (scope) {
      case 'local':
        return 'Local (Project-specific)';
      case 'project':
        return 'Project (Shared via .mcp.json)';
      case 'user':
        return 'User (All projects)';
      default:
        return scope;
    }
  };

  /**
   * Renders a single server item
   */
  const renderServerItem = (server: MCPServer) => {
    const isExpanded = expandedServers.has(server.name);
    const isCopied = copiedServer === server.name;

    return (
      <motion.div
        key={server.name}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="group border-border bg-card hover:bg-accent/5 hover:border-primary/20 overflow-hidden rounded-lg border p-4 transition-all"
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 rounded p-1.5">
                  {getTransportIcon(server.transport)}
                </div>
                <h4 className="truncate font-medium">{server.name}</h4>
                {server.status?.running && (
                  <Badge
                    variant="outline"
                    className="flex-shrink-0 gap-1 border-green-500/50 bg-green-500/10 text-green-600"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Running
                  </Badge>
                )}
              </div>

              {server.command && !isExpanded && (
                <div className="flex items-center gap-2">
                  <p
                    className="text-muted-foreground flex-1 truncate pl-9 font-mono text-xs"
                    title={server.command}
                  >
                    {server.command}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(server.name)}
                    className="hover:bg-primary/10 h-6 px-2 text-xs"
                  >
                    <ChevronDown className="mr-1 h-3 w-3" />
                    Show full
                  </Button>
                </div>
              )}

              {server.transport === 'sse' && server.url && !isExpanded && (
                <div className="overflow-hidden">
                  <p
                    className="text-muted-foreground truncate pl-9 font-mono text-xs"
                    title={server.url}
                  >
                    {server.url}
                  </p>
                </div>
              )}

              {Object.keys(server.env).length > 0 && !isExpanded && (
                <div className="text-muted-foreground flex items-center gap-1 pl-9 text-xs">
                  <span>Environment variables: {Object.keys(server.env).length}</span>
                </div>
              )}
            </div>

            <div className="flex flex-shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTestConnection(server.name)}
                disabled={testingServer === server.name}
                className="hover:bg-green-500/10 hover:text-green-600"
              >
                {testingServer === server.name ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveServer(server.name)}
                disabled={removingServer === server.name}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                {removingServer === server.name ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Expanded Details */}
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-border/50 space-y-3 border-t pt-2 pl-9"
            >
              {server.command && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground text-xs font-medium">Command</p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCommand(server.command!, server.name)}
                        className="hover:bg-primary/10 h-6 px-2 text-xs"
                      >
                        <Copy className="mr-1 h-3 w-3" />
                        {isCopied ? 'Copied!' : 'Copy'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(server.name)}
                        className="hover:bg-primary/10 h-6 px-2 text-xs"
                      >
                        <ChevronUp className="mr-1 h-3 w-3" />
                        Hide
                      </Button>
                    </div>
                  </div>
                  <p className="bg-muted/50 rounded p-2 font-mono text-xs break-all">
                    {server.command}
                  </p>
                </div>
              )}

              {server.args && server.args.length > 0 && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Arguments</p>
                  <div className="bg-muted/50 space-y-1 rounded p-2 font-mono text-xs">
                    {server.args.map((arg, idx) => (
                      <div key={idx} className="break-all">
                        <span className="text-muted-foreground mr-2">[{idx}]</span>
                        {arg}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {server.transport === 'sse' && server.url && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">URL</p>
                  <p className="bg-muted/50 rounded p-2 font-mono text-xs break-all">
                    {server.url}
                  </p>
                </div>
              )}

              {Object.keys(server.env).length > 0 && (
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">Environment Variables</p>
                  <div className="bg-muted/50 space-y-1 rounded p-2 font-mono text-xs">
                    {Object.entries(server.env).map(([key, value]) => (
                      <div key={key} className="break-all">
                        <span className="text-primary">{key}</span>
                        <span className="text-muted-foreground mx-1">=</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Configured Servers</h3>
          <p className="text-muted-foreground text-sm">
            {servers.length} server{servers.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Server List */}
      {servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-primary/10 mb-4 rounded-full p-4">
            <Network className="text-primary h-12 w-12" />
          </div>
          <p className="text-muted-foreground mb-2 font-medium">No MCP servers configured</p>
          <p className="text-muted-foreground text-sm">
            Add a server to get started with Model Context Protocol
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(serversByScope).map(([scope, scopeServers]) => (
            <div key={scope} className="space-y-3">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                {getScopeIcon(scope)}
                <span className="font-medium">{getScopeDisplayName(scope)}</span>
                <span className="text-muted-foreground/60">({scopeServers.length})</span>
              </div>
              <AnimatePresence>
                <div className="space-y-2">{scopeServers.map(renderServerItem)}</div>
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
