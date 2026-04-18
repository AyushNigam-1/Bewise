import os
from fastapi import APIRouter, UploadFile, File, Form, Body, Depends
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
from core.redis import redis_queue, redis_client, redis_client_rq
from pyrate_limiter import Limiter, Rate, Duration
from fastapi_limiter.depends import RateLimiter
from rq.job import Job

from controllers.book_handler import (
    get_all_books,
    find_books_by_categories,
    get_book_info,
    get_book_content, 
    get_step_details,
    create_book,
    process_book,
)

shared_limiter = Limiter(Rate(60, Duration.SECOND * 60))
router = APIRouter(dependencies=[Depends(RateLimiter(limiter=shared_limiter))])

@router.get("/books", response_model=List[Dict[str, Any]])
def get_all_books_route():
    return get_all_books()

@router.post("/books/find-by-categories", response_model=Dict[str, Any])
def find_books_by_categories_route(categories: List[str] = Body(...)):
    return find_books_by_categories(categories)

@router.get("/book/{title}/info")
def get_book_info_route(title: str):
    return get_book_info(title)

@router.post("/book/{title}/content", response_model=Dict[str, Any])
def get_book_content_route(title: str, category: List[str] = Body(default=[])):
    return get_book_content(title, category)

@router.get("/insights/{step_id}")
def get_step_details_route(step_id: int):
    return get_step_details(step_id)

@router.post("/books/")
def create_book_route(book_data: Dict = Body(...)):
    result = create_book(book_data)
    return JSONResponse(content=result, status_code=201)

@router.post("/process-book")
def process_book_route(
    file: UploadFile = File(...),
    book_title: str = Form(..., description="Title of the book"),
    author: str = Form(..., description="Author of the book"),
    description: str = Form(..., description="Short description of the book"),
    cover_url: str = Form(..., description="Cover image URL"),
    category: str = Form(..., description="Category of the book")
):
    root_folder = os.getcwd()

    pdf_path = os.path.join(root_folder, file.filename)
    
    with open(pdf_path, "wb") as buffer:
        buffer.write(file.file.read())
        
    category_list = [c.strip() for c in category.split(",")]  
    
    job = redis_queue.enqueue(
        process_book,
        args=(pdf_path, book_title, author, description, cover_url, category_list),
        job_timeout="1h",
        result_ttl=86400 
    )
    
    return JSONResponse(
        content={"message": "Processing started", "job_id": job.id}, 
        status_code=202
    )

@router.get("/process-book/{job_id}/status")
def get_job_status(job_id: str):
    try:
        job = Job.fetch(job_id, connection=redis_client_rq)
    except Exception:
        return JSONResponse(content={"error": "Job not found"}, status_code=404)
        
    return JSONResponse({
        "job_id": job.id,
        "status": job.get_status(), # Can be 'queued', 'started', 'finished', 'failed'
        "result": job.result if job.is_finished else None,
        "error": str(job.exc_info) if job.is_failed else None
    })