/**
 * Develop Phase - Enhancement Module
 * Selects strategies and applies optimization techniques
 */

import {
  DevelopResult,
  StrategySelection,
  TechniqueApplication,
  EnhancementPlan,
  RequestType,
  OptimizationTechnique,
  DeconstructResult,
  DiagnoseResult,
} from '../types/interfaces';

export class PromptDeveloper {
  /**
   * Main develop method - enhances prompt based on analysis and diagnosis
   */
  static develop(
    input: string,
    deconstructResult: DeconstructResult,
    diagnoseResult: DiagnoseResult
  ): DevelopResult {
    const strategySelection = this.selectStrategy(deconstructResult, diagnoseResult);
    const techniques = this.selectTechniques(strategySelection, diagnoseResult);
    const enhancementPlan = this.createEnhancementPlan(
      deconstructResult,
      diagnoseResult,
      techniques
    );
    const enhancedPromptDraft = this.applyEnhancements(
      input,
      deconstructResult,
      enhancementPlan,
      techniques
    );

    return {
      strategySelection,
      techniques,
      enhancementPlan,
      enhancedPromptDraft,
    };
  }

  /**
   * Select optimization strategy based on request type
   */
  private static selectStrategy(
    deconstructResult: DeconstructResult,
    diagnoseResult: DiagnoseResult
  ): StrategySelection {
    const domain = deconstructResult.keyEntities.domain;
    const actionVerbs = deconstructResult.coreIntent.actionVerbs;
    const complexity = diagnoseResult.complexityAssessment.level;

    let primaryType: RequestType;
    const secondaryTypes: RequestType[] = [];
    let confidence = 0.5;
    let reasoning = '';

    // Determine primary type based on domain and action verbs
    if (
      domain === 'creative writing' ||
      actionVerbs.some((v) => ['create', 'write', 'design'].includes(v))
    ) {
      primaryType = RequestType.CREATIVE;
      confidence = 0.8;
      reasoning = 'Creative domain with imaginative action verbs';
    } else if (
      domain === 'software development' ||
      domain === 'data science' ||
      actionVerbs.some((v) => ['implement', 'build', 'debug', 'optimize'].includes(v))
    ) {
      primaryType = RequestType.TECHNICAL;
      confidence = 0.85;
      reasoning = 'Technical domain requiring precision and constraints';
    } else if (
      domain === 'education' ||
      actionVerbs.some((v) => ['explain', 'teach', 'describe'].includes(v))
    ) {
      primaryType = RequestType.EDUCATIONAL;
      confidence = 0.8;
      reasoning = 'Educational focus with explanatory objectives';
    } else if (complexity === 'complex' || complexity === 'expert') {
      primaryType = RequestType.COMPLEX;
      confidence = 0.75;
      reasoning = 'High complexity requiring systematic approach';
    } else {
      primaryType = RequestType.TECHNICAL;
      confidence = 0.6;
      reasoning = 'Default to technical approach for clarity and precision';
    }

    // Add secondary types for hybrid approach
    if (complexity === 'complex' || complexity === 'expert') {
      secondaryTypes.push(RequestType.COMPLEX);
    }

    if (primaryType !== RequestType.TECHNICAL && domain.includes('technical')) {
      secondaryTypes.push(RequestType.TECHNICAL);
    }

    return {
      primaryType,
      secondaryTypes,
      confidence,
      reasoning,
    };
  }

