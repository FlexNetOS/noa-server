import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { api, type UsageStats, type ProjectUsage } from '@/lib/api';
import { Calendar, Filter, Loader2, Briefcase } from 'lucide-react';

interface UsageDashboardProps {
  /**
   * Callback when back button is clicked
   */
  onBack: () => void;
}

/**
 * UsageDashboard component - Displays Claude API usage statistics and costs
 *
 * @example
 * <UsageDashboard onBack={() => setView('welcome')} />
 */
export const UsageDashboard: React.FC<UsageDashboardProps> = ({}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [sessionStats, setSessionStats] = useState<ProjectUsage[] | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | '7d' | '30d'>('7d');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadUsageStats();
  }, [selectedDateRange]);

  const loadUsageStats = async () => {
    try {
      setLoading(true);
      setError(null);

      let statsData: UsageStats;
      let sessionData: ProjectUsage[];

      if (selectedDateRange === 'all') {
        statsData = await api.getUsageStats();
        sessionData = await api.getSessionStats();
      } else {
        const endDate = new Date();
        const startDate = new Date();
        const days = selectedDateRange === '7d' ? 7 : 30;
        startDate.setDate(startDate.getDate() - days);

        const formatDateForApi = (date: Date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}${month}${day}`;
        };

        statsData = await api.getUsageByDateRange(startDate.toISOString(), endDate.toISOString());
        sessionData = await api.getSessionStats(
          formatDateForApi(startDate),
          formatDateForApi(endDate),
          'desc'
        );
      }

      setStats(statsData);
      setSessionStats(sessionData);
    } catch (err) {
      console.error('Failed to load usage stats:', err);
      setError('Failed to load usage statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatTokens = (num: number): string => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(2)}M`;
    } else if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return formatNumber(num);
  };

  const getModelDisplayName = (model: string): string => {
    const modelMap: Record<string, string> = {
      'claude-4-opus': 'Opus 4',
      'claude-4-sonnet': 'Sonnet 4',
      'claude-3.5-sonnet': 'Sonnet 3.5',
      'claude-3-opus': 'Opus 3',
    };
    return modelMap[model] || model;
  };

  // Helper for model color (unused in this original version)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex h-full max-w-6xl flex-col">
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-heading-1">Usage Dashboard</h1>
              <p className="text-body-small text-muted-foreground mt-1">
                Track your Claude Code usage and costs
              </p>
            </div>
            {/* Date Range Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="text-muted-foreground h-4 w-4" />
              <div className="flex space-x-1">
                {(['7d', '30d', 'all'] as const).map((range) => (
                  <Button
                    key={range}
                    variant={selectedDateRange === range ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDateRange(range)}
                  >
                    {range === 'all' ? 'All Time' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-destructive/10 border-destructive/50 text-body-small text-destructive mb-4 rounded-lg border p-3"
            >
              {error}
              <Button onClick={loadUsageStats} size="sm" className="ml-4">
                Try Again
              </Button>
            </motion.div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                {/* Total Cost Card */}
                <Card className="shimmer-hover p-4">
                  <div>
                    <p className="text-caption text-muted-foreground">Total Cost</p>
                    <p className="text-display-2 mt-1">{formatCurrency(stats.total_cost)}</p>
                  </div>
                </Card>

                {/* Total Sessions Card */}
                <Card className="shimmer-hover p-4">
                  <div>
                    <p className="text-caption text-muted-foreground">Total Sessions</p>
                    <p className="text-display-2 mt-1">{formatNumber(stats.total_sessions)}</p>
                  </div>
                </Card>

                {/* Total Tokens Card */}
                <Card className="shimmer-hover p-4">
                  <div>
                    <p className="text-caption text-muted-foreground">Total Tokens</p>
                    <p className="text-display-2 mt-1">{formatTokens(stats.total_tokens)}</p>
                  </div>
                </Card>

                {/* Average Cost per Session Card */}
                <Card className="shimmer-hover p-4">
                  <div>
                    <p className="text-caption text-muted-foreground">Avg Cost/Session</p>
                    <p className="text-display-2 mt-1">
                      {formatCurrency(
                        stats.total_sessions > 0 ? stats.total_cost / stats.total_sessions : 0
                      )}
                    </p>
                  </div>
                </Card>
              </div>

              {/* Tabs for different views */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-6 grid h-auto w-full grid-cols-5 p-1">
                  <TabsTrigger value="overview" className="px-3 py-2.5">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="models" className="px-3 py-2.5">
                    By Model
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="px-3 py-2.5">
                    By Project
                  </TabsTrigger>
                  <TabsTrigger value="sessions" className="px-3 py-2.5">
                    By Session
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="px-3 py-2.5">
                    Timeline
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-6 space-y-6">
                  <Card className="p-6">
                    <h3 className="text-label mb-4">Token Breakdown</h3>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-caption text-muted-foreground">Input Tokens</p>
                        <p className="text-heading-4">{formatTokens(stats.total_input_tokens)}</p>
                      </div>
                      <div>
                        <p className="text-caption text-muted-foreground">Output Tokens</p>
                        <p className="text-heading-4">{formatTokens(stats.total_output_tokens)}</p>
                      </div>
                      <div>
                        <p className="text-caption text-muted-foreground">Cache Write</p>
                        <p className="text-heading-4">
                          {formatTokens(stats.total_cache_creation_tokens)}
                        </p>
                      </div>
                      <div>
                        <p className="text-caption text-muted-foreground">Cache Read</p>
                        <p className="text-heading-4">
                          {formatTokens(stats.total_cache_read_tokens)}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card className="p-6">
                      <h3 className="text-label mb-4">Most Used Models</h3>
                      <div className="space-y-3">
                        {stats.by_model.slice(0, 3).map((model) => (
                          <div key={model.model} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-caption">
                                {getModelDisplayName(model.model)}
                              </Badge>
                              <span className="text-caption text-muted-foreground">
                                {model.session_count} sessions
                              </span>
                            </div>
                            <span className="text-body-small font-medium">
                              {formatCurrency(model.total_cost)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="text-label mb-4">Top Projects</h3>
                      <div className="space-y-3">
                        {stats.by_project.slice(0, 3).map((project) => (
                          <div
                            key={project.project_path}
                            className="flex items-center justify-between"
                          >
                            <div className="flex flex-col">
                              <span
                                className="text-body-small max-w-[200px] truncate font-medium"
                                title={project.project_path}
                              >
                                {project.project_path}
                              </span>
                              <span className="text-caption text-muted-foreground">
                                {project.session_count} sessions
                              </span>
                            </div>
                            <span className="text-body-small font-medium">
                              {formatCurrency(project.total_cost)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                {/* Models Tab */}
                <TabsContent value="models" className="mt-6 space-y-6">
                  <Card className="p-6">
                    <h3 className="mb-4 text-sm font-semibold">Usage by Model</h3>
                    <div className="space-y-4">
                      {stats.by_model.map((model) => (
                        <div key={model.model} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Badge variant="outline" className="text-xs">
                                {getModelDisplayName(model.model)}
                              </Badge>
                              <span className="text-muted-foreground text-sm">
                                {model.session_count} sessions
                              </span>
                            </div>
                            <span className="text-sm font-semibold">
                              {formatCurrency(model.total_cost)}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Input: </span>
                              <span className="font-medium">
                                {formatTokens(model.input_tokens)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Output: </span>
                              <span className="font-medium">
                                {formatTokens(model.output_tokens)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Cache W: </span>
                              <span className="font-medium">
                                {formatTokens(model.cache_creation_tokens)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Cache R: </span>
                              <span className="font-medium">
                                {formatTokens(model.cache_read_tokens)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                {/* Projects Tab */}
                <TabsContent value="projects" className="mt-6 space-y-6">
                  <Card className="p-6">
                    <h3 className="mb-4 text-sm font-semibold">Usage by Project</h3>
                    <div className="space-y-3">
                      {stats.by_project.map((project) => (
                        <div
                          key={project.project_path}
                          className="border-border flex items-center justify-between border-b py-2 last:border-0"
                        >
                          <div className="flex flex-col truncate">
                            <span
                              className="truncate text-sm font-medium"
                              title={project.project_path}
                            >
                              {project.project_path}
                            </span>
                            <div className="mt-1 flex items-center space-x-3">
                              <span className="text-caption text-muted-foreground">
                                {project.session_count} sessions
                              </span>
                              <span className="text-caption text-muted-foreground">
                                {formatTokens(project.total_tokens)} tokens
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {formatCurrency(project.total_cost)}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {formatCurrency(project.total_cost / project.session_count)}/session
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                {/* Sessions Tab */}
                <TabsContent value="sessions" className="mt-6 space-y-6">
                  <Card className="p-6">
                    <h3 className="mb-4 text-sm font-semibold">Usage by Session</h3>
                    <div className="space-y-3">
                      {sessionStats?.map((session) => (
                        <div
                          key={`${session.project_path}-${session.project_name}`}
                          className="border-border flex items-center justify-between border-b py-2 last:border-0"
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                              <Briefcase className="text-muted-foreground h-4 w-4" />
                              <span
                                className="text-muted-foreground max-w-[200px] truncate font-mono text-xs"
                                title={session.project_path}
                              >
                                {session.project_path.split('/').slice(-2).join('/')}
                              </span>
                            </div>
                            <span className="mt-1 text-sm font-medium">{session.project_name}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {formatCurrency(session.total_cost)}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {new Date(session.last_used).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                {/* Timeline Tab */}
                <TabsContent value="timeline" className="mt-6 space-y-6">
                  <Card className="p-6">
                    <h3 className="mb-6 flex items-center space-x-2 text-sm font-semibold">
                      <Calendar className="h-4 w-4" />
                      <span>Daily Usage</span>
                    </h3>
                    {stats.by_date.length > 0 ? (
                      (() => {
                        const maxCost = Math.max(...stats.by_date.map((d) => d.total_cost), 0);
                        const halfMaxCost = maxCost / 2;

                        return (
                          <div className="relative pr-4 pl-8">
                            {/* Y-axis labels */}
                            <div className="text-muted-foreground absolute top-0 bottom-8 left-0 flex flex-col justify-between text-xs">
                              <span>{formatCurrency(maxCost)}</span>
                              <span>{formatCurrency(halfMaxCost)}</span>
                              <span>{formatCurrency(0)}</span>
                            </div>

                            {/* Chart container */}
                            <div className="border-border flex h-64 items-end space-x-2 border-b border-l pl-4">
                              {stats.by_date
                                .slice()
                                .reverse()
                                .map((day) => {
                                  const heightPercent =
                                    maxCost > 0 ? (day.total_cost / maxCost) * 100 : 0;
                                  const date = new Date(day.date.replace(/-/g, '/'));
                                  const formattedDate = date.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                  });

                                  return (
                                    <div
                                      key={day.date}
                                      className="group relative flex h-full flex-1 flex-col items-center justify-end"
                                    >
                                      {/* Tooltip */}
                                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 transform opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                        <div className="bg-background border-border rounded-lg border p-3 whitespace-nowrap shadow-lg">
                                          <p className="text-sm font-semibold">{formattedDate}</p>
                                          <p className="text-muted-foreground mt-1 text-sm">
                                            Cost: {formatCurrency(day.total_cost)}
                                          </p>
                                          <p className="text-muted-foreground text-xs">
                                            {formatTokens(day.total_tokens)} tokens
                                          </p>
                                          <p className="text-muted-foreground text-xs">
                                            {day.models_used.length} model
                                            {day.models_used.length !== 1 ? 's' : ''}
                                          </p>
                                        </div>
                                        <div className="absolute top-full left-1/2 -mt-1 -translate-x-1/2 transform">
                                          <div className="border-t-border border-4 border-transparent"></div>
                                        </div>
                                      </div>

                                      {/* Bar */}
                                      <div
                                        className="w-full cursor-pointer rounded-t bg-[#d97757] transition-opacity hover:opacity-80"
                                        style={{ height: `${heightPercent}%` }}
                                      />

                                      {/* X-axis label – absolutely positioned below the bar so it doesn't affect bar height */}
                                      <div className="text-muted-foreground pointer-events-none absolute top-full left-1/2 mt-1 origin-top-left -translate-x-1/2 -rotate-45 text-xs whitespace-nowrap">
                                        {date.toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>

                            {/* X-axis label */}
                            <div className="text-muted-foreground mt-8 text-center text-xs">
                              Daily Usage Over Time
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-muted-foreground py-8 text-center text-sm">
                        No usage data available for the selected period
                      </div>
                    )}
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
