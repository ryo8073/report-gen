# Prompt System Maintenance Guide

## Overview

This guide provides comprehensive instructions for maintaining, updating, and optimizing the prompt system. Follow these procedures to ensure system reliability, performance, and quality.

## Maintenance Schedule

### Daily Tasks (Automated)
- System health monitoring
- Cache performance tracking
- Error rate monitoring
- Service availability checks

### Weekly Tasks
- Review system health reports
- Analyze cache performance metrics
- Check for prompt optimization opportunities
- Monitor AI service performance

### Monthly Tasks
- Update prompt versions if needed
- Review and optimize system configuration
- Analyze usage patterns and trends
- Plan system improvements

### Quarterly Tasks
- Comprehensive system performance review
- Update documentation
- Review and update maintenance procedures
- Plan major system upgrades

## Prompt File Maintenance

### Adding New Prompt Files

1. **Create the Prompt File**
   ```bash
   # Create new prompt file in PROMPTS directory
   touch PROMPTS/new_report_type.md
   ```

2. **Add YAML Frontmatter**
   ```yaml
   ---
   title: "New Report Type Title"
   description: "Description of the new report type"
   aiOptimized: true
   version: "1.0"
   language: "ja"
   targetModels: ["gpt-4", "gemini-pro"]
   reportType: "new_report_type"
   expertise: "Domain expertise description"
   framework: "Analysis framework"
   ---
   ```

3. **Add Prompt Content**
   - Follow the standard prompt structure
   - Include all required sections
   - Add quality requirements
   - Specify output format

4. **Update System Configuration**
   ```javascript
   // Add to reportTypes in PromptManager
   'new_report_type': {
     label: 'New Report Type Label',
     promptFile: 'new_report_type.md',
     description: 'Brief description'
   }
   ```

5. **Test the New Prompt**
   ```bash
   node test-prompt-validation-simple.js
   node test-optimized-report-generation.js
   ```

### Updating Existing Prompt Files

1. **Version Control**
   - Increment version number in YAML frontmatter
   - Document changes in commit message
   - Keep backup of previous version

2. **Update Process**
   ```yaml
   # Update version number
   version: "1.1"  # Increment appropriately
   
   # Update lastUpdated (optional - auto-generated)
   lastUpdated: "2024-01-15T10:30:00Z"
   ```

3. **Testing Requirements**
   - Test with both OpenAI and Gemini
   - Validate output quality
   - Check for breaking changes
   - Verify metadata parsing

4. **Deployment**
   - Deploy during low-traffic periods
   - Monitor system health after deployment
   - Be prepared to rollback if issues occur

### Removing Prompt Files

1. **Deprecation Process**
   - Mark as deprecated in metadata
   - Update documentation
   - Notify users of deprecation timeline

2. **Removal Steps**
   - Remove from system configuration
   - Delete prompt file
   - Update tests and documentation
   - Monitor for any remaining references

## System Configuration Maintenance

### PromptManager Configuration

```javascript
// Regular configuration review checklist
const configChecklist = {
  cacheSettings: {
    maxCacheSize: 100,        // Adjust based on memory usage
    maxFileCacheSize: 50,     // Adjust based on file count
    evictionPolicy: 'LRU'     // Verify optimal policy
  },
  
  reportTypes: {
    // Ensure all active report types are configured
    // Remove deprecated types
    // Add new types as needed
  },
  
  serviceOptimization: {
    // Review service-specific settings
    // Update based on performance metrics
    // Adjust for new AI model versions
  }
};
```

### Performance Tuning

1. **Cache Optimization**
   ```javascript
   // Monitor cache performance
   const stats = promptManager.getCacheStats();
   
   // Optimize cache sizes based on hit rates
   if (stats.promptCache.hitRate < 70) {
     // Consider increasing cache size
     // Review cache key generation
     // Analyze cache eviction patterns
   }
   ```

