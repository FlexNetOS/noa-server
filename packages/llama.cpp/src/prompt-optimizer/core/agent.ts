/**
 * Master-Level AI Prompt Optimization Specialist Agent
 * Main orchestrator integrating 4-D methodology
 */

import {
  OptimizationResult,
  OptimizationMetrics,
  OptimizationRationale,
  ComparisonResult,
  AgentConfig,
  AgentState,
} from '../types/interfaces';
import { PromptAnalyzer } from './analyzer';
import { PromptDiagnostics } from './diagnostics';
import { PromptDeveloper } from './developer';
import { PromptDeliverer } from './deliverer';
import { PromptValidator } from '../utils/validator';
import { PromptFormatter } from '../utils/formatter';

export class PromptOptimizationAgent {
  private config: AgentConfig;
  private state: AgentState;

  constructor(config: AgentConfig = {}) {
    this.config = {
      enableLearning: config.enableLearning ?? false,
      enableTemplateLibrary: config.enableTemplateLibrary ?? false,
      enableMultiModal: config.enableMultiModal ?? true,
      qualityThreshold: config.qualityThreshold ?? 7.0,
      maxIterations: config.maxIterations ?? 3,
      verboseOutput: config.verboseOutput ?? true,
      ...config,
    };

    this.state = {
      sessionId: this.generateSessionId(),
      optimizationCount: 0,
      successfulOptimizations: 0,
      averageQualityImprovement: 0,
      learnedPatterns: [],
      templateCache: new Map(),
    };
  }

  /**
   * Main optimization method - executes full 4-D pipeline
   */
  async optimize(input: string): Promise<OptimizationResult> {
    const startTime = Date.now();

    // Validate input
    const inputValidation = PromptValidator.validateInput(input);
    if (!inputValidation.isValid) {
      throw new Error(`Invalid input: ${inputValidation.errors.join(', ')}`);
    }

    try {
      // Phase 1: DECONSTRUCT
      if (this.config.verboseOutput) {
        console.log('🔍 Phase 1: DECONSTRUCT - Analyzing input...');
      }
      const deconstructResult = PromptAnalyzer.deconstruct(input);

      // Phase 2: DIAGNOSE
      if (this.config.verboseOutput) {
        console.log('🩺 Phase 2: DIAGNOSE - Evaluating quality...');
      }
      const diagnoseResult = PromptDiagnostics.diagnose(input, deconstructResult);

      // Check if quality meets threshold
      if (diagnoseResult.overallQualityScore >= this.config.qualityThreshold!) {
        if (this.config.verboseOutput) {
          console.log(
            `✅ Input already meets quality threshold (${diagnoseResult.overallQualityScore}/10)`
          );
        }
      }

      // Phase 3: DEVELOP
      if (this.config.verboseOutput) {
        console.log('🛠️  Phase 3: DEVELOP - Enhancing prompt...');
      }
      const developResult = PromptDeveloper.develop(input, deconstructResult, diagnoseResult);

      // Phase 4: DELIVER
      if (this.config.verboseOutput) {
        console.log('🚀 Phase 4: DELIVER - Finalizing optimization...');
      }
      const deliverResult = PromptDeliverer.deliver(
        deconstructResult,
        diagnoseResult,
        developResult
      );

      // Calculate metrics
      const metrics = this.calculateMetrics(
        input,
        deliverResult.finalOptimizedPrompt,
        diagnoseResult.overallQualityScore,
        startTime
      );

      // Generate rationale
      const rationale = this.generateRationale(
        developResult.techniques,
        deconstructResult,
        diagnoseResult
      );

      // Create comparison
      const comparisonResult: ComparisonResult = {
        original: input,
        optimized: deliverResult.finalOptimizedPrompt,
        improvements: this.identifyImprovements(deconstructResult, diagnoseResult, developResult),
        metricsChange: metrics,
      };

      // Assemble final result
      const result: OptimizationResult = {
        originalInput: input,
        deconstructResult,
        diagnoseResult,
        developResult,
        deliverResult,
        comparisonResult,
        optimizationRationale: rationale,
        metrics,
        timestamp: new Date(),
      };

      // Validate result
      const resultValidation = PromptValidator.validateOptimizationResult(result);
      if (!resultValidation.isValid) {
        console.warn('⚠️  Optimization result has warnings:', resultValidation.warnings);
      }

      // Update state
      this.updateState(result, resultValidation.isValid);

      if (this.config.verboseOutput) {
        console.log('✨ Optimization complete!');
        console.log(
          `Quality improvement: +${metrics.clarityImprovement.toFixed(1)}% clarity, +${metrics.specificityImprovement.toFixed(1)}% specificity`
        );
      }

      return result;
    } catch (error) {
      console.error('❌ Optimization failed:', error);
      throw error;
    }
  }

  /**
   * Optimize and format output as markdown
   */
  async optimizeAndFormat(input: string): Promise<string> {
    const result = await this.optimize(input);
    return PromptFormatter.formatAsMarkdown(result);
  }

  /**
   * Get just the optimized prompt
   */
  async getOptimizedPrompt(input: string): Promise<string> {
    const result = await this.optimize(input);
    return result.deliverResult.finalOptimizedPrompt;
  }

