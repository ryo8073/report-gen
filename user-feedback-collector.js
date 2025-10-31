/**
 * User Feedback Collector
 * Collects and analyzes real user feedback for the critical production fixes
 */

class UserFeedbackCollector {
    constructor() {
        this.feedbackData = {
            sessions: [],
            aggregatedResults: {
                usability: { ratings: [], comments: [] },
                reportQuality: { ratings: [], comments: [] },
                editorLayout: { ratings: [], comments: [], preferences: {} }
            },
            demographics: {
                userTypes: {},
                experienceLevels: {},
                deviceTypes: {}
            }
        };
        
        this.currentSession = null;
        this.sessionStartTime = null;
    }

    startUserSession(userProfile = {}) {
        this.currentSession = {
            sessionId: this.generateSessionId(),
            userProfile: {
                userType: userProfile.userType || 'unknown',
                experienceLevel: userProfile.experienceLevel || 'intermediate',
                deviceType: userProfile.deviceType || 'desktop',
                browserType: userProfile.browserType || 'unknown'
            },
            startTime: new Date().toISOString(),
            interactions: [],
            feedback: {
                usability: {},
                reportQuality: {},
                editorLayout: {}
            },
            completed: false
        };
        
        this.sessionStartTime = Date.now();
        
        console.log(`👤 Started user session: ${this.currentSession.sessionId}`);
        return this.currentSession.sessionId;
    }

    recordInteraction(interactionType, data) {
        if (!this.currentSession) {
            console.warn('No active session. Starting new session.');
            this.startUserSession();
        }

        const interaction = {
            timestamp: new Date().toISOString(),
            type: interactionType,
            data: data,
            timeFromStart: Date.now() - this.sessionStartTime
        };

        this.currentSession.interactions.push(interaction);
        
        // Process specific interaction types
        switch (interactionType) {
            case 'usability_rating':
                this.processUsabilityFeedback(data);
                break;
            case 'report_quality_rating':
                this.processReportQualityFeedback(data);
                break;
            case 'layout_preference':
                this.processLayoutPreference(data);
                break;
            case 'error_encountered':
                this.processErrorFeedback(data);
                break;
            case 'task_completion':
                this.processTaskCompletion(data);
                break;
        }
    }

    processUsabilityFeedback(data) {
        const { category, rating, comment, specificIssues } = data;
        
        this.currentSession.feedback.usability[category] = {
            rating: rating,
            comment: comment || '',
            issues: specificIssues || [],
            timestamp: new Date().toISOString()
        };

        // Track common usability issues
        if (specificIssues && specificIssues.length > 0) {
            specificIssues.forEach(issue => {
                this.trackUsabilityIssue(issue, category);
            });
        }
    }

    processReportQualityFeedback(data) {
        const { reportType, contentRating, accuracyRating, completenessRating, comment, missingElements } = data;
        
        this.currentSession.feedback.reportQuality[reportType] = {
            contentRating: contentRating,
            accuracyRating: accuracyRating,
            completenessRating: completenessRating,
            comment: comment || '',
            missingElements: missingElements || [],
            timestamp: new Date().toISOString()
        };

        // Track missing elements for improvement
        if (missingElements && missingElements.length > 0) {
            missingElements.forEach(element => {
                this.trackMissingReportElement(element, reportType);
            });
        }
    }

    processLayoutPreference(data) {
        const { preferredLayout, layoutRatings, usabilityComments, responsiveExperience } = data;
        
        this.currentSession.feedback.editorLayout = {
            preferredLayout: preferredLayout,
            layoutRatings: layoutRatings || {},
            usabilityComments: usabilityComments || '',
            responsiveExperience: responsiveExperience || {},
            timestamp: new Date().toISOString()
        };

        // Track layout preferences by user type
        this.trackLayoutPreference(preferredLayout, this.currentSession.userProfile.userType);
    }

    processErrorFeedback(data) {
        const { errorType, errorMessage, userAction, severity, resolved } = data;
        
        const errorRecord = {
            type: errorType,
            message: errorMessage,
            userAction: userAction,
            severity: severity || 'medium',
            resolved: resolved || false,
            timestamp: new Date().toISOString(),
            sessionContext: {
                userType: this.currentSession.userProfile.userType,
                deviceType: this.currentSession.userProfile.deviceType,
                timeFromStart: Date.now() - this.sessionStartTime
            }
        };

        this.currentSession.interactions.push({
            timestamp: new Date().toISOString(),
            type: 'error_encountered',
            data: errorRecord
        });
    }

