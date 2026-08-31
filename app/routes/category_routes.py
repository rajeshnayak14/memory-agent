import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import DatabaseError, ResourceNotFoundError
from app.model import Category
from app.schemas.category_schemas import (
    CategoryCreateRequest,
    CategoryListResponse,
    CategoryResponse,
    CategoryUpdateRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/categories", tags=["Categories"])


def _existing_by_name(db: Session, user_id: int, name: str, exclude_id: int | None = None):
    query = db.query(Category).filter(
        Category.user_id == user_id,
        Category.name.ilike(name),
    )
    if exclude_id is not None:
        query = query.filter(Category.id != exclude_id)
    return query.first()


@router.get("", response_model=CategoryListResponse)
def list_categories(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        categories = (
            db.query(Category)
            .filter(Category.user_id == int(user_id))
            .order_by(Category.name.asc())
            .all()
        )

    except SQLAlchemyError:
        raise DatabaseError("Database operation failed")

    return {"categories": categories}


@router.post("", response_model=CategoryResponse)
def create_category(
    request: CategoryCreateRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)

    try:
        if _existing_by_name(db, user_id_int, request.name):
            raise HTTPException(
                status_code=409,
                detail="A category with this name already exists.",
            )

        category = Category(
            user_id=user_id_int,
            name=request.name,
            icon=request.icon,
            color=request.color,
        )

        db.add(category)
        db.commit()
        db.refresh(category)

    except HTTPException:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return category


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    request: CategoryUpdateRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_id_int = int(user_id)

    try:
        category = (
            db.query(Category)
            .filter(Category.id == category_id, Category.user_id == user_id_int)
            .first()
        )

        if not category:
            raise ResourceNotFoundError("Category not found")

        if request.name is not None:
            if _existing_by_name(db, user_id_int, request.name, exclude_id=category_id):
                raise HTTPException(
                    status_code=409,
                    detail="A category with this name already exists.",
                )
            category.name = request.name

        if request.icon is not None:
            category.icon = request.icon

        if request.color is not None:
            category.color = request.color

        db.commit()
        db.refresh(category)

    except (ResourceNotFoundError, HTTPException):
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return category


@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        category = (
            db.query(Category)
            .filter(Category.id == category_id, Category.user_id == int(user_id))
            .first()
        )

        if not category:
            raise ResourceNotFoundError("Category not found")

        db.delete(category)
        db.commit()

    except ResourceNotFoundError:
        raise

    except SQLAlchemyError:
        db.rollback()
        raise DatabaseError("Database operation failed")

    return {"message": "Category deleted"}