  /**
   * Calculate optimization metrics
   */
  private calculateMetrics(
    original: string,
    optimized: string,
    originalQuality: number,
    startTime: number
  ): OptimizationMetrics {
    const processingTime = Date.now() - startTime;

    // Estimate improvements (simplified calculation)
    const lengthRatio = optimized.length / original.length;
    const structureScore = (optimized.match(/#{1,6}\s/g) || []).length;

    const clarityImprovement = Math.min((10 - originalQuality) * 15, 50);
    const specificityImprovement = Math.min(lengthRatio * 20, 60);
    const completenessImprovement = Math.min(structureScore * 10, 40);

    const totalImprovement = clarityImprovement + specificityImprovement + completenessImprovement;

    let expectedQualityEnhancement: string;
    if (totalImprovement > 100) {
      expectedQualityEnhancement = 'Exceptional - Dramatic improvement';
    } else if (totalImprovement > 70) {
      expectedQualityEnhancement = 'Excellent - Significant improvement';
    } else if (totalImprovement > 40) {
      expectedQualityEnhancement = 'Good - Notable improvement';
    } else {
      expectedQualityEnhancement = 'Moderate - Some improvement';
    }

    return {
      clarityImprovement,
      specificityImprovement,
      completenessImprovement,
      expectedQualityEnhancement,
      processingTime,
    };
  }

  /**
   * Generate optimization rationale
   */
  private generateRationale(
    techniques: any[],
    deconstructResult: any,
    diagnoseResult: any
  ): OptimizationRationale {
    const keyImprovements: string[] = [];
    const techniquesApplied: string[] = [];
    const whyItMatters: string[] = [];
    const expectedBenefits: string[] = [];

    // Key improvements
    if (diagnoseResult.clarityScore.score < 7) {
      keyImprovements.push('Enhanced clarity by removing ambiguous terms');
      whyItMatters.push('Clear instructions reduce misinterpretation and improve output quality');
    }

    if (diagnoseResult.specificityCheck.score < 7) {
      keyImprovements.push('Increased specificity with detailed requirements');
      whyItMatters.push('Specific requirements guide AI to produce precisely what you need');
    }

    if (diagnoseResult.completenessMatrix.completenessPercentage < 70) {
      keyImprovements.push('Filled critical gaps in requirements and context');
      whyItMatters.push('Complete context enables comprehensive and accurate responses');
    }

    keyImprovements.push('Added structured organization with clear sections');
    keyImprovements.push('Defined role and expertise for optimal AI performance');
    keyImprovements.push('Included verification criteria for quality assurance');

    // Techniques applied
    techniques
      .filter((t) => t.applied)
      .forEach((technique) => {
        techniquesApplied.push(`${technique.technique}: ${technique.description}`);
      });

    // Why it matters
    whyItMatters.push('Structured prompts yield more consistent and reliable results');
    whyItMatters.push('Role assignment activates relevant knowledge and capabilities');
    whyItMatters.push('Verification protocols ensure output meets your standards');

    // Expected benefits
    expectedBenefits.push('More accurate and relevant responses');
    expectedBenefits.push('Consistent output quality');
    expectedBenefits.push('Reduced need for follow-up clarifications');
    expectedBenefits.push('Better alignment with your intended goals');

    return {
      keyImprovements,
      techniquesApplied,
      whyItMatters,
      expectedBenefits,
    };
  }

  /**
   * Identify specific improvements
   */
  private identifyImprovements(
    deconstructResult: any,
    diagnoseResult: any,
    developResult: any
  ): string[] {
    const improvements: string[] = [];

    improvements.push(
      `Transformed ${developResult.strategySelection.primaryType} prompt with systematic 4-D methodology`
    );

    deconstructResult.gapAnalysis.criticalGaps.forEach((gap: string) => {
      improvements.push(`Addressed critical gap: ${gap}`);
    });

    diagnoseResult.clarityScore.recommendations.forEach((rec: string) => {
      improvements.push(`Clarity: ${rec}`);
    });

    developResult.techniques
      .filter((t: any) => t.applied && t.impact === 'high')
      .forEach((t: any) => {
        improvements.push(`Applied ${t.technique} for ${t.impact} impact`);
      });

    return improvements;
  }

  /**
   * Update agent state
   */
  private updateState(result: OptimizationResult, success: boolean): void {
    this.state.optimizationCount++;

    if (success) {
      this.state.successfulOptimizations++;
    }

    const totalImprovement =
      result.metrics.clarityImprovement +
      result.metrics.specificityImprovement +
      result.metrics.completenessImprovement;

    this.state.averageQualityImprovement =
      (this.state.averageQualityImprovement * (this.state.optimizationCount - 1) +
        totalImprovement) /
      this.state.optimizationCount;

    if (this.config.enableLearning) {
      this.learnFromOptimization(result);
    }
  }

  /**
   * Learn patterns from successful optimizations
   */
  private learnFromOptimization(result: OptimizationResult): void {
    const pattern = `${result.developResult.strategySelection.primaryType}:${result.diagnoseResult.complexityAssessment.level}`;
    if (!this.state.learnedPatterns.includes(pattern)) {
      this.state.learnedPatterns.push(pattern);
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get agent statistics
   */
  getStats(): AgentState {
    return { ...this.state };
  }

  /**
   * Reset agent state
   */
  reset(): void {
    this.state = {
      sessionId: this.generateSessionId(),
      optimizationCount: 0,
      successfulOptimizations: 0,
      averageQualityImprovement: 0,
      learnedPatterns: [],
      templateCache: new Map(),
    };
  }
}

// Export singleton instance for convenience
export const promptOptimizer = new PromptOptimizationAgent({
  verboseOutput: true,
  enableLearning: true,
  enableMultiModal: true,
});
