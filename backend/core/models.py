from typing import List, Optional, Any , Dict
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime , Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from datetime import datetime

class User(SQLModel, table=True):
    __tablename__ = "user" 
    
    id: str = Field(primary_key=True)
    name: str
    email: str
    favourite_books: List[int] = Field(default_factory=list, sa_column=Column(ARRAY(Integer)))
    favourite_insights: List[Any] = Field(default_factory=list, sa_column=Column(JSONB))

class Book(SQLModel, table=True):
    __tablename__ = "book"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    author: str
    thumbnail: Optional[str] = None
    description: Optional[str] = None
    category: List[str] = Field(default_factory=list, sa_column=Column(ARRAY(Text)))
    content: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))

class Insight(SQLModel, table=True):
    __tablename__ = "insights"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    book_name: str
    category_name: str
    category_icon: str = Field(default="📌")
    title: str
    description: Optional[str] = None
    detailed_breakdown: Optional[str] = None

class AuthSession(SQLModel, table=True):
    __tablename__ = "session"

    id: str = Field(primary_key=True)
    token: str
    expiresAt: datetime = Field(sa_column=Column("expiresAt", DateTime))
    userId: str = Field(sa_column=Column("userId", String, ForeignKey("user.id")))