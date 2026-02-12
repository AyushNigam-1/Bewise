from fastapi import APIRouter , HTTPException ,UploadFile, File, Form , Body
import os
from fastapi.responses import JSONResponse
from typing import List, Dict , Any
from controllers.connection import connect_db
import json
from src.processor import BookistProcessor
from src.utils.file_operations import load_json_file
from typing import List
from pydantic import BaseModel
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
import traceback
from src.utils.vector import embed_and_upsert_insight 

class ChatRequest(BaseModel):
    message: str
    session_id: str


router = APIRouter()
store: dict[str, ChatMessageHistory] = {}

# Prompt template (single prompt pipeline)
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are Bookist AI. Be clear, helpful, and concise."),
    ("human", "{input}")
])

def get_session_history(session_id: str) -> ChatMessageHistory:
    """Return (and lazily create) a ChatMessageHistory for a session id."""
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

# initialize Groq LLM
llm = ChatGroq(
    model_name="llama-3.3-70b-versatile",
    api_key=os.getenv("GROQ_API_KEY"),
)

# compose prompt -> llm runnable once
chain = prompt | llm

# wrap with message-history runnable (this expects the chain that converts dict -> messages -> llm)
chat = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
)

# @router.post("/chat/ai")
# def ai_reply(payload: ChatRequest):
#     try:
#         result = chat.invoke(
#             {"input": payload.message},
#             config={"configurable": {"session_id": payload.session_id}},
#         )

#         return {
#             "user": payload.message,
#             "ai": result.content,
#         }

#     except Exception as e:
#         traceback.print_exc()
#         raise HTTPException(status_code=500, detail=str(e))





@router.get("/books", response_model=List[Dict[str, Any]])
def get_all_books():
    """Fetches all book titles, authors, thumbnails, descriptions, and categories."""
    conn = connect_db()
    if conn:
        cur = conn.cursor()
        cur.execute("SELECT id, title, author, thumbnail, description, category FROM book")
        books = cur.fetchall()
        cur.close()
        conn.close()

        book_list = []
        for id, title, author, thumbnail, description, category in books:
            book_list.append({
                "id": id,
                "title": title,
                "author": author,
                "thumbnail": thumbnail,
                "description": description,
                "category": category
            })

        return book_list
    else:
        raise HTTPException(status_code=500, detail="Database connection failed")

@router.post("/books/find-by-categories")
def find_books_by_categories(categories: List[str] = Body(...)):
    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cur = conn.cursor()

        if not categories:
            # If no categories provided, return all books
            cur.execute('SELECT * FROM book;')
        else:
            placeholders = ','.join(['%s'] * len(categories))
            query = f"""
                SELECT *
                FROM book
                WHERE EXISTS (
                    SELECT 1
                    FROM unnest(category) AS cat
                    WHERE cat IN ({placeholders})
                );
            """
            cur.execute(query, tuple(categories))

        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]
        books = [dict(zip(columns, row)) for row in rows]

        return books

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        conn.close()

@router.get("/book/{title}/info")
def get_book_info(title: str):
    conn = connect_db()
    if conn:
        cur = conn.cursor()
        # Ensure your SQL is correct
        cur.execute("SELECT content, description, author, thumbnail, category FROM book WHERE title = %s;", (title,))
        result = cur.fetchone()
        cur.close()
        conn.close()

        if not result:
            raise HTTPException(status_code=404, detail="Book not found")

        content, description, author, thumbnail, category = result

        # FIX: If category is a list, join it. If it's already a string, keep it.
        if isinstance(category, list):
            categories_str = ", ".join(category)
        else:
            # This handles cases where it might have been saved as a weird string
            categories_str = str(category).replace("{", "").replace("}", "").replace('"', "")

        num_keys = len(content)
        total_steps = sum(len(content[key].get("steps", [])) for key in content.keys())

        return {
            "title": title,
            "thumbnail": thumbnail,
            "author": author,
            "description": description,
            "sub_categories_count": num_keys,
            "total_insights": total_steps,
            "categories": categories_str  # Clean string: "Psychology, Self-Help"
        }


@router.get("/book/{title}/content_keys", response_model=List[Dict[str, str]])
def get_content_keys(title: str):
    """Fetches the keys of the content property for a given book title."""
    conn = connect_db()
    if conn:
        cur = conn.cursor()
        cur.execute("SELECT content FROM book WHERE title = %s;", (title,))
        book_data = cur.fetchone()
        cur.close()
        conn.close()
        if not book_data:
            raise HTTPException(status_code=404, detail="Book not found")

        content = book_data[0]  # Assuming content is stored as JSONB in PostgreSQL
        result = [
            {
                "name": key,
                "icon": value.get("icon", ""),
                "description": value.get("description", ""),
                "steps_count":str(len(value.get("steps")))
            }
            for key, value in content.items()
        ]
        return result
    else:
        raise HTTPException(status_code=500, detail="Database connection failed")

# @router.post("/book/{title}")
# def get_content_values(title: str, category: List[str] = Body(...)):
#     conn = connect_db()
#     if not conn:
#         raise HTTPException(status_code=500, detail="Database connection failed")
    
#     try:
#         cur = conn.cursor()
#         cur.execute("SELECT content FROM book WHERE title = %s;", (title,))
#         book_data = cur.fetchone()
#         cur.close()
#         conn.close()
        
