"""
Concrete RagIndexerProtocol implementation (attacks/indirect_injection.py)
that talks to demo/mock_target_server.py's /v1/ingest endpoints. A real
deployment would implement this against your actual RAG system's
document-ingestion API instead.
"""

from __future__ import annotations

import httpx


class MockRagIndexerClient:
    """Satisfies attacks.indirect_injection.RagIndexerProtocol."""

    def __init__(self, base_url: str = "http://localhost:8001") -> None:
        self._client = httpx.AsyncClient(base_url=base_url.rstrip("/"), timeout=10.0)

    async def ingest(self, doc_id: str, content: str) -> None:
        response = await self._client.post("/v1/ingest", json={"doc_id": doc_id, "content": content})
        response.raise_for_status()

    async def remove(self, doc_id: str) -> None:
        response = await self._client.delete(f"/v1/ingest/{doc_id}")
        response.raise_for_status()

    async def aclose(self) -> None:
        await self._client.aclose()
