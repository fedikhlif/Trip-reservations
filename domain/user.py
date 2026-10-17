"""Abstract user model."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class User(ABC):
    """A system user; authentication is intentionally outside this demo."""

    id: int
    name: str
    email: str
    password_hash: str
    _logged_in: bool = field(default=False, init=False, repr=False)

    @abstractmethod
    def login(self) -> None:
        """Mark this user as logged in for the current demonstration."""

    @abstractmethod
    def logout(self) -> None:
        """Mark this user as logged out."""