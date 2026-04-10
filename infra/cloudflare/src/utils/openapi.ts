import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare'
import { ValidationPattern } from '@ocentra/endpoint-domain/constants/validation-patterns'
import { IdempotencyKeyPattern } from '@ocentra/endpoint-domain/constants/idempotency'
import {
  HttpContentType,
  HttpHeader,
  HttpStatus,
} from '@ocentra/endpoint-domain/constants/http'
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors'
import { QueryParam } from '@ocentra/endpoint-domain/constants/query'
import { HealthStatus } from '@ocentra/endpoint-domain/constants/health'
import {
  DisputeDescriptionPattern,
  DisputeReasonValues,
} from '@ocentra/endpoint-domain/schemas/disputes'
import {
  MatchBoardStateRequiredFields,
  MatchEventRequiredFields,
  MatchFinalStateRequiredFields,
  MatchMoveRequiredFields,
  MatchPlayerRequiredFields,
  MatchRecordRequiredFields,
  MatchPhaseValues,
} from '@ocentra/endpoint-domain/schemas/matches'
import { DefaultLeaderboardTier } from '@ocentra/endpoint-domain/constants/leaderboard'
import {
  FiatCurrencyValues,
  MatchIdRequiredFields,
  PresenceStatusValues,
  ProfileVisibilityValues,
  RoomTypeValues,
  SecurityPenaltyTypeValues,
  SettingsThemeValues,
} from '@ocentra/endpoint-domain/constants/worker-contract-values'
import {
  GameTypeIdValues,
  PlayerTypeValues,
} from '@ocentra/endpoint-domain/constants/game'
import {
  OpenApiDefaultValue,
  OpenApiExampleValue,
} from '@ocentra/endpoint-domain/constants/openapi-examples'
import { FormField } from '@ocentra/endpoint-domain/constants/form-fields'
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
  OpenApiTier,
  OpenApiHtmlTitle,
  OpenApiMethod,
} from '@/constants/openapi'

type OpenApiParameter = {
  name?: string
  in?: string
  required?: boolean
}

type OpenApiOperation = {
  parameters?: OpenApiParameter[]
}

function createPathParameter(
  name: string,
  description: string,
  options?: { pattern?: string; enum?: string[]; example?: string }
) {
  const example = options?.example
  return {
    name,
    in: OpenApiParameterLocation.Path,
    required: true,
    schema: {
      type: OpenApiSchemaType.String,
      ...(options?.pattern ? { pattern: options.pattern } : {}),
      ...(options?.enum ? { enum: options.enum } : {}),
      ...(example !== undefined ? { example } : {}),
    },
    ...(example !== undefined ? { example } : {}),
    description,
  }
}

function createQueryParameter(
  name: string,
  description: string,
  required: boolean = false,
  schema: {
    type: string
    default?: number | string
    enum?: string[]
    minLength?: number
    minimum?: number
    pattern?: string
    example?: number | string
  } = { type: OpenApiSchemaType.String }
) {
  const example = schema.example
  return {
    name,
    in: OpenApiParameterLocation.Query,
    required,
    schema,
    ...(example !== undefined ? { example } : {}),
    description,
  }
}

function createHeaderParameter(
  name: string,
  description: string,
  required: boolean = false,
  schema: {
    type: string
    default?: number | string
    enum?: string[]
    minLength?: number
    minimum?: number
    pattern?: string
    example?: number | string
  } = { type: OpenApiSchemaType.String }
) {
  const example = schema.example
  return {
    name,
    in: OpenApiParameterLocation.Header,
    required,
    schema,
    ...(example !== undefined ? { example } : {}),
    description,
  }
}

function createJsonResponse(
  status: string,
  description: string,
  schema: Record<string, unknown> = { type: OpenApiSchemaType.Object }
) {
  const example = createSchemaExample(schema as OpenApiSchemaShape)
  return {
    [status]: {
      description,
      content: {
        [HttpContentType.ApplicationJson]: {
          schema,
          ...(example !== undefined ? { example } : {}),
        },
      },
    },
  }
}


function createBearerAuthSecurity() {
  return [{ [OpenApiSecurityScheme.BearerAuth]: [] }]
}

function createJsonRequestBody(
  schema: Record<string, unknown>,
  required: boolean = true
) {
  const example = createSchemaExample(schema as OpenApiSchemaShape)
  return {
    required,
    content: {
      [HttpContentType.ApplicationJson]: {
        schema,
        ...(example !== undefined ? { example } : {}),
      },
    },
  }
}

function createMultipartRequestBody(schema: Record<string, unknown>) {
  const example = createSchemaExample(schema as OpenApiSchemaShape)
  return {
    required: true,
    content: {
      [HttpContentType.MultipartFormData]: {
        schema,
        ...(example !== undefined ? { example } : {}),
      },
    },
  }
}

type OpenApiSchemaShape = Record<string, unknown> & {
  type?: string
  format?: string
  example?: unknown
  default?: unknown
  enum?: unknown[]
  properties?: Record<string, OpenApiSchemaShape>
  items?: OpenApiSchemaShape
  anyOf?: OpenApiSchemaShape[]
  oneOf?: OpenApiSchemaShape[]
  allOf?: OpenApiSchemaShape[]
  required?: string[]
}

function createSchemaExample(schema: OpenApiSchemaShape): unknown {
  if (schema.example !== undefined) {
    return schema.example
  }

  if (schema.default !== undefined) {
    return schema.default
  }

  if (schema.enum?.length) {
    return schema.enum[0]
  }

  if (schema.anyOf?.length) {
    for (const branch of schema.anyOf) {
      const example = createSchemaExample(branch)
      if (example !== undefined) {
        return example
      }
    }
  }

  if (schema.oneOf?.length) {
    for (const branch of schema.oneOf) {
      const example = createSchemaExample(branch)
      if (example !== undefined) {
        return example
      }
    }
  }

  if (schema.allOf?.length) {
    const merged: Record<string, unknown> = {}
    let hasExample = false
    for (const branch of schema.allOf) {
      const example = createSchemaExample(branch)
      if (example && typeof example === 'object' && !Array.isArray(example)) {
        Object.assign(merged, example)
        hasExample = true
      }
    }
    if (hasExample) {
      return merged
    }
  }

  if (schema.type === OpenApiSchemaType.Array) {
    if (schema.items) {
      const itemExample = createSchemaExample(schema.items)
      if (itemExample !== undefined) {
        return [itemExample]
      }
    }
    return []
  }

  if (schema.type === OpenApiSchemaType.Object || schema.properties) {
    const example: Record<string, unknown> = {}
    for (const [key, propertySchema] of Object.entries(
      schema.properties ?? {}
    )) {
      const propertyExample = createSchemaExample(propertySchema)
      if (propertyExample !== undefined) {
        example[key] = propertyExample
      }
    }
    if (Object.keys(example).length > 0) {
      return example
    }
    return {}
  }

  if (schema.type === OpenApiSchemaType.String) {
    if (schema.format === OpenApiSchemaFormat.DateTime) {
      return '2026-04-07T20:30:40Z'
    }
    if (schema.format === OpenApiSchemaFormat.Date) {
      return '2026-04-07'
    }
    return 'example'
  }

  if (
    schema.type === OpenApiSchemaType.Integer ||
    schema.type === OpenApiSchemaType.Number
  ) {
    return 1
  }

  if (schema.type === OpenApiSchemaType.Boolean) {
    return true
  }

  return undefined
}

const matchIdPattern = ValidationPattern.UuidV4.source
const utcDateTimePattern = ValidationPattern.IsoDateTime.source
const userIdPattern = ValidationPattern.UserId.source
const matchIdParameter = createPathParameter(
  OpenApiParameterName.MatchId,
  OpenApiParameterDescription.UniqueMatchIdentifier,
  { pattern: matchIdPattern, example: OpenApiExampleValue.UuidZero }
)
const disputeIdParameter = createPathParameter(
  OpenApiParameterName.DisputeId,
  OpenApiParameterDescription.UniqueMatchIdentifier,
  {
    pattern: ValidationPattern.DisputeId.source,
    example: OpenApiExampleValue.ReportId,
  }
)
const roomIdParameter = createPathParameter(
  OpenApiParameterName.RoomId,
  'Lobby room identifier',
  {
    pattern: matchIdPattern,
    example: OpenApiExampleValue.UuidZero,
  }
)

const reportIdParameter = createPathParameter(
  OpenApiParameterName.ReportId,
  OpenApiParameterDescription.ReportIdentifier,
  {
    pattern: ValidationPattern.UuidV4.source,
    example: OpenApiExampleValue.ReportId,
  }
)
const userIdParameter = createPathParameter(
  OpenApiParameterName.UserId,
  OpenApiParameterDescription.UniqueMatchIdentifier,
  { pattern: ValidationPattern.UserId.source, example: 'schemathesis' }
)
const idempotencyKeyHeaderParameter = createHeaderParameter(
  HttpHeader.IdempotencyKey,
  'Idempotency key',
  true,
  {
    type: OpenApiSchemaType.String,
    pattern: IdempotencyKeyPattern.AllowedCharacters.source,
    minLength: 8,
    example: 'earn-schemathesis-001',
  }
)
const authorizationHeaderExampleParameter = createHeaderParameter(
  HttpHeader.Authorization,
  'Bearer authentication token',
  false,
  {
    type: OpenApiSchemaType.String,
    example: 'Bearer test-token:schemathesis:admin',
  }
)
const gameTypeParameter = createPathParameter(
  OpenApiParameterName.GameType,
  OpenApiParameterDescription.GameTypeDescription,
  { enum: GameTypeIdValues.map(String), example: '1' }
)


const logsQueryPath = ApiEndpoint.Logs.Query
const auditQueryPath = ApiEndpoint.Audit.Query
const inventoryListPath = ApiEndpoint.Inventory.List
const paymentEventsPath = ApiEndpoint.Payment.Events
const paymentReconcilePath = ApiEndpoint.Payment.Reconcile
const securityPenaltyPath = ApiEndpoint.Security.Penalty
const fraudRiskPath = ApiEndpoint.Fraud.Risk(`{${OpenApiParameterName.UserId}}`)
const antiCheatStatusPath = ApiEndpoint.AntiCheat.Status(
  `{${OpenApiParameterName.UserId}}`
)
const profileByUserPath = ApiEndpoint.Profile.ById(
  `{${OpenApiParameterName.UserId}}`
)
const profileUpdatePath = ApiEndpoint.Profile.Update(
  `{${OpenApiParameterName.UserId}}`
)
const messageByConversationPath =
  ApiEndpoint.Message.ByConversation(`{${OpenApiParameterName.ConversationId}}`)
const messageSendPath = ApiEndpoint.Message.Send(
  `{${OpenApiParameterName.ConversationId}}`
)
const notificationListPath = ApiEndpoint.Notification.List
const notificationPushPath = ApiEndpoint.Notification.Push
const rewardDailyPath = ApiEndpoint.Rewards.Daily
const rewardDailyClaimPath = ApiEndpoint.Rewards.DailyClaim
const settingsByUserPath = ApiEndpoint.Settings.ByUser(
  `{${OpenApiParameterName.UserId}}`
)
const settingsUpdatePath = ApiEndpoint.Settings.Update(
  `{${OpenApiParameterName.UserId}}`
)