    processTaskCompletion(data) {
        const { taskName, completed, timeToComplete, difficultyRating, satisfactionRating, comments } = data;
        
        const taskRecord = {
            taskName: taskName,
            completed: completed,
            timeToComplete: timeToComplete,
            difficultyRating: difficultyRating,
            satisfactionRating: satisfactionRating,
            comments: comments || '',
            timestamp: new Date().toISOString()
        };

        this.currentSession.interactions.push({
            timestamp: new Date().toISOString(),
            type: 'task_completion',
            data: taskRecord
        });
    }

    trackUsabilityIssue(issue, category) {
        if (!this.feedbackData.aggregatedResults.usability.issues) {
            this.feedbackData.aggregatedResults.usability.issues = {};
        }
        
        if (!this.feedbackData.aggregatedResults.usability.issues[category]) {
            this.feedbackData.aggregatedResults.usability.issues[category] = {};
        }
        
        if (!this.feedbackData.aggregatedResults.usability.issues[category][issue]) {
            this.feedbackData.aggregatedResults.usability.issues[category][issue] = 0;
        }
        
        this.feedbackData.aggregatedResults.usability.issues[category][issue]++;
    }

    trackMissingReportElement(element, reportType) {
        if (!this.feedbackData.aggregatedResults.reportQuality.missingElements) {
            this.feedbackData.aggregatedResults.reportQuality.missingElements = {};
        }
        
        if (!this.feedbackData.aggregatedResults.reportQuality.missingElements[reportType]) {
            this.feedbackData.aggregatedResults.reportQuality.missingElements[reportType] = {};
        }
        
        if (!this.feedbackData.aggregatedResults.reportQuality.missingElements[reportType][element]) {
            this.feedbackData.aggregatedResults.reportQuality.missingElements[reportType][element] = 0;
        }
        
        this.feedbackData.aggregatedResults.reportQuality.missingElements[reportType][element]++;
    }

    trackLayoutPreference(layout, userType) {
        if (!this.feedbackData.aggregatedResults.editorLayout.preferences[userType]) {
            this.feedbackData.aggregatedResults.editorLayout.preferences[userType] = {};
        }
        
        if (!this.feedbackData.aggregatedResults.editorLayout.preferences[userType][layout]) {
            this.feedbackData.aggregatedResults.editorLayout.preferences[userType][layout] = 0;
        }
        
        this.feedbackData.aggregatedResults.editorLayout.preferences[userType][layout]++;
    }

    completeUserSession(finalFeedback = {}) {
        if (!this.currentSession) {
            console.warn('No active session to complete.');
            return null;
        }

        this.currentSession.endTime = new Date().toISOString();
        this.currentSession.duration = Date.now() - this.sessionStartTime;
        this.currentSession.finalFeedback = finalFeedback;
        this.currentSession.completed = true;

        // Add to sessions array
        this.feedbackData.sessions.push(this.currentSession);

        // Update aggregated results
        this.updateAggregatedResults(this.currentSession);

        // Update demographics
        this.updateDemographics(this.currentSession.userProfile);

        const completedSessionId = this.currentSession.sessionId;
        this.currentSession = null;
        this.sessionStartTime = null;

        console.log(`✅ Completed user session: ${completedSessionId}`);
        return completedSessionId;
    }

    updateAggregatedResults(session) {
        // Aggregate usability ratings
        Object.entries(session.feedback.usability).forEach(([category, feedback]) => {
            if (feedback.rating) {
                this.feedbackData.aggregatedResults.usability.ratings.push({
                    category: category,
                    rating: feedback.rating,
                    userType: session.userProfile.userType,
                    deviceType: session.userProfile.deviceType
                });
            }
            if (feedback.comment) {
                this.feedbackData.aggregatedResults.usability.comments.push({
                    category: category,
                    comment: feedback.comment,
                    userType: session.userProfile.userType
                });
            }
        });

        // Aggregate report quality ratings
        Object.entries(session.feedback.reportQuality).forEach(([reportType, feedback]) => {
            ['contentRating', 'accuracyRating', 'completenessRating'].forEach(ratingType => {
                if (feedback[ratingType]) {
                    this.feedbackData.aggregatedResults.reportQuality.ratings.push({
                        reportType: reportType,
                        ratingType: ratingType,
                        rating: feedback[ratingType],
                        userType: session.userProfile.userType
                    });
                }
            });
            if (feedback.comment) {
                this.feedbackData.aggregatedResults.reportQuality.comments.push({
                    reportType: reportType,
                    comment: feedback.comment,
                    userType: session.userProfile.userType
                });
            }
        });

        // Aggregate layout preferences
        if (session.feedback.editorLayout.preferredLayout) {
            const userType = session.userProfile.userType;
            const layout = session.feedback.editorLayout.preferredLayout;
            
            if (!this.feedbackData.aggregatedResults.editorLayout.preferences[userType]) {
                this.feedbackData.aggregatedResults.editorLayout.preferences[userType] = {};
            }
            if (!this.feedbackData.aggregatedResults.editorLayout.preferences[userType][layout]) {
                this.feedbackData.aggregatedResults.editorLayout.preferences[userType][layout] = 0;
            }
            this.feedbackData.aggregatedResults.editorLayout.preferences[userType][layout]++;
        }
    }

