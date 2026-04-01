/// <reference lib="dom" />
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const LOG_GENERAL = false;

const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_GENERAL) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

export class PipelineHelpers {
  static validateMessages(messages: Array<{ role: string; content: string }>): boolean {
    if (!Array.isArray(messages)) {
      if (LOG_GENERAL) {
        logError('[validateMessages] Messages is not an array', undefined, LOG_GENERAL);
      }
      return false;
    }

    const validRoles = ['system', 'user', 'assistant'];

    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        if (LOG_GENERAL) {
          logError('[validateMessages] Message missing role or content:', msg, LOG_GENERAL);
        }
        return false;
      }

      if (!validRoles.includes(msg.role)) {
        if (LOG_GENERAL) {
          logError(`[validateMessages] Invalid role: ${msg.role}`, undefined, LOG_GENERAL);
        }
        return false;
      }

      if (typeof msg.content !== 'string') {
        if (LOG_GENERAL) {
          logError('[validateMessages] Content is not a string:', msg, LOG_GENERAL);
        }
        return false;
      }
    }

    return true;
  }

  static cleanMessages(
    messages: Array<{ role: string; content: string }>
  ): Array<{ role: string; content: string }> {
    return messages.map((msg) => ({
      ...msg,
      content: msg.content
        .trim()
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+/g, ' '),
    }));
  }

  static ensureSystemPrompt(
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string
  ): Array<{ role: string; content: string }> {
    const hasSystemMessage = messages.some((msg) => msg.role === 'system');

    if (!hasSystemMessage && systemPrompt && systemPrompt.trim().length > 0) {
      return [{ role: 'system', content: systemPrompt }, ...messages];
    }

    return messages;
  }
}
