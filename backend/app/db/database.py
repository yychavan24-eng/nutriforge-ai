"""
Database module for NutriForge AI.
Supports PostgreSQL when DATABASE_URL is configured, and gracefully
defaults to SQLite (nutriforge.db) for local zero-config development and testing.
"""
import os
import json
from typing import Dict, Any, List, Optional
from sqlalchemy import create_engine, Column, String, Float, Text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./nutriforge.db")

# Normalize heroku/render postgres URL format if present
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ProductModel(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True)
    barcode = Column(String, index=True, default="unknown")
    name = Column(String, nullable=False)
    brand = Column(String, nullable=False)
    category = Column(String, default="General")
    serving_size = Column(String, default="100g")
    serving_size_value = Column(Float, default=100.0)
    serving_size_unit = Column(String, default="g")
    serving_description = Column(String, default="")
    calories = Column(Float, nullable=True)
    protein = Column(Float, nullable=True)
    carbohydrates = Column(Float, nullable=True)
    total_sugar = Column(Float, nullable=True)
    added_sugar = Column(Float, nullable=True)
    total_fat = Column(Float, nullable=True)
    saturated_fat = Column(Float, nullable=True)
    trans_fat = Column(Float, nullable=True)
    sodium = Column(Float, nullable=True)
    fibre = Column(Float, nullable=True)
    data_json = Column(Text, nullable=False)  # Stores full provenance, ingredients, claims, etc.

class ProfileModel(Base):
    __tablename__ = "profiles"

    id = Column(String, primary_key=True, default="current_user")
    age = Column(String, nullable=True)
    height = Column(String, nullable=True)
    weight = Column(String, nullable=True)
    activity_level = Column(String, default="moderate")
    goal = Column(String, default="muscle_gain")
    dietary_preference = Column(String, default="no_preference")
    restrictions = Column(Text, default="")
    priorities_json = Column(Text, default="[]")
    daily_targets_json = Column(Text, default="{}")

def init_db():
    Base.metadata.create_all(bind=engine)

def seed_demo_products(demo_products: List[Dict[str, Any]]):
    init_db()
    db = SessionLocal()
    try:
        count = db.query(ProductModel).count()
        if count == 0:
            for p in demo_products:
                db_item = ProductModel(
                    id=p["id"],
                    barcode=p.get("barcode", "unknown"),
                    name=p["name"],
                    brand=p["brand"],
                    category=p.get("category", ""),
                    serving_size=p.get("serving_size", ""),
                    serving_size_value=float(p.get("serving_size_value", 0.0) or 0.0),
                    serving_size_unit=p.get("serving_size_unit", "g"),
                    serving_description=p.get("serving_description", ""),
                    calories=p.get("calories"),
                    protein=p.get("protein"),
                    carbohydrates=p.get("carbohydrates"),
                    total_sugar=p.get("total_sugar"),
                    added_sugar=p.get("added_sugar"),
                    total_fat=p.get("total_fat"),
                    saturated_fat=p.get("saturated_fat"),
                    trans_fat=p.get("trans_fat"),
                    sodium=p.get("sodium"),
                    fibre=p.get("fibre"),
                    data_json=json.dumps(p)
                )
                db.add(db_item)
            db.commit()
    finally:
        db.close()
