"""Destination value object."""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Destination:
    """A place visited by a trip."""

    id: int
    name: str
    country: str
    description: str
    image_url: str = field(default="")
