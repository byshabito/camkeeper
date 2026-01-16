# Layer Slimming Refactor Plan

## Goals

- Keep UI/controllers focused on DOM wiring and view state.
- Keep domain logic pure and reusable (no storage or chrome APIs).
- Keep repos thin (persistence only, no shaping or migration logic).
- Keep background entry/controller focused on event wiring.

## Current Pain Points (Targets)

- `src/ui/popup/actions.js` mixes UI orchestration, validation, and persistence.
- `src/repo/profiles.js` mixes storage with legacy migration and enrichment.
- `src/background/controller.js` contains use-case logic (quick add flow).
- `src/domain/urls.js` and `src/domain/sanitizers.js` depend on site registry state.

## Proposed Layer Boundaries

### UI Layer (`src/ui`)

- Responsibilities: DOM wiring, view state, rendering helpers, view models.
- May call: domain + repo (via use-case services).
- Must not: call storage directly or perform data migrations.

### Domain Layer (`src/domain`)

- Responsibilities: pure logic, validation, data shaping, migrations, parsing.
- Inputs: plain data, no chrome/storage globals.
- Outputs: pure objects, no side effects.

### Repo Layer (`src/repo`)

- Responsibilities: read/write storage, caching if necessary.
- Inputs: already-sanitized data.
- Outputs: raw or normalized data.

### Background Layer (`src/background`)

- Responsibilities: chrome event wiring, scheduling, messaging.
- May call: repo + domain use-cases.
- Must not: hold heavy logic inline in controller.

## Detailed Refactor Steps

1. **Introduce a use-case layer**
   - Add `src/useCases/` for cross-layer orchestration.
   - Each file represents a single user/system action.
   - Example files:
     - `src/useCases/saveProfileForm.js`
     - `src/useCases/mergeProfiles.js`
     - `src/useCases/quickAddProfile.js`
     - `src/useCases/loadListPreferences.js`

2. **Split `ui/popup/actions.js` into use-cases**
   - Move validation + merge logic into domain or use-cases.
   - UI calls a small number of use-case functions.
   - Result: popup controller only coordinates view state + calls use-cases.

3. **Move repo migration logic into domain**
   - Extract legacy profile migrations from `repo/profiles.js` to `domain/migrations/profiles.js`.
   - Repo reads raw data and delegates to migration helpers for normalization.
   - Repo should not create IDs or timestamps; that moves to domain.

4. **Make domain functions pure**
   - Change `domain/urls.js` and `domain/sanitizers.js` to accept `sites` data explicitly.
   - Remove implicit dependency on registry state where possible.
   - Create `domain/siteRegistry.js` only if registry is unavoidable, and keep it isolated.

5. **Slim background controller**
   - Extract `quickAddFromActiveTab` into `useCases/quickAddProfile.js`.
   - Controller only wires events and calls use-cases.

6. **Update import boundaries**
   - UI imports from `useCases/` or `domain/` directly.
   - Background imports from `useCases/` or `repo/`.
   - Repo imports only from `domain/` (pure helpers).

7. **Add/update tests**
   - Move existing UI action tests to use-case tests in `tests/useCases/`.
   - Add unit tests for migration helpers in `tests/domain/migrations/`.
   - Keep existing UI tests focused on rendering and DOM behaviors.

## Next Slimming Plan (Priority Order)

### 1) Repo Layer (first)

- Move view-history update logic out of `src/repo/profiles.js` into a domain helper.
- Keep repo functions as storage-only (get/save/delete), with normalization delegated to domain.
- Update repo tests to ensure storage behavior is unchanged.

### 2) Domain Layer

- Move legacy URL parsing from `src/useCases/quickAddProfile.js` into `src/domain/urls.js`.
- Split sanitizers into pure transforms vs. site-aware helpers.
- Add focused unit tests for the new helpers.

### 3) Background Layer

- Extract URL parsing and profile-view updates out of `src/background/visits.js` into domain helpers.
- Keep background files as event wiring only.
- Update background tests to cover the new helper entry points.

### 4) UI Layer

- Split `src/ui/controllers/popupController.js` into subcontrollers (list/detail/form/folder/settings).
- Extract icon cache handling into `src/ui/services/iconCache.js`.
- Keep the top-level popup controller as a thin coordinator.

## Suggested Execution Order (Remaining)

1. Repo layer slimming
2. Domain helper extraction
3. Background wiring cleanup
4. UI controller splitting

## Success Criteria

- UI controllers contain only DOM wiring and view state transitions.
- Repo modules contain only persistence and minimal normalization.
- Domain modules are pure and input-driven.
- Background controller only wires listeners and delegates logic.
- All tests pass.
