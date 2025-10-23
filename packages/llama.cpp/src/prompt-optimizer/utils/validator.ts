/**
 * Validation Utilities for Prompt Optimization
 * Validates inputs, outputs, and optimization quality
 */

import { ValidationResult, OptimizationResult } from '../types/interfaces';

export class PromptValidator {
  private static readonly MIN_INPUT_LENGTH = 10;
  private static readonly MAX_INPUT_LENGTH = 10000;
  private static readonly MIN_QUALITY_SCORE = 5.0;

  /**
   * Validate input prompt
   */
  static validateInput(input: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check length
    if (input.length < this.MIN_INPUT_LENGTH) {
      errors.push(`Input too short (minimum ${this.MIN_INPUT_LENGTH} characters)`);
    }

    if (input.length > this.MAX_INPUT_LENGTH) {
      errors.push(`Input too long (maximum ${this.MAX_INPUT_LENGTH} characters)`);
    }

    // Check for empty or whitespace-only input
    if (!input.trim()) {
      errors.push('Input cannot be empty or whitespace-only');
    }

    // Check for common issues
    if (input.split(' ').length < 3) {
      warnings.push('Input is very brief, consider adding more context');
      suggestions.push('Provide more details about your desired output');
    }

    // Check for unclear pronouns
    const unclearPronouns = ['it', 'this', 'that', 'they'];
    const hasUnclearPronouns = unclearPronouns.some(pronoun =>
      new RegExp(`\\b${pronoun}\\b`, 'i').test(input)
    );

    if (hasUnclearPronouns) {
      warnings.push('Input contains unclear pronouns that may cause ambiguity');
      suggestions.push('Replace pronouns with specific nouns for clarity');
    }

    // Check for missing action verbs
    const actionVerbs = ['create', 'write', 'generate', 'build', 'analyze', 'explain'];
    const hasActionVerb = actionVerbs.some(verb =>
      new RegExp(`\\b${verb}\\b`, 'i').test(input)
    );

    if (!hasActionVerb) {
      warnings.push('No clear action verb found');
      suggestions.push('Start with a clear action verb (e.g., "Create...", "Analyze...")');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate optimized prompt
   */
  static validateOptimizedPrompt(optimized: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check length
    if (optimized.length < this.MIN_INPUT_LENGTH * 2) {
      warnings.push('Optimized prompt may be too brief');
      suggestions.push('Consider adding more context and structure');
    }

    // Check for structure
    const hasStructure = /#{1,6}\s/.test(optimized) || /\n\n/.test(optimized);
    if (!hasStructure) {
      warnings.push('Optimized prompt lacks clear structure');
      suggestions.push('Add sections with headers or clear paragraph breaks');
    }

    // Check for role assignment
    const hasRole = /you are|as a|role:|persona:/i.test(optimized);
    if (!hasRole) {
      warnings.push('No clear role assignment found');
      suggestions.push('Define the AI\'s role or expertise area');
    }

    // Check for constraints
    const hasConstraints = /must|should|required|constraint|limit/i.test(optimized);
    if (!hasConstraints) {
      warnings.push('No explicit constraints defined');
      suggestions.push('Add clear constraints and requirements');
    }

    // Check for success criteria
    const hasSuccessCriteria = /success|criteria|validate|verify|check/i.test(optimized);
    if (!hasSuccessCriteria) {
      warnings.push('No success criteria or validation instructions');
      suggestions.push('Include criteria for evaluating output quality');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate optimization result
   */
  static validateOptimizationResult(result: OptimizationResult): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check quality improvement
    const qualityImprovement = result.metrics.clarityImprovement +
                               result.metrics.specificityImprovement +
                               result.metrics.completenessImprovement;

    if (qualityImprovement < 30) {
      warnings.push('Quality improvement is below expected threshold (30%)');
      suggestions.push('Consider applying additional optimization techniques');
    }

    // Check clarity score
    if (result.diagnoseResult.clarityScore.score < this.MIN_QUALITY_SCORE) {
      errors.push(`Clarity score too low: ${result.diagnoseResult.clarityScore.score}/10`);
    }

    // Check specificity score
    if (result.diagnoseResult.specificityCheck.score < this.MIN_QUALITY_SCORE) {
      errors.push(`Specificity score too low: ${result.diagnoseResult.specificityCheck.score}/10`);
    }

    // Check completeness
    const completeness = result.diagnoseResult.completenessMatrix.completenessPercentage;
    if (completeness < 70) {
      warnings.push(`Completeness below 70%: ${completeness}%`);
      suggestions.push('Add missing required elements identified in gap analysis');
    }

    // Validate optimized prompt
    const optimizedValidation = this.validateOptimizedPrompt(
      result.deliverResult.finalOptimizedPrompt
    );

    errors.push(...optimizedValidation.errors);
    warnings.push(...optimizedValidation.warnings);
    suggestions.push(...optimizedValidation.suggestions);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Check if text contains required elements
   */
  static hasRequiredElements(text: string, elements: string[]): boolean {
    return elements.every(element =>
      new RegExp(element, 'i').test(text)
    );
  }

  /**
   * Calculate quality score (1-10)
   */
  static calculateQualityScore(
    clarity: number,
    specificity: number,
    completeness: number
  ): number {
    const weights = {
      clarity: 0.4,
      specificity: 0.35,
      completeness: 0.25
    };

    const score = (clarity * weights.clarity) +
                  (specificity * weights.specificity) +
                  (completeness * weights.completeness);

    return Math.min(Math.max(score, 1), 10);
  }

  /**
   * Validate strategy selection
   */
  static validateStrategySelection(
    type: string,
    confidence: number
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (confidence < 0.5) {
      warnings.push(`Low confidence in strategy selection: ${(confidence * 100).toFixed(1)}%`);
      suggestions.push('Consider hybrid approach or manual strategy selection');
    }

    if (!type) {
      errors.push('No strategy type selected');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Check prompt length appropriateness
   */
  static checkLengthAppropriateness(
    original: string,
    optimized: string
  ): { appropriate: boolean; ratio: number; recommendation: string } {
    const ratio = optimized.length / original.length;

    if (ratio < 1.5) {
      return {
        appropriate: false,
        ratio,
        recommendation: 'Optimized prompt should be at least 1.5x longer than original'
      };
    }

    if (ratio > 10) {
      return {
        appropriate: false,
        ratio,
        recommendation: 'Optimized prompt may be excessively long (>10x original)'
      };
    }

    return {
      appropriate: true,
      ratio,
      recommendation: 'Length ratio is appropriate'
    };
  }
}
