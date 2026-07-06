import { describe, expect, it } from "vitest"

import {
  MUTATION_TOOL_NAMES,
  getChangedPaths,
  getMutationToolHookNames,
  getToolAffectedPaths,
  getToolFileChanges,
  normalizeMutationToolName,
} from "../src/core/tool-paths.ts"

describe("normalizeMutationToolName", () => {
  it("returns normalized name for direct mutation tools (write, edit, multiedit)", () => {
    expect(normalizeMutationToolName("write")).toBe("write")
    expect(normalizeMutationToolName("edit")).toBe("edit")
    expect(normalizeMutationToolName("multiedit")).toBe("multiedit")
  })

  it('returns "apply_patch" for patch and apply_patch', () => {
    expect(normalizeMutationToolName("patch")).toBe("apply_patch")
    expect(normalizeMutationToolName("apply_patch")).toBe("apply_patch")
  })

  it('returns "bash" for bash', () => {
    expect(normalizeMutationToolName("bash")).toBe("bash")
  })

  it("returns undefined for unknown tool names", () => {
    expect(normalizeMutationToolName("unknown")).toBeUndefined()
    expect(normalizeMutationToolName("read")).toBeUndefined()
    expect(normalizeMutationToolName("")).toBeUndefined()
  })
})

describe("getMutationToolHookNames", () => {
  it("returns [patch, apply_patch] for patch tool", () => {
    expect(getMutationToolHookNames("patch")).toEqual(["patch", "apply_patch"])
  })

  it("returns [patch, apply_patch] for apply_patch tool", () => {
    expect(getMutationToolHookNames("apply_patch")).toEqual(["patch", "apply_patch"])
  })

  it("returns [bash] for bash tool", () => {
    expect(getMutationToolHookNames("bash")).toEqual(["bash"])
  })

  it("returns [write] for write tool", () => {
    expect(getMutationToolHookNames("write")).toEqual(["write"])
  })

  it("returns [] for unknown tool", () => {
    expect(getMutationToolHookNames("unknown")).toEqual([])
    expect(getMutationToolHookNames("")).toEqual([])
  })
})

