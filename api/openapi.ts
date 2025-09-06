export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'CoupleBudget API',
    version: '1.0.0',
    description: 'API for participants, expenses, statistics, activities, and auth. Auth via Bearer JWT (HS256).',
  },
  servers: [
    { url: 'http://localhost:3333' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      Participant: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email', nullable: true },
          income: { type: 'number' }
        },
        required: ['id','name','income']
      },
      Expense: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          total: { type: 'number' }
        },
        required: ['id','name','total']
      },
      Activity: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          action: { type: 'string' },
          entity_type: { type: 'string' },
          entity_id: { type: 'string' },
          payload: { type: 'object' },
          created_at: { type: 'string', format: 'date-time' }
        },
        required: ['id','action','entity_type','entity_id','created_at']
      },
      Stats: {
        type: 'object',
        properties: {
          participants: { type: 'array', items: { $ref: '#/components/schemas/Participant' } },
          expenses: { type: 'array', items: { $ref: '#/components/schemas/Expense' } },
          participantShares: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, share: { type: 'number' } } } },
          expensesWithAllocations: { type: 'array', items: { allOf: [ { $ref: '#/components/schemas/Expense' }, { type: 'object', properties: { allocations: { type: 'object', additionalProperties: { type: 'number' } } } } ] } },
          totalIncome: { type: 'number' },
          totalExpenses: { type: 'number' },
          totalsPerParticipant: { type: 'object', additionalProperties: { type: 'number' } }
        }
      },
      PagedExpense: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/Expense' } },
          total: { type: 'integer' },
          page: { type: 'integer' },
          pageSize: { type: 'integer' }
        },
        required: ['items','total','page','pageSize']
      },
      PagedActivity: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/Activity' } },
          total: { type: 'integer' },
          page: { type: 'integer' },
          pageSize: { type: 'integer' }
        },
        required: ['items','total','page','pageSize']
      },
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
        required: ['error']
      }
    }
  },
  paths: {
    '/participants': {
      get: {
        summary: 'List participants',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Participant' } } } } } }
      },
      post: {
        summary: 'Create participant',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, income: { type: 'number' } }, required: ['name','income'] } } } },
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Participant' } } } },
          '409': { description: 'Conflict (email already exists)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/participants/{id}': {
      patch: {
        summary: 'Update participant',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, income: { type: 'number' } } } } } },
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Participant' } } } }, '404': { description: 'Not found' } }
      },
      delete: {
        summary: 'Delete participant',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'No Content' } }
      }
    },
    '/expenses': {
      get: {
        summary: 'List expenses',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100 } }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { type: 'array', items: { $ref: '#/components/schemas/Expense' } },
                    { $ref: '#/components/schemas/PagedExpense' }
                  ]
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create expense',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, total: { type: 'number' } }, required: ['name','total'] } } } },
        responses: { '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Expense' } } } } }
      }
    },
    '/expenses/{id}': {
      patch: {
        summary: 'Update expense',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, total: { type: 'number' } } } } } },
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Expense' } } } }, '404': { description: 'Not found' } }
      },
      delete: {
        summary: 'Delete expense',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '204': { description: 'No Content' } }
      }
    },
    '/stats': {
      get: {
        summary: 'Get statistics',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Stats' } } } } }
      }
    },
    '/activities': {
      get: {
        summary: 'List user activities (paginated)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', required: false, schema: { type: 'integer', minimum: 1 } },
          { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 100 } }
        ],
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/PagedActivity' } } } } }
      }
    },
    '/auth/register': {
      post: {
        summary: 'Register a new user',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } }, required: ['email','password'] } } } },
        responses: {
          '201': { description: 'Created' },
          '409': { description: 'Email exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Login and receive a JWT',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } }, required: ['email','password'] } } } },
        responses: { '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { access_token: { type: 'string' } }, required: ['access_token'] } } } }, '401': { description: 'Invalid credentials' } }
      }
    },
    '/auth/verify': {
      get: {
        summary: 'Verify a JWT token',
        parameters: [ { name: 'Authorization', in: 'header', required: true, schema: { type: 'string' } } ],
        responses: { '200': { description: 'OK' } }
      }
    }
  }
};
