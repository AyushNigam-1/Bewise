import json
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.cluster import DBSCAN
from src.utils.file_operations import load_json_file , save_json_file

def extract_steps(data):
    return [step_obj['step'] for step_obj in data['steps']]

def deduplicate_steps(steps, model, eps=0.4, min_samples=1):
    embeddings = model.encode(steps, normalize_embeddings=True)
    clustering = DBSCAN(eps=eps, min_samples=min_samples, metric='cosine').fit(embeddings)
    unique_steps = {}
    for i, label in enumerate(clustering.labels_):
        if label not in unique_steps:
            unique_steps[label] = steps[i]
    return list(unique_steps.values())

def filter_original_data(data, unique_steps):
    data['steps'] = [step_obj for step_obj in data['steps'] if step_obj['step'] in unique_steps]
    return data

def process_file(folder_name , file_name ):
    model = SentenceTransformer('sentence-transformers/all-mpnet-base-v2')
    data = load_json_file(folder_name,file_name , [])
    steps = extract_steps(data)
    unique_steps = deduplicate_steps(steps, model)
    cleaned_data = filter_original_data(data, unique_steps)
    save_json_file(folder_name , file_name , cleaned_data)

