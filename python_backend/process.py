import jieba
import jieba.analyse
import re
from collections import Counter

# Basic stopwords list (CN)
STOPWORDS = set([
    '的', '了', '和', '是', '就', '都', '而', '及', '与', '着', '或', '一个', '这个', '那个', '这些', '那些',
    '在', '上', '下', '左', '右', '前', '后', '里', '外', '中', '内', '间', '之', '以', '于', '为',
    '对于', '关于', '至于', '由于', '因为', '所以', '因此', '然而', '但是', '可是', '不过', '虽然', '尽管',
    '如果', '假如', '假设', '倘若', '要是', '只要', '只有', '除非', '否则', '不管', '无论', '即使', '即便',
    '还是', '或者', '并且', '而且', '甚至', '更', '最', '很', '非常', '太', '极', '极其', '格外', '特别',
    '稍微', '略微', '比较', '相当', '几乎', '差不多', '大约', '大概', '左右', '上下', '前后', '多少',
    '一些', '有些', '若干', '许多', '不少', '大量', '众多', '多数', '少数', '部分', '全部', '所有',
    '一切', '任何', '每', '各', '每个', '各个', '各自', '其他', '另外', '还有', '以及', '等等', '诸如此类',
    '例如', '比如', '像', '如', '比如', '诸如', '例如', '就是', '即', '乃', '则', '却', '才', '也', '又',
    '再', '还', '仍', '仍然', '已', '已经', '曾', '曾经', '刚', '刚刚', '正', '正在', '将', '将要', '会',
    '能', '能够', '可以', '可能', '应该', '应当', '必须', '不得不', '得', '要', '想要', '希望', '愿意',
    '喜欢', '爱', '恨', '讨厌', '想', '认为', '觉得', '感到', '以为', '知道', '了解', '明白', '懂得',
    '认识', '记住', '忘记', '记得', '想起', '看到', '听见', '闻到', '尝到', '摸到', '感觉到',
    # Punctuations and special chars
    '，', '。', '！', '？', '：', '；', '“', '”', '‘', '’', '（', '）', '【', '】', '、', '…', '—', '-', ',', '.', '!', '?', ':', ';', '"', '\'', '(', ')', '[', ']', '{', '}', '<', '>', '/'
])

# Basic English stopwords
STOPWORDS_EN = set([
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're", "you've", "you'll", "you'd", 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', "she's", 'her', 'hers', 'herself', 'it', "it's", 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', "that'll", 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', "don't", 'should', "should've", 'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren', "aren't", 'couldn', "couldn't", 'didn', "didn't", 'doesn', "doesn't", 'hadn', "hadn't", 'hasn', "hasn't", 'haven', "haven't", 'isn', "isn't", 'ma', 'mightn', "mightn't", 'mustn', "mustn't", 'needn', "needn't", 'shan', "shan't", 'shouldn', "shouldn't", 'wasn', "wasn't", 'weren', "weren't", 'won', "won't", 'wouldn', "wouldn't"
])

def cut_text(text: str, language: str = 'zh') -> list[str]:
    """
    Function to cut text into tokens.
    """
    if not text:
        return []
        
    if language == 'en':
        return text.split()
    
    return list(jieba.cut(text))

def extract_keywords(text: str, topK: int = 5, language: str = 'zh') -> list[dict]:
    """
    Extract keywords from text using TF-IDF.
    Returns a list of dicts: {'word': ..., 'weight': ...}
    """
    if not text:
        return []
    
    if language == 'en':
        words = re.findall(r'\b\w+\b', text.lower())
        filtered = [w for w in words if w not in STOPWORDS_EN and len(w) > 2]
        counts = Counter(filtered)
        total = sum(counts.values()) if counts else 1
        return [{"word": w, "weight": count/total} for w, count in counts.most_common(topK)]
    
    tags = jieba.analyse.extract_tags(text, topK=topK, withWeight=True)
    
    results = []
    for word, weight in tags:
        results.append({"word": word, "weight": weight})
        
    return results

def preprocess_corpus(texts: list[str], language: str = 'zh') -> list[str]:
    """
    Preprocess a list of texts: cut and remove stopwords.
    Returns a list of space-separated strings (for TF-IDF).
    """
    result = []
    stopwords = STOPWORDS_EN if language == 'en' else STOPWORDS
    
    for text in texts:
        if not text or not isinstance(text, str):
            result.append("")
            continue
        
        words = []
        if language == 'en':
            # Basic cleaning for English
            cleaned_text = re.sub(r'[^\w\s]', '', text.lower())
            words = cleaned_text.split()
        else:
            words = jieba.cut(text)
            
        filtered = [w for w in words if w.strip() and w not in stopwords]
        result.append(" ".join(filtered))
        
    return result