    updateDemographics(userProfile) {
        // Update user type counts
        if (!this.feedbackData.demographics.userTypes[userProfile.userType]) {
            this.feedbackData.demographics.userTypes[userProfile.userType] = 0;
        }
        this.feedbackData.demographics.userTypes[userProfile.userType]++;

        // Update experience level counts
        if (!this.feedbackData.demographics.experienceLevels[userProfile.experienceLevel]) {
            this.feedbackData.demographics.experienceLevels[userProfile.experienceLevel] = 0;
        }
        this.feedbackData.demographics.experienceLevels[userProfile.experienceLevel]++;

        // Update device type counts
        if (!this.feedbackData.demographics.deviceTypes[userProfile.deviceType]) {
            this.feedbackData.demographics.deviceTypes[userProfile.deviceType] = 0;
        }
        this.feedbackData.demographics.deviceTypes[userProfile.deviceType]++;
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getAggregatedAnalysis() {
        const totalSessions = this.feedbackData.sessions.length;
        
        if (totalSessions === 0) {
            return {
                error: 'No user sessions completed yet',
                totalSessions: 0
            };
        }

        const analysis = {
            totalSessions: totalSessions,
            completedSessions: this.feedbackData.sessions.filter(s => s.completed).length,
            averageSessionDuration: this.calculateAverageSessionDuration(),
            usabilityAnalysis: this.analyzeUsabilityFeedback(),
            reportQualityAnalysis: this.analyzeReportQualityFeedback(),
            layoutPreferenceAnalysis: this.analyzeLayoutPreferences(),
            demographicBreakdown: this.feedbackData.demographics,
            commonIssues: this.identifyCommonIssues(),
            recommendations: this.generateRecommendations()
        };

        return analysis;
    }

    calculateAverageSessionDuration() {
        const completedSessions = this.feedbackData.sessions.filter(s => s.completed && s.duration);
        if (completedSessions.length === 0) return 0;
        
        const totalDuration = completedSessions.reduce((sum, session) => sum + session.duration, 0);
        return Math.round(totalDuration / completedSessions.length / 1000); // Convert to seconds
    }

    analyzeUsabilityFeedback() {
        const ratings = this.feedbackData.aggregatedResults.usability.ratings;
        if (ratings.length === 0) return { averageRating: 0, categoryBreakdown: {} };

        const categoryBreakdown = {};
        ratings.forEach(rating => {
            if (!categoryBreakdown[rating.category]) {
                categoryBreakdown[rating.category] = { ratings: [], average: 0 };
            }
            categoryBreakdown[rating.category].ratings.push(rating.rating);
        });

        // Calculate averages for each category
        Object.keys(categoryBreakdown).forEach(category => {
            const categoryRatings = categoryBreakdown[category].ratings;
            categoryBreakdown[category].average = 
                categoryRatings.reduce((sum, rating) => sum + rating, 0) / categoryRatings.length;
        });

        const overallAverage = ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length;

        return {
            averageRating: overallAverage,
            categoryBreakdown: categoryBreakdown,
            totalRatings: ratings.length
        };
    }

    analyzeReportQualityFeedback() {
        const ratings = this.feedbackData.aggregatedResults.reportQuality.ratings;
        if (ratings.length === 0) return { averageRating: 0, ratingTypeBreakdown: {} };

        const ratingTypeBreakdown = {};
        ratings.forEach(rating => {
            if (!ratingTypeBreakdown[rating.ratingType]) {
                ratingTypeBreakdown[rating.ratingType] = { ratings: [], average: 0 };
            }
            ratingTypeBreakdown[rating.ratingType].ratings.push(rating.rating);
        });

        // Calculate averages for each rating type
        Object.keys(ratingTypeBreakdown).forEach(ratingType => {
            const typeRatings = ratingTypeBreakdown[ratingType].ratings;
            ratingTypeBreakdown[ratingType].average = 
                typeRatings.reduce((sum, rating) => sum + rating, 0) / typeRatings.length;
        });

        const overallAverage = ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length;

        return {
            averageRating: overallAverage,
            ratingTypeBreakdown: ratingTypeBreakdown,
            totalRatings: ratings.length,
            missingElements: this.feedbackData.aggregatedResults.reportQuality.missingElements || {}
        };
    }

    analyzeLayoutPreferences() {
        const preferences = this.feedbackData.aggregatedResults.editorLayout.preferences;
        const analysis = {
            overallPreferences: {},
            userTypePreferences: preferences,
            mostPreferred: null,
            leastPreferred: null
        };

        // Calculate overall preferences
        Object.values(preferences).forEach(userTypePrefs => {
            Object.entries(userTypePrefs).forEach(([layout, count]) => {
                if (!analysis.overallPreferences[layout]) {
                    analysis.overallPreferences[layout] = 0;
                }
                analysis.overallPreferences[layout] += count;
            });
        });

        // Find most and least preferred layouts
        const layoutCounts = Object.entries(analysis.overallPreferences);
        if (layoutCounts.length > 0) {
            layoutCounts.sort((a, b) => b[1] - a[1]);
            analysis.mostPreferred = layoutCounts[0][0];
            analysis.leastPreferred = layoutCounts[layoutCounts.length - 1][0];
        }

        return analysis;
    }

    identifyCommonIssues() {
        const issues = {
            usability: this.feedbackData.aggregatedResults.usability.issues || {},
            reportQuality: this.feedbackData.aggregatedResults.reportQuality.missingElements || {},
            errors: this.extractErrorPatterns()
        };

        return issues;
    }

    extractErrorPatterns() {
        const errorPatterns = {};
        
        this.feedbackData.sessions.forEach(session => {
            session.interactions.forEach(interaction => {
                if (interaction.type === 'error_encountered') {
                    const errorType = interaction.data.type;
                    if (!errorPatterns[errorType]) {
                        errorPatterns[errorType] = {
                            count: 0,
                            severity: interaction.data.severity,
                            examples: []
                        };
                    }
                    errorPatterns[errorType].count++;
                    if (errorPatterns[errorType].examples.length < 3) {
                        errorPatterns[errorType].examples.push(interaction.data.message);
                    }
                }
            });
        });

        return errorPatterns;
    }

    generateRecommendations() {
        const recommendations = [];
        
        // Get analysis data directly without calling getAggregatedAnalysis to avoid circular reference
        const usabilityAnalysis = this.analyzeUsabilityFeedback();
        const reportQualityAnalysis = this.analyzeReportQualityFeedback();
        const layoutPreferenceAnalysis = this.analyzeLayoutPreferences();

        // Usability recommendations
        if (usabilityAnalysis && usabilityAnalysis.averageRating < 3.5) {
            recommendations.push({
                category: 'Usability',
                priority: 'High',
                recommendation: 'Address usability issues - average rating below acceptable threshold',
                details: usabilityAnalysis.categoryBreakdown
            });
        }

        // Report quality recommendations
        if (reportQualityAnalysis && reportQualityAnalysis.averageRating < 4.0) {
            recommendations.push({
                category: 'Report Quality',
                priority: 'Critical',
                recommendation: 'Improve report content quality - user expectations not being met',
                details: reportQualityAnalysis.ratingTypeBreakdown
            });
        }

        // Layout preference recommendations
        if (layoutPreferenceAnalysis && layoutPreferenceAnalysis.mostPreferred) {
            recommendations.push({
                category: 'Editor Layout',
                priority: 'Medium',
                recommendation: `Consider making '${layoutPreferenceAnalysis.mostPreferred}' layout the default based on user preferences`,
                details: layoutPreferenceAnalysis.overallPreferences
            });
        }

        // Error pattern recommendations
        const errorPatterns = this.extractErrorPatterns();
        const criticalErrors = Object.entries(errorPatterns).filter(([type, data]) => 
            data.severity === 'high' || data.count > 2
        );
        
        if (criticalErrors.length > 0) {
            recommendations.push({
                category: 'Error Handling',
                priority: 'Critical',
                recommendation: 'Address recurring error patterns affecting user experience',
                details: Object.fromEntries(criticalErrors)
            });
        }

        return recommendations;
    }

    exportFeedbackData(format = 'json') {
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                totalSessions: this.feedbackData.sessions.length,
                format: format
            },
            analysis: this.getAggregatedAnalysis(),
            rawData: this.feedbackData
        };

