from datetime import datetime

from pydantic import BaseModel, Field


class CategoryResponse(BaseModel):
    id: int
    name: str
    icon: str
    color: str
    created_at: datetime


class CategoryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    icon: str = Field(default="Tag", max_length=50)
    color: str = Field(default="#1f4d3b", min_length=4, max_length=7)


class CategoryUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    icon: str | None = Field(default=None, max_length=50)
    color: str | None = Field(default=None, min_length=4, max_length=7)


class CategoryListResponse(BaseModel):
    categories: list[CategoryResponse]
