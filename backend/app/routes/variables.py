from typing import Optional

from app.database import get_db
from app.models.prompt import Prompt
from app.models.variable import Variable
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────


class VariableCreate(BaseModel):
    name: str
    default_value: Optional[str] = None


class VariableUpdate(BaseModel):
    name: Optional[str] = None
    default_value: Optional[str] = None


class VariableOut(BaseModel):
    id: int
    prompt_id: int
    name: str
    default_value: Optional[str]

    model_config = {"from_attributes": True}


# ── Routes ────────────────────────────────────────────────────────────────────


@router.get("/prompts/{prompt_id}/variables", response_model=list[VariableOut])
def list_variables(prompt_id: int, db: Session = Depends(get_db)):
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    variables = (
        db.query(Variable).filter(Variable.prompt_id == prompt_id).all()
    )
    return [VariableOut.model_validate(v) for v in variables]


@router.post("/prompts/{prompt_id}/variables", response_model=VariableOut, status_code=201)
def create_variable(
    prompt_id: int, payload: VariableCreate, db: Session = Depends(get_db)
):
    prompt = db.query(Prompt).filter(Prompt.id == prompt_id).first()
    if prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")

    variable = Variable(
        prompt_id=prompt_id,
        name=payload.name,
        default_value=payload.default_value,
    )
    db.add(variable)
    db.commit()
    db.refresh(variable)
    return VariableOut.model_validate(variable)


@router.put("/variables/{variable_id}", response_model=VariableOut)
def update_variable(
    variable_id: int, payload: VariableUpdate, db: Session = Depends(get_db)
):
    variable = db.query(Variable).filter(Variable.id == variable_id).first()
    if variable is None:
        raise HTTPException(status_code=404, detail="Variable not found")

    if "name" in payload.model_fields_set:
        variable.name = payload.name
    if "default_value" in payload.model_fields_set:
        variable.default_value = payload.default_value

    db.commit()
    db.refresh(variable)
    return VariableOut.model_validate(variable)


@router.delete("/variables/{variable_id}", status_code=204)
def delete_variable(variable_id: int, db: Session = Depends(get_db)):
    variable = db.query(Variable).filter(Variable.id == variable_id).first()
    if variable is None:
        raise HTTPException(status_code=404, detail="Variable not found")
    db.delete(variable)
    db.commit()
