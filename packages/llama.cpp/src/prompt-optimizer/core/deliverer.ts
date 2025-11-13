/**
 * Deliver Phase - Finalization Module
 * Finalizes prompt with role assignment, context, structure, and verification
 */

import {
  DeliverResult,
  RoleAssignment,
  ContextImplementation,
  StructureFormatting,
  VerificationProtocol,
  Section,
  DeconstructResult,
  DiagnoseResult,
  DevelopResult,
} from '../types/interfaces';
import { PromptFormatter } from '../utils/formatter';

export class PromptDeliverer {
  /**
   * Main deliver method - finalizes optimized prompt
   */
  static deliver(
    deconstructResult: DeconstructResult,
    diagnoseResult: DiagnoseResult,
    developResult: DevelopResult
  ): DeliverResult {
    const roleAssignment = this.assignRole(deconstructResult, diagnoseResult);
    const contextImplementation = this.implementContext(deconstructResult, developResult);
    const structureFormatting = this.formatStructure(
      deconstructResult,
      diagnoseResult,
      developResult
    );
    const verificationProtocol = this.createVerificationProtocol(deconstructResult, developResult);

    const finalOptimizedPrompt = this.assembleFinalPrompt(
      roleAssignment,
      contextImplementation,
      structureFormatting,
      verificationProtocol
    );

    return {
      roleAssignment,
      contextImplementation,
      structureFormatting,
      verificationProtocol,
      finalOptimizedPrompt,
    };
  }

  /**
   * Assign AI role based on domain and complexity
   */
  private static assignRole(
    deconstructResult: DeconstructResult,
    diagnoseResult: DiagnoseResult
  ): RoleAssignment {
    const domain = deconstructResult.keyEntities.domain;
    const complexity = diagnoseResult.complexityAssessment.level;

    // Determine persona based on domain
    const domainPersonas: Record<string, string> = {
      'software development': 'Senior Software Engineer and System Architect',
      'data science': 'Expert Data Scientist and ML Researcher',
      'creative writing': 'Professional Creative Writer and Storyteller',
      business: 'Strategic Business Consultant and Analyst',
      education: 'Expert Educator and Learning Specialist',
      research: 'Senior Research Scientist and Academic',
      design: 'Senior UX/UI Designer and Creative Director',
      'technical documentation': 'Technical Writer and Documentation Specialist',
      general: 'Expert Professional Specialist',
    };

    const persona = domainPersonas[domain] || domainPersonas['general'];

    // Determine expertise level based on complexity
    const expertiseLevels: Record<string, string> = {
      simple: 'intermediate to advanced',
      moderate: 'advanced',
      complex: 'expert-level',
      expert: 'world-class expert',
    };

    const expertiseLevel = expertiseLevels[complexity] || 'advanced';

    // Determine perspective
    const perspective = this.determinePerspective(deconstructResult);

    // Define capabilities
    const capabilities = this.defineCapabilities(domain, deconstructResult);

    return {
      persona,
      expertiseLevel,
      perspective,
      capabilities,
    };
  }

  /**
   * Determine appropriate perspective
   */
  private static determinePerspective(deconstructResult: DeconstructResult): string {
    const actionVerbs = deconstructResult.coreIntent.actionVerbs;

    if (actionVerbs.some((v) => ['analyze', 'evaluate', 'assess'].includes(v))) {
      return 'analytical and objective';
    }

    if (actionVerbs.some((v) => ['create', 'design', 'build'].includes(v))) {
      return 'creative and solution-oriented';
    }

    if (actionVerbs.some((v) => ['explain', 'teach', 'describe'].includes(v))) {
      return 'educational and clear';
    }

    return 'systematic and thorough';
  }

