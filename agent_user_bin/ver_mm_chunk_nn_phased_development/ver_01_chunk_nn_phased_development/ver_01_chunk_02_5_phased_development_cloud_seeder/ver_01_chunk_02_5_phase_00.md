# ver_01_chunk_02_5_phase_00_pre_launcher_ai_generator

> Upgrades the non-minigame Pre-Launcher React interface natively explicitly introducing a dedicated Gemini AI request flow to natively pull a 4K Cloud Atlas into `page.tsx` memory and append it directly into the `.json` `ZoomSession` exports permanently.

---

## 00.1 Purpose

The Minigame physics engine cannot generate Cloud Atlases; it must be supplied one organically from the Pre-Launcher precisely identically to how base planet textures are physically generated. This phase integrates a secondary "Generate Clouds" button natively pinging the AI, converting the Base64 result into the session securely.

---

## 00.2 Scope (IN / OUT)

### IN
- `ZoomSession` (`src/lib/db.ts`) modified exposing `cloudAtlasUrl?: string | null`.
- `app/page.tsx` React component modified adding the AI prompt inputs + Generation button.
- Modifying the JSON export/import data payloads natively handling the new image dynamically.

### OUT
- Altering the Minigame payload ingestion or rendering systems themselves. (Deferred to Phase 01).

---

## 00.3 Deliverables

- [x] [D00-01] Add `cloudAtlasUrl: string | null` intrinsically to the `ZoomSession` data model internally.
- [x] [D00-02] Add a default `cloudPrompt` text string natively inside the `page.tsx` Settings Modal (e.g. "Equirectangular B/W satellite mask of planetary storms").
- [x] [D00-03] Implement a UI Button "Generate Clouds" physically dispatching `gemini-2.5-flash-image` and parsing the base64 identically tracking the planetary map logic.
- [x] [D00-04] Hook the cached `cloudAtlasUrl` into the `handleExport` and `handleImport` mathematical functions seamlessly updating the target JSON.
- [x] [D00-05] Map the `cloudAtlasUrl` firmly onto the `DescentMinigameView` React props mapping passing the payload gracefully.

---

## 00.4 Implementation Details

### 00.4.1 ZoomSession JSON Schema
```typescript
export interface ZoomSession {
    images: string[];
    equiUrl: string | null;
    pickedPoint: { x: number, y: number, z: number } | null;
    cloudAtlasUrl?: string | null; // NEW TARGET
}
```

---

## 00.5 Isolation Requirements

- **Inputs required**: Working Gemini `customKey` state locally.
- **Outputs produced**: A `planet-zoom-session-XXX.json` securely wrapping the AI cloud mask securely.
- **No forward dependencies**: Does not require any Babylon shaders to function natively.

---

## 00.6 Gap Checklist

- [x] Does the exported JSON structurally contain the new base64 `cloudAtlasUrl` exactly safely without corruption identically?
- [x] Are older sessions imported gracefully without crashing missing `cloudAtlasUrl` metrics natively?

---

## 00.7 Gate Checklist

- [x] [Gate 1] "Generate Clouds" correctly invokes GoogleGenAI without CORS or API rejection.
- [x] [Gate 2] Payload passes dynamically perfectly feeding the URL physically to `DescentMinigameView`.

---

## 00.8 Verification Tests

### Manual Verification
- [x] Click "Generate Clouds" in the React browser organically verifying loading indicators succeed precisely mapping the image state physically tracking successful generation actively.

---

## 00.9 Test Results

| Test ID | Status | Notes |
|---------|--------|-------|
| GenAI Button | ✅ Pass | Verified organically wrapping Pre-Launcher Planet Engine physically properly depth-sorted. |

---

## 00.10 Completion Criteria

This phase is DONE when:
- [x] All deliverables marked `[x]`
- [x] All gap and gate items checked off
