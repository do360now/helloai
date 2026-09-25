import { NextRequest, NextResponse } from 'next/server';
import { getCategories, getModels, getSiteConfig } from '@/data';
import { apiHeaders } from '@/lib/api';

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const HEADERS = apiHeaders(origin, 'public, s-maxage=3600, stale-while-revalidate=86400');
  const config = getSiteConfig();
  const categories = getCategories();
  const models = getModels();
  // Pick the example model by stable id so the OpenAPI examples don't drift
  // when models.json is reordered or a new top entry appears. Falls back to
  // the first model if the id is ever renamed.
  const exampleModel = models.find((m) => m.id === 'fable') ?? models[0];
  const taskExamples = categories.map((c) => c.name.split(' ')[0].toLowerCase());

  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'Hello, AI API',
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev',
      description:
        'Curated frontier AI model directory. Query model rankings, costs, context windows, and get task-specific recommendations. Data updated weekly.',
      contact: {
        name: 'Clement Machado',
        url: 'https://helloai.com',
      },
    },
    servers: [{ url: 'https://helloai.com', description: 'Production' }],
    paths: {
      '/api/models': {
        get: {
          operationId: 'listModels',
          summary: 'List all AI models',
          description:
            'Returns all frontier AI models in the directory with Elo ratings, pricing, context windows, and category strengths.',
          parameters: [
            {
              name: 'provider',
              in: 'query',
              required: false,
              description: 'Filter by provider name (case-insensitive substring match)',
              schema: { type: 'string', example: 'Anthropic' },
            },
          ],
          responses: {
            '200': {
              description: 'List of models',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      models: { type: 'array', items: { $ref: '#/components/schemas/Model' } },
                      count: { type: 'integer', example: getModels().length },
                      last_updated: { type: 'string', format: 'date', example: config.lastUpdated },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/recommend': {
        get: {
          operationId: 'recommendModel',
          summary: 'Get model recommendations for a task',
          description:
            'Returns ranked AI model recommendations based on task, cost, context window, and provider filters. Use this to answer "which model should I use for X?"',
          parameters: [
            {
              name: 'task',
              in: 'query',
              required: false,
              description: `Use case to optimize for. Matched against category names: ${categories.map((c) => c.name).join(', ')}.`,
              schema: { type: 'string', example: taskExamples[0] },
            },
            {
              name: 'max_cost',
              in: 'query',
              required: false,
              description: 'Maximum cost in USD per 1 million input tokens. Models above this are excluded.',
              schema: { type: 'number', example: 10 },
            },
            {
              name: 'min_context',
              in: 'query',
              required: false,
              description: 'Minimum context window size in tokens. Models below this are excluded.',
              schema: { type: 'integer', example: 1000000 },
            },
            {
              name: 'provider',
              in: 'query',
              required: false,
              description: 'Filter to a specific provider (case-insensitive substring match).',
              schema: { type: 'string', example: 'Google' },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              description:
                'Maximum number of recommendations to return. Must be a plain integer 1–10 (non-integer or out-of-range values are rejected with 400). Default: 3.',
              schema: { type: 'integer', minimum: 1, maximum: 10, default: 3 },
            },
          ],
          responses: {
            '200': {
              description: 'Ranked recommendations',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/RecommendResponse' },
                },
              },
            },
            '400': {
              description: 'Invalid query parameter',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '404': {
              description: 'No models match the given filters',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/status': {
        get: {
          operationId: 'getStatus',
          summary: 'API status and metadata',
          description: 'Returns API health, current version, data freshness, model count, and endpoint manifest.',
          responses: {
            '200': {
              description: 'Status information',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/StatusResponse' },
                },
              },
            },
          },
        },
      },
    },
    externalDocs: { description: 'Machine-readable overview of the site, models and articles', url: 'https://helloai.com/llms.txt' },
    components: {
      schemas: {
        Model: {
          type: 'object',
          properties: {
            id: { type: 'string', example: exampleModel.id },
            name: { type: 'string', example: exampleModel.name },
            provider: { type: 'string', example: exampleModel.provider },
            url: { type: 'string', format: 'uri', example: exampleModel.url },
            tag: { type: 'string', example: exampleModel.tag },
            desc: { type: 'string' },
            color: { type: 'string', example: exampleModel.color },
            elo: { type: 'integer', example: exampleModel.elo, description: 'Stored Elo. Only the model\'s own score when rated is true.' },
            rated: { type: 'boolean', description: 'False when elo is a predecessor\'s, missing or stale score; such a model is never ranked. See elo_source.' },
            cost_per_million_tokens: { type: 'number', example: exampleModel.cost_per_million_tokens, description: 'USD per 1M input tokens' },
            cost_per_million_tokens_output: { type: 'number', example: exampleModel.cost_per_million_tokens_output, description: 'USD per 1M output tokens' },
            context_window: { type: 'integer', example: exampleModel.context_window, description: 'Max context window in tokens' },
            strengths: {
              type: 'array',
              items: { type: 'string' },
              example: ['Coding & Engineering'],
            },
            elo_source: {
              type: 'object',
              description: 'Where elo comes from. matches_listed_model is false when the score belongs to a predecessor model (see arena_model).',
              properties: {
                board: { type: 'string', enum: ['text_overall', 'webdev', 'other'] },
                arena_model: { type: 'string', example: exampleModel.elo_source?.arena_model },
                matches_listed_model: { type: 'boolean' },
                config: { type: 'string' },
                ci_low: { type: 'integer' },
                ci_high: { type: 'integer' },
                votes: { type: 'integer' },
                snapshot_date: { type: 'string', format: 'date', description: 'What the board says (its own date).' },
                checked_date: { type: 'string', format: 'date', description: 'When we last looked at the board.' },
                source_url: { type: 'string', format: 'uri' },
                set_by: { type: 'string', enum: ['override', 'fetched', 'agent_curated'] },
                status: { type: 'string', enum: ['ok', 'missing', 'stale'] },
              },
            },
          },
        },
        // Model subset serialized in /api/recommend responses. Mirrors
        // RecommendModelDTO (data/api-types.ts): no desc/color/strengths —
        // fetch /api/models for the full record.
        RecommendModel: {
          type: 'object',
          description:
            'Lean model projection returned by /api/recommend. For desc, color, and strengths, fetch /api/models.',
          properties: {
            id: { type: 'string', example: exampleModel.id },
            name: { type: 'string', example: exampleModel.name },
            provider: { type: 'string', example: exampleModel.provider },
            url: { type: 'string', format: 'uri', example: exampleModel.url },
            tag: { type: 'string', example: exampleModel.tag },
            elo: { type: 'integer', example: exampleModel.elo },
            cost_per_million_tokens: { type: 'number', example: exampleModel.cost_per_million_tokens, description: 'USD per 1M input tokens' },
            cost_per_million_tokens_output: { type: 'number', example: exampleModel.cost_per_million_tokens_output, description: 'USD per 1M output tokens' },
            context_window: { type: 'integer', example: exampleModel.context_window, description: 'Max context window in tokens' },
          },
        },
        Recommendation: {
          type: 'object',
          properties: {
            rank: { type: 'integer', example: 1 },
            score: {
              type: 'number',
              format: 'float',
              example: 0.87,
              description:
                'Composite score 0 to 1. Cost is scored on the input price only. Scores are comparable only between calls that share the same scoring version, data snapshot and resolved task (which selects the weights). It is an ordering aid, not a quality measure. Filters never rescale it: components are normalized against all tracked models (rated models only for Elo).',
            },
            reasons: {
              type: 'array',
              items: { type: 'string' },
              example: ["Curator's pick for Coding & Engineering", 'Highest Elo (1508)'],
            },
            breakdown: {
              type: 'object',
              description: 'Weighted contribution of each component. The parts add up to score within rounding (about 0.02), because each part is rounded separately. Cost is scored on the input price only.',
              properties: {
                task: { type: 'number', description: "Curator's pick / curator-rated strength (hand-set labels in categories.json)" },
                elo: { type: 'number' },
                cost: { type: 'number' },
                context: { type: 'number' },
              },
            },
            label: {
              type: 'string',
              enum: ['leader', 'strength', 'none'],
              description: "Which curator label applied for the resolved task: the category leader (Curator's pick), a listed strength (Curator-rated strength), or none.",
            },
            label_effect: {
              type: 'number',
              description: 'How much of score came from curated labels (the leader or strength). Equals breakdown.task; 0 when no task matched.',
            },
            model: { $ref: '#/components/schemas/RecommendModel' },
          },
        },
        RecommendResponse: {
          type: 'object',
          properties: {
            query: {
              type: 'object',
              properties: {
                task: { type: 'string', nullable: true },
                max_cost: { type: 'number', nullable: true },
                min_context: { type: 'integer', nullable: true },
                provider: { type: 'string', nullable: true },
                limit: { type: 'integer' },
              },
            },
            recommendations: { type: 'array', items: { $ref: '#/components/schemas/Recommendation' } },
            unrated: {
              type: 'array',
              description:
                'Models that pass the filters but are not ranked because their stored Elo is a predecessor\'s (borrowed_score), missing or stale. They never appear in recommendations and never affect the ranking.',
              items: {
                type: 'object',
                properties: {
                  reason: { type: 'string', enum: ['borrowed_score', 'missing_score', 'stale_score'] },
                  arena_model: { type: 'string', description: 'The Arena slug the stored Elo belongs to, when known.', example: 'claude-opus-5-high' },
                  elo_source: { $ref: '#/components/schemas/Model/properties/elo_source' },
                  model: {
                    type: 'object',
                    description: 'Like RecommendModel but WITHOUT elo: for an unrated model that number is a predecessor\'s, missing or stale. See elo_source.',
                    properties: {
                      id: { type: 'string' }, name: { type: 'string' }, provider: { type: 'string' },
                      url: { type: 'string', format: 'uri' }, tag: { type: 'string' },
                      cost_per_million_tokens: { type: 'number' }, cost_per_million_tokens_output: { type: 'number' },
                      context_window: { type: 'integer' },
                    },
                  },
                },
              },
            },
            notes: { type: 'array', items: { type: 'string' }, description: 'Plain-language explanations, for example an unrated category leader.' },
            meta: {
              type: 'object',
              properties: {
                scoring: {
                  type: 'object',
                  description: 'How this response was scored. Two responses are comparable only if version, snapshot and matched_category agree.',
                  properties: {
                    version: { type: 'integer', example: 1, description: 'Bumped when the weights or the normalization basis change.' },
                    weights: {
                      type: 'object',
                      description: 'The weight set actually used for this call.',
                      properties: { task: { type: 'number' }, elo: { type: 'number' }, cost: { type: 'number' }, context: { type: 'number' } },
                    },
                    normalization: { type: 'string', enum: ['all_tracked_models'] },
                    snapshot: { type: 'string', example: 'sha256:0123456789ab', description: 'Fingerprint of models.json, categories.json and the data date.' },
                    data_last_updated: { type: 'string', format: 'date' },
                    matched_category: { type: 'string', nullable: true, description: 'What task resolved to, or null.' },
                  },
                },
              },
            },
            filters_applied: { type: 'array', items: { type: 'string' } },
            models_considered: { type: 'integer' },
            models_excluded: { type: 'integer' },
            matched_category: {
              type: 'string',
              nullable: true,
              example: 'Coding & Engineering',
              description: 'Category the task param matched, or null when no task was given/matched',
            },
            last_updated: { type: 'string', format: 'date' },
          },
        },
        StatusResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            version: { type: 'string', example: process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev' },
            data_last_updated: { type: 'string', format: 'date' },
            models_count: { type: 'integer' },
            categories_count: { type: 'integer' },
            related: {
              type: 'array',
              description: 'Where to look next: llms.txt, the OpenAPI spec, and the operator\'s own product (the HelloAI Marketplace).',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'llms_txt' },
                  url: { type: 'string', format: 'uri', example: 'https://helloai.com/llms.txt' },
                  note: { type: 'string', description: 'Optional context, for example that the marketplace is the operator\'s own product.' },
                },
              },
            },
            usage: {
              type: 'object',
              description: 'Request counts since this container process started. Resets on restart and covers only this container process; the durable source is the [api-metrics] log lines.',
              properties: {
                since: { type: 'string', format: 'date-time' },
                total: { type: 'integer' },
                by_ua: { type: 'object', additionalProperties: { type: 'integer' } },
                by_path: { type: 'object', additionalProperties: { type: 'integer' } },
                note: { type: 'string' },
              },
            },
            endpoints: { type: 'array', items: { type: 'object' } },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Invalid parameter' },
            details: { type: 'string', example: 'max_cost must be a positive number' },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, { headers: HEADERS });
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: apiHeaders(req.headers.get('origin')) });
}
