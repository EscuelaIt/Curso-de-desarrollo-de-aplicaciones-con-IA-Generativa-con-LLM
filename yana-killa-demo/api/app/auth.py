from fastapi import Header, HTTPException, Query, Request
from .config import settings


def _extract_token(request: Request, header_token: str | None, query_token: str | None) -> str | None:
    if header_token:
        return header_token
    if query_token:
        return query_token
    return request.cookies.get("pilot_token")


async def require_token(
    request: Request,
    x_pilot_token: str | None = Header(default=None),
    t: str | None = Query(default=None),
):
    expected = settings.pilot_token
    if not expected:
        return  # auth disabled for local dev
    provided = _extract_token(request, x_pilot_token, t)
    if provided != expected:
        raise HTTPException(status_code=401, detail="invalid_or_missing_token")
