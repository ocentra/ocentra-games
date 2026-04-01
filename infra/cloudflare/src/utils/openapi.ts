import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpContentType, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { HealthStatus } from '@ocentra/endpoint-domain/constants/health';
import { FormField } from '@/constants/form-fields';
import {
  OpenApiVersion,
  OpenApiInfo,
  OpenApiServer,
  OpenApiTag,
  OpenApiTagDescription,
  OpenApiParameterLocation,
  OpenApiParameterName,
  OpenApiSchemaType,
  OpenApiSchemaFormat,
  OpenApiSecuritySchemeType,
  OpenApiSecurityScheme,
  OpenApiSwaggerUi,
  OpenApiDescription,
  OpenApiResponseDescription,
  OpenApiParameterDescription,
  OpenApiSecurityDescription,
  OpenApiPlayerType,
  OpenApiTier,
  OpenApiHtmlTitle,
} from '@/constants/openapi';

function createPathParameter(name: string, description: string) {
  return {
    name,
    in: OpenApiParameterLocation.Path,
    required: true,
    schema: { type: OpenApiSchemaType.String },
    description,
  };
}

function createQueryParameter(name: string, description: string, required: boolean = false, schema: { type: string; default?: number; enum?: string[] } = { type: OpenApiSchemaType.String }) {
  return {
    name,
    in: OpenApiParameterLocation.Query,
    required,
    schema,
    description,
  };
}

function createJsonResponse(status: string, description: string, schema: Record<string, unknown> = { type: OpenApiSchemaType.Object }) {
  return {
    [status]: {
      description,
      content: {
        [HttpContentType.ApplicationJson]: {
          schema,
        },
      },
    },
  };
}

function createTextResponse(status: string, description: string, example?: string) {
  return {
    [status]: {
      description,
      content: {
        [HttpContentType.TextPlain]: {
          schema: { type: OpenApiSchemaType.String, ...(example ? { example } : {}) },
        },
      },
    },
  };
}

function createBearerAuthSecurity() {
  return [{ [OpenApiSecurityScheme.BearerAuth]: [] }];
}

function createJsonRequestBody(schema: Record<string, unknown>, required: boolean = true) {
  return {
    required,
    content: {
      [HttpContentType.ApplicationJson]: {
        schema,
      },
    },
  };
}

function createMultipartRequestBody(schema: Record<string, unknown>) {
  return {
    required: true,
    content: {
      [HttpContentType.MultipartFormData]: {
        schema,
      },
    },
  };
}

const matchIdParameter = createPathParameter(OpenApiParameterName.MatchId, OpenApiParameterDescription.UniqueMatchIdentifier);
const disputeIdParameter = createPathParameter(OpenApiParameterName.DisputeId, OpenApiParameterDescription.UniqueMatchIdentifier);
const userIdParameter = createPathParameter(OpenApiParameterName.UserId, OpenApiParameterDescription.UniqueMatchIdentifier);
const gameTypeParameter = createPathParameter(OpenApiParameterName.GameType, OpenApiParameterDescription.GameTypeDescription);

const tokenQueryParameter = createQueryParameter(OpenApiParameterName.Token, OpenApiParameterDescription.SignedUrlToken);
const expiresQueryParameter = createQueryParameter(OpenApiParameterName.Expires, OpenApiParameterDescription.ExpirationTimeSeconds, false, { type: OpenApiSchemaType.Integer, default: 3600 });
const seasonIdQueryParameter = createQueryParameter(OpenApiParameterName.SeasonId, OpenApiParameterDescription.SeasonIdDefault);
const limitQueryParameter = createQueryParameter(OpenApiParameterName.Limit, OpenApiParameterDescription.NumberOfEntries, false, { type: OpenApiSchemaType.Integer, default: 100 });
const tierQueryParameter = createQueryParameter(OpenApiParameterName.Tier, '', true, { type: OpenApiSchemaType.String, enum: Object.values(OpenApiTier) });
const rangeQueryParameter = createQueryParameter(OpenApiParameterName.Range, OpenApiParameterDescription.NumberOfPlayersAboveBelow, false, { type: OpenApiSchemaType.Integer, default: 5 });
const confirmQueryParameter = createQueryParameter(OpenApiParameterName.Confirm, OpenApiParameterDescription.ConfirmDeletion, true);

const bearerAuthSecurity = createBearerAuthSecurity();

