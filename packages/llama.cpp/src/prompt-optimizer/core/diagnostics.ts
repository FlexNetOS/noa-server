/**
 * Diagnose Phase - Evaluation Module
 * Audits clarity, specificity, completeness, and complexity
 */

import {
  DiagnoseResult,
  ClarityScore,
  SpecificityCheck,
  CompletenessMatrix,
  ComplexityAssessment,
  ComplexityLevel,
  DeconstructResult
} from '../types/interfaces';
import { PromptParser } from '../utils/parser';

export class PromptDiagnostics {
  /**
   * Main diagnose method - evaluates prompt quality
   */
  static diagnose(input: string, deconstructResult: DeconstructResult): DiagnoseResult {
    const clarityScore = this.evaluateClarity(input);
    const specificityCheck = this.evaluateSpecificity(input, deconstructResult);
    const completenessMatrix = this.evaluateCompleteness(deconstructResult);
    const complexityAssessment = this.assessComplexity(input, deconstructResult);

    const overallQualityScore = this.calculateOverallQuality(
      clarityScore.score,
      specificityCheck.score,
      completenessMatrix.completenessPercentage
    );

    return {
      clarityScore,
      specificityCheck,
      completenessMatrix,
      complexityAssessment,
      overallQualityScore
    };
  }

  /**
   * Evaluate clarity (1-10 scale)
   */
  private static evaluateClarity(input: string): ClarityScore {
    const ambiguousTerms = PromptParser.identifyAmbiguousTerms(input);
    const unclearInstructions: string[] = [];
    const recommendations: string[] = [];

    let score = 10;

    // Deduct points for ambiguous terms
    score -= Math.min(ambiguousTerms.length * 0.5, 3);

    // Check for vague language
    const vaguePatterns = [
      { pattern: /\bsome\b/gi, deduction: 0.5, message: 'Use of vague term "some"' },
      { pattern: /\ba few\b/gi, deduction: 0.5, message: 'Use of vague term "a few"' },
      { pattern: /\bseveral\b/gi, deduction: 0.5, message: 'Use of vague term "several"' },
      { pattern: /\bvarious\b/gi, deduction: 0.5, message: 'Use of vague term "various"' },
      { pattern: /\betc\.?\b/gi, deduction: 1, message: 'Use of "etc." without specificity' },
      { pattern: /\band so on\b/gi, deduction: 1, message: 'Use of "and so on"' }
    ];

    vaguePatterns.forEach(({ pattern, deduction, message }) => {
      const matches = input.match(pattern);
      if (matches) {
        score -= deduction * matches.length;
        unclearInstructions.push(message);
      }
    });

    // Check for unclear references
    if (/\bit\b/gi.test(input) && !/what is it|define it/gi.test(input)) {
      score -= 1;
      unclearInstructions.push('Unclear pronoun reference: "it"');
      recommendations.push('Replace "it" with specific noun');
    }

    // Check for run-on sentences
    const sentences = input.split(/[.!?]+/);
    const longSentences = sentences.filter(s => s.split(' ').length > 30);
    if (longSentences.length > 0) {
      score -= longSentences.length * 0.5;
      unclearInstructions.push(`${longSentences.length} overly long sentence(s)`);
      recommendations.push('Break long sentences into shorter, clearer statements');
    }

    // Generate recommendations
    if (ambiguousTerms.length > 0) {
      recommendations.push('Replace ambiguous terms with specific nouns');
    }

    if (unclearInstructions.length > 3) {
      recommendations.push('Rewrite prompt with more direct, specific language');
    }

    score = Math.max(1, Math.min(10, Math.round(score * 10) / 10));

    return {
      score,
      ambiguousTerms,
      unclearInstructions,
      recommendations
    };
  }