const tokenQueryParameter = createQueryParameter(
  OpenApiParameterName.Token,
  OpenApiParameterDescription.SignedUrlToken,
  false,
  {
    type: OpenApiSchemaType.String,
  }
)
const expiresQueryParameter = createQueryParameter(
  OpenApiParameterName.Expires,
  OpenApiParameterDescription.ExpirationTimeSeconds,
  false,
  { type: OpenApiSchemaType.Integer, default: 3600, example: 3600 }
)
const seasonIdQueryParameter = createQueryParameter(
  OpenApiParameterName.SeasonId,
  OpenApiParameterDescription.SeasonIdDefault,
  false,
  {
    type: OpenApiSchemaType.String,
    minLength: 1,
    pattern: ValidationPattern.SeasonId.source,
    default: OpenApiDefaultValue.CurrentSeasonId,
    example: OpenApiDefaultValue.CurrentSeasonId,
  }
)

const limitQueryParameter = createQueryParameter(
  OpenApiParameterName.Limit,
  OpenApiParameterDescription.NumberOfEntries,
  false,
  { type: OpenApiSchemaType.Integer, default: 100, minimum: 0 }
)
const tierQueryParameter = createQueryParameter(
  OpenApiParameterName.Tier,
  '',
  true,
  {
    type: OpenApiSchemaType.String,
    enum: Object.values(OpenApiTier),
    default: DefaultLeaderboardTier,
  }
)
const rangeQueryParameter = createQueryParameter(
  OpenApiParameterName.Range,
  OpenApiParameterDescription.NumberOfPlayersAboveBelow,
  false,
  { type: OpenApiSchemaType.Integer, default: 5, minimum: 0 }
)
const confirmQueryParameter = createQueryParameter(
  OpenApiParameterName.Confirm,
  OpenApiParameterDescription.ConfirmDeletion,
  true,
  {
    type: OpenApiSchemaType.String,
    enum: [OpenApiDefaultValue.ConfirmTrue],
    default: OpenApiDefaultValue.ConfirmTrue,
  }
)

const bearerAuthSecurity = createBearerAuthSecurity()

const genericErrorSchema = {
  type: OpenApiSchemaType.Object,
  properties: {
    message: { type: OpenApiSchemaType.String },
    error: { type: OpenApiSchemaType.String },
    issues: {
      type: OpenApiSchemaType.Array,
      items: { type: OpenApiSchemaType.Object },
    },
  },
}

const unauthorizedResponse = createJsonResponse(
  String(HttpStatus.Unauthorized),
  OpenApiResponseDescription.Unauthorized,
  genericErrorSchema
)
const notFoundResponse = createJsonResponse(
  String(HttpStatus.NotFound),
  OpenApiResponseDescription.MatchNotFound,
  genericErrorSchema
)
const badRequestResponse = createJsonResponse(
  String(HttpStatus.BadRequest),
  OpenApiResponseDescription.BadRequest,
  genericErrorSchema
)
const forbiddenResponse = createJsonResponse(
  String(HttpStatus.Forbidden),
  ErrorMessage.Forbidden,
  genericErrorSchema
)
const internalServerErrorResponse = createJsonResponse(
  String(HttpStatus.InternalServerError),
  ErrorMessage.InternalServerError,
  genericErrorSchema
)
const serverErrorResponse = internalServerErrorResponse

function withStandardErrors(responses: Record<string, unknown>) {
  return {
    ...responses,
    ...badRequestResponse,
    ...forbiddenResponse,
    ...notFoundResponse,
    ...serverErrorResponse,
  }
}

function withAuthErrors(responses: Record<string, unknown>) {
  return {
    ...unauthorizedResponse,
    ...responses,
  }
}

function createHealthPaths() {
  return {
    [ApiEndpoint.Health]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Health],
        summary: 'Health check',
        description: OpenApiDescription.HealthCheck,
        responses: withStandardErrors(
          createJsonResponse(
            String(HttpStatus.Ok),
            OpenApiResponseDescription.ServiceHealthy,
            {
              type: OpenApiSchemaType.Object,
              properties: {
                status: {
                  type: OpenApiSchemaType.String,
                  example: HealthStatus.Ok,
                },
              },
            }
          )
        ),
      },
    },
    [ApiEndpoint.Metrics]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Health],
        summary: 'Get metrics',
        description: OpenApiDescription.GetMetrics,
        responses: withStandardErrors(
          createJsonResponse(
            String(HttpStatus.Ok),
            OpenApiResponseDescription.MetricsData,
            {
              type: OpenApiSchemaType.Object,
              properties: {
                metrics: { type: OpenApiSchemaType.Object },
                alerts: {
                  type: OpenApiSchemaType.Array,
                  items: { type: OpenApiSchemaType.Object },
                },
              },
            }
          )
        ),
      },
    },
  }
}

