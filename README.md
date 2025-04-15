# 3D Printing AI Tools

A collection of Next.js web applications that use AI to provide insights and assistance for 3D printing.

## Available Tools

### 1. How Is It Sliced?

Analyzes 3D printing files (3MF format) to provide insights about slicer settings and their effects on print quality.

- Upload and analyze 3MF files from PrusaSlicer and compatible slicers (up to 4.5MB)
- Extract and view all files contained within the 3MF archive
- AI-powered analysis of slicer settings using OpenAI's GPT-4o
- Compare modified settings against standard profiles
- Get insights on:
  - Overall purpose of the print settings
  - Visual and functional effects of the modifications
  - Trade-offs introduced by the settings
  - Optimization suggestions
  - Detailed parameter-by-parameter analysis

### 2. Print Troubleshooting

Diagnoses potential issues with 3D prints based on G-code files and problem descriptions.

- Upload G-code files (up to 20MB) from slicers like OrcaSlicer
- Provide a description of the print issue you're experiencing
- AI analyzes the slicing parameters extracted from the G-code
- Get personalized troubleshooting guidance including:
  - Possible causes of the print issue
  - Likelihood of each cause based on your slicing parameters
  - Specific suggestions for resolving the issues
  - Explanations based on your particular settings

## Technology Stack

- Next.js 14+ with App Router
- React 19
- TypeScript
- Tailwind CSS with Shadcn UI components
- OpenAI API (GPT-4o)
- JSZip for 3MF file extraction
- Langfuse for API call tracking

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- PNPM package manager
- OpenAI API key
- Langfuse account (optional, for API call tracking)

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/3dp-ai-tools.git
   cd 3dp-ai-tools
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env.local` file in the project root with your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   VERCEL_URL=localhost:3000

   # Optional: Langfuse configuration for API call tracking
   LANGFUSE_PUBLIC_KEY=your_public_key_here
   LANGFUSE_SECRET_KEY=your_secret_key_here
   LANGFUSE_BASE_URL=https://cloud.langfuse.com
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Deployment to Vercel

1. Push your code to a GitHub repository.

2. Connect your GitHub repository to Vercel:
   - Sign in to [Vercel](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure the project:
     - Framework preset: Next.js
     - Root directory: `./` (default)
     - Build command: `pnpm build` (default)
     - Install command: `pnpm install` (default)

3. Add environment variables:
   - In your project settings on Vercel, go to "Environment Variables"
   - Add `OPENAI_API_KEY` with your actual OpenAI API key
   - Add Langfuse variables if you want to track API calls:
     - `LANGFUSE_PUBLIC_KEY`
     - `LANGFUSE_SECRET_KEY`
     - `LANGFUSE_BASE_URL`

4. Deploy:
   - Click "Deploy" and wait for the build to complete

5. Your application will be available at the provided Vercel URL.

## Usage

1. Open the application in your web browser.
2. Choose the tool you want to use from the navigation.
3. For "How Is It Sliced?":
   - Upload a 3MF file using the drag-and-drop area or the file browser (max 4.5MB).
   - Wait for the analysis to complete.
   - Explore the results across different tabs:
     - Overview: General information about the print settings
     - Files: View all files contained in the 3MF archive
     - Settings: Analyze modified slicer settings
     - Comparison: Compare against standard profiles
4. For "Print Troubleshooting":
   - Upload a G-code file using the drag-and-drop area or file browser (max 20MB).
   - Describe the print issue you're experiencing in the text area.
   - Submit your information and wait for the AI analysis.
   - Review the troubleshooting guidance provided.

## Future Tools

This project aims to expand with additional AI-powered tools for 3D printing. Future tools may include:
- Model optimization suggestions
- Material compatibility checker
- Print time and cost estimator
- Automatic profile tuning

## Development Notes

- The application uses OpenAI's GPT-4o model for analysis
- The default model can be changed in `lib/openai.ts`
- Error handling is implemented for various failure scenarios
- For local development without an OpenAI API key, you can use the test endpoint at `/test-openai`
- API calls are tracked using Langfuse when configured (optional)
- File upload size is limited to 4.5MB for 3MF files and 20MB for G-code files

## License

[MIT License](LICENSE)