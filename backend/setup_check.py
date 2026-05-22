import os
from openai import OpenAI
from ragas.llms import llm_factory
from dotenv import load_dotenv
load_dotenv() 

def verify_setup():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("❌ Error: GROQ_API_KEY not found.")
        return

    print("✅ GROQ_API_KEY found.")

    try:
        # 1. Initialize the official OpenAI client, but route it to Groq's servers
        groq_compatible_client = OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1"
        )
        
        # 2. Ragas sees an OpenAI client and is perfectly happy, but Groq does the work.
        ragas_judge = llm_factory(
            model="llama-3.3-70b-versatile", 
            client=groq_compatible_client
        )
        
        print("✅ Ragas Judge initialized natively with Groq via OpenAI Compatibility layer. Zero warnings!")
        
    except Exception as e:
        print(f"❌ Failed to initialize LLM: {e}")

if __name__ == "__main__":
    verify_setup()