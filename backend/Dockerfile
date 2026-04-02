FROM python:3.11-slim

# 1. Install system dependencies as root first
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Set up the non-root user Hugging Face requires
RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

# 🌟 NEW: Explicitly set the Hugging Face cache directory so it doesn't get confused
ENV HF_HOME="/home/user/.cache/huggingface"

WORKDIR /app

# 3. Copy requirements and set ownership to 'user'
COPY --chown=user requirements.txt .

# 4. Install Python packages
RUN pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# 🌟 NEW: Pre-download the SentenceTransformer model during the build!
RUN python -c "from sentence_transformers import SentenceTransformer, CrossEncoder; \
    SentenceTransformer('all-MiniLM-L6-v2'); \
    CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')"
# 5. Copy the rest of your backend code
COPY --chown=user . .

# 6. Expose the mandatory Hugging Face port
EXPOSE 7860

# 7. Start the server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]