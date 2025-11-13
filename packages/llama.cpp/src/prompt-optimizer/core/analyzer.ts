/**
 * Deconstruct Phase - Analysis Module
 * Extracts core intent, entities, requirements, and performs gap analysis
 */

import {
  DeconstructResult,
  CoreIntent,
  KeyEntities,
  Requirements,
  GapAnalysis,
} from '../types/interfaces';
import { PromptParser } from '../utils/parser';

export class PromptAnalyzer {
  /**
   * Main deconstruct method - analyzes input and extracts all components
   */
  static deconstruct(input: string): DeconstructResult {
    const parsed = PromptParser.parseInput(input);

    const coreIntent = this.extractCoreIntent(input, parsed.keywords, parsed.sentences);
    const keyEntities = this.extractKeyEntities(input, parsed);
    const requirements = this.extractRequirements(input);
    const gapAnalysis = this.performGapAnalysis(coreIntent, keyEntities, requirements);

    return {
      coreIntent,
      keyEntities,
      requirements,
      gapAnalysis,
      rawInput: input,
    };
  }

  /**
   * Extract core intent from input
   */
  private static extractCoreIntent(
    input: string,
    keywords: string[],
    sentences: string[]
  ): CoreIntent {
    // Extract action verbs
    const actionVerbs = PromptParser.extractActionVerbs(input);

    // Determine primary objective (usually first sentence or contains main action verb)
    const primaryObjective = sentences[0] || input.substring(0, 150);

    // Determine desired outcome
    const desiredOutcome = this.inferDesiredOutcome(input, actionVerbs);

    // Extract contextual goals
    const contextualGoals = this.extractContextualGoals(sentences);

    return {
      primaryObjective,
      desiredOutcome,
      actionVerbs,
      contextualGoals,
    };
  }

  /**
   * Infer desired outcome from action verbs and context
   */
  private static inferDesiredOutcome(input: string, actionVerbs: string[]): string {
    const outcomePatterns = [
      { pattern: /create|build|generate/, outcome: 'Generate new content or artifact' },
      { pattern: /analyze|evaluate|assess/, outcome: 'Provide analytical insights' },
      { pattern: /explain|describe|summarize/, outcome: 'Clarify understanding' },
      { pattern: /solve|fix|debug/, outcome: 'Resolve problem or issue' },
      { pattern: /improve|optimize|enhance/, outcome: 'Enhance existing solution' },
      { pattern: /research|investigate|explore/, outcome: 'Gather information and insights' },
      { pattern: /plan|organize|structure/, outcome: 'Create organizational framework' },
    ];

    for (const { pattern, outcome } of outcomePatterns) {
      if (actionVerbs.some((verb) => pattern.test(verb)) || pattern.test(input)) {
        return outcome;
      }
    }

    return 'Complete requested task';
  }

  /**
   * Extract contextual goals from sentences
   */
  private static extractContextualGoals(sentences: string[]): string[] {
    const goals: string[] = [];

    sentences.forEach((sentence) => {
      // Look for goal indicators
      if (/\b(to|for|goal|objective|aim|purpose)\b/i.test(sentence)) {
        goals.push(sentence);
      }
    });

    return goals.slice(0, 5); // Limit to top 5 goals
  }