function createMatchPaths() {
  return {
    [ApiEndpoint.Matches.ById(`{${OpenApiParameterName.MatchId}}`)]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Matches],
        summary: 'Get match record',
        description: OpenApiDescription.GetMatchRecord,
        parameters: [matchIdParameter, tokenQueryParameter],
        responses: withStandardErrors({
          ...createJsonResponse(
            String(HttpStatus.Ok),
            OpenApiResponseDescription.MatchRecordFound,
            {
              type: OpenApiSchemaType.Object,
              properties: {
                match_id: {
                  type: OpenApiSchemaType.String,
                  example: OpenApiExampleValue.UuidZero,
                },
                version: {
                  type: OpenApiSchemaType.String,
                  example: OpenApiExampleValue.SemanticVersion,
                },
                players: {
                  type: OpenApiSchemaType.Array,
                  items: { type: OpenApiSchemaType.Object },
                },
              },
            }
          ),
          ...unauthorizedResponse,
          [String(HttpStatus.TooManyRequests)]: {
            description: OpenApiResponseDescription.RateLimitExceeded,
          },
        }),
      },
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Matches],
        summary: 'Upload match record',
        description: OpenApiDescription.UploadMatchRecord,
        parameters: [matchIdParameter],
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          additionalProperties: false,
          required: MatchRecordRequiredFields,
          properties: {
            match_id: {
              type: OpenApiSchemaType.String,
              pattern: matchIdPattern,
              example: OpenApiExampleValue.UuidZero,
            },
            version: {
              type: OpenApiSchemaType.String,
              pattern: ValidationPattern.SemanticVersion.source,
              example: OpenApiExampleValue.SemanticVersion,
            },
            schema_version: {
              type: OpenApiSchemaType.String,
              pattern: ValidationPattern.SemanticVersion.source,
              example: OpenApiExampleValue.SemanticVersion,
            },
            game_type: { type: OpenApiSchemaType.Integer, example: 0 },
            created_at: {
              type: OpenApiSchemaType.String,
              format: OpenApiSchemaFormat.DateTime,
            },
            ended_at: {
              type: OpenApiSchemaType.String,
              format: OpenApiSchemaFormat.DateTime,
            },
            started_at: {
              type: OpenApiSchemaType.String,
              format: OpenApiSchemaFormat.DateTime,
            },
            players: {
              type: OpenApiSchemaType.Array,
              items: {
                type: OpenApiSchemaType.Object,
                additionalProperties: false,
                required: MatchPlayerRequiredFields,
                properties: {
                  player_id: {
                    type: OpenApiSchemaType.String,
                    example: OpenApiExampleValue.PlayerId,
                  },
                  display_name: {
                    type: OpenApiSchemaType.String,
                    example: OpenApiExampleValue.MatchPlayerDisplayName,
                  },
                  rating: { type: OpenApiSchemaType.Number, example: 1200 },
                  wallet_address: {
                    type: OpenApiSchemaType.String,
                    example: OpenApiExampleValue.WalletAddress,
                  },
                  player_type: {
                    type: OpenApiSchemaType.String,
                    enum: PlayerTypeValues,
                  },
                  score: { type: OpenApiSchemaType.Number, example: 100 },
                },
              },
            },
            events: {
              type: OpenApiSchemaType.Array,
              items: {
                type: OpenApiSchemaType.Object,
                additionalProperties: false,
                required: MatchEventRequiredFields,
                properties: {
                  type: { type: OpenApiSchemaType.String, example: OpenApiExampleValue.MatchMove },
                  timestamp: {
                    type: OpenApiSchemaType.String,
                    pattern: utcDateTimePattern,
                  },
                },
              },
            },
            metadata: {
              type: OpenApiSchemaType.Object,
              properties: {
                timestamp: {
                  type: OpenApiSchemaType.String,
                  pattern: utcDateTimePattern,
                },
              },
            },
            moves: {
              type: OpenApiSchemaType.Array,
              items: {
                type: OpenApiSchemaType.Object,
                required: MatchMoveRequiredFields,
                properties: {
                  turn: { type: OpenApiSchemaType.Integer, example: 1 },
                  player_id: {
                    type: OpenApiSchemaType.String,
                    pattern: userIdPattern,
                    example: OpenApiExampleValue.UuidOne,
                  },
                  move: { type: OpenApiSchemaType.String, example: OpenApiExampleValue.MatchMove },
                  timestamp: {
                    type: OpenApiSchemaType.String,
                    pattern: utcDateTimePattern,
                    example: '2026-04-08T00:00:00.000Z',
                  },
                  metadata: {
                    type: OpenApiSchemaType.Object,
                    example: { source: 'schemathesis' },
                  },
                },
                example: {
                  turn: 1,
                  player_id: OpenApiExampleValue.UuidOne,
                  move: OpenApiExampleValue.MatchMove,
                  timestamp: '2026-04-08T00:00:00.000Z',
                  metadata: { source: 'schemathesis' },
                },
              },
            },
            final_state: {
              type: OpenApiSchemaType.Object,
              required: MatchFinalStateRequiredFields,
              properties: {
                phase: {
                  type: OpenApiSchemaType.String,
                  enum: MatchPhaseValues,
                  example: 'completed',
                },
                current_turn: { type: OpenApiSchemaType.Integer, example: 1 },
                current_player: {
                  type: OpenApiSchemaType.String,
                  pattern: userIdPattern,
                  example: OpenApiExampleValue.UuidOne,
                },
                board_state: {
                  type: OpenApiSchemaType.Object,
                  required: MatchBoardStateRequiredFields,
                  properties: {
                    fen: {
                      type: OpenApiSchemaType.String,
                      example: OpenApiExampleValue.MatchBoardFen,
                    },
                  },
                  example: { fen: OpenApiExampleValue.MatchBoardFen },
                },
                winner: {
                  type: OpenApiSchemaType.String,
                  pattern: userIdPattern,
                  example: OpenApiExampleValue.UuidOne,
                },
              },
              example: {
                phase: 'completed',
                current_turn: 1,
                current_player: OpenApiExampleValue.UuidOne,
                board_state: { fen: OpenApiExampleValue.MatchBoardFen },
                winner: OpenApiExampleValue.UuidOne,
              },
            },
          },
        }),
        responses: withStandardErrors({
          ...createJsonResponse(
            String(HttpStatus.Ok),
            OpenApiResponseDescription.MatchRecordUploaded,
            {
              type: OpenApiSchemaType.Object,
              properties: {
                success: { type: OpenApiSchemaType.Boolean, example: true },
                matchId: {
                  type: OpenApiSchemaType.String,
                  example: OpenApiExampleValue.UuidZero,
                },
                url: {
                  type: OpenApiSchemaType.String,
                  example: `https://ocentra.com/matches/${OpenApiExampleValue.UuidZero}`,
                },
              },
            }
          ),
          [String(HttpStatus.Unauthorized)]: {
            description: OpenApiResponseDescription.UnauthorizedAuthRequired,
          },
          [String(HttpStatus.PayloadTooLarge)]: {
            description: OpenApiResponseDescription.MatchRecordTooLarge,
          },
          [String(HttpStatus.TooManyRequests)]: {
            description: OpenApiResponseDescription.RateLimitExceeded,
          },
        }),
      },
      [OpenApiMethod.Put]: {
        tags: [OpenApiTag.Matches],
        summary: 'Upload match record',
        description: OpenApiDescription.UploadMatchRecord,
        parameters: [matchIdParameter],
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: MatchRecordRequiredFields,
          properties: {
            [FormField.MatchId]: {
              type: OpenApiSchemaType.String,
              pattern: matchIdPattern,
              example: OpenApiExampleValue.UuidZero,
            },
            version: {
              type: OpenApiSchemaType.String,
              pattern: ValidationPattern.SemanticVersion.source,
              example: OpenApiExampleValue.SemanticVersion,
            },
            schema_version: {
              type: OpenApiSchemaType.String,
              pattern: ValidationPattern.SemanticVersion.source,
              example: OpenApiExampleValue.SemanticVersion,
            },
            game_type: { type: OpenApiSchemaType.Integer, example: 1 },
            created_at: {
              type: OpenApiSchemaType.String,
              pattern: utcDateTimePattern,
            },
            ended_at: {
              type: OpenApiSchemaType.String,
              pattern: utcDateTimePattern,
            },
            players: {
              type: OpenApiSchemaType.Array,
              example: [
                {
                  player_id: OpenApiExampleValue.UuidOne,
                  display_name: 'Player One',
                  rating: 1200,
                  player_type: PlayerTypeValues[0],
                  score: 100,
                },
              ],
              items: {
                type: OpenApiSchemaType.Object,
                required: MatchPlayerRequiredFields,
                properties: {
                  [FormField.PlayerId]: {
                    type: OpenApiSchemaType.String,
                    pattern: userIdPattern,
                    example: OpenApiExampleValue.UuidOne,
                  },
                  display_name: {
                    type: OpenApiSchemaType.String,
                    example: OpenApiExampleValue.MatchPlayerDisplayName,
                  },
                  rating: { type: OpenApiSchemaType.Number, example: 1200 },
                  wallet_address: {
                    type: OpenApiSchemaType.String,
                    example: '675S9ZqD3QndK4Yh7o2zT6qT6qT6qT6qT6qT6qT6qT6q',
                  },
                  player_type: {
                    type: OpenApiSchemaType.String,
                    enum: PlayerTypeValues,
                    example: PlayerTypeValues[0],
                  },
                  score: { type: OpenApiSchemaType.Number, example: 100 },
                },
                example: {
                  player_id: OpenApiExampleValue.UuidOne,
                  display_name: OpenApiExampleValue.MatchPlayerDisplayName,
                  rating: 1200,
                  wallet_address: OpenApiExampleValue.WalletAddress,
                  player_type: PlayerTypeValues[0],
                  score: 100,
                },
              },
            },
            events: {
              type: OpenApiSchemaType.Array,
              example: [
                {
                  type: OpenApiExampleValue.MatchEventType,
                  timestamp: '2026-04-08T00:00:00.000Z',
                },
              ],
              items: {
                type: OpenApiSchemaType.Object,
                required: MatchEventRequiredFields,
                properties: {
                  type: {
                    type: OpenApiSchemaType.String,
                    example: OpenApiExampleValue.MatchEventType,
                  },
                  timestamp: {
                    type: OpenApiSchemaType.String,
                    pattern: utcDateTimePattern,
                    example: '2026-04-08T00:00:00.000Z',
                  },
                },
                example: {
                  type: OpenApiExampleValue.MatchEventType,
                  timestamp: '2026-04-08T00:00:00.000Z',
                },
              },
            },
            metadata: { type: OpenApiSchemaType.Object },
            moves: {
              type: OpenApiSchemaType.Array,
              example: [
                {
                  turn: 1,
                  player_id: OpenApiExampleValue.UuidOne,
                  move: OpenApiExampleValue.MatchMove,
                  timestamp: '2026-04-08T00:00:00.000Z',
                  metadata: { source: 'schemathesis' },
                },
              ],
              items: {
                type: OpenApiSchemaType.Object,
                required: MatchMoveRequiredFields,
                properties: {
                  turn: { type: OpenApiSchemaType.Integer, example: 1 },
                  [FormField.PlayerId]: {
                    type: OpenApiSchemaType.String,
                    pattern: userIdPattern,
                    example: OpenApiExampleValue.UuidOne,
                  },
                  move: { type: OpenApiSchemaType.String, example: OpenApiExampleValue.MatchMove },
                  timestamp: {
                    type: OpenApiSchemaType.String,
                    pattern: utcDateTimePattern,
                    example: '2026-04-08T00:00:00.000Z',
                  },
                  metadata: {
                    type: OpenApiSchemaType.Object,
                    example: { source: 'schemathesis' },
                  },
                },
                example: {
                  turn: 1,
                  player_id: OpenApiExampleValue.UuidOne,
                  move: OpenApiExampleValue.MatchMove,
                  timestamp: '2026-04-08T00:00:00.000Z',
                  metadata: { source: 'schemathesis' },
                },
              },
            },
            final_state: {
              type: OpenApiSchemaType.Object,
              required: MatchFinalStateRequiredFields,
              properties: {
                phase: {
                  type: OpenApiSchemaType.String,
                  enum: MatchPhaseValues,
                  example: 'completed',
                },
                current_turn: { type: OpenApiSchemaType.Integer, example: 1 },
                current_player: {
                  type: OpenApiSchemaType.String,
                  pattern: userIdPattern,
                  example: OpenApiExampleValue.UuidOne,
                },
                board_state: {
                  type: OpenApiSchemaType.Object,
                  required: MatchBoardStateRequiredFields,
                  properties: {
                    fen: {
                      type: OpenApiSchemaType.String,
                      example: OpenApiExampleValue.MatchBoardFen,
                    },
                  },
                  example: { fen: OpenApiExampleValue.MatchBoardFen },
                },
                winner: {
                  type: OpenApiSchemaType.String,
                  pattern: userIdPattern,
                  example: OpenApiExampleValue.UuidOne,
                },
              },
              example: {
                phase: 'completed',
                current_turn: 1,
                current_player: OpenApiExampleValue.UuidOne,
                board_state: { fen: 'startpos' },
                winner: OpenApiExampleValue.UuidOne,
              },
            },
            started_at: {
              type: OpenApiSchemaType.String,
              format: OpenApiSchemaFormat.DateTime,
              minLength: 1,
              example: '2026-04-08T00:00:00.000Z',
            },
          },
        }),
        security: bearerAuthSecurity,
        responses: withStandardErrors({
          ...createJsonResponse(
            String(HttpStatus.Ok),
            OpenApiResponseDescription.MatchRecordUploaded,
            {
              type: OpenApiSchemaType.Object,
              properties: {
                success: { type: OpenApiSchemaType.Boolean, example: true },
                matchId: {
                  type: OpenApiSchemaType.String,
                  example: OpenApiExampleValue.UuidZero,
                },
                url: {
                  type: OpenApiSchemaType.String,
                  example:
                    'https://ocentra.com/matches/00000000-0000-4000-8000-000000000000',
                },
              },
            }
          ),
          [String(HttpStatus.Unauthorized)]: {
            description: OpenApiResponseDescription.UnauthorizedAuthRequired,
          },
          [String(HttpStatus.PayloadTooLarge)]: {
            description: OpenApiResponseDescription.MatchRecordTooLarge,
          },
          [String(HttpStatus.TooManyRequests)]: {
            description: OpenApiResponseDescription.RateLimitExceeded,
          },
        }),
      },
      [OpenApiMethod.Delete]: {
        tags: [OpenApiTag.Matches],
        summary: 'Delete match record',
        description: OpenApiDescription.DeleteMatchRecord,
        parameters: [matchIdParameter],
        security: bearerAuthSecurity,
        responses: withStandardErrors({
          ...createJsonResponse(
            String(HttpStatus.Ok),
            OpenApiResponseDescription.MatchRecordDeleted,
            {
              type: OpenApiSchemaType.Object,
              properties: {
                success: { type: OpenApiSchemaType.Boolean, example: true },
                matchId: {
                  type: OpenApiSchemaType.String,
                  example: OpenApiExampleValue.UuidZero,
                },
              },
              example: {
                success: true,
                matchId: OpenApiExampleValue.UuidZero,
              },
            }
          ),
          ...unauthorizedResponse,
          [String(HttpStatus.TooManyRequests)]: {
            description: OpenApiResponseDescription.RateLimitExceeded,
          },
        }),
      },
    },
    [ApiEndpoint.Matches.Anonymize(`{${OpenApiParameterName.MatchId}}`)]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.GDPR],
        summary: 'Anonymize match record',
        description: OpenApiDescription.AnonymizeMatchRecord,
        parameters: [matchIdParameter],
        security: bearerAuthSecurity,
        responses: withStandardErrors({
          ...createJsonResponse(
            String(HttpStatus.Ok),
            OpenApiResponseDescription.MatchAnonymized,
            {
              type: OpenApiSchemaType.Object,
              properties: {
                success: { type: OpenApiSchemaType.Boolean, example: true },
                [FormField.MatchId]: {
                  type: OpenApiSchemaType.String,
                  example: OpenApiExampleValue.UuidZero,
                },
                anonymized_at: {
                  type: OpenApiSchemaType.String,
                  format: OpenApiSchemaFormat.DateTime,
                },
                anonymized_url: { type: OpenApiSchemaType.String },
              },
              example: {
                success: true,
                match_id: OpenApiExampleValue.UuidZero,
                anonymized_at: '2026-04-08T00:00:00.000Z',
                anonymized_url:
                  '/assets/matches/anonymized/00000000-0000-4000-8000-000000000000.json',
              },
            }
          ),
          ...unauthorizedResponse,
        }),
      },
    },
    [ApiEndpoint.Transparency.ByMatchId(`{${OpenApiParameterName.MatchId}}`)]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Transparency],
        summary: 'Get match transparency',
        description: 'Retrieves transparency data for a match',
        parameters: [matchIdParameter],
        responses: withStandardErrors(
          createJsonResponse(String(HttpStatus.Ok), 'Transparency data', {
            type: OpenApiSchemaType.Object,
            properties: {
              matchId: {
                type: OpenApiSchemaType.String,
                example: OpenApiExampleValue.UuidZero,
              },
              solanaMatchPda: {
                type: OpenApiSchemaType.String,
                example: OpenApiExampleValue.Pda,
              },
              transactionSignatures: {
                type: OpenApiSchemaType.Array,
                items: { type: OpenApiSchemaType.String },
                example: [OpenApiExampleValue.Signature],
              },
              initialStateHash: {
                type: OpenApiSchemaType.String,
                example: OpenApiExampleValue.InitialHash,
              },
              finalStateHash: {
                type: OpenApiSchemaType.String,
                example: OpenApiExampleValue.FinalHash,
              },
              stateTransitions: {
                type: OpenApiSchemaType.Array,
                items: { type: OpenApiSchemaType.Object },
                example: [OpenApiExampleValue.TransitionFromPending],
              },
              moves: {
                type: OpenApiSchemaType.Array,
                items: { type: OpenApiSchemaType.Object },
                example: [OpenApiExampleValue.PlayerMove],
              },
              randomnessSource: {
                type: OpenApiSchemaType.String,
                example: OpenApiExampleValue.VrfSource,
              },
              randomnessCommitments: {
                type: OpenApiSchemaType.Array,
                items: { type: OpenApiSchemaType.Object },
                example: [OpenApiExampleValue.Commitment],
              },
              aiPlayers: {
                type: OpenApiSchemaType.Array,
                items: { type: OpenApiSchemaType.Object },
                example: [OpenApiExampleValue.AiPlayer],
              },
              disputes: {
                type: OpenApiSchemaType.Array,
                items: { type: OpenApiSchemaType.Object },
                example: [OpenApiExampleValue.DisputeSummary],
              },
              replayAvailable: {
                type: OpenApiSchemaType.Boolean,
                example: true,
              },
              replayLocation: {
                type: OpenApiSchemaType.String,
                example: ApiEndpoint.Replay.ByMatchId(OpenApiExampleValue.UuidZero),
              },
            },
            example: {
              matchId: OpenApiExampleValue.UuidZero,
              solanaMatchPda: OpenApiExampleValue.Pda,
              transactionSignatures: [OpenApiExampleValue.Signature],
              initialStateHash: OpenApiExampleValue.InitialHash,
              finalStateHash: OpenApiExampleValue.FinalHash,
              stateTransitions: [OpenApiExampleValue.TransitionFromPending],
              moves: [OpenApiExampleValue.PlayerMove],
              randomnessSource: OpenApiExampleValue.VrfSource,
              randomnessCommitments: [OpenApiExampleValue.Commitment],
              aiPlayers: [OpenApiExampleValue.AiPlayer],
              disputes: [OpenApiExampleValue.DisputeSummary],
              replayAvailable: true,
              replayLocation: ApiEndpoint.Replay.ByMatchId(OpenApiExampleValue.UuidZero),
            },
          })
        ),
      },
    },
  }
}

