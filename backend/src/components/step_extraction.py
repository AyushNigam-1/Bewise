import time
from langchain_core.messages import HumanMessage
from src.utils.pdf_operations import markdown_to_json
from src.utils.file_operations import save_json_file, load_json_file
from src.utils.prompts import step_extraction_prompt
from src.components.duplicate_removel import remove_duplicate_steps

def extract_actionable_steps(folder_path, model, text_chunk, max_retries=5, base_delay=2):
    attempt = 0
    while attempt < max_retries:
        try:
            prompt = step_extraction_prompt(text_chunk)
            response = model.invoke([HumanMessage(content=prompt)])
            # print("response" , response)
            new_data = markdown_to_json(response.content)
            print("new_data",new_data)
            if not isinstance(new_data, dict) or "steps" not in new_data or not isinstance(new_data["steps"], list):
                raise ValueError("Invalid response format: Expected a dictionary with a 'steps' list.")

            existing_data = load_json_file(folder_path, "actionable_steps.json", {"steps": []})
            existing_steps = {step["step"] for step in existing_data["steps"]}

            for step in new_data["steps"]:
                if step["step"] not in existing_steps:
                    existing_data["steps"].append(step)

            save_json_file(folder_path, "actionable_steps.json", existing_data)
            remove_duplicate_steps(folder_path, "actionable_steps.json")

            return new_data  # ✅ Success, exit the loop

        except Exception as e:
            attempt += 1
            print(f"[Attempt {attempt}] Error occurred: {e}")
            time.sleep(base_delay * attempt)  # Exponential backoff

    print("❌ Failed after max retries. Skipping this chunk safely.")
    return {"steps": []}  # Return empty but safe output so the flow continues