        if (format === 'json') {
            return JSON.stringify(exportData, null, 2);
        } else if (format === 'csv') {
            return this.convertToCSV(exportData);
        }

        return exportData;
    }

    convertToCSV(data) {
        // Convert key metrics to CSV format
        let csv = 'Session ID,User Type,Experience Level,Device Type,Duration,Completed\n';
        
        data.rawData.sessions.forEach(session => {
            csv += `${session.sessionId},${session.userProfile.userType},${session.userProfile.experienceLevel},${session.userProfile.deviceType},${session.duration || 0},${session.completed}\n`;
        });

        return csv;
    }

    // Method to simulate user feedback for testing
    simulateUserFeedback(numUsers = 10) {
        const userTypes = ['analyst', 'manager', 'developer', 'end-user'];
        const experienceLevels = ['beginner', 'intermediate', 'advanced'];
        const deviceTypes = ['desktop', 'tablet', 'mobile'];
        const layouts = ['split', 'tabbed', 'overlay'];

        for (let i = 0; i < numUsers; i++) {
            const userProfile = {
                userType: userTypes[Math.floor(Math.random() * userTypes.length)],
                experienceLevel: experienceLevels[Math.floor(Math.random() * experienceLevels.length)],
                deviceType: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
                browserType: 'chrome'
            };

            this.startUserSession(userProfile);

            // Simulate usability feedback
            this.recordInteraction('usability_rating', {
                category: 'javascript_loading',
                rating: Math.floor(Math.random() * 3) + 3, // 3-5 rating
                comment: 'Application loads smoothly',
                specificIssues: []
            });

            // Simulate report quality feedback
            this.recordInteraction('report_quality_rating', {
                reportType: 'investment_analysis',
                contentRating: Math.floor(Math.random() * 2) + 4, // 4-5 rating
                accuracyRating: Math.floor(Math.random() * 2) + 4,
                completenessRating: Math.floor(Math.random() * 2) + 4,
                comment: 'Report includes proper CCR and leverage analysis',
                missingElements: []
            });

            // Simulate layout preference
            const preferredLayout = layouts[Math.floor(Math.random() * layouts.length)];
            this.recordInteraction('layout_preference', {
                preferredLayout: preferredLayout,
                layoutRatings: {
                    split: Math.floor(Math.random() * 3) + 3,
                    tabbed: Math.floor(Math.random() * 3) + 3,
                    overlay: Math.floor(Math.random() * 3) + 3
                },
                usabilityComments: `Prefer ${preferredLayout} layout for my workflow`,
                responsiveExperience: {
                    mobile: Math.floor(Math.random() * 2) + 3,
                    tablet: Math.floor(Math.random() * 2) + 4,
                    desktop: 5
                }
            });

            this.completeUserSession({
                overallSatisfaction: Math.floor(Math.random() * 2) + 4,
                wouldRecommend: true,
                additionalComments: 'System improvements are noticeable'
            });
        }

        console.log(`✅ Simulated feedback from ${numUsers} users`);
    }
}

