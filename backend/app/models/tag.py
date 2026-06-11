from app.models.base import Base
from sqlalchemy import ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True, index=True)

    prompt_tags: Mapped[list["PromptTag"]] = relationship(
        "PromptTag", back_populates="tag", cascade="all, delete-orphan"
    )


class PromptTag(Base):
    __tablename__ = "prompt_tags"
    __table_args__ = (UniqueConstraint("prompt_id", "tag_id", name="uq_prompt_tag"),)

    prompt_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("prompts.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tag_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    )

    prompt: Mapped["Prompt"] = relationship(  # noqa: F821
        "Prompt", back_populates="prompt_tags"
    )
    tag: Mapped["Tag"] = relationship("Tag", back_populates="prompt_tags")
