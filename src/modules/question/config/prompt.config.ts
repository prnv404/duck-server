/**
 * Prompt Configuration for AI Question Generation
 *
 * This file contains configurable prompt templates for different exam types
 * and languages, replacing hardcoded strings in the Gemini integration.
 *
 * Requirements: 3.1, 3.2, 3.3
 */

/**
 * Configuration interface for exam type-specific prompts
 */
export interface ExamTypeConfig {
    /** Unique identifier for the exam type */
    id: string;
    /** Display name for the exam type */
    name: string;
    /** Description of the exam type */
    description: string;
    /** Exam-specific prompt instructions */
    promptInstructions: string;
    /** Focus areas for this exam type */
    focusAreas: string[];
    /** Question style guidance */
    questionStyle: string;
}

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
 * Exam type configurations for different competitive exams
 */
export const EXAM_CONFIGS: Record<string, ExamTypeConfig> = {
    PSC: {
        id: 'PSC',
        name: 'Kerala PSC',
        description: 'Kerala Public Service Commission examinations',
        promptInstructions: `Generate questions for the topic that genuinely help a Kerala PSC aspirant crack the exam.
Focus on the most important, most repeatedly-tested, and most confusing areas of that topic.
Make the questions feel practical, exam-smart, and close to what PSC setters ask — not theoretical or academic.
Include tricky wording, common traps, and subtle distinctions PSC loves testing.
Keep explanations short, friendly, and confidence-building, helping the learner understand the logic quickly.
Overall vibe should make the learner feel: 'I really needed this question — this is exactly what PSC asks.'`,
        focusAreas: [
            'Kerala history and culture',
            'Indian Constitution',
            'General Knowledge',
            'Current Affairs',
            'Renaissance movements in Kerala',
        ],
        questionStyle: 'Focus on factual recall with occasional application-based questions',
    },

    UPSC: {
        id: 'UPSC',
        name: 'UPSC Civil Services',
        description: 'Union Public Service Commission Civil Services Examination',
        promptInstructions: `Generate questions that help UPSC aspirants prepare for the Civil Services Examination.
Focus on conceptual understanding, analytical thinking, and application of knowledge.
Include questions that test multiple dimensions of a topic - factual, conceptual, and analytical.
Questions should reflect the UPSC pattern of testing interconnected topics and current affairs linkages.
Explanations should provide comprehensive understanding with relevant examples.`,
        focusAreas: [
            'Indian Polity and Governance',
            'Indian Economy',
            'History and Culture',
            'Geography',
            'Environment and Ecology',
            'Science and Technology',
            'International Relations',
        ],
        questionStyle: 'Conceptual and analytical with multi-dimensional testing',
    },

    SSC: {
        id: 'SSC',
        name: 'SSC Examinations',
        description: 'Staff Selection Commission examinations',
        promptInstructions: `Generate questions suitable for SSC examinations (CGL, CHSL, MTS, etc.).
Focus on quick-solving techniques and commonly tested patterns.
Include questions that test speed and accuracy in problem-solving.
Questions should be direct and fact-based, matching SSC's typical difficulty level.
Explanations should include shortcuts and tricks where applicable.`,
        focusAreas: ['Quantitative Aptitude', 'General Intelligence and Reasoning', 'English Language', 'General Awareness'],
        questionStyle: 'Direct, fact-based questions with focus on speed and accuracy',
    },

    BANKING: {
        id: 'BANKING',
        name: 'Banking Examinations',
        description: 'IBPS, SBI, RBI and other banking examinations',
        promptInstructions: `Generate questions for banking examinations (IBPS PO/Clerk, SBI PO/Clerk, RBI Grade B).
Focus on banking awareness, financial concepts, and current banking sector developments.
Include questions on RBI policies, banking regulations, and financial instruments.
Questions should test both theoretical knowledge and practical application in banking context.
Explanations should connect concepts to real-world banking scenarios.`,
        focusAreas: [
            'Banking Awareness',
            'Financial Awareness',
            'Current Affairs in Banking',
            'RBI Policies',
            'Economic Concepts',
        ],
        questionStyle: 'Application-oriented with focus on banking sector knowledge',
    },

    GENERAL: {
        id: 'GENERAL',
        name: 'General Knowledge',
        description: 'General knowledge and aptitude questions',
        promptInstructions: `Generate well-rounded general knowledge questions suitable for various competitive exams.
Focus on commonly tested topics across different examination boards.
Include a mix of factual, conceptual, and application-based questions.
Questions should be clear, unambiguous, and educationally valuable.
Explanations should be informative and help build broader understanding.`,
        focusAreas: ['General Science', 'History', 'Geography', 'Polity', 'Economics', 'Current Affairs'],
        questionStyle: 'Balanced mix of factual and conceptual questions',
    },
};

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
    examType: 'GENERAL',
    language: 'en',
    difficulty: 1,
    count: 5,
} as const;

/**
 * Get exam configuration by type
 * @param examType - The exam type identifier
 * @returns ExamTypeConfig or default GENERAL config
 */
export function getExamConfig(examType: string): ExamTypeConfig {
    return EXAM_CONFIGS[examType] || EXAM_CONFIGS.GENERAL;
}

/**
 * Get language configuration by code
 * @param languageCode - The language code (ml, en, hi)
 * @returns LanguageConfig or default English config
 */
export function getLanguageConfig(languageCode: string): LanguageConfig {
    return LANGUAGE_CONFIGS[languageCode] || LANGUAGE_CONFIGS.en;
}

/**
 * Supported exam types enum for validation
 */
export enum ExamType {
    PSC = 'PSC',
    UPSC = 'UPSC',
    SSC = 'SSC',
    BANKING = 'BANKING',
    GENERAL = 'GENERAL',
}

/**
 * Supported languages enum for validation
 */
export enum Language {
    MALAYALAM = 'ml',
    ENGLISH = 'en',
    HINDI = 'hi',
}