const unauthorizedResponse = { [String(HttpStatus.Unauthorized)]: { description: OpenApiResponseDescription.Unauthorized } };
const notFoundResponse = { [String(HttpStatus.NotFound)]: { description: OpenApiResponseDescription.MatchNotFound } };
const badRequestResponse = { [String(HttpStatus.BadRequest)]: { description: OpenApiResponseDescription.BadRequest } };
const notImplementedResponse = { [String(HttpStatus.NotImplemented)]: { description: OpenApiResponseDescription.NotImplemented } };

export const openApiSpec = {
  openapi: OpenApiVersion.V3_0_0,
  info: {
    title: OpenApiInfo.Title,
    description: OpenApiInfo.Description,
    version: OpenApiInfo.Version,
    contact: {
      name: OpenApiInfo.ContactName,
      url: OpenApiInfo.ContactUrl,
    },
  },
  servers: [
    {
      url: OpenApiServer.Development,
      description: OpenApiServer.DevelopmentDescription,
    },
    {
      url: OpenApiServer.Production,
      description: OpenApiServer.ProductionDescription,
    },
  ],
  tags: [
    { name: OpenApiTag.Matches, description: OpenApiTagDescription.Matches },
    { name: OpenApiTag.SignedUrls, description: OpenApiTagDescription.SignedUrls },
    { name: OpenApiTag.Disputes, description: OpenApiTagDescription.Disputes },
    { name: OpenApiTag.Archive, description: OpenApiTagDescription.Archive },
    { name: OpenApiTag.AI, description: OpenApiTagDescription.AI },
    { name: OpenApiTag.GDPR, description: OpenApiTagDescription.GDPR },
    { name: OpenApiTag.Leaderboard, description: OpenApiTagDescription.Leaderboard },
    { name: OpenApiTag.Health, description: OpenApiTagDescription.Health },
  ],
  paths: {
    [ApiEndpoint.Health]: {
      get: {
        tags: [OpenApiTag.Health],
        summary: 'Health check',
        description: OpenApiDescription.HealthCheck,
        responses: {
          ...createJsonResponse(String(HttpStatus.Ok), OpenApiResponseDescription.ServiceHealthy, {
            type: OpenApiSchemaType.Object,
            properties: {
              status: { type: OpenApiSchemaType.String, example: HealthStatus.Ok },
            },
          }),
        },
      },
    },
    [ApiEndpoint.Metrics]: {
      get: {
        tags: [OpenApiTag.Health],
        summary: 'Get metrics',
        description: OpenApiDescription.GetMetrics,
        responses: {
          ...createJsonResponse(String(HttpStatus.Ok), OpenApiResponseDescription.MetricsData, {
            type: OpenApiSchemaType.Object,
            properties: {
              metrics: { type: OpenApiSchemaType.Object },
              alerts: {
                type: OpenApiSchemaType.Array,
                items: { type: OpenApiSchemaType.Object },
              },
            },
          }),
        },
      },
    },
    [`/api/v1/matches/{${OpenApiParameterName.MatchId}}`]: {
      get: {
        tags: [OpenApiTag.Matches],
        summary: 'Get match record',
        description: OpenApiDescription.GetMatchRecord,
        parameters: [
          matchIdParameter,
          tokenQueryParameter,
        ],
        responses: {
          ...createJsonResponse(String(HttpStatus.Ok), OpenApiResponseDescription.MatchRecordFound, { type: OpenApiSchemaType.Object }),
          ...createTextResponse(String(HttpStatus.NotFound), OpenApiResponseDescription.MatchNotFound, OpenApiResponseDescription.MatchNotFound),
        },
      },
      put: {
        tags: [OpenApiTag.Matches],
        summary: 'Upload match record',
        description: OpenApiDescription.UploadMatchRecord,
        parameters: [matchIdParameter],
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: [FormField.MatchId, 'version', 'players', 'events'],
          properties: {
            [FormField.MatchId]: { type: OpenApiSchemaType.String },
            version: { type: OpenApiSchemaType.String },
            game_type: { type: OpenApiSchemaType.String },
            created_at: { type: OpenApiSchemaType.String, format: OpenApiSchemaFormat.DateTime },
            ended_at: { type: OpenApiSchemaType.String, format: OpenApiSchemaFormat.DateTime },
            players: {
              type: OpenApiSchemaType.Array,
              items: {
                type: OpenApiSchemaType.Object,
                properties: {
                  [FormField.PlayerId]: { type: OpenApiSchemaType.String },
                  wallet_address: { type: OpenApiSchemaType.String },
                  player_type: { type: OpenApiSchemaType.String, enum: [OpenApiPlayerType.Human, OpenApiPlayerType.AI] },
                  score: { type: OpenApiSchemaType.Number },
                },
              },
            },
            events: {
              type: OpenApiSchemaType.Array,
              items: { type: OpenApiSchemaType.Object },
            },
            metadata: { type: OpenApiSchemaType.Object },
          },
        }),
        security: bearerAuthSecurity,
        responses: {
          ...createJsonResponse(String(HttpStatus.Ok), OpenApiResponseDescription.MatchRecordUploaded, {
            type: OpenApiSchemaType.Object,
            properties: {
              success: { type: OpenApiSchemaType.Boolean },
              matchId: { type: OpenApiSchemaType.String },
              url: { type: OpenApiSchemaType.String },
            },
          }),
          ...badRequestResponse,
          [String(HttpStatus.Unauthorized)]: { description: OpenApiResponseDescription.UnauthorizedAuthRequired },
          [String(HttpStatus.PayloadTooLarge)]: { description: OpenApiResponseDescription.MatchRecordTooLarge },
          [String(HttpStatus.TooManyRequests)]: { description: OpenApiResponseDescription.RateLimitExceeded },
        },
      },
      delete: {
        tags: [OpenApiTag.Matches],
        summary: 'Delete match record',
        description: OpenApiDescription.DeleteMatchRecord,
        parameters: [matchIdParameter],
        security: bearerAuthSecurity,
        responses: {
          [String(HttpStatus.Ok)]: { description: OpenApiResponseDescription.MatchRecordDeleted },
          ...unauthorizedResponse,
          ...notFoundResponse,
        },
      },
    },
    [`/api/v1/matches/{${OpenApiParameterName.MatchId}}/anonymize`]: {
      post: {
        tags: [OpenApiTag.GDPR],
        summary: 'Anonymize match record',
        description: OpenApiDescription.AnonymizeMatchRecord,
        parameters: [matchIdParameter],
        security: bearerAuthSecurity,
        responses: {
          ...createJsonResponse(String(HttpStatus.Ok), OpenApiResponseDescription.MatchAnonymized, {
            type: OpenApiSchemaType.Object,
            properties: {
              success: { type: OpenApiSchemaType.Boolean },
              [FormField.MatchId]: { type: OpenApiSchemaType.String },
              anonymized_at: { type: OpenApiSchemaType.String, format: OpenApiSchemaFormat.DateTime },
              anonymized_url: { type: OpenApiSchemaType.String },
            },
          }),
          ...badRequestResponse,
          ...unauthorizedResponse,
          ...notFoundResponse,
        },
      },
    },
    [`/api/v1/signed-url/{${OpenApiParameterName.MatchId}}`]: {
      get: {
        tags: [OpenApiTag.SignedUrls],
        summary: 'Generate signed URL',
        description: OpenApiDescription.GenerateSignedUrl,
        parameters: [
          matchIdParameter,
          expiresQueryParameter,
        ],
        responses: {
          ...createJsonResponse(String(HttpStatus.Ok), OpenApiResponseDescription.SignedUrlGenerated, {
            type: OpenApiSchemaType.Object,
            properties: {
              matchId: { type: OpenApiSchemaType.String },
              signedUrl: { type: OpenApiSchemaType.String },
              expiresIn: { type: OpenApiSchemaType.Integer },
              expiresAt: { type: OpenApiSchemaType.String, format: OpenApiSchemaFormat.DateTime },
            },
          }),
          ...badRequestResponse,
          [String(HttpStatus.InternalServerError)]: { description: OpenApiResponseDescription.SignedUrlSecretNotConfigured },
        },
      },
    },
    [ApiEndpoint.Disputes.Base]: {
      post: {
        tags: [OpenApiTag.Disputes],
        summary: 'Create dispute',
        description: OpenApiDescription.CreateDispute,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: [FormField.MatchId, FormField.Reason],
          properties: {
            [FormField.MatchId]: { type: OpenApiSchemaType.String },
            [FormField.Reason]: { type: OpenApiSchemaType.String },
            reason_hash: { type: OpenApiSchemaType.String },
            created_by: { type: OpenApiSchemaType.String },
            timestamp: { type: OpenApiSchemaType.String, format: OpenApiSchemaFormat.DateTime },
          },
        }),
        security: bearerAuthSecurity,
        responses: {
          ...createJsonResponse(String(HttpStatus.Ok), OpenApiResponseDescription.DisputeCreated, {
            type: OpenApiSchemaType.Object,
            properties: {
              success: { type: OpenApiSchemaType.Boolean },
              disputeId: { type: OpenApiSchemaType.String },
              dispute: { type: OpenApiSchemaType.Object },
            },
          }),
          ...unauthorizedResponse,
        },
      },
    },
    [`/api/v1/disputes/{${OpenApiParameterName.DisputeId}}`]: {
      get: {
        tags: [OpenApiTag.Disputes],
        summary: 'Get dispute',
        description: OpenApiDescription.GetDispute,
        parameters: [disputeIdParameter],
        responses: {
          ...createJsonResponse(String(HttpStatus.Ok), OpenApiResponseDescription.DisputeFound, { type: OpenApiSchemaType.Object }),
          [String(HttpStatus.NotFound)]: { description: OpenApiResponseDescription.DisputeFound.replace('found', 'not found') },
        },
      },
    },
    [`/api/v1/disputes/{${OpenApiParameterName.DisputeId}}/evidence`]: {
      post: {
        tags: [OpenApiTag.Disputes],
        summary: 'Upload dispute evidence',
        description: OpenApiDescription.UploadDisputeEvidence,
        parameters: [disputeIdParameter],
        requestBody: createMultipartRequestBody({
          type: OpenApiSchemaType.Object,
          properties: {
            evidence: {
              type: OpenApiSchemaType.String,
              format: OpenApiSchemaFormat.Binary,
              description: OpenApiParameterDescription.EvidenceFileMaxSize,
            },
            [FormField.MatchId]: { type: OpenApiSchemaType.String },
            [FormField.Reason]: { type: OpenApiSchemaType.String },
            [FormField.Description]: { type: OpenApiSchemaType.String },
          },
        }),
        security: bearerAuthSecurity,
        responses: {
          ...createJsonResponse(String(HttpStatus.Ok), OpenApiResponseDescription.EvidenceUploaded, {
            type: OpenApiSchemaType.Object,
            properties: {
              success: { type: OpenApiSchemaType.Boolean },
              dispute_id: { type: OpenApiSchemaType.String },
              evidence_package_hash: { type: OpenApiSchemaType.String },
              evidence_files: { type: OpenApiSchemaType.Integer },
              evidence: {
                type: OpenApiSchemaType.Array,
                items: {
                  type: OpenApiSchemaType.Object,
                  properties: {
                    filename: { type: OpenApiSchemaType.String },
                    type: { type: OpenApiSchemaType.String },
                    size_bytes: { type: OpenApiSchemaType.Integer },
                    hash: { type: OpenApiSchemaType.String },
                    url: { type: OpenApiSchemaType.String },
                    uploaded_at: { type: OpenApiSchemaType.String, format: OpenApiSchemaFormat.DateTime },
                  },
                },
              },
            },
          }),
          [String(HttpStatus.BadRequest)]: { description: OpenApiResponseDescription.FileTooLargeOrInvalid },
          ...unauthorizedResponse,
        },
      },
    },
    [`/api/v1/archive/{${OpenApiParameterName.MatchId}}`]: {
      post: {
        tags: [OpenApiTag.Archive],
        summary: 'Archive match record',
        description: OpenApiDescription.ArchiveMatchRecord,
        parameters: [matchIdParameter],
        responses: {
          ...createJsonResponse(String(HttpStatus.Ok), OpenApiResponseDescription.MatchArchived, {
            type: OpenApiSchemaType.Object,
            properties: {
              success: { type: OpenApiSchemaType.Boolean },
              matchId: { type: OpenApiSchemaType.String },
              archivedUrl: { type: OpenApiSchemaType.String },
            },
          }),
          ...notFoundResponse,
        },
      },
    },
    [ApiEndpoint.AI.OnEvent]: {
      post: {
        tags: [OpenApiTag.AI],
        summary: 'Handle AI event',
        description: OpenApiDescription.HandleAIEvent,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: [FormField.MatchId, 'event_type'],
          properties: {
            [FormField.MatchId]: { type: OpenApiSchemaType.String },
            event_type: { type: OpenApiSchemaType.String },
            [FormField.PlayerId]: { type: OpenApiSchemaType.String },
            current_state: { type: OpenApiSchemaType.Object },
            player_hand: {
              type: OpenApiSchemaType.Array,
              items: { type: OpenApiSchemaType.Object },
            },
            available_actions: {
              type: OpenApiSchemaType.Array,
              items: { type: OpenApiSchemaType.String },
            },
            event_data: { type: OpenApiSchemaType.Object },
            match_history: {
              type: OpenApiSchemaType.Array,
              items: { type: OpenApiSchemaType.Object },
            },
          },
        }),
        security: bearerAuthSecurity,
        responses: {
          ...createJsonResponse(String(HttpStatus.Ok), OpenApiResponseDescription.AIEventProcessed, { type: OpenApiSchemaType.Object }),
          ...unauthorizedResponse,
          [String(HttpStatus.ServiceUnavailable)]: { description: OpenApiResponseDescription.AIServiceNotAvailable },
        },
      },
    },
    [`/api/v1/data-export/{${OpenApiParameterName.UserId}}`]: {
      get: {
        tags: [OpenApiTag.GDPR],
        summary: 'Export user data',
        description: OpenApiDescription.ExportUserData,
        parameters: [userIdParameter],
        responses: {
          ...createJsonResponse(String(HttpStatus.Ok), OpenApiResponseDescription.UserDataExport, {
            type: OpenApiSchemaType.Object,
            properties: {
              [OpenApiParameterName.UserId]: { type: OpenApiSchemaType.String },
              matches: {
                type: OpenApiSchemaType.Array,
                items: { type: OpenApiSchemaType.Object },
              },
              disputes: {
                type: OpenApiSchemaType.Array,
                items: { type: OpenApiSchemaType.Object },
              },
              exported_at: { type: OpenApiSchemaType.String, format: OpenApiSchemaFormat.DateTime },
            },
          }),
          [String(HttpStatus.NotFound)]: { description: OpenApiResponseDescription.UserNotFound },
        },
      },
    },
    [`/api/v1/data/{${OpenApiParameterName.UserId}}`]: {
      delete: {
        tags: [OpenApiTag.GDPR],
        summary: 'Delete user data',
        description: OpenApiDescription.DeleteUserData,
        parameters: [userIdParameter],
        responses: {
          [String(HttpStatus.Ok)]: { description: OpenApiResponseDescription.UserDataDeleted },
          [String(HttpStatus.NoContent)]: { description: OpenApiResponseDescription.UserDataDeletedNoContent },
          ...badRequestResponse,
          [String(HttpStatus.NotFound)]: { description: OpenApiResponseDescription.UserNotFound },
        },
      },
    },
    [`/api/v1/leaderboard/{${OpenApiParameterName.GameType}}`]: {
      get: {
        tags: [OpenApiTag.Leaderboard],
        summary: 'Get leaderboard',
        description: OpenApiDescription.GetLeaderboard,
        parameters: [
          gameTypeParameter,
          seasonIdQueryParameter,
          limitQueryParameter,
        ],
        responses: {
          ...createJsonResponse(String(HttpStatus.Ok), OpenApiResponseDescription.LeaderboardEntries, {
            type: OpenApiSchemaType.Object,
            properties: {
              game_type: { type: OpenApiSchemaType.Integer },
              season_id: { type: OpenApiSchemaType.String },
              entries: {
                type: OpenApiSchemaType.Array,
                items: {
                  type: OpenApiSchemaType.Object,
                  properties: {
                    rank: { type: OpenApiSchemaType.Integer },
                    user_id: { type: OpenApiSchemaType.String },
                    score: { type: OpenApiSchemaType.Integer },
                    wins: { type: OpenApiSchemaType.Integer },
                    games_played: { type: OpenApiSchemaType.Integer },
                    tier: { type: OpenApiSchemaType.String },
                    timestamp: { type: OpenApiSchemaType.String },
                  },
                },
              },
            },
          }),
          [String(HttpStatus.NotImplemented)]: { description: OpenApiResponseDescription.NotImplementedRequiresIndexer },
        },
      },
    },
    [`/api/v1/leaderboard/{${OpenApiParameterName.GameType}}/user/{${OpenApiParameterName.UserId}}`]: {
      get: {
        tags: [OpenApiTag.Leaderboard],
        summary: 'Get user rank',
        description: OpenApiDescription.GetUserRank,
        parameters: [
          gameTypeParameter,
          userIdParameter,
          seasonIdQueryParameter,
        ],
        responses: {
          [String(HttpStatus.Ok)]: { description: OpenApiResponseDescription.UserRankAndStats },
          ...notImplementedResponse,
        },
      },
    },
    [`/api/v1/leaderboard/{${OpenApiParameterName.GameType}}/tier`]: {
      get: {
        tags: [OpenApiTag.Leaderboard],
        summary: 'Filter leaderboard by tier',
        description: OpenApiDescription.FilterLeaderboardByTier,
        parameters: [
          gameTypeParameter,
          tierQueryParameter,
          seasonIdQueryParameter,
        ],
        responses: {
          [String(HttpStatus.Ok)]: { description: OpenApiResponseDescription.FilteredLeaderboardEntries },
          ...notImplementedResponse,
        },
      },
    },
    [`/api/v1/leaderboard/{${OpenApiParameterName.GameType}}/nearby/{${OpenApiParameterName.UserId}}`]: {
      get: {
        tags: [OpenApiTag.Leaderboard],
        summary: 'Get nearby players',
        description: OpenApiDescription.GetNearbyPlayers,
        parameters: [
          gameTypeParameter,
          userIdParameter,
          rangeQueryParameter,
          seasonIdQueryParameter,
        ],
        responses: {
          [String(HttpStatus.Ok)]: { description: OpenApiResponseDescription.NearbyPlayers },
          ...notImplementedResponse,
        },
      },
    },
    [ApiEndpoint.Test.ClearAll]: {
      delete: {
        tags: [OpenApiTag.TestDevelopmentOnly],
        summary: 'Clear all records from R2 bucket (DEVELOPMENT ONLY)',
        description: OpenApiDescription.ClearAllRecords,
        parameters: [confirmQueryParameter],
        responses: {
          ...createJsonResponse(String(HttpStatus.Ok), OpenApiResponseDescription.AllRecordsCleared, {
            type: OpenApiSchemaType.Object,
            properties: {
              success: { type: OpenApiSchemaType.Boolean },
              message: { type: OpenApiSchemaType.String },
              bucket_name: { type: OpenApiSchemaType.String },
              deleted_count: { type: OpenApiSchemaType.Integer },
              error_count: { type: OpenApiSchemaType.Integer },
              cleared_at: { type: OpenApiSchemaType.String, format: OpenApiSchemaFormat.DateTime },
              warning: { type: OpenApiSchemaType.String },
              safety_checks: {
                type: OpenApiSchemaType.Object,
                properties: {
                  environment: { type: OpenApiSchemaType.String },
                  bucket_name: { type: OpenApiSchemaType.String },
                  allowed: { type: OpenApiSchemaType.Boolean },
                },
              },
            },
          }),
          [String(HttpStatus.BadRequest)]: {
            description: OpenApiResponseDescription.ConfirmationRequired,
            content: {
              [HttpContentType.ApplicationJson]: {
                schema: {
                  type: OpenApiSchemaType.Object,
                  properties: {
                    error: { type: OpenApiSchemaType.String },
                    message: { type: OpenApiSchemaType.String },
                  },
                },
              },
            },
          },
          [String(HttpStatus.Forbidden)]: {
            description: OpenApiResponseDescription.ForbiddenNotDevelopment,
            content: {
              [HttpContentType.ApplicationJson]: {
                schema: {
                  type: OpenApiSchemaType.Object,
                  properties: {
                    error: { type: OpenApiSchemaType.String },
                    message: { type: OpenApiSchemaType.String },
                  },
                },
              },
            },
          },
          [String(HttpStatus.InternalServerError)]: {
            description: OpenApiResponseDescription.InternalServerError,
            content: {
              [HttpContentType.ApplicationJson]: {
                schema: {
                  type: OpenApiSchemaType.Object,
                  properties: {
                    error: { type: OpenApiSchemaType.String },
                    message: { type: OpenApiSchemaType.String },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      [OpenApiSecurityScheme.BearerAuth]: {
        type: OpenApiSecuritySchemeType.Http,
        scheme: OpenApiSecurityScheme.SchemeBearer,
        bearerFormat: OpenApiSecurityScheme.BearerFormatJwt,
        description: OpenApiSecurityDescription.FirebaseJwtRequired,
      },
    },
  },
};

export function generateOpenApiJson(): string {
  return JSON.stringify(openApiSpec, null, 2);
}

export function generateSwaggerHtml(baseUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${OpenApiHtmlTitle.Documentation}</title>
  <link rel="stylesheet" type="text/css" href="${OpenApiSwaggerUi.CssUrl}" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${OpenApiSwaggerUi.BundleUrl}"></script>
  <script src="${OpenApiSwaggerUi.StandalonePresetUrl}"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "${baseUrl}${ApiEndpoint.OpenApiJson}",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "${OpenApiSwaggerUi.LayoutStandalone}"
      });
    };
  </script>
</body>
</html>`;
}