  /**
   * Evaluate specificity (1-10 scale)
   */
  private static evaluateSpecificity(
    input: string,
    deconstructResult: DeconstructResult
  ): SpecificityCheck {
    const vaguePhrases: string[] = [];
    const missingDetails: string[] = [];
    const improvementAreas: string[] = [];

    let score = 10;

    // Check for vague action verbs
    const vagueVerbs = ['do', 'make', 'get', 'handle', 'deal with', 'work on'];
    vagueVerbs.forEach(verb => {
      if (new RegExp(`\\b${verb}\\b`, 'i').test(input)) {
        vaguePhrases.push(`Vague verb: "${verb}"`);
        score -= 0.5;
      }
    });

    // Check for specific requirements
    if (!deconstructResult.requirements.format) {
      missingDetails.push('Output format not specified');
      score -= 1.5;
    }

    if (!deconstructResult.requirements.length) {
      missingDetails.push('Length requirements not specified');
      score -= 1;
    }

    if (!deconstructResult.requirements.tone) {
      missingDetails.push('Tone/style not specified');
      score -= 1;
    }

    if (!deconstructResult.requirements.audience) {
      missingDetails.push('Target audience not specified');
      score -= 1;
    }

    // Check for quantifiable criteria
    const hasNumbers = /\d+/.test(input);
    if (!hasNumbers) {
      improvementAreas.push('No quantifiable criteria (numbers, percentages, etc.)');
      score -= 0.5;
    }

    // Check for examples
    const hasExamples = /for example|such as|like|e\.g\./i.test(input);
    if (!hasExamples && input.length > 100) {
      improvementAreas.push('No examples provided');
      score -= 0.5;
    }

    // Check for constraints
    if (deconstructResult.keyEntities.constraints.length === 0) {
      missingDetails.push('No constraints or limitations specified');
      score -= 1;
    }

    // Generate improvement areas
    if (deconstructResult.coreIntent.actionVerbs.length === 0) {
      improvementAreas.push('Add clear action verbs');
    }

    if (missingDetails.length > 2) {
      improvementAreas.push('Provide more comprehensive requirements');
    }

    score = Math.max(1, Math.min(10, Math.round(score * 10) / 10));

    return {
      score,
      vaguePhrases,
      missingDetails,
      improvementAreas
    };
  }

  /**
   * Evaluate completeness
   */
  private static evaluateCompleteness(deconstructResult: DeconstructResult): CompletenessMatrix {
    const providedElements: string[] = [];
    const requiredElements = [
      'Clear objective',
      'Output format',
      'Success criteria',
      'Context',
      'Constraints'
    ];
    const optionalElements = [
      'Examples',
      'Length specification',
      'Tone guidance',
      'Audience definition',
      'Edge cases'
    ];

    // Check what's provided
    if (deconstructResult.coreIntent.primaryObjective.length > 10) {
      providedElements.push('Clear objective');
    }

    if (deconstructResult.requirements.format) {
      providedElements.push('Output format');
    }

    if (deconstructResult.requirements.qualityCriteria.length > 0) {
      providedElements.push('Success criteria');
    }

    if (deconstructResult.keyEntities.context.length > 0 ||
        deconstructResult.keyEntities.domain !== 'general') {
      providedElements.push('Context');
    }

    if (deconstructResult.keyEntities.constraints.length > 0) {
      providedElements.push('Constraints');
    }

    // Check optional elements
    if (deconstructResult.requirements.length) {
      providedElements.push('Length specification');
    }

    if (deconstructResult.requirements.tone) {
      providedElements.push('Tone guidance');
    }

    if (deconstructResult.requirements.audience) {
      providedElements.push('Audience definition');
    }

    // Calculate completeness percentage
    const requiredProvided = requiredElements.filter(el => providedElements.includes(el)).length;
    const completenessPercentage = Math.round((requiredProvided / requiredElements.length) * 100);

    return {
      providedElements,
      requiredElements,
      optionalElements,
      completenessPercentage
    };
  }

