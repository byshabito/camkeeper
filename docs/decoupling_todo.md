# Decoupling/Orthogonality TODO

- Extract search hover behavior into a small effect helper to keep controller free of DOM toggling logic.
- Move folder "__new__" input toggle into effects (controller should only set state).
- Introduce a tiny view-state machine (list/form/detail/folder/settings) to remove controller branching.
- Add view models for search/sort/filter state so controller does not read DOM values directly.
- Split confirm modal usage into a dialog service wrapper to decouple controller from UI wiring.
- Consider moving profile/detail rendering data prep into selectors for platform icons and link props, so effects only render.
