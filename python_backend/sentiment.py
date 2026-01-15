from snownlp import SnowNLP
from textblob import TextBlob

def analyze_sentiment(texts: list[str], language: str = 'zh') -> dict:
    """
    分别使用SnowNLP和TextBlob分析文本情感。
    """
    detailed_results = []
    positive_count = 0
    negative_count = 0
    neutral_count = 0
    
    total_score = 0
    valid_count = 0
    
    for text in texts:
        if not text or not isinstance(text, str):
            continue
            
        try:
            score = 0.5
            label = "neutral"
            
            if language == 'en':
                # TextBlob Polarity: -1.0 to 1.0
                analysis = TextBlob(text)
                polarity = analysis.sentiment.polarity
                # Normalize to 0-1 range for consistency with SnowNLP
                score = (polarity + 1) / 2
            else:
                # SnowNLP: 0 to 1 Prob
                s = SnowNLP(text)
                score = s.sentiments
            
            if score > 0.6:
                label = "positive"
                positive_count += 1
            elif score < 0.4:
                label = "negative"
                negative_count += 1
            else:
                neutral_count += 1
                
            detailed_results.append({
                "text": text[:50] + "..." if len(text) > 50 else text,
                "score": score,
                "label": label
            })
            
            total_score += score
            valid_count += 1
            
        except Exception as e:
            # Fallback for errors
            print(f"Sentiment error for text: {text[:20]}, error: {e}")
            pass
            
    avg_score = total_score / valid_count if valid_count > 0 else 0.5
    
    overall_label = "neutral"
    if avg_score > 0.6:
        overall_label = "positive"
    elif avg_score < 0.4:
        overall_label = "negative"
        
    return {
        "summary": {
            "score": avg_score,
            "label": overall_label,
            "confidence": abs(avg_score - 0.5) * 2, # Rough confidence
            "positive_count": positive_count,
            "negative_count": negative_count,
            "neutral_count": neutral_count,
            "total_count": valid_count
        },
        "details": detailed_results
    }
