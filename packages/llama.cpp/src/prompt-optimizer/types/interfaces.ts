/**
 * Master-Level AI Prompt Optimization Specialist
 * Type Definitions & Interfaces
 */

// ==================== CORE TYPES ====================

export enum RequestType {
  CREATIVE = 'creative',
  TECHNICAL = 'technical',
  EDUCATIONAL = 'educational',
  COMPLEX = 'complex',
  HYBRID = 'hybrid',
}

export enum OptimizationTechnique {
  MULTI_PERSPECTIVE = 'multi_perspective',
  TONE_EMPHASIS = 'tone_emphasis',
  CONSTRAINT_BASED = 'constraint_based',
  PRECISION_FOCUS = 'precision_focus',
  FEW_SHOT_EXAMPLES = 'few_shot_examples',
  CLEAR_STRUCTURE = 'clear_structure',
  CHAIN_OF_THOUGHT = 'chain_of_thought',
  SYSTEMATIC_FRAMEWORK = 'systematic_framework',
  CONTEXT_ENRICHMENT = 'context_enrichment',
  DECOMPOSITION = 'decomposition',
}

export enum ComplexityLevel {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  EXPERT = 'expert',
}

// ==================== DECONSTRUCT PHASE ====================

export interface CoreIntent {
  primaryObjective: string;
  desiredOutcome: string;
  actionVerbs: string[];
  contextualGoals: string[];
}

export interface KeyEntities {
  subjects: string[];
  objects: string[];
  constraints: string[];
  context: string[];
  domain: string;
}

export interface Requirements {
  format?: string;
  length?: string;
  style?: string;
  tone?: string;
  audience?: string;
  outputType?: string;
  qualityCriteria?: string[];
}

export interface GapAnalysis {
  provided: string[];
  missing: string[];
  ambiguous: string[];
  criticalGaps: string[];
}

export interface DeconstructResult {
  coreIntent: CoreIntent;
  keyEntities: KeyEntities;
  requirements: Requirements;
  gapAnalysis: GapAnalysis;
  rawInput: string;
}

// ==================== DIAGNOSE PHASE ====================

export interface ClarityScore {
  score: number; // 1-10
  ambiguousTerms: string[];
  unclearInstructions: string[];
  recommendations: string[];
}

export interface SpecificityCheck {
  score: number; // 1-10
  vaguePhrases: string[];
  missingDetails: string[];
  improvementAreas: string[];
}

export interface CompletenessMatrix {
  providedElements: string[];
  requiredElements: string[];
  optionalElements: string[];
  completenessPercentage: number;
}

export interface ComplexityAssessment {
  level: ComplexityLevel;
  factors: string[];
  structuralNeeds: string[];
  recommendedApproach: string;
}

export interface DiagnoseResult {
  clarityScore: ClarityScore;
  specificityCheck: SpecificityCheck;
  completenessMatrix: CompletenessMatrix;
  complexityAssessment: ComplexityAssessment;
  overallQualityScore: number;
}

// ==================== DEVELOP PHASE ====================

export interface StrategySelection {
  primaryType: RequestType;
  secondaryTypes: RequestType[];
  confidence: number;
  reasoning: string;
}

export interface TechniqueApplication {
  technique: OptimizationTechnique;
  applied: boolean;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export interface EnhancementPlan {
  contextEnrichment: string[];
  structuralEnhancements: string[];
  clarityAmplifications: string[];
  constraintDefinitions: string[];
  exampleIntegrations: string[];
  verificationCriteria: string[];
}

export interface DevelopResult {
  strategySelection: StrategySelection;
  techniques: TechniqueApplication[];
  enhancementPlan: EnhancementPlan;
  enhancedPromptDraft: string;
}

// ==================== DELIVER PHASE ====================

export interface RoleAssignment {
  persona: string;
  expertiseLevel: string;
  perspective: string;
  capabilities: string[];
}

export interface ContextImplementation {
  background: string[];
  domainKnowledge: string[];
  edgeCases: string[];
  assumptions: string[];
}

export interface StructureFormatting {
  sections: Section[];
  hierarchy: string;
  visualClarity: boolean;
  formatting: 'markdown' | 'json' | 'plain' | 'code';
}

export interface Section {
  title: string;
  content: string;
  order: number;
  required: boolean;
}

export interface VerificationProtocol {
  qualityChecks: string[];
  successCriteria: string[];
  selfValidation: string[];
  edgeCaseHandling: string[];
}

export interface DeliverResult {
  roleAssignment: RoleAssignment;
  contextImplementation: ContextImplementation;
  structureFormatting: StructureFormatting;
  verificationProtocol: VerificationProtocol;
  finalOptimizedPrompt: string;
}

// ==================== OPTIMIZATION RESULT ====================

export interface OptimizationMetrics {
  clarityImprovement: number; // percentage
  specificityImprovement: number; // percentage
  completenessImprovement: number; // percentage
  expectedQualityEnhancement: string;
  processingTime: number; // milliseconds
}

export interface OptimizationRationale {
  keyImprovements: string[];
  techniquesApplied: string[];
  whyItMatters: string[];
  expectedBenefits: string[];
}

export interface ComparisonResult {
  original: string;
  optimized: string;
  improvements: string[];
  metricsChange: OptimizationMetrics;
}

export interface OptimizationResult {
  originalInput: string;
  deconstructResult: DeconstructResult;
  diagnoseResult: DiagnoseResult;
  developResult: DevelopResult;
  deliverResult: DeliverResult;
  comparisonResult: ComparisonResult;
  optimizationRationale: OptimizationRationale;
  metrics: OptimizationMetrics;
  timestamp: Date;
}

// ==================== STRATEGY INTERFACES ====================

export interface OptimizationStrategy {
  readonly type: RequestType;
  readonly techniques: OptimizationTechnique[];
  analyze(input: string, context: DeconstructResult): StrategySelection;
  enhance(draft: string, context: DevelopResult): string;
  validate(optimized: string): boolean;
}

export interface StrategyConfig {
  enableMultiPerspective?: boolean;
  toneGuidance?: string;
  constraintLevel?: 'strict' | 'moderate' | 'flexible';
  exampleCount?: number;
  structureDepth?: number;
  chainOfThoughtSteps?: number;
}

// ==================== AGENT CONFIGURATION ====================

export interface AgentConfig {
  enableLearning?: boolean;
  enableTemplateLibrary?: boolean;
  enableMultiModal?: boolean;
  defaultStrategy?: RequestType;
  strategyConfig?: StrategyConfig;
  qualityThreshold?: number;
  maxIterations?: number;
  verboseOutput?: boolean;
}

export interface AgentState {
  sessionId: string;
  optimizationCount: number;
  successfulOptimizations: number;
  averageQualityImprovement: number;
  learnedPatterns: string[];
  templateCache: Map<string, string>;
}

// ==================== UTILITY TYPES ====================

export interface ParsedInput {
  text: string;
  tokens: string[];
  sentences: string[];
  keywords: string[];
  entities: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface FormattedOutput {
  sections: Section[];
  metadata: Record<string, any>;
  formatting: string;
  rendered: string;
}

// ==================== ERROR TYPES ====================

export class OptimizationError extends Error {
  constructor(
    message: string,
    public code: string,
    public phase: 'deconstruct' | 'diagnose' | 'develop' | 'deliver',
    public context?: any
  ) {
    super(message);
    this.name = 'OptimizationError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ==================== EXPORT ALL ====================

export type {
  ParsedInput,
  ValidationResult,
  FormattedOutput,
  OptimizationStrategy,
  StrategyConfig,
  AgentConfig,
  AgentState,
};
