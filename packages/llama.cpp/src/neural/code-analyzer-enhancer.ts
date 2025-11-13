/**
 * Neural Code Analyzer Enhancer
 * Extends code-analyzer with llama.cpp neural processing for deeper semantic understanding
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ==================== TYPES ====================

export interface NeuralAnalysisConfig {
  modelPath?: string;
  contextSize?: number;
  temperature?: number;
  maxTokens?: number;
  enablePatternDetection?: boolean;
  enableAntiPatterns?: boolean;
  enableSecurityAnalysis?: boolean;
  enablePerformanceAnalysis?: boolean;
  confidenceThreshold?: number;
}

export interface CodePattern {
  type: 'design' | 'architectural' | 'performance' | 'security';
  name: string;
  description: string;
  location: CodeLocation;
  confidence: number;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  examples?: string[];
}

export interface AntiPattern {
  name: string;
  description: string;
  location: CodeLocation;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  refactoringSuggestion: string;
  codeExample?: string;
}

export interface CodeSmell {
  type: 'complexity' | 'duplication' | 'coupling' | 'cohesion' | 'naming' | 'length';
  name: string;
  description: string;
  location: CodeLocation;
  confidence: number;
  severity: 'minor' | 'moderate' | 'major';
  suggestion: string;
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  nestingDepth: number;
  linesOfCode: number;
  maintainabilityIndex: number;
  technicalDebt: string;
}

export interface SecurityHint {
  category:
    | 'injection'
    | 'authentication'
    | 'authorization'
    | 'cryptography'
    | 'sensitive-data'
    | 'validation';
  description: string;
  location: CodeLocation;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cwe?: string; // Common Weakness Enumeration
  remediation: string;
  secureExample?: string;
}

export interface PerformanceHotspot {
  type: 'algorithmic' | 'memory' | 'io' | 'network' | 'database';
  description: string;
  location: CodeLocation;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  optimization: string;
  estimatedGain?: string;
}

export interface CodeLocation {
  file?: string;
  startLine: number;
  endLine: number;
  snippet?: string;
}

export interface DependencyAnalysis {
  imports: string[];
  exports: string[];
  internalDependencies: string[];
  externalDependencies: string[];
  circularDependencies: string[];
  unusedDependencies: string[];
  dependencyGraph: Record<string, string[]>;
}

export interface ArchitectureConformance {
  conforms: boolean;
  violations: ArchitectureViolation[];
  layerAnalysis: LayerAnalysis[];
  cohesion: number;
  coupling: number;
  recommendations: string[];
}

export interface ArchitectureViolation {
  rule: string;
  description: string;
  location: CodeLocation;
  severity: 'warning' | 'error';
  impact: string;
}

export interface LayerAnalysis {
  layer: string;
  responsibilities: string[];
  violations: string[];
  dependencies: string[];
  isWellDefined: boolean;
}

export interface RefactoringSuggestion {
  type: 'extract-method' | 'rename' | 'move' | 'inline' | 'simplify' | 'decompose';
  description: string;
  location: CodeLocation;
  priority: 'low' | 'medium' | 'high';
  effort: 'small' | 'medium' | 'large';
  benefit: string;
  before?: string;
  after?: string;
}

export interface NeuralCodeAnalysisResult {
  summary: string;
  overallQuality: number; // 0-100
  patterns: CodePattern[];
  antiPatterns: AntiPattern[];
  codeSmells: CodeSmell[];
  complexity: ComplexityMetrics;
  securityHints: SecurityHint[];
  performanceHotspots: PerformanceHotspot[];
  dependencyAnalysis: DependencyAnalysis;
  architectureConformance: ArchitectureConformance;
  refactoringSuggestions: RefactoringSuggestion[];
  confidence: number;
  processingTime: number;
  modelUsed: string;
}

// ==================== NEURAL CODE ANALYZER ====================

export class NeuralCodeAnalyzer {
  private config: Required<NeuralAnalysisConfig>;
  private llamaBridgePath: string;
  private pythonPath: string;

  constructor(config: NeuralAnalysisConfig = {}) {
    this.config = {
      modelPath: config.modelPath || process.env.LLM_MODEL_PATH || '',
      contextSize: config.contextSize || 8192,
      temperature: config.temperature || 0.2, // Lower temp for code analysis
      maxTokens: config.maxTokens || 2048,
      enablePatternDetection: config.enablePatternDetection ?? true,
      enableAntiPatterns: config.enableAntiPatterns ?? true,
      enableSecurityAnalysis: config.enableSecurityAnalysis ?? true,
      enablePerformanceAnalysis: config.enablePerformanceAnalysis ?? true,
      confidenceThreshold: config.confidenceThreshold || 0.7,
    };

    // Find the llama.cpp bridge
    const packageRoot = this.findPackageRoot();
    this.llamaBridgePath = path.join(packageRoot, 'shims', 'http_bridge.py');
    this.pythonPath = process.env.PYTHON_PATH || 'python3';

    this.validateSetup();
  }

  private findPackageRoot(): string {
    let currentDir = __dirname;
    while (currentDir !== '/') {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    throw new Error('Could not find package root');
  }

  private validateSetup(): void {
    if (!fs.existsSync(this.llamaBridgePath)) {
      throw new Error(`llama.cpp bridge not found at ${this.llamaBridgePath}`);
    }
  }

  /**
   * Main neural analysis method - comprehensive code understanding
   */
  async analyzeCode(
    code: string,
    fileType: 'typescript' | 'javascript' | 'python' | 'java' | 'cpp' = 'typescript',
    fileName?: string
  ): Promise<NeuralCodeAnalysisResult> {
    const startTime = Date.now();

    // Build comprehensive analysis prompt
    const prompt = this.buildAnalysisPrompt(code, fileType, fileName);

    // Get neural response
    const response = await this.queryNeuralModel(prompt);

    // Parse and structure the response
    const analysis = this.parseNeuralResponse(response, code, fileName);

    // Add processing metadata
    analysis.processingTime = Date.now() - startTime;
    analysis.modelUsed = this.config.modelPath || 'default';

    return analysis;
  }

  /**
   * Build comprehensive analysis prompt for neural model
   */
  private buildAnalysisPrompt(code: string, fileType: string, fileName?: string): string {
    const sections: string[] = [];

    sections.push(
      `You are an expert code analyst with deep understanding of software engineering principles.`
    );
    sections.push(`Analyze the following ${fileType} code comprehensively.`);
    if (fileName) {
      sections.push(`File: ${fileName}`);
    }

    sections.push(`\n=== CODE TO ANALYZE ===\n\`\`\`${fileType}\n${code}\n\`\`\`\n`);

    sections.push(`Provide a comprehensive analysis in JSON format with the following structure:`);

    const analysisTemplate = {
      summary: 'Brief overall assessment',
      overallQuality: 'Score 0-100',
      patterns: this.config.enablePatternDetection
        ? [
            {
              type: 'design | architectural | performance | security',
              name: 'Pattern name',
              description: 'What this pattern accomplishes',
              location: { startLine: 0, endLine: 0, snippet: 'code snippet' },
              confidence: 0.95,
              severity: 'info | low | medium | high | critical',
              recommendation: 'How to use or improve this pattern',
            },
          ]
        : [],
      antiPatterns: this.config.enableAntiPatterns
        ? [
            {
              name: 'Anti-pattern name',
              description: 'Why this is problematic',
              location: { startLine: 0, endLine: 0, snippet: 'code snippet' },
              confidence: 0.85,
              severity: 'low | medium | high | critical',
              impact: 'Consequences',
              refactoringSuggestion: 'How to fix',
              codeExample: 'Better approach',
            },
          ]
        : [],
      codeSmells: [
        {
          type: 'complexity | duplication | coupling | cohesion | naming | length',
          name: 'Smell name',
          description: "What's wrong",
          location: { startLine: 0, endLine: 0 },
          confidence: 0.8,
          severity: 'minor | moderate | major',
          suggestion: 'How to improve',
        },
      ],
      complexity: {
        cyclomaticComplexity: 0,
        cognitiveComplexity: 0,
        nestingDepth: 0,
        linesOfCode: 0,
        maintainabilityIndex: 0,
        technicalDebt: 'Estimate',
      },
      securityHints: this.config.enableSecurityAnalysis
        ? [
            {
              category:
                'injection | authentication | authorization | cryptography | sensitive-data | validation',
              description: 'Security concern',
              location: { startLine: 0, endLine: 0 },
              confidence: 0.9,
              severity: 'low | medium | high | critical',
              cwe: 'CWE-xxx',
              remediation: 'How to secure',
              secureExample: 'Secure code',
            },
          ]
        : [],
      performanceHotspots: this.config.enablePerformanceAnalysis
        ? [
            {
              type: 'algorithmic | memory | io | network | database',
              description: 'Performance issue',
              location: { startLine: 0, endLine: 0 },
              confidence: 0.85,
              impact: 'low | medium | high',
              optimization: 'How to optimize',
              estimatedGain: 'Expected improvement',
            },
          ]
        : [],
      dependencyAnalysis: {
        imports: [],
        exports: [],
        internalDependencies: [],
        externalDependencies: [],
        circularDependencies: [],
        unusedDependencies: [],
        dependencyGraph: {},
      },
      architectureConformance: {
        conforms: true,
        violations: [],
        layerAnalysis: [],
        cohesion: 0.8,
        coupling: 0.3,
        recommendations: [],
      },
      refactoringSuggestions: [
        {
          type: 'extract-method | rename | move | inline | simplify | decompose',
          description: 'What to refactor',
          location: { startLine: 0, endLine: 0 },
          priority: 'low | medium | high',
          effort: 'small | medium | large',
          benefit: 'Expected benefit',
          before: 'Current code',
          after: 'Improved code',
        },
      ],
      confidence: 0.85,
    };

    sections.push(`\n${JSON.stringify(analysisTemplate, null, 2)}`);

    sections.push(`\nFocus on:`);
    sections.push(`1. Semantic understanding beyond syntax`);
    sections.push(`2. Design patterns and anti-patterns`);
    sections.push(`3. Code quality and maintainability`);
    sections.push(`4. Security vulnerabilities`);
    sections.push(`5. Performance optimization opportunities`);
    sections.push(`6. Architecture conformance`);
    sections.push(`7. Actionable refactoring suggestions`);

    sections.push(`\nProvide ONLY valid JSON in your response.`);

    return sections.join('\n');
  }

  /**
   * Query the neural model via MCP bridge
   */
  private async queryNeuralModel(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        this.llamaBridgePath,
        'chat',
        '--prompt',
        prompt,
        '--context-size',
        this.config.contextSize.toString(),
        '--temperature',
        this.config.temperature.toString(),
        '--max-tokens',
        this.config.maxTokens.toString(),
      ];

      if (this.config.modelPath) {
        args.push('--model', this.config.modelPath);
      }

      const process = spawn(this.pythonPath, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Neural model query failed: ${stderr}`));
        } else {
          try {
            // Extract JSON from response
            const jsonMatch = stdout.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              resolve(result.response || stdout);
            } else {
              resolve(stdout);
            }
          } catch (e) {
            resolve(stdout); // Fallback to raw output
          }
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to spawn neural model process: ${error.message}`));
      });
    });
  }

  /**
   * Parse neural model response into structured analysis
   */
  private parseNeuralResponse(
    response: string,
    originalCode: string,
    fileName?: string
  ): NeuralCodeAnalysisResult {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate and normalize the response
        return this.normalizeAnalysisResult(parsed, originalCode, fileName);
      }
    } catch (e) {
      console.warn('Failed to parse neural response as JSON, using fallback analysis');
    }

    // Fallback: create basic analysis from text response
    return this.createFallbackAnalysis(response, originalCode, fileName);
  }

  /**
   * Normalize and validate neural response
   */
  private normalizeAnalysisResult(
    parsed: any,
    originalCode: string,
    fileName?: string
  ): NeuralCodeAnalysisResult {
    return {
      summary: parsed.summary || 'Code analysis completed',
      overallQuality: this.normalizeScore(parsed.overallQuality),
      patterns: this.normalizePatterns(parsed.patterns || []),
      antiPatterns: this.normalizeAntiPatterns(parsed.antiPatterns || []),
      codeSmells: this.normalizeCodeSmells(parsed.codeSmells || []),
      complexity: this.normalizeComplexity(parsed.complexity || {}),
      securityHints: this.normalizeSecurityHints(parsed.securityHints || []),
      performanceHotspots: this.normalizePerformanceHotspots(parsed.performanceHotspots || []),
      dependencyAnalysis: this.normalizeDependencyAnalysis(parsed.dependencyAnalysis || {}),
      architectureConformance: this.normalizeArchitectureConformance(
        parsed.architectureConformance || {}
      ),
      refactoringSuggestions: this.normalizeRefactoringSuggestions(
        parsed.refactoringSuggestions || []
      ),
      confidence: this.normalizeScore(parsed.confidence),
      processingTime: 0, // Will be set by caller
      modelUsed: '', // Will be set by caller
    };
  }

  /**
   * Create fallback analysis when neural parsing fails
   */
  private createFallbackAnalysis(
    response: string,
    originalCode: string,
    fileName?: string
  ): NeuralCodeAnalysisResult {
    const lines = originalCode.split('\n');

    return {
      summary: 'Basic static analysis (neural parsing failed)',
      overallQuality: 50,
      patterns: [],
      antiPatterns: [],
      codeSmells: [],
      complexity: {
        cyclomaticComplexity: 0,
        cognitiveComplexity: 0,
        nestingDepth: 0,
        linesOfCode: lines.length,
        maintainabilityIndex: 50,
        technicalDebt: 'Unknown',
      },
      securityHints: [],
      performanceHotspots: [],
      dependencyAnalysis: {
        imports: [],
        exports: [],
        internalDependencies: [],
        externalDependencies: [],
        circularDependencies: [],
        unusedDependencies: [],
        dependencyGraph: {},
      },
      architectureConformance: {
        conforms: true,
        violations: [],
        layerAnalysis: [],
        cohesion: 0.5,
        coupling: 0.5,
        recommendations: ['Neural analysis failed - using static analysis fallback'],
      },
      refactoringSuggestions: [],
      confidence: 0.3,
      processingTime: 0,
      modelUsed: '',
    };
  }

  // ==================== NORMALIZATION HELPERS ====================

  private normalizeScore(value: any): number {
    const num = typeof value === 'number' ? value : parseFloat(value) || 0;
    return Math.max(0, Math.min(100, num));
  }

  private normalizePatterns(patterns: any[]): CodePattern[] {
    return patterns.map((p) => ({
      type: p.type || 'design',
      name: p.name || 'Unknown Pattern',
      description: p.description || '',
      location: this.normalizeLocation(p.location),
      confidence: this.normalizeScore(p.confidence) / 100,
      severity: p.severity || 'info',
      recommendation: p.recommendation || '',
      examples: p.examples || [],
    }));
  }

  private normalizeAntiPatterns(antiPatterns: any[]): AntiPattern[] {
    return antiPatterns.map((ap) => ({
      name: ap.name || 'Unknown Anti-Pattern',
      description: ap.description || '',
      location: this.normalizeLocation(ap.location),
      confidence: this.normalizeScore(ap.confidence) / 100,
      severity: ap.severity || 'medium',
      impact: ap.impact || '',
      refactoringSuggestion: ap.refactoringSuggestion || '',
      codeExample: ap.codeExample,
    }));
  }

  private normalizeCodeSmells(smells: any[]): CodeSmell[] {
    return smells.map((s) => ({
      type: s.type || 'complexity',
      name: s.name || 'Code Smell',
      description: s.description || '',
      location: this.normalizeLocation(s.location),
      confidence: this.normalizeScore(s.confidence) / 100,
      severity: s.severity || 'moderate',
      suggestion: s.suggestion || '',
    }));
  }

  private normalizeComplexity(complexity: any): ComplexityMetrics {
    return {
      cyclomaticComplexity: complexity.cyclomaticComplexity || 0,
      cognitiveComplexity: complexity.cognitiveComplexity || 0,
      nestingDepth: complexity.nestingDepth || 0,
      linesOfCode: complexity.linesOfCode || 0,
      maintainabilityIndex: this.normalizeScore(complexity.maintainabilityIndex),
      technicalDebt: complexity.technicalDebt || 'Unknown',
    };
  }

  private normalizeSecurityHints(hints: any[]): SecurityHint[] {
    return hints.map((h) => ({
      category: h.category || 'validation',
      description: h.description || '',
      location: this.normalizeLocation(h.location),
      confidence: this.normalizeScore(h.confidence) / 100,
      severity: h.severity || 'medium',
      cwe: h.cwe,
      remediation: h.remediation || '',
      secureExample: h.secureExample,
    }));
  }

  private normalizePerformanceHotspots(hotspots: any[]): PerformanceHotspot[] {
    return hotspots.map((h) => ({
      type: h.type || 'algorithmic',
      description: h.description || '',
      location: this.normalizeLocation(h.location),
      confidence: this.normalizeScore(h.confidence) / 100,
      impact: h.impact || 'medium',
      optimization: h.optimization || '',
      estimatedGain: h.estimatedGain,
    }));
  }

  private normalizeDependencyAnalysis(deps: any): DependencyAnalysis {
    return {
      imports: deps.imports || [],
      exports: deps.exports || [],
      internalDependencies: deps.internalDependencies || [],
      externalDependencies: deps.externalDependencies || [],
      circularDependencies: deps.circularDependencies || [],
      unusedDependencies: deps.unusedDependencies || [],
      dependencyGraph: deps.dependencyGraph || {},
    };
  }

  private normalizeArchitectureConformance(arch: any): ArchitectureConformance {
    return {
      conforms: arch.conforms ?? true,
      violations: arch.violations || [],
      layerAnalysis: arch.layerAnalysis || [],
      cohesion: this.normalizeScore(arch.cohesion) / 100,
      coupling: this.normalizeScore(arch.coupling) / 100,
      recommendations: arch.recommendations || [],
    };
  }

  private normalizeRefactoringSuggestions(suggestions: any[]): RefactoringSuggestion[] {
    return suggestions.map((s) => ({
      type: s.type || 'simplify',
      description: s.description || '',
      location: this.normalizeLocation(s.location),
      priority: s.priority || 'medium',
      effort: s.effort || 'medium',
      benefit: s.benefit || '',
      before: s.before,
      after: s.after,
    }));
  }

  private normalizeLocation(loc: any): CodeLocation {
    return {
      file: loc?.file,
      startLine: loc?.startLine || 1,
      endLine: loc?.endLine || 1,
      snippet: loc?.snippet,
    };
  }

  /**
   * Batch analyze multiple files
   */
  async analyzeMultipleFiles(
    files: Array<{ code: string; fileName: string; fileType?: string }>
  ): Promise<Map<string, NeuralCodeAnalysisResult>> {
    const results = new Map<string, NeuralCodeAnalysisResult>();

    for (const file of files) {
      const fileType = file.fileType || this.detectFileType(file.fileName);
      const analysis = await this.analyzeCode(file.code, fileType as any, file.fileName);
      results.set(file.fileName, analysis);
    }

    return results;
  }

  private detectFileType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const typeMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.cxx': 'cpp',
    };
    return typeMap[ext] || 'typescript';
  }

  /**
   * Generate summary report from analysis
   */
  generateReport(analysis: NeuralCodeAnalysisResult): string {
    const sections: string[] = [];

    sections.push('# Neural Code Analysis Report\n');
    sections.push(`**Overall Quality:** ${analysis.overallQuality}/100`);
    sections.push(`**Confidence:** ${(analysis.confidence * 100).toFixed(1)}%`);
    sections.push(`**Processing Time:** ${analysis.processingTime}ms\n`);

    sections.push(`## Summary\n${analysis.summary}\n`);

    if (analysis.patterns.length > 0) {
      sections.push(`## Detected Patterns (${analysis.patterns.length})\n`);
      analysis.patterns.forEach((p) => {
        sections.push(
          `- **${p.name}** (${p.type}, confidence: ${(p.confidence * 100).toFixed(1)}%)`
        );
        sections.push(`  ${p.description}`);
        sections.push(`  *Recommendation:* ${p.recommendation}\n`);
      });
    }

    if (analysis.antiPatterns.length > 0) {
      sections.push(`## Anti-Patterns (${analysis.antiPatterns.length})\n`);
      analysis.antiPatterns.forEach((ap) => {
        sections.push(`- **${ap.name}** [${ap.severity.toUpperCase()}]`);
        sections.push(`  ${ap.description}`);
        sections.push(`  *Impact:* ${ap.impact}`);
        sections.push(`  *Fix:* ${ap.refactoringSuggestion}\n`);
      });
    }

    if (analysis.securityHints.length > 0) {
      sections.push(`## Security Concerns (${analysis.securityHints.length})\n`);
      analysis.securityHints.forEach((h) => {
        sections.push(`- **${h.category}** [${h.severity.toUpperCase()}]`);
        sections.push(`  ${h.description}`);
        if (h.cwe) sections.push(`  CWE: ${h.cwe}`);
        sections.push(`  *Remediation:* ${h.remediation}\n`);
      });
    }

    sections.push(`## Complexity Metrics\n`);
    sections.push(`- Cyclomatic Complexity: ${analysis.complexity.cyclomaticComplexity}`);
    sections.push(`- Cognitive Complexity: ${analysis.complexity.cognitiveComplexity}`);
    sections.push(`- Maintainability Index: ${analysis.complexity.maintainabilityIndex}/100`);
    sections.push(`- Technical Debt: ${analysis.complexity.technicalDebt}\n`);

    if (analysis.refactoringSuggestions.length > 0) {
      sections.push(`## Refactoring Suggestions (${analysis.refactoringSuggestions.length})\n`);
      analysis.refactoringSuggestions.forEach((s) => {
        sections.push(`- **${s.type}** [${s.priority} priority, ${s.effort} effort]`);
        sections.push(`  ${s.description}`);
        sections.push(`  *Benefit:* ${s.benefit}\n`);
      });
    }

    return sections.join('\n');
  }
}

// ==================== EXPORTS ====================

export default NeuralCodeAnalyzer;
