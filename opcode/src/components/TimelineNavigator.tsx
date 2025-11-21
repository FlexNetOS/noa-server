import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  GitBranch,
  Save,
  RotateCcw,
  GitFork,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Hash,
  FileCode,
  Diff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  api,
  type Checkpoint,
  type TimelineNode,
  type SessionTimeline,
  type CheckpointDiff,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useTrackEvent } from '@/hooks';

interface TimelineNavigatorProps {
  sessionId: string;
  projectId: string;
  projectPath: string;
  currentMessageIndex: number;
  onCheckpointSelect: (checkpoint: Checkpoint) => void;
  onFork: (checkpointId: string) => void;
  /**
   * Incrementing value provided by parent to force timeline reload when checkpoints
   * are created elsewhere (e.g., auto-checkpoint after tool execution).
   */
  refreshVersion?: number;
  /**
   * Callback when a new checkpoint is created
   */
  onCheckpointCreated?: () => void;
  className?: string;
}

/**
 * Visual timeline navigator for checkpoint management
 */
export const TimelineNavigator: React.FC<TimelineNavigatorProps> = ({
  sessionId,
  projectId,
  projectPath,
  currentMessageIndex,
  onCheckpointSelect,
  onFork,
  refreshVersion = 0,
  onCheckpointCreated,
  className,
}) => {
  const [timeline, setTimeline] = useState<SessionTimeline | null>(null);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDiffDialog, setShowDiffDialog] = useState(false);
  const [checkpointDescription, setCheckpointDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diff, setDiff] = useState<CheckpointDiff | null>(null);
  const [compareCheckpoint, setCompareCheckpoint] = useState<Checkpoint | null>(null);

  // Analytics tracking
  const trackEvent = useTrackEvent();

  // IME composition state
  const isIMEComposingRef = React.useRef(false);

  // Load timeline on mount and whenever refreshVersion bumps
  useEffect(() => {
    loadTimeline();
  }, [sessionId, projectId, projectPath, refreshVersion]);

  const loadTimeline = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const timelineData = await api.getSessionTimeline(sessionId, projectId, projectPath);
      setTimeline(timelineData);

      // Auto-expand nodes with current checkpoint
      if (timelineData.currentCheckpointId && timelineData.rootNode) {
        const pathToNode = findPathToCheckpoint(
          timelineData.rootNode,
          timelineData.currentCheckpointId
        );
        setExpandedNodes(new Set(pathToNode));
      }
    } catch (err) {
      console.error('Failed to load timeline:', err);
      setError('Failed to load timeline');
    } finally {
      setIsLoading(false);
    }
  };

  const findPathToCheckpoint = (
    node: TimelineNode,
    checkpointId: string,
    path: string[] = []
  ): string[] => {
    if (node.checkpoint.id === checkpointId) {
      return path;
    }

    for (const child of node.children) {
      const childPath = findPathToCheckpoint(child, checkpointId, [...path, node.checkpoint.id]);
      if (childPath.length > path.length) {
        return childPath;
      }
    }

    return path;
  };

  const handleCreateCheckpoint = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const sessionStartTime = Date.now(); // Using current time as we don't have session start time

      await api.createCheckpoint(
        sessionId,
        projectId,
        projectPath,
        currentMessageIndex,
        checkpointDescription || undefined
      );

      // Track checkpoint creation
      const checkpointNumber = timeline ? timeline.totalCheckpoints + 1 : 1;
      trackEvent.checkpointCreated({
        checkpoint_number: checkpointNumber,
        session_duration_at_checkpoint: Date.now() - sessionStartTime,
      });

      // Call parent callback if provided
      if (onCheckpointCreated) {
        onCheckpointCreated();
      }

      setCheckpointDescription('');
      setShowCreateDialog(false);
      await loadTimeline();
    } catch (err) {
      console.error('Failed to create checkpoint:', err);
      setError('Failed to create checkpoint');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreCheckpoint = async (checkpoint: Checkpoint) => {
    if (
      !confirm(
        `Restore to checkpoint "${checkpoint.description || checkpoint.id.slice(0, 8)}"? Current state will be saved as a new checkpoint.`
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const checkpointTime = new Date(checkpoint.timestamp).getTime();
      const timeSinceCheckpoint = Date.now() - checkpointTime;

      // First create a checkpoint of current state
      await api.createCheckpoint(
        sessionId,
        projectId,
        projectPath,
        currentMessageIndex,
        'Auto-save before restore'
      );

      // Then restore
      await api.restoreCheckpoint(checkpoint.id, sessionId, projectId, projectPath);

      // Track checkpoint restoration
      trackEvent.checkpointRestored({
        checkpoint_id: checkpoint.id,
        time_since_checkpoint_ms: timeSinceCheckpoint,
      });

      await loadTimeline();
      onCheckpointSelect(checkpoint);
    } catch (err) {
      console.error('Failed to restore checkpoint:', err);
      setError('Failed to restore checkpoint');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFork = async (checkpoint: Checkpoint) => {
    onFork(checkpoint.id);
  };

  const handleCompositionStart = () => {
    isIMEComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    setTimeout(() => {
      isIMEComposingRef.current = false;
    }, 0);
  };

  const handleCompare = async (checkpoint: Checkpoint) => {
    if (!selectedCheckpoint) {
      setSelectedCheckpoint(checkpoint);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const diffData = await api.getCheckpointDiff(
        selectedCheckpoint.id,
        checkpoint.id,
        sessionId,
        projectId
      );

      setDiff(diffData);
      setCompareCheckpoint(checkpoint);
      setShowDiffDialog(true);
    } catch (err) {
      console.error('Failed to get diff:', err);
      setError('Failed to compare checkpoints');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNodeExpansion = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderTimelineNode = (node: TimelineNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.checkpoint.id);
    const hasChildren = node.children.length > 0;
    const isCurrent = timeline?.currentCheckpointId === node.checkpoint.id;
    const isSelected = selectedCheckpoint?.id === node.checkpoint.id;

    return (
      <div key={node.checkpoint.id} className="relative">
        {/* Connection line */}
        {depth > 0 && (
          <div
            className="border-muted-foreground/30 absolute top-0 left-0 h-6 w-6 border-b-2 border-l-2"
            style={{
              left: `${(depth - 1) * 24}px`,
              borderBottomLeftRadius: '8px',
            }}
          />
        )}

        {/* Node content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: depth * 0.05 }}
          className={cn('flex items-start gap-2 py-2', depth > 0 && 'ml-6')}
          style={{ paddingLeft: `${depth * 24}px` }}
        >
          {/* Expand/collapse button */}
          {hasChildren && (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-1 h-6 w-6"
              onClick={() => toggleNodeExpansion(node.checkpoint.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}

          {/* Checkpoint card */}
          <Card
            className={cn(
              'flex-1 cursor-pointer transition-all hover:shadow-md',
              isCurrent && 'border-primary ring-primary/20 ring-2',
              isSelected && 'border-blue-500 bg-blue-500/5',
              !hasChildren && 'ml-5'
            )}
            onClick={() => setSelectedCheckpoint(node.checkpoint)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    {isCurrent && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                    <span className="text-muted-foreground font-mono text-xs">
                      {node.checkpoint.id.slice(0, 8)}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(node.checkpoint.timestamp), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  {node.checkpoint.description && (
                    <p className="mb-1 text-sm font-medium">{node.checkpoint.description}</p>
                  )}

                  <p className="text-muted-foreground line-clamp-2 text-xs">
                    {node.checkpoint.metadata.userPrompt || 'No prompt'}
                  </p>

                  <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      {node.checkpoint.metadata.totalTokens.toLocaleString()} tokens
                    </span>
                    <span className="flex items-center gap-1">
                      <FileCode className="h-3 w-3" />
                      {node.checkpoint.metadata.fileChanges} files
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestoreCheckpoint(node.checkpoint);
                          }}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Restore to this checkpoint</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFork(node.checkpoint);
                          }}
                        >
                          <GitFork className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Fork from this checkpoint</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompare(node.checkpoint);
                          }}
                        >
                          <Diff className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Compare with another checkpoint</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div className="relative">
            {/* Vertical line for children */}
            {node.children.length > 1 && (
              <div
                className="bg-muted-foreground/30 absolute top-0 bottom-0 w-0.5"
                style={{ left: `${(depth + 1) * 24 - 1}px` }}
              />
            )}

            {node.children.map((child) => renderTimelineNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Experimental Feature Warning */}
      <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 text-yellow-600" />
          <div className="text-xs">
            <p className="font-medium text-yellow-600">Experimental Feature</p>
            <p className="text-yellow-600/80">
              Checkpointing may affect directory structure or cause data loss. Use with caution.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="text-muted-foreground h-5 w-5" />
          <h3 className="text-sm font-medium">Timeline</h3>
          {timeline && (
            <Badge variant="outline" className="text-xs">
              {timeline.totalCheckpoints} checkpoints
            </Badge>
          )}
        </div>

        <Button
          size="sm"
          variant="default"
          onClick={() => setShowCreateDialog(true)}
          disabled={isLoading}
        >
          <Save className="mr-1 h-3 w-3" />
          Checkpoint
        </Button>
      </div>

      {/* Error display */}
      {error && (
        <div className="text-destructive flex items-center gap-2 text-xs">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}

      {/* Timeline tree */}
      {timeline?.rootNode ? (
        <div className="relative overflow-x-auto">{renderTimelineNode(timeline.rootNode)}</div>
      ) : (
        <div className="text-muted-foreground py-8 text-center text-sm">
          {isLoading ? 'Loading timeline...' : 'No checkpoints yet'}
        </div>
      )}

      {/* Create checkpoint dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Checkpoint</DialogTitle>
            <DialogDescription>
              Save the current state of your session with an optional description.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="e.g., Before major refactoring"
                value={checkpointDescription}
                onChange={(e) => setCheckpointDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLoading) {
                    if (e.nativeEvent.isComposing || isIMEComposingRef.current) {
                      return;
                    }
                    handleCreateCheckpoint();
                  }
                }}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCheckpoint} disabled={isLoading}>
              Create Checkpoint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diff dialog */}
      <Dialog open={showDiffDialog} onOpenChange={setShowDiffDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Checkpoint Comparison</DialogTitle>
            <DialogDescription>
              Changes between "
              {selectedCheckpoint?.description || selectedCheckpoint?.id.slice(0, 8)}" and "
              {compareCheckpoint?.description || compareCheckpoint?.id.slice(0, 8)}"
            </DialogDescription>
          </DialogHeader>

          {diff && (
            <div className="max-h-[60vh] space-y-4 overflow-y-auto py-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-3">
                    <div className="text-muted-foreground text-xs">Modified Files</div>
                    <div className="text-2xl font-bold">{diff.modifiedFiles.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-muted-foreground text-xs">Added Files</div>
                    <div className="text-2xl font-bold text-green-600">
                      {diff.addedFiles.length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-muted-foreground text-xs">Deleted Files</div>
                    <div className="text-2xl font-bold text-red-600">
                      {diff.deletedFiles.length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Token delta */}
              <div className="flex items-center justify-center">
                <Badge variant={diff.tokenDelta > 0 ? 'default' : 'secondary'}>
                  {diff.tokenDelta > 0 ? '+' : ''}
                  {diff.tokenDelta.toLocaleString()} tokens
                </Badge>
              </div>

              {/* File lists */}
              {diff.modifiedFiles.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Modified Files</h4>
                  <div className="space-y-1">
                    {diff.modifiedFiles.map((file) => (
                      <div key={file.path} className="flex items-center justify-between text-xs">
                        <span className="font-mono">{file.path}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-green-600">+{file.additions}</span>
                          <span className="text-red-600">-{file.deletions}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diff.addedFiles.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Added Files</h4>
                  <div className="space-y-1">
                    {diff.addedFiles.map((file) => (
                      <div key={file} className="font-mono text-xs text-green-600">
                        + {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diff.deletedFiles.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Deleted Files</h4>
                  <div className="space-y-1">
                    {diff.deletedFiles.map((file) => (
                      <div key={file} className="font-mono text-xs text-red-600">
                        - {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDiffDialog(false);
                setDiff(null);
                setCompareCheckpoint(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
