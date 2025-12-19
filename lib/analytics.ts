import type { Attempt, GradedAnswer } from './types';

export type WeakArea = {
    topic: string;
    questionIds: string[];
    accuracy: number;
    totalAttempts: number;
    avgTimeTaken: number;
};

export type PerformanceAnalytics = {
    accuracyOverTime: Array<{ date: string; accuracy: number }>;
    weakAreas: WeakArea[];
    strongAreas: string[];
    avgTimePerQuestion: number;
    totalQuestionsAnswered: number;
    improvementTrend: 'improving' | 'declining' | 'stable';
};

/**
 * Analyze attempts to identify weak areas
 */
export function analyzeWeakAreas(attempts: Attempt[]): WeakArea[] {
    const topicMap = new Map<string, {
        correct: number;
        total: number;
        timeTaken: number[];
        questionIds: Set<string>;
    }>();

    attempts.forEach(attempt => {
        if (!attempt.gradedAnswers) return;

        attempt.gradedAnswers.forEach((graded: GradedAnswer) => {
            // Extract topic from question content (simple heuristic)
            const topic = extractTopic(graded.questionContent);
            
            if (!topicMap.has(topic)) {
                topicMap.set(topic, {
                    correct: 0,
                    total: 0,
                    timeTaken: [],
                    questionIds: new Set(),
                });
            }

            const stats = topicMap.get(topic)!;
            stats.total++;
            if (graded.isCorrect) {
                stats.correct++;
            }
            stats.timeTaken.push(graded.timeTaken);
            stats.questionIds.add(graded.questionId);
        });
    });

    const weakAreas: WeakArea[] = Array.from(topicMap.entries())
        .map(([topic, stats]) => ({
            topic,
            questionIds: Array.from(stats.questionIds),
            accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
            totalAttempts: stats.total,
            avgTimeTaken: stats.timeTaken.length > 0
                ? stats.timeTaken.reduce((a, b) => a + b, 0) / stats.timeTaken.length
                : 0,
        }))
        .filter(area => area.accuracy < 70 || area.totalAttempts >= 3) // Weak if <70% accuracy or multiple attempts
        .sort((a, b) => a.accuracy - b.accuracy); // Sort by worst accuracy first

    return weakAreas;
}

/**
 * Extract topic from question content (simple keyword-based approach)
 */
function extractTopic(questionContent: string): string {
    // Simple heuristic: use first few words or common topic keywords
    const words = questionContent.toLowerCase().split(/\s+/);
    
    // Common topic indicators
    const topicKeywords = [
        'tcp', 'http', 'network', 'protocol',
        'algorithm', 'data structure', 'array', 'tree',
        'function', 'variable', 'class', 'object',
        'derivative', 'integral', 'equation', 'matrix',
        'cell', 'molecule', 'atom', 'reaction',
    ];

    for (const keyword of topicKeywords) {
        if (questionContent.toLowerCase().includes(keyword)) {
            return keyword.charAt(0).toUpperCase() + keyword.slice(1);
        }
    }

    // Fallback: use first 3-4 words
    return words.slice(0, 4).join(' ').substring(0, 50) || 'General';
}

/**
 * Calculate overall performance analytics
 */
export function calculateAnalytics(attempts: Attempt[]): PerformanceAnalytics {
    const sortedAttempts = [...attempts].sort((a, b) => 
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
    );

    // Accuracy over time
    const accuracyOverTime = sortedAttempts.map(attempt => {
        if (!attempt.gradedAnswers || attempt.gradedAnswers.length === 0) {
            return { date: attempt.startedAt, accuracy: 0 };
        }
        const correct = attempt.gradedAnswers.filter((g: GradedAnswer) => g.isCorrect).length;
        const accuracy = (correct / attempt.gradedAnswers.length) * 100;
        return { date: attempt.startedAt, accuracy };
    });

    // Weak areas
    const weakAreas = analyzeWeakAreas(attempts);

    // Strong areas (topics with >80% accuracy)
    const topicMap = new Map<string, { correct: number; total: number }>();
    attempts.forEach(attempt => {
        attempt.gradedAnswers?.forEach((graded: GradedAnswer) => {
            const topic = extractTopic(graded.questionContent);
            if (!topicMap.has(topic)) {
                topicMap.set(topic, { correct: 0, total: 0 });
            }
            const stats = topicMap.get(topic)!;
            stats.total++;
            if (graded.isCorrect) stats.correct++;
        });
    });

    const strongAreas = Array.from(topicMap.entries())
        .filter(([_, stats]) => stats.total >= 2 && (stats.correct / stats.total) >= 0.8)
        .map(([topic]) => topic);

    // Average time per question
    const allTimes: number[] = [];
    attempts.forEach(attempt => {
        attempt.gradedAnswers?.forEach((graded: GradedAnswer) => {
            allTimes.push(graded.timeTaken);
        });
    });
    const avgTimePerQuestion = allTimes.length > 0
        ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length
        : 0;

    // Improvement trend
    let improvementTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (accuracyOverTime.length >= 3) {
        const recent = accuracyOverTime.slice(-3).map(a => a.accuracy);
        const earlier = accuracyOverTime.slice(0, 3).map(a => a.accuracy);
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
        
        if (recentAvg > earlierAvg + 5) improvementTrend = 'improving';
        else if (recentAvg < earlierAvg - 5) improvementTrend = 'declining';
    }

    return {
        accuracyOverTime,
        weakAreas,
        strongAreas,
        avgTimePerQuestion,
        totalQuestionsAnswered: allTimes.length,
        improvementTrend,
    };
}

