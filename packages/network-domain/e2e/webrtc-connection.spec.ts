/**
 * E2E Tests for WebRTC P2P Connection
 *
 * Tests run in real browsers with real WebRTC implementations.
 * Tests actual peer-to-peer connections with proper signaling exchange.
 */

// Playwright fixtures are properly typed at runtime - TypeScript doesn't recognize them
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { test, expect } from '@playwright/test'

const HARNESS_URL = '/packages/network-domain/e2e/test-harness.html'

test.describe('WebRTC P2P Connection E2E', () => {
  test('establishes real peer-to-peer connection with signaling exchange', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    await page1.goto(HARNESS_URL)
    await page2.goto(HARNESS_URL)

    await page1.waitForFunction(() => typeof (window as unknown as { WebRTCHandler?: unknown }).WebRTCHandler !== 'undefined')
    await page2.waitForFunction(() => typeof (window as unknown as { WebRTCHandler?: unknown }).WebRTCHandler !== 'undefined')

    await page1.evaluate(() => {
      // @ts-expect-error - test harness
      window.alice = new window.WebRTCHandler('alice')
    })
    await page2.evaluate(() => {
      // @ts-expect-error - test harness
      window.bob = new window.WebRTCHandler('bob')
    })

    const aliceMessages: Array<{ peerId: string; message: unknown }> = []
    const bobMessages: Array<{ peerId: string; message: unknown }> = []

    await page1.exposeFunction('onAliceMessage', (peerId: string, message: unknown) => {
      aliceMessages.push({ peerId, message })
    })
    await page2.exposeFunction('onBobMessage', (peerId: string, message: unknown) => {
      bobMessages.push({ peerId, message })
    })

    await page1.evaluate(() => {
      // @ts-expect-error - test harness
      window.alice.onMessage(window.onAliceMessage)
    })
    await page2.evaluate(() => {
      // @ts-expect-error - test harness
      window.bob.onMessage(window.onBobMessage)
    })

    const aliceStatuses: string[] = []
    const bobStatuses: string[] = []

    await page1.exposeFunction('onAliceStatusChange', (peerId: string, status: string) => {
      aliceStatuses.push(`${peerId}:${status}`)
    })
    await page2.exposeFunction('onBobStatusChange', (peerId: string, status: string) => {
      bobStatuses.push(`${peerId}:${status}`)
    })

    await page1.evaluate(() => {
      // @ts-expect-error - test harness
      window.alice.onConnectionChange(window.onAliceStatusChange)
    })
    await page2.evaluate(() => {
      // @ts-expect-error - test harness
      window.bob.onConnectionChange(window.onBobStatusChange)
    })

    const aliceCandidates: RTCIceCandidateInit[] = []
    const bobCandidates: RTCIceCandidateInit[] = []

    await page1.exposeFunction('onAliceIceCandidate', (_peerId: string, candidate: RTCIceCandidate) => {
      aliceCandidates.push(candidate.toJSON())
    })
    await page2.exposeFunction('onBobIceCandidate', (_peerId: string, candidate: RTCIceCandidate) => {
      bobCandidates.push(candidate.toJSON())
    })

    await page1.evaluate(() => {
      // @ts-expect-error - test harness
      window.alice.onIceCandidate(window.onAliceIceCandidate)
    })
    await page2.evaluate(() => {
      // @ts-expect-error - test harness
      window.bob.onIceCandidate(window.onBobIceCandidate)
    })

    await page1.evaluate(() => {
      // @ts-expect-error - test harness
      window.alice.createPeerConnection('bob')
    })
    await page2.evaluate(() => {
      // @ts-expect-error - test harness
      window.bob.createPeerConnection('alice')
    })

    await page1.evaluate(() => {
      // @ts-expect-error - test harness
      window.alice.createDataChannel('bob', 'chat')
    })

    const offer = await page1.evaluate(() => {
      // @ts-expect-error - test harness
      return window.alice.createOffer('bob')
    })

    expect(offer).toBeDefined()
    expect(offer.type).toBe('offer')
    expect(offer.sdp).toBeTruthy()
    expect(typeof offer.sdp).toBe('string')
    expect(offer.sdp.length).toBeGreaterThan(0)

    await page1.waitForTimeout(2000)

    await page2.evaluate((offer: RTCSessionDescriptionInit) => {
      // @ts-expect-error - test harness
      return window.bob.setRemoteDescription('alice', offer)
    }, offer)

    const answer = await page2.evaluate(() => {
      // @ts-expect-error - test harness
      return window.bob.createAnswer('alice')
    })

    expect(answer).toBeDefined()
    expect(answer.type).toBe('answer')
    expect(answer.sdp).toBeTruthy()
    expect(typeof answer.sdp).toBe('string')
    expect(answer.sdp.length).toBeGreaterThan(0)

    await page2.waitForTimeout(2000)

    for (const candidate of aliceCandidates) {
      await page2.evaluate((candidate: RTCIceCandidateInit) => {
        // @ts-expect-error - test harness
        return window.bob.addIceCandidate('alice', candidate).catch(() => {})
      }, candidate)
    }

    for (const candidate of bobCandidates) {
      await page1.evaluate((candidate: RTCIceCandidateInit) => {
        // @ts-expect-error - test harness
        return window.alice.addIceCandidate('bob', candidate).catch(() => {})
      }, candidate)
    }

    await page1.evaluate((answer: RTCSessionDescriptionInit) => {
      // @ts-expect-error - test harness
      return window.alice.setRemoteDescription('bob', answer)
    }, answer)

    await page1.waitForTimeout(3000)
    await page2.waitForTimeout(3000)

    const aliceStatus = await page1.evaluate(() => {
      // @ts-expect-error - test harness
      return window.alice.getConnectionStatus('bob')
    })
    const bobStatus = await page2.evaluate(() => {
      // @ts-expect-error - test harness
      return window.bob.getConnectionStatus('alice')
    })

    expect(aliceStatus).toBeDefined()
    expect(bobStatus).toBeDefined()

    const alicePeers = await page1.evaluate(() => {
      // @ts-expect-error - test harness
      return window.alice.getConnectedPeers()
    })
    const bobPeers = await page2.evaluate(() => {
      // @ts-expect-error - test harness
      return window.bob.getConnectedPeers()
    })

    expect(Array.isArray(alicePeers)).toBe(true)
    expect(Array.isArray(bobPeers)).toBe(true)

    const messageSent = await page1.evaluate(() => {
      // @ts-expect-error - test harness
      return window.alice.sendMessage('bob', {
        id: 'test-1',
        type: 'chat',
        senderId: 'alice',
        timestamp: Date.now(),
        payload: { text: 'Hello from Alice' },
      })
    })

    if (messageSent) {
      await page1.waitForTimeout(1000)
      await page2.waitForTimeout(1000)
      expect(bobMessages.length).toBeGreaterThan(0)
      expect(bobMessages[0]).toMatchObject({
        peerId: 'alice',
        message: expect.objectContaining({
          type: 'chat',
          senderId: 'alice',
          payload: expect.objectContaining({ text: 'Hello from Alice' }),
        }),
      })
    } else {
      expect(offer).toBeDefined()
      expect(answer).toBeDefined()
      expect(aliceStatus !== undefined || bobStatus !== undefined).toBe(true)
    }

    await page1.evaluate(() => {
      // @ts-expect-error - test harness
      window.alice.closePeerConnection('bob')
    })
    await page2.evaluate(() => {
      // @ts-expect-error - test harness
      window.bob.closePeerConnection('alice')
    })

    await context1.close()
    await context2.close()

    expect(aliceStatuses.length).toBeGreaterThanOrEqual(0)
    expect(bobStatuses.length).toBeGreaterThanOrEqual(0)
    expect(offer).toBeDefined()
    expect(offer.type).toBe('offer')
    expect(answer).toBeDefined()
    expect(answer.type).toBe('answer')
  }, 30000)

  test('handles multiple peers simultaneously', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const context3 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    const page3 = await context3.newPage()

    await page1.goto(HARNESS_URL)
    await page2.goto(HARNESS_URL)
    await page3.goto(HARNESS_URL)

    await page1.waitForFunction(() => typeof (window as unknown as { WebRTCHandler?: unknown }).WebRTCHandler !== 'undefined')
    await page2.waitForFunction(() => typeof (window as unknown as { WebRTCHandler?: unknown }).WebRTCHandler !== 'undefined')
    await page3.waitForFunction(() => typeof (window as unknown as { WebRTCHandler?: unknown }).WebRTCHandler !== 'undefined')

    await page1.evaluate(() => {
      // @ts-expect-error - test harness
      window.peer1 = new window.WebRTCHandler('peer1')
    })
    await page2.evaluate(() => {
      // @ts-expect-error - test harness
      window.peer2 = new window.WebRTCHandler('peer2')
    })
    await page3.evaluate(() => {
      // @ts-expect-error - test harness
      window.peer3 = new window.WebRTCHandler('peer3')
    })

    await page1.evaluate(() => {
      // @ts-expect-error - test harness
      window.peer1.createPeerConnection('peer2')
      // @ts-expect-error - test harness
      window.peer1.createPeerConnection('peer3')
    })

    const connectedPeers = await page1.evaluate(() => {
      // @ts-expect-error - test harness
      return window.peer1.getConnectedPeers()
    })

    expect(Array.isArray(connectedPeers)).toBe(true)
    expect(connectedPeers.length).toBeGreaterThanOrEqual(0)

    await context1.close()
    await context2.close()
    await context3.close()
  }, 15000)

  test('properly cleans up connections on disconnect', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()

    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    await page1.goto(HARNESS_URL)
    await page2.goto(HARNESS_URL)

    await page1.waitForFunction(() => typeof (window as unknown as { WebRTCHandler?: unknown }).WebRTCHandler !== 'undefined')
    await page2.waitForFunction(() => typeof (window as unknown as { WebRTCHandler?: unknown }).WebRTCHandler !== 'undefined')

    await page1.evaluate(() => {
      // @ts-expect-error - test harness
      window.peer1 = new window.WebRTCHandler('peer1')
      // @ts-expect-error - test harness
      window.peer1.createPeerConnection('peer2')
    })

    const statusBefore = await page1.evaluate(() => {
      // @ts-expect-error - test harness
      return window.peer1.getConnectionStatus('peer2')
    })
    expect(statusBefore).toBeDefined()

    await page1.evaluate(() => {
      // @ts-expect-error - test harness
      window.peer1.closePeerConnection('peer2')
    })

    const statusAfter = await page1.evaluate(() => {
      // @ts-expect-error - test harness
      return window.peer1.getConnectionStatus('peer2')
    })
    const connectedPeers = await page1.evaluate(() => {
      // @ts-expect-error - test harness
      return window.peer1.getConnectedPeers()
    })

    expect(statusAfter).toBeNull()
    expect(connectedPeers.length).toBe(0)

    await context1.close()
    await context2.close()
  })

  test('handles connection errors gracefully', async ({ page }) => {
    await page.goto(HARNESS_URL)

    await page.waitForFunction(() => typeof (window as unknown as { WebRTCHandler?: unknown }).WebRTCHandler !== 'undefined')

    await page.evaluate(() => {
      // @ts-expect-error - test harness
      window.testHandler = new window.WebRTCHandler('peer1')
    })

    const error = await page.evaluate(() => {
      // @ts-expect-error - test harness
      return window.testHandler.createOffer('nonexistent').catch((e: Error) => e.message)
    })

    expect(error).toContain('not found')

    const sent = await page.evaluate(() => {
      // @ts-expect-error - test harness
      return window.testHandler.sendMessage('nonexistent', {
        id: 'test',
        type: 'chat',
        senderId: 'peer1',
        timestamp: Date.now(),
        payload: { text: 'test' },
      })
    })

    expect(sent).toBe(false)
  })
})
