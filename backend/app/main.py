"""FastAPI主应用"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import search, extract

# 创建FastAPI应用
app = FastAPI(
    title=settings.APP_NAME,
    description="基于AI的学术论文搜索与信息提取工具",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(search.router, prefix="/api/v1", tags=["search"])
app.include_router(extract.router, prefix="/api/v1", tags=["extract"])


@app.get("/")
async def root():
    """健康检查"""
    return {
        "app": settings.APP_NAME,
        "version": "0.1.0",
        "status": "running",
        "mode": "mock" if settings.USE_MOCK_SEARCH else "production"
    }


@app.get("/health")
async def health():
    """健康检查端点"""
    return {"status": "healthy"}
