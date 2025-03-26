# AI 3MF Analyzer

A Next.js web application that analyzes 3D printing files (3MF format) using AI to provide insights about slicer settings and their effects on print quality.

## Features

- Upload and analyze 3MF files from PrusaSlicer and compatible slicers
- Extract and view all files contained within the 3MF archive
- AI-powered analysis of slicer settings using OpenAI's GPT-4o
- Compare modified settings against standard profiles
- Get insights on:
  - Overall purpose of the print settings
  - Visual and functional effects of the modifications
  - Trade-offs introduced by the settings
  - Optimization suggestions
  - Detailed parameter-by-parameter analysis

## Technology Stack

- Next.js 14+ with App Router
- React 19
- TypeScript
- Tailwind CSS with Shadcn UI components
- OpenAI API (GPT-4o)
- JSZip for 3MF file extraction

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- PNPM package manager
- OpenAI API key

### Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ai-3mf-analyzer.git
   cd ai-3mf-analyzer
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env.local` file in the project root with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   VERCEL_URL=localhost:3000
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

4. Deploy:
   - Click "Deploy" and wait for the build to complete

5. Your application will be available at the provided Vercel URL.

## Usage

1. Open the application in your web browser.
2. Upload a 3MF file using the drag-and-drop area or the file browser.
3. Wait for the analysis to complete.
4. Explore the results across different tabs:
   - Overview: General information about the print settings
   - Files: View all files contained in the 3MF archive
   - Settings: Analyze modified slicer settings
   - Comparison: Compare against standard profiles

## Development Notes

- The application uses OpenAI's GPT-4o model for analysis
- The default model can be changed in `lib/openai.ts`
- Error handling is implemented for various failure scenarios
- For local development without an OpenAI API key, you can use the test endpoint at `/test-openai`

## License

[MIT License](LICENSE)