#         if not book_data:
#             raise HTTPException(status_code=404, detail="Book not found")

#         content = book_data[0]
#         results = []

#         keys_to_use = category if category else list(content.keys())

#         for key in keys_to_use:
#             if key in content:
#                 icon = content[key].get("icon", "")
#                 steps = content[key].get("steps", [])
#                 results.extend([
#                     {
#                         "icon": icon,
#                         "category": key,
#                         "step": step["step"],
#                         "description": step["description"]
#                     }
#                     for step in steps
#                 ])

#         if not results:
#             raise HTTPException(status_code=404, detail="No matching categories found")

#         return results

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/book/{title}")
def get_content_values(title: str, category: List[str] = Body(...)):
    # console.log
    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        cur = conn.cursor()
        cur.execute("SELECT content FROM book WHERE title = %s;", (title,))
        row = cur.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Book not found")
        
        content = row[0]
        if isinstance(content, str):
            content = json.loads(content)

        results = []

        keys_to_use = category if category else list(content.keys())

        for key in keys_to_use:
            if key in content:
                icon = content[key].get("icon", "")
                step_ids = content[key].get("steps", [])

                if not step_ids:
                    continue

                cur.execute(
                    "SELECT id, title, description FROM insights WHERE id = ANY(%s);",
                    (step_ids,)
                )
                steps_data = cur.fetchall()

                for step in steps_data:
                    step_id, step_title, step_description = step
                    results.append({
                        "icon": icon,
                        "category": key,
                        "step_id": step_id,
                        "step": step_title,
                        "description": step_description
                    })

        cur.close()
        conn.close()

        if not results:
            raise HTTPException(status_code=404, detail="No matching categories or steps found")

        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insights/{step_id}")
def get_step_details(step_id: int):
    """Fetches full details of a step by its unique ID."""
    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cur = conn.cursor()

        cur.execute(
            "SELECT id, book_name, category_name, title, description, detailed_breakdown FROM insights WHERE id = %s;",
            (step_id,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="Step not found")

        return {
            "step_id": row[0],
            "book_name": row[1],
            "category": row[2],
            "title": row[3],
            "description": row[4],
            "detailed_breakdown": row[5]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/books/")
def create_book(book_data: Dict):
    conn = connect_db()
    if conn:
        cur = conn.cursor()
        try:            
            # book_id = cur.lastrowid  # Get the ID of the newly inserted book
            book_title = book_data["Title"]
            content_with_step_ids = {}

            # Loop through categories and their steps to insert into the steps table
            if "Content" in book_data and isinstance(book_data["Content"], dict):
                for category_name, category_data in book_data["Content"].items():
                    content_with_step_ids[category_name] = {
                        "icon": category_data.get("icon"),
                        "description": category_data.get("description"),
                        "steps": []
                    }
                    
                    steps = category_data.get("steps", [])

                    for step in steps:
                        cur.execute(
                            "INSERT INTO insights (book_name, category_name, title, description, detailed_breakdown) VALUES (%s, %s, %s, %s, %s) RETURNING id;",
                            (
                                book_title,
                                category_name,
                                step["step"],
                                step["description"],
                                step["detailed_breakdown"],
                            ),
                        )
                        step_id = cur.fetchone()[0]
                        content_with_step_ids[category_name]["steps"].append(step_id)
                        embed_and_upsert_insight(
                            insight_id=step_id,
                            book_name=book_title,
                            category=category_name,
                            category_icon=category_data.get("icon"),
                            title=step["step"],
                            description=step["description"],
                            breakdown=step["detailed_breakdown"],
                        )

                cur.execute(
                "INSERT INTO book (title, author, description, thumbnail, category, content) VALUES (%s, %s, %s, %s, %s, %s);",
                (
                    book_data["Title"],
                    book_data["Author"],
                    book_data["Description"],
                    book_data["Thumbnail"],
                    book_data["Category"],
                    json.dumps(content_with_step_ids),
                ),
            )

            conn.commit()
            return JSONResponse(content={"message": "Book and associated steps created successfully"}, status_code=201)
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {e}")
        finally:
            cur.close()
            conn.close()
    else:
        raise HTTPException(status_code=500, detail="Database connection failed")

@router.post("/process-book")
def process_book(
    file: UploadFile = File(...),
    book_title: str = Form(..., description="Title of the book"),
    author: str = Form(..., description="Author of the book"),
    description: str = Form(..., description="Short description of the book"),
    cover_url: str = Form(..., description="Cover image URL"),
    category: str = Form(..., description="Category of the book")
):
    root_folder = os.getcwd()
    pdf_path = os.path.join(root_folder, file.filename)
    category_list = category.split(",")  # Convert string to list
    category = [c.strip() for c in category_list]  # Remove extra spaces
    with open(pdf_path, "wb") as buffer:
        buffer.write(file.file.read())
    
    processor = BookistProcessor(
        pdf_path, book_title, author, description, cover_url, category
    )
    book_data = processor.process()

    return create_book(book_data)

@router.get("/get-categories")
def extract_json_keys():
    """Extracts all keys from a JSON file."""
    try:
        content = load_json_file("","categories.json",{})
        result = [
            {
                "name": key,
                "icon": value.get("icon", ""),
                "description": value.get("description", ""),
            }
            for key, value in content.items()
        ]
        return result
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")


