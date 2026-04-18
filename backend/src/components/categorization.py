import time
from langchain_core.messages import HumanMessage
from src.utils.pdf_operations import markdown_to_json
from src.utils.file_operations import save_json_file, load_json_file
from src.utils.prompts import categorization_prompt

def categorize_steps(folder_path, actionable_steps, categories, model, max_retries=5, base_delay=2):
    attempt = 0

    while attempt < max_retries:
        try:
            categories_dict = load_json_file("", "categories.json", {})
            subcategories = {
                key: value
                for category in categories
                for key, value in categories_dict.get(category, {}).get("subcategories", {}).items()
            }

            categorized_steps = load_json_file(folder_path, "categorized_steps.json", {})

            if not isinstance(actionable_steps, list):
                raise ValueError(f"Invalid format: Expected a list of steps, got {type(actionable_steps)}")

            steps_data = actionable_steps
            
            steps_only = [item["step"] for item in steps_data if "step" in item]

            prompt = categorization_prompt(subcategories.keys(), steps_only)
            response = model.invoke([HumanMessage(content=prompt)])
            new_categories = markdown_to_json(response.content)

            if not isinstance(new_categories, dict):
                raise ValueError("Categorization response is not a valid dictionary.")

            for category, steps in new_categories.items():
                if not isinstance(steps, list):
                    raise ValueError(f"Steps under {category} are not a list.")

                if category not in categorized_steps:
                    categorized_steps[category] = {
                        "icon": subcategories.get(category, {}).get("icon", ""),
                        "description": subcategories.get(category, {}).get("description", ""),
                        "steps": []
                    }

                existing_steps = {item["step"] for item in categorized_steps[category]["steps"]}
                new_steps = [step for step in steps if step not in existing_steps]

                categorized_steps[category]["steps"].extend(
                    {
                        "step": step,
                        **next(
                            (
                                {
                                    "description": item.get("description", ""),
                                    "detailed_breakdown": item.get("detailed_breakdown", ""),
                                }
                                for item in steps_data if item.get("step") == step
                            ),
                            {"description": "", "detailed_breakdown": ""},
                        )
                    }
                    for step in new_steps
                )

            save_json_file(folder_path, "categorized_steps.json", categorized_steps)
            
            print(f"✅ Successfully categorized steps (Attempt {attempt+1})", flush=True)
            return categorized_steps  

        except Exception as e:
            attempt += 1
            print(f"[Attempt {attempt}] Error in categorization: {e}", flush=True)
            time.sleep(base_delay * attempt)

    print("❌ Categorization failed after max retries. Returning empty categories safely.", flush=True)
    return {}