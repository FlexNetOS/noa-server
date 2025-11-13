/**
 * AI Quality Metrics
 *
 * Response quality scoring, sentiment analysis, hallucination detection,
 * coherence scoring, and model comparison analytics.
 */

import { EventEmitter } from 'events';
import { GenerationResponse, ProviderType } from '../types';

export interface QualityMetricsConfig {
  enabled: boolean;
  enableSentimentAnalysis: boolean;
  enableHallucinationDetection: boolean;
  enableCoherenceScoring: boolean;
  qualityThreshold: number; // 0-100
  trackModelComparisons: boolean;
}

export interface QualityScore {
  overall: number; // 0-100
  components: {
    coherence: number;
    relevance: number;
    completeness: number;
    accuracy: number;
    sentiment: number;
  };
  timestamp: number;
  provider: ProviderType;
  model: string;
  requestId: string;
}

export interface SentimentAnalysis {
  score: number; // -1 to 1 (negative to positive)
  label: 'negative' | 'neutral' | 'positive';
  confidence: number; // 0-1
  emotions?: {
    joy?: number;
    sadness?: number;
    anger?: number;
    fear?: number;
    surprise?: number;
  };
}

export interface HallucinationDetection {
  detected: boolean;
  confidence: number; // 0-1
  indicators: string[];
  factCheckResults?: FactCheckResult[];
}

export interface FactCheckResult {
  claim: string;
  verdict: 'supported' | 'refuted' | 'inconclusive';
  confidence: number;
  sources?: string[];
}

export interface CoherenceScore {
  score: number; // 0-100
  logicalFlow: number;
  topicConsistency: number;
  grammarCorrectness: number;
  structuralIntegrity: number;
}

export interface ModelComparisonMetrics {
  modelA: string;
  modelB: string;
  providerA: ProviderType;
  providerB: ProviderType;
  comparisonCount: number;
  qualityDifference: number;
  latencyDifference: number;
  costDifference: number;
  preferenceScore: number; // -1 to 1 (A worse to A better)
  lastCompared: number;
}

export interface ABTestResult {
  testId: string;
  startTime: number;
  endTime?: number;
  variants: Map<string, ABTestVariant>;
  winner?: string;
  confidence: number;
}

export interface ABTestVariant {
  variantId: string;
  model: string;
  provider: ProviderType;
  requestCount: number;
  averageQuality: number;
  averageLatency: number;
  averageCost: number;
  userPreference: number; // Based on implicit signals
}

export class QualityMetrics extends EventEmitter {
  private config: QualityMetricsConfig;
  private qualityScores: Map<string, QualityScore> = new Map();
  private modelComparisons: Map<string, ModelComparisonMetrics> = new Map();
  private abTests: Map<string, ABTestResult> = new Map();
  private sentimentCache: Map<string, SentimentAnalysis> = new Map();

  constructor(config?: Partial<QualityMetricsConfig>) {
    super();

    this.config = {
      enabled: config?.enabled ?? true,
      enableSentimentAnalysis: config?.enableSentimentAnalysis ?? true,
      enableHallucinationDetection: config?.enableHallucinationDetection ?? true,
      enableCoherenceScoring: config?.enableCoherenceScoring ?? true,
      qualityThreshold: config?.qualityThreshold ?? 70,
      trackModelComparisons: config?.trackModelComparisons ?? true,
    };
  }

  /**
   * Calculate quality score for a response
   */
  public async calculateQualityScore(
    requestId: string,
    response: GenerationResponse,
    userPrompt?: string
  ): Promise<QualityScore> {
    if (!this.config.enabled) {
      return this.createDefaultScore(requestId, response);
    }

    const responseText = this.extractResponseText(response) || "";

    const components = {
      coherence: this.config.enableCoherenceScoring
        ? await this.calculateCoherence(responseText)
        : 85,
      relevance: userPrompt
        ? this.calculateRelevance(userPrompt, responseText)
        : 85,
      completeness: this.calculateCompleteness(responseText, response),
      accuracy: this.config.enableHallucinationDetection
        ? await this.calculateAccuracy(responseText)
        : 85,
      sentiment: this.config.enableSentimentAnalysis
        ? this.mapSentimentToScore(await this.analyzeSentiment(responseText))
        : 85,
    };

    const overall = Object.values(components).reduce((a, b) => a + b, 0) / 5;

    const qualityScore: QualityScore = {
      overall,
      components,
      timestamp: Date.now(),
      provider: response.provider,
      model: response.model,
      requestId,
    };

    this.qualityScores.set(requestId, qualityScore);

    // Emit alert if below threshold
    if (overall < this.config.qualityThreshold) {
      this.emit('quality:below-threshold', qualityScore);
    }

    return qualityScore;
  }