function createSignedUrlPaths() {
  return {
    [ApiEndpoint.SignedUrl.ByMatchId(`{${OpenApiParameterName.MatchId}}`)]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.SignedUrls],
        summary: 'Generate signed URL',
        description: OpenApiDescription.GenerateSignedUrl,
        parameters: [matchIdParameter, expiresQueryParameter],
        responses: withStandardErrors({
          ...createJsonResponse(
            String(HttpStatus.Ok),
            OpenApiResponseDescription.SignedUrlGenerated,
            {
              type: OpenApiSchemaType.Object,
              properties: {
                matchId: {
                  type: OpenApiSchemaType.String,
                  example: OpenApiExampleValue.UuidZero,
                },
                signedUrl: {
                  type: OpenApiSchemaType.String,
                  example: OpenApiExampleValue.SignedUrl,
                },
                expiresIn: { type: OpenApiSchemaType.Integer, example: 3600 },
                expiresAt: {
                  type: OpenApiSchemaType.String,
                  format: OpenApiSchemaFormat.DateTime,
                },
              },
            }
          ),
          ...unauthorizedResponse,
          [String(HttpStatus.Forbidden)]: { description: 'Forbidden' },
          [String(HttpStatus.InternalServerError)]: {
            description: OpenApiResponseDescription.SignedUrlSecretNotConfigured,
          },
        }),
      },
    },
  }
}

function createDisputePaths() {
  return {
    [ApiEndpoint.Disputes.Base]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Disputes],
        summary: 'Create dispute',
        description: OpenApiDescription.CreateDispute,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: [
            FormField.MatchId,
            FormField.Reason,
            FormField.Description,
          ],
          additionalProperties: false,
          properties: {
            [FormField.MatchId]: {
              type: OpenApiSchemaType.String,
              minLength: 1,
              pattern: matchIdPattern,
              example: OpenApiExampleValue.UuidZero,
            },
            [FormField.Reason]: {
              type: OpenApiSchemaType.String,
              enum: [...DisputeReasonValues],
              example: 'cheating',
            },
            reason_hash: { type: OpenApiSchemaType.String },
            created_by: { type: OpenApiSchemaType.String, example: OpenApiExampleValue.PlayerId },
            [FormField.Description]: {
              type: OpenApiSchemaType.String,
              minLength: 5,
              pattern: DisputeDescriptionPattern,
              example: OpenApiExampleValue.SpeedHackDescription,
            },
            timestamp: {
              type: OpenApiSchemaType.String,
              format: OpenApiSchemaFormat.DateTime,
              pattern: utcDateTimePattern,
              minLength: 1,
              example: '2026-04-08T00:00:00.000Z',
            },
            dispute_id: {
              type: OpenApiSchemaType.String,
              minLength: 1,
              pattern: ValidationPattern.DisputeId.source,
              example: OpenApiExampleValue.ReportId,
            },
          },
        }),
        security: bearerAuthSecurity,
        responses: withStandardErrors({
          ...createJsonResponse(
            String(HttpStatus.Ok),
            OpenApiResponseDescription.DisputeCreated,
            {
              type: OpenApiSchemaType.Object,
              properties: {
                success: { type: OpenApiSchemaType.Boolean, example: true },
                disputeId: {
                  type: OpenApiSchemaType.String,
                  example: OpenApiExampleValue.ReportId,
                },
                dispute: { type: OpenApiSchemaType.Object },
              },
            }
          ),
          ...unauthorizedResponse,
        }),
      },
    },
    [ApiEndpoint.Disputes.ById(`{${OpenApiParameterName.DisputeId}}`)]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Disputes],
        summary: 'Get dispute',
        description: OpenApiDescription.GetDispute,
        parameters: [disputeIdParameter],
        responses: withStandardErrors({
          ...createJsonResponse(
            String(HttpStatus.Ok),
            OpenApiResponseDescription.DisputeFound,
            {
              type: OpenApiSchemaType.Object,
              properties: {
                dispute_id: {
                  type: OpenApiSchemaType.String,
                  example: OpenApiExampleValue.ReportId,
                },
                match_id: {
                  type: OpenApiSchemaType.String,
                  example: OpenApiExampleValue.UuidZero,
                },
                reason: {
                  type: OpenApiSchemaType.String,
                  example: OpenApiExampleValue.CheatingDetected,
                },
                description: {
                  type: OpenApiSchemaType.String,
                  example: OpenApiExampleValue.SpeedHackDescription,
                },
                status: { type: OpenApiSchemaType.String, example: OpenApiExampleValue.PendingStatus },
                created_at: {
                  type: OpenApiSchemaType.String,
                  format: OpenApiSchemaFormat.DateTime,
                  example: '2026-04-08T00:00:00.000Z',
                },
                user_id: {
                  type: OpenApiSchemaType.String,
                  example: OpenApiExampleValue.UserId,
                },
              },
              example: {
                dispute_id: OpenApiExampleValue.ReportId,
                match_id: OpenApiExampleValue.UuidZero,
                reason: OpenApiExampleValue.CheatingDetected,
                description: OpenApiExampleValue.SpeedHackDescription,
                status: OpenApiExampleValue.PendingStatus,
                created_at: '2026-04-08T00:00:00.000Z',
                user_id: OpenApiExampleValue.UserId,
              },
            }
          ),
          ...unauthorizedResponse,
          [String(HttpStatus.NotFound)]: {
            description: OpenApiResponseDescription.DisputeFound.replace(
              'found',
              'not found'
            ),
          },
        }),
      },
      [OpenApiMethod.Put]: {
        tags: [OpenApiTag.Disputes],
        summary: 'Update dispute',
        description: OpenApiDescription.UpdateDispute,
        parameters: [disputeIdParameter],
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: [
            FormField.MatchId,
            FormField.Reason,
            FormField.Description,
          ],
          additionalProperties: false,
          properties: {
            [FormField.MatchId]: {
              type: OpenApiSchemaType.String,
              minLength: 1,
              pattern: matchIdPattern,
              example: OpenApiExampleValue.UuidZero,
            },
            [FormField.Reason]: {
              type: OpenApiSchemaType.String,
              enum: [...DisputeReasonValues],
              example: 'bug',
            },
            [FormField.Description]: {
              type: OpenApiSchemaType.String,
              minLength: 5,
              pattern: DisputeDescriptionPattern,
              example: 'More details added',
            },
          },
          example: {
            match_id: OpenApiExampleValue.UuidZero,
            reason: 'bug',
            description: 'More details added',
          },
        }),
        security: bearerAuthSecurity,
        responses: withStandardErrors({
          ...createJsonResponse(
            String(HttpStatus.Ok),
            OpenApiResponseDescription.DisputeCreated,
            {
              type: OpenApiSchemaType.Object,
              properties: {
                success: { type: OpenApiSchemaType.Boolean, example: true },
                disputeId: {
                  type: OpenApiSchemaType.String,
                  example: OpenApiExampleValue.ReportId,
                },
              },
            }
          ),
          ...unauthorizedResponse,
        }),
      },
    },
    [ApiEndpoint.Disputes.Evidence(`{${OpenApiParameterName.DisputeId}}`)]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Disputes],
        summary: 'Upload dispute evidence',
        description: OpenApiDescription.UploadDisputeEvidence,
        parameters: [disputeIdParameter],
        requestBody: createMultipartRequestBody({
          type: OpenApiSchemaType.Object,
          required: ['evidence'],
          additionalProperties: false,
          properties: {
            evidence: {
              type: OpenApiSchemaType.String,
              format: OpenApiSchemaFormat.Binary,
              description: OpenApiParameterDescription.EvidenceFileMaxSize,
            },
            [FormField.MatchId]: {
              type: OpenApiSchemaType.String,
              minLength: 1,
              pattern: matchIdPattern,
              example: OpenApiExampleValue.UuidZero,
            },
            [FormField.Reason]: {
              type: OpenApiSchemaType.String,
              pattern: ValidationPattern.PrintableAscii.source,
              example: 'Evidence for cheating',
            },
            [FormField.Description]: {
              type: OpenApiSchemaType.String,
              pattern: ValidationPattern.PrintableAscii.source,
              example: 'Round 3 replay data',
            },
          },
        }),
        security: bearerAuthSecurity,
        responses: {
          ...createJsonResponse(
            String(HttpStatus.Ok),
            OpenApiResponseDescription.EvidenceUploaded,
            {
              type: OpenApiSchemaType.Object,
              properties: {
                success: { type: OpenApiSchemaType.Boolean, example: true },
                dispute_id: {
                  type: OpenApiSchemaType.String,
                  minLength: 1,
                  pattern: ValidationPattern.DisputeId.source,
                  example: OpenApiExampleValue.ReportId,
                },
                evidence_package_hash: {
                  type: OpenApiSchemaType.String,
                  example: 'abc123hash',
                },
                evidence_files: {
                  type: OpenApiSchemaType.Integer,
                  example: 1,
                },
              },
            }
          ),
          [String(HttpStatus.BadRequest)]: {
            description: OpenApiResponseDescription.FileTooLargeOrInvalid,
          },
          ...unauthorizedResponse,
        },
      },
    },
  }
}