  /**
   * Select optimization techniques based on strategy and diagnosis
   */
  private static selectTechniques(
    strategy: StrategySelection,
    diagnoseResult: DiagnoseResult
  ): TechniqueApplication[] {
    const techniques: TechniqueApplication[] = [];

    // Base techniques by strategy type
    switch (strategy.primaryType) {
      case RequestType.CREATIVE:
        techniques.push(
          this.createTechnique(
            OptimizationTechnique.MULTI_PERSPECTIVE,
            true,
            'high',
            'Multiple creative perspectives to inspire diverse ideas'
          ),
          this.createTechnique(
            OptimizationTechnique.TONE_EMPHASIS,
            true,
            'high',
            'Emphasis on creative tone and imaginative language'
          ),
          this.createTechnique(
            OptimizationTechnique.CONTEXT_ENRICHMENT,
            true,
            'medium',
            'Rich contextual details for creative inspiration'
          )
        );
        break;

      case RequestType.TECHNICAL:
        techniques.push(
          this.createTechnique(
            OptimizationTechnique.CONSTRAINT_BASED,
            true,
            'high',
            'Clear constraints and technical requirements'
          ),
          this.createTechnique(
            OptimizationTechnique.PRECISION_FOCUS,
            true,
            'high',
            'Precise terminology and unambiguous instructions'
          ),
          this.createTechnique(
            OptimizationTechnique.CLEAR_STRUCTURE,
            true,
            'high',
            'Logical, step-by-step structure'
          )
        );
        break;

      case RequestType.EDUCATIONAL:
        techniques.push(
          this.createTechnique(
            OptimizationTechnique.FEW_SHOT_EXAMPLES,
            true,
            'high',
            'Concrete examples to illustrate concepts'
          ),
          this.createTechnique(
            OptimizationTechnique.CLEAR_STRUCTURE,
            true,
            'high',
            'Clear learning scaffolding and organization'
          ),
          this.createTechnique(
            OptimizationTechnique.CONTEXT_ENRICHMENT,
            true,
            'medium',
            'Background context for understanding'
          )
        );
        break;

      case RequestType.COMPLEX:
        techniques.push(
          this.createTechnique(
            OptimizationTechnique.CHAIN_OF_THOUGHT,
            true,
            'high',
            'Step-by-step reasoning process'
          ),
          this.createTechnique(
            OptimizationTechnique.SYSTEMATIC_FRAMEWORK,
            true,
            'high',
            'Comprehensive systematic framework'
          ),
          this.createTechnique(
            OptimizationTechnique.DECOMPOSITION,
            true,
            'high',
            'Breaking down complex task into manageable steps'
          )
        );
        break;
    }

    // Add universal techniques based on diagnosis
    if (diagnoseResult.clarityScore.score < 7) {
      techniques.push(
        this.createTechnique(
          OptimizationTechnique.PRECISION_FOCUS,
          true,
          'high',
          'Enhanced clarity through precise language'
        )
      );
    }

    if (diagnoseResult.completenessMatrix.completenessPercentage < 70) {
      techniques.push(
        this.createTechnique(
          OptimizationTechnique.CONTEXT_ENRICHMENT,
          true,
          'high',
          'Fill completeness gaps with context'
        )
      );
    }

    // Always add structure for moderate+ complexity
    if (diagnoseResult.complexityAssessment.level !== 'simple') {
      const hasStructure = techniques.some(
        (t) => t.technique === OptimizationTechnique.CLEAR_STRUCTURE
      );
      if (!hasStructure) {
        techniques.push(
          this.createTechnique(
            OptimizationTechnique.CLEAR_STRUCTURE,
            true,
            'medium',
            'Organized structure for clarity'
          )
        );
      }
    }

    return techniques;
  }

  /**
   * Helper to create technique application
   */
  private static createTechnique(
    technique: OptimizationTechnique,
    applied: boolean,
    impact: 'high' | 'medium' | 'low',
    description: string
  ): TechniqueApplication {
    return { technique, applied, impact, description };
  }

