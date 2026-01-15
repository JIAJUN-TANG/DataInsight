from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.decomposition import LatentDirichletAllocation
import numpy as np
import process

def perform_topic_analysis(texts: list[str], n_topics: int = 5, language: str = 'zh') -> list[dict]:
    """
    Perform LDA topic modeling.
    Returns a list of topics with top keywords and weights.
    """
    if not texts:
        return []

    # 1. Preprocess
    # Returns list of space-separated tokens
    processed_texts = process.preprocess_corpus(texts, language=language)
    
    # Filter empty texts
    valid_texts = [t for t in processed_texts if t.strip()]
    if not valid_texts:
        return []

    # 2. Vectorize (CountVectorizer for LDA)
    # Using TF instead of TF-IDF is often better for LDA, but let's stick to standard CountVectorizer
    # min_df=1 means even if it appears once, we count it (for small datasets)
    vectorizer = CountVectorizer(max_df=0.95, min_df=1, max_features=1000)
    tf = vectorizer.fit_transform(valid_texts)
    feature_names = vectorizer.get_feature_names_out()

    # 3. Fit LDA
    # Adjust n_topics if we have very documents
    actual_topics = min(n_topics, len(valid_texts), 10)
    if actual_topics < 2:
        actual_topics = 1
        
    lda = LatentDirichletAllocation(
        n_components=actual_topics,
        max_iter=10,
        learning_method='online',
        learning_offset=50.,
        random_state=0
    )
    
    lda.fit(tf)

    # 4. Extract Topics
    topics = []
    
    # Calculate topic weights (approximate by document assignment)
    doc_topic_dist = lda.transform(tf)
    # Average topic distribution across all documents to get "weight"
    topic_weights = doc_topic_dist.mean(axis=0)
    
    for topic_idx, topic in enumerate(lda.components_):
        # Get top 10 keywords for this topic
        top_indices = topic.argsort()[:-11:-1]
        top_keywords = [feature_names[i] for i in top_indices]
        
        # Calculate approximate weight
        weight = float(topic_weights[topic_idx])
        
        topics.append({
            "topic": topic_idx + 1,
            "keywords": top_keywords,
            "weight": weight
        })
        
    # Sort topics by weight
    topics.sort(key=lambda x: x["weight"], reverse=True)
    
    return topics
