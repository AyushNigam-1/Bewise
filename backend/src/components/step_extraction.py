import time
import json
import re
from langchain_core.messages import HumanMessage
from src.utils.file_operations import save_json_file, load_json_file
from src.utils.prompts import step_extraction_prompt
from src.components.duplicate_removel import remove_duplicate_steps

import re

def clean_llm_text(text):
    """
    Safely converts literal escape sequences (like \n) into actual characters
    without breaking emojis or causing encoding errors.
    """
    if not isinstance(text, str):
        return text
    
    # 1. Remove surrounding quotes
    text = text.strip().strip('"').strip("'")
    
    # 2. Fix literal newlines
    text = text.replace(r'\n', '\n')
    
    # 3. Fix unicode escapes safely using Regex (prevents surrogate errors)
    #    Matches \uXXXX and converts it to the character
    def decode_match(match):
        try:
            return match.group(0).encode('utf-8').decode('unicode_escape')
        except:
            return match.group(0) # Return original if decode fails
            
    text = re.sub(r'\\u[0-9a-fA-F]{4}', decode_match, text)
    
    return text

# --- HELPER 2: Robust JSON Parsing (Replaces markdown_to_json) ---
def clean_and_parse_json(content):
    """
    Parses JSON from an LLM response, handling both raw JSON 
    and Markdown code blocks (```json ... ```).
    """
    try:
        # Try parsing directly (fastest)
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # If that fails, try extracting from Markdown code blocks
    try:
        pattern = r"```(?:json)?\s*(.*?)```"
        match = re.search(pattern, content, re.DOTALL)
        if match:
            json_str = match.group(1).strip()
            return json.loads(json_str)
    except Exception:
        pass
    
    return None

# --- MAIN FUNCTION ---
def extract_actionable_steps(folder_path, model, text_chunk, max_retries=5, base_delay=2):
    attempt = 0
    while attempt < max_retries:
        try:
            prompt = step_extraction_prompt(text_chunk)
            response = model.invoke([HumanMessage(content=prompt)])
            
            # 1. Parse the JSON safely
            new_data = clean_and_parse_json(response.content)
            
            # Validation
            if not isinstance(new_data, dict) or "steps" not in new_data or not isinstance(new_data["steps"], list):
                raise ValueError("Invalid response format: Expected a dictionary with a 'steps' list.")

            # 2. THE FIX: Clean the text inside the steps immediately
            for step in new_data["steps"]:
                if "detailed_breakdown" in step:
                    step["detailed_breakdown"] = clean_llm_text(step["detailed_breakdown"])

            # 3. Load existing data
            existing_data = load_json_file(folder_path, "actionable_steps.json", {"steps": []})
            existing_steps = {step["step"] for step in existing_data["steps"]}

            # 4. Add new steps (if unique)
            for step in new_data["steps"]:
                if step["step"] not in existing_steps:
                    existing_data["steps"].append(step)

            # 5. Save and Clean up
            save_json_file(folder_path, "actionable_steps.json", existing_data)
            remove_duplicate_steps(folder_path, "actionable_steps.json")

            print(f"✅ Successfully processed chunk (Attempt {attempt+1})")
            return new_data 

        except Exception as e:
            attempt += 1
            print(f"[Attempt {attempt}] Error occurred: {e}")
            time.sleep(base_delay * attempt)  # Exponential backoff

    print("❌ Failed after max retries. Skipping this chunk safely.")
    return {"steps": []}