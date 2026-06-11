from datetime import datetime

from app.models.base import Base
from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Prompt(Base):
    __tablename__ = "prompts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    variables: Mapped[list["Variable"]] = relationship(  # noqa: F821
        "Variable", back_populates="prompt", cascade="all, delete-orphan"
    )
    prompt_tags: Mapped[list["PromptTag"]] = relationship(  # noqa: F821
        "PromptTag", back_populates="prompt", cascade="all, delete-orphan"
    )
    versions: Mapped[list["PromptVersion"]] = relationship(
        "PromptVersion", back_populates="prompt", cascade="all, delete-orphan"
    )


class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    prompt_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("prompts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    prompt: Mapped["Prompt"] = relationship("Prompt", back_populates="versions")