function createArchivePaths() {
  return {
    [ApiEndpoint.Archive.ByMatchId(`{${OpenApiParameterName.MatchId}}`)]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Archive],
        summary: 'Get archived match',
        description: 'Retrieves archived match data',
        parameters: [matchIdParameter],
        responses: withStandardErrors(
          createJsonResponse(
            String(HttpStatus.Ok),
            'Archived URL found',
            {
              type: OpenApiSchemaType.Object,
              properties: {
                archived_url: { type: OpenApiSchemaType.String },
                match_id: { type: OpenApiSchemaType.String },
              },
            }
          )
        ),
      },
    },
  }
}

function createAiPaths() {
  return {
    [ApiEndpoint.AI.Base]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.AI],
        summary: 'Get AI player config',
        description: 'Returns AI player configuration parameters',
        responses: withStandardErrors(
          createJsonResponse(String(HttpStatus.Ok), 'AI Config', {
            type: OpenApiSchemaType.Object,
          })
        ),
      },
    },
    [ApiEndpoint.AI.Generate]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.AI],
        summary: 'Generate AI move',
        description: 'Generates a move for an AI player based on current match state',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: ['match_id', 'game_type'],
          properties: {
            match_id: { type: OpenApiSchemaType.String },
            game_type: { type: OpenApiSchemaType.Integer },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'AI Move', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createGdprPaths() {
  return {
    [ApiEndpoint.DataExport.ByUserId(`{${OpenApiParameterName.UserId}}`)]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.GDPR],
        summary: 'Export user data',
        description: OpenApiDescription.ExportUserData,
        security: bearerAuthSecurity,
        parameters: [
          createPathParameter(OpenApiParameterName.UserId, 'User ID', {
            pattern: userIdPattern,
          }),
        ],
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Export initiated', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Data.ByUserId(`{${OpenApiParameterName.UserId}}`)]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.GDPR],
        summary: 'Delete user data',
        description: OpenApiDescription.DeleteUserData,
        security: bearerAuthSecurity,
        parameters: [
          createPathParameter(OpenApiParameterName.UserId, 'User ID', {
            pattern: userIdPattern,
          }),
          confirmQueryParameter,
        ],
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Account deleted', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createLeaderboardPaths() {
  return {
    [ApiEndpoint.Leaderboard.ByGameType(`{${OpenApiParameterName.GameType}}`)]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Leaderboard],
        summary: 'Get leaderboard',
        description: OpenApiDescription.GetLeaderboard,
        parameters: [
          gameTypeParameter,
          limitQueryParameter,
          seasonIdQueryParameter,
        ],
        responses: withStandardErrors(
          createJsonResponse(String(HttpStatus.Ok), 'Leaderboard data', {
            type: OpenApiSchemaType.Object,
          })
        ),
      },
    },
    [ApiEndpoint.Leaderboard.User(
      `{${OpenApiParameterName.GameType}}`,
      `{${OpenApiParameterName.UserId}}`
    )]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Leaderboard],
        summary: 'Get user rank',
        description: OpenApiDescription.GetUserRank,
        parameters: [gameTypeParameter, userIdParameter, seasonIdQueryParameter],
        responses: withStandardErrors(
          createJsonResponse(String(HttpStatus.Ok), 'User rank data', {
            type: OpenApiSchemaType.Object,
          })
        ),
      },
    },
    [ApiEndpoint.Leaderboard.Tier(`{${OpenApiParameterName.GameType}}`)]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Leaderboard],
        summary: 'Filter leaderboard by tier',
        description: OpenApiDescription.FilterLeaderboardByTier,
        parameters: [
          gameTypeParameter,
          tierQueryParameter,
          seasonIdQueryParameter,
        ],
        responses: withStandardErrors(
          createJsonResponse(
            String(HttpStatus.Ok),
            OpenApiResponseDescription.FilteredLeaderboardEntries,
            {
              type: OpenApiSchemaType.Object,
            }
          )
        ),
      },
    },
    [ApiEndpoint.Leaderboard.Nearby(
      `{${OpenApiParameterName.GameType}}`,
      `{${OpenApiParameterName.UserId}}`
    )]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Leaderboard],
        summary: 'Get nearby players',
        description: OpenApiDescription.GetNearbyPlayers,
        parameters: [
          gameTypeParameter,
          userIdParameter,
          rangeQueryParameter,
          seasonIdQueryParameter,
        ],
        responses: withStandardErrors(
          createJsonResponse(String(HttpStatus.Ok), 'Nearby players', {
            type: OpenApiSchemaType.Object,
          })
        ),
      },
    },
  }
}

function createPlayerPaths() {
  return {
    [ApiEndpoint.Players.ById(`{${OpenApiParameterName.UserId}}`)]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Players],
        summary: 'Get player data',
        description: 'Retrieves player stats, learning data, or report',
        security: bearerAuthSecurity,
        parameters: [userIdParameter],
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Player data', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createCreditPaths() {
  return {
    [ApiEndpoint.Credits.Balance(`{${OpenApiParameterName.UserId}}`)]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Credits],
        summary: 'Get credit balance',
        description: 'Retrieves credit balance for a user',
        security: bearerAuthSecurity,
        parameters: [userIdParameter],
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Credit balance', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Credits.Earn(`{${OpenApiParameterName.UserId}}`)]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Credits],
        summary: 'Earn GP credits',
        description: 'Awards GP credits to the authenticated user',
        security: bearerAuthSecurity,
        parameters: [userIdParameter, idempotencyKeyHeaderParameter],
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: ['gp_amount', 'description'],
          properties: {
            gp_amount: { type: OpenApiSchemaType.Integer, minimum: 1 },
            description: { type: OpenApiSchemaType.String, minLength: 1 },
            game_type: { type: OpenApiSchemaType.Integer, minimum: 0 },
            metadata: { type: OpenApiSchemaType.Object },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Credit transaction', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Credits.Purchase(`{${OpenApiParameterName.UserId}}`)]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Credits],
        summary: 'Purchase AC credits',
        description: 'Initiates or processes a purchase of AC credits',
        security: bearerAuthSecurity,
        parameters: [userIdParameter, idempotencyKeyHeaderParameter],
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: ['amount', 'currency', 'ac_amount'],
          properties: {
            amount: { type: OpenApiSchemaType.Number, minimum: 0 },
            currency: {
              type: OpenApiSchemaType.String,
              enum: FiatCurrencyValues,
            },
            payment_method: { type: OpenApiSchemaType.String },
            ac_amount: { type: OpenApiSchemaType.Integer, minimum: 1 },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Purchase result', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Credits.Consume(`{${OpenApiParameterName.UserId}}`)]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Credits],
        summary: 'Consume AC credits',
        description:
          'Deducts AC credits from user balance for a purchase or service',
        security: bearerAuthSecurity,
        parameters: [userIdParameter, idempotencyKeyHeaderParameter],
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: ['ac_amount'],
          properties: {
            ac_amount: { type: OpenApiSchemaType.Integer, minimum: 1 },
            description: { type: OpenApiSchemaType.String },
            metadata: { type: OpenApiSchemaType.Object },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Consumption result', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Credits.ConsumeGP(`{${OpenApiParameterName.UserId}}`)]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Credits],
        summary: 'Consume GP/AC credits (Generic)',
        description: 'Generic endpoint to consume either GP or AC credits',
        security: bearerAuthSecurity,
        parameters: [userIdParameter, idempotencyKeyHeaderParameter],
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: ['amount', 'description'],
          properties: {
            amount: { type: OpenApiSchemaType.Integer, minimum: 1 },
            currency: { type: OpenApiSchemaType.String },
            description: { type: OpenApiSchemaType.String, minLength: 1 },
            metadata: { type: OpenApiSchemaType.Object },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(
              String(HttpStatus.Ok),
              'Generic consumption result',
              {
                type: OpenApiSchemaType.Object,
              }
            )
          )
        ),
      },
    },
    [ApiEndpoint.Credits.Transactions(`{${OpenApiParameterName.UserId}}`)]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Credits],
        summary: 'Get transaction history',
        description: 'Retrieves the list of recent credit transactions for a user',
        security: bearerAuthSecurity,
        parameters: [userIdParameter, limitQueryParameter],
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Transaction list', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Credits.Redeem]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Credits],
        summary: 'Redeem promo code',
        description: 'Redeems a promotional code for AC or GP credits',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: ['code'],
          properties: {
            code: { type: OpenApiSchemaType.String, minLength: 1 },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Redeem result', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createBadgePaths() {
  return {
    [ApiEndpoint.Badges.Claim(`{${OpenApiParameterName.UserId}}`)]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Badges],
        summary: 'Claim a badge',
        description: 'Unlocks a badge for the authenticated user',
        parameters: [userIdParameter],
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Badge action result', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createLogPaths() {
  return {
    [logsQueryPath]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Logs],
        summary: 'Query logs',
        description: 'Query and retrieve system logs',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Log entries', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Logs],
        summary: 'Store logs',
        description: 'Store a single log entry or a batch of log entries',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Stored logs', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Logs.Query]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Logs],
        summary: 'Query logs',
        description: 'Query and retrieve system logs',
        security: bearerAuthSecurity,
        parameters: [
          createQueryParameter(QueryParam.Level, 'Log level', false, {
            type: OpenApiSchemaType.String,
          }),
          createQueryParameter(QueryParam.Source, 'Log source', false, {
            type: OpenApiSchemaType.String,
          }),
          createQueryParameter(QueryParam.Context, 'Log context', false, {
            type: OpenApiSchemaType.String,
          }),
          createQueryParameter(QueryParam.Since, 'Start time window', false, {
            type: OpenApiSchemaType.String,
          }),
          createQueryParameter(
            QueryParam.Limit,
            'Maximum number of log rows',
            false,
            { type: OpenApiSchemaType.Integer }
          ),
        ],
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Log entries', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createAssetPaths() {
  return {
    [ApiEndpoint.Assets.Base]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Assets],
        summary: 'List assets',
        description: 'List and query game assets',
        parameters: [
          createQueryParameter(
            QueryParam.Hash,
            'Asset hash. Exactly one of guid, hash, or checksum is required.',
            true,
            {
              type: OpenApiSchemaType.String,
            }
          ),
          createQueryParameter(
            QueryParam.Guid,
            'Asset GUID. Exactly one of guid, hash, or checksum is required.',
            false,
            {
              type: OpenApiSchemaType.String,
            }
          ),
          createQueryParameter(
            QueryParam.Checksum,
            'Asset checksum. Exactly one of guid, hash, or checksum is required.',
            false,
            {
              type: OpenApiSchemaType.String,
            }
          ),
        ],
        responses: withStandardErrors({
          [String(HttpStatus.Ok)]: {
            description: 'Asset content',
            content: {
              [HttpContentType.ApplicationJson]: {
                schema: {
                  type: OpenApiSchemaType.Object,
                },
              },
              'image/png': {
                schema: {
                  type: OpenApiSchemaType.String,
                  format: 'binary',
                },
              },
            },
          },
        }),
      },
    },
  }
}