  /**
   * Create enhancement plan
   */
  private static createEnhancementPlan(
    deconstructResult: DeconstructResult,
    diagnoseResult: DiagnoseResult,
    techniques: TechniqueApplication[]
  ): EnhancementPlan {
    const contextEnrichment: string[] = [];
    const structuralEnhancements: string[] = [];
    const clarityAmplifications: string[] = [];
    const constraintDefinitions: string[] = [];
    const exampleIntegrations: string[] = [];
    const verificationCriteria: string[] = [];

    // Context enrichment
    if (deconstructResult.keyEntities.domain !== 'general') {
      contextEnrichment.push(`Domain context: ${deconstructResult.keyEntities.domain}`);
    }

    deconstructResult.gapAnalysis.missing.forEach((gap) => {
      contextEnrichment.push(`Add ${gap.toLowerCase()}`);
    });

    // Structural enhancements
    structuralEnhancements.push(...diagnoseResult.complexityAssessment.structuralNeeds);

    // Clarity amplifications
    diagnoseResult.clarityScore.recommendations.forEach((rec) => {
      clarityAmplifications.push(rec);
    });

    // Constraint definitions
    if (!deconstructResult.requirements.format) {
      constraintDefinitions.push('Define output format');
    }

    if (!deconstructResult.requirements.length) {
      constraintDefinitions.push('Specify length requirements');
    }

    constraintDefinitions.push('Add success criteria');
    constraintDefinitions.push('Define quality expectations');

    // Example integrations
    if (techniques.some((t) => t.technique === OptimizationTechnique.FEW_SHOT_EXAMPLES)) {
      exampleIntegrations.push('Add 1-2 concrete examples');
      exampleIntegrations.push('Show desired output format');
    }

    // Verification criteria
    verificationCriteria.push('Output meets format requirements');
    verificationCriteria.push('All constraints satisfied');
    verificationCriteria.push('Success criteria achievable');

    return {
      contextEnrichment,
      structuralEnhancements,
      clarityAmplifications,
      constraintDefinitions,
      exampleIntegrations,
      verificationCriteria,
    };
  }

  /**
   * Apply enhancements to create draft
   */
  private static applyEnhancements(
    input: string,
    deconstructResult: DeconstructResult,
    plan: EnhancementPlan,
    techniques: TechniqueApplication[]
  ): string {
    const sections: string[] = [];

    // Add role/context section
    sections.push('# ROLE & CONTEXT');
    sections.push(`You are an expert in ${deconstructResult.keyEntities.domain}.`);
    sections.push('');

    // Add objective section
    sections.push('# OBJECTIVE');
    sections.push(deconstructResult.coreIntent.primaryObjective);
    sections.push(`Desired outcome: ${deconstructResult.coreIntent.desiredOutcome}`);
    sections.push('');

    // Add requirements section
    sections.push('# REQUIREMENTS');
    if (deconstructResult.requirements.format) {
      sections.push(`- Format: ${deconstructResult.requirements.format}`);
    }
    if (deconstructResult.requirements.length) {
      sections.push(`- Length: ${deconstructResult.requirements.length}`);
    }
    if (deconstructResult.requirements.tone) {
      sections.push(`- Tone: ${deconstructResult.requirements.tone}`);
    }
    if (deconstructResult.requirements.audience) {
      sections.push(`- Audience: ${deconstructResult.requirements.audience}`);
    }
    sections.push('');

    // Add constraints if any
    if (deconstructResult.keyEntities.constraints.length > 0) {
      sections.push('# CONSTRAINTS');
      deconstructResult.keyEntities.constraints.forEach((constraint) => {
        sections.push(`- ${constraint}`);
      });
      sections.push('');
    }

    // Add context enrichment
    if (plan.contextEnrichment.length > 0) {
      sections.push('# CONTEXT');
      plan.contextEnrichment.forEach((context) => {
        sections.push(`- ${context}`);
      });
      sections.push('');
    }

    // Add success criteria
    sections.push('# SUCCESS CRITERIA');
    if (deconstructResult.requirements.qualityCriteria.length > 0) {
      deconstructResult.requirements.qualityCriteria.forEach((criterion) => {
        sections.push(`- ${criterion}`);
      });
    }
    plan.verificationCriteria.forEach((criterion) => {
      sections.push(`- ${criterion}`);
    });
    sections.push('');

    return sections.join('\n');
  }

  /**
   * Generate development summary
   */
  static summarizeDevelopment(result: DevelopResult): string {
    const lines: string[] = [];

    lines.push('DEVELOP PHASE SUMMARY:');
    lines.push(`Strategy: ${result.strategySelection.primaryType}`);
    lines.push(`Confidence: ${(result.strategySelection.confidence * 100).toFixed(1)}%`);
    lines.push(`Techniques: ${result.techniques.filter((t) => t.applied).length} applied`);

    return lines.join('\n');
  }
}
