from bs4 import BeautifulSoup
import re, json
from sentence_transformers import SentenceTransformer
import numpy as np
import umap
from sklearn.cluster import AgglomerativeClustering

# Load a pre-trained model
model = SentenceTransformer('BAAI/bge-large-en-v1.5')
questions = json.load(open("questions.json"))

def HTMLtoText(html):
    text = re.sub(r"\n+", "\n", BeautifulSoup(html, features="html.parser").get_text())
    text = re.sub(r"\s+", " ", text).strip()
    return text

def questionToText(question):
    question = ((HTMLtoText(question["question"]) + " ")*4) + "\n" + HTMLtoText(question["paragraph"]) + "\nChoices:\n" + HTMLtoText("\n ".join(question["choices"])) + "\nExplanation" +  HTMLtoText(question["explanation"]) 
    return question

def embedQuestion(question):
    text = questionToText(question)
    text = "Represent this sentence for clustering: " + text
    return model.encode([text])

def embedQuestions(questions):
    return model.encode([questionToText(i) for i in questions])

# Get embeddings
math_embeddings = embedQuestions(questions["math"])
english_embeddings = embedQuestions(questions["english"])

# Combine all embeddings for cross-subject clustering (this worked better)
all_embeddings = np.vstack([math_embeddings, english_embeddings])
n_samples = all_embeddings.shape[0]

# For real dataset - optimal parameters for hundreds/thousands of questions
n_neighbors = min(12, n_samples - 1)  # Better local structure capture
n_components = min(39, n_samples - 1)  # More dimensions for complex data
n_clusters = min(87, n_samples - 1)  # 87 clusters as requested

print(f"Dataset size: {n_samples} questions")
print(f"Using {n_neighbors} neighbors, {n_components} components, {n_clusters} clusters")

# UMAP with parameters optimized for small datasets
reducer = umap.UMAP(
    n_components=n_components,
    n_neighbors=n_neighbors,
    min_dist=0.0,  # Minimum distance for maximum separation
    metric='cosine',
    random_state=87
)

reduced_embeddings = reducer.fit_transform(all_embeddings)

# Hierarchical clustering
clusterer = AgglomerativeClustering(n_clusters=n_clusters, linkage='ward')
cluster_labels = clusterer.fit_predict(reduced_embeddings)

# Create cluster-enhanced embeddings by appending one-hot cluster vectors
def add_cluster_to_embedding(embedding, cluster_id, n_clusters, cluster_weight=2.0):
    """Add one-hot cluster vector to embedding with configurable weight"""
    one_hot = np.zeros(n_clusters)
    one_hot[cluster_id] = cluster_weight  # Weight controls cluster influence
    return np.concatenate([embedding, one_hot])

# Add cluster-enhanced embeddings to math questions
math_start = 0
for idx in range(len(questions["math"])):
    base_embedding = reduced_embeddings[math_start + idx]
    cluster_id = int(cluster_labels[math_start + idx])
    enhanced_embedding = add_cluster_to_embedding(base_embedding, cluster_id, n_clusters)
    
    # questions["math"][idx]["embedding"] = enhanced_embedding.tolist()
    questions["math"][idx]["cluster"] = cluster_id

# Add cluster-enhanced embeddings to english questions  
english_start = len(questions["math"])
for idx in range(len(questions["english"])):
    base_embedding = reduced_embeddings[english_start + idx]
    cluster_id = int(cluster_labels[english_start + idx])
    enhanced_embedding = add_cluster_to_embedding(base_embedding, cluster_id, n_clusters)
    
    # questions["english"][idx]["embedding"] = enhanced_embedding.tolist()
    questions["english"][idx]["cluster"] = cluster_id

    # actually we rly dont need embeds anymore

with open("questions-with-embeds.json", "w+") as f:
    json.dump(questions, f, indent=4)