function createSyncPaths() {
  return {
    [ApiEndpoint.Sync.Health]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Sync],
        summary: 'Sync health',
        description: 'Check Solana sync health status',
        responses: withStandardErrors(
          createJsonResponse(String(HttpStatus.Ok), 'Sync health status', {
            type: OpenApiSchemaType.Object,
          })
        ),
      },
    },
    [ApiEndpoint.Sync.FromSolana]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Sync],
        summary: 'Sync from Solana',
        description: 'Sync data from Solana blockchain',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: MatchIdRequiredFields,
          properties: {
            matchId: { type: OpenApiSchemaType.String, pattern: matchIdPattern },
            solanaMatchPda: { type: OpenApiSchemaType.String, minLength: 1 },
            state: { type: OpenApiSchemaType.Object },
            slot: { type: OpenApiSchemaType.Integer, minimum: 0 },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Sync result', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Sync.Reconcile]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Sync],
        summary: 'Reconcile state',
        description: 'Ensures state consistency between R2, DO, and Solana',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: MatchIdRequiredFields,
          properties: {
            matchId: { type: OpenApiSchemaType.String, pattern: matchIdPattern },
            repair: { type: OpenApiSchemaType.Boolean },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Reconcile result', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createReplayPaths() {
  return {
    [ApiEndpoint.Replay.ByMatchId(`{${OpenApiParameterName.MatchId}}`)]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Replay],
        summary: 'Get replay',
        description: 'Retrieve match replay data',
        parameters: [matchIdParameter],
        responses: withStandardErrors(
          createJsonResponse(String(HttpStatus.Ok), 'Replay data', {
            type: OpenApiSchemaType.Object,
          })
        ),
      },
    },
    [ApiEndpoint.Replay.Verify(`{${OpenApiParameterName.MatchId}}`)]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Replay],
        summary: 'Verify replay',
        description: 'Verify match replay data',
        parameters: [matchIdParameter],
        responses: withStandardErrors(
          createJsonResponse(
            String(HttpStatus.Ok),
            'Replay verification result',
            {
              type: OpenApiSchemaType.Object,
            }
          )
        ),
      },
    },
  }
}

const paymentIdQueryParameter = {
  in: 'query',
  name: 'paymentId',
  required: false,
  description: 'Payment ID filter',
  schema: { type: OpenApiSchemaType.String },
}

function createPaymentPaths() {
  return {
    [paymentEventsPath]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Payment],
        summary: 'Get payment events',
        description: 'Retrieves payment event history',
        security: bearerAuthSecurity,
        parameters: [paymentIdQueryParameter],
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Payment data', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [paymentReconcilePath]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Payment],
        summary: 'Reconcile payments',
        description: 'Runs payment reconciliation',
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
        }),
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Payment reconciled', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createLobbyPaths() {
  return {
    [ApiEndpoint.Rooms.Base]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Lobby],
        summary: 'List lobby rooms',
        description: 'Lists available lobby rooms or gets room details',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Room listing', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Lobby],
        summary: 'Create lobby room',
        description: 'Creates a lobby room for the authenticated user',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          properties: {
            roomId: { type: OpenApiSchemaType.String, pattern: matchIdPattern },
            hostId: { type: OpenApiSchemaType.String, pattern: userIdPattern },
            hostDisplayName: { type: OpenApiSchemaType.String, minLength: 1 },
            roomType: {
              type: OpenApiSchemaType.String,
              enum: RoomTypeValues,
            },
            maxPlayers: {
              type: OpenApiSchemaType.Integer,
              minimum: 1,
              maximum: 13,
            },
            gameType: { type: OpenApiSchemaType.String, minLength: 1 },
            isPrivate: { type: OpenApiSchemaType.Boolean },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Room created', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Rooms.Join(`{${OpenApiParameterName.RoomId}}`)]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Lobby],
        summary: 'Join lobby room',
        description: 'Joins a specific lobby room',
        security: bearerAuthSecurity,
        parameters: [roomIdParameter],
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: ['userId'],
          properties: {
            userId: { type: OpenApiSchemaType.String, pattern: userIdPattern },
            displayName: { type: OpenApiSchemaType.String, minLength: 1 },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Room joined', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Rooms.Spectate(`{${OpenApiParameterName.RoomId}}`)]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Lobby],
        summary: 'Spectate lobby room',
        description:
          'Joins a specific lobby room as a spectator without consuming an active player slot',
        security: bearerAuthSecurity,
        parameters: [roomIdParameter],
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: ['userId'],
          properties: {
            userId: { type: OpenApiSchemaType.String, pattern: userIdPattern },
            displayName: { type: OpenApiSchemaType.String, minLength: 1 },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors({
            ...createJsonResponse(String(HttpStatus.Ok), 'Room spectated', {
              type: OpenApiSchemaType.Object,
            }),
            [String(HttpStatus.Conflict)]: {
              description: 'Already in room as player',
            },
          })
        ),
      },
    },
    [ApiEndpoint.Rooms.Leave(`{${OpenApiParameterName.RoomId}}`)]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Lobby],
        summary: 'Leave lobby room',
        description: 'Leaves a specific lobby room',
        security: bearerAuthSecurity,
        parameters: [roomIdParameter],
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: ['userId'],
          properties: {
            userId: { type: OpenApiSchemaType.String, pattern: userIdPattern },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Room left', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createMatchmakingPaths() {
  return {
    [ApiEndpoint.Matchmaking.Base]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Matchmaking],
        summary: 'Get matchmaking status',
        description:
          'Retrieves matchmaking status for the authenticated user or queue info',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Matchmaking status', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Matchmaking.Queue]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Matchmaking],
        summary: 'Join matchmaking queue',
        description: 'Joins the matchmaking queue for a specific game type',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: ['userId'],
          properties: {
            userId: { type: OpenApiSchemaType.String, pattern: userIdPattern },
            displayName: { type: OpenApiSchemaType.String, minLength: 1 },
            elo: { type: OpenApiSchemaType.Integer, minimum: 0 },
            gameType: { type: OpenApiSchemaType.Integer, minimum: 0 },
            game_type: { type: OpenApiSchemaType.Integer, minimum: 0 },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Joined queue', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
      [OpenApiMethod.Delete]: {
        tags: [OpenApiTag.Matchmaking],
        summary: 'Leave matchmaking queue',
        description: 'Leaves the matchmaking queue',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Left queue', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createPresencePaths() {
  return {
    [ApiEndpoint.Presence.Base]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Presence],
        summary: 'Get presence',
        description: 'Retrieves online status of users',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'User presence info', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Presence],
        summary: 'Update presence',
        description: 'Updates online status of the authenticated user',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          properties: {
            status: {
              type: OpenApiSchemaType.String,
              enum: PresenceStatusValues,
            },
            currentRoom: {
              type: OpenApiSchemaType.String,
              pattern: matchIdPattern,
            },
            currentGame: {
              type: OpenApiSchemaType.String,
              pattern: matchIdPattern,
            },
            statusMessage: { type: OpenApiSchemaType.String, maxLength: 512 },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Presence updated', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createFriendsPaths() {
  return {
    [ApiEndpoint.Friends.Base]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Friends],
        summary: 'List friends',
        description: 'Lists friends and pending requests',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Friend list', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Friends.ById(`{${OpenApiParameterName.FriendId}}`)]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Friends],
        summary: 'Add/Accept friend request',
        description: 'Sends or accepts a friend request',
        security: bearerAuthSecurity,
        parameters: [
          createPathParameter(OpenApiParameterName.FriendId, 'Friend ID', {
            pattern: userIdPattern,
          }),
        ],
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Friend request sent', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
      [OpenApiMethod.Delete]: {
        tags: [OpenApiTag.Friends],
        summary: 'Remove friend',
        description: 'Removes a friend or rejects a request',
        security: bearerAuthSecurity,
        parameters: [
          createPathParameter(OpenApiParameterName.FriendId, 'Friend ID', {
            pattern: userIdPattern,
          }),
        ],
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Friend removed', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createAuditPaths() {
  return {
    [auditQueryPath]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Audit],
        summary: 'Query audit logs',
        description: 'Retrieves system audit logs',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Audit log entries', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createCompliancePaths() {
  return {
    [ApiEndpoint.Compliance.Base]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Compliance],
        summary: 'Compliance status',
        description: 'Check GDPR/Compliance status',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Compliance info', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createProgressionPaths() {
  return {
    [ApiEndpoint.Progression.Base]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Progression],
        summary: 'Get player progression',
        description: 'Retrieves experience points, level, and tiered progress',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Progression data', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Progression],
        summary: 'Update progression',
        description: 'Manually adjust or trigger progression updates',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          properties: {
            xpAwarded: { type: OpenApiSchemaType.Integer, minimum: 1 },
            amount: { type: OpenApiSchemaType.Integer, minimum: 1 },
            reason: {
              type: OpenApiSchemaType.String,
              minLength: 1,
              maxLength: 256,
            },
            idempotencyKey: {
              type: OpenApiSchemaType.String,
              pattern: IdempotencyKeyPattern.AllowedCharacters.source,
            },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Progression updated', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createRewardPaths() {
  return {
    [rewardDailyPath]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Rewards],
        summary: 'Daily reward status',
        description: 'Checks daily reward eligibility',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Daily reward status', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [rewardDailyClaimPath]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Rewards],
        summary: 'Claim daily reward',
        description: 'Claims the daily login reward',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          properties: {
            idempotencyKey: {
              type: OpenApiSchemaType.String,
              pattern: '^[A-Za-z0-9_-]+$',
            },
            userId: { type: OpenApiSchemaType.String, pattern: userIdPattern },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Daily reward claimed', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createPersonalizationPaths() {
  return {
    [ApiEndpoint.Personalization.Base]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Personalization],
        summary: 'Get personalization',
        description: 'Retrieves user themes, preferences, and avatars',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Personalization data', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createAnalyticsPaths() {
  return {
    [ApiEndpoint.Analytics.Profile]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Analytics],
        summary: 'Get player analytics',
        description: 'Retrieves behavioral and playstyle analytics',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Analytics data', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createSecurityPaths() {
  return {
    [securityPenaltyPath]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Security],
        summary: 'Check penalties',
        description: 'Checks for active account penalties or bans',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Penalty status', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Security.PenaltyIssue]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Security],
        summary: 'Issue penalty',
        description: 'Issues a penalty to a user (Admin/Internal)',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: ['userId', 'type', 'reason'],
          properties: {
            userId: { type: OpenApiSchemaType.String, pattern: userIdPattern },
            type: {
              type: OpenApiSchemaType.String,
              enum: SecurityPenaltyTypeValues,
            },
            reason: {
              type: OpenApiSchemaType.String,
              minLength: 1,
              maxLength: 1024,
            },
            durationMinutes: { type: OpenApiSchemaType.Integer, minimum: 1 },
            issuedBy: { type: OpenApiSchemaType.String, pattern: userIdPattern },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Penalty issued', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createFraudPaths() {
  return {
    [fraudRiskPath]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Fraud],
        summary: 'Check fraud risks',
        description: 'Retrieves current fraud risk assessment',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Fraud risk data', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Fraud.Check]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Fraud],
        summary: 'Run fraud check',
        description: 'Runs a manual fraud assessment check',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Fraud check complete', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createAntiCheatPaths() {
  return {
    [antiCheatStatusPath]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.AntiCheat],
        summary: 'Anti-cheat status',
        description: 'Check anti-cheat integration status',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Anti-cheat status', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.AntiCheat.Analyze]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.AntiCheat],
        summary: 'Analyze gameplay telemetry',
        description: 'Submits telemetry data for anti-cheat analysis',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: MatchIdRequiredFields,
          properties: {
            matchId: { type: OpenApiSchemaType.String, pattern: matchIdPattern },
            events: {
              type: OpenApiSchemaType.Array,
              items: { type: OpenApiSchemaType.Object },
            },
            moveTimingMs: { type: OpenApiSchemaType.Number, minimum: 0 },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Analysis complete', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createProfilePaths() {
  return {
    [profileByUserPath]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Profile],
        summary: 'Get user profile',
        description: 'Retrieves public or private profile data',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Profile data', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [profileUpdatePath]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Profile],
        summary: 'Update profile',
        description: 'Updates user profile metadata',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          properties: {
            displayName: {
              type: OpenApiSchemaType.String,
              minLength: 1,
              maxLength: 128,
            },
            bio: {
              type: OpenApiSchemaType.String,
              minLength: 1,
              maxLength: 512,
            },
            visibility: {
              type: OpenApiSchemaType.String,
              enum: ProfileVisibilityValues,
            },
            showcaseBadges: {
              type: OpenApiSchemaType.Array,
              items: {
                type: OpenApiSchemaType.String,
                minLength: 1,
                maxLength: 64,
              },
              maxItems: 5,
            },
            customTitle: {
              type: OpenApiSchemaType.String,
              minLength: 1,
              maxLength: 128,
              nullable: true,
            },
            profileTheme: {
              type: OpenApiSchemaType.String,
              minLength: 1,
              maxLength: 64,
            },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Profile updated', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createMessagePaths() {
  return {
    [messageByConversationPath]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Message],
        summary: 'List message history',
        description: 'Retrieves message history for a conversation',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Message history', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [messageSendPath]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Message],
        summary: 'Send message',
        description: 'Sends a direct message or chat message',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          required: ['content'],
          properties: {
            content: {
              type: OpenApiSchemaType.String,
              minLength: 1,
              maxLength: 4096,
            },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Message sent', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createFeedPaths() {
  return {
    [ApiEndpoint.Feed.Base]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Feed],
        summary: 'Get social feed',
        description: 'Retrieves news and social feed activities',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Feed activity', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createNotificationPaths() {
  return {
    [notificationListPath]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Notification],
        summary: 'Get notifications',
        description: 'Retrieves notification history',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Notification list', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [notificationPushPath]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Notification],
        summary: 'Send push notification',
        description: 'Sends a push notification (Admin/Internal)',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(
              String(HttpStatus.Ok),
              'Notification push complete',
              {
                type: OpenApiSchemaType.Object,
              }
            )
          )
        ),
      },
    },
  }
}

function createDiscoveryPaths() {
  return {
    [ApiEndpoint.Discovery.Base]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Discovery],
        summary: 'Discover content',
        description: 'Discover games, events, and featured activities',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Discovered content', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createInventoryPaths() {
  return {
    [inventoryListPath]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Inventory],
        summary: 'Get inventory',
        description: 'Lists owned items and collectibles',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Inventory list', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createMarketplacePaths() {
  return {
    [ApiEndpoint.Marketplace.History]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Marketplace],
        summary: 'Get marketplace history',
        description: 'Retrieves global or user marketplace transaction history',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Marketplace history', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Marketplace.List]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Marketplace],
        summary: 'List items for sale',
        description: 'Returns the current marketplace listings',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Active listings', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Marketplace.Buy]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Marketplace],
        summary: 'Purchase item',
        description: 'Executes a marketplace item purchase',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Item purchased', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createTournamentPaths() {
  return {
    [ApiEndpoint.Tournament.Base]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Tournament],
        summary: 'List tournaments',
        description: 'Retrieves current and upcoming tournaments',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Tournament list', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createSettingsPaths() {
  return {
    [settingsByUserPath]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Settings],
        summary: 'Get user settings',
        description: 'Retrieves user settings and configurations',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'User settings', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [settingsUpdatePath]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Settings],
        summary: 'Update settings',
        description: 'Updates user account settings',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
          properties: {
            theme: {
              type: OpenApiSchemaType.String,
              enum: SettingsThemeValues,
            },
            notifications: { type: OpenApiSchemaType.Boolean },
            notificationsEnabled: { type: OpenApiSchemaType.Boolean },
            soundEnabled: { type: OpenApiSchemaType.Boolean },
            language: {
              type: OpenApiSchemaType.String,
              minLength: 1,
              maxLength: 16,
            },
          },
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Settings updated', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function getAdminDashboardOperation() {
  return {
    tags: [OpenApiTag.Admin],
    summary: 'Admin dashboard',
    description:
      'Retrieves admin dashboard, user management, or moderation data',
    security: bearerAuthSecurity,
    responses: withAuthErrors(
      withStandardErrors(
        createJsonResponse(String(HttpStatus.Ok), 'Admin data', {
          type: OpenApiSchemaType.Object,
        })
      )
    ),
  }
}

function postAdminActionOperation() {
  return {
    tags: [OpenApiTag.Admin],
    summary: 'Admin action',
    description: 'Admin actions: moderation, credit adjustments, plan changes',
    security: bearerAuthSecurity,
    requestBody: createJsonRequestBody({
      type: OpenApiSchemaType.Object,
      required: ['action'],
      properties: {
        action: { type: OpenApiSchemaType.String, minLength: 1 },
        targetUserId: { type: OpenApiSchemaType.String, pattern: userIdPattern },
        tier: { type: OpenApiSchemaType.String },
        isAdmin: { type: OpenApiSchemaType.Boolean },
        provider: { type: OpenApiSchemaType.Object },
        providers: {
          type: OpenApiSchemaType.Array,
          items: { type: OpenApiSchemaType.Object },
        },
      },
    }),
    responses: withAuthErrors(
      withStandardErrors(
        createJsonResponse(String(HttpStatus.Ok), 'Admin action result', {
          type: OpenApiSchemaType.Object,
        })
      )
    ),
  }
}

function getAdminDashboardDataOperation() {
  return {
    tags: [OpenApiTag.Admin],
    summary: 'Admin dashboard data',
    description: 'Retrieves dashboard, user management, or moderation data',
    security: bearerAuthSecurity,
    responses: withAuthErrors(
      withStandardErrors(
        createJsonResponse(String(HttpStatus.Ok), 'Admin dashboard data', {
          type: OpenApiSchemaType.Object,
        })
      )
    ),
  }
}

function createAdminBasePaths() {
  return {
    [ApiEndpoint.Admin.Base]: {
      get: getAdminDashboardOperation(),
      post: postAdminActionOperation(),
    },
  }
}

function createAdminDashboardDataPaths() {
  return {
    [ApiEndpoint.Admin.DashboardData]: {
      get: getAdminDashboardDataOperation(),
    },
  }
}

function createAdminModerationPaths() {
  return {
    [ApiEndpoint.Admin.ModerationQueue]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Admin],
        summary: 'Admin moderation queue',
        description: 'Retrieves moderation queue items',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Moderation queue', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
    [ApiEndpoint.Admin.ModerationReport]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Admin],
        summary: 'Submit moderation report',
        description: 'Submits a moderation report',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(
              String(HttpStatus.Ok),
              'Moderation report submitted',
              {
                type: OpenApiSchemaType.Object,
              }
            )
          )
        ),
      },
    },
    [ApiEndpoint.Admin.ModerationResolve(`{${OpenApiParameterName.ReportId}}`)]:
    {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Admin],
        summary: 'Resolve moderation report',
        description: 'Resolves a moderation report',
        security: bearerAuthSecurity,
        parameters: [reportIdParameter],
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(
              String(HttpStatus.Ok),
              'Moderation report resolved',
              {
                type: OpenApiSchemaType.Object,
              }
            )
          )
        ),
      },
    },
  }
}

