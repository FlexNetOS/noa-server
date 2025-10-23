/**
 * Parser Utilities for Prompt Optimization
 * Handles text parsing, tokenization, and entity extraction
 */

import { ParsedInput } from '../types/interfaces';

export class PromptParser {
  private static readonly ACTION_VERBS = [
    'create', 'build', 'design', 'develop', 'implement', 'write', 'generate',
    'analyze', 'evaluate', 'assess', 'review', 'optimize', 'improve',
    'explain', 'describe', 'summarize', 'outline', 'detail',
    'solve', 'fix', 'debug', 'refactor', 'enhance',
    'research', 'investigate', 'explore', 'discover',
    'plan', 'organize', 'structure', 'arrange'
  ];

  private static readonly CONSTRAINT_INDICATORS = [
    'must', 'should', 'need', 'require', 'only', 'exactly',
    'within', 'limit', 'maximum', 'minimum', 'no more than',
    'at least', 'between', 'range', 'constraint'
  ];

  private static readonly QUALITY_INDICATORS = [
    'professional', 'high-quality', 'detailed', 'comprehensive',
    'thorough', 'precise', 'accurate', 'clear', 'concise',
    'elegant', 'efficient', 'robust', 'scalable'
  ];

  /**
   * Parse input text into structured components
   */
  static parseInput(text: string): ParsedInput {
    const cleaned = this.cleanText(text);
    const tokens = this.tokenize(cleaned);
    const sentences = this.extractSentences(cleaned);
    const keywords = this.extractKeywords(tokens);
    const entities = this.extractEntities(cleaned);

    return {
      text: cleaned,
      tokens,
      sentences,
      keywords,
      entities
    };
  }

