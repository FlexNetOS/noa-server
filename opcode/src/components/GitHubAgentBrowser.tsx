import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Download, Loader2, AlertCircle, Eye, Check, Globe, FileJson } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, type GitHubAgentFile, type AgentExport, type Agent } from '@/lib/api';
import { type AgentIconName } from './CCAgents';
import { ICON_MAP } from './IconPicker';
import { open } from '@tauri-apps/plugin-shell';

interface GitHubAgentBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

interface AgentPreview {
  file: GitHubAgentFile;
  data: AgentExport | null;
  loading: boolean;
  error: string | null;
}

export const GitHubAgentBrowser: React.FC<GitHubAgentBrowserProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [agents, setAgents] = useState<GitHubAgentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [existingAgents, setExistingAgents] = useState<Agent[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
      fetchExistingAgents();
    }
  }, [isOpen]);

  const fetchExistingAgents = async () => {
    try {
      const agents = await api.listAgents();
      setExistingAgents(agents);
    } catch (err) {
      console.error('Failed to fetch existing agents:', err);
    }
  };

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const agentFiles = await api.fetchGitHubAgents();
      setAgents(agentFiles);
    } catch (err) {
      console.error('Failed to fetch GitHub agents:', err);
      setError('Failed to fetch agents from GitHub. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewAgent = async (file: GitHubAgentFile) => {
    setSelectedAgent({
      file,
      data: null,
      loading: true,
      error: null,
    });

    try {
      const agentData = await api.fetchGitHubAgentContent(file.download_url);
      setSelectedAgent({
        file,
        data: agentData,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Failed to fetch agent content:', err);
      setSelectedAgent({
        file,
        data: null,
        loading: false,
        error: 'Failed to load agent details',
      });
    }
  };

  const isAgentImported = (fileName: string) => {
    const agentName = getAgentDisplayName(fileName);
    return existingAgents.some((agent) => agent.name.toLowerCase() === agentName.toLowerCase());
  };

  const handleImportAgent = async () => {
    if (!selectedAgent?.file) return;

    try {
      setImporting(true);
      await api.importAgentFromGitHub(selectedAgent.file.download_url);

      // Refresh existing agents list
      await fetchExistingAgents();

      // Close preview
      setSelectedAgent(null);

      // Notify parent
      onImportSuccess();
    } catch (err) {
      console.error('Failed to import agent:', err);
      alert(`Failed to import agent: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
    }
  };

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAgentDisplayName = (fileName: string) => {
    return fileName
      .replace('.opcode.json', '')
      .replace(/-/g, ' ')
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderIcon = (iconName: string) => {
    const Icon = ICON_MAP[iconName as AgentIconName] || ICON_MAP.bot;
    return <Icon className="h-8 w-8" />;
  };

  const handleGitHubLinkClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await open('https://github.com/getAsterisk/opcode/tree/main/cc_agents');
    } catch (error) {
      console.error('Failed to open GitHub link:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[80vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Import Agent from GitHub
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Repository Info */}
          <div className="bg-muted/50 mb-4 rounded-lg px-4 py-3">
            <p className="text-muted-foreground text-sm">
              Agents are fetched from{' '}
              <button
                onClick={handleGitHubLinkClick}
                className="text-primary inline-flex items-center gap-1 hover:underline"
              >
                github.com/getAsterisk/opcode/cc_agents
                <Globe className="h-3 w-3" />
              </button>
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              You can contribute your custom agents to the repository!
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <AlertCircle className="text-destructive mb-4 h-12 w-12" />
                <p className="text-muted-foreground mb-4 text-sm">{error}</p>
                <Button onClick={fetchAgents} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <FileJson className="text-muted-foreground mb-4 h-12 w-12" />
                <p className="text-muted-foreground text-sm">
                  {searchQuery ? 'No agents found matching your search' : 'No agents available'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {filteredAgents.map((agent, index) => (
                    <motion.div
                      key={agent.sha}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <Card
                        className="h-full cursor-pointer transition-shadow hover:shadow-lg"
                        onClick={() => handlePreviewAgent(agent)}
                      >
                        <CardContent className="p-4">
                          <div className="mb-3 flex items-start justify-between">
                            <div className="flex flex-1 items-center gap-3">
                              <div className="bg-primary/10 text-primary flex-shrink-0 rounded-lg p-2">
                                {/* Default to bot icon for now, will be loaded from preview */}
                                {(() => {
                                  const Icon = ICON_MAP.bot;
                                  return <Icon className="h-6 w-6" />;
                                })()}
                              </div>
                              <h3 className="line-clamp-2 text-sm font-semibold">
                                {getAgentDisplayName(agent.name)}
                              </h3>
                            </div>
                            {isAgentImported(agent.name) && (
                              <Badge variant="secondary" className="ml-2 flex-shrink-0">
                                <Check className="mr-1 h-3 w-3" />
                                Imported
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {(agent.size / 1024).toFixed(1)} KB
                          </p>
                        </CardContent>
                        <CardFooter className="p-4 pt-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewAgent(agent);
                            }}
                          >
                            <Eye className="mr-2 h-3 w-3" />
                            Preview
                          </Button>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Agent Preview Dialog */}
      <AnimatePresence>
        {selectedAgent && (
          <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
            <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle>Agent Preview</DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto">
                {selectedAgent.loading ? (
                  <div className="flex h-64 items-center justify-center">
                    <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                  </div>
                ) : selectedAgent.error ? (
                  <div className="flex h-64 flex-col items-center justify-center text-center">
                    <AlertCircle className="text-destructive mb-4 h-12 w-12" />
                    <p className="text-muted-foreground text-sm">{selectedAgent.error}</p>
                  </div>
                ) : selectedAgent.data ? (
                  <div className="space-y-4">
                    {/* Agent Info */}
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 text-primary rounded-lg p-3">
                        {renderIcon(selectedAgent.data.agent.icon)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{selectedAgent.data.agent.name}</h3>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="outline">{selectedAgent.data.agent.model}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* System Prompt */}
                    <div>
                      <h4 className="mb-2 text-sm font-medium">System Prompt</h4>
                      <div className="bg-muted max-h-48 overflow-y-auto rounded-lg p-3">
                        <pre className="font-mono text-xs whitespace-pre-wrap">
                          {selectedAgent.data.agent.system_prompt}
                        </pre>
                      </div>
                    </div>

                    {/* Default Task */}
                    {selectedAgent.data.agent.default_task && (
                      <div>
                        <h4 className="mb-2 text-sm font-medium">Default Task</h4>
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-sm">{selectedAgent.data.agent.default_task}</p>
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="text-muted-foreground text-xs">
                      <p>Version: {selectedAgent.data.version}</p>
                      <p>
                        Exported: {new Date(selectedAgent.data.exported_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Actions */}
              {selectedAgent.data && (
                <div className="mt-4 flex justify-end gap-2 border-t pt-4">
                  <Button variant="outline" onClick={() => setSelectedAgent(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImportAgent}
                    disabled={importing || isAgentImported(selectedAgent.file.name)}
                  >
                    {importing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : isAgentImported(selectedAgent.file.name) ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Already Imported
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Import Agent
                      </>
                    )}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </Dialog>
  );
};