describe("getToolFileChanges", () => {
  describe("direct mutation tools (write, edit, multiedit)", () => {
    it("returns modify change for write with filePath", () => {
      expect(getToolFileChanges("write", { filePath: "/path/to/file.ts" })).toEqual([
        { operation: "modify", path: "/path/to/file.ts" },
      ])
    })

    it("returns modify change for edit with file_path alias", () => {
      expect(getToolFileChanges("edit", { file_path: "/path/to/file.ts" })).toEqual([
        { operation: "modify", path: "/path/to/file.ts" },
      ])
    })

    it("returns modify change for multiedit with path alias", () => {
      expect(getToolFileChanges("multiedit", { path: "/path/to/file.ts" })).toEqual([
        { operation: "modify", path: "/path/to/file.ts" },
      ])
    })

    it("returns modify change for write with file alias", () => {
      expect(getToolFileChanges("write", { file: "/path/to/file.ts" })).toEqual([
        { operation: "modify", path: "/path/to/file.ts" },
      ])
    })

    it("returns empty array when filePath is missing for direct mutation tool", () => {
      // No args at all
      expect(getToolFileChanges("write", {})).toEqual([])
      // Empty string
      expect(getToolFileChanges("edit", { filePath: "" })).toEqual([])
      // Whitespace only
      expect(getToolFileChanges("multiedit", { filePath: "   " })).toEqual([])
      // Wrong type (number)
      expect(getToolFileChanges("write", { filePath: 123 })).toEqual([])
    })
  })

  describe("unknown tool", () => {
    it("returns empty array for unknown tool", () => {
      expect(getToolFileChanges("unknown", { filePath: "/path" })).toEqual([])
      expect(getToolFileChanges("read", { filePath: "/path" })).toEqual([])
    })
  })

  describe("patch / apply_patch", () => {
    it('parses patchText for apply_patch with Add File directive \u2192 create change', () => {
      const patchText = "*** Add File: src/new.ts\nsome content"
      expect(getToolFileChanges("apply_patch", { patchText })).toEqual([
        { operation: "create", path: "src/new.ts" },
      ])
    })

    it('parses patchText for apply_patch with Delete File directive \u2192 delete change', () => {
      const patchText = "*** Delete File: old.ts"
      expect(getToolFileChanges("apply_patch", { patchText })).toEqual([
        { operation: "delete", path: "old.ts" },
      ])
    })

    it('parses patchText for apply_patch with Update + Move to \u2192 rename change', () => {
      const patchText = "*** Update File: src/old.ts\n*** Move to: src/new.ts"
      expect(getToolFileChanges("apply_patch", { patchText })).toEqual([
        { operation: "rename", fromPath: "src/old.ts", toPath: "src/new.ts" },
      ])
    })

    it('parses patchText for apply_patch with Update only (no Move to) \u2192 modify change', () => {
      const patchText = "*** Update File: src/file.ts\nsome modified content"
      expect(getToolFileChanges("apply_patch", { patchText })).toEqual([
        { operation: "modify", path: "src/file.ts" },
      ])
    })

    it("uses patch alias for apply_patch", () => {
      const patchText = "*** Add File: from-patch.txt"
      expect(getToolFileChanges("apply_patch", { patch: patchText })).toEqual([
        { operation: "create", path: "from-patch.txt" },
      ])
    })

    it("uses diff alias for apply_patch", () => {
      const patchText = "*** Add File: from-diff.txt"
      expect(getToolFileChanges("apply_patch", { diff: patchText })).toEqual([
        { operation: "create", path: "from-diff.txt" },
      ])
    })

    it("returns empty array for apply_patch when no patch text", () => {
      expect(getToolFileChanges("apply_patch", {})).toEqual([])
      expect(getToolFileChanges("apply_patch", { patchText: "" })).toEqual([])
      expect(getToolFileChanges("apply_patch", { patchText: "   " })).toEqual([])
      // Non-string value
      expect(getToolFileChanges("apply_patch", { patchText: 42 })).toEqual([])
    })
  })

  describe("bash", () => {
    it("parses bash command for rm \u2192 delete change", () => {
      expect(getToolFileChanges("bash", { command: "rm old.log" })).toEqual([
        { operation: "delete", path: "old.log" },
      ])
    })

    it("parses bash command for mv \u2192 rename change", () => {
      expect(getToolFileChanges("bash", { command: "mv a.txt b.txt" })).toEqual([
        { operation: "rename", fromPath: "a.txt", toPath: "b.txt" },
      ])
    })

    it("parses bash command for cp \u2192 create change", () => {
      expect(getToolFileChanges("bash", { command: "cp source.ts dest.ts" })).toEqual([
        { operation: "create", path: "dest.ts" },
      ])
    })

    it("parses bash command for touch/mkdir \u2192 create change", () => {
      expect(getToolFileChanges("bash", { command: "touch newfile.txt" })).toEqual([
        { operation: "create", path: "newfile.txt" },
      ])
      expect(getToolFileChanges("bash", { command: "mkdir dist" })).toEqual([
        { operation: "create", path: "dist" },
      ])
    })

    it("parses bash command for git rm \u2192 delete change", () => {
      expect(getToolFileChanges("bash", { command: "git rm tracked.ts" })).toEqual([
        { operation: "delete", path: "tracked.ts" },
      ])
    })

    it("parses bash command for git mv \u2192 rename change", () => {
      expect(getToolFileChanges("bash", { command: "git mv old.ts new.ts" })).toEqual([
        { operation: "rename", fromPath: "old.ts", toPath: "new.ts" },
      ])
    })

    it("uses cmd alias for bash tool", () => {
      expect(getToolFileChanges("bash", { cmd: "touch from-cmd.txt" })).toEqual([
        { operation: "create", path: "from-cmd.txt" },
      ])
    })

    it("returns empty array for bash when no command", () => {
      expect(getToolFileChanges("bash", {})).toEqual([])
      expect(getToolFileChanges("bash", { command: "" })).toEqual([])
      expect(getToolFileChanges("bash", { command: "   " })).toEqual([])
      // Non-string value
      expect(getToolFileChanges("bash", { command: true })).toEqual([])
    })

    it("handles multi-command bash (&&, ||, ;) producing multiple changes", () => {
      const result = getToolFileChanges("bash", {
        command: "rm a.log && mv b.txt c.txt || touch d.txt; mkdir e",
      })
      expect(result).toContainEqual({ operation: "delete", path: "a.log" })
      expect(result).toContainEqual({ operation: "rename", fromPath: "b.txt", toPath: "c.txt" })
      expect(result).toContainEqual({ operation: "create", path: "d.txt" })
      expect(result).toContainEqual({ operation: "create", path: "e" })
    })

    it("handles bash command with flags (rm -rf path) \u2192 only path extracted", () => {
      expect(getToolFileChanges("bash", { command: "rm -rf node_modules" })).toEqual([
        { operation: "delete", path: "node_modules" },
      ])
    })

    it('handles bash command with -- separator (rm -rf -- -x file) \u2192 -x and file extracted as paths', () => {
      const result = getToolFileChanges("bash", { command: "rm -rf -- -x file" })
      expect(result).toContainEqual({ operation: "delete", path: "-x" })
      expect(result).toContainEqual({ operation: "delete", path: "file" })
    })
  })
})

