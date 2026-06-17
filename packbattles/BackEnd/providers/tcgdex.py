"""
TCGdex provider — https://tcgdex.dev
=====================================
Verified against live API 2026-06-17 using cards swsh1-1 and swsh1-25.

Confirmed response shape
------------------------
- Top-level pricing key: "pricing"
- Image field: base URL without extension (e.g. "https://assets.tcgdex.net/en/swsh/swsh1/25")
  Appending "/high.png" returns a valid PNG (confirmed 784 KB for swsh1-25).
- Cardmarket: pricing.cardmarket.trend  (float, EUR — "unit": "EUR" confirmed)
- TCGplayer:  pricing.tcgplayer.<variant>.marketPrice  (float, USD — "unit": "USD" confirmed)
  Variant key varies by card (observed: "holofoil"). Code iterates all variant keys.
- Set object: id, name, cardCount, logo, symbol — NO "serie" subfield in card endpoint.
  set_series is always None unless a second /sets/<id> call is made (out of scope Phase 1).
"""

from __future__ import annotations

import logging
from typing import Optional

import requests

from .base import CardPriceProvider, CardResult

log = logging.getLogger(__name__)

TCGDEX_BASE = "https://api.tcgdex.net/v2/en"
_TIMEOUT    = 10   # seconds; no retry in Phase 1

# Metadata keys that live alongside variant dicts in pricing.tcgplayer
_TCGP_META = frozenset({"unit", "updated"})


class TcgDexProvider(CardPriceProvider):
    name = "tcgdex"

    # ------------------------------------------------------------------ #
    # Public interface                                                     #
    # ------------------------------------------------------------------ #

    def search(self, query: str, **filters) -> list[CardResult]:
        try:
            r = requests.get(
                f"{TCGDEX_BASE}/cards",
                params={"name": query},
                timeout=_TIMEOUT,
            )
            r.raise_for_status()
            return [self._map(c) for c in r.json()]
        except Exception as exc:
            log.warning("TCGdex search(%r) failed: %s", query, exc)
            return []

    def get_card(self, provider_card_id: str) -> Optional[CardResult]:
        try:
            r = requests.get(
                f"{TCGDEX_BASE}/cards/{provider_card_id}",
                timeout=_TIMEOUT,
            )
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return self._map(r.json())
        except Exception as exc:
            log.warning("TCGdex get_card(%r) failed: %s", provider_card_id, exc)
            return None

    def get_price(self, provider_card_id: str) -> Optional[dict]:
        card = self.get_card(provider_card_id)
        if card is None:
            return None
        return {
            "tcgplayer_price_usd":   card.tcgplayer_price_usd,
            "cardmarket_price_eur":  card.cardmarket_price_eur,
            "market_price":          card.market_price,
            "market_price_currency": card.market_price_currency,
        }

    # ------------------------------------------------------------------ #
    # Internal mapping                                                     #
    # ------------------------------------------------------------------ #

    def _map(self, data: dict) -> CardResult:
        # ── image ────────────────────────────────────────────────────────
        # "image" is a base URL with no file extension.
        # Verified: appending "/high.png" returns a valid image.
        img_base  = data.get("image")
        image_url = f"{img_base}/high.png" if img_base else None

        # ── set metadata ─────────────────────────────────────────────────
        # "set" contains: id, name, cardCount, logo, symbol.
        # "serie" is NOT present here; requires a separate /sets/<id> call.
        s = data.get("set") or {}

        # ── pricing ──────────────────────────────────────────────────────
        pricing = data.get("pricing") or {}

        # Cardmarket — always EUR (confirmed by "unit": "EUR" in response).
        # Use "trend" as the representative price; falls back to None if absent.
        cm           = pricing.get("cardmarket") or {}
        cardmarket_price_eur = _safe_float(cm.get("trend"))

        # TCGplayer — always USD (confirmed by "unit": "USD" in response).
        # Variant key varies by card (observed: "holofoil"; may be "normal", etc.).
        # Iterate all keys, skip metadata, take the first marketPrice found.
        tcp      = pricing.get("tcgplayer") or {}
        tcp_market = None
        for key, variant in tcp.items():
            if key in _TCGP_META or not isinstance(variant, dict):
                continue
            mp = variant.get("marketPrice")
            if mp is not None:
                tcp_market = mp
                break
        tcgplayer_price_usd = _safe_float(tcp_market)

        # Resolve best single price with accurate, explicit currency.
        # TCGplayer (USD) takes priority; Cardmarket (EUR) is fallback.
        # EUR is never silently coerced to USD.
        if tcgplayer_price_usd is not None:
            market_price          = tcgplayer_price_usd
            market_price_currency = "USD"
        elif cardmarket_price_eur is not None:
            market_price          = cardmarket_price_eur
            market_price_currency = "EUR"
        else:
            market_price          = None
            market_price_currency = None

        if pricing and market_price is None:
            log.warning(
                "TCGdex card %r: pricing block present but no usable price. "
                "cardmarket keys=%r, tcgplayer keys=%r",
                data.get("id"),
                list(cm.keys()),
                list(tcp.keys()),
            )

        return CardResult(
            name                 = data.get("name", ""),
            provider_card_id     = data.get("id", ""),
            image_url            = image_url,
            set_name             = s.get("name"),
            set_code             = s.get("id"),
            set_series           = None,  # not in card endpoint; requires /sets/<id>
            set_release_date     = s.get("releaseDate"),
            rarity               = data.get("rarity"),
            tcgplayer_price_usd  = tcgplayer_price_usd,
            cardmarket_price_eur = cardmarket_price_eur,
            market_price         = market_price,
            market_price_currency = market_price_currency,
        )


def _safe_float(value) -> Optional[float]:
    """Convert a value to float, returning None silently on failure."""
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
