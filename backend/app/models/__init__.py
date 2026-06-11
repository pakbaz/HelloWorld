from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base


class Prompt(Base):
    __tablename__ = "prompts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(Text, nullable=False)
    body = Column(Text, nullable=False, default="")
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    variables = relationship("Variable", back_populates="prompt", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="prompt_tags", back_populates="prompts")


class Variable(Base):
    __tablename__ = "variables"

    id = Column(Integer, primary_key=True, index=True)
    prompt_id = Column(Integer, ForeignKey("prompts.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    default_value = Column(Text, nullable=True)

    prompt = relationship("Prompt", back_populates="variables")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)

    prompts = relationship("Prompt", secondary="prompt_tags", back_populates="tags")


class PromptTag(Base):
    __tablename__ = "prompt_tags"
    __table_args__ = (UniqueConstraint("prompt_id", "tag_id"),)

    prompt_id = Column(Integer, ForeignKey("prompts.id", ondelete="CASCADE"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)