  /**
   * Extract key entities from input
   */
  private static extractKeyEntities(input: string, parsed: any): KeyEntities {
    const subjects: string[] = [];
    const objects: string[] = [];
    const constraints = PromptParser.extractConstraints(input);
    const context: string[] = [];

    // Extract entities
    const entities = parsed.entities || [];
    subjects.push(...entities.slice(0, 3)); // Top 3 entities as subjects

    // Infer domain
    const domain = this.inferDomain(input, parsed.keywords);

    // Extract context indicators
    const contextPatterns = [
      /in the context of ([^,.]+)/gi,
      /for ([^,.]+)/gi,
      /regarding ([^,.]+)/gi,
    ];

    contextPatterns.forEach((pattern) => {
      const matches = input.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) context.push(match[1]);
      }
    });

    return {
      subjects,
      objects,
      constraints,
      context,
      domain,
    };
  }

  /**
   * Infer domain from keywords and content
   */
  private static inferDomain(input: string, keywords: string[]): string {
    const domainKeywords = {
      'software development': ['code', 'function', 'api', 'database', 'programming', 'debug'],
      'data science': ['data', 'analyze', 'model', 'algorithm', 'statistics', 'machine learning'],
      'creative writing': ['story', 'character', 'narrative', 'plot', 'write', 'creative'],
      business: ['business', 'strategy', 'market', 'revenue', 'customer', 'sales'],
      education: ['learn', 'teach', 'explain', 'understand', 'student', 'course'],
      research: ['research', 'study', 'investigate', 'analysis', 'findings', 'hypothesis'],
      design: ['design', 'layout', 'visual', 'ui', 'ux', 'interface'],
      'technical documentation': ['documentation', 'guide', 'manual', 'reference', 'tutorial'],
    };

    let maxMatches = 0;
    let inferredDomain = 'general';

    for (const [domain, domainKeys] of Object.entries(domainKeywords)) {
      const matches = domainKeys.filter(
        (key) => keywords.includes(key) || new RegExp(`\\b${key}\\b`, 'i').test(input)
      ).length;

      if (matches > maxMatches) {
        maxMatches = matches;
        inferredDomain = domain;
      }
    }

    return inferredDomain;
  }

  /**
   * Extract requirements from input
   */
  private static extractRequirements(input: string): Requirements {
    return {
      format: PromptParser.detectOutputFormat(input),
      length: PromptParser.detectLength(input),
      tone: PromptParser.detectTone(input),
      audience: PromptParser.detectAudience(input),
      outputType: this.detectOutputType(input),
      qualityCriteria: this.extractQualityCriteria(input),
    };
  }

  /**
   * Detect output type
   */
  private static detectOutputType(input: string): string | undefined {
    const outputTypes = {
      text: /\btext\b|\bparagraph\b|\bprose\b/i,
      code: /\bcode\b|\bfunction\b|\bscript\b|\bprogram\b/i,
      data: /\bdata\b|\bjson\b|\bcsv\b|\btable\b/i,
      analysis: /\banalysis\b|\breport\b|\binsights\b/i,
      list: /\blist\b|\bitems\b|\bbullets\b/i,
      explanation: /\bexplain\b|\bdescribe\b|\bclarify\b/i,
    };

    for (const [type, pattern] of Object.entries(outputTypes)) {
      if (pattern.test(input)) {
        return type;
      }
    }

    return undefined;
  }

  /**
   * Extract quality criteria
   */
  private static extractQualityCriteria(input: string): string[] {
    const criteria: string[] = [];

    const qualityPatterns = [
      { pattern: /\b(accurate|accuracy)\b/i, criterion: 'Accuracy' },
      { pattern: /\b(clear|clarity)\b/i, criterion: 'Clarity' },
      { pattern: /\b(concise|conciseness)\b/i, criterion: 'Conciseness' },
      { pattern: /\b(comprehensive|complete)\b/i, criterion: 'Completeness' },
      { pattern: /\b(detailed|detail)\b/i, criterion: 'Detail' },
      { pattern: /\b(professional|professionalism)\b/i, criterion: 'Professionalism' },
      { pattern: /\b(efficient|efficiency)\b/i, criterion: 'Efficiency' },
      { pattern: /\b(creative|creativity)\b/i, criterion: 'Creativity' },
    ];

    qualityPatterns.forEach(({ pattern, criterion }) => {
      if (pattern.test(input)) {
        criteria.push(criterion);
      }
    });

    return criteria;
  }

  /**
   * Perform gap analysis
   */
  private static performGapAnalysis(
    coreIntent: CoreIntent,
    keyEntities: KeyEntities,
    requirements: Requirements
  ): GapAnalysis {
    const provided: string[] = [];
    const missing: string[] = [];
    const ambiguous: string[] = [];
    const criticalGaps: string[] = [];

    // Check what's provided
    if (coreIntent.actionVerbs.length > 0) provided.push('Action verbs');
    if (keyEntities.domain !== 'general') provided.push('Domain context');
    if (keyEntities.subjects.length > 0) provided.push('Subject entities');
    if (requirements.format) provided.push('Output format');
    if (requirements.tone) provided.push('Tone');
    if (requirements.audience) provided.push('Target audience');

    // Check what's missing
    if (!requirements.format) {
      missing.push('Output format specification');
      criticalGaps.push('No clear output format defined');
    }

    if (!requirements.length) {
      missing.push('Length requirements');
    }

    if (!requirements.audience) {
      missing.push('Target audience');
    }

    if (requirements.qualityCriteria.length === 0) {
      missing.push('Quality criteria');
      criticalGaps.push('No success criteria defined');
    }

    if (keyEntities.constraints.length === 0) {
      missing.push('Constraints');
    }

    // Check for ambiguity
    if (coreIntent.actionVerbs.length === 0) {
      ambiguous.push('No clear action verb');
      criticalGaps.push('Unclear primary action/objective');
    }

    if (coreIntent.primaryObjective.length < 20) {
      ambiguous.push('Very brief objective');
    }

    return {
      provided,
      missing,
      ambiguous,
      criticalGaps,
    };
  }

  /**
   * Generate deconstruct summary
   */
  static summarizeDeconstruct(result: DeconstructResult): string {
    const lines: string[] = [];

    lines.push('DECONSTRUCT PHASE SUMMARY:');
    lines.push(`Primary Objective: ${result.coreIntent.primaryObjective}`);
    lines.push(`Domain: ${result.keyEntities.domain}`);
    lines.push(
      `Critical Gaps: ${result.gapAnalysis.criticalGaps.length > 0 ? result.gapAnalysis.criticalGaps.join(', ') : 'None'}`
    );

    return lines.join('\n');
  }
}