  /**
   * Define capabilities based on domain
   */
  private static defineCapabilities(
    domain: string,
    deconstructResult: DeconstructResult
  ): string[] {
    const capabilities: string[] = [];

    // Domain-specific capabilities
    const domainCapabilities: Record<string, string[]> = {
      'software development': [
        'Design scalable architectures',
        'Write clean, maintainable code',
        'Implement best practices and design patterns',
        'Debug complex issues systematically',
      ],
      'data science': [
        'Analyze complex datasets',
        'Build predictive models',
        'Apply statistical methods',
        'Visualize insights effectively',
      ],
      'creative writing': [
        'Craft compelling narratives',
        'Develop rich characters',
        'Create vivid descriptions',
        'Maintain consistent tone and style',
      ],
      business: [
        'Analyze market trends',
        'Develop strategic recommendations',
        'Assess risks and opportunities',
        'Create actionable business plans',
      ],
    };

    const baseCaps = domainCapabilities[domain] || [
      'Analyze requirements thoroughly',
      'Provide expert-level insights',
      'Create comprehensive solutions',
      'Ensure quality and accuracy',
    ];

    capabilities.push(...baseCaps);

    // Add quality criteria as capabilities
    if (deconstructResult.requirements.qualityCriteria.length > 0) {
      deconstructResult.requirements.qualityCriteria.forEach((criterion) => {
        capabilities.push(`Ensure ${criterion.toLowerCase()}`);
      });
    }

    return capabilities;
  }

  /**
   * Implement context enrichment
   */
  private static implementContext(
    deconstructResult: DeconstructResult,
    developResult: DevelopResult
  ): ContextImplementation {
    const background: string[] = [];
    const domainKnowledge: string[] = [];
    const edgeCases: string[] = [];
    const assumptions: string[] = [];

    // Background from core intent
    if (deconstructResult.coreIntent.contextualGoals.length > 0) {
      background.push(...deconstructResult.coreIntent.contextualGoals);
    }

    // Domain knowledge
    if (deconstructResult.keyEntities.domain !== 'general') {
      domainKnowledge.push(`Specialized knowledge in ${deconstructResult.keyEntities.domain}`);
    }

    if (deconstructResult.keyEntities.context.length > 0) {
      domainKnowledge.push(...deconstructResult.keyEntities.context);
    }

    // Edge cases
    if (deconstructResult.keyEntities.constraints.length > 0) {
      edgeCases.push('Consider constraint violations');
      edgeCases.push('Handle boundary conditions');
    }

    // Assumptions
    if (deconstructResult.requirements.audience) {
      assumptions.push(`Audience: ${deconstructResult.requirements.audience}`);
    }

    if (deconstructResult.gapAnalysis.ambiguous.length > 0) {
      assumptions.push('Assuming standard interpretations for ambiguous elements');
    }

    return {
      background,
      domainKnowledge,
      edgeCases,
      assumptions,
    };
  }

  /**
   * Format structure with sections
   */
  private static formatStructure(
    deconstructResult: DeconstructResult,
    diagnoseResult: DiagnoseResult,
    developResult: DevelopResult
  ): StructureFormatting {
    const sections: Section[] = [];
    let order = 0;

    // Role & Expertise section
    sections.push({
      title: 'ROLE & EXPERTISE',
      content: 'Define AI persona and capabilities',
      order: order++,
      required: true,
    });

    // Objective section
    sections.push({
      title: 'OBJECTIVE',
      content: deconstructResult.coreIntent.primaryObjective,
      order: order++,
      required: true,
    });

    // Requirements section
    sections.push({
      title: 'REQUIREMENTS',
      content: 'Define format, length, tone, and quality criteria',
      order: order++,
      required: true,
    });

    // Context section (if needed)
    if (
      deconstructResult.keyEntities.context.length > 0 ||
      deconstructResult.keyEntities.domain !== 'general'
    ) {
      sections.push({
        title: 'CONTEXT',
        content: 'Background and domain knowledge',
        order: order++,
        required: false,
      });
    }

    // Constraints section (if applicable)
    if (deconstructResult.keyEntities.constraints.length > 0) {
      sections.push({
        title: 'CONSTRAINTS',
        content: 'Limitations and boundaries',
        order: order++,
        required: true,
      });
    }

    // Instructions/Process section
    sections.push({
      title: 'INSTRUCTIONS',
      content: 'Step-by-step process or methodology',
      order: order++,
      required: true,
    });

    // Output Format section
    if (deconstructResult.requirements.format) {
      sections.push({
        title: 'OUTPUT FORMAT',
        content: `Structured ${deconstructResult.requirements.format} format`,
        order: order++,
        required: true,
      });
    }

    // Verification section
    sections.push({
      title: 'VERIFICATION',
      content: 'Quality checks and success criteria',
      order: order++,
      required: true,
    });

    // Determine formatting type
    const formatting =
      deconstructResult.requirements.format === 'json'
        ? 'json'
        : deconstructResult.requirements.format === 'code'
          ? 'code'
          : 'markdown';

    return {
      sections,
      hierarchy: diagnoseResult.complexityAssessment.level,
      visualClarity: true,
      formatting: formatting as any,
    };
  }