  /**
   * Assess complexity
   */
  private static assessComplexity(
    input: string,
    deconstructResult: DeconstructResult
  ): ComplexityAssessment {
    const factors: string[] = [];
    const structuralNeeds: string[] = [];
    let complexityPoints = 0;

    // Factor 1: Input length
    if (input.length > 500) {
      complexityPoints += 2;
      factors.push('Long input text');
    } else if (input.length > 200) {
      complexityPoints += 1;
      factors.push('Medium input length');
    }

    // Factor 2: Number of objectives
    const objectives = deconstructResult.coreIntent.contextualGoals.length +
                      (deconstructResult.coreIntent.actionVerbs.length > 1 ? 1 : 0);
    if (objectives > 3) {
      complexityPoints += 2;
      factors.push('Multiple objectives');
    }

    // Factor 3: Domain complexity
    const complexDomains = ['software development', 'data science', 'research'];
    if (complexDomains.includes(deconstructResult.keyEntities.domain)) {
      complexityPoints += 1;
      factors.push('Complex domain');
    }

    // Factor 4: Number of constraints
    if (deconstructResult.keyEntities.constraints.length > 3) {
      complexityPoints += 1;
      factors.push('Multiple constraints');
    }

    // Factor 5: Text complexity
    const textComplexity = PromptParser.calculateComplexity(input);
    if (textComplexity > 7) {
      complexityPoints += 2;
      factors.push('High linguistic complexity');
    } else if (textComplexity > 5) {
      complexityPoints += 1;
      factors.push('Moderate linguistic complexity');
    }

    // Determine complexity level
    let level: ComplexityLevel;
    if (complexityPoints <= 2) {
      level = ComplexityLevel.SIMPLE;
      structuralNeeds.push('Basic structure with clear sections');
      structuralNeeds.push('Simple bullet points');
    } else if (complexityPoints <= 4) {
      level = ComplexityLevel.MODERATE;
      structuralNeeds.push('Organized sections with headers');
      structuralNeeds.push('Sub-sections for clarity');
      structuralNeeds.push('Examples where helpful');
    } else if (complexityPoints <= 6) {
      level = ComplexityLevel.COMPLEX;
      structuralNeeds.push('Hierarchical structure');
      structuralNeeds.push('Multiple sections and sub-sections');
      structuralNeeds.push('Examples and edge cases');
      structuralNeeds.push('Verification protocols');
    } else {
      level = ComplexityLevel.EXPERT;
      structuralNeeds.push('Comprehensive hierarchical structure');
      structuralNeeds.push('Detailed sections with sub-components');
      structuralNeeds.push('Multiple examples and edge cases');
      structuralNeeds.push('Extensive verification protocols');
      structuralNeeds.push('Background context and assumptions');
    }

    const recommendedApproach = this.getRecommendedApproach(level);

    return {
      level,
      factors,
      structuralNeeds,
      recommendedApproach
    };
  }

  /**
   * Get recommended approach based on complexity
   */
  private static getRecommendedApproach(level: ComplexityLevel): string {
    const approaches = {
      [ComplexityLevel.SIMPLE]: 'Direct, concise prompt with clear instructions',
      [ComplexityLevel.MODERATE]: 'Structured prompt with sections and examples',
      [ComplexityLevel.COMPLEX]: 'Comprehensive prompt with hierarchical organization and verification',
      [ComplexityLevel.EXPERT]: 'Multi-layered prompt with extensive context, examples, and systematic framework'
    };

    return approaches[level];
  }

  /**
   * Calculate overall quality score
   */
  private static calculateOverallQuality(
    clarity: number,
    specificity: number,
    completeness: number
  ): number {
    // Weights: clarity 40%, specificity 35%, completeness 25%
    const completenessScore = completeness / 10; // Convert percentage to 1-10 scale
    const overall = (clarity * 0.4) + (specificity * 0.35) + (completenessScore * 0.25);

    return Math.round(overall * 10) / 10;
  }

  /**
   * Generate diagnosis summary
   */
  static summarizeDiagnosis(result: DiagnoseResult): string {
    const lines: string[] = [];

    lines.push('DIAGNOSE PHASE SUMMARY:');
    lines.push(`Overall Quality: ${result.overallQualityScore}/10`);
    lines.push(`Clarity: ${result.clarityScore.score}/10`);
    lines.push(`Specificity: ${result.specificityCheck.score}/10`);
    lines.push(`Completeness: ${result.completenessMatrix.completenessPercentage}%`);
    lines.push(`Complexity: ${result.complexityAssessment.level}`);

    return lines.join('\n');
  }
}
