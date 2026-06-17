from __future__ import annotations

from typing import Optional

from .base import CardPriceProvider, CardResult


class ManualProvider(CardPriceProvider):
    """
    No-op provider for cards whose prices are set directly by an admin.
    search/get_card/get_price all return empty/None — there is no external
    source to sync from. Admin uses PATCH /api/admin/cards/<id>/price.
    """

    name = "manual"

    def search(self, query: str, **filters) -> list[CardResult]:
        return []

    def get_card(self, provider_card_id: str) -> Optional[CardResult]:
        return None

    def get_price(self, provider_card_id: str) -> Optional[dict]:
        return None
