import { NextRequest, NextResponse } from 'next/server';
import { getCategories, getSiteConfig } from '@/data';
import { getCorsHeaders } from '@/lib/cors';

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const HEADERS = {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    ...getCorsHeaders(origin),
  };
  const config = getSiteConfig();
  const categories = getCategories();
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
                      count: { type: 'integer', example: 4 },
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
              description: 'Maximum number of recommendations to return (1–10). Default: 3.',
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
    components: {
      schemas: {
        Model: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'claude' },
            name: { type: 'string', example: 'Claude Opus 4.6' },
            provider: { type: 'string', example: 'Anthropic' },
            url: { type: 'string', format: 'uri', example: 'https://claude.ai' },
            tag: { type: 'string', example: 'Coding King' },
            desc: { type: 'string' },
            color: { type: 'string', example: '#D97706' },
            elo: { type: 'integer', example: 1503 },
            cost_per_million_tokens: { type: 'number', example: 15, description: 'USD per 1M input tokens' },
            cost_per_million_tokens_output: { type: 'number', example: 75, description: 'USD per 1M output tokens' },
            context_window: { type: 'integer', example: 1000000, description: 'Max context window in tokens' },
            strengths: {
              type: 'array',
              items: { type: 'string' },
              example: ['Coding & Engineering'],
            },
          },
        },
        Recommendation: {
          type: 'object',
          properties: {
            rank: { type: 'integer', example: 1 },
            score: { type: 'number', format: 'float', example: 0.87, description: 'Composite score 0–1' },
            reasons: {
              type: 'array',
              items: { type: 'string' },
              example: ['Category leader for Coding & Engineering', 'Highest Elo rating (1503)'],
            },
            model: { $ref: '#/components/schemas/Model' },
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
            filters_applied: { type: 'array', items: { type: 'string' } },
            models_considered: { type: 'integer' },
            models_excluded: { type: 'integer' },
            last_updated: { type: 'string', format: 'date' },
          },
        },
        StatusResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            version: { type: 'string', example: '2.14.13' },
            data_last_updated: { type: 'string', format: 'date' },
            models_count: { type: 'integer' },
            categories_count: { type: 'integer' },
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
