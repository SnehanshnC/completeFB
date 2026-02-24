import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.scheduler.worker import run_scheduler

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.basicConfig(
        level=logging.DEBUG if settings.DEBUG else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logger.info("Starting scheduler...")
    task = asyncio.create_task(run_scheduler())
    yield
    logger.info("Shutting down scheduler...")
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="completeFB", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def health_check():
    return {"status": "ok"}


# Register routers (imported here to avoid circular imports)
from src.auth.router import router as auth_router  # noqa: E402
from src.users.router import router as users_router  # noqa: E402
from src.pages.router import router as pages_router  # noqa: E402
from src.posts.router import router as posts_router  # noqa: E402

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(pages_router)
app.include_router(posts_router)
