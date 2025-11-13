/**
 * Cost Analytics
 *
 * Real-time cost calculation, daily/monthly aggregation, cost forecasting,
 * budget alerts, and ROI analysis for AI operations.
 */

import { EventEmitter } from 'events';
import { ProviderType, TokenUsage } from '../types';

export interface CostAnalyticsConfig {
  enabled: boolean;
  budgetThresholds: BudgetThreshold[];
  forecastingEnabled: boolean;
  forecastWindow: number; // Days to forecast
  costOptimizationEnabled: boolean;
  trackPerUser: boolean;
  trackPerModel: boolean;
}

export interface BudgetThreshold {
  name: string;
  limit: number; // USD
  period: 'daily' | 'weekly' | 'monthly';
  provider?: ProviderType;
  model?: string;
  user?: string;
  alertAt: number[]; // Percentage thresholds [50, 80, 90, 100]
}

export interface CostBreakdown {
  provider: ProviderType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  requestCount: number;
  timestamp: number;
}

export interface DailyCostSummary {
  date: string; // YYYY-MM-DD
  totalCost: number;
  byProvider: Map<ProviderType, number>;
  byModel: Map<string, number>;
  byUser?: Map<string, number>;
  requestCount: number;
  cacheHits: number;
  cacheSavings: number;
}

export interface MonthlyCostSummary {
  month: string; // YYYY-MM
  totalCost: number;
  byProvider: Map<ProviderType, number>;
  byModel: Map<string, number>;
  byUser?: Map<string, number>;
  averageDailyCost: number;
  projectedMonthlyCost: number;
  dailyBreakdown: DailyCostSummary[];
}

export interface CostForecast {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  projectedCost: number;
  confidence: number; // 0-1
  trendDirection: 'increasing' | 'stable' | 'decreasing';
  trendPercentage: number;
  basedOnDays: number;
}

export interface CostOptimizationRecommendation {
  type: 'model_switch' | 'cache_improvement' | 'batch_requests' | 'reduce_tokens' | 'fallback_strategy';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  potentialSavings: number; // USD per month
  implementationEffort: 'easy' | 'medium' | 'hard';
  details: Record<string, any>;
}

export interface ROIAnalysis {
  totalCost: number;
  cacheHitRate: number;
  cacheSavings: number;
  fallbackSavings: number;
  optimizationSavings: number;
  netCost: number;
  savingsPercentage: number;
  period: string;
}

export interface BudgetAlert {
  threshold: BudgetThreshold;
  currentCost: number;
  percentUsed: number;
  alertLevel: number; // The threshold percentage that triggered the alert
  message: string;
  timestamp: number;
}

export class CostAnalytics extends EventEmitter {
  private config: CostAnalyticsConfig;
  private costBreakdowns: CostBreakdown[] = [];
  private dailySummaries: Map<string, DailyCostSummary> = new Map();
  private monthlySummaries: Map<string, MonthlyCostSummary> = new Map();
  private budgetAlerts: Map<string, Set<number>> = new Map(); // Track which alerts have been sent
  private costRates: Map<string, CostRate> = new Map();

  constructor(config?: Partial<CostAnalyticsConfig>) {
    super();

    this.config = {
      enabled: config?.enabled ?? true,
      budgetThresholds: config?.budgetThresholds ?? [],
      forecastingEnabled: config?.forecastingEnabled ?? true,
      forecastWindow: config?.forecastWindow ?? 30,
      costOptimizationEnabled: config?.costOptimizationEnabled ?? true,
      trackPerUser: config?.trackPerUser ?? true,
      trackPerModel: config?.trackPerModel ?? true,
    };

    this.initializeCostRates();
  }

