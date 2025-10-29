# Requirements Document

## Introduction

The current report generation system needs to be enhanced to properly utilize the detailed prompts from the PROMPTS folder and add a new comparison analysis feature. Users should be able to select report types that correspond to specific, detailed prompts, and have the ability to compare multiple properties side-by-side.

## Glossary

- **Prompt_System**: The component that manages and applies detailed prompts from the PROMPTS folder
- **Report_Type_Selector**: The dropdown interface for selecting report types
- **Comparison_Analysis**: A new report type that allows side-by-side property comparison
- **Property_Upload_Interface**: Separate upload areas for different properties being compared
- **Custom_Report_Handler**: Component that handles custom report requests with jp_investment_4part as default
- **Comparison_Criteria_Input**: Interface for specifying what aspects to compare and how to display results

## Requirements

### Requirement 1

**User Story:** As a user, I want the system to use the detailed prompts from the PROMPTS folder when generating reports, so that I receive comprehensive, structured analysis that matches the specific report type I selected.

#### Acceptance Criteria

1. WHEN a user selects "投資分析（4部構成）", THE Prompt_System SHALL use the jp_investment_4part.md prompt template
2. WHEN a user selects "税務戦略レポート", THE Prompt_System SHALL use the jp_tax_strategy.md prompt template  
3. WHEN a user selects "相続対策レポート", THE Prompt_System SHALL use the jp_inheritance_strategy.md prompt template
4. THE Report_Type_Selector SHALL display options that correspond exactly to available prompt templates

### Requirement 2

**User Story:** As a user, I want to select "カスタム" and have the system default to the investment analysis format while incorporating my custom requirements, so that I can get tailored analysis based on the proven investment framework.

#### Acceptance Criteria

1. WHEN a user selects "カスタム" report type, THE Custom_Report_Handler SHALL use jp_investment_4part.md as the base template
2. WHEN custom text is provided, THE Prompt_System SHALL incorporate the custom requirements into the investment analysis framework
3. THE Custom_Report_Handler SHALL maintain the 4-part structure while adapting content to custom needs
4. WHEN no custom text is provided, THE system SHALL generate a standard investment analysis report

### Requirement 3

**User Story:** As a user, I want to perform comparison analysis between multiple properties, so that I can make informed investment decisions based on side-by-side evaluation.

#### Acceptance Criteria

1. THE Report_Type_Selector SHALL include a "比較分析" option
2. WHEN "比較分析" is selected, THE Property_Upload_Interface SHALL provide separate upload areas for Property A and Property B
3. THE Comparison_Criteria_Input SHALL allow users to specify comparison aspects and display preferences
4. THE Prompt_System SHALL generate structured comparison reports highlighting differences and recommendations

### Requirement 4

**User Story:** As a user, I want to specify what aspects to compare and how results should be presented, so that the comparison analysis focuses on my decision-making criteria.

#### Acceptance Criteria

1. THE Comparison_Criteria_Input SHALL provide text areas for specifying comparison criteria
2. THE Comparison_Criteria_Input SHALL allow users to specify desired result presentation format
3. WHEN comparison criteria are provided, THE Prompt_System SHALL incorporate them into the comparison analysis
4. THE system SHALL provide default comparison criteria if none are specified

### Requirement 5

**User Story:** As a developer, I want the prompt system to be maintainable and extensible, so that new report types can be easily added by creating new prompt files.

#### Acceptance Criteria

1. THE Prompt_System SHALL automatically detect available prompt files in the PROMPTS folder
2. WHEN new prompt files are added, THE Report_Type_Selector SHALL automatically include them as options
3. THE Prompt_System SHALL handle missing or corrupted prompt files gracefully
4. THE system SHALL log prompt loading and application for debugging purposes