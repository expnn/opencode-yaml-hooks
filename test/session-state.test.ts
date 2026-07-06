import { describe, expect, it, vi } from "vitest"
import { SessionStateStore } from "../src/core/session-state.ts"
import type { FileChange } from "../src/core/types.ts"

describe("SessionStateStore", () => {
  it("rememberSession creates a session with parent chain", async () => {
    const store = new SessionStateStore()
    store.rememberSession("child", "root")

    const resolveParentID = vi.fn(async (id: string) => {
      if (id === "root") return null
      return undefined
    })

    const root = await store.getRootSessionID("child", resolveParentID)
    expect(root).toBe("root")
  })

  it("rememberSession sets rootSessionID to self when parentID is null", async () => {
    const store = new SessionStateStore()
    store.rememberSession("root", null)

    const resolveParentID = vi.fn()
    const root = await store.getRootSessionID("root", resolveParentID)
    expect(root).toBe("root")
    expect(resolveParentID).not.toHaveBeenCalled()
  })

  it("rememberSession updates parent when called again", async () => {
    const store = new SessionStateStore()
    store.rememberSession("a", "b")
    store.rememberSession("a", "c")

    const resolveParentID = vi.fn(async (id: string) => {
      if (id === "c") return null
      return undefined
    })

    const root = await store.getRootSessionID("a", resolveParentID)
    expect(root).toBe("c")
  })

  it("evaluateScope returns true for scope all", async () => {
    const store = new SessionStateStore()
    const resolveParentID = vi.fn()

    const result = await store.evaluateScope("any-session", "all", resolveParentID)
    expect(result).toBe(true)
    expect(resolveParentID).not.toHaveBeenCalled()
  })

  it("evaluateScope returns true for main when session is root", async () => {
    const store = new SessionStateStore()
    store.rememberSession("root", null)

    const resolveParentID = vi.fn()
    const result = await store.evaluateScope("root", "main", resolveParentID)
    expect(result).toBe(true)
  })

  it("evaluateScope returns false for main when session is child", async () => {
    const store = new SessionStateStore()
    store.rememberSession("root", null)
    store.rememberSession("child", "root")

    const resolveParentID = vi.fn()
    const result = await store.evaluateScope("child", "main", resolveParentID)
    expect(result).toBe(false)
  })

  it("evaluateScope returns true for child when session is child", async () => {
    const store = new SessionStateStore()
    store.rememberSession("root", null)
    store.rememberSession("child", "root")

    const resolveParentID = vi.fn()
    const result = await store.evaluateScope("child", "child", resolveParentID)
    expect(result).toBe(true)
  })

  it("evaluateScope resolves parent via callback when not cached", async () => {
    const store = new SessionStateStore()
    const resolveParentID = vi.fn(async (id: string) => {
      if (id === "unknown-session") return "parent-session"
      return null
    })

    const result = await store.evaluateScope("unknown-session", "child", resolveParentID)
    expect(resolveParentID).toHaveBeenCalledWith("unknown-session")
    // root is "parent-session" != "unknown-session", so scope "child" → true
    expect(result).toBe(true)
  })

  it("isDeleted returns false for unknown sessions", () => {
    const store = new SessionStateStore()
    expect(store.isDeleted("unknown")).toBe(false)
  })

  it("deleteSession marks session as deleted and clears changes", () => {
    const store = new SessionStateStore()
    store.addFileChanges("s1", [{ operation: "modify", path: "a.ts" }])
    store.setPendingToolCall("call1", "s1", { cmd: "test" })
    store.deleteSession("s1")

    expect(store.isDeleted("s1")).toBe(true)
    expect(store.getFileChanges("s1")).toEqual([])
    expect(store.consumePendingToolCall("call1")).toBeUndefined()
  })

  it("deleteSession clears pending tool calls for the session", () => {
    const store = new SessionStateStore()
    store.setPendingToolCall("call1", "s1", { a: 1 })
    store.setPendingToolCall("call2", "s1", { b: 2 })
    store.setPendingToolCall("call3", "s2", { c: 3 })

    store.deleteSession("s1")

    expect(store.consumePendingToolCall("call1")).toBeUndefined()
    expect(store.consumePendingToolCall("call2")).toBeUndefined()
    expect(store.consumePendingToolCall("call3")).toEqual({ sessionID: "s2", toolArgs: { c: 3 } })
  })

  it("setPendingToolCall and consumePendingToolCall work correctly", () => {
    const store = new SessionStateStore()
    store.setPendingToolCall("call1", "s1", { cmd: "test", arg: 42 })

    const result = store.consumePendingToolCall("call1")
    expect(result).toEqual({ sessionID: "s1", toolArgs: { cmd: "test", arg: 42 } })

    // Second consume returns undefined
    expect(store.consumePendingToolCall("call1")).toBeUndefined()
  })

  it("consumePendingToolCall returns undefined for unknown callID", () => {
    const store = new SessionStateStore()
    expect(store.consumePendingToolCall("nonexistent")).toBeUndefined()
  })

  it("addFileChanges deduplicates identical changes", () => {
    const store = new SessionStateStore()
    const change: FileChange = { operation: "modify", path: "a.ts" }

    store.addFileChanges("s1", [change])
    store.addFileChanges("s1", [change])

    expect(store.getFileChanges("s1")).toEqual([change])
  })

  it("addFileChanges preserves different changes", () => {
    const store = new SessionStateStore()
    const changeA: FileChange = { operation: "modify", path: "a.ts" }
    const changeB: FileChange = { operation: "modify", path: "b.ts" }

    store.addFileChanges("s1", [changeA])
    store.addFileChanges("s1", [changeB])

    expect(store.getFileChanges("s1")).toHaveLength(2)
    expect(store.getFileChanges("s1")).toContainEqual(changeA)
    expect(store.getFileChanges("s1")).toContainEqual(changeB)
  })

  it("addFileChanges tracks replay during active idle dispatch", () => {
    const store = new SessionStateStore()
    const change: FileChange = { operation: "modify", path: "a.ts" }

    store.addFileChanges("s1", [change])
    store.beginIdleDispatch("s1", [change])
    // Adding same change during dispatch triggers replay tracking
    store.addFileChanges("s1", [change])

    // Consume original changes — the replayed change should remain
    store.consumeFileChanges("s1", [change])
    expect(store.getFileChanges("s1")).toEqual([change])
  })

  it("getFileChanges returns empty array for unknown session", () => {
    const store = new SessionStateStore()
    expect(store.getFileChanges("unknown")).toEqual([])
  })

  it("getFileChanges returns empty array for deleted session", () => {
    const store = new SessionStateStore()
    store.addFileChanges("s1", [{ operation: "modify", path: "a.ts" }])
    store.deleteSession("s1")
    expect(store.getFileChanges("s1")).toEqual([])
  })

  it("getModifiedPaths returns correct paths including both sides of rename", () => {
    const store = new SessionStateStore()
    store.addFileChanges("s1", [{ operation: "rename", fromPath: "old.ts", toPath: "new.ts" }])

    const paths = store.getModifiedPaths("s1")
    expect(paths).toContain("old.ts")
    expect(paths).toContain("new.ts")
  })

  it("beginIdleDispatch sets active dispatch keys and scopes replay tracking", () => {
    const store = new SessionStateStore()
    const changeA: FileChange = { operation: "modify", path: "a.ts" }
    const changeB: FileChange = { operation: "modify", path: "b.ts" }
    const changeC: FileChange = { operation: "modify", path: "c.ts" }

    // Add three changes
    store.addFileChanges("s1", [changeA, changeB, changeC])

    // Begin dispatch with only a.ts and b.ts in the dispatch set
    store.beginIdleDispatch("s1", [changeA, changeB])

    // During dispatch, re-add a.ts (in dispatch scope → tracked for replay)
    // and add a new change d.ts (not in dispatch scope → normal addition)
    store.addFileChanges("s1", [changeA])
    const changeD: FileChange = { operation: "modify", path: "d.ts" }
    store.addFileChanges("s1", [changeD])

    // Consume only a.ts and b.ts
    store.consumeFileChanges("s1", [changeA, changeB])

    // After consumption:
    // - a.ts: was in dispatch + re-added → replayed → stays
    // - b.ts: was in dispatch but NOT re-added → consumed → removed
    // - c.ts: not in dispatch, not consumed → stays
    // - d.ts: added during dispatch but not in dispatch scope, not consumed → stays
    expect(store.getFileChanges("s1")).toEqual([changeC, changeD, changeA])
  })

  it("consumeFileChanges removes consumed changes and replays in-dispatch changes", () => {
    const store = new SessionStateStore()
    const changeA: FileChange = { operation: "modify", path: "a.ts" }
    const changeB: FileChange = { operation: "modify", path: "b.ts" }

    store.addFileChanges("s1", [changeA, changeB])
    store.beginIdleDispatch("s1", [changeA, changeB])

    // Add a.ts again during dispatch (triggers replay tracking)
    store.addFileChanges("s1", [changeA])

    // Consume the original changes
    store.consumeFileChanges("s1", [changeA, changeB])

    // b.ts is removed (consumed, not replayed)
    // a.ts stays (was replayed)
    expect(store.getFileChanges("s1")).toEqual([changeA])
    expect(store.getModifiedPaths("s1")).toEqual(["a.ts"])
  })

  it("consumeFileChanges handles unknown session gracefully", () => {
    const store = new SessionStateStore()
    // Should not throw
    store.consumeFileChanges("unknown", [{ operation: "modify", path: "a.ts" }])
    // No assertion needed — just verifying no error
  })

  it("cancelIdleDispatch clears dispatch tracking without consuming changes", () => {
    const store = new SessionStateStore()
    const changeA: FileChange = { operation: "modify", path: "a.ts" }
    const changeB: FileChange = { operation: "modify", path: "b.ts" }

    store.addFileChanges("s1", [changeA, changeB])
    store.beginIdleDispatch("s1", [changeA])

    // Add a.ts again during dispatch (would be tracked for replay if not cancelled)
    store.addFileChanges("s1", [changeA])

    // Cancel instead of consuming
    store.cancelIdleDispatch("s1")

    // Changes should still be present (cancel doesn't consume)
    expect(store.getFileChanges("s1")).toEqual([changeA, changeB])
  })

  it("getRootSessionID resolves parent chain lazily with API fallback", async () => {
    const store = new SessionStateStore()
    store.rememberSession("c", "b")
    store.rememberSession("b", "a")

    // "a" is not remembered, so resolveParentID will be called for it
    const resolveParentID = vi.fn(async (id: string) => {
      if (id === "a") return null
      return undefined
    })

    const root = await store.getRootSessionID("c", resolveParentID)

    // Root resolves to "a" through the chain c → b → a
    expect(root).toBe("a")

    // resolveParentID should only be called for "a" (not cached)
    // "c" and "b" already have parentID set via rememberSession
    expect(resolveParentID).toHaveBeenCalledTimes(1)
    expect(resolveParentID).toHaveBeenCalledWith("a")
  })

  it("getRootSessionID detects cycles and breaks them", async () => {
    const store = new SessionStateStore()
    const resolveParentID = vi.fn(async (id: string) => {
      if (id === "a") return "b"
      if (id === "b") return "a"
      return null
    })

    const root = await store.getRootSessionID("a", resolveParentID)

    // Should resolve to some ID without infinite loop
    expect(typeof root).toBe("string")
  })

  it("rememberSession caches rootSessionID from parent", async () => {
    const store = new SessionStateStore()
    store.rememberSession("root", null)
    store.rememberSession("child", "root")

    // child's rootSessionID should be cached as "root" from parent's record
    const resolveParentID = vi.fn()
    const root = await store.getRootSessionID("child", resolveParentID)

    expect(root).toBe("root")
    // No API calls needed; rootSessionID was cached
    expect(resolveParentID).not.toHaveBeenCalled()
  })
})