/**
 * Prompt Configuration for AI Question Generation
 *
 * This file contains configurable prompt templates for languages,
 * replacing hardcoded strings in the Gemini integration.
 *
 * Requirements: 3.1, 3.2, 3.3
 */

/**
 * Configuration interface for language-specific prompts
 */
export interface LanguageConfig {
    /** Language code (ml, en, hi) */
    code: string;
    /** Display name for the language */
    name: string;
    /** Language-specific instruction for question generation */
    instruction: string;
}

/**
 * Language configurations for multilingual question generation
 */
export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
    ml: {
        code: 'ml',
        name: 'Malayalam',
        instruction: 'Always give question and answer in Malayalam (മലയാളം). Use proper Malayalam script and terminology.',
    },
    en: {
        code: 'en',
        name: 'English',
        instruction: 'Generate all questions and answers in English. Use clear, grammatically correct language.',
    },
    hi: {
        code: 'hi',
        name: 'Hindi',
        instruction: 'Always give question and answer in Hindi (हिंदी). Use proper Hindi script and terminology.',
    },
};

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
    language: 'en',
    difficulty: 1,
    count: 5,
} as const;

/**
 * Get language configuration by code
 * @param languageCode - The language code (ml, en, hi)
 * @returns LanguageConfig or default English config
 */
export function getLanguageConfig(languageCode: string): LanguageConfig {
    return LANGUAGE_CONFIGS[languageCode];
}

/**
 * Supported languages enum for validation
 */
export enum Language {
    MALAYALAM = 'malayalam',
    ENGLISH = 'en',
    HINDI = 'hi',
}
