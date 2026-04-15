import os
from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, START, END
from core.llm import llm

from src.utils.pdf_operations import extract_text_from_pdf 
from src.components.step_extraction import extract_actionable_steps
from src.components.categorization import categorize_steps
from src.utils.file_operations import load_json_file, save_json_file
from src.components.duplicate_removel import remove_duplicate_steps 

class GraphState(TypedDict):
    pdf_path: str
    pdf_name: str
    folder_path: str
    chunk_size: int
    category: str
    chunks: List[str]
    extracted_steps: List[str] 
    unique_steps: List[str]     
    metadata: Dict[str, Any]

class BookistProcessor:
    def __init__(self, pdf_path, title, author, description, thumbnail, category, chunk_size=5):
        self.pdf_name = os.path.splitext(os.path.basename(pdf_path))[0]
        self.pdf_path = pdf_path
        self.model = llm
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

    def extract_steps_node(self, state: GraphState):
        """Extracts steps from all chunks and combines them into one giant list."""
        print(f"--- NODE: Extracting Steps from {len(state['chunks'])} Chunks ---")
        all_steps = []
        
        for chunk in state["chunks"]:
            steps = extract_actionable_steps(state["folder_path"], self.model, chunk)
            if steps:
                all_steps.extend(steps)
                
        return {"extracted_steps": all_steps}

    def deduplicate_steps_node(self, state: GraphState):
        """Runs the semantic deduplication against the entire book's extracted steps."""
        print(f"--- NODE: Deduplicating {len(state['extracted_steps'])} Total Steps ---")
        
        unique_steps = remove_duplicate_steps(state["extracted_steps"])
        
        print(f"--- Result: Reduced to {len(unique_steps)} Unique Steps ---")
        return {"unique_steps": unique_steps}

    def categorize_steps_node(self, state: GraphState):
        """Passes the final unique list to the LLM for categorization."""
        print(f"--- NODE: Categorizing {len(state['unique_steps'])} Unique Steps ---")
        
        if state["unique_steps"]:
            categorize_steps(state["folder_path"], state["unique_steps"], state["category"], self.model)
            
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
        workflow.add_node("extract_steps", self.extract_steps_node)
        workflow.add_node("deduplicate_steps", self.deduplicate_steps_node)
        workflow.add_node("categorize_steps", self.categorize_steps_node)
        workflow.add_node("finalize", self.finalize_node)

        workflow.add_edge(START, "extract_chunks")
        workflow.add_edge("extract_chunks", "extract_steps")
        workflow.add_edge("extract_steps", "deduplicate_steps")
        workflow.add_edge("deduplicate_steps", "categorize_steps")
        workflow.add_edge("categorize_steps", "finalize")
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
            "extracted_steps": [], 
            "unique_steps": [],   
            "metadata": self.initial_metadata
        }
        
        final_state = self.graph.invoke(initial_state)
        
        print("Processing complete!")
        return final_state["metadata"]