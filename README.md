# GDG Tampa Bay Operator (`gdg-tampa-bay-operator`)

A TypeScript demo for the **GDG Tampa Bay — Build with AI: From Chatbot to Operator** session, showing how to turn Gemini into a tool-calling software operator using the `@google/genai` SDK (`gemini-3.5-flash-lite`) with typed `FunctionDeclaration` schemas, deterministic backend execution, and human-in-the-loop confirmation for write operations.

## Project Structure

```text
gdg-tampa-bay-operator/
├── index.ts        # Stateful chat session, toolHandlers map, and 3-turn function-calling loop
├── tools.ts        # Gemini FunctionDeclaration schemas and deterministic return-policy logic
├── mockData.json   # Sample orders (#8841, #8842, #8843) covering policy edge cases
├── package.json    # Dependencies (@google/genai, tsx, typescript) and dev script
└── tsconfig.json   # Strict NodeNext TypeScript configuration
```

### Sample Orders (`mockData.json`)

| Order ID | Item | Days Since Delivery | Final Sale | Policy Outcome |
| :--- | :--- | :--- | :--- | :--- |
| `8841` | Trail Running Shoes (Size 10) | `3` | `false` | Eligible for return |
| `8842` | Mechanical Keyboard | `58` | `false` | Ineligible (>30-day window) |
| `8843` | Clearance Winter Jacket | `2` | `true` | Ineligible (Final Sale) |

## Prerequisites

- **Node.js** (v18+ recommended; `@types/node` v22 is configured)
- A **Gemini API key** from Google AI Studio

## Setup

1. Navigate to the project directory:

   ```bash
   cd gdg-tampa-bay-operator
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set your `GEMINI_API_KEY` environment variable (read automatically by `new GoogleGenAI({})` in `index.ts`):

   ```bash
   export GEMINI_API_KEY="your-gemini-api-key"
   ```

## Running the Demo

Run the demo with `tsx`:

```bash
npm run dev
```

To run the TypeScript type-checker without emitting files:

```bash
npx tsc --noEmit
```

## What the Demo Does

`index.ts` runs a three-turn conversation (`runOperatorDemo`) using `gemini-3.5-flash-lite`:

1. **Turn 1 (Read operation):** The user asks about returning order `#8841`. Gemini invokes `checkReturnEligibility` (`{ orderId: '8841' }`), verifies the 30-day window and final-sale status against `mockData.json`, and asks the user to confirm before creating a label.
2. **Turn 2 (Confirmed write operation):** After the user explicitly confirms, Gemini invokes `generateReturnLabel`, which re-validates eligibility on the backend and returns a simulated UPS Ground tracking number and label URL.
3. **Turn 3 (Policy enforcement):** The user asks about returning order `8842`. Gemini calls `checkReturnEligibility`, receives `eligible: false` (58 days since delivery), and explains that the 30-day return window has expired.

## API Keys & Authentication (Dev vs. Prod)

### Local Development (`GEMINI_API_KEY`)

- **Automatic env lookup:** Initializing `new GoogleGenAI({})` in [index.ts](index.ts) automatically reads `process.env.GEMINI_API_KEY`—so you never need to hardcode keys in source files.
- **Shell export or `.env` file:** Export `GEMINI_API_KEY` in your terminal (`export GEMINI_API_KEY="..."`), or store it in a local `.env` file and run `npx tsx --env-file=.env index.ts`.
- **Keep keys out of Git:** `.env` and `.env.*` are excluded in `.gitignore`.

### Production (Cloud Run / Vertex AI)

- **Server-side only:** Never expose `GEMINI_API_KEY` in browser/frontend bundles; keep all `@google/genai` calls and tool handlers inside your backend service.
- **Secret Manager (Gemini Developer API):** Store `GEMINI_API_KEY` in Google Cloud Secret Manager and mount it into Cloud Run as a secret environment variable with least-privilege IAM access (`roles/secretmanager.secretAccessor`).
- **Keyless ADC with Vertex AI (Recommended for GCP):** Eliminate static API keys entirely by pointing the same `@google/genai` SDK at Vertex AI using Application Default Credentials (ADC) via your Cloud Run service account (`roles/aiplatform.user`):

  ```ts
  const ai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: 'us-central1',
  });
  ```
