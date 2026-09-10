from app.agent_resources import store

# store.search() defaults to limit=10, which silently truncated every listing
# and made bulk delete (and, later, the memory analyzer's duplicate check) a
# no-op past the first page.
SEARCH_PAGE_SIZE = 100


def search_all_memories(user_id: str):
    """Return every memory for a user, paging past the store's default limit.

    Shared by the /memories routes (listing, bulk delete) and the memory
    analyzer (duplicate-suggestion check) — one read path against the same
    global memory store, not two divergent implementations.
    """
    results = []
    offset = 0

    while True:
        page = store.search(
            ("memories", user_id),
            limit=SEARCH_PAGE_SIZE,
            offset=offset,
        )

        results.extend(page)

        if len(page) < SEARCH_PAGE_SIZE:
            return results

        offset += SEARCH_PAGE_SIZE
