# useEffect Hooks Refactoring

This directory contains custom hooks that were extracted from the main `New.tsx` component to improve code organization and maintainability.

## Overview

The original component had multiple useEffect hooks that handled different concerns. These have been extracted into focused, single-responsibility custom hooks:

## Custom Hooks

### 1. `useDraftLoader`

**Purpose**: Handles loading draft data from the database when a draftId is present in the URL.

**Responsibilities**:
- Checks for draftId in URL parameters
- Loads draft data from the database via `useAppointmentDraft`
- Handles success and error states
- Manages the draft loaded state
- Only runs when `USE_DRAFT_DATABASE` is enabled

**Usage**:
```tsx
useDraftLoader({
  draftIdFromUrl,
  setFormStorage,
  setDraftLoaded,
});
```

### 2. `useFormReset`

**Purpose**: Resets the form with draft data while ensuring proper default values for therapist fields.

**Responsibilities**:
- Resets form only once when draft is loaded (using `useRef` to track)
- Ensures therapist fields have default empty values (they're not saved in storage)
- Handles both single therapist and series visits therapist fields
- Resets the flag when a new draft is loaded

**Usage**:
```tsx
useFormReset({
  form,
  formStorage,
  draftLoaded,
});
```

### 3. `useNavigationGuard`

**Purpose**: Handles route change detection and session storage cleanup.

**Responsibilities**:
- Listens to 'before' navigation events to intercept route changes
- Determines if navigation should be allowed or intercepted
- Cleans up session storage when navigating away
- Prevents duplicate confirmation dialogs with `isNavigateConfirm` flag
- Also handles 'navigate' events for comprehensive coverage

**Usage**:
```tsx
useNavigationGuard({
  globalProps,
  pageURL,
  isSuccessBooked,
  isNavigateConfirm,
  setIsNavigateConfirm,
});
```

## Benefits of This Refactoring

1. **Separation of Concerns**: Each hook has a single, clear responsibility
2. **Better Readability**: The main component is now cleaner and easier to understand
3. **Reusability**: Hooks can be reused in other components if needed
4. **Easier Testing**: Each hook can be tested independently
5. **Better Documentation**: Each hook has comprehensive JSDoc comments
6. **Maintainability**: Changes to specific functionality are isolated to their respective hooks

## Key Patterns Used

1. **Custom Hooks for useEffect**: Extracting complex useEffect logic into custom hooks
2. **Dependency Arrays**: Properly managed dependencies to prevent infinite loops
3. **Cleanup Functions**: Proper cleanup of event listeners and side effects
4. **State Management**: Careful state management to avoid race conditions
5. **TypeScript Interfaces**: Clear type definitions for hook parameters

## Migration Notes

- All original functionality has been preserved
- The component's external API remains unchanged
- No breaking changes to the component's behavior
- Improved error handling and logging in each hook
