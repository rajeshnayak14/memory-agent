import logging
from uuid import uuid4

from fastapi import APIRouter, Depends

from app.agent import store
from app.dependencies import get_current_user
from app.exceptions import (
    DatabaseError,
    MemoryNotFoundError,
)
from app.schemas.memory_schemas import (
    MemoryRequest,
    MemoryListResponse,
    MemoryMutationResponse,
    DeleteAllMemoriesResponse,
)


logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Memories"],
)

# store.search() defaults to limit=10, which silently truncated every listing
# and made bulk delete a no-op past the first page.
SEARCH_PAGE_SIZE = 100


def search_all_memories(user_id: str):
    """Return every memory for a user, paging past the store's default limit."""
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


@router.get(
    "/memories",
    response_model=MemoryListResponse,
)
def get_memories(
    user_id: str = Depends(get_current_user),
):
    try:
        memories = search_all_memories(user_id)
    except Exception:
        raise DatabaseError("Memory store operation failed")

    logger.info(
        "Memories retrieved: user_id=%s count=%s",
        user_id,
        len(memories),
    )

    return {
        "user_id": user_id,
        "memories": [
            {
                "key": memory.key,
                "content": memory.value.get("content"),
                "created_at": memory.created_at,
                "updated_at": memory.updated_at,
            }
            for memory in memories
        ],
    }


@router.post(
    "/memories",
    response_model=MemoryMutationResponse,
)
def create_memory(
    request: MemoryRequest,
    user_id: str = Depends(get_current_user),
):
    memory_key = str(uuid4())

    try:
        store.put(
            ("memories", user_id),
            memory_key,
            {"content": request.content},
        )
    except Exception:
        raise DatabaseError("Memory store operation failed")

    logger.info(
        "Memory created: user_id=%s key=%s",
        user_id,
        memory_key,
    )

    return {
        "message": "Memory created",
        "user_id": user_id,
        "key": memory_key,
        "content": request.content,
    }


@router.delete(
    "/memories",
    response_model=DeleteAllMemoriesResponse,
)
def delete_memories(
    user_id: str = Depends(get_current_user),
):
    try:
        memories = search_all_memories(user_id)

        for memory in memories:
            store.delete(
                ("memories", user_id),
                memory.key,
            )

    except Exception:
        raise DatabaseError("Memory store operation failed")

    logger.info(
        "All memories deleted: user_id=%s count=%s",
        user_id,
        len(memories),
    )

    return {
        "message": "Memories deleted",
        "user_id": user_id,
        "deleted_count": len(memories),
    }


@router.delete(
    "/memories/{memory_id}",
    response_model=MemoryMutationResponse,
)
def delete_memory(
    memory_id: str,
    user_id: str = Depends(get_current_user),
):
    try:
        memory = store.get(("memories", user_id), memory_id)
    except Exception:
        raise DatabaseError("Memory store operation failed")

    if not memory:
        raise MemoryNotFoundError("Memory not found")

    try:
        store.delete(
            ("memories", user_id),
            memory_id,
        )
    except Exception:
        raise DatabaseError("Memory store operation failed")

    logger.info(
        "Memory deleted: user_id=%s key=%s",
        user_id,
        memory_id,
    )

    return {
        "message": "Memory deleted",
        "user_id": user_id,
        "key": memory_id,
    }


@router.put(
    "/memories/{memory_id}",
    response_model=MemoryMutationResponse,
)
def update_memory(
    memory_id: str,
    request: MemoryRequest,
    user_id: str = Depends(get_current_user),
):
    try:
        memory = store.get(("memories", user_id), memory_id)
    except Exception:
        raise DatabaseError("Memory store operation failed")

    if not memory:
        raise MemoryNotFoundError("Memory not found")

    try:
        store.put(
            ("memories", user_id),
            memory_id,
            {"content": request.content},
        )
    except Exception:
        raise DatabaseError("Memory store operation failed")

    logger.info(
        "Memory updated: user_id=%s key=%s",
        user_id,
        memory_id,
    )

    return {
        "message": "Memory updated",
        "user_id": user_id,
        "key": memory_id,
        "content": request.content,
    }