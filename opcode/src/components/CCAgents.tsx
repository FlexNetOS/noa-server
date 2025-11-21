import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Bot,
  ArrowLeft,
  History,
  Download,
  Upload,
  Globe,
  FileJson,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api, type Agent, type AgentRunWithMetrics } from '@/lib/api';
import { save, open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';
import { Toast, ToastContainer } from '@/components/ui/toast';
import { CreateAgent } from './CreateAgent';
import { AgentExecution } from './AgentExecution';
import { AgentRunsList } from './AgentRunsList';
import { GitHubAgentBrowser } from './GitHubAgentBrowser';
import { ICON_MAP } from './IconPicker';

interface CCAgentsProps {
  /**
   * Callback to go back to the main view
   */
  onBack: () => void;
  /**
   * Optional className for styling
   */
  className?: string;
}

// Available icons for agents - now using all icons from IconPicker
export const AGENT_ICONS = ICON_MAP;

export type AgentIconName = keyof typeof AGENT_ICONS;

/**
 * CCAgents component for managing Claude Code agents
 *
 * @example
 * <CCAgents onBack={() => setView('home')} />
 */
export const CCAgents: React.FC<CCAgentsProps> = ({ onBack, className }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runs, setRuns] = useState<AgentRunWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'execute'>('list');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  // const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [showGitHubBrowser, setShowGitHubBrowser] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const AGENTS_PER_PAGE = 9; // 3x3 grid

  useEffect(() => {
    loadAgents();
    loadRuns();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const agentsList = await api.listAgents();
      setAgents(agentsList);
    } catch (err) {
      console.error('Failed to load agents:', err);
      setError('Failed to load agents');
      setToast({ message: 'Failed to load agents', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadRuns = async () => {
    try {
      setRunsLoading(true);
      const runsList = await api.listAgentRuns();
      setRuns(runsList);
    } catch (err) {
      console.error('Failed to load runs:', err);
    } finally {
      setRunsLoading(false);
    }
  };

  /**
   * Initiates the delete agent process by showing the confirmation dialog
   * @param agent - The agent to be deleted
   */
  const handleDeleteAgent = (agent: Agent) => {
    setAgentToDelete(agent);
    setShowDeleteDialog(true);
  };

  /**
   * Confirms and executes the agent deletion
   * Only called when user explicitly confirms the deletion
   */
  const confirmDeleteAgent = async () => {
    if (!agentToDelete?.id) return;

    try {
      setIsDeleting(true);
      await api.deleteAgent(agentToDelete.id);
      setToast({ message: 'Agent deleted successfully', type: 'success' });
      await loadAgents();
      await loadRuns(); // Reload runs as they might be affected
    } catch (err) {
      console.error('Failed to delete agent:', err);
      setToast({ message: 'Failed to delete agent', type: 'error' });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setAgentToDelete(null);
    }
  };

  /**
   * Cancels the delete operation and closes the dialog
   */
  const cancelDeleteAgent = () => {
    setShowDeleteDialog(false);
    setAgentToDelete(null);
  };

  const handleEditAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setView('edit');
  };

  const handleExecuteAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setView('execute');
  };

  const handleAgentCreated = async () => {
    setView('list');
    await loadAgents();
    setToast({ message: 'Agent created successfully', type: 'success' });
  };

  const handleAgentUpdated = async () => {
    setView('list');
    await loadAgents();
    setToast({ message: 'Agent updated successfully', type: 'success' });
  };

  // const handleRunClick = (run: AgentRunWithMetrics) => {
  //   if (run.id) {
  //     setSelectedRunId(run.id);
  //     setView("viewRun");
  //   }
  // };

  const handleExecutionComplete = async () => {
    // Reload runs when returning from execution
    await loadRuns();
  };

  const handleExportAgent = async (agent: Agent) => {
    try {
      // Show native save dialog
      const filePath = await save({
        defaultPath: `${agent.name.toLowerCase().replace(/\s+/g, '-')}.opcode.json`,
        filters: [
          {
            name: 'opcode Agent',
            extensions: ['opcode.json'],
          },
        ],
      });

      if (!filePath) {
        // User cancelled the dialog
        return;
      }

      // Export the agent to the selected file
      await invoke('export_agent_to_file', {
        id: agent.id!,
        filePath,
      });

      setToast({ message: `Agent "${agent.name}" exported successfully`, type: 'success' });
    } catch (err) {
      console.error('Failed to export agent:', err);
      setToast({ message: 'Failed to export agent', type: 'error' });
    }
  };

  const handleImportAgent = async () => {
    try {
      // Show native open dialog
      const filePath = await open({
        multiple: false,
        filters: [
          {
            name: 'opcode Agent',
            extensions: ['opcode.json', 'json'],
          },
        ],
      });

      if (!filePath) {
        // User cancelled the dialog
        return;
      }

      // Import the agent from the selected file
      await api.importAgentFromFile(filePath as string);

      setToast({ message: 'Agent imported successfully', type: 'success' });
      await loadAgents();
    } catch (err) {
      console.error('Failed to import agent:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to import agent';
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(agents.length / AGENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * AGENTS_PER_PAGE;
  const paginatedAgents = agents.slice(startIndex, startIndex + AGENTS_PER_PAGE);

  const renderIcon = (iconName: string) => {
    const Icon = AGENT_ICONS[iconName as AgentIconName] || AGENT_ICONS.bot;
    return <Icon className="h-12 w-12" />;
  };

  if (view === 'create') {
    return <CreateAgent onBack={() => setView('list')} onAgentCreated={handleAgentCreated} />;
  }

  if (view === 'edit' && selectedAgent) {
    return (
      <CreateAgent
        agent={selectedAgent}
        onBack={() => setView('list')}
        onAgentCreated={handleAgentUpdated}
      />
    );
  }

  if (view === 'execute' && selectedAgent) {
    return (
      <AgentExecution
        agent={selectedAgent}
        onBack={() => {
          setView('list');
          handleExecutionComplete();
        }}
      />
    );
  }

  // Removed viewRun case - now using modal preview in AgentRunsList

  return (
    <div className={cn('bg-background flex h-full flex-col', className)}>
      <div className="mx-auto flex h-full w-full max-w-6xl flex-col p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-heading-1">CC Agents</h1>
                <p className="text-body-small text-muted-foreground mt-1">
                  Manage your Claude Code agents
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="default" variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Import
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleImportAgent}>
                    <FileJson className="mr-2 h-4 w-4" />
                    From File
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowGitHubBrowser(true)}>
                    <Globe className="mr-2 h-4 w-4" />
                    From GitHub
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={() => setView('create')}
                size="default"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create CC Agent
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Error display */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-destructive/50 bg-destructive/10 text-body-small text-destructive mb-4 rounded-lg border p-3"
          >
            {error}
          </motion.div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key="agents"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-8 pt-6"
            >
              {/* Agents Grid */}
              <div>
                {loading ? (
                  <div className="flex h-64 items-center justify-center">
                    <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
                  </div>
                ) : agents.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center text-center">
                    <Bot className="text-muted-foreground mb-4 h-16 w-16" />
                    <h3 className="text-heading-4 mb-2">No agents yet</h3>
                    <p className="text-body-small text-muted-foreground mb-4">
                      Create your first CC Agent to get started
                    </p>
                    <Button onClick={() => setView('create')} size="default">
                      <Plus className="mr-2 h-4 w-4" />
                      Create CC Agent
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <AnimatePresence mode="popLayout">
                        {paginatedAgents.map((agent, index) => (
                          <motion.div
                            key={agent.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                          >
                            <Card className="h-full transition-shadow hover:shadow-lg">
                              <CardContent className="flex flex-col items-center p-6 text-center">
                                <div className="bg-primary/10 text-primary mb-4 rounded-full p-4">
                                  {renderIcon(agent.icon)}
                                </div>
                                <h3 className="text-heading-4 mb-2">{agent.name}</h3>
                                <p className="text-caption text-muted-foreground">
                                  Created: {new Date(agent.created_at).toLocaleDateString()}
                                </p>
                              </CardContent>
                              <CardFooter className="flex flex-wrap justify-center gap-1 p-4 pt-0">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleExecuteAgent(agent)}
                                  className="flex items-center gap-1"
                                  title="Execute agent"
                                >
                                  <Play className="h-3 w-3" />
                                  Execute
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditAgent(agent)}
                                  className="flex items-center gap-1"
                                  title="Edit agent"
                                >
                                  <Edit className="h-3 w-3" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleExportAgent(agent)}
                                  className="flex items-center gap-1"
                                  title="Export agent to .opcode.json"
                                >
                                  <Upload className="h-3 w-3" />
                                  Export
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteAgent(agent)}
                                  className="text-destructive hover:text-destructive flex items-center gap-1"
                                  title="Delete agent"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </Button>
                              </CardFooter>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-6 flex justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-body-small flex items-center px-3">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Execution History */}
              {!loading && agents.length > 0 && (
                <div className="overflow-hidden">
                  <div className="mb-4 flex items-center gap-2">
                    <History className="text-muted-foreground h-5 w-5" />
                    <h2 className="text-heading-4">Recent Executions</h2>
                  </div>
                  {runsLoading ? (
                    <div className="flex h-32 items-center justify-center">
                      <div className="border-primary h-6 w-6 animate-spin rounded-full border-b-2"></div>
                    </div>
                  ) : (
                    <AgentRunsList runs={runs} />
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Toast Notification */}
      <ToastContainer>
        {toast && (
          <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
        )}
      </ToastContainer>

      {/* GitHub Agent Browser */}
      <GitHubAgentBrowser
        isOpen={showGitHubBrowser}
        onClose={() => setShowGitHubBrowser(false)}
        onImportSuccess={async () => {
          setShowGitHubBrowser(false);
          await loadAgents();
          setToast({ message: 'Agent imported successfully from GitHub', type: 'success' });
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="text-destructive h-5 w-5" />
              Delete Agent
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the agent "{agentToDelete?.name}"? This action cannot
              be undone and will permanently remove the agent and all its associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={cancelDeleteAgent}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteAgent}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              {isDeleting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Agent
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
