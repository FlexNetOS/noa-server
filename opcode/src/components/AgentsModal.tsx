import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Plus,
  Loader2,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Import,
  ChevronDown,
  FileJson,
  Globe,
  Download,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toast } from '@/components/ui/toast';
import { api, type Agent, type AgentRunWithMetrics } from '@/lib/api';
import { useTabState } from '@/hooks/useTabState';
import { formatISOTimestamp } from '@/lib/date-utils';
import { open as openDialog, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { GitHubAgentBrowser } from '@/components/GitHubAgentBrowser';

interface AgentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AgentsModal: React.FC<AgentsModalProps> = ({ open, onOpenChange }) => {
  const [activeTab, setActiveTab] = useState('agents');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runningAgents, setRunningAgents] = useState<AgentRunWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showGitHubBrowser, setShowGitHubBrowser] = useState(false);
  const { createAgentTab, createCreateAgentTab } = useTabState();

  // Load agents when modal opens
  useEffect(() => {
    if (open) {
      loadAgents();
      loadRunningAgents();
    }
  }, [open]);

  // Refresh running agents periodically
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      loadRunningAgents();
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [open]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const agentList = await api.listAgents();
      setAgents(agentList);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRunningAgents = async () => {
    try {
      const runs = await api.listRunningAgentSessions();
      const agentRuns = runs.map(
        (run) =>
          ({
            id: run.id,
            agent_id: run.agent_id,
            agent_name: run.agent_name,
            task: run.task,
            model: run.model,
            status: 'running' as const,
            created_at: run.created_at,
            project_path: run.project_path,
          }) as AgentRunWithMetrics
      );

      setRunningAgents(agentRuns);
    } catch (error) {
      console.error('Failed to load running agents:', error);
    }
  };

  const handleRunAgent = async (agent: Agent) => {
    // Open directory picker for project path
    const { open } = await import('@tauri-apps/plugin-dialog');

    try {
      const projectPath = await open({
        directory: true,
        multiple: false,
        title: `Select project directory for ${agent.name}`,
      });

      if (!projectPath) {
        // User cancelled
        return;
      }

      // Create a new agent execution tab
      const tabId = `agent-exec-${agent.id}-${Date.now()}`;

      // Close modal
      onOpenChange(false);

      // Dispatch event to open agent execution in the new tab with project path
      window.dispatchEvent(
        new CustomEvent('open-agent-execution', {
          detail: { agent, tabId, projectPath },
        })
      );
    } catch (error) {
      console.error('Failed to run agent:', error);
      setToast({ message: `Failed to run agent: ${agent.name}`, type: 'error' });
    }
  };

  const handleDeleteAgent = async (agent: Agent) => {
    setAgentToDelete(agent);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!agentToDelete?.id) return;
    try {
      await api.deleteAgent(agentToDelete.id);
      loadAgents(); // Refresh the list
      setShowDeleteDialog(false);
      setAgentToDelete(null);
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const handleOpenAgentRun = (run: AgentRunWithMetrics) => {
    // Create new tab for this agent run
    createAgentTab(run.id!.toString(), run.agent_name);
    onOpenChange(false);
  };

  const handleCreateAgent = () => {
    // Close modal and create new tab
    onOpenChange(false);
    createCreateAgentTab();
  };

  const handleImportFromFile = async () => {
    try {
      const filePath = await openDialog({
        multiple: false,
        filters: [
          {
            name: 'JSON',
            extensions: ['json'],
          },
        ],
      });

      if (filePath) {
        const agent = await api.importAgentFromFile(filePath as string);
        loadAgents(); // Refresh list
        setToast({ message: `Agent "${agent.name}" imported successfully`, type: 'success' });
      }
    } catch (error) {
      console.error('Failed to import agent:', error);
      setToast({ message: 'Failed to import agent', type: 'error' });
    }
  };

  const handleImportFromGitHub = () => {
    setShowGitHubBrowser(true);
  };

  const handleExportAgent = async (agent: Agent) => {
    try {
      const exportData = await api.exportAgent(agent.id!);
      const filePath = await save({
        defaultPath: `${agent.name.toLowerCase().replace(/\s+/g, '-')}.json`,
        filters: [
          {
            name: 'JSON',
            extensions: ['json'],
          },
        ],
      });

      if (filePath) {
        await invoke('write_file', {
          path: filePath,
          content: JSON.stringify(exportData, null, 2),
        });
        setToast({ message: 'Agent exported successfully', type: 'success' });
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[600px] max-w-4xl flex-col p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Agent Management
            </DialogTitle>
            <DialogDescription>
              Create new agents or manage running agent executions
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col">
            <TabsList className="mx-6">
              <TabsTrigger value="agents">Available Agents</TabsTrigger>
              <TabsTrigger value="running" className="relative">
                Running Agents
                {runningAgents.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {runningAgents.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="agents" className="m-0 h-full">
                <ScrollArea className="h-full px-6 pb-6">
                  {/* Action buttons at the top */}
                  <div className="mb-4 flex gap-2 pt-4">
                    <Button onClick={handleCreateAgent} className="flex-1">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Agent
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex-1">
                          <Import className="mr-2 h-4 w-4" />
                          Import Agent
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={handleImportFromFile}>
                          <FileJson className="mr-2 h-4 w-4" />
                          From File
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleImportFromGitHub}>
                          <Globe className="mr-2 h-4 w-4" />
                          From GitHub
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {loading ? (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                    </div>
                  ) : agents.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <Bot className="text-muted-foreground mb-4 h-12 w-12" />
                      <p className="mb-2 text-lg font-medium">No agents available</p>
                      <p className="text-muted-foreground mb-4 text-sm">
                        Create your first agent to get started
                      </p>
                      <Button
                        onClick={() => {
                          onOpenChange(false);
                          window.dispatchEvent(new CustomEvent('open-create-agent-tab'));
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Agent
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-4 py-4">
                      {agents.map((agent) => (
                        <motion.div
                          key={agent.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="hover:bg-muted/50 rounded-lg border p-4 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="flex items-center gap-2 font-medium">
                                <Bot className="h-4 w-4" />
                                {agent.name}
                              </h3>
                              {agent.default_task && (
                                <p className="text-muted-foreground mt-1 text-sm">
                                  {agent.default_task}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleExportAgent(agent)}
                              >
                                <Download className="mr-1 h-3 w-3" />
                                Export
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteAgent(agent)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Delete
                              </Button>
                              <Button size="sm" onClick={() => handleRunAgent(agent)}>
                                <Play className="mr-1 h-3 w-3" />
                                Run
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="running" className="m-0 h-full">
                <ScrollArea className="h-full px-6 pb-6">
                  {runningAgents.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <Clock className="text-muted-foreground mb-4 h-12 w-12" />
                      <p className="mb-2 text-lg font-medium">No running agents</p>
                      <p className="text-muted-foreground text-sm">
                        Agent executions will appear here when started
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 py-4">
                      <AnimatePresence mode="popLayout">
                        {runningAgents.map((run) => (
                          <motion.div
                            key={run.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="hover:bg-muted/50 cursor-pointer rounded-lg border p-4 transition-colors"
                            onClick={() => handleOpenAgentRun(run)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="flex items-center gap-2 font-medium">
                                  {getStatusIcon(run.status)}
                                  {run.agent_name}
                                </h3>
                                <p className="text-muted-foreground mt-1 text-sm">{run.task}</p>
                                <div className="text-muted-foreground mt-2 flex items-center gap-4 text-xs">
                                  <span>Started: {formatISOTimestamp(run.created_at)}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {run.model === 'opus' ? 'Claude 4 Opus' : 'Claude 4 Sonnet'}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenAgentRun(run);
                                }}
                              >
                                View
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Agent</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{agentToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setAgentToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* GitHub Agent Browser */}
      <GitHubAgentBrowser
        isOpen={showGitHubBrowser}
        onClose={() => setShowGitHubBrowser(false)}
        onImportSuccess={() => {
          setShowGitHubBrowser(false);
          loadAgents(); // Refresh the agents list
          setToast({ message: 'Agent imported successfully', type: 'success' });
        }}
      />

      {/* Toast notifications */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </>
  );
};

export default AgentsModal;
