# Production DB Guard — patch a aplicar em main.py

**NÃO foi commitado ainda.** Aplica somente DEPOIS que o Postgres do Railway estiver
configurado e funcionando, senão derruba o backend.

## Patch para `app/main.py`

Substituir o bloco do `lifespan`:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    import os
    from app.database import engine, Base
    from app import models  # noqa

    # Failsafe: SQLite em produção zera dados a cada redeploy no Railway.
    # Forçar Postgres em prod para evitar perda de dados silenciosa.
    if not settings.DEBUG and settings.DATABASE_URL.startswith("sqlite"):
        raise RuntimeError(
            "PRODUCTION REFUSED TO START: DATABASE_URL is SQLite. "
            "Configure DATABASE_URL=postgresql+asyncpg://... in Railway Variables. "
            "SQLite on ephemeral container loses all data on each redeploy."
        )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    os.makedirs(settings.STORAGE_LOCAL_PATH, exist_ok=True)
    yield
```

## Quando aplicar
1. Postgres provisionado no Railway ✅
2. `DATABASE_URL` apontando para o Postgres nas Variables do Railway ✅
3. Deploy de teste subiu OK ✅
4. **Aí sim** aplicar este patch + push.

## Rationale
Se Railway está rodando SQLite num filesystem efêmero (sem volume persistente),
cada `git push` = container novo = banco zerado. Já aconteceu uma vez (04/05),
o failsafe garante que não aconteça em silêncio de novo.
