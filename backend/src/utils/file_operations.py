import json
import os

def load_json_file(folder, filename, default_value):
    file_path = os.path.join(folder, filename)
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default_value

def save_json_file(folder, filename, data):
    os.makedirs(folder, exist_ok=True)
    file_path = os.path.join(folder, filename)
    with open(file_path, "w") as f:
        json.dump(data, f, indent=4)

def delete_json_file(folder, filename):
    """Deletes a JSON file if it exists. Returns True if deleted, False otherwise."""
    file_path = os.path.join(folder, filename)
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception as e:
        print(f"Error deleting file {file_path}: {e}")
        return False