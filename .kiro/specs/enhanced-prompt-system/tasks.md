# Implementation Plan

- [x] 1. Create comparison analysis prompt template





  - Create new comparison_analysis.md prompt file in PROMPTS folder
  - Define structured comparison framework for property analysis
  - Include sections for summary, profitability, risk, and recommendations
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 2. Enhance backend prompt system





  - [x] 2.1 Create PromptManager class in generate.js


    - Implement prompt loading from PROMPTS folder
    - Add getPrompt() method with fallback logic
    - Handle missing or corrupted prompt files gracefully
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3_

  - [x] 2.2 Implement buildFullPrompt() method


    - Create method to combine prompt templates with user data
    - Handle standard, custom, and comparison report types
    - Integrate file content and additional info into prompts
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.3_

  - [x] 2.3 Add comparison analysis handler


    - Create handleComparisonAnalysis() function
    - Process dual property data (Property A and Property B)
    - Build comparison-specific prompts with criteria and format
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2_

- [x] 3. Update API endpoint for enhanced prompt system





  - [x] 3.1 Modify main generate.js handler


    - Initialize PromptManager instance
    - Route comparison analysis requests to dedicated handler
    - Update standard report generation to use prompt templates
    - _Requirements: 1.1, 1.2, 1.3, 3.1_

  - [x] 3.2 Enhance custom report handling


    - Use jp_investment_4part.md as base template for custom reports
    - Integrate custom requirements into investment analysis framework
    - Maintain 4-part structure while adapting to custom needs
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Add request validation for comparison analysis


    - Validate Property A and Property B data presence
    - Check comparison criteria and result format inputs
    - Provide meaningful error messages for missing data
    - _Requirements: 3.1, 3.2, 4.1, 4.2_

- [x] 4. Enhance frontend report type selection





  - [x] 4.1 Update report type dropdown options


    - Add proper labels that match PROMPTS folder contents
    - Include "比較分析レポート" option
    - Update existing options to reflect actual prompt capabilities
    - _Requirements: 1.4, 3.1_

  - [x] 4.2 Implement dynamic UI based on report type


    - Show/hide comparison section when "比較分析" is selected
    - Display custom requirements section for "カスタム" reports
    - Update form validation based on selected report type
    - _Requirements: 3.2, 4.1, 4.2_

  - [x] 4.3 Create comparison analysis interface


    - Add separate upload areas for Property A and Property B
    - Create text areas for comparison criteria and result format
    - Implement dual file upload handling
    - _Requirements: 3.2, 4.1, 4.2, 4.3_

- [x] 5. Update frontend form handling





  - [x] 5.1 Modify form submission logic


    - Handle comparison analysis data structure
    - Process dual property uploads separately
    - Include comparison criteria and format preferences in request
    - _Requirements: 3.1, 3.2, 4.1, 4.2_

  - [x] 5.2 Enhance form validation


    - Validate comparison analysis requires both properties
    - Check that at least one property has data (text or files)
    - Provide user-friendly validation messages
    - _Requirements: 3.1, 3.2, 4.3_

  - [x] 5.3 Update request building for different report types


    - Build standard request structure for single property analysis
    - Build comparison request structure with propertyA/propertyB data
    - Handle custom requirements integration
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 6. Testing and validation





  - [x] 6.1 Test prompt system integration


    - Verify correct prompt loading from PROMPTS folder
    - Test prompt selection for each report type
    - Validate fallback behavior for missing prompts
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2_

  - [x] 6.2 Test comparison analysis functionality


    - Test dual property upload and processing
    - Verify comparison criteria integration into prompts
    - Validate comparison report structure and quality
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2_

  - [x] 6.3 Test custom report enhancement


    - Verify custom requirements integration with investment framework
    - Test fallback to standard investment analysis when no custom text
    - Validate report maintains 4-part structure with custom content
    - _Requirements: 2.1, 2.2, 2.3, 2.4_