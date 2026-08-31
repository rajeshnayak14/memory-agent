from datetime import datetime

from pydantic import BaseModel, Field

class MemoryRequest(BaseModel):
    content: str = Field(
        min_length=1,
        max_length=2000,
    )

class MemoryResponse(BaseModel):
    key: str
    content: str
    created_at: datetime
    updated_at: datetime


class MemoryListResponse(BaseModel):
    user_id: str
    memories: list[MemoryResponse]


class MemoryMutationResponse(BaseModel):
    message: str
    user_id: str
    key: str
    content: str | None = None


class DeleteAllMemoriesResponse(BaseModel):
    message: str
    user_id: str
    deleted_count: int