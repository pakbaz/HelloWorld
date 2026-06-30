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


class PromptImportRecord(BaseModel):
    id: Optional[int] = None
    title: str
    body: str
    version: int = 1
    deleted: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    tags: list[TagOut] = []
    variables: list[VariableOut] = []
    versions: list[VersionOut] = []


class PromptDataset(BaseModel):
    schemaVersion: int
    exportedAt: datetime
    prompts: list[PromptImportRecord]


class ImportSummaryOut(BaseModel):
    total: int
    created: int
    skipped: int
    errors: list[str] = []


class BulkDeleteRequest(BaseModel):
    prompt_ids: list[int]


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


def _prompt_to_export_record(prompt: Prompt, db: Session) -> PromptImportRecord:
    versions = (
        db.query(PromptVersion)
        .filter(PromptVersion.prompt_id == prompt.id)
        .order_by(PromptVersion.version.asc())
        .all()
    )
    return PromptImportRecord(
        id=prompt.id,
        title=prompt.title,
        body=prompt.body,
        version=prompt.version,
        deleted=prompt.deleted,
        created_at=prompt.created_at,
        updated_at=prompt.updated_at,
        tags=[TagOut.model_validate(pt.tag) for pt in prompt.prompt_tags],
        variables=[VariableOut.model_validate(v) for v in prompt.variables],
        versions=[VersionOut.model_validate(v) for v in versions],
    )


def _normalize_prompt_identity(title: str, body: str) -> str:
    normalized_title = " ".join(title.strip().lower().split())
    normalized_body = " ".join(body.strip().lower().split())
    return f"{normalized_title}::{normalized_body}"


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


@router.get("/export")
def export_prompts(db: Session = Depends(get_db)):
    prompts = (
        db.query(Prompt)
        .options(
            selectinload(Prompt.variables),
            selectinload(Prompt.prompt_tags).selectinload(PromptTag.tag),
        )
        .order_by(Prompt.id.asc())
        .all()
    )
    return PromptDataset(
        schemaVersion=1,
        exportedAt=datetime.utcnow(),
        prompts=[_prompt_to_export_record(prompt, db) for prompt in prompts],
    )


@router.post("/import", response_model=ImportSummaryOut)
def import_prompts(payload: PromptDataset, db: Session = Depends(get_db)):
    summary = ImportSummaryOut(total=len(payload.prompts), created=0, skipped=0, errors=[])
    existing_ids = {
        _normalize_prompt_identity(prompt.title, prompt.body)
        for prompt in db.query(Prompt).filter(Prompt.deleted.is_(False)).all()
    }

    for record in payload.prompts:
        identity = _normalize_prompt_identity(record.title, record.body)
        if identity in existing_ids:
            summary.skipped += 1
            continue

        try:
            prompt = Prompt(
                title=record.title,
                body=record.body,
                version=record.version,
                deleted=record.deleted,
                created_at=record.created_at or datetime.utcnow(),
                updated_at=record.updated_at or datetime.utcnow(),
            )
            db.add(prompt)
            db.flush()

            for variable in record.variables:
                db.add(
                    Variable(
                        prompt_id=prompt.id,
                        name=variable.name,
                        default_value=variable.default_value,
                    )
                )

            for tag in record.tags:
                existing_tag = db.query(Tag).filter(Tag.name == tag.name).first()
                if existing_tag is None:
                    existing_tag = Tag(name=tag.name)
                    db.add(existing_tag)
                    db.flush()
                db.add(PromptTag(prompt_id=prompt.id, tag_id=existing_tag.id))

            for version in record.versions:
                db.add(
                    PromptVersion(
                        prompt_id=prompt.id,
                        version=version.version,
                        title=version.title,
                        body=version.body,
                        saved_at=version.saved_at,
                    )
                )

            db.commit()
            existing_ids.add(identity)
            summary.created += 1
        except Exception as exc:  # pragma: no cover - defensive import handling
            db.rollback()
            summary.errors.append(f"{record.title}: {exc}")

    return summary


@router.post("/bulk-delete", status_code=204)
def bulk_delete_prompts(payload: BulkDeleteRequest, db: Session = Depends(get_db)):
    db.query(Prompt).filter(Prompt.id.in_(payload.prompt_ids)).delete(synchronize_session=False)
    db.commit()


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