2. **Service Configuration**
   ```javascript
   // Review and optimize service-specific settings
   const serviceConfig = {
     openai: {
       temperature: 0.7,      // Adjust based on output quality
       maxTokens: 3000,       // Optimize for response length
       topP: 0.9             // Fine-tune for quality
     },
     gemini: {
       temperature: 0.6,      // Service-specific optimization
       topK: 40,             // Adjust for variety vs consistency
       maxOutputTokens: 4000  // Optimize for report length
     }
   };
   ```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **System Health Metrics**
   - Prompt load success rate
   - Cache hit rates
   - Service availability
   - Error rates

2. **Performance Metrics**
   - Response times
   - Memory usage
   - CPU utilization
   - Throughput

3. **Quality Metrics**
   - Report generation success rate
   - User satisfaction scores
   - Error frequency by type

### Alerting Thresholds

```javascript
const alertThresholds = {
  promptLoadFailureRate: 5,      // Alert if >5% prompts fail to load
  cacheHitRate: 60,              // Alert if cache hit rate <60%
  serviceFailureRate: 10,        // Alert if >10% service calls fail
  responseTime: 30000,           // Alert if response time >30 seconds
  memoryUsage: 85,               // Alert if memory usage >85%
  errorRate: 5                   // Alert if error rate >5%
};
```

### Health Check Commands

```bash
# Run system health checks
node test-prompt-validation-simple.js
node test-optimized-report-generation.js
node test-error-handling-recovery.js

# Check specific components
node -e "
const pm = new PromptManager();
pm.loadPrompts().then(() => {
  console.log('Health:', pm.getSystemHealth());
  console.log('Cache:', pm.getCacheStats());
});
"
```

## Troubleshooting Procedures

### Common Issues and Solutions

1. **Prompt Loading Failures**
   ```bash
   # Check file permissions
   ls -la PROMPTS/
   
   # Validate YAML syntax
   node -e "
   const fs = require('fs');
   const content = fs.readFileSync('PROMPTS/problematic_file.md', 'utf8');
   console.log('First 200 chars:', content.substring(0, 200));
   "
   
   # Test individual prompt parsing
   node test-prompt-validation-simple.js
   ```

2. **Cache Performance Issues**
   ```javascript
   // Clear cache and rebuild
   promptManager.clearCache();
   await promptManager.loadPrompts();
   
   // Analyze cache patterns
   const stats = promptManager.getCacheStats();
   console.log('Cache analysis:', stats);
   ```

3. **Service Optimization Problems**
   ```javascript
   // Test service-specific optimization
   const openaiPrompt = promptManager.buildServiceOptimizedPrompt(
     'test_type', 'test input', [], {}, 'openai'
   );
   const geminiPrompt = promptManager.buildServiceOptimizedPrompt(
     'test_type', 'test input', [], {}, 'gemini'
   );
   
   console.log('OpenAI length:', openaiPrompt.length);
   console.log('Gemini length:', geminiPrompt.length);
   ```

### Emergency Procedures

1. **System Failure Recovery**
   ```bash
   # Restart with fallback prompts
   # This bypasses file loading and uses embedded prompts
   export PROMPT_FALLBACK_MODE=true
   node api/generate.js
   ```

2. **Cache Corruption Recovery**
   ```javascript
   // Clear all caches and rebuild
   promptManager.clearCache();
   promptManager.fileCache.clear();
   await promptManager.loadPrompts();
   ```

3. **Prompt File Corruption Recovery**
   ```bash
   # Restore from backup
   cp PROMPTS_BACKUP/*.md PROMPTS/
   
   # Or use git to restore
   git checkout HEAD -- PROMPTS/
   ```

## Quality Assurance

### Testing Procedures

1. **Pre-Deployment Testing**
   ```bash
   # Run full test suite
   npm test
   
   # Run specific prompt tests
   node test-prompt-validation-simple.js
   node test-optimized-report-generation.js
   node test-error-handling-recovery.js
   ```

2. **Post-Deployment Validation**
   ```bash
   # Verify system health
   curl -X POST /api/generate -d '{"reportType":"jp_investment_4part","inputText":"test"}'
   
   # Check all report types
   for type in jp_investment_4part jp_tax_strategy jp_inheritance_strategy comparison_analysis; do
     echo "Testing $type..."
     # Add actual API test here
   done
   ```

