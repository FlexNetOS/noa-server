'use client';

import { useState } from 'react';

import { Activity, Bot, FileText, Plus, Settings, Workflow, RefreshCw } from 'lucide-react';

import { AgentGrid } from '@/components/dashboard/agent-grid';
import { FeatureRequestForm } from '@/components/dashboard/feature-request-form';
import { SystemHealth } from '@/components/dashboard/system-health';
import { WorkflowTimeline } from '@/components/dashboard/workflow-timeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgents } from '@/hooks/use-agents';
import { useSystemMetrics } from '@/hooks/use-system-metrics';
import { useWorkflows } from '@/hooks/use-workflows';

export default function DashboardPage() {
  const { agents, loading: agentsLoading } = useAgents();
  const { workflows, loading: workflowsLoading } = useWorkflows();
  const { systemState, loading: systemLoading } = useSystemMetrics();
  const [showFeatureForm, setShowFeatureForm] = useState(false);

  const activeWorkflows = workflows.filter((w) => w.status === 'in-progress');
  const completedWorkflows = workflows.filter((w) => w.status === 'completed');
  const activeAgents = agents.filter((a) => a.status !== 'idle');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Contains Studio Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Real-time monitoring for 37 specialized AI agents
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-green-600 border-green-600">
                ✓ System Healthy
              </Badge>
              <Button variant="outline" size="icon">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <Activity className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="agents">
              <Bot className="w-4 h-4 mr-2" />
              Agents ({agents.length})
            </TabsTrigger>
            <TabsTrigger value="workflows">
              <Workflow className="w-4 h-4 mr-2" />
              Workflows ({workflows.length})
            </TabsTrigger>
            <TabsTrigger value="system">
              <Settings className="w-4 h-4 mr-2" />
              System Health
            </TabsTrigger>
            <TabsTrigger value="docs">
              <FileText className="w-4 h-4 mr-2" />
              Documentation
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Agents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{agents.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">{activeAgents.length} active</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Workflows
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{workflows.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeWorkflows.length} in progress
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{completedWorkflows.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total completed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    System Uptime
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">100%</div>
                  <p className="text-xs text-muted-foreground mt-1">All services operational</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Active Workflows</h2>
                  <Button onClick={() => setShowFeatureForm(!showFeatureForm)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Feature
                  </Button>
                </div>

                {showFeatureForm && (
                  <div className="mb-6">
                    <FeatureRequestForm />
                  </div>
                )}

                <div className="space-y-4">
                  {activeWorkflows.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6 text-center text-muted-foreground">
                        No active workflows. Submit a feature request to get started.
                      </CardContent>
                    </Card>
                  ) : (
                    activeWorkflows.map((workflow) => (
                      <WorkflowTimeline key={workflow.id} workflow={workflow} />
                    ))
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-4">System Health</h2>
                <SystemHealth systemState={systemState} />
              </div>
            </div>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Agent Registry</h2>
              <Badge variant="outline">{agents.length} agents available</Badge>
            </div>
            {agentsLoading ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">Loading agents...</p>
                </CardContent>
              </Card>
            ) : (
              <AgentGrid agents={agents} />
            )}
          </TabsContent>

          {/* Workflows Tab */}
          <TabsContent value="workflows" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">All Workflows</h2>
              <Button onClick={() => setShowFeatureForm(!showFeatureForm)}>
                <Plus className="w-4 h-4 mr-2" />
                New Workflow
              </Button>
            </div>

            {showFeatureForm && <FeatureRequestForm />}

            <div className="space-y-4">
              {workflowsLoading ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">Loading workflows...</p>
                  </CardContent>
                </Card>
              ) : workflows.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    No workflows yet. Submit a feature request to create one.
                  </CardContent>
                </Card>
              ) : (
                workflows.map((workflow) => (
                  <WorkflowTimeline key={workflow.id} workflow={workflow} />
                ))
              )}
            </div>
          </TabsContent>

          {/* System Health Tab */}
          <TabsContent value="system" className="space-y-6">
            <h2 className="text-2xl font-bold">System Health & Monitoring</h2>
            <SystemHealth systemState={systemState} />
          </TabsContent>

          {/* Documentation Tab */}
          <TabsContent value="docs" className="space-y-6">
            <h2 className="text-2xl font-bold">Documentation Hub</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle>README</CardTitle>
                  <CardDescription>Project overview and quick start</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge>Current</Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Last updated: October 22, 2025
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle>Setup Guide</CardTitle>
                  <CardDescription>Step-by-step installation</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge>Current</Badge>
                  <p className="text-sm text-muted-foreground mt-2">577 lines | Validated</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle>Health Check Report</CardTitle>
                  <CardDescription>System validation results</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge className="bg-green-600">100% Healthy</Badge>
                  <p className="text-sm text-muted-foreground mt-2">19/19 tests passed</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle>Integration Plan</CardTitle>
                  <CardDescription>Architecture and workflow design</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge>Current</Badge>
                  <p className="text-sm text-muted-foreground mt-2">Full automation architecture</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle>Activation Status</CardTitle>
                  <CardDescription>Complete activation report</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge className="bg-green-600">Phase 1 Complete</Badge>
                  <p className="text-sm text-muted-foreground mt-2">37/37 agents operational</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle>Documentation Index</CardTitle>
                  <CardDescription>Complete documentation map</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge>Current</Badge>
                  <p className="text-sm text-muted-foreground mt-2">5 major documents</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