  /**
   * Clean and normalize text
   */
  private static cleanText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\S\n]+/g, ' ');
  }

  /**
   * Tokenize text into words
   */
  private static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[\s,;.!?()[\]{}]+/)
      .filter(token => token.length > 0);
  }

  /**
   * Extract sentences
   */
  private static extractSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Extract keywords (action verbs, constraints, quality indicators)
   */
  private static extractKeywords(tokens: string[]): string[] {
    const keywords = new Set<string>();

    tokens.forEach(token => {
      if (this.ACTION_VERBS.includes(token)) {
        keywords.add(token);
      }
      if (this.CONSTRAINT_INDICATORS.some(ind => token.includes(ind))) {
        keywords.add(token);
      }
      if (this.QUALITY_INDICATORS.some(ind => token.includes(ind))) {
        keywords.add(token);
      }
    });

    return Array.from(keywords);
  }

  /**
   * Extract named entities and important nouns
   */
  private static extractEntities(text: string): string[] {
    const entities: string[] = [];

    // Extract capitalized words (potential entities)
    const capitalizedMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
    if (capitalizedMatches) {
      entities.push(...capitalizedMatches);
    }

    // Extract quoted strings
    const quotedMatches = text.match(/"([^"]+)"|'([^']+)'/g);
    if (quotedMatches) {
      entities.push(...quotedMatches.map(m => m.replace(/["']/g, '')));
    }

    // Extract code-like patterns
    const codeMatches = text.match(/`([^`]+)`/g);
    if (codeMatches) {
      entities.push(...codeMatches.map(m => m.replace(/`/g, '')));
    }

    return [...new Set(entities)];
  }

  /**
   * Extract action verbs from text
   */
  static extractActionVerbs(text: string): string[] {
    const tokens = this.tokenize(text);
    return tokens.filter(token => this.ACTION_VERBS.includes(token));
  }

  /**
   * Extract constraints from text
   */
  static extractConstraints(text: string): string[] {
    const constraints: string[] = [];
    const sentences = this.extractSentences(text);

    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      if (this.CONSTRAINT_INDICATORS.some(ind => lowerSentence.includes(ind))) {
        constraints.push(sentence);
      }
    });

    return constraints;
  }

  /**
   * Detect output format requirements
   */
  static detectOutputFormat(text: string): string | undefined {
    const formats = {
      'json': /\bjson\b/i,
      'markdown': /\bmarkdown\b|\bmd\b/i,
      'code': /\bcode\b|\bfunction\b|\bclass\b/i,
      'list': /\blist\b|\bbullet\b|\bitems\b/i,
      'table': /\btable\b|\bgrid\b/i,
      'diagram': /\bdiagram\b|\bvisualization\b/i,
      'step-by-step': /\bstep[- ]by[- ]step\b|\bsteps\b/i
    };

    for (const [format, pattern] of Object.entries(formats)) {
      if (pattern.test(text)) {
        return format;
      }
    }

    return undefined;
  }

  /**
   * Detect tone requirements
   */
  static detectTone(text: string): string | undefined {
    const tones = {
      'formal': /\bformal\b|\bprofessional\b|\bacademic\b/i,
      'casual': /\bcasual\b|\bconversational\b|\bfriendly\b/i,
      'technical': /\btechnical\b|\bdetailed\b|\bprecise\b/i,
      'creative': /\bcreative\b|\bimaginative\b|\binnovative\b/i,
      'persuasive': /\bpersuasive\b|\bconvincing\b|\bcompelling\b/i
    };

    for (const [tone, pattern] of Object.entries(tones)) {
      if (pattern.test(text)) {
        return tone;
      }
    }

    return undefined;
  }

  /**
   * Detect audience
   */
  static detectAudience(text: string): string | undefined {
    const audiences = {
      'beginner': /\bbeginner\b|\bnovice\b|\bstarter\b/i,
      'intermediate': /\bintermediate\b/i,
      'expert': /\bexpert\b|\badvanced\b|\bprofessional\b/i,
      'general': /\bgeneral\b|\beveryone\b|\banyone\b/i,
      'technical': /\bdeveloper\b|\bengineer\b|\btechnical\b/i
    };

    for (const [audience, pattern] of Object.entries(audiences)) {
      if (pattern.test(text)) {
        return audience;
      }
    }

    return undefined;
  }

  /**
   * Detect length requirements
   */
  static detectLength(text: string): string | undefined {
    const lengthPatterns = {
      'brief': /\bbrief\b|\bshort\b|\bconcise\b|\bsummary\b/i,
      'medium': /\bmedium\b|\bmoderate\b/i,
      'detailed': /\bdetailed\b|\bcomprehensive\b|\bthorough\b|\bin-depth\b/i,
      'extensive': /\bextensive\b|\bexhaustive\b|\bcomplete\b/i
    };

    // Check for specific word/character counts
    const wordCountMatch = text.match(/(\d+)\s*words?/i);
    if (wordCountMatch) {
      return `${wordCountMatch[1]} words`;
    }

    const charCountMatch = text.match(/(\d+)\s*characters?/i);
    if (charCountMatch) {
      return `${charCountMatch[1]} characters`;
    }

    // Check for descriptive length indicators
    for (const [length, pattern] of Object.entries(lengthPatterns)) {
      if (pattern.test(text)) {
        return length;
      }
    }

    return undefined;
  }

  /**
   * Identify ambiguous terms that need clarification
   */
  static identifyAmbiguousTerms(text: string): string[] {
    const ambiguous: string[] = [];
    const ambiguousPatterns = [
      /\bit\b/gi,
      /\bthis\b/gi,
      /\bthat\b/gi,
      /\bthey\b/gi,
      /\bsome\b/gi,
      /\bfew\b/gi,
      /\bseveral\b/gi,
      /\bvarious\b/gi,
      /\betc\.?\b/gi,
      /\band so on\b/gi
    ];

    ambiguousPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        ambiguous.push(...matches.map(m => m.toLowerCase()));
      }
    });

    return [...new Set(ambiguous)];
  }

  /**
   * Calculate text complexity score (1-10)
   */
  static calculateComplexity(text: string): number {
    const sentences = this.extractSentences(text);
    const words = this.tokenize(text);

    // Average sentence length
    const avgSentenceLength = words.length / sentences.length;

    // Vocabulary diversity (unique words / total words)
    const uniqueWords = new Set(words);
    const vocabularyDiversity = uniqueWords.size / words.length;

    // Technical term density
    const technicalTerms = words.filter(w => w.length > 8).length;
    const technicalDensity = technicalTerms / words.length;

    // Complexity factors
    const lengthFactor = Math.min(avgSentenceLength / 20, 1) * 3;
    const diversityFactor = vocabularyDiversity * 3;
    const technicalFactor = technicalDensity * 4;

    const complexity = lengthFactor + diversityFactor + technicalFactor;
    return Math.min(Math.max(Math.round(complexity), 1), 10);
  }
}