3. **Performance Testing**
   ```bash
   # Load testing
   # Use appropriate load testing tools
   
   # Memory leak testing
   node --inspect api/generate.js
   # Monitor memory usage over time
   ```

### Code Review Checklist

- [ ] YAML frontmatter is valid and complete
- [ ] Version number is incremented appropriately
- [ ] Prompt structure follows standard format
- [ ] Quality requirements are specified
- [ ] Output format is clearly defined
- [ ] Error handling is comprehensive
- [ ] Tests are updated and passing
- [ ] Documentation is updated
- [ ] Performance impact is assessed
- [ ] Security implications are considered

## Backup and Recovery

### Backup Procedures

1. **Automated Backups**
   ```bash
   # Daily backup of PROMPTS directory
   tar -czf "prompts_backup_$(date +%Y%m%d).tar.gz" PROMPTS/
   
   # Weekly backup of entire system configuration
   tar -czf "system_backup_$(date +%Y%m%d).tar.gz" PROMPTS/ api/ lib/ *.md
   ```

2. **Version Control**
   ```bash
   # Ensure all changes are committed
   git add PROMPTS/
   git commit -m "Update prompts: [description]"
   git push origin main
   
   # Tag important versions
   git tag -a v1.2.0 -m "Prompt system optimization v1.2.0"
   git push origin v1.2.0
   ```

### Recovery Procedures

1. **File Recovery**
   ```bash
   # Restore from backup
   tar -xzf prompts_backup_YYYYMMDD.tar.gz
   
   # Or restore from git
   git checkout [commit-hash] -- PROMPTS/
   ```

2. **System Recovery**
   ```bash
   # Full system restore
   tar -xzf system_backup_YYYYMMDD.tar.gz
   
   # Restart services
   npm restart
   
   # Verify system health
   node test-prompt-validation-simple.js
   ```

## Documentation Maintenance

### Documentation Updates

1. **When to Update Documentation**
   - New prompt files added
   - System configuration changes
   - New features implemented
   - Bug fixes that affect usage
   - Performance optimizations

2. **Documentation Files to Maintain**
   - `PROMPT_SYSTEM_DOCUMENTATION.md` - System overview and usage
   - `PROMPT_MAINTENANCE_GUIDE.md` - This maintenance guide
   - `README.md` - Project overview
   - Inline code comments
   - API documentation

3. **Documentation Review Process**
   - Review accuracy after system changes
   - Update examples and code snippets
   - Verify links and references
   - Check for outdated information

## Performance Optimization

### Regular Optimization Tasks

1. **Cache Optimization**
   - Monitor hit rates and adjust cache sizes
   - Optimize cache key generation
   - Review eviction policies

2. **Prompt Optimization**
   - Analyze token usage and optimize prompt length
   - Review and improve prompt structure
   - Test with latest AI model versions

3. **Service Optimization**
   - Monitor service performance metrics
   - Adjust service-specific parameters
   - Optimize failover logic

### Performance Monitoring Tools

```javascript
// Custom performance monitoring
class PerformanceMonitor {
  static logMetrics() {
    const health = promptManager.getSystemHealth();
    const cache = promptManager.getCacheStats();
    
    console.log('Performance Metrics:', {
      healthScore: health.healthScore,
      cacheHitRate: cache.promptCache.hitRate,
      totalPrompts: health.totalPrompts,
      optimizedPrompts: health.optimizedPrompts,
      timestamp: new Date().toISOString()
    });
  }
}

// Run periodic monitoring
setInterval(PerformanceMonitor.logMetrics, 300000); // Every 5 minutes
```

## Security Considerations

### Security Maintenance

1. **Regular Security Reviews**
   - Review prompt content for sensitive information
   - Check for potential injection vulnerabilities
   - Validate input sanitization
   - Review access controls

2. **Security Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Apply security patches promptly
   - Review and update security policies

3. **Audit Procedures**
   - Log all system changes
   - Monitor access patterns
   - Review error logs for security issues
   - Conduct periodic security assessments

---

*This maintenance guide should be reviewed and updated quarterly to ensure it remains current with system changes and best practices.*