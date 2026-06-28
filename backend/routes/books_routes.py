import os
from typing import Any, Dict, List
from fastapi import APIRouter, Body, File, Form, UploadFile, Depends, Request
from fastapi.responses import JSONResponse
from rq.job import Job
from core.redis import redis_client_rq, redis_queue
from core.telemetry import TelemetryRoute
from controllers.book_controller import BookService, get_book_service, worker_process_book

router = APIRouter(route_class=TelemetryRoute)


def get_optional_user_id(request: Request) -> str:
    """Safely extracts the user ID if present, otherwise returns 'anonymous'."""
    user = getattr(request.state, "user", None)
    return user["id"] if user and "id" in user else "anonymous"


@router.get("/books", response_model=List[Dict[str, Any]])
def get_all_books_route(
    user_id: str = Depends(get_optional_user_id),
    service: BookService = Depends(get_book_service)
):
    return service.get_all_books(user_id)


@router.post("/books/find-by-categories", response_model=Dict[str, Any])
def find_books_by_categories_route(
    categories: List[str] = Body(...),
    user_id: str = Depends(get_optional_user_id),
    service: BookService = Depends(get_book_service)
):
    return service.find_books_by_categories(categories, user_id)


@router.get("/book/{title}/info")
def get_book_info_route(
    title: str,
    user_id: str = Depends(get_optional_user_id),
    service: BookService = Depends(get_book_service)
):
    return service.get_book_info(title, user_id)


@router.post("/books/")
def create_book_route(
    book_data: Dict = Body(...),
    user_id: str = Depends(get_optional_user_id),
    service: BookService = Depends(get_book_service)
):
    result = service.create_book(book_data, user_id)
    return JSONResponse(content=result, status_code=201)


@router.post("/process-book")
def process_book_route(
    file: UploadFile = File(...),
    book_title: str = Form(..., description="Title of the book"),
    author: str = Form(..., description="Author of the book"),
    description: str = Form(..., description="Short description of the book"),
    cover_url: str = Form(..., description="Cover image URL"),
    category: str = Form(..., description="Category of the book"),
    user_id: str = Depends(get_optional_user_id)
):
    root_folder = os.getcwd()
    pdf_path = os.path.join(root_folder, file.filename)

    with open(pdf_path, "wb") as buffer:
        buffer.write(file.file.read())

    category_list = [c.strip() for c in category.split(",")]

    job = redis_queue.enqueue(
        worker_process_book,
        args=(pdf_path, book_title, author, description, cover_url, category_list, user_id),
        job_timeout="1h",
        result_ttl=86400,
    )

    return JSONResponse(
        content={"message": "Processing started", "job_id": job.id}, status_code=202
    )


@router.get("/process-book/{job_id}/status")
def get_job_status(job_id: str):
    try:
        job = Job.fetch(job_id, connection=redis_client_rq)
    except Exception:
        return JSONResponse(content={"error": "Job not found"}, status_code=404)

    return JSONResponse(
        {
            "job_id": job.id,
            "status": job.get_status(),
            "result": job.result if job.is_finished else None,
            "error": str(job.exc_info) if job.is_failed else None,
        }
    )