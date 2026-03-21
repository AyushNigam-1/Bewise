import os
from typing import TypedDict, List, Dict, Any
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, START, END
from dotenv import load_dotenv
from src.utils.pdf_operations import extract_text_from_pdf 
from src.components.step_extraction import extract_actionable_steps
from src.components.categorization import categorize_steps
from src.utils.file_operations import load_json_file, save_json_file

load_dotenv()

class GraphState(TypedDict):
    pdf_path: str
    pdf_name: str
    folder_path: str
    chunk_size: int
    category: str
    chunks: List[str]
    metadata: Dict[str, Any]

class BookistProcessor:
    def __init__(self, pdf_path, title, author, description, thumbnail, category, model_name="llama-3.3-70b-versatile", chunk_size=5):
        self.pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]
        self.pdf_path = pdf_path
        self.model = ChatGroq(model_name=model_name, api_key=os.getenv("GROQ_API_KEY"))
        self.chunk_size = chunk_size
        self.folder_path = os.path.join(os.getcwd(), self.pdf_name)
        
        self.initial_metadata = {
            "Title": title,
            "Author": author,
            "Description": description,
            "Thumbnail": thumbnail,
            "Category": category,
            "Content": {}
        }
        
        self.category = category
        self.graph = self._build_graph()

    
    def extract_chunks_node(self, state: GraphState):
        """Reads the PDF and extracts it into chunks."""
        print("--- NODE: Extracting Text Chunks ---")
        chunks = extract_text_from_pdf(state["pdf_path"], state["chunk_size"])
        return {"chunks": chunks}

    def process_chunks_node(self, state: GraphState):
        """Processes each chunk sequentially."""
        print(f"--- NODE: Processing {len(state['chunks'])} Chunks ---")
        for chunk in state["chunks"]:
            extracted_steps = extract_actionable_steps(state["folder_path"], self.model, chunk)
            categorize_steps(state["folder_path"], extracted_steps, state["category"], self.model)
        return {}

    def finalize_node(self, state: GraphState):
        """Compiles the final JSON output."""
        print("--- NODE: Finalizing Output ---")
        file = load_json_file(state["pdf_name"], "categorized_steps.json", {})
        
        metadata = state["metadata"]
        metadata["Content"] = file
        
        save_json_file(state["pdf_name"], "final_result.json", metadata)
        return {"metadata": metadata}


    def _build_graph(self):
        """Defines the workflow and compiles the StateGraph."""
        workflow = StateGraph(GraphState)
        workflow.add_node("extract_chunks", self.extract_chunks_node)
        workflow.add_node("process_chunks", self.process_chunks_node)
        workflow.add_node("finalize", self.finalize_node)

        workflow.add_edge(START, "extract_chunks")
        workflow.add_edge("extract_chunks", "process_chunks")
        workflow.add_edge("process_chunks", "finalize")
        workflow.add_edge("finalize", END)

        return workflow.compile()
    
    def process(self):
        """Triggers the LangGraph execution."""
        print("Starting LangGraph processing...")
        
        initial_state = {
            "pdf_path": self.pdf_path,
            "pdf_name": self.pdf_name,
            "folder_path": self.folder_path,
            "chunk_size": self.chunk_size,
            "category": self.category,
            "chunks": [],
            "metadata": self.initial_metadata
        }
        
        final_state = self.graph.invoke(initial_state)
        
        print("Processing complete!")
        return final_state["metadata"]