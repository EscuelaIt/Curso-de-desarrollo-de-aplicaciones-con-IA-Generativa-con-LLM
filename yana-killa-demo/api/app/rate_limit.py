import time
from collections import defaultdict, deque
from fastapi import HTTPException, Request

_BUCKETS: dict[str, deque[float]] = defaultdict(deque)
WINDOW_SECONDS = 3600


def _ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(bucket: str, per_hour: int):
    async def _dep(request: Request):
        if per_hour <= 0:
            return
        key = f"{bucket}:{_ip(request)}"
        now = time.time()
        dq = _BUCKETS[key]
        cutoff = now - WINDOW_SECONDS
        while dq and dq[0] < cutoff:
            dq.popleft()
        if len(dq) >= per_hour:
            raise HTTPException(status_code=429, detail=f"rate_limit_{bucket}")
        dq.append(now)

    return _dep
