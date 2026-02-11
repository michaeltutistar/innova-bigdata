"""
Limpia la base de datos para entrega al cliente:
- Elimina todos los sufragantes
- Elimina todos los líderes
- Elimina todos los usuarios excepto 'admin'

Uso:
  Desde la raíz del proyecto (con venv activado o dependencias instaladas):
    python backend/clean_db_for_delivery.py
  O en el servidor con Docker:
    docker exec -i innovabigdata-db-1 psql -U postgres -d innovabigdata < scripts/clean_db_for_delivery.sql
"""
import os
from urllib.parse import quote_plus

# Cargar .env desde la raíz del proyecto (si existe; en Docker las vars vienen por environment)
_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_env_path = os.path.join(_root, ".env")
if os.path.isfile(_env_path):
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_path)
    except ImportError:
        pass

# Construir DATABASE_URL igual que main.py
_rds_host = os.getenv("RDS_HOST")
if _rds_host:
    _rds_user = os.getenv("RDS_USER", "postgres")
    _rds_password = os.getenv("RDS_PASSWORD", "")
    _rds_db = os.getenv("RDS_DB", "innovabigdata")
    _rds_port = os.getenv("RDS_PORT", "5432")
    _safe_password = quote_plus(_rds_password)
    DATABASE_URL = f"postgresql://{_rds_user}:{_safe_password}@{_rds_host}:{_rds_port}/{_rds_db}"
else:
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/innovabigdata")

from sqlalchemy import create_engine, text

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

def main():
    with engine.connect() as conn:
        conn.execute(text("DELETE FROM sufragantes"))
        conn.execute(text("DELETE FROM lideres"))
        conn.execute(text("DELETE FROM usuarios WHERE username != 'admin'"))
        conn.execute(text("ALTER SEQUENCE sufragantes_id_seq RESTART WITH 1"))
        conn.execute(text("ALTER SEQUENCE lideres_id_seq RESTART WITH 1"))
        conn.commit()
    print("Base de datos limpiada: sufragantes y líderes eliminados; solo queda el usuario admin.")

if __name__ == "__main__":
    main()
