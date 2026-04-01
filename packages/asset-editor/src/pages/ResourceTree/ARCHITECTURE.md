# Resource Tree Architecture

## Overview

This is an enterprise-grade virtual tree component designed to handle **hundreds of thousands of nodes** with optimal performance.

## Key Design Principles

### 1. Single Source of Truth
- All state managed through **useReducer** with a pure reducer function
- No scattered useState calls
- Clear action-based API

### 2. Derived State (No useEffect Syncing)
- `visiblePaths` is computed from `nodes` using `useMemo`
- **NEVER** use useEffect to sync state from other state
- This eliminates cascading updates

### 3. Pure Functions
- `treeReducer`: Pure state transitions
- `computeVisiblePaths`: Pure computation of visible nodes
- No side effects in reducer

### 4. Clear State Machine
```
Folder States:
- IDLE → (user clicks) → LOADING → LOADED → EXPANDED
- EXPANDED → (user clicks) → COLLAPSED
```

### 5. No Nested State Updates
- Actions are atomic
- Async operations (loading) dispatch actions when done
- No setNodes inside setNodes callbacks

## Architecture Layers

```
┌─────────────────────────────────────┐
│   ResourceTree.tsx (UI Layer)      │
│   - Rendering                        │
│   - Virtual scrolling                │
│   - User interactions                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   useResourceTree.ts (Hook Layer)   │
│   - State management                 │
│   - Business logic                   │
│   - Data fetching                    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   treeReducer.ts (State Layer)      │
│   - Pure reducer                     │
│   - State transitions                │
│   - Computed values                  │
└─────────────────────────────────────┘
```

## State Structure

```typescript
interface TreeState {
  nodes: ReadonlyMap<string, FlatNode>;
  folderStates: ReadonlyMap<string, FolderLoadState>;
  rootPath: string;
  isInitializing: boolean;
}
```

### Why ReadonlyMap?
- Immutability enforced at type level
- Prevents accidental mutations
- Forces creation of new Maps for updates (structural sharing)

## Actions

All state changes go through typed actions:

```typescript
| INIT_START
| INIT_SUCCESS
| INIT_ERROR
| EXPAND_FOLDER
| COLLAPSE_FOLDER
| LOAD_FOLDER_START
| LOAD_FOLDER_SUCCESS
| LOAD_FOLDER_ERROR
| LOAD_MORE_START
| LOAD_MORE_SUCCESS
| REFRESH_FOLDER_START
| REFRESH_FOLDER_SUCCESS
| UPDATE_NODE
```

## Performance Optimizations

### 1. Virtual Scrolling
- Only renders visible rows
- Uses @tanstack/react-virtual
- Handles millions of nodes

### 2. Memoization
```typescript
const visiblePaths = useMemo(() => {
  return computeVisiblePaths(state.nodes, state.rootPath);
}, [state.nodes, state.rootPath]);
```

### 3. Structural Sharing
- Only creates new Map when nodes change
- Unchanged nodes remain the same reference
- React.memo on VirtualRow prevents re-renders

### 4. Lazy Loading
- Folders load children on demand
- Pagination support (100 items per page)
- Auto-load when scrolling or viewport is not full

### 5. De-duplication
- Active load tracking prevents duplicate requests
- If folder is already loading, await existing promise

## Data Flow

### User Clicks Folder

```
1. User clicks folder
   ↓
2. ResourceTree calls toggleExpand(path)
   ↓
3. useResourceTree checks if loaded
   ↓
4. If not loaded:
   - dispatch LOAD_FOLDER_START
   - fetchChildren()
   - dispatch LOAD_FOLDER_SUCCESS with data
   ↓
5. Reducer updates state immutably
   ↓
6. useMemo recomputes visiblePaths
   ↓
7. Component re-renders with new visiblePaths
   ↓
8. Virtual scroller updates visible rows
```

### Key Points:
- **One state update** (not 3-4 like before)
- **No useEffect cascades**
- **Synchronous state transitions**
- **Async only for data fetching**

## Common Pitfalls to Avoid

### ❌ DON'T: Use useEffect to sync state
```typescript
// BAD - causes cascading updates
useEffect(() => {
  const visible = rebuildVisiblePaths(nodes);
  setVisiblePaths(visible);
}, [nodes]);
```

### ✅ DO: Use useMemo for derived state
```typescript
// GOOD - computed once per render
const visiblePaths = useMemo(() => {
  return computeVisiblePaths(nodes, rootPath);
}, [nodes, rootPath]);
```

### ❌ DON'T: Nested state updates
```typescript
// BAD - setState inside setState
setNodes(current => {
  loadFolder(path, current).then(loaded => {
    setNodes(loaded); // NESTED!
  });
  return current;
});
```

### ✅ DO: Dispatch actions
```typescript
// GOOD - clear action flow
dispatch({ type: 'LOAD_FOLDER_START', path });
const result = await fetchChildren(path);
dispatch({ type: 'LOAD_FOLDER_SUCCESS', path, children: result.nodes });
```

### ❌ DON'T: Multiple sources of truth
```typescript
// BAD
const [nodes, setNodes] = useState();
const [visiblePaths, setVisiblePaths] = useState();
const folderStates = useRef();
```

### ✅ DO: Single reducer state
```typescript
// GOOD
const [state, dispatch] = useReducer(treeReducer, initialState);
const visiblePaths = useMemo(() => compute(state.nodes), [state.nodes]);
```

## Testing Strategy

### Unit Tests
- Test reducer with all actions
- Test computeVisiblePaths with various tree shapes
- Test edge cases (empty tree, single node, deep nesting)

### Integration Tests
- Test expand/collapse behavior
- Test lazy loading
- Test pagination
- Test error handling

### Performance Tests
- Measure render time with 10k, 100k, 1M nodes
- Measure memory usage
- Measure scroll performance

## Migration Guide

### Old Code → New Code

| Old | New |
|-----|-----|
| `setNodes(...)` | `dispatch({ type: 'UPDATE_NODE', ... })` |
| `rebuildVisiblePaths()` | Automatic via `useMemo` |
| Nested `setNodes` | Sequential `dispatch` calls |
| `toggleExpandInProgress` ref | Handled in `activeLoads` ref |
| Complex merge logic | Handled in reducer |

## Future Enhancements

1. **Virtualized Depth**: Only expand folders near viewport
2. **Incremental Loading**: Stream children as they load
3. **Search**: Fast path-based search
4. **Drag & Drop**: Move nodes between folders
5. **Multi-select**: Batch operations
6. **Keyboard Navigation**: Arrow keys, home, end
7. **Caching**: Cache folder contents for faster re-expansion

## Troubleshooting

### Issue: Folder not expanding
- Check: Is `LOAD_FOLDER_SUCCESS` dispatched?
- Check: Are children added to node.children?
- Check: Is `isExpanded` set to true?

### Issue: Duplicate renders
- Check: No useEffect syncing state
- Check: useMemo dependencies are minimal
- Check: React.memo on VirtualRow

### Issue: Performance degradation
- Check: Virtual scroller is working
- Check: Row height is constant
- Check: Memoization is effective

## References

- [React useReducer](https://react.dev/reference/react/useReducer)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
- [Immutable Data](https://redux.js.org/usage/structuring-reducers/immutable-update-patterns)
