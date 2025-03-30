export interface ParameterAnalysis {
  parameter: string
  originalValue: string | number | boolean
  newValue: string | number | boolean
  purpose: string
  effect: string
}

export interface ExtractedFile {
  name: string
  size: number
  type: string
  content?: string // Only for text files
}

export interface ConfigFile {
  name: string
  path: string
  content: any // Parsed JSON content
}

export interface AnalysisResults {
  // Updated field names to match SlicingProfileAnalysis
  overallPurpose: string // matches overall_purpose
  modelType: string // matches model_type
  visualEffects: string[] // matches visual_effects
  functionalEffects: string[] // matches functional_effects
  tradeOffs: string[] // matches trade_offs
  optimizationSuggestions: string[] // matches optimization_suggestions
  parameterAnalysis: ParameterAnalysis[] // matches parameter_effects but with our existing structure

  // Additional fields specific to our application
  extractedFiles: ExtractedFile[]
  configFiles: ConfigFile[]
}

