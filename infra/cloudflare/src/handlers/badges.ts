import {
  HttpMethod,
  HttpStatus,
  HttpHeader,
  HttpContentType,
} from '@ocentra/endpoint-domain/constants/http'
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors'
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare'
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths'
import {
  BadgeAction,
  BadgeId,
  BadgeType,
  BadgeRarity,
  type BadgeId as BadgeIdType,
  type BadgeType as BadgeTypeValue,
  type BadgeRarity as BadgeRarityValue,
} from '@/constants/badges'
import { getCorsHeaders } from '@/utils/cors'
import { validateSchemaBody } from '@/utils/schema-validation'
import { requireAuth } from '@/utils/auth-middleware'
import { ParamName } from '@ocentra/endpoint-domain/constants/paths'
import { extractAndValidateIdFromPath } from '@ocentra/endpoint-domain/utils/path-parser'
import { buildSafeBucketKey } from '@/utils/path-sanitizer'
import { Logger, getStackTrace } from '@/logging/domain-logger-init'
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace'
import {
  type UserBadgeProfile,
  type BadgeDefinition,
  getUserBadgeProfileLogic,
  getBadgeDefinitionsLogic,
  getBadgeProgressLogic,
  unlockBadgeLogic,
  setActiveBadgesLogic,
  type BadgeStorage,
  type BadgeWithEtag,
} from '@/logic/badges'
import { earnGP as earnGPHandler } from '@/handlers/credits'
import type { Env } from '@/constants/env'
import {
  BadgeClaimRequestSchema,
  BadgesSetActiveRequestSchema,
} from '@ocentra/endpoint-domain/schemas/worker-contracts'
import { rejectUnsupportedMethod } from '@/utils/method-guards'
const USER_ID_PATH_PATTERN = /^[A-Za-z0-9._-]+$/

const log = Logger.instance
log.register(import.meta.url)

const LOG_PROFILE_LOAD = true
const LOG_PROFILE_SAVE = true
const LOG_CLAIM_REQUEST = true
const LOG_ABORT_CHECKS = true
const LOG_GP_OPERATIONS = true
const LOG_UNLOCK_LOGIC = true
const LOG_DIAG_EARN_GP = false

const logInfo = (
  message: string,
  stackTrace: StackTrace,
  data?: unknown,
  enabled: boolean = false
) => {
  log.logInfo(message, stackTrace, data, enabled)
}

const logWarn = (
  message: string,
  stackTrace: StackTrace,
  data?: unknown,
  enabled: boolean = false
) => {
  log.logWarn(message, stackTrace, data, enabled)
}

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data)
}

const logDebug = (
  message: string,
  stackTrace: StackTrace,
  data?: unknown,
  enabled: boolean = false
) => {
  log.logDebug(message, stackTrace, data, enabled)
}