  /**
   * Record cost for a request
   */
  public recordCost(
    provider: ProviderType,
    model: string,
    usage: TokenUsage,
    cached: boolean = false,
    user?: string
  ): CostBreakdown {
    if (!this.config.enabled) {
      return this.createEmptyCostBreakdown(provider, model);
    }

    const rate = this.getCostRate(provider, model);

    const inputCost = (usage.prompt_tokens / 1000000) * rate.inputCostPer1M;
    const outputCost = (usage.completion_tokens / 1000000) * rate.outputCostPer1M;
    const totalCost = cached ? 0 : inputCost + outputCost;

    const breakdown: CostBreakdown = {
      provider,
      model,
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      inputCost,
      outputCost,
      totalCost,
      requestCount: 1,
      timestamp: Date.now(),
    };

    this.costBreakdowns.push(breakdown);
    this.updateDailySummary(breakdown, user, cached);
    this.checkBudgetThresholds();

    return breakdown;
  }

  /**
   * Get daily cost summary
   */
  public getDailySummary(date?: string): DailyCostSummary | undefined {
    const dateKey = date || this.getDateKey(new Date());
    return this.dailySummaries.get(dateKey);
  }

  /**
   * Get monthly cost summary
   */
  public getMonthlySummary(month?: string): MonthlyCostSummary | undefined {
    const monthKey = month || this.getMonthKey(new Date());
    return this.monthlySummaries.get(monthKey);
  }

  /**
   * Get cost forecast
   */
  public getForecast(period: 'daily' | 'weekly' | 'monthly'): CostForecast {
    if (!this.config.forecastingEnabled) {
      return this.createEmptyForecast(period);
    }

    const historicalDays = this.getHistoricalCosts(30);
    if (historicalDays.length < 7) {
      return this.createEmptyForecast(period);
    }

    const avgDailyCost = historicalDays.reduce((sum, day) => sum + day.totalCost, 0) / historicalDays.length;

    // Calculate trend
    const recentDays = historicalDays.slice(-7);
    const olderDays = historicalDays.slice(0, Math.min(7, historicalDays.length - 7));

    const recentAvg = recentDays.reduce((sum, day) => sum + day.totalCost, 0) / recentDays.length;
    const olderAvg = olderDays.length > 0
      ? olderDays.reduce((sum, day) => sum + day.totalCost, 0) / olderDays.length
      : recentAvg;

    const trendPercentage = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

    let trendDirection: 'increasing' | 'stable' | 'decreasing';
    if (trendPercentage > 10) trendDirection = 'increasing';
    else if (trendPercentage < -10) trendDirection = 'decreasing';
    else trendDirection = 'stable';

    // Project based on trend
    const trendMultiplier = 1 + (trendPercentage / 100);
    const projectedDailyCost = avgDailyCost * trendMultiplier;

    let projectedCost: number;
    let daysToProject: number;

    switch (period) {
      case 'daily':
        projectedCost = projectedDailyCost;
        daysToProject = 1;
        break;
      case 'weekly':
        projectedCost = projectedDailyCost * 7;
        daysToProject = 7;
        break;
      case 'monthly':
        projectedCost = projectedDailyCost * 30;
        daysToProject = 30;
        break;
    }

    const confidence = Math.min(historicalDays.length / 30, 1);

    const now = new Date();
    const startDate = this.getDateKey(now);
    const endDate = this.getDateKey(new Date(now.getTime() + daysToProject * 24 * 60 * 60 * 1000));

    return {
      period,
      startDate,
      endDate,
      projectedCost,
      confidence,
      trendDirection,
      trendPercentage,
      basedOnDays: historicalDays.length,
    };
  }

