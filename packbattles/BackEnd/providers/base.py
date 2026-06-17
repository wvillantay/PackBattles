from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class CardResult:
    """Normalised card data returned by any provider."""
    name:                  str
    provider_card_id:      str
    image_url:             Optional[str]   = None
    set_name:              Optional[str]   = None
    set_code:              Optional[str]   = None
    set_series:            Optional[str]   = None   # not in TCGdex card endpoint
    set_release_date:      Optional[str]   = None
    rarity:                Optional[str]   = None
    tcgplayer_price_usd:   Optional[float] = None   # always USD when present
    cardmarket_price_eur:  Optional[float] = None   # always EUR when present
    market_price:          Optional[float] = None   # best single price chosen by provider
    market_price_currency: Optional[str]   = None   # "USD" or "EUR" — never coerced


class CardPriceProvider(ABC):
    """Abstract interface all pricing providers must implement."""

    name: str  # e.g. "tcgdex", "pokewallet", "manual"

    @abstractmethod
    def search(self, query: str, **filters) -> list[CardResult]:
        """Search by card name. Returns candidates; may not be unique."""

    @abstractmethod
    def get_card(self, provider_card_id: str) -> Optional[CardResult]:
        """Full card fetch by provider ID. Returns None if not found or on error."""

    @abstractmethod
    def get_price(self, provider_card_id: str) -> Optional[dict]:
        """
        Price-only refresh for a known card.

        Returns a dict with keys:
            tcgplayer_price_usd, cardmarket_price_eur,
            market_price, market_price_currency

        Returns None if the provider has no data or the request fails.
        Must never raise — callers treat None as "no data available".
        """
