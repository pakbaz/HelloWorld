from datetime import datetime
from typing import Optional

from app.database import get_db
from app.models.prompt import Prompt, PromptVersion
from app.models.tag import PromptTag, Tag
from app.models.variable import Variable
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────


class VariableOut(BaseModel):
    id: int
    name: str
    default_value: Optional[str]

    model_config = {"from_attributes": True}


class TagOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class PromptBase(BaseModel):
    title: str
    body: str = ""


class PromptCreate(PromptBase):
    tag_ids: list[int] = []


class PromptUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    tag_ids: Optional[list[int]] = None


class PromptOut(PromptBase):
    id: int
    version: int
    created_at: datetime
    updated_at: datetime
    variables: list[VariableOut] = []
    tags: list[TagOut] = []

    model_config = {"from_attributes": True}


class VersionOut(BaseModel):
    id: int
    prompt_id: int
    title: str
    body: str
    version: int
    saved_at: datetime

    model_config = {"from_attributes": True}


# ── Helpers ───────────────────────────────────────────────────────────────────


def _load_prompt(db: Session, prompt_id: int) -> Prompt:
    prompt = (
        db.query(Prompt)
        .options(
            selectinload(Prompt.variables),
            selectinload(Prompt.prompt_tags).selectinload(PromptTag.tag),
        )
        .filter(Prompt.id == prompt_id)
        .first()
    )
    if prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return prompt


def _prompt_to_out(prompt: Prompt) -> PromptOut:
    return PromptOut(
        id=prompt.id,
        title=prompt.title,
        body=prompt.body,
        version=prompt.version,
        created_at=prompt.created_at,
        updated_at=prompt.updated_at,
        variables=[VariableOut.model_validate(v) for v in prompt.variables],
        tags=[TagOut.model_validate(pt.tag) for pt in prompt.prompt_tags],
    )


# ── Routes ────────────────────────────────────────────────────────────────────


@router.get("", response_model=list[PromptOut])
def list_prompts(
    q: Optional[str] = Query(None, description="Filter by title substring"),
    tag: Optional[str] = Query(None, description="Filter by tag name"),
    sort: str = Query("updated_at", description="Sort field: title | created_at | updated_at"),
    order: str = Query("desc", description="Sort order: asc | desc"),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Prompt)
        .options(
            selectinload(Prompt.variables),
            selectinload(Prompt.prompt_tags).selectinload(PromptTag.tag),
        )
    )

    if q:
        query = query.filter(Prompt.title.ilike(f"%{q}%"))

    if tag:
        query = query.join(Prompt.prompt_tags).join(PromptTag.tag).filter(Tag.name == tag)

    sort_col = {
        "title": Prompt.title,
        "created_at": Prompt.created_at,
        "updated_at": Prompt.updated_at,
    }.get(sort, Prompt.updated_at)

    if order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    return [_prompt_to_out(p) for p in query.all()]


@router.post("", response_model=PromptOut, status_code=201)
def create_prompt(payload: PromptCreate, db: Session = Depends(get_db)):
    prompt = Prompt(title=payload.title, body=payload.body, version=1)
    db.add(prompt)
    db.flush()

    for tag_id in payload.tag_ids:
        tag = db.query(Tag).filter(Tag.id == tag_id).first()
        if tag is None:
            raise HTTPException(status_code=404, detail=f"Tag {tag_id} not found")
        db.add(PromptTag(prompt_id=prompt.id, tag_id=tag_id))

    db.commit()
    db.refresh(prompt)
    return _prompt_to_out(_load_prompt(db, prompt.id))


@router.get("/{prompt_id}", response_model=PromptOut)
def get_prompt(prompt_id: int, db: Session = Depends(get_db)):
    return _prompt_to_out(_load_prompt(db, prompt_id))


@router.put("/{prompt_id}", response_model=PromptOut)
def update_prompt(prompt_id: int, payload: PromptUpdate, db: Session = Depends(get_db)):
    prompt = _load_prompt(db, prompt_id)

    # Save a version snapshot before modifying
    db.add(
        PromptVersion(
            prompt_id=prompt.id,
            title=prompt.title,
            body=prompt.body,
            version=prompt.version,
        )
    )

    if payload.title is not None:
        prompt.title = payload.title
    if payload.body is not None:
        prompt.body = payload.body

    prompt.version += 1

    if payload.tag_ids is not None:
        db.query(PromptTag).filter(PromptTag.prompt_id == prompt_id).delete()
        for tag_id in payload.tag_ids:
            tag = db.query(Tag).filter(Tag.id == tag_id).first()
            if tag is None:
                raise HTTPException(status_code=404, detail=f"Tag {tag_id} not found")
            db.add(PromptTag(prompt_id=prompt.id, tag_id=tag_id))

    db.commit()
    db.refresh(prompt)
    return _prompt_to_out(_load_prompt(db, prompt.id))


@router.delete("/{prompt_id}", status_code=204)
def delete_prompt(prompt_id: int, db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    db.delete(prompt)
    db.commit()


@router.get("/{prompt_id}/versions", response_model=list[VersionOut])
def list_versions(prompt_id: int, db: Session = Depends(get_db)):
    _load_prompt(db, prompt_id)
    versions = (
        db.query(PromptVersion)
        .filter(PromptVersion.prompt_id == prompt_id)
        .order_by(PromptVersion.version.desc())
        .all()
    )
    return [VersionOut.model_validate(v) for v in versions]


@router.post("/{prompt_id}/versions/{version_id}/restore", response_model=PromptOut)
def restore_version(prompt_id: int, version_id: int, db: Session = Depends(get_db)):
    snapshot = (
        db.query(PromptVersion)
        .filter(
            PromptVersion.prompt_id == prompt_id,
            PromptVersion.id == version_id,
        )
        .first()
    )
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Version not found")

    prompt = _load_prompt(db, prompt_id)

    # Save current state as a version snapshot
    db.add(
        PromptVersion(
            prompt_id=prompt.id,
            title=prompt.title,
            body=prompt.body,
            version=prompt.version,
        )
    )

    prompt.title = snapshot.title
    prompt.body = snapshot.body
    prompt.version += 1

    db.commit()
    db.refresh(prompt)
    return _prompt_to_out(_load_prompt(db, prompt.id))


@router.post("/{prompt_id}/tags/{tag_id}", response_model=PromptOut)
def add_tag_to_prompt(prompt_id: int, tag_id: int, db: Session = Depends(get_db)):
    prompt = _load_prompt(db, prompt_id)
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")

    existing = (
        db.query(PromptTag)
        .filter(PromptTag.prompt_id == prompt_id, PromptTag.tag_id == tag_id)
        .first()
    )
    if existing is None:
        db.add(PromptTag(prompt_id=prompt_id, tag_id=tag_id))
        db.commit()

    return _prompt_to_out(_load_prompt(db, prompt_id))


@router.delete("/{prompt_id}/tags/{tag_id}", response_model=PromptOut)
def remove_tag_from_prompt(prompt_id: int, tag_id: int, db: Session = Depends(get_db)):
    _load_prompt(db, prompt_id)
    db.query(PromptTag).filter(
        PromptTag.prompt_id == prompt_id, PromptTag.tag_id == tag_id
    ).delete()
    db.commit()
    return _prompt_to_out(_load_prompt(db, prompt_id))
