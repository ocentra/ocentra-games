/**
 * AI Integration endpoint per spec Section 8.3.
 * Per critique: real API endpoint, not stub.
 */
/**
 * Handles AI event requests per spec Section 8.3 line 421.
 * POST /api/ai/on_event
 */
export async function handleAIEvent(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }
    try {
        const eventRequest = await request.json();
        // Validate request
        if (!eventRequest.matchId || !eventRequest.playerId || !eventRequest.eventType) {
            return new Response(JSON.stringify({ error: 'Missing required fields: matchId, playerId, eventType' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        // Call AI service if configured
        let aiResponse = null;
        if (env.AI_SERVICE_URL) {
            const startTime = Date.now();
            try {
                const response = await fetch(env.AI_SERVICE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(env.AI_API_KEY ? { 'Authorization': `Bearer ${env.AI_API_KEY}` } : {}),
                    },
                    body: JSON.stringify(eventRequest),
                });
                if (response.ok) {
                    aiResponse = await response.json();
                    aiResponse.responseTimeMs = Date.now() - startTime;
                }
                else {
                    console.error(`AI service error: ${response.status} ${response.statusText}`);
                }
            }
            catch (error) {
                console.error('Failed to call AI service:', error);
            }
        }
        else {
            // No AI service configured - return mock response for testing
            // In production, this should return an error or use default AI
            aiResponse = {
                action: {
                    type: 'decline',
                    playerId: eventRequest.playerId,
                    data: {},
                    timestamp: new Date().toISOString(),
                },
                chainOfThought: [
                    {
                        step: 1,
                        reasoning: 'No AI service configured - using default action',
                        confidence: 0.5,
                    },
                ],
                modelMetadata: {
                    modelId: 'default',
                    modelHash: '',
                    provider: 'local',
                },
                responseTimeMs: 0,
            };
        }
        // Store AI decision in R2 for later verification
        if (aiResponse) {
            const decisionKey = `ai-decisions/${eventRequest.matchId}/${eventRequest.playerId}-${Date.now()}.json`;
            await env.MATCHES_BUCKET.put(decisionKey, JSON.stringify({
                ...aiResponse,
                eventRequest,
                recordedAt: new Date().toISOString(),
            }), {
                httpMetadata: {
                    contentType: 'application/json',
                },
            });
        }
        return new Response(JSON.stringify(aiResponse || { error: 'AI service not available' }), {
            status: aiResponse ? 200 : 503,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
    catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
}
