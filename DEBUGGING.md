# Debugging Next.js API Routes

This project is set up to support debugging with breakpoints in Next.js API routes.

## Option 1: Using VS Code Debug Configuration

1. Open VS Code
2. Set breakpoints in your API route files (e.g., `app/api/analyze/route.ts`)
3. Click on the "Run and Debug" icon in the sidebar
4. Select "Next.js: debug API routes" from the dropdown
5. Click the green play button to start debugging
6. Upload a 3MF file through the application UI to trigger the API call
7. VS Code will pause at your breakpoints

## Option 2: Using pnpm run debug

1. Set breakpoints in your API route files
2. Run the following command:
   ```bash
   nvm use
   pnpm run debug
   ```
3. Open Chrome and navigate to `chrome://inspect`
4. Click on "Open dedicated DevTools for Node"
5. Upload a 3MF file through the application UI
6. Execution will pause at your breakpoints in the DevTools console

## Suggested Breakpoint Locations

For the analyze API, good places to set breakpoints include:

- `app/api/analyze/route.ts` - Inside the POST handler
- `lib/analyzer.ts` - At the beginning of the analyze3mfFile function
- `lib/fileHandler.ts` - Inside the extract3mfFile function

## Troubleshooting

### Breakpoints Not Hit When Using Regular `pnpm dev`

The regular development server doesn't run with the inspector attached. You must use either:
- The VS Code debug configuration
- The `pnpm run debug` command

### Shell Script Errors

If you see errors like `SyntaxError: missing ) after argument list` when debugging, it's likely due to shell script issues with the Next.js binary. Our configuration avoids this by directly using the Next.js code instead of the shell script wrapper.

### Mac-Specific Notes

For macOS, if you're having issues with the single quotes in the `NODE_OPTIONS` setting, try:
```json
"debug": "NODE_OPTIONS=\"--inspect\" node ./node_modules/next/dist/bin/next dev"
```