import os
import json
from langchain_groq import ChatGroq
from src.utils.pdf_operations import extract_text_from_pdf 
from src.components.step_extraction import extract_actionable_steps
from src.components.categorization import categorize_steps
from src.components.hierarchy import order_hierarchy
from src.utils.file_operations import load_json_file , save_json_file
from dotenv import load_dotenv

load_dotenv()

class BookistProcessor:
    def __init__(self, pdf_path, title, author, description, thumbnail,category, model_name="llama-3.3-70b-versatile", chunk_size=5):
        self.pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]
        self.pdf_path = pdf_path
        self.model = ChatGroq(model_name=model_name,api_key=os.getenv("GROQ_API_KEY"))
        self.chunk_size = chunk_size
        self.folder_path = os.path.join(os.getcwd(), self.pdf_name)
        self.metadata = {
            "Title": title,
            "Author": author,
            "Description": description,
            "Thumbnail": thumbnail,
            "Category":category,
            "Content": {}
        }
    
    def process(self):
        print("processed called")
        text_chunks = extract_text_from_pdf(self.pdf_path, self.chunk_size)
        for chunk in text_chunks:
            extracted_steps = extract_actionable_steps(self.folder_path, self.model, chunk)
            categorize_steps(self.folder_path, extracted_steps,self.metadata["Category"], self.model)
        #     order_hierarchy(self.folder_path, categorized_steps, self.model)
        file = load_json_file(self.pdf_name,"categorized_steps.json",{})
        self.metadata["Content"] = file
        save_json_file(self.pdf_name,"final_result.json",self.metadata)
        return self.metadata
    
        

