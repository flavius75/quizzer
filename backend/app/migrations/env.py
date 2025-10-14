import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# this is the Alembic Config object
config = context.config

# CRITICAL: Read DATABASE_URL from environment variable
database_url = os.getenv("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)
    print(f"✓ Using DATABASE_URL from environment")
else:
    print("⚠ WARNING: DATABASE_URL not found in environment")

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Try to import Base from various common locations
target_metadata = None
try:
    from app.database import Base
    target_metadata = Base.metadata
    print("✓ Loaded Base from app.database")
except ImportError:
    try:
        from app.db.base import Base
        target_metadata = Base.metadata
        print("✓ Loaded Base from app.db.base")
    except ImportError:
        try:
            from app.models.base import Base
            target_metadata = Base.metadata
            print("✓ Loaded Base from app.models.base")
        except ImportError:
            try:
                from app.core.database import Base
                target_metadata = Base.metadata
                print("✓ Loaded Base from app.core.database")
            except ImportError:
                print("⚠ WARNING: Could not import Base. Migrations will be skipped.")
                target_metadata = None


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = config.get_main_option("sqlalchemy.url")
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()