function createBadgeStorage(env: Env): BadgeStorage {
  return {
    async getProfile(userId: string): Promise<BadgeWithEtag> {
      const key = buildSafeBucketKey(BucketPath.UserBadges, `${userId}.json`)
      try {
        const object = await env.MATCHES_BUCKET.get(key)
        if (object) {
          const profile = JSON.parse(await object.text()) as UserBadgeProfile
          const etag = object.httpEtag || null
          return { profile, etag }
        }
      } catch (error) {
        logWarn(
          `Error loading badge profile for ${userId}`,
          getStackTrace(),
          error,
          LOG_PROFILE_LOAD
        )
      }
      return {
        profile: {
          user_id: userId,
          badges: [],
          badge_counts: { total: 0 },
          active_badges: [],
          badge_progress: {},
          last_updated: new Date().toISOString(),
        },
        etag: null,
      }
    },

    async saveProfile(
      profile: UserBadgeProfile,
      expectedEtag: string | null
    ): Promise<{ success: boolean; etag: string | null }> {
      const key = buildSafeBucketKey(
        BucketPath.UserBadges,
        `${profile.user_id}.json`
      )
      try {
        const json = JSON.stringify(profile)
        const putOptions: R2PutOptions = {
          httpMetadata: {
            contentType: HttpContentType.ApplicationJson,
          },
        }

        if (expectedEtag !== null) {
          const etagWithoutQuotes =
            expectedEtag.startsWith('"') && expectedEtag.endsWith('"')
              ? expectedEtag.slice(1, -1)
              : expectedEtag
          putOptions.onlyIf = {
            etagMatches: etagWithoutQuotes,
          }
        }

        logDebug(
          `Saving badge profile for ${profile.user_id}`,
          getStackTrace(),
          {
            key,
            expectedEtag,
            hasOnlyIf: !!putOptions.onlyIf,
            profileSize: json.length,
          },
          LOG_PROFILE_SAVE
        )

        const result = await env.MATCHES_BUCKET.put(key, json, putOptions)

        if (result === null) {
          logWarn(
            `R2 put returned null for ${profile.user_id}`,
            getStackTrace(),
            {
              key,
              expectedEtag,
              reason: 'ETag mismatch or conditional put failed',
            },
            LOG_PROFILE_SAVE
          )
          return { success: false, etag: null }
        }

        logDebug(
          `Successfully saved badge profile for ${profile.user_id}`,
          getStackTrace(),
          {
            key,
            newEtag: result.httpEtag,
          },
          LOG_PROFILE_SAVE
        )

        return { success: true, etag: result.httpEtag || null }
      } catch (error) {
        const errorDetails = {
          userId: profile.user_id,
          key,
          expectedEtag,
          errorType: error?.constructor?.name || typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          errorString: String(error),
          errorJson: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        }
        logError(
          `Error saving badge profile for ${profile.user_id}`,
          getStackTrace(),
          errorDetails
        )
        return { success: false, etag: null }
      }
    },

    async getDefinitions(): Promise<BadgeDefinition[]> {
      const key = buildSafeBucketKey(
        BucketPath.BadgeDefinitions,
        'definitions.json'
      )
      try {
        const object = await env.MATCHES_BUCKET.get(key)
        if (object) {
          const definitions = JSON.parse(
            await object.text()
          ) as BadgeDefinition[]
          return definitions
        }
      } catch (error) {
        logWarn('Error loading badge definitions', getStackTrace(), error)
      }
      return getDefaultBadgeDefinitions()
    },
  }
}