describe("getChangedPaths", () => {
  it("returns modify path from modify change", () => {
    expect(getChangedPaths([{ operation: "modify", path: "src/main.ts" }])).toEqual(["src/main.ts"])
  })

  it("returns both fromPath and toPath from rename change", () => {
    expect(
      getChangedPaths([{ operation: "rename", fromPath: "src/old.ts", toPath: "src/new.ts" }]),
    ).toEqual(["src/old.ts", "src/new.ts"])
  })

  it("deduplicates identical paths", () => {
    expect(
      getChangedPaths([
        { operation: "modify", path: "shared.ts" },
        { operation: "modify", path: "shared.ts" },
        { operation: "rename", fromPath: "shared.ts", toPath: "other.ts" },
      ]),
    ).toEqual(["shared.ts", "other.ts"])
  })

  it("skips changes with empty path", () => {
    expect(
      getChangedPaths([
        // @ts-expect-error empty path is not a valid state but we guard against it
        { operation: "modify", path: "" },
      ]),
    ).toEqual([])
  })

  it("returns empty array for empty input", () => {
    expect(getChangedPaths([])).toEqual([])
  })
})

describe("getToolAffectedPaths", () => {
  it("returns correct paths for write tool with filePath", () => {
    expect(getToolAffectedPaths("write", { filePath: "/src/app.ts" })).toEqual(["/src/app.ts"])
  })

  it("returns correct paths for apply_patch with patchText containing multiple operations", () => {
    const patchText = [
      "*** Add File: src/new.ts",
      "*** Update File: src/existing.ts",
      "*** Move to: src/renamed.ts",
      "*** Delete File: src/old.ts",
    ].join("\n")

    const paths = getToolAffectedPaths("apply_patch", { patchText })
    expect(paths).toContain("src/new.ts")
    expect(paths).toContain("src/existing.ts")
    expect(paths).toContain("src/renamed.ts")
    expect(paths).toContain("src/old.ts")
    expect(paths).toHaveLength(4)
  })

  it("returns empty array for unknown tool", () => {
    expect(getToolAffectedPaths("unknown", { filePath: "/path" })).toEqual([])
  })
})