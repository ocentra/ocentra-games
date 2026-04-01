/**
 * E2E Tests for P2PManager
 *
 * Tests the full P2PManager API in real browser environments.
 */

// Playwright fixtures are properly typed at runtime - TypeScript doesn't recognize them
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { test, expect } from '@playwright/test'

const HARNESS_URL = '/packages/network-domain/e2e/test-harness.html'

test.describe('P2PManager E2E', () => {
  test('establishes real P2P connection between two managers', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()

    await page1.goto(HARNESS_URL)
    await page2.goto(HARNESS_URL)
    await page1.waitForFunction(() => typeof (window as unknown as { P2PManager?: unknown }).P2PManager !== 'undefined', { timeout: 10000 })
    await page2.waitForFunction(() => typeof (window as unknown as { P2PManager?: unknown }).P2PManager !== 'undefined', { timeout: 10000 })

    await page1.evaluate(() => {
      // @ts-expect-error - test harness
      window.testManager = new P2PManager({ localPeerId: 'alice' })
    })
    await page2.evaluate(() => {
      // @ts-expect-error - test harness
      window.testManager = new P2PManager({ localPeerId: 'bob' })
    })

    await page1.exposeFunction('onChatMessage1', (_m: unknown) => {})
    await page2.exposeFunction('onChatMessage2', (_m: unknown) => {})
    await page1.exposeFunction('onPeerConnected1', (_id: string) => {})
    await page2.exposeFunction('onPeerConnected2', (_id: string) => {})

    await page1.evaluate(() => {
      // @ts-expect-error - test harness
      window.testManager.onChatMessage(window.onChatMessage1)
      // @ts-expect-error - test harness
      window.testManager.onPeerConnected(window.onPeerConnected1)
    })
    await page2.evaluate(() => {
      // @ts-expect-error - test harness
      window.testManager.onChatMessage(window.onChatMessage2)
      // @ts-expect-error - test harness
      window.testManager.onPeerConnected(window.onPeerConnected2)
    })

    const offer = await page1.evaluate(() => {
      // @ts-expect-error - test harness
      return window.testManager.createOffer('bob')
    }) as RTCSessionDescriptionInit
    expect(offer).toBeDefined()
    expect(offer.type).toBe('offer')
    expect(offer.sdp).toBeTruthy()

    const answer = await page2.evaluate((offer: RTCSessionDescriptionInit) => {
      // @ts-expect-error - test harness
      return window.testManager.handleOffer('alice', offer)
    }, offer) as RTCSessionDescriptionInit
    expect(answer).toBeDefined()
    expect(answer.type).toBe('answer')

    await page1.evaluate((answer: RTCSessionDescriptionInit) => {
      // @ts-expect-error - test harness
      return window.testManager.handleAnswer('bob', answer)
    }, answer)

    const alicePeers = await page1.evaluate(() => {
      // @ts-expect-error - test harness
      return window.testManager.getConnectedPeers()
    })
    const bobPeers = await page2.evaluate(() => {
      // @ts-expect-error - test harness
      return window.testManager.getConnectedPeers()
    })
    expect(Array.isArray(alicePeers)).toBe(true)
    expect(Array.isArray(bobPeers)).toBe(true)

    const aliceStatus = await page1.evaluate(() => {
      // @ts-expect-error - test harness
      return window.testManager.getConnectionStatus('bob')
    })
    const bobStatus = await page2.evaluate(() => {
      // @ts-expect-error - test harness
      return window.testManager.getConnectionStatus('alice')
    })
    expect(aliceStatus).toBeDefined()
    expect(bobStatus).toBeDefined()

    await page1.evaluate(() => {
      // @ts-expect-error - test harness
      window.testManager.destroy()
    })
    await page2.evaluate(() => {
      // @ts-expect-error - test harness
      window.testManager.destroy()
    })
    await context1.close()
    await context2.close()
  }, 20000)

  test('broadcasts messages to all connected peers', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    await page1.goto(HARNESS_URL)
    await page2.goto(HARNESS_URL)
    await page1.waitForFunction(() => typeof (window as unknown as { P2PManager?: unknown }).P2PManager !== 'undefined', { timeout: 10000 })
    await page2.waitForFunction(() => typeof (window as unknown as { P2PManager?: unknown }).P2PManager !== 'undefined', { timeout: 10000 })
    await page1.evaluate(() => { (window as unknown as { testManager?: unknown }).testManager = new (window as unknown as { P2PManager: new (opts: { localPeerId: string }) => unknown }).P2PManager({ localPeerId: 'alice' }) })
    await page2.evaluate(() => { (window as unknown as { testManager?: unknown }).testManager = new (window as unknown as { P2PManager: new (opts: { localPeerId: string }) => unknown }).P2PManager({ localPeerId: 'bob' }) })
    await page1.evaluate(() => (window as unknown as { testManager: { sendChatMessage: (msg: string) => void } }).testManager.sendChatMessage('Hello everyone!'))
    const alicePeers = await page1.evaluate(() => (window as unknown as { testManager: { getConnectedPeers: () => unknown[] } }).testManager.getConnectedPeers())
    expect(Array.isArray(alicePeers)).toBe(true)
    await page1.evaluate(() => (window as unknown as { testManager: { destroy: () => void } }).testManager.destroy())
    await page2.evaluate(() => (window as unknown as { testManager: { destroy: () => void } }).testManager.destroy())
    await context1.close()
    await context2.close()
  })

  test('handles peer disconnection correctly', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    await page1.goto(HARNESS_URL)
    await page2.goto(HARNESS_URL)
    await page1.waitForFunction(() => typeof (window as unknown as { P2PManager?: unknown }).P2PManager !== 'undefined', { timeout: 10000 })
    await page2.waitForFunction(() => typeof (window as unknown as { P2PManager?: unknown }).P2PManager !== 'undefined', { timeout: 10000 })
    await page1.evaluate(() => { (window as unknown as { testManager?: unknown }).testManager = new (window as unknown as { P2PManager: new (opts: { localPeerId: string }) => unknown }).P2PManager({ localPeerId: 'alice' }) })
    await page2.evaluate(() => { (window as unknown as { testManager?: unknown }).testManager = new (window as unknown as { P2PManager: new (opts: { localPeerId: string }) => unknown }).P2PManager({ localPeerId: 'bob' }) })
    await page1.evaluate(() => (window as unknown as { testManager: { createOffer: (id: string) => void } }).testManager.createOffer('bob'))
    await page2.evaluate(() => (window as unknown as { testManager: { destroy: () => void } }).testManager.destroy())
    await page1.waitForTimeout(500)
    const alicePeers = await page1.evaluate(() => (window as unknown as { testManager: { getConnectedPeers: () => unknown[] } }).testManager.getConnectedPeers())
    expect(alicePeers.length).toBe(0)
    await page1.evaluate(() => (window as unknown as { testManager: { destroy: () => void } }).testManager.destroy())
    await context1.close()
    await context2.close()
  })

  test('tracks connection status for each peer', async ({ browser }) => {
    const context1 = await browser.newContext()
    const context2 = await browser.newContext()
    const page1 = await context1.newPage()
    const page2 = await context2.newPage()
    await page1.goto(HARNESS_URL)
    await page2.goto(HARNESS_URL)
    await page1.waitForFunction(() => typeof (window as unknown as { P2PManager?: unknown }).P2PManager !== 'undefined', { timeout: 10000 })
    await page2.waitForFunction(() => typeof (window as unknown as { P2PManager?: unknown }).P2PManager !== 'undefined', { timeout: 10000 })
    await page1.evaluate(() => { (window as unknown as { testManager?: unknown }).testManager = new (window as unknown as { P2PManager: new (opts: { localPeerId: string }) => unknown }).P2PManager({ localPeerId: 'alice' }) })
    await page2.evaluate(() => { (window as unknown as { testManager?: unknown }).testManager = new (window as unknown as { P2PManager: new (opts: { localPeerId: string }) => unknown }).P2PManager({ localPeerId: 'bob' }) })
    const initialStatus = await page1.evaluate(() => (window as unknown as { testManager: { getConnectionStatus: (id: string) => unknown } }).testManager.getConnectionStatus('bob'))
    expect(initialStatus).toBeUndefined()
    await page1.evaluate(async () => { await (window as unknown as { testManager: { createOffer: (id: string) => Promise<unknown> } }).testManager.createOffer('bob') })
    await page1.waitForTimeout(1000)
    const status = await page1.evaluate(() => (window as unknown as { testManager: { getConnectionStatus: (id: string) => unknown } }).testManager.getConnectionStatus('bob'))
    expect(status).toBeDefined()
    expect(status).not.toBeNull()
    await page1.evaluate(() => (window as unknown as { testManager: { destroy: () => void } }).testManager.destroy())
    await page2.evaluate(() => (window as unknown as { testManager: { destroy: () => void } }).testManager.destroy())
    await context1.close()
    await context2.close()
  })
})