export function getDefaultBadgeDefinitions(): BadgeDefinition[] {
  return [
    {
      badge_id: BadgeId.ProBronze,
      badge_type: BadgeType.Performance,
      badge_tier: 'bronze',
      name: 'Pro (Bronze)',
      description: 'Win 10 matches in any game',
      rarity: BadgeRarity.Common,
      criteria: { type: 'matches_won', threshold: 10 },
      rewards: [{ type: 'gp_global', amount: 50, one_time: true }],
    },
    {
      badge_id: BadgeId.ProSilver,
      badge_type: BadgeType.Performance,
      badge_tier: 'silver',
      name: 'Pro (Silver)',
      description: 'Win 50 matches in any game',
      rarity: BadgeRarity.Rare,
      criteria: { type: 'matches_won', threshold: 50 },
      rewards: [{ type: 'gp_global', amount: 200, one_time: true }],
    },
    {
      badge_id: BadgeId.ProGold,
      badge_type: BadgeType.Performance,
      badge_tier: 'gold',
      name: 'Pro (Gold)',
      description: 'Win 200 matches in any game',
      rarity: BadgeRarity.Epic,
      criteria: { type: 'matches_won', threshold: 200 },
      rewards: [{ type: 'gp_global', amount: 500, one_time: true }],
    },
    {
      badge_id: BadgeId.ProPlatinum,
      badge_type: BadgeType.Performance,
      badge_tier: 'platinum',
      name: 'Pro (Platinum)',
      description: 'Win 1000 matches in any game',
      rarity: BadgeRarity.Legendary,
      criteria: { type: 'matches_won', threshold: 1000 },
      rewards: [
        { type: 'gp_global', amount: 2000, one_time: true },
        {
          type: 'multiplier',
          multiplier: 1.1,
          one_time: false,
          recurring_period: 'daily',
        },
      ],
    },
    {
      badge_id: BadgeId.ManOfMatch,
      badge_type: BadgeType.MatchPerformance,
      name: 'Man of the Match',
      description: 'Achieve highest score in a match',
      rarity: BadgeRarity.Common,
      criteria: { type: 'match_score', threshold: 1 },
      rewards: [{ type: 'gp_global', amount: 25, one_time: true }],
    },
    {
      badge_id: BadgeId.StreakMaster5,
      badge_type: BadgeType.MatchPerformance,
      name: 'Streak Master (5)',
      description: 'Win 5 consecutive matches',
      rarity: BadgeRarity.Rare,
      criteria: { type: 'streak', threshold: 5, consecutive: true },
      rewards: [{ type: 'gp_global', amount: 100, one_time: true }],
    },
    {
      badge_id: BadgeId.StreakMaster10,
      badge_type: BadgeType.MatchPerformance,
      name: 'Streak Master (10)',
      description: 'Win 10 consecutive matches',
      rarity: BadgeRarity.Epic,
      criteria: { type: 'streak', threshold: 10, consecutive: true },
      rewards: [{ type: 'gp_global', amount: 250, one_time: true }],
    },
    {
      badge_id: BadgeId.StreakMaster20,
      badge_type: BadgeType.MatchPerformance,
      name: 'Streak Master (20)',
      description: 'Win 20 consecutive matches',
      rarity: BadgeRarity.Legendary,
      criteria: { type: 'streak', threshold: 20, consecutive: true },
      rewards: [{ type: 'gp_global', amount: 500, one_time: true }],
    },
    {
      badge_id: BadgeId.DailyWarrior7,
      badge_type: BadgeType.Engagement,
      name: 'Daily Warrior (7 Days)',
      description: 'Play matches for 7 consecutive days',
      rarity: BadgeRarity.Common,
      criteria: { type: 'daily_login', threshold: 7, consecutive: true },
      rewards: [{ type: 'gp_global', amount: 50, one_time: true }],
    },
    {
      badge_id: BadgeId.DailyWarrior30,
      badge_type: BadgeType.Engagement,
      name: 'Daily Warrior (30 Days)',
      description: 'Play matches for 30 consecutive days',
      rarity: BadgeRarity.Rare,
      criteria: { type: 'daily_login', threshold: 30, consecutive: true },
      rewards: [{ type: 'gp_global', amount: 200, one_time: true }],
    },
    {
      badge_id: BadgeId.DailyWarrior100,
      badge_type: BadgeType.Engagement,
      name: 'Daily Warrior (100 Days)',
      description: 'Play matches for 100 consecutive days',
      rarity: BadgeRarity.Epic,
      criteria: { type: 'daily_login', threshold: 100, consecutive: true },
      rewards: [{ type: 'gp_global', amount: 500, one_time: true }],
    },
    {
      badge_id: BadgeId.MatchMilestone100,
      badge_type: BadgeType.Milestone,
      name: 'Match Milestone (100)',
      description: 'Play 100 matches',
      rarity: BadgeRarity.Common,
      criteria: { type: 'matches_played', threshold: 100 },
      rewards: [{ type: 'gp_global', amount: 100, one_time: true }],
    },
    {
      badge_id: BadgeId.MatchMilestone500,
      badge_type: BadgeType.Milestone,
      name: 'Match Milestone (500)',
      description: 'Play 500 matches',
      rarity: BadgeRarity.Rare,
      criteria: { type: 'matches_played', threshold: 500 },
      rewards: [{ type: 'gp_global', amount: 500, one_time: true }],
    },
    {
      badge_id: BadgeId.MatchMilestone1000,
      badge_type: BadgeType.Milestone,
      name: 'Match Milestone (1000)',
      description: 'Play 1000 matches',
      rarity: BadgeRarity.Epic,
      criteria: { type: 'matches_played', threshold: 1000 },
      rewards: [{ type: 'gp_global', amount: 1000, one_time: true }],
    },
    {
      badge_id: BadgeId.WinMilestone100,
      badge_type: BadgeType.Milestone,
      name: 'Win Milestone (100)',
      description: 'Win 100 matches',
      rarity: BadgeRarity.Rare,
      criteria: { type: 'matches_won', threshold: 100 },
      rewards: [{ type: 'gp_global', amount: 200, one_time: true }],
    },
    {
      badge_id: BadgeId.WinMilestone500,
      badge_type: BadgeType.Milestone,
      name: 'Win Milestone (500)',
      description: 'Win 500 matches',
      rarity: BadgeRarity.Epic,
      criteria: { type: 'matches_won', threshold: 500 },
      rewards: [{ type: 'gp_global', amount: 1000, one_time: true }],
    },
    {
      badge_id: BadgeId.WinMilestone1000,
      badge_type: BadgeType.Milestone,
      name: 'Win Milestone (1000)',
      description: 'Win 1000 matches',
      rarity: BadgeRarity.Legendary,
      criteria: { type: 'matches_won', threshold: 1000 },
      rewards: [{ type: 'gp_global', amount: 2000, one_time: true }],
    },
    {
      badge_id: BadgeId.KingOfGame,
      badge_type: BadgeType.Leaderboard,
      name: 'King of Game',
      description: 'Achieve #1 rank on leaderboard',
      rarity: BadgeRarity.Legendary,
      criteria: { type: 'leaderboard_position', threshold: 1 },
      rewards: [
        { type: 'gp_global', amount: 1000, one_time: true },
        {
          type: 'multiplier',
          multiplier: 1.2,
          one_time: false,
          recurring_period: 'daily',
        },
      ],
    },
    {
      badge_id: BadgeId.Top10,
      badge_type: BadgeType.Leaderboard,
      name: 'Top 10',
      description: 'Achieve top 10 rank on leaderboard',
      rarity: BadgeRarity.Epic,
      criteria: { type: 'leaderboard_position', threshold: 10 },
      rewards: [
        { type: 'gp_global', amount: 500, one_time: true },
        {
          type: 'multiplier',
          multiplier: 1.1,
          one_time: false,
          recurring_period: 'daily',
        },
      ],
    },
    {
      badge_id: BadgeId.Top100,
      badge_type: BadgeType.Leaderboard,
      name: 'Top 100',
      description: 'Achieve top 100 rank on leaderboard',
      rarity: BadgeRarity.Rare,
      criteria: { type: 'leaderboard_position', threshold: 100 },
      rewards: [{ type: 'gp_global', amount: 200, one_time: true }],
    },
  ]
}