function createAdminUserPaths() {
  return {
    [ApiEndpoint.Admin.UserStatus(`{${OpenApiParameterName.UserId}}`)]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Admin],
        summary: 'Update user admin status',
        description: 'Updates whether a user is an admin',
        security: bearerAuthSecurity,
        parameters: [userIdParameter],
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'User status updated', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createAdminFinancePaths() {
  return {
    [ApiEndpoint.Admin.CreditsPlan]: {
      [OpenApiMethod.Post]: {
        tags: [OpenApiTag.Admin],
        summary: 'Plan credits',
        description: 'Plans credits for a user',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'Credits planned', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createAdminAiPaths() {
  return {
    [ApiEndpoint.Admin.AICatalog]: {
      [OpenApiMethod.Patch]: {
        tags: [OpenApiTag.Admin],
        summary: 'Update AI catalog',
        description: 'Updates the AI provider catalog',
        security: bearerAuthSecurity,
        requestBody: createJsonRequestBody({
          type: OpenApiSchemaType.Object,
        }),
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(String(HttpStatus.Ok), 'AI catalog updated', {
              type: OpenApiSchemaType.Object,
            })
          )
        ),
      },
    },
  }
}

function createAdminTransparencyPaths() {
  return {
    [ApiEndpoint.Admin.TransparencyDashboard]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Admin],
        summary: 'Admin transparency dashboard',
        description: 'Retrieves transparency dashboard data',
        security: bearerAuthSecurity,
        responses: withAuthErrors(
          withStandardErrors(
            createJsonResponse(
              String(HttpStatus.Ok),
              'Transparency dashboard data',
              {
                type: OpenApiSchemaType.Object,
              }
            )
          )
        ),
      },
    },
  }
}

function createAdminPaths() {
  return {
    ...createAdminBasePaths(),
    ...createAdminDashboardDataPaths(),
    ...createAdminModerationPaths(),
    ...createAdminUserPaths(),
    ...createAdminFinancePaths(),
    ...createAdminAiPaths(),
    ...createAdminTransparencyPaths(),
  }
}

function createShopPaths() {
  return {
    [ApiEndpoint.Shop.Products]: {
      [OpenApiMethod.Get]: {
        tags: [OpenApiTag.Shop],
        summary: 'List shop products',
        description: 'Lists available shop products (public)',
        responses: withStandardErrors(
          createJsonResponse(String(HttpStatus.Ok), 'Shop products', {
            type: OpenApiSchemaType.Object,
          })
        ),
      },
    },
  }
}

function createTestPaths() {
  return {
    [ApiEndpoint.Test.ClearAll]: {
      [OpenApiMethod.Delete]: {
        tags: [OpenApiTag.TestDevelopmentOnly],
        summary: 'Clear all records from R2 bucket (DEVELOPMENT ONLY)',
        description: OpenApiDescription.ClearAllRecords,
        parameters: [confirmQueryParameter],
        responses: {
          ...createJsonResponse(
            String(HttpStatus.Ok),
            OpenApiResponseDescription.AllRecordsCleared,
            {
              type: OpenApiSchemaType.Object,
            }
          ),
          [String(HttpStatus.BadRequest)]: {
            description: OpenApiResponseDescription.ConfirmationRequired,
            content: {
              [HttpContentType.ApplicationJson]: {
                schema: {
                  type: OpenApiSchemaType.Object,
                },
              },
            },
          },
          ...unauthorizedResponse,
          [String(HttpStatus.Forbidden)]: {
            description: OpenApiResponseDescription.ForbiddenNotDevelopment,
            content: {
              [HttpContentType.ApplicationJson]: {
                schema: {
                  type: OpenApiSchemaType.Object,
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
                },
              },
            },
          },
        },
      },
    },
  }
}

