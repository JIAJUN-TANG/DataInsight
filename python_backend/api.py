import sys
from fastapi import FastAPI
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Allow React frontend to access (solve CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/data")
def process_data(data: dict):
    if "value" in data and isinstance(data["value"], (int, float)):
        return {"result": data["value"] * 2}
    return {"result": "Invalid input"}

import config

@app.get("/api/config")
def get_api_config():
    return config.get_config()

@app.post("/api/config")
def save_api_config(configs: list[dict]):
    config.save_config(configs)
    return {"status": "success"}

@app.delete("/api/config/{config_id}")
def delete_api_config(config_id: str):
    success = config.delete_config(config_id)
    if success:
        return {"status": "success"}
    return {"status": "not found", "message": "Config not found"}

from snownlp import SnowNLP

@app.post("/api/sentiment")
def analyze_sentiment(payload: dict):
    texts = payload.get("texts", [])
    results = []
    for text in texts:
        if not text or not isinstance(text, str):
            results.append({"score": 0.5, "label": "neutral"})
            continue
            
        try:
            s = SnowNLP(text)
            score = s.sentiments
            # SnowNLP score: 接近1表示正面，接近0表示负面
            label = "neutral"
            if score > 0.6:
                label = "positive"
            elif score < 0.4:
                label = "negative"
                
            results.append({
                "score": score,
                "label": label
            })
        except Exception as e:
            print(f"Error analyzing text: {text}, error: {e}")
            results.append({"score": 0.5, "label": "neutral"})
            
    return results

import process

@app.post("/api/cut")
def cut_text(payload: dict):
    text = payload.get("text", "")
    return process.cut_text(text)

@app.post("/api/keywords")
def extract_keywords(payload: dict):
    text = payload.get("text", "")
    topK = payload.get("topK", 5)
    return process.extract_keywords(text, topK)

import sentiment
import clustering

@app.post("/api/analyze/sentiment")
def api_analyze_sentiment(payload: dict):
    texts = payload.get("texts", [])
    language = payload.get("language", "zh")
    return sentiment.analyze_sentiment(texts, language=language)

@app.post("/api/analyze/topic")
def api_analyze_topic(payload: dict):
    texts = payload.get("texts", [])
    language = payload.get("language", "zh")
    return clustering.perform_topic_analysis(texts, language=language)

# Deprecated but kept for backward compatibility if needed, though we will update frontend
@app.post("/api/sentiment")
def analyze_sentiment_legacy(payload: dict):
    texts = payload.get("texts", [])
    # Re-use new logic but format as old expected list
    s_result = sentiment.analyze_sentiment(texts)
    # detailed_results has {text, score, label}
    # legacy expected list of {score, label}
    return [{"score": r["score"], "label": r["label"]} for r in s_result["details"]]


if __name__ == "__main__":
    # In production, this might be passed from Electron or use port 0
    # For now, we hardcode 4321 as planned
    uvicorn.run(app, host="127.0.0.1", port=4321)
