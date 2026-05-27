import json
import re
import time

from langchain_core.messages import HumanMessage
from src.utils.file_operations import load_json_file, save_json_file
from src.utils.prompts import step_extraction_prompt


def clean_llm_text(text):
    """
    Safely converts literal escape sequences (like \n) into actual characters
    without breaking emojis or causing encoding errors.
    """
    if not isinstance(text, str):
        return text

    text = text.strip().strip('"').strip("'")

    text = text.replace(r"\n", "\n")

    def decode_match(match):
        try:
            return match.group(0).encode("utf-8").decode("unicode_escape")
        except:
            return match.group(0)

    text = re.sub(r"\\u[0-9a-fA-F]{4}", decode_match, text)

    return text


def clean_and_parse_json(content):
    """
    Parses JSON from an LLM response, handling both raw JSON
    and Markdown code blocks (```json ... ```).
    """
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    try:
        pattern = r"```(?:json)?\s*(.*?)```"
        match = re.search(pattern, content, re.DOTALL)
        if match:
            json_str = match.group(1).strip()
            return json.loads(json_str)
    except Exception:
        pass

    return None


def extract_actionable_steps(
    folder_path, model, text_chunk, max_retries=5, base_delay=2
):
    attempt = 0
    while attempt < max_retries:
        try:
            prompt = step_extraction_prompt(text_chunk)
            response = model.invoke([HumanMessage(content=prompt)])

            new_data = clean_and_parse_json(response.content)

            if (
                not isinstance(new_data, dict)
                or "steps" not in new_data
                or not isinstance(new_data["steps"], list)
            ):
                raise ValueError("Invalid response format.")

            for step in new_data["steps"]:
                if "detailed_breakdown" in step:
                    step["detailed_breakdown"] = clean_llm_text(
                        step["detailed_breakdown"]
                    )

            existing_data = load_json_file(
                folder_path, "actionable_steps.json", {"steps": []}
            )
            existing_steps = {step["step"] for step in existing_data["steps"]}

            for step in new_data["steps"]:
                if step["step"] not in existing_steps:
                    existing_data["steps"].append(step)

            save_json_file(folder_path, "actionable_steps.json", existing_data)

            print(f"✅ Successfully processed chunk (Attempt {attempt + 1})")
            return new_data["steps"]

        except Exception as e:
            attempt += 1
            print(f"[Attempt {attempt}] Error occurred: {e}")
            time.sleep(base_delay * attempt)

    return []
