from datetime import date
from typing import Literal, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, Field, field_validator, model_validator


ReportType = Literal["personality", "daily", "weekly", "monthly", "yearly"]
SystemType = Literal["vedic", "western", "numerology", "consensus"]


class PersonData(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    year: int = Field(ge=1900, le=2100)
    month: int = Field(ge=1, le=12)
    day: int = Field(ge=1, le=31)
    question: str = Field(default="", max_length=1000)
    report_type: ReportType

    @field_validator("name", "question")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def validate_birth_date(self):
        try:
            birth_date = date(self.year, self.month, self.day)
        except ValueError as exc:
            raise ValueError(f"Invalid birth date: {exc}") from exc
        if birth_date > date.today():
            raise ValueError("Birth date cannot be in the future")
        return self


class ReportRequest(PersonData):
    system: SystemType = "vedic"
    hour: Optional[int] = Field(default=None, ge=0, le=23)
    minute: Optional[int] = Field(default=None, ge=0, le=59)
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    timezone: Optional[str] = Field(default=None, max_length=64)

    @model_validator(mode="after")
    def validate_system_inputs(self):
        if self.system == "numerology":
            return self

        required = ("hour", "minute", "latitude", "longitude", "timezone")
        missing = [name for name in required if getattr(self, name) is None]
        if missing:
            raise ValueError(
                f"{self.system.title()} reports require: {', '.join(missing)}"
            )

        self.timezone = self.timezone.strip()
        try:
            ZoneInfo(self.timezone)
        except ZoneInfoNotFoundError as exc:
            raise ValueError(
                "Use a valid IANA timezone, such as America/Vancouver"
            ) from exc
        return self
