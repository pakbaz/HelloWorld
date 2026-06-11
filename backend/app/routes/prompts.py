from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..models import Prompt, Variable, Tag, PromptTag

router = APIRouter()


class VariableIn(BaseModel):
    name: str
    default_value: Optional[str] = None


class VariableOut(BaseModel):
    id: int
    prompt_id: int
    name: str
    default_value: Optional[str] = None

    model_config = {"from_attributes": True}


class TagOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class PromptIn(BaseModel):
    title: str
    body: str = ""


class PromptOut(BaseModel):
    id: int
    title: str
    body: str
    version: int
    created_at: datetime
    updated_at: datetime
    variables: list[VariableOut] = []
    tags: list[TagOut] = []

    model_config = {"from_attributes": True}


@router.get("/prompts", response_model=list[PromptOut])
def list_prompts(db: Session = Depends(get_db)):
    return db.query(Prompt).order_by(Prompt.updated_at.desc(), Prompt.id.desc()).all()


@router.post("/prompts", response_model=PromptOut, status_code=201)
def create_prompt(payload: PromptIn, db: Session = Depends(get_db)):
    prompt = Prompt(title=payload.title, body=payload.body)
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


@router.get("/prompts/{prompt_id}", response_model=PromptOut)
def get_prompt(prompt_id: int, db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return prompt


@router.put("/prompts/{prompt_id}", response_model=PromptOut)
def update_prompt(prompt_id: int, payload: PromptIn, db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    prompt.title = payload.title
    prompt.body = payload.body
    prompt.version += 1
    prompt.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(prompt)
    return prompt


@router.delete("/prompts/{prompt_id}", status_code=204)
def delete_prompt(prompt_id: int, db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    db.delete(prompt)
    db.commit()


@router.get("/prompts/{prompt_id}/variables", response_model=list[VariableOut])
def list_variables(prompt_id: int, db: Session = Depends(get_db)):
    return db.query(Variable).filter(Variable.prompt_id == prompt_id).order_by(Variable.name).all()


@router.put("/prompts/{prompt_id}/variables", response_model=list[VariableOut])
def replace_variables(prompt_id: int, variables: list[VariableIn], db: Session = Depends(get_db)):
    db.query(Variable).filter(Variable.prompt_id == prompt_id).delete()
    new_vars = [Variable(prompt_id=prompt_id, name=v.name, default_value=v.default_value) for v in variables]
    db.add_all(new_vars)
    db.commit()
    return db.query(Variable).filter(Variable.prompt_id == prompt_id).order_by(Variable.name).all()


@router.put("/prompts/{prompt_id}/tags", status_code=204)
def set_prompt_tags(prompt_id: int, payload: dict, db: Session = Depends(get_db)):
    tag_ids: list[int] = payload.get("tag_ids", [])
    db.query(PromptTag).filter(PromptTag.prompt_id == prompt_id).delete()
    for tag_id in tag_ids:
        db.add(PromptTag(prompt_id=prompt_id, tag_id=tag_id))
    db.commit()
