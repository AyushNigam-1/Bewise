from fastembed import TextEmbedding

print("Downloading model...")
# Force the download natively using FastEmbed
embedding_model = TextEmbedding(
    model_name="BAAI/bge-small-en-v1.5", 
    cache_dir="./model_cache"
)
print("Download complete! You can run your eval script now.")