  /**
   * Get cost optimization recommendations
   */
  public getOptimizationRecommendations(): CostOptimizationRecommendation[] {
    if (!this.config.costOptimizationEnabled) {
      return [];
    }

    const recommendations: CostOptimizationRecommendation[] = [];

    // Analyze model usage
    const modelCosts = this.analyzeModelCosts();

    // Check for expensive model usage
    for (const [modelKey, cost] of modelCosts) {
      const [provider, model] = modelKey.split(':') as [ProviderType, string];

      if (this.isExpensiveModel(provider, model) && cost > 10) {
        recommendations.push({
          type: 'model_switch',
          priority: cost > 100 ? 'high' : 'medium',
          description: `Consider switching from ${model} to a more cost-effective alternative`,
          potentialSavings: cost * 0.5, // Estimate 50% savings
          implementationEffort: 'easy',
          details: {
            currentModel: model,
            provider,
            currentMonthlyCost: cost,
            suggestedAlternatives: this.getSuggestedAlternatives(provider, model),
          },
        });
      }
    }

    // Check cache performance
    const cacheHitRate = this.calculateCacheHitRate();
    if (cacheHitRate < 0.3 && this.getTotalMonthlyCost() > 50) {
      recommendations.push({
        type: 'cache_improvement',
        priority: 'high',
        description: `Low cache hit rate (${(cacheHitRate * 100).toFixed(1)}%). Improve caching strategy`,
        potentialSavings: this.getTotalMonthlyCost() * 0.2,
        implementationEffort: 'medium',
        details: {
          currentHitRate: cacheHitRate,
          targetHitRate: 0.5,
          estimatedSavings: this.getTotalMonthlyCost() * 0.2,
        },
      });
    }

    // Check for high token usage
    const avgTokensPerRequest = this.calculateAverageTokensPerRequest();
    if (avgTokensPerRequest > 2000) {
      recommendations.push({
        type: 'reduce_tokens',
        priority: 'medium',
        description: 'High average token usage. Optimize prompts and responses',
        potentialSavings: this.getTotalMonthlyCost() * 0.15,
        implementationEffort: 'medium',
        details: {
          currentAverage: avgTokensPerRequest,
          targetAverage: 1500,
          optimizationTips: [
            'Use more concise prompts',
            'Implement max_tokens limits',
            'Remove unnecessary context',
          ],
        },
      });
    }

    // Check for lack of fallback strategy
    const providerCount = new Set(this.costBreakdowns.map(c => c.provider)).size;
    if (providerCount === 1 && this.getTotalMonthlyCost() > 100) {
      recommendations.push({
        type: 'fallback_strategy',
        priority: 'medium',
        description: 'Single provider usage. Implement multi-provider fallback strategy',
        potentialSavings: this.getTotalMonthlyCost() * 0.1,
        implementationEffort: 'hard',
        details: {
          currentProvider: Array.from(new Set(this.costBreakdowns.map(c => c.provider)))[0],
          benefit: 'Cost optimization and reliability improvement',
        },
      });
    }

    // Sort by potential savings
    recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);