function createOpenApiTags() {
  return [
    { name: OpenApiTag.Matches, description: OpenApiTagDescription.Matches },
    {
      name: OpenApiTag.SignedUrls,
      description: OpenApiTagDescription.SignedUrls,
    },
    { name: OpenApiTag.Disputes, description: OpenApiTagDescription.Disputes },
    { name: OpenApiTag.Archive, description: OpenApiTagDescription.Archive },
    { name: OpenApiTag.AI, description: OpenApiTagDescription.AI },
    { name: OpenApiTag.GDPR, description: OpenApiTagDescription.GDPR },
    {
      name: OpenApiTag.Leaderboard,
      description: OpenApiTagDescription.Leaderboard,
    },
    { name: OpenApiTag.Health, description: OpenApiTagDescription.Health },
    { name: OpenApiTag.Players, description: OpenApiTagDescription.Players },
    { name: OpenApiTag.Credits, description: OpenApiTagDescription.Credits },
    { name: OpenApiTag.Badges, description: OpenApiTagDescription.Badges },
    { name: OpenApiTag.Logs, description: OpenApiTagDescription.Logs },
    { name: OpenApiTag.Assets, description: OpenApiTagDescription.Assets },
    { name: OpenApiTag.Sync, description: OpenApiTagDescription.Sync },
    { name: OpenApiTag.Replay, description: OpenApiTagDescription.Replay },
    { name: OpenApiTag.Payment, description: OpenApiTagDescription.Payment },
    { name: OpenApiTag.Lobby, description: OpenApiTagDescription.Lobby },
    {
      name: OpenApiTag.Matchmaking,
      description: OpenApiTagDescription.Matchmaking,
    },
    { name: OpenApiTag.Presence, description: OpenApiTagDescription.Presence },
    { name: OpenApiTag.Friends, description: OpenApiTagDescription.Friends },
    { name: OpenApiTag.Audit, description: OpenApiTagDescription.Audit },
    {
      name: OpenApiTag.Compliance,
      description: OpenApiTagDescription.Compliance,
    },
    {
      name: OpenApiTag.Progression,
      description: OpenApiTagDescription.Progression,
    },
    { name: OpenApiTag.Rewards, description: OpenApiTagDescription.Rewards },
    {
      name: OpenApiTag.Personalization,
      description: OpenApiTagDescription.Personalization,
    },
    {
      name: OpenApiTag.Analytics,
      description: OpenApiTagDescription.Analytics,
    },
    { name: OpenApiTag.Security, description: OpenApiTagDescription.Security },
    { name: OpenApiTag.Fraud, description: OpenApiTagDescription.Fraud },
    {
      name: OpenApiTag.AntiCheat,
      description: OpenApiTagDescription.AntiCheat,
    },
    { name: OpenApiTag.Profile, description: OpenApiTagDescription.Profile },
    { name: OpenApiTag.Message, description: OpenApiTagDescription.Message },
    { name: OpenApiTag.Feed, description: OpenApiTagDescription.Feed },
    { name: OpenApiTag.Party, description: OpenApiTagDescription.Party },
    {
      name: OpenApiTag.Notification,
      description: OpenApiTagDescription.Notification,
    },
    {
      name: OpenApiTag.Discovery,
      description: OpenApiTagDescription.Discovery,
    },
    {
      name: OpenApiTag.Inventory,
      description: OpenApiTagDescription.Inventory,
    },
    {
      name: OpenApiTag.Marketplace,
      description: OpenApiTagDescription.Marketplace,
    },
    {
      name: OpenApiTag.Tournament,
      description: OpenApiTagDescription.Tournament,
    },
    { name: OpenApiTag.Settings, description: OpenApiTagDescription.Settings },
    { name: OpenApiTag.Admin, description: OpenApiTagDescription.Admin },
    { name: OpenApiTag.Shop, description: OpenApiTagDescription.Shop },
    {
      name: OpenApiTag.Transparency,
      description: OpenApiTagDescription.Transparency,
    },
  ]
}

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
  tags: createOpenApiTags(),
  paths: {
    ...createHealthPaths(),
    ...createMatchPaths(),
    ...createSignedUrlPaths(),
    ...createDisputePaths(),
    ...createArchivePaths(),
    ...createAiPaths(),
    ...createGdprPaths(),
    ...createLeaderboardPaths(),
    ...createPlayerPaths(),
    ...createCreditPaths(),
    ...createBadgePaths(),
    ...createLogPaths(),
    ...createAssetPaths(),
    ...createSyncPaths(),
    ...createReplayPaths(),
    ...createPaymentPaths(),
    ...createLobbyPaths(),
    ...createMatchmakingPaths(),
    ...createPresencePaths(),
    ...createFriendsPaths(),
    ...createAuditPaths(),
    ...createCompliancePaths(),
    ...createProgressionPaths(),
    ...createRewardPaths(),
    ...createPersonalizationPaths(),
    ...createAnalyticsPaths(),
    ...createSecurityPaths(),
    ...createFraudPaths(),
    ...createAntiCheatPaths(),
    ...createProfilePaths(),
    ...createMessagePaths(),
    ...createFeedPaths(),
    ...createNotificationPaths(),
    ...createDiscoveryPaths(),
    ...createInventoryPaths(),
    ...createMarketplacePaths(),
    ...createTournamentPaths(),
    ...createSettingsPaths(),
    ...createAdminPaths(),
    ...createShopPaths(),
    ...createTestPaths(),
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
}

type OpenApiExplicitExampleRoute = {
  path: string
  method: OpenApiMethod
}

export const openApiExplicitExampleRoutes: OpenApiExplicitExampleRoute[] = [
  { path: ApiEndpoint.Health, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Metrics, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Admin.Base, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Admin.DashboardData, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Admin.TransparencyDashboard, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Admin.ModerationQueue, method: OpenApiMethod.Get },
  { path: ApiEndpoint.AI.Catalog, method: OpenApiMethod.Get },
  { path: ApiEndpoint.AI.Keys, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Analytics.Profile, method: OpenApiMethod.Get },
  { path: antiCheatStatusPath, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Assets.Base, method: OpenApiMethod.Get },
  { path: auditQueryPath, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Compliance.Base, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Discovery.Base, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Feed.Base, method: OpenApiMethod.Get },
  { path: fraudRiskPath, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Friends.Base, method: OpenApiMethod.Get },
  {
    path: ApiEndpoint.Friends.ById(`{${OpenApiParameterName.FriendId}}`),
    method: OpenApiMethod.Post,
  },
  { path: inventoryListPath, method: OpenApiMethod.Get },
  { path: logsQueryPath, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Logs.Stats, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Marketplace.History, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Marketplace.List, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Marketplace.Buy, method: OpenApiMethod.Post },
  { path: messageByConversationPath, method: OpenApiMethod.Get },
  { path: messageSendPath, method: OpenApiMethod.Post },
  { path: notificationListPath, method: OpenApiMethod.Get },
  { path: notificationPushPath, method: OpenApiMethod.Post },
  { path: ApiEndpoint.Party.Base, method: OpenApiMethod.Get },
  { path: paymentEventsPath, method: OpenApiMethod.Get },
  { path: paymentReconcilePath, method: OpenApiMethod.Post },
  { path: ApiEndpoint.Personalization.Base, method: OpenApiMethod.Get },
  {
    path: ApiEndpoint.Players.ById(`{${OpenApiParameterName.UserId}}`),
    method: OpenApiMethod.Get,
  },
  { path: profileByUserPath, method: OpenApiMethod.Get },
  { path: profileUpdatePath, method: OpenApiMethod.Post },
  { path: ApiEndpoint.Progression.Base, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Progression.Base, method: OpenApiMethod.Post },
  { path: rewardDailyPath, method: OpenApiMethod.Get },
  { path: rewardDailyClaimPath, method: OpenApiMethod.Post },
  { path: ApiEndpoint.Rooms.Base, method: OpenApiMethod.Get },
  {
    path: ApiEndpoint.Rooms.Spectate(`{${OpenApiParameterName.RoomId}}`),
    method: OpenApiMethod.Post,
  },
  { path: securityPenaltyPath, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Security.PenaltyIssue, method: OpenApiMethod.Post },
  { path: ApiEndpoint.Fraud.Check, method: OpenApiMethod.Post },
  { path: ApiEndpoint.AntiCheat.Analyze, method: OpenApiMethod.Post },
  {
    path: ApiEndpoint.Archive.ByMatchId(`{${OpenApiParameterName.MatchId}}`),
    method: OpenApiMethod.Post,
  },
  {
    path: ApiEndpoint.Leaderboard.User(
      `{${OpenApiParameterName.GameType}}`,
      `{${OpenApiParameterName.UserId}}`
    ),
    method: OpenApiMethod.Get,
  },
  {
    path: ApiEndpoint.Leaderboard.Nearby(
      `{${OpenApiParameterName.GameType}}`,
      `{${OpenApiParameterName.UserId}}`
    ),
    method: OpenApiMethod.Get,
  },
  {
    path: ApiEndpoint.Admin.ModerationResolve(
      `{${OpenApiParameterName.ReportId}}`
    ),
    method: OpenApiMethod.Post,
  },
  { path: ApiEndpoint.AI.EscrowConsume, method: OpenApiMethod.Post },
  { path: settingsByUserPath, method: OpenApiMethod.Get },
  { path: settingsUpdatePath, method: OpenApiMethod.Post },
  { path: ApiEndpoint.Shop.Products, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Sync.Health, method: OpenApiMethod.Get },
  { path: ApiEndpoint.Matchmaking.Queue, method: OpenApiMethod.Delete },
  { path: ApiEndpoint.Test.ClearAll, method: OpenApiMethod.Delete },
]

for (const route of openApiExplicitExampleRoutes) {
  const pathItem = (openApiSpec.paths as Record<string, Record<string, OpenApiOperation>>)[route.path]
  const operation = pathItem ? pathItem[route.method] : undefined
  if (!operation) {
    continue
  }
  const parameters = operation.parameters ?? []
  const hasAuthHeader = parameters.some(
    (parameter: OpenApiParameter) =>
      parameter.name === HttpHeader.Authorization &&
      parameter.in === OpenApiParameterLocation.Header
  )
  if (hasAuthHeader) {
    continue
  }
  operation.parameters = [...parameters, authorizationHeaderExampleParameter]
}

export function generateOpenApiJson(): string {
  return JSON.stringify(openApiSpec, null, 2)
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
      margin: 0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${OpenApiSwaggerUi.BundleUrl}" charset="UTF-8"></script>
  <script src="${OpenApiSwaggerUi.StandalonePresetUrl}" charset="UTF-8"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "${baseUrl}/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          ${OpenApiSwaggerUi.LayoutStandalone}
        ],
        layout: "${OpenApiSwaggerUi.LayoutStandalone}"
      });
    };
  </script>
</body>
</html>`
}
