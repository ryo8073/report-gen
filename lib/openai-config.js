/**
 * OpenAI API Configuration and Validation
 * Handles OpenAI API key validation and configuration setup
 */

/**
 * OpenAI Configuration class
 * Manages API key validation and configuration
 */
class OpenAIConfig {
  constructor() {
    this.isConfigured = false;
    this.validationError = null;
  }

  /**
   * Get the current API key from environment
   * @returns {string|undefined} The API key
   */
  get apiKey() {
    return process.env.OPENAI_API_KEY;
  }

  /**
   * Validate OpenAI API key presence and format
   * @returns {boolean} True if API key is valid, false otherwise
   */
  validateApiKey() {
    try {
      // Check if API key exists
      if (!this.apiKey) {
        this.validationError = 'OPENAI_API_KEY is not set in environment variables';
        return false;
      }

      // Check if API key is not empty or placeholder
      if (this.apiKey.trim() === '' || this.apiKey === 'your_openai_api_key_here') {
        this.validationError = 'OPENAI_API_KEY is empty or contains placeholder value';
        return false;
      }

      // Check basic format (OpenAI keys typically start with 'sk-')
      if (!this.apiKey.startsWith('sk-')) {
        this.validationError = 'OPENAI_API_KEY appears to have invalid format (should start with "sk-")';
        return false;
      }

      // Check minimum length (OpenAI keys are typically longer than 40 characters)
      if (this.apiKey.length < 40) {
        this.validationError = 'OPENAI_API_KEY appears to be too short';
        return false;
      }

      this.isConfigured = true;
      this.validationError = null;
      return true;
    } catch (error) {
      this.validationError = `Error validating API key: ${error.message}`;
      return false;
    }
  }

  /**
   * Get the API key for use in OpenAI client
   * @returns {string|null} The API key if valid, null otherwise
   */
  getApiKey() {
    if (this.validateApiKey()) {
      return this.apiKey;
    }
    return null;
  }

  /**
   * Get validation error message
   * @returns {string|null} Error message if validation failed, null if valid
   */
  getValidationError() {
    return this.validationError;
  }

  /**
   * Check if OpenAI is properly configured
   * @returns {boolean} True if configured and valid, false otherwise
   */
  isReady() {
    return this.validateApiKey();
  }

  /**
   * Get configuration status and setup instructions
   * @returns {object} Configuration status and instructions
   */
  getConfigurationStatus() {
    const isValid = this.validateApiKey();
    
    return {
      isConfigured: isValid,
      apiKeyPresent: !!this.apiKey,
      validationError: this.validationError,
      setupInstructions: isValid ? null : this.getSetupInstructions()
    };
  }

  /**
   * Get setup instructions for OpenAI API configuration
   * @returns {string} Setup instructions
   */
  getSetupInstructions() {
    return `
OpenAI API Setup Instructions:
1. Sign up for an OpenAI account at https://platform.openai.com/
2. Navigate to API Keys section in your account
3. Create a new API key
4. Copy the API key to your .env file:
   OPENAI_API_KEY=your_actual_api_key_here
5. Restart the application

Current issue: ${this.validationError || 'Unknown configuration error'}
    `.trim();
  }
}

// Create and export singleton instance
const openaiConfig = new OpenAIConfig();

export default openaiConfig;
export { OpenAIConfig };