// Export for use in other modules
export { UserFeedbackCollector };

// Example usage if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const collector = new UserFeedbackCollector();
    
    // Simulate some user feedback
    collector.simulateUserFeedback(15);
    
    // Generate analysis
    const analysis = collector.getAggregatedAnalysis();
    console.log('\n📊 USER FEEDBACK ANALYSIS');
    console.log('========================');
    console.log(`Total Sessions: ${analysis.totalSessions}`);
    console.log(`Average Session Duration: ${analysis.averageSessionDuration}s`);
    console.log(`Usability Average Rating: ${analysis.usabilityAnalysis.averageRating?.toFixed(1) || 'N/A'}/5`);
    console.log(`Report Quality Average Rating: ${analysis.reportQualityAnalysis.averageRating?.toFixed(1) || 'N/A'}/5`);
    console.log(`Most Preferred Layout: ${analysis.layoutPreferenceAnalysis.mostPreferred || 'N/A'}`);
    
    if (analysis.recommendations.length > 0) {
        console.log('\n📝 Recommendations:');
        analysis.recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. [${rec.priority}] ${rec.category}: ${rec.recommendation}`);
        });
    }
    
    // Export data
    const fs = await import('fs');
    fs.promises.writeFile('user-feedback-analysis.json', collector.exportFeedbackData('json'))
        .then(() => console.log('\n💾 Feedback data exported to user-feedback-analysis.json'))
        .catch(console.error);
}