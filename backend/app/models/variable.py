from app.models.base import Base
from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Variable(Base):
    __tablename__ = "variables"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    prompt_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("prompts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    default_value: Mapped[str | None] = mapped_column(Text, nullable=True)

    prompt: Mapped["Prompt"] = relationship(  # noqa: F821
        "Prompt", back_populates="variables"
    )
