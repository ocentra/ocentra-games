import { describe, it, expect } from 'vitest';
import {
  validateGenerationRequest,
  generationRequestSchema,
} from '@/validators/request-validators';

describe('request-validators', () => {
  it('validateGenerationRequest: returns valid request for correct input', () => {
    const request = {
      systemPrompt: 'You are helpful.',
      userPrompt: 'Hello',
    };
    const result = validateGenerationRequest(request);
    expect(result.systemPrompt).toBe('You are helpful.');
    expect(result.userPrompt).toBe('Hello');
  });

  it('validateGenerationRequest: accepts optional fields', () => {
    const request = {
      systemPrompt: 'Sys',
      userPrompt: 'User',
      model: 'gpt-4o',
      maxTokens: 1000,
      temperature: 0.5,
      topP: 0.9,
    };
    const result = validateGenerationRequest(request);
    expect(result.model).toBe('gpt-4o');
    expect(result.maxTokens).toBe(1000);
    expect(result.temperature).toBe(0.5);
    expect(result.topP).toBe(0.9);
  });

  it('validateGenerationRequest: throws for empty systemPrompt', () => {
    const request = { systemPrompt: '', userPrompt: 'hi' };
    expect(() => validateGenerationRequest(request)).toThrow();
  });

  it('validateGenerationRequest: throws for empty userPrompt', () => {
    const request = { systemPrompt: 'sys', userPrompt: '' };
    expect(() => validateGenerationRequest(request)).toThrow();
  });

  it('generationRequestSchema: rejects temperature > 2', () => {
    const result = generationRequestSchema.safeParse({
      systemPrompt: 's',
      userPrompt: 'u',
      temperature: 3,
    });
    expect(result.success).toBe(false);
  });

  it('generationRequestSchema: rejects negative maxTokens', () => {
    const result = generationRequestSchema.safeParse({
      systemPrompt: 's',
      userPrompt: 'u',
      maxTokens: -1,
    });
    expect(result.success).toBe(false);
  });
});
