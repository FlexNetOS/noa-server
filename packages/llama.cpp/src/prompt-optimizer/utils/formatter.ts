/**
 * Formatting Utilities for Prompt Optimization
 * Handles output formatting, markdown generation, and structure
 */

import { FormattedOutput, Section, OptimizationResult } from '../types/interfaces';

export class PromptFormatter {
  /**
   * Format optimization result as markdown
   */
  static formatAsMarkdown(result: OptimizationResult): string {
    const sections: string[] = [];

    // Header
    sections.push('# AI Prompt Optimization Result\n');
    sections.push(`**Generated**: ${result.timestamp.toISOString()}\n`);
    sections.push('---\n');

    // Original Input
    sections.push('## Original Input\n');
    sections.push('```');
    sections.push(result.originalInput);
    sections.push('```\n');

    // Analysis Breakdown
    sections.push('## Analysis Breakdown (4-D Methodology)\n');

    // 1. DECONSTRUCT
    sections.push('### 1️⃣ DECONSTRUCT\n');
    sections.push('**Core Intent:**');
    sections.push(`- Primary Objective: ${result.deconstructResult.coreIntent.primaryObjective}`);
    sections.push(`- Desired Outcome: ${result.deconstructResult.coreIntent.desiredOutcome}`);
    sections.push(
      `- Action Verbs: ${result.deconstructResult.coreIntent.actionVerbs.join(', ')}\n`
    );

    sections.push('**Key Entities:**');
    sections.push(`- Domain: ${result.deconstructResult.keyEntities.domain}`);
    sections.push(
      `- Subjects: ${result.deconstructResult.keyEntities.subjects.join(', ') || 'None identified'}`
    );
    sections.push(
      `- Context: ${result.deconstructResult.keyEntities.context.join(', ') || 'None identified'}\n`
    );

    sections.push('**Gap Analysis:**');
    sections.push(
      `- Critical Gaps: ${result.deconstructResult.gapAnalysis.criticalGaps.join(', ') || 'None'}`
    );
    sections.push(
      `- Missing Elements: ${result.deconstructResult.gapAnalysis.missing.join(', ') || 'None'}\n`
    );

    // 2. DIAGNOSE
    sections.push('### 2️⃣ DIAGNOSE\n');
    sections.push('**Quality Metrics:**');
    sections.push(`- Clarity Score: ${result.diagnoseResult.clarityScore.score}/10`);
    sections.push(`- Specificity Score: ${result.diagnoseResult.specificityCheck.score}/10`);
    sections.push(
      `- Completeness: ${result.diagnoseResult.completenessMatrix.completenessPercentage}%`
    );
    sections.push(`- Complexity Level: ${result.diagnoseResult.complexityAssessment.level}\n`);

    // 3. DEVELOP
    sections.push('### 3️⃣ DEVELOP\n');
    sections.push('**Strategy Selection:**');
    sections.push(`- Type: ${result.developResult.strategySelection.primaryType}`);
    sections.push(
      `- Confidence: ${(result.developResult.strategySelection.confidence * 100).toFixed(1)}%`
    );
    sections.push(`- Reasoning: ${result.developResult.strategySelection.reasoning}\n`);

    sections.push('**Techniques Applied:**');
    result.developResult.techniques
      .filter((t) => t.applied)
      .forEach((technique) => {
        sections.push(`- ✅ ${technique.technique} (Impact: ${technique.impact})`);
        sections.push(`  ${technique.description}`);
      });
    sections.push('');

    // 4. DELIVER
    sections.push('### 4️⃣ DELIVER\n');
    sections.push('**Role Assignment:**');
    sections.push(`- Persona: ${result.deliverResult.roleAssignment.persona}`);
    sections.push(`- Expertise: ${result.deliverResult.roleAssignment.expertiseLevel}`);
    sections.push(`- Perspective: ${result.deliverResult.roleAssignment.perspective}\n`);

    sections.push('**Verification Protocol:**');
    result.deliverResult.verificationProtocol.successCriteria.forEach((criterion) => {
      sections.push(`- ✓ ${criterion}`);
    });
    sections.push('');

    // Optimized Prompt
    sections.push('---\n');
    sections.push('## Optimized Prompt\n');
    sections.push('```markdown');
    sections.push(result.deliverResult.finalOptimizedPrompt);
    sections.push('```\n');

    // Optimization Rationale
    sections.push('---\n');
    sections.push('## Optimization Rationale\n');
    sections.push('**Key Improvements:**');
    result.optimizationRationale.keyImprovements.forEach((improvement) => {
      sections.push(`- ${improvement}`);
    });
    sections.push('');

    sections.push('**Why It Matters:**');
    result.optimizationRationale.whyItMatters.forEach((reason) => {
      sections.push(`- ${reason}`);
    });
    sections.push('');

    // Metrics
    sections.push('---\n');
    sections.push('## Expected Quality Improvements\n');
    sections.push(`- **Clarity**: +${result.metrics.clarityImprovement.toFixed(1)}%`);
    sections.push(`- **Specificity**: +${result.metrics.specificityImprovement.toFixed(1)}%`);
    sections.push(`- **Completeness**: +${result.metrics.completenessImprovement.toFixed(1)}%`);
    sections.push(`- **Overall Enhancement**: ${result.metrics.expectedQualityEnhancement}`);
    sections.push(`- **Processing Time**: ${result.metrics.processingTime}ms\n`);

    return sections.join('\n');
  }