export async function handleBadgesRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const methodCheck = rejectUnsupportedMethod(request, env, [
    HttpMethod.Get,
    HttpMethod.Post,
  ])
  if (methodCheck) {
    return methodCheck
  }

  const requestOrigin = request.headers.get(HttpHeader.Origin)
  const authResult = await requireAuth(
    request,
    env,
    undefined,
    'Authentication required'
  )
  if (authResult instanceof Response) {
    return authResult
  }
  const authenticatedUserId = authResult.userId

  const result = extractAndValidateIdFromPath(
    path,
    ApiEndpoint.Badges.Base,
    ParamName.UserId,
    request.url
  )
  if (result.error || !result.id || !USER_ID_PATH_PATTERN.test(result.id)) {
    return new Response(
      JSON.stringify({
        error: 'Bad Request',
        message: result.error || 'User ID required',
      }),
      {
        status: HttpStatus.BadRequest,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin || undefined),
        },
      }
    )
  }

  const userId = result.id
  if (userId !== authenticatedUserId) {
    return new Response(
      JSON.stringify({
        error: 'Forbidden',
        message: "Cannot access another user's badges",
      }),
      {
        status: HttpStatus.Forbidden,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin || undefined),
        },
      }
    )
  }

  const action = path.split('/').pop() || BadgeAction.List
  const storage = createBadgeStorage(env)

  try {
    if (action === BadgeAction.List || action === userId) {
      const profile = await getUserBadgeProfileLogic(userId, storage)
      return new Response(JSON.stringify(profile), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin || undefined),
        },
      })
    } else if (action === BadgeAction.Definitions) {
      const requestUrl = new URL(request.url)
      const badgeType = requestUrl.searchParams.get('badge_type')
      const rarity = requestUrl.searchParams.get('rarity')
      const gameType = requestUrl.searchParams.get('game_type')

      const definitions = await getBadgeDefinitionsLogic(storage, {
        badge_type: badgeType ? (badgeType as BadgeTypeValue) : undefined,
        rarity: rarity ? (rarity as BadgeRarityValue) : undefined,
        game_type: gameType ? parseInt(gameType, 10) : undefined,
      })

      return new Response(JSON.stringify({ definitions }), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin || undefined),
        },
      })
    } else if (action === BadgeAction.Progress) {
      const requestUrl = new URL(request.url)
      const badgeId = requestUrl.searchParams.get('badge_id')
      const progress = await getBadgeProgressLogic(
        { userId, badgeId: badgeId ? (badgeId as BadgeIdType) : undefined },
        storage
      )
      return new Response(JSON.stringify(progress), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin || undefined),
        },
      })
    } else if (
      action === BadgeAction.Active &&
      request.method === HttpMethod.Post
    ) {
      const validation = await validateSchemaBody(request, env, BadgesSetActiveRequestSchema)
      if (validation.errorResponse) return validation.errorResponse
      const body = validation.data!

      const result = await setActiveBadgesLogic(
        { userId, badgeIds: body.badge_ids },
        storage
      )

      if (!result.success) {
        const status = typeof result.error === 'string' && result.error.startsWith('Maximum ')
          ? HttpStatus.BadRequest
          : HttpStatus.InternalServerError
        return new Response(
          JSON.stringify({
            error: 'Internal Server Error',
            message: result.error || 'Failed to set active badges',
          }),
          {
            status,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin || undefined),
            },
          }
        )
      }

      return new Response(JSON.stringify({ success: true }), {
        status: HttpStatus.Ok,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin || undefined),
        },
      })
    } else if (
      action === BadgeAction.Claim &&
      request.method === HttpMethod.Post
    ) {
      const requestStartTime = Date.now()

      logDebug(
        `Claim request started`,
        getStackTrace(),
        { userId, time: requestStartTime },
        LOG_CLAIM_REQUEST
      )

      if (request.signal?.aborted) {
        logDebug(
          `Request already aborted at start`,
          getStackTrace(),
          { userId },
          LOG_ABORT_CHECKS
        )
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Request aborted',
          }),
          {
            status: HttpStatus.Ok,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin || undefined),
            },
          }
        )
      }

      const validation = await validateSchemaBody(
        request,
        env,
        BadgeClaimRequestSchema
      )
      if (validation.errorResponse) return validation.errorResponse
      const body = validation.data!

      const checkAborted = (): boolean => {
        const aborted = request.signal?.aborted ?? false
        if (aborted) {
          logDebug(
            `Abort detected`,
            getStackTrace(),
            { userId, elapsed: Date.now() - requestStartTime },
            LOG_ABORT_CHECKS
          )
        }
        return aborted
      }

      if (checkAborted()) {
        logDebug(
          `Early abort check failed`,
          getStackTrace(),
          { userId },
          LOG_ABORT_CHECKS
        )
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Request aborted',
          }),
          {
            status: HttpStatus.Ok,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin || undefined),
            },
          }
        )
      }

      logDebug(
        `Calling unlockBadgeLogic`,
        getStackTrace(),
        {
          userId,
          badgeId: body.badge_id,
          elapsed: Date.now() - requestStartTime,
        },
        LOG_UNLOCK_LOGIC
      )
      const result = await unlockBadgeLogic(
        {
          userId,
          badgeId: body.badge_id as BadgeIdType,
          gameType: body.game_type,
          checkAborted,
        },
        storage,
        {
          earnGP: async (userId, amount, description, gameType, metadata) => {
            const elapsed = Date.now() - requestStartTime
            if (checkAborted()) {
              logDebug(
                `earnGP abort check failed BEFORE award`,
                getStackTrace(),
                { userId, amount, elapsed },
                LOG_GP_OPERATIONS
              )
              return { success: false }
            }
            logDebug(
              `Awarding GP`,
              getStackTrace(),
              { userId, amount, elapsed },
              LOG_GP_OPERATIONS
            )
            const earnResult = await earnGPHandler(
              env,
              userId,
              amount,
              description,
              metadata
            )
            logInfo(
              '[DIAG] earnGP result',
              getStackTrace(),
              { userId, amount, success: earnResult.success },
              LOG_DIAG_EARN_GP
            )

            if (!earnResult.success) {
              return { success: false }
            }

            logDebug(
              `GP awarded successfully`,
              getStackTrace(),
              { userId, amount, elapsed: Date.now() - requestStartTime },
              LOG_GP_OPERATIONS
            )
            return { success: earnResult.success }
          },
        }
      )

      logDebug(
        `unlockBadgeLogic completed`,
        getStackTrace(),
        {
          userId,
          success: result.success,
          elapsed: Date.now() - requestStartTime,
        },
        LOG_UNLOCK_LOGIC
      )

      if (!result.success) {
        const isClientError =
          result.error?.includes('not found') ||
          result.error?.includes('Invalid')
        const statusCode = result.error?.includes('not found')
          ? HttpStatus.BadRequest
          : isClientError
            ? HttpStatus.BadRequest
            : HttpStatus.InternalServerError
        return new Response(
          JSON.stringify({
            success: false,
            error: result.error || 'Failed to unlock badge',
          }),
          {
            status: statusCode,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin || undefined),
            },
          }
        )
      }

      if (result.already_unlocked) {
        return new Response(
          JSON.stringify({
            success: true,
            badge: result.badge,
            rewards_claimed: result.rewards_claimed ?? false,
            already_unlocked: true,
          }),
          {
            status: HttpStatus.Ok,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin || undefined),
            },
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          badge: result.badge,
          rewards_claimed: result.rewards_claimed,
        }),
        {
          status: HttpStatus.Ok,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        }
      )
    } else if (
      action === BadgeAction.TrackLogin &&
      request.method === HttpMethod.Post
    ) {
      const { trackDailyLogin } = await import('@/utils/daily-login')
      const result = await trackDailyLogin(env, userId)

      if (!result.success) {
        return new Response(
          JSON.stringify({
            error: 'Internal Server Error',
            message: result.errors.join(', '),
          }),
          {
            status: HttpStatus.InternalServerError,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin || undefined),
            },
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          consecutive_days: result.consecutiveDays,
          badges_unlocked: result.badgesUnlocked,
        }),
        {
          status: HttpStatus.Ok,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        }
      )
    } else if (
      action === BadgeAction.ClaimDailyRewards &&
      request.method === HttpMethod.Post
    ) {
      const { claimDailyRewards } = await import('@/utils/recurring-rewards')
      const result = await claimDailyRewards(env, userId)

      if (!result.success) {
        return new Response(
          JSON.stringify({
            error: 'Internal Server Error',
            message: result.error || 'Failed to claim daily rewards',
          }),
          {
            status: HttpStatus.InternalServerError,
            headers: {
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              ...getCorsHeaders(env, requestOrigin || undefined),
            },
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          rewards_claimed: result.rewardsClaimed,
          gp_earned: result.gpEarned,
          ac_earned: result.acEarned,
        }),
        {
          status: HttpStatus.Ok,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        }
      )
    } else {
      return new Response(
        JSON.stringify({
          error: 'Not Found',
          message: `Unknown action: ${action}`,
        }),
        {
          status: HttpStatus.NotFound,
          headers: {
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            ...getCorsHeaders(env, requestOrigin || undefined),
          },
        }
      )
    }
  } catch (error) {
    logError('Error processing badge request', getStackTrace(), error)
    return new Response(
      JSON.stringify({ error: ErrorMessage.InternalServerError }),
      {
        status: HttpStatus.InternalServerError,
        headers: {
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          ...getCorsHeaders(env, requestOrigin || undefined),
        },
      }
    )
  }
}
