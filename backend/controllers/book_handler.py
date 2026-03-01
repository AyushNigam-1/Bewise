import json
import traceback
from typing import List, Dict, Any
from fastapi import HTTPException
from core.database import connect_db
from services.vector import embed_and_upsert_insight
from src.processor import BookistProcessor
from src.utils.file_operations import load_json_file
from core.redis import redis_client , CACHE_TTL

def get_all_books_logic() -> List[Dict[str, Any]]:
    cache_key = "books:all"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    cur = conn.cursor()
    cur.execute("SELECT id, title, author, thumbnail, description, category FROM book")
    books = cur.fetchall()
    cur.close()
    conn.close()

    book_list = [
        {
            "id": id, "title": title, "author": author,
            "thumbnail": thumbnail, "description": description, "category": category
        }
        for id, title, author, thumbnail, description, category in books
    ]

    redis_client.setex(cache_key, CACHE_TTL, json.dumps(book_list))
    return book_list

def find_books_by_categories_logic(categories: List[str]) -> List[Dict[str, Any]]:
    cache_key = "books:all" if not categories else f"books:categories:{','.join(sorted(categories))}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    try:
        cur = conn.cursor()
        if not categories:
            cur.execute('SELECT * FROM book;')
        else:
            placeholders = ','.join(['%s'] * len(categories))
            query = f"""
                SELECT * FROM book
                WHERE EXISTS (
                    SELECT 1 FROM unnest(category) AS cat WHERE cat IN ({placeholders})
                );
            """
            cur.execute(query, tuple(categories))

        rows = cur.fetchall()
        columns = [desc[0] for desc in cur.description]
        books = [dict(zip(columns, row)) for row in rows]

        redis_client.setex(cache_key, CACHE_TTL, json.dumps(books))
        return books
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

def get_book_info_logic(title: str) -> Dict[str, Any]:
    cache_key = f"book:info:{title}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()
    cur.execute("SELECT id, content, description, author, thumbnail, category FROM book WHERE title = %s;", (title,))
    result = cur.fetchone()
    cur.close()
    conn.close()

    if not result:
        raise HTTPException(status_code=404, detail="Book not found")

    id, content, description, author, thumbnail, category = result
    categories_str = ", ".join(category) if isinstance(category, list) else str(category).replace("{", "").replace("}", "").replace('"', "")

    num_keys = len(content)
    total_steps = sum(len(content[key].get("steps", [])) for key in content.keys())

    response_data = {
        "id": id, "title": title, "thumbnail": thumbnail, "author": author,
        "description": description, "sub_categories_count": num_keys,
        "total_insights": total_steps, "categories": categories_str 
    }

    redis_client.setex(cache_key, CACHE_TTL, json.dumps(response_data))
    return response_data

def get_content_keys_logic(title: str) -> List[Dict[str, str]]:
    cache_key = f"book:content_keys:{title}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()
    cur.execute("SELECT content FROM book WHERE title = %s;", (title,))
    book_data = cur.fetchone()
    cur.close()
    conn.close()
    
    if not book_data:
        raise HTTPException(status_code=404, detail="Book not found")

    content = book_data[0] 
    print(content,"content")
    result = [
        {
            "name": key, "icon": value.get("icon", ""),
            "description": value.get("description", ""), "steps_count": str(len(value.get("steps")))
        }
        for key, value in content.items()
    ]

    redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
    return result

def get_content_values_logic(title: str, category: List[str]) -> List[Dict[str, Any]]:
    cache_key = f"book:content_values:{title}:{'all' if not category else ','.join(sorted(category))}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        cur = conn.cursor()
        cur.execute("SELECT content FROM book WHERE title = %s;", (title,))
        row = cur.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Book not found")
        
        content = json.loads(row[0]) if isinstance(row[0], str) else row[0]
        results = []
        keys_to_use = category if category else list(content.keys())

        for key in keys_to_use:
            if key in content:
                icon = content[key].get("icon", "")
                step_ids = content[key].get("steps", [])

                if not step_ids: continue

                cur.execute("SELECT id, title, description FROM insights WHERE id = ANY(%s);", (step_ids,))
                steps_data = cur.fetchall()

                for step_id, step_title, step_description in steps_data:
                    results.append({
                        "icon": icon, "category": key, "step_id": step_id,
                        "step": step_title, "description": step_description
                    })

        cur.close()
        conn.close()

        if not results:
            raise HTTPException(status_code=404, detail="No matching categories or steps found")

        redis_client.setex(cache_key, CACHE_TTL, json.dumps(results))
        return results

    except Exception as e:
        traceback.print_exc() 
        raise HTTPException(status_code=500, detail=str(e))

def get_step_details_logic(step_id: int) -> Dict[str, Any]:
    cache_key = f"insight:{step_id}"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

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

        result = {
            "step_id": row[0], "book_name": row[1], "category": row[2],
            "title": row[3], "description": row[4], "detailed_breakdown": row[5]
        }

        redis_client.setex(cache_key, CACHE_TTL, json.dumps(result))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def create_book_logic(book_data: Dict) -> Dict[str, str]:
    conn = connect_db()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
        
    cur = conn.cursor()
    try:            
        book_title = book_data["Title"]
        content_with_step_ids = {}

        if "Content" in book_data and isinstance(book_data["Content"], dict):
            for category_name, category_data in book_data["Content"].items():
                content_with_step_ids[category_name] = {
                    "icon": category_data.get("icon"),
                    "description": category_data.get("description"),
                    "steps": []
                }
                
                for step in category_data.get("steps", []):
                    cur.execute(
                        "INSERT INTO insights (book_name, category_name, title, description, detailed_breakdown) VALUES (%s, %s, %s, %s, %s) RETURNING id;",
                        (book_title, category_name, step["step"], step["description"], step["detailed_breakdown"]),
                    )
                    step_id = cur.fetchone()[0]
                    content_with_step_ids[category_name]["steps"].append(step_id)
                    
                    embed_and_upsert_insight(
                        insight_id=step_id, book_name=book_title, category=category_name,
                        category_icon=category_data.get("icon"), title=step["step"], description=step["description"],
                    )
                    
            cur.execute(
                "INSERT INTO book (title, author, description, thumbnail, category, content) VALUES (%s, %s, %s, %s, %s, %s);",
                (book_data["Title"], book_data["Author"], book_data["Description"], book_data["Thumbnail"], book_data["Category"], json.dumps(content_with_step_ids)),
            )

        conn.commit()

        # 🔥 CACHE INVALIDATION
        for key in redis_client.scan_iter("books:*"):
            redis_client.delete(key)

        return {"message": "Book and associated steps created successfully"}
    
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        cur.close()
        conn.close()

def process_book_logic(pdf_path: str, book_title: str, author: str, description: str, cover_url: str, category_list: List[str]):
    processor = BookistProcessor(pdf_path, book_title, author, description, cover_url, category_list)
    book_data = processor.process()
    return create_book_logic(book_data)

def get_categories_logic() -> List[Dict[str, str]]:
    cache_key = "categories:all"
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return json.loads(cached_data)

    try:
        content = load_json_file("", "categories.json", {})
        result = [
            {"name": key, "icon": value.get("icon", ""), "description": value.get("description", "")}
            for key, value in content.items()
        ]
        
        redis_client.setex(cache_key, CACHE_TTL * 2, json.dumps(result)) 
        return result
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")