  /**
   * Format optimization result as JSON
   */
  static formatAsJSON(result: OptimizationResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Format comparison side-by-side
   */
  static formatComparison(original: string, optimized: string): string {
    const sections: string[] = [];

    sections.push('# Before & After Comparison\n');
    sections.push('## BEFORE (Original)\n');
    sections.push('```');
    sections.push(original);
    sections.push('```\n');

    sections.push('## AFTER (Optimized)\n');
    sections.push('```markdown');
    sections.push(optimized);
    sections.push('```\n');

    const originalLength = original.length;
    const optimizedLength = optimized.length;
    const ratio = (optimizedLength / originalLength).toFixed(2);

    sections.push('## Statistics\n');
    sections.push(`- Original Length: ${originalLength} characters`);
    sections.push(`- Optimized Length: ${optimizedLength} characters`);
    sections.push(`- Expansion Ratio: ${ratio}x`);

    return sections.join('\n');
  }

  /**
   * Create structured sections from text
   */
  static createSections(text: string): Section[] {
    const sections: Section[] = [];
    const lines = text.split('\n');
    let currentSection: Section | null = null;
    let order = 0;

    lines.forEach((line) => {
      // Check if line is a header
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          title: headerMatch[2],
          content: '',
          order: order++,
          required: true,
        };
      } else if (currentSection) {
        // Add to current section
        currentSection.content += line + '\n';
      }
    });

    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Format role assignment
   */
  static formatRoleAssignment(persona: string, expertise: string, capabilities: string[]): string {
    const lines: string[] = [];

    lines.push('# ROLE & EXPERTISE\n');
    lines.push(`You are a **${persona}** with **${expertise}** expertise.\n`);

    if (capabilities.length > 0) {
      lines.push('**Capabilities:**');
      capabilities.forEach((capability) => {
        lines.push(`- ${capability}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format verification protocol
   */
  static formatVerificationProtocol(qualityChecks: string[], successCriteria: string[]): string {
    const lines: string[] = [];

    lines.push('# VERIFICATION PROTOCOL\n');

    if (qualityChecks.length > 0) {
      lines.push('## Quality Checks');
      qualityChecks.forEach((check) => {
        lines.push(`- [ ] ${check}`);
      });
      lines.push('');
    }

    if (successCriteria.length > 0) {
      lines.push('## Success Criteria');
      successCriteria.forEach((criterion) => {
        lines.push(`- [ ] ${criterion}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format context implementation
   */
  static formatContext(
    background: string[],
    domainKnowledge: string[],
    assumptions: string[]
  ): string {
    const lines: string[] = [];

    lines.push('# CONTEXT\n');

    if (background.length > 0) {
      lines.push('## Background');
      background.forEach((item) => {
        lines.push(`- ${item}`);
      });
      lines.push('');
    }

    if (domainKnowledge.length > 0) {
      lines.push('## Domain Knowledge');
      domainKnowledge.forEach((item) => {
        lines.push(`- ${item}`);
      });
      lines.push('');
    }

    if (assumptions.length > 0) {
      lines.push('## Assumptions');
      assumptions.forEach((item) => {
        lines.push(`- ${item}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Apply markdown formatting to text
   */
  static applyMarkdownFormatting(text: string): string {
    // Ensure proper spacing around headers
    text = text.replace(/\n(#{1,6}\s)/g, '\n\n$1');

    // Ensure proper list formatting
    text = text.replace(/\n([*-])\s/g, '\n$1 ');

    // Ensure proper code block formatting
    text = text.replace(/```(\w+)?\n/g, '\n```$1\n');

    // Remove excessive blank lines
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
  }

  /**
   * Create summary of optimization
   */
  static createSummary(result: OptimizationResult): string {
    const lines: string[] = [];

    lines.push('# Optimization Summary\n');
    lines.push(`**Strategy**: ${result.developResult.strategySelection.primaryType}`);
    lines.push(`**Complexity**: ${result.diagnoseResult.complexityAssessment.level}`);
    lines.push(`**Quality Score**: ${result.diagnoseResult.overallQualityScore.toFixed(1)}/10`);
    lines.push(
      `**Improvements**: Clarity +${result.metrics.clarityImprovement.toFixed(1)}%, Specificity +${result.metrics.specificityImprovement.toFixed(1)}%, Completeness +${result.metrics.completenessImprovement.toFixed(1)}%`
    );

    return lines.join('\n');
  }
}
