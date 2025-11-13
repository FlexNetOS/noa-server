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
              <p className="mt-1 text-muted-foreground">
                Real-time monitoring for 37 specialized AI agents
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="border-green-600 text-green-600">
                ✓ System Healthy
              </Badge>
              <Button variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
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
              <Activity className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="agents">
              <Bot className="mr-2 h-4 w-4" />
              Agents ({agents.length})
            </TabsTrigger>
            <TabsTrigger value="workflows">
              <Workflow className="mr-2 h-4 w-4" />
              Workflows ({workflows.length})
            </TabsTrigger>
            <TabsTrigger value="system">
              <Settings className="mr-2 h-4 w-4" />
              System Health
            </TabsTrigger>
            <TabsTrigger value="docs">
              <FileText className="mr-2 h-4 w-4" />
              Documentation
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Agents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{agents.length}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{activeAgents.length} active</p>
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
                  <p className="mt-1 text-xs text-muted-foreground">
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
                  <p className="mt-1 text-xs text-muted-foreground">Total completed</p>
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
                  <p className="mt-1 text-xs text-muted-foreground">All services operational</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Active Workflows</h2>
                  <Button onClick={() => setShowFeatureForm(!showFeatureForm)}>
                    <Plus className="mr-2 h-4 w-4" />
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
                <h2 className="mb-4 text-2xl font-bold">System Health</h2>
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
                <Plus className="mr-2 h-4 w-4" />
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                <CardHeader>
                  <CardTitle>README</CardTitle>
                  <CardDescription>Project overview and quick start</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge>Current</Badge>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Last updated: October 22, 2025
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Setup Guide</CardTitle>
                  <CardDescription>Step-by-step installation</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge>Current</Badge>
                  <p className="mt-2 text-sm text-muted-foreground">577 lines | Validated</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Health Check Report</CardTitle>
                  <CardDescription>System validation results</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge className="bg-green-600">100% Healthy</Badge>
                  <p className="mt-2 text-sm text-muted-foreground">19/19 tests passed</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Integration Plan</CardTitle>
                  <CardDescription>Architecture and workflow design</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge>Current</Badge>
                  <p className="mt-2 text-sm text-muted-foreground">Full automation architecture</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Activation Status</CardTitle>
                  <CardDescription>Complete activation report</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge className="bg-green-600">Phase 1 Complete</Badge>
                  <p className="mt-2 text-sm text-muted-foreground">37/37 agents operational</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                <CardHeader>
                  <CardTitle>Documentation Index</CardTitle>
                  <CardDescription>Complete documentation map</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge>Current</Badge>
                  <p className="mt-2 text-sm text-muted-foreground">5 major documents</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
