import os
from fastapi import APIRouter, UploadFile, File, Form, Body
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
from controllers.book_handler import (
    get_all_books_logic,
    find_books_by_categories_logic,
    get_book_info_logic,
    get_content_keys_logic,
    get_content_values_logic,
    get_step_details_logic,
    create_book_logic,
    process_book_logic,
    get_categories_logic
)

router = APIRouter()

@router.get("/books", response_model=List[Dict[str, Any]])
def get_all_books():
    return get_all_books_logic()

@router.post("/books/find-by-categories")
def find_books_by_categories(categories: List[str] = Body(...)):
    return find_books_by_categories_logic(categories)

@router.get("/book/{title}/info")
def get_book_info(title: str):
    return get_book_info_logic(title)

@router.get("/book/{title}/content_keys", response_model=List[Dict[str, str]])
def get_content_keys(title: str):
    return get_content_keys_logic(title)
    
@router.post("/book/{title}")
def get_content_values(title: str, category: List[str] = Body(...)):
    return get_content_values_logic(title, category)

@router.get("/insights/{step_id}")
def get_step_details(step_id: int):
    return get_step_details_logic(step_id)

@router.post("/books/")
def create_book(book_data: Dict = Body(...)):
    result = create_book_logic(book_data)
    return JSONResponse(content=result, status_code=201)

@router.post("/process-book")
def process_book(
    file: UploadFile = File(...),
    book_title: str = Form(..., description="Title of the book"),
    author: str = Form(..., description="Author of the book"),
    description: str = Form(..., description="Short description of the book"),
    cover_url: str = Form(..., description="Cover image URL"),
    category: str = Form(..., description="Category of the book")
):
    # 1. Handle the file upload at the router level
    root_folder = os.getcwd()
    pdf_path = os.path.join(root_folder, file.filename)
    
    with open(pdf_path, "wb") as buffer:
        buffer.write(file.file.read())
        
    category_list = [c.strip() for c in category.split(",")]  
    
    # 2. Pass the data to the controller for processing
    result = process_book_logic(pdf_path, book_title, author, description, cover_url, category_list)
    
    return JSONResponse(content=result, status_code=201)

@router.get("/get-categories")
def extract_json_keys():
    return get_categories_logic()