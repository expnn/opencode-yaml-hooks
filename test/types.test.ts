import { describe, expect, it } from "vitest"

import {
  isHookBehavior,
  isHookEvent,
  isHookLegacyCondition,
  isHookPathConditionKey,
  isHookRunIn,
  isHookScope,
} from "../src/core/types.ts"

describe("isHookEvent", () => {
  it("returns true for all session events (session.idle, session.created, session.deleted, file.changed)", () => {
    expect(isHookEvent("session.idle")).toBe(true)
    expect(isHookEvent("session.created")).toBe(true)
    expect(isHookEvent("session.deleted")).toBe(true)
    expect(isHookEvent("file.changed")).toBe(true)
  })

  it("returns true for tool.before.* events (tool.before.*, tool.before.write, tool.before.bash)", () => {
    expect(isHookEvent("tool.before.*")).toBe(true)
    expect(isHookEvent("tool.before.write")).toBe(true)
    expect(isHookEvent("tool.before.bash")).toBe(true)
  })

  it("returns true for tool.after.* events (tool.after.*, tool.after.write, tool.after.bash)", () => {
    expect(isHookEvent("tool.after.*")).toBe(true)
    expect(isHookEvent("tool.after.write")).toBe(true)
    expect(isHookEvent("tool.after.bash")).toBe(true)
  })

  it("returns false for non-event strings (nope, session, tool)", () => {
    expect(isHookEvent("nope")).toBe(false)
    expect(isHookEvent("session")).toBe(false)
    expect(isHookEvent("tool")).toBe(false)
  })

  it("returns false for non-string values (123, null, undefined, {}, [])", () => {
    expect(isHookEvent(123)).toBe(false)
    expect(isHookEvent(null)).toBe(false)
    expect(isHookEvent(undefined)).toBe(false)
    expect(isHookEvent({})).toBe(false)
    expect(isHookEvent([])).toBe(false)
  })

  it("returns false for empty string", () => {
    expect(isHookEvent("")).toBe(false)
  })
})

describe("isHookLegacyCondition", () => {
  it("returns true for matchesCodeFiles", () => {
    expect(isHookLegacyCondition("matchesCodeFiles")).toBe(true)
  })

  it("returns false for matchesCodeFile (typo)", () => {
    expect(isHookLegacyCondition("matchesCodeFile")).toBe(false)
  })

  it("returns false for non-string values", () => {
    expect(isHookLegacyCondition(123)).toBe(false)
    expect(isHookLegacyCondition(null)).toBe(false)
    expect(isHookLegacyCondition(undefined)).toBe(false)
    expect(isHookLegacyCondition({})).toBe(false)
    expect(isHookLegacyCondition([])).toBe(false)
  })

  it("returns false for empty string", () => {
    expect(isHookLegacyCondition("")).toBe(false)
  })
})

describe("isHookPathConditionKey", () => {
  it("returns true for matchesAnyPath", () => {
    expect(isHookPathConditionKey("matchesAnyPath")).toBe(true)
  })

  it("returns true for matchesAllPaths", () => {
    expect(isHookPathConditionKey("matchesAllPaths")).toBe(true)
  })

  it("returns false for matchesPath (unknown key)", () => {
    expect(isHookPathConditionKey("matchesPath")).toBe(false)
  })

  it("returns false for non-string values", () => {
    expect(isHookPathConditionKey(123)).toBe(false)
    expect(isHookPathConditionKey(null)).toBe(false)
    expect(isHookPathConditionKey(undefined)).toBe(false)
    expect(isHookPathConditionKey({})).toBe(false)
    expect(isHookPathConditionKey([])).toBe(false)
  })
})

describe("isHookScope", () => {
  it("returns true for all, main, child", () => {
    expect(isHookScope("all")).toBe(true)
    expect(isHookScope("main")).toBe(true)
    expect(isHookScope("child")).toBe(true)
  })

  it("returns false for project (unknown scope)", () => {
    expect(isHookScope("project")).toBe(false)
  })

  it("returns false for non-string values", () => {
    expect(isHookScope(123)).toBe(false)
    expect(isHookScope(null)).toBe(false)
    expect(isHookScope(undefined)).toBe(false)
    expect(isHookScope({})).toBe(false)
    expect(isHookScope([])).toBe(false)
  })
})

describe("isHookRunIn", () => {
  it("returns true for current and main", () => {
    expect(isHookRunIn("current")).toBe(true)
    expect(isHookRunIn("main")).toBe(true)
  })

  it("returns false for child (not a valid runIn)", () => {
    expect(isHookRunIn("child")).toBe(false)
  })

  it("returns false for non-string values", () => {
    expect(isHookRunIn(123)).toBe(false)
    expect(isHookRunIn(null)).toBe(false)
    expect(isHookRunIn(undefined)).toBe(false)
    expect(isHookRunIn({})).toBe(false)
    expect(isHookRunIn([])).toBe(false)
  })
})

describe("isHookBehavior", () => {
  it("returns true for stop", () => {
    expect(isHookBehavior("stop")).toBe(true)
  })

  it("returns false for abort (unknown behavior)", () => {
    expect(isHookBehavior("abort")).toBe(false)
  })

  it("returns false for non-string values", () => {
    expect(isHookBehavior(123)).toBe(false)
    expect(isHookBehavior(null)).toBe(false)
    expect(isHookBehavior(undefined)).toBe(false)
    expect(isHookBehavior({})).toBe(false)
    expect(isHookBehavior([])).toBe(false)
  })
})