  /**
   * Create verification protocol
   */
  private static createVerificationProtocol(
    deconstructResult: DeconstructResult,
    developResult: DevelopResult
  ): VerificationProtocol {
    const qualityChecks: string[] = [];
    const successCriteria: string[] = [];
    const selfValidation: string[] = [];
    const edgeCaseHandling: string[] = [];

    // Quality checks
    qualityChecks.push('Output is complete and addresses all requirements');
    qualityChecks.push('Formatting matches specified format');
    qualityChecks.push('Language is clear and unambiguous');

    if (deconstructResult.requirements.length) {
      qualityChecks.push(`Length meets ${deconstructResult.requirements.length} requirement`);
    }

    if (deconstructResult.requirements.tone) {
      qualityChecks.push(`Tone matches ${deconstructResult.requirements.tone} style`);
    }

    // Success criteria
    deconstructResult.requirements.qualityCriteria.forEach((criterion) => {
      successCriteria.push(`Achieves ${criterion.toLowerCase()}`);
    });

    successCriteria.push('Meets or exceeds user expectations');
    successCriteria.push('Provides actionable and useful output');

    // Self-validation
    selfValidation.push('Review output for completeness');
    selfValidation.push('Verify all constraints are satisfied');
    selfValidation.push('Check for logical consistency');
    selfValidation.push('Ensure clarity and readability');

    // Edge case handling
    if (deconstructResult.keyEntities.constraints.length > 0) {
      edgeCaseHandling.push('Handle constraint violations gracefully');
      edgeCaseHandling.push('Provide alternatives when constraints conflict');
    }

    edgeCaseHandling.push('Consider boundary conditions');
    edgeCaseHandling.push('Address potential ambiguities');

    return {
      qualityChecks,
      successCriteria,
      selfValidation,
      edgeCaseHandling,
    };
  }

  /**
   * Assemble final optimized prompt
   */
  private static assembleFinalPrompt(
    roleAssignment: RoleAssignment,
    contextImplementation: ContextImplementation,
    structureFormatting: StructureFormatting,
    verificationProtocol: VerificationProtocol
  ): string {
    const sections: string[] = [];

    // Role section
    sections.push(
      PromptFormatter.formatRoleAssignment(
        roleAssignment.persona,
        roleAssignment.expertiseLevel,
        roleAssignment.capabilities
      )
    );

    // Context section (if applicable)
    if (
      contextImplementation.background.length > 0 ||
      contextImplementation.domainKnowledge.length > 0
    ) {
      sections.push(
        PromptFormatter.formatContext(
          contextImplementation.background,
          contextImplementation.domainKnowledge,
          contextImplementation.assumptions
        )
      );
    }

    // Instructions from structure sections
    structureFormatting.sections.forEach((section) => {
      if (section.title !== 'ROLE & EXPERTISE' && section.title !== 'CONTEXT') {
        sections.push(`# ${section.title}\n`);
        sections.push(`${section.content}\n`);
      }
    });

    // Verification protocol
    sections.push(
      PromptFormatter.formatVerificationProtocol(
        verificationProtocol.qualityChecks,
        verificationProtocol.successCriteria
      )
    );

    // Assemble and format
    let finalPrompt = sections.join('\n');
    finalPrompt = PromptFormatter.applyMarkdownFormatting(finalPrompt);

    return finalPrompt;
  }

  /**
   * Generate delivery summary
   */
  static summarizeDelivery(result: DeliverResult): string {
    const lines: string[] = [];

    lines.push('DELIVER PHASE SUMMARY:');
    lines.push(`Role: ${result.roleAssignment.persona}`);
    lines.push(`Expertise: ${result.roleAssignment.expertiseLevel}`);
    lines.push(`Sections: ${result.structureFormatting.sections.length}`);
    lines.push(`Format: ${result.structureFormatting.formatting}`);

    return lines.join('\n');
  }
}