    return recommendations;
  }

  /**
   * Calculate ROI
   */
  public calculateROI(startDate?: Date, endDate?: Date): ROIAnalysis {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const costData = this.costBreakdowns.filter(
      c => c.timestamp >= start.getTime() && c.timestamp <= end.getTime()
    );

    const totalCost = costData.reduce((sum, c) => sum + c.totalCost, 0);

    // Calculate cache savings
    const cacheHitRate = this.calculateCacheHitRate();
    const cacheSavings = totalCost * (cacheHitRate / (1 - cacheHitRate));

    // Estimate fallback savings (if using fallback strategy)
    const fallbackSavings = totalCost * 0.05; // Estimate 5% savings from fallbacks

    // Optimization savings from recommendations
    const recommendations = this.getOptimizationRecommendations();
    const optimizationSavings = recommendations.reduce((sum, r) => sum + r.potentialSavings, 0) / 12; // Monthly to period

    const netCost = totalCost - cacheSavings - fallbackSavings;
    const savingsPercentage = totalCost > 0 ? ((cacheSavings + fallbackSavings) / totalCost) * 100 : 0;

    return {
      totalCost,
      cacheHitRate,
      cacheSavings,
      fallbackSavings,
      optimizationSavings,
      netCost,
      savingsPercentage,
      period: `${this.getDateKey(start)} to ${this.getDateKey(end)}`,
    };
  }

  /**
   * Add budget threshold
   */
  public addBudgetThreshold(threshold: BudgetThreshold): void {
    this.config.budgetThresholds.push(threshold);
    this.budgetAlerts.set(this.getBudgetKey(threshold), new Set());
  }

  /**
   * Remove budget threshold
   */
  public removeBudgetThreshold(name: string): void {
    this.config.budgetThresholds = this.config.budgetThresholds.filter(t => t.name !== name);
  }

  /**
   * Clear cost data
   */
  public clear(): void {
    this.costBreakdowns = [];
    this.dailySummaries.clear();
    this.monthlySummaries.clear();
    this.budgetAlerts.clear();
  }

  // Private helper methods

  private initializeCostRates(): void {
    // OpenAI rates (per 1M tokens)
    this.costRates.set('openai:gpt-4', { inputCostPer1M: 30, outputCostPer1M: 60 });
    this.costRates.set('openai:gpt-4-turbo', { inputCostPer1M: 10, outputCostPer1M: 30 });
    this.costRates.set('openai:gpt-4-turbo-preview', { inputCostPer1M: 10, outputCostPer1M: 30 });
    this.costRates.set('openai:gpt-3.5-turbo', { inputCostPer1M: 0.5, outputCostPer1M: 1.5 });
    this.costRates.set('openai:gpt-3.5-turbo-16k', { inputCostPer1M: 3, outputCostPer1M: 4 });

    // Claude rates
    this.costRates.set('claude:claude-3-opus', { inputCostPer1M: 15, outputCostPer1M: 75 });
    this.costRates.set('claude:claude-3-opus-20240229', { inputCostPer1M: 15, outputCostPer1M: 75 });
    this.costRates.set('claude:claude-3-sonnet', { inputCostPer1M: 3, outputCostPer1M: 15 });
    this.costRates.set('claude:claude-3-sonnet-20240229', { inputCostPer1M: 3, outputCostPer1M: 15 });
    this.costRates.set('claude:claude-3-haiku', { inputCostPer1M: 0.25, outputCostPer1M: 1.25 });
    this.costRates.set('claude:claude-3-haiku-20240307', { inputCostPer1M: 0.25, outputCostPer1M: 1.25 });

    // llama.cpp (self-hosted, no API costs)
    this.costRates.set('llama.cpp:default', { inputCostPer1M: 0, outputCostPer1M: 0 });
  }

  private getCostRate(provider: ProviderType, model: string): CostRate {
    const key = `${provider}:${model}`;
    const rate = this.costRates.get(key);

    if (rate) return rate;

    // Try to find a partial match
    for (const [rateKey, rateValue] of this.costRates) {
      if (rateKey.startsWith(`${provider}:`) && model.includes(rateKey.split(':')[1])) {
        return rateValue;
      }
    }

    // Default rates
    const defaultRates: Record<ProviderType, CostRate> = {
      [ProviderType.OPENAI]: { inputCostPer1M: 1, outputCostPer1M: 2 },
      [ProviderType.CLAUDE]: { inputCostPer1M: 3, outputCostPer1M: 15 },
      [ProviderType.LLAMA_CPP]: { inputCostPer1M: 0, outputCostPer1M: 0 },
    };

    return defaultRates[provider];
  }

  private createEmptyCostBreakdown(provider: ProviderType, model: string): CostBreakdown {
    return {
      provider,
      model,
      inputTokens: 0,
      outputTokens: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      requestCount: 0,
      timestamp: Date.now(),
    };
  }

  private updateDailySummary(breakdown: CostBreakdown, user?: string, cached?: boolean): void {
    const dateKey = this.getDateKey(new Date(breakdown.timestamp));

    let summary = this.dailySummaries.get(dateKey);
    if (!summary) {
      summary = {
        date: dateKey,
        totalCost: 0,
        byProvider: new Map(),
        byModel: new Map(),
        byUser: this.config.trackPerUser ? new Map() : undefined,
        requestCount: 0,
        cacheHits: 0,
        cacheSavings: 0,
      };
      this.dailySummaries.set(dateKey, summary);
    }

    summary.totalCost += breakdown.totalCost;
    summary.requestCount += breakdown.requestCount;

    // By provider
    const providerCost = summary.byProvider.get(breakdown.provider) || 0;
    summary.byProvider.set(breakdown.provider, providerCost + breakdown.totalCost);

    // By model
    const modelKey = `${breakdown.provider}:${breakdown.model}`;
    const modelCost = summary.byModel.get(modelKey) || 0;
    summary.byModel.set(modelKey, modelCost + breakdown.totalCost);

    // By user
    if (user && summary.byUser) {
      const userCost = summary.byUser.get(user) || 0;
      summary.byUser.set(user, userCost + breakdown.totalCost);
    }

    // Cache tracking
    if (cached) {
      summary.cacheHits++;
      summary.cacheSavings += breakdown.inputCost + breakdown.outputCost;
    }

    // Update monthly summary
    this.updateMonthlySummary(dateKey, summary);
  }

  private updateMonthlySummary(dateKey: string, dailySummary: DailyCostSummary): void {
    const monthKey = dateKey.substring(0, 7); // YYYY-MM

    let summary = this.monthlySummaries.get(monthKey);
    if (!summary) {
      summary = {
        month: monthKey,
        totalCost: 0,
        byProvider: new Map(),
        byModel: new Map(),
        byUser: this.config.trackPerUser ? new Map() : undefined,
        averageDailyCost: 0,
        projectedMonthlyCost: 0,
        dailyBreakdown: [],
      };
      this.monthlySummaries.set(monthKey, summary);
    }

    // Recalculate from daily summaries
    const allDailySummaries = Array.from(this.dailySummaries.values())
      .filter(d => d.date.startsWith(monthKey));

    summary.totalCost = allDailySummaries.reduce((sum, d) => sum + d.totalCost, 0);
    summary.dailyBreakdown = allDailySummaries;

    const daysWithData = allDailySummaries.length;
    summary.averageDailyCost = daysWithData > 0 ? summary.totalCost / daysWithData : 0;

    // Project for full month (30 days)
    summary.projectedMonthlyCost = summary.averageDailyCost * 30;

    // Aggregate by provider and model
    summary.byProvider.clear();
    summary.byModel.clear();
    if (summary.byUser) summary.byUser.clear();

    for (const daily of allDailySummaries) {
      for (const [provider, cost] of daily.byProvider) {
        const current = summary.byProvider.get(provider) || 0;
        summary.byProvider.set(provider, current + cost);
      }

      for (const [model, cost] of daily.byModel) {
        const current = summary.byModel.get(model) || 0;
        summary.byModel.set(model, current + cost);
      }

      if (daily.byUser && summary.byUser) {
        for (const [user, cost] of daily.byUser) {
          const current = summary.byUser.get(user) || 0;
          summary.byUser.set(user, current + cost);
        }
      }
    }
  }

  private checkBudgetThresholds(): void {
    for (const threshold of this.config.budgetThresholds) {
      const currentCost = this.getCurrentPeriodCost(threshold);
      const percentUsed = (currentCost / threshold.limit) * 100;

      for (const alertLevel of threshold.alertAt) {
        if (percentUsed >= alertLevel) {
          const budgetKey = this.getBudgetKey(threshold);
          const alertedLevels = this.budgetAlerts.get(budgetKey) || new Set();

          if (!alertedLevels.has(alertLevel)) {
            this.emitBudgetAlert(threshold, currentCost, percentUsed, alertLevel);
            alertedLevels.add(alertLevel);
            this.budgetAlerts.set(budgetKey, alertedLevels);
          }
        }
      }
    }
  }

  private getCurrentPeriodCost(threshold: BudgetThreshold): number {
    const now = new Date();
    let startDate: Date;

    switch (threshold.period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const costData = this.costBreakdowns.filter(c => {
      if (c.timestamp < startDate.getTime()) return false;
      if (threshold.provider && c.provider !== threshold.provider) return false;
      if (threshold.model && c.model !== threshold.model) return false;
      return true;
    });

    return costData.reduce((sum, c) => sum + c.totalCost, 0);
  }

  private emitBudgetAlert(
    threshold: BudgetThreshold,
    currentCost: number,
    percentUsed: number,
    alertLevel: number
  ): void {
    const alert: BudgetAlert = {
      threshold,
      currentCost,
      percentUsed,
      alertLevel,
      message: `Budget alert: ${threshold.name} has reached ${alertLevel}% (${currentCost.toFixed(2)} / ${threshold.limit} USD)`,
      timestamp: Date.now(),
    };

    this.emit('budget:alert', alert);
  }

  private getBudgetKey(threshold: BudgetThreshold): string {
    return `${threshold.name}_${threshold.period}`;
  }

  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getMonthKey(date: Date): string {
    return date.toISOString().substring(0, 7);
  }

  private getHistoricalCosts(days: number): DailyCostSummary[] {
    const summaries: DailyCostSummary[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = this.getDateKey(date);
      const summary = this.dailySummaries.get(dateKey);

      if (summary) {
        summaries.push(summary);
      }
    }

    return summaries;
  }

  private createEmptyForecast(period: 'daily' | 'weekly' | 'monthly'): CostForecast {
    const now = new Date();
    return {
      period,
      startDate: this.getDateKey(now),
      endDate: this.getDateKey(now),
      projectedCost: 0,
      confidence: 0,
      trendDirection: 'stable',
      trendPercentage: 0,
      basedOnDays: 0,
    };
  }

  private analyzeModelCosts(): Map<string, number> {
    const modelCosts = new Map<string, number>();

    for (const breakdown of this.costBreakdowns) {
      const key = `${breakdown.provider}:${breakdown.model}`;
      const current = modelCosts.get(key) || 0;
      modelCosts.set(key, current + breakdown.totalCost);
    }

    return modelCosts;
  }

  private isExpensiveModel(provider: ProviderType, model: string): boolean {
    const rate = this.getCostRate(provider, model);
    return rate.inputCostPer1M > 5 || rate.outputCostPer1M > 15;
  }

  private getSuggestedAlternatives(provider: ProviderType, model: string): string[] {
    const alternatives: Record<string, string[]> = {
      'gpt-4': ['gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-sonnet'],
      'claude-3-opus': ['claude-3-sonnet', 'gpt-4-turbo', 'claude-3-haiku'],
    };

    for (const [key, alts] of Object.entries(alternatives)) {
      if (model.includes(key)) {
        return alts;
      }
    }

    return [];
  }

  private calculateCacheHitRate(): number {
    const allSummaries = Array.from(this.dailySummaries.values());
    if (allSummaries.length === 0) return 0;

    const totalRequests = allSummaries.reduce((sum, s) => sum + s.requestCount, 0);
    const totalCacheHits = allSummaries.reduce((sum, s) => sum + s.cacheHits, 0);

    return totalRequests > 0 ? totalCacheHits / totalRequests : 0;
  }

  private calculateAverageTokensPerRequest(): number {
    if (this.costBreakdowns.length === 0) return 0;

    const totalTokens = this.costBreakdowns.reduce(
      (sum, c) => sum + c.inputTokens + c.outputTokens,
      0
    );

    return totalTokens / this.costBreakdowns.length;
  }

  private getTotalMonthlyCost(): number {
    const monthKey = this.getMonthKey(new Date());
    const summary = this.monthlySummaries.get(monthKey);
    return summary?.projectedMonthlyCost || 0;
  }
}

interface CostRate {
  inputCostPer1M: number;
  outputCostPer1M: number;
}