  /**
   * Analyze sentiment of response
   */
  public async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    if (!this.config.enableSentimentAnalysis) {
      return this.createNeutralSentiment();
    }

    // Check cache
    const cacheKey = this.hashText(text);
    if (this.sentimentCache.has(cacheKey)) {
      return this.sentimentCache.get(cacheKey)!;
    }

    // Simple rule-based sentiment analysis
    // In production, you'd use a proper NLP library or API
    const sentiment = this.performSentimentAnalysis(text);

    this.sentimentCache.set(cacheKey, sentiment);

    // Limit cache size
    if (this.sentimentCache.size > 1000) {
      const firstKey = this.sentimentCache.keys().next().value;
      this.sentimentCache.delete(firstKey);
    }

    return sentiment;
  }

  /**
   * Detect potential hallucinations
   */
  public async detectHallucinations(text: string): Promise<HallucinationDetection> {
    if (!this.config.enableHallucinationDetection) {
      return {
        detected: false,
        confidence: 0,
        indicators: [],
      };
    }

    const indicators: string[] = [];
    let confidence = 0;

    // Check for common hallucination patterns
    if (this.containsSpeculativeLanguage(text)) {
      indicators.push('Contains speculative or uncertain language');
      confidence += 0.2;
    }

    if (this.containsContradictions(text)) {
      indicators.push('Contains internal contradictions');
      confidence += 0.3;
    }

    if (this.containsUnrealisticClaims(text)) {
      indicators.push('Contains potentially unrealistic claims');
      confidence += 0.3;
    }

    if (this.lacksCitation(text)) {
      indicators.push('Makes factual claims without citations');
      confidence += 0.1;
    }

    const detected = indicators.length > 0;

    return {
      detected,
      confidence: Math.min(confidence, 1),
      indicators,
    };
  }

  /**
   * Calculate coherence score
   */
  public async calculateCoherenceScore(text: string): Promise<CoherenceScore> {
    if (!this.config.enableCoherenceScoring) {
      return {
        score: 85,
        logicalFlow: 85,
        topicConsistency: 85,
        grammarCorrectness: 85,
        structuralIntegrity: 85,
      };
    }

    const logicalFlow = this.assessLogicalFlow(text);
    const topicConsistency = this.assessTopicConsistency(text);
    const grammarCorrectness = this.assessGrammar(text);
    const structuralIntegrity = this.assessStructure(text);

    const score = (logicalFlow + topicConsistency + grammarCorrectness + structuralIntegrity) / 4;

    return {
      score,
      logicalFlow,
      topicConsistency,
      grammarCorrectness,
      structuralIntegrity,
    };
  }

  /**
   * Compare two models
   */
  public compareModels(
    modelA: string,
    providerA: ProviderType,
    scoreA: QualityScore,
    modelB: string,
    providerB: ProviderType,
    scoreB: QualityScore
  ): ModelComparisonMetrics {
    const key = this.getComparisonKey(modelA, providerA, modelB, providerB);

    let comparison = this.modelComparisons.get(key);
    if (!comparison) {
      comparison = {
        modelA,
        modelB,
        providerA,
        providerB,
        comparisonCount: 0,
        qualityDifference: 0,
        latencyDifference: 0,
        costDifference: 0,
        preferenceScore: 0,
        lastCompared: Date.now(),
      };
    }

    comparison.comparisonCount++;
    comparison.qualityDifference =
      (comparison.qualityDifference * (comparison.comparisonCount - 1) +
       (scoreA.overall - scoreB.overall)) / comparison.comparisonCount;

    comparison.preferenceScore = comparison.qualityDifference / 100; // Normalize to -1 to 1
    comparison.lastCompared = Date.now();

    this.modelComparisons.set(key, comparison);

    return comparison;
  }

  /**
   * Start A/B test
   */
  public startABTest(testId: string, variants: ABTestVariant[]): ABTestResult {
    const test: ABTestResult = {
      testId,
      startTime: Date.now(),
      variants: new Map(variants.map(v => [v.variantId, v])),
      confidence: 0,
    };

    this.abTests.set(testId, test);
    this.emit('abtest:started', test);

    return test;
  }

  /**
   * Record A/B test result
   */
  public recordABTestResult(
    testId: string,
    variantId: string,
    qualityScore: QualityScore,
    latency: number,
    cost: number
  ): void {
    const test = this.abTests.get(testId);
    if (!test) return;

    const variant = test.variants.get(variantId);
    if (!variant) return;

    const count = variant.requestCount;
    variant.requestCount++;
    variant.averageQuality =
      (variant.averageQuality * count + qualityScore.overall) / variant.requestCount;
    variant.averageLatency =
      (variant.averageLatency * count + latency) / variant.requestCount;
    variant.averageCost =
      (variant.averageCost * count + cost) / variant.requestCount;

    // Check if we can determine a winner
    this.evaluateABTest(test);
  }

  /**
   * Get quality score
   */
  public getQualityScore(requestId: string): QualityScore | undefined {
    return this.qualityScores.get(requestId);
  }

  /**
   * Get model comparison
   */
  public getModelComparison(
    modelA: string,
    providerA: ProviderType,
    modelB: string,
    providerB: ProviderType
  ): ModelComparisonMetrics | undefined {
    const key = this.getComparisonKey(modelA, providerA, modelB, providerB);
    return this.modelComparisons.get(key);
  }

  /**
   * Get A/B test results
   */
  public getABTestResult(testId: string): ABTestResult | undefined {
    return this.abTests.get(testId);
  }

  /**
   * Get all model comparisons
   */
  public getAllComparisons(): ModelComparisonMetrics[] {
    return Array.from(this.modelComparisons.values());
  }

  /**
   * Clear quality scores
   */
  public clear(): void {
    this.qualityScores.clear();
    this.sentimentCache.clear();
  }

  // Private helper methods

  private createDefaultScore(requestId: string, response: GenerationResponse): QualityScore {
    return {
      overall: 85,
      components: {
        coherence: 85,
        relevance: 85,
        completeness: 85,
        accuracy: 85,
        sentiment: 85,
      },
      timestamp: Date.now(),
      provider: response.provider,
      model: response.model,
      requestId,
    };
  }

  private extractResponseText(response: GenerationResponse): string {
    const choice = response.choices[0];
    if (choice.message?.content) {
      return typeof choice.message.content === 'string'
        ? choice.message.content
        : choice.message.content.map(c => c.text || '').join('');
    }
    return choice.text || '';
  }

  private async calculateCoherence(text: string): Promise<number> {
    const coherence = await this.calculateCoherenceScore(text);
    return coherence.score;
  }

  private calculateRelevance(prompt: string, response: string): number {
    // Simple keyword overlap analysis
    const promptWords = new Set(this.tokenize(prompt.toLowerCase()));
    const responseWords = this.tokenize(response.toLowerCase());

    let overlap = 0;
    for (const word of responseWords) {
      if (promptWords.has(word)) {
        overlap++;
      }
    }

    const relevance = Math.min((overlap / promptWords.size) * 100, 100);
    return relevance;
  }

  private calculateCompleteness(text: string, response: GenerationResponse): number {
    const finishReason = response.choices[0].finish_reason;

    // Penalize if stopped due to length
    if (finishReason === 'length') return 60;

    // Check if response seems complete
    const hasConclusion = /\b(conclusion|summary|finally|in summary)\b/i.test(text);
    const endsWithPunctuation = /[.!?]$/.test(text.trim());

    let score = 85;
    if (hasConclusion) score += 10;
    if (endsWithPunctuation) score += 5;

    return Math.min(score, 100);
  }

  private async calculateAccuracy(text: string): Promise<number> {
    const hallucination = await this.detectHallucinations(text);

    if (!hallucination.detected) return 95;

    // Reduce score based on hallucination confidence
    return Math.max(50, 95 - (hallucination.confidence * 45));
  }

  private performSentimentAnalysis(text: string): SentimentAnalysis {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'happy', 'love'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'sad', 'hate', 'angry', 'disappointing'];

    const words = this.tokenize(text.toLowerCase());
    let score = 0;
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.includes(word)) {
        positiveCount++;
        score += 1;
      } else if (negativeWords.includes(word)) {
        negativeCount++;
        score -= 1;
      }
    }

    const totalSentiment = positiveCount + negativeCount;
    const normalizedScore = totalSentiment > 0 ? score / totalSentiment : 0;

    let label: 'negative' | 'neutral' | 'positive';
    if (normalizedScore < -0.2) label = 'negative';
    else if (normalizedScore > 0.2) label = 'positive';
    else label = 'neutral';

    return {
      score: normalizedScore,
      label,
      confidence: Math.min(totalSentiment / 10, 1),
    };
  }

  private mapSentimentToScore(sentiment: SentimentAnalysis): number {
    // Map sentiment (-1 to 1) to quality score (0 to 100)
    // Neutral is optimal (85), extreme sentiment may indicate bias
    const neutrality = 1 - Math.abs(sentiment.score);
    return 70 + (neutrality * 30);
  }

  private createNeutralSentiment(): SentimentAnalysis {
    return {
      score: 0,
      label: 'neutral',
      confidence: 0,
    };
  }

  private containsSpeculativeLanguage(text: string): boolean {
    const speculative = /\b(maybe|perhaps|possibly|might|could|probably|likely|seems|appears)\b/i;
    const matches = text.match(speculative);
    return (matches?.length || 0) > 3; // More than 3 instances
  }

  private containsContradictions(text: string): boolean {
    // Simple contradiction detection
    const sentences = text.split(/[.!?]+/);

    // Look for negation patterns
    for (let i = 0; i < sentences.length - 1; i++) {
      const current = sentences[i].toLowerCase();
      const next = sentences[i + 1].toLowerCase();

      if ((current.includes('not') || current.includes("n't")) &&
          (next.includes('however') || next.includes('but'))) {
        return true;
      }
    }

    return false;
  }

  private containsUnrealisticClaims(text: string): boolean {
    const unrealistic = /\b(100%|always|never|impossible|guaranteed|perfect|everyone|nobody|everything|nothing)\b/i;
    const matches = text.match(unrealistic);
    return (matches?.length || 0) > 2;
  }

  private lacksCitation(text: string): boolean {
    const hasFactualClaims = /\b(study|research|data|statistics|according to|found that)\b/i.test(text);
    const hasCitations = /\[(.*?)\]|\(.*?\)|https?:\/\//i.test(text);

    return hasFactualClaims && !hasCitations;
  }

  private assessLogicalFlow(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length < 2) return 90;

    // Check for transition words
    const transitions = /\b(however|therefore|furthermore|additionally|consequently|meanwhile|thus)\b/i;
    const transitionCount = sentences.filter(s => transitions.test(s)).length;

    return Math.min(70 + (transitionCount / sentences.length) * 100, 100);
  }

  private assessTopicConsistency(text: string): number {
    // Simple topic consistency check
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length < 2) return 90;

    // Extract key words from first sentence
    const firstSentenceWords = new Set(this.tokenize(sentences[0].toLowerCase()));

    let consistencyScore = 0;
    for (let i = 1; i < sentences.length; i++) {
      const words = this.tokenize(sentences[i].toLowerCase());
      const overlap = words.filter(w => firstSentenceWords.has(w)).length;
      consistencyScore += overlap / words.length;
    }

    return Math.min((consistencyScore / (sentences.length - 1)) * 100, 100);
  }

  private assessGrammar(text: string): number {
    let score = 100;

    // Check for common grammar issues
    if (/\b(your|you're)\b.*\b(your|you're)\b/i.test(text)) score -= 5;
    if (/\b(its|it's)\b.*\b(its|it's)\b/i.test(text)) score -= 5;
    if (/\s{2,}/.test(text)) score -= 5; // Multiple spaces
    if (/[a-z]\.[A-Z]/.test(text)) score -= 10; // Missing space after period

    return Math.max(score, 0);
  }

  private assessStructure(text: string): number {
    let score = 70;

    // Reward good structure
    if (/^#+\s/.test(text)) score += 10; // Has headings
    if (/^[-*]\s/m.test(text)) score += 10; // Has bullet points
    if (/\n\n/.test(text)) score += 10; // Has paragraphs

    return Math.min(score, 100);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }

  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < Math.min(text.length, 1000); i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private getComparisonKey(
    modelA: string,
    providerA: ProviderType,
    modelB: string,
    providerB: ProviderType
  ): string {
    const [first, second] =
      `${providerA}:${modelA}` < `${providerB}:${modelB}`
        ? [{ model: modelA, provider: providerA }, { model: modelB, provider: providerB }]
        : [{ model: modelB, provider: providerB }, { model: modelA, provider: providerA }];

    return `${first.provider}:${first.model}_vs_${second.provider}:${second.model}`;
  }

  private evaluateABTest(test: ABTestResult): void {
    if (test.variants.size < 2) return;

    const variants = Array.from(test.variants.values());

    // Need at least 30 requests per variant for statistical significance
    const minRequests = variants.every(v => v.requestCount >= 30);
    if (!minRequests) return;

    // Find variant with highest quality
    const sorted = variants.sort((a, b) => b.averageQuality - a.averageQuality);
    const best = sorted[0];
    const secondBest = sorted[1];

    // Calculate statistical significance
    const qualityDiff = best.averageQuality - secondBest.averageQuality;
    const confidence = Math.min(qualityDiff / 10, 1); // Simple confidence calculation

    if (confidence > 0.8) {
      test.winner = best.variantId;
      test.confidence = confidence;
      test.endTime = Date.now();

      this.emit('abtest:completed', test);
    }
  }
}
