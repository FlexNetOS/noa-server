import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Loader2,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Import,
  ChevronDown,
  ChevronRight,
  FileJson,
  Globe,
  Download,
  Plus,
  History,
  Edit,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Toast } from '@/components/ui/toast';
import { api, type Agent, type AgentRunWithMetrics } from '@/lib/api';
import { open as openDialog, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { GitHubAgentBrowser } from '@/components/GitHubAgentBrowser';
import { CreateAgent } from '@/components/CreateAgent';
import { useTabState } from '@/hooks/useTabState';

export const Agents: React.FC = () => {
  const [activeTab, setActiveTab] = useState('agents');
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runningAgents, setRunningAgents] = useState<AgentRunWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showGitHubBrowser, setShowGitHubBrowser] = useState(false);
  const { createAgentTab } = useTabState();

  // Load agents on mount
  useEffect(() => {
    loadAgents();
    loadRunningAgents();
  }, []);

  // Refresh running agents periodically
  useEffect(() => {
    const interval = setInterval(() => {
      loadRunningAgents();
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const agents = await api.listAgents();
      setAgents(agents);
    } catch (error) {
      console.error('Failed to load agents:', error);
      setToast({ message: 'Failed to load agents', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadRunningAgents = async () => {
    try {
      const runs = await api.listAgentRunsWithMetrics();
      setRunningAgents(runs);
    } catch (error) {
      console.error('Failed to load running agents:', error);
    }
  };

  const handleRunAgent = async (agent: Agent) => {
    if (!agent.id) {
      setToast({ message: 'Agent ID is missing', type: 'error' });
      return;
    }

    // Import the dialog function
    const { open } = await import('@tauri-apps/plugin-dialog');

    try {
      // Prompt user to select a project directory
      const projectPath = await open({
        directory: true,
        multiple: false,
        title: `Select project directory for ${agent.name}`,
      });

      if (!projectPath) {
        // User cancelled
        return;
      }

      // Dispatch event to open agent execution in a new tab
      const tabId = `agent-exec-${agent.id}-${Date.now()}`;
      window.dispatchEvent(
        new CustomEvent('open-agent-execution', {
          detail: { agent, tabId, projectPath },
        })
      );

      setToast({ message: `Opening agent: ${agent.name}`, type: 'success' });
    } catch (error) {
      console.error('Failed to open agent:', error);
      setToast({ message: `Failed to open agent: ${agent.name}`, type: 'error' });
    }
  };

  const handleDeleteAgent = async () => {
    if (!agentToDelete || !agentToDelete.id) return;

    try {
      await api.deleteAgent(agentToDelete.id);
      setToast({ message: `Deleted agent: ${agentToDelete.name}`, type: 'success' });
      setAgents((prev) => prev.filter((a) => a.id !== agentToDelete.id));
      setShowDeleteDialog(false);
      setAgentToDelete(null);
    } catch (error) {
      console.error('Failed to delete agent:', error);
      setToast({ message: `Failed to delete agent: ${agentToDelete.name}`, type: 'error' });
    }
  };

  const handleImportFromFile = async () => {
    try {
      const selected = await openDialog({
        filters: [
          { name: 'opcode Agent', extensions: ['opcode.json', 'json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        multiple: false,
      });

      if (selected) {
        const importedAgent = await api.importAgentFromFile(selected as string);
        setToast({ message: `Imported agent: ${importedAgent.name}`, type: 'success' });
        loadAgents();
      }
    } catch (error) {
      console.error('Failed to import agent:', error);
      setToast({ message: 'Failed to import agent', type: 'error' });
    }
  };

  const handleExportAgent = async (agent: Agent) => {
    try {
      const path = await save({
        defaultPath: `${agent.name.toLowerCase().replace(/\s+/g, '-')}.opcode.json`,
        filters: [{ name: 'opcode Agent', extensions: ['opcode.json'] }],
      });

      if (path && agent.id) {
        await invoke('export_agent_to_file', { id: agent.id, filePath: path });
        setToast({ message: `Exported agent: ${agent.name}`, type: 'success' });
      }
    } catch (error) {
      console.error('Failed to export agent:', error);
      setToast({ message: 'Failed to export agent', type: 'error' });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="text-muted-foreground h-4 w-4" />;
    }
  };

  // Show CreateAgent component if creating
  if (showCreateAgent) {
    return (
      <CreateAgent
        onBack={() => setShowCreateAgent(false)}
        onAgentCreated={() => {
          setShowCreateAgent(false);
          loadAgents(); // Reload agents after creation
        }}
      />
    );
  }

  // Show CreateAgent component in edit mode
  if (editingAgent) {
    return (
      <CreateAgent
        agent={editingAgent}
        onBack={() => setEditingAgent(null)}
        onAgentCreated={() => {
          setEditingAgent(null);
          loadAgents(); // Reload agents after update
        }}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex h-full max-w-6xl flex-col">
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
              <p className="text-muted-foreground mt-1 text-sm">Manage your Claude Code agents</p>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Import className="mr-2 h-4 w-4" />
                    Import
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleImportFromFile}>
                    <FileJson className="mr-2 h-4 w-4" />
                    From File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowGitHubBrowser(true)}>
                    <Globe className="mr-2 h-4 w-4" />
                    From GitHub
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={() => setShowCreateAgent(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
            </div>
          </div>
        </div>

        {/* Toast notifications */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-6 mb-4"
            >
              <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
            </motion.div>
          )}
        </AnimatePresence>

        {showGitHubBrowser && (
          <GitHubAgentBrowser
            isOpen={showGitHubBrowser}
            onClose={() => setShowGitHubBrowser(false)}
            onImportSuccess={() => {
              loadAgents();
              setShowGitHubBrowser(false);
              setToast({ message: 'Agent imported successfully', type: 'success' });
            }}
          />
        )}

        <AnimatePresence>
          {showDeleteDialog && agentToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
              onClick={() => setShowDeleteDialog(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card mx-4 w-full max-w-md rounded-lg p-6 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="mb-4 text-lg font-semibold">Delete Agent</h3>
                <p className="text-muted-foreground mb-6">
                  Are you sure you want to delete "{agentToDelete.name}"? This action cannot be
                  undone.
                </p>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteAgent}>
                    Delete
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6 grid h-auto w-full max-w-md grid-cols-2 p-1">
              <TabsTrigger value="agents" className="px-3 py-2.5">
                <Bot className="mr-2 h-4 w-4" />
                Agents ({agents.length})
              </TabsTrigger>
              <TabsTrigger value="running" className="px-3 py-2.5">
                <History className="mr-2 h-4 w-4" />
                History ({runningAgents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="agents" className="flex-1 overflow-hidden">
              {loading ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                </div>
              ) : agents.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-center">
                  <Bot className="text-muted-foreground mb-4 h-12 w-12" />
                  <h3 className="mb-2 text-lg font-semibold">No Agents Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first agent to get started
                  </p>
                  <Button onClick={() => setShowCreateAgent(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Agent
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {agents.map((agent) => (
                    <Card key={agent.id} className="p-4 transition-shadow hover:shadow-md">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Bot className="text-primary h-5 w-5" />
                          <h3 className="font-semibold">{agent.name}</h3>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingAgent(agent)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRunAgent(agent)}>
                              <Play className="mr-2 h-4 w-4" />
                              Run
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportAgent(agent)}>
                              <Download className="mr-2 h-4 w-4" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setAgentToDelete(agent);
                                setShowDeleteDialog(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
                        No description provided
                      </p>

                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          v1.0.0
                        </Badge>
                        <Button size="sm" onClick={() => handleRunAgent(agent)}>
                          <Play className="mr-1 h-3 w-3" />
                          Run
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="running" className="mt-6 space-y-6">
              {runningAgents.length === 0 ? (
                <Card className="p-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <History className="text-muted-foreground mb-4 h-12 w-12" />
                    <h3 className="mb-2 text-lg font-semibold">No Agent History</h3>
                    <p className="text-muted-foreground">Run an agent to see it here</p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {runningAgents.map((run) => (
                    <Card key={run.id} className="p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(run.status)}
                          <h3 className="font-semibold">{run.agent_name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {run.status}
                          </Badge>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => createAgentTab(run.id?.toString() || '', run.agent_name)}
                          className="h-8 w-8"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Started:</span>
                          <p className="font-medium">{new Date(run.created_at).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <p className="font-medium">
                            {run.metrics?.duration_ms
                              ? `${(run.metrics.duration_ms / 1000).toFixed(1)}s`
                              : run.duration_ms
                                ? `${(run.duration_ms / 1000).toFixed(1)}s`
                                : '—'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tokens:</span>
                          <p className="font-medium">
                            {run.metrics?.total_tokens
                              ? run.metrics.total_tokens.toLocaleString()
                              : run.total_tokens
                                ? run.total_tokens.toLocaleString()
                                : '—'}
                          </p>
                        </div>
                      </div>

                      {run.status === 'failed' && (
                        <div className="bg-destructive/10 text-destructive mt-3 rounded p-2 text-sm">
                          Agent execution failed
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
