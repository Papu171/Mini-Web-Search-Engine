import json
import math
import re
import time
from collections import defaultdict

import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer

# Download required NLTK data (only runs once)
nltk.download("stopwords", quiet=True)
nltk.download("punkt", quiet=True)

# ─────────────────────────────────────────────
#  TEXT PROCESSING PIPELINE
# ─────────────────────────────────────────────

stemmer = PorterStemmer()
stop_words = set(stopwords.words("english"))


def preprocess(text: str) -> list[str]:
    """
    Full text cleaning pipeline:
    1. Lowercase
    2. Remove non-alphabetic characters
    3. Tokenize
    4. Remove stop words
    5. Stem each token
    """
    text = text.lower()
    text = re.sub(r"[^a-z\s]", " ", text)
    tokens = text.split()
    tokens = [t for t in tokens if t not in stop_words and len(t) > 1]
    tokens = [stemmer.stem(t) for t in tokens]
    return tokens


# ─────────────────────────────────────────────
#  SEARCH ENGINE CLASS
# ─────────────────────────────────────────────

class NFLSearchEngine:
    def __init__(self, corpus_path: str = "corpus.json"):
        self.corpus = []           # Raw documents
        self.index = {}            # Inverted index  {term: {doc_id: freq}}
        self.doc_lengths = {}      # {doc_id: number of tokens}
        self.doc_tokens = {}       # {doc_id: list of tokens}
        self.avg_dl = 0.0          # Average document length
        self.vocab_size = 0        # Number of unique terms
        self.N = 0                 # Total number of documents

        # BM25 parameters
        self.k1 = 1.5
        self.b = 0.75

        self._load_corpus(corpus_path)
        self._build_index()

    # ── Load corpus ──────────────────────────
    def _load_corpus(self, path: str):
        with open(path, "r", encoding="utf-8") as f:
            self.corpus = json.load(f)
        self.N = len(self.corpus)

    # ── Build inverted index ─────────────────
    def _build_index(self):
        total_length = 0

        for doc in self.corpus:
            doc_id = doc["id"]
            # Combine title + text for richer indexing
            full_text = doc["title"] + " " + doc["text"]
            tokens = preprocess(full_text)

            self.doc_tokens[doc_id] = tokens
            self.doc_lengths[doc_id] = len(tokens)
            total_length += len(tokens)

            # Count term frequencies per document
            term_freq = defaultdict(int)
            for token in tokens:
                term_freq[token] += 1

            # Add to inverted index
            for term, freq in term_freq.items():
                if term not in self.index:
                    self.index[term] = {}
                self.index[term][doc_id] = freq

        self.avg_dl = total_length / self.N if self.N > 0 else 0
        self.vocab_size = len(self.index)

    # ── BM25 Score for a single term+doc ─────
    def _bm25_score(self, term: str, doc_id: int) -> float:
        if term not in self.index or doc_id not in self.index[term]:
            return 0.0

        tf = self.index[term][doc_id]
        df = len(self.index[term])          # Document frequency
        dl = self.doc_lengths[doc_id]

        # IDF component (BM25 variant)
        idf = math.log((self.N - df + 0.5) / (df + 0.5) + 1)

        # TF normalization component
        tf_norm = (tf * (self.k1 + 1)) / (
            tf + self.k1 * (1 - self.b + self.b * (dl / self.avg_dl))
        )

        return idf * tf_norm

    # ── TF-IDF Score for a single term+doc ───
    def _tfidf_score(self, term: str, doc_id: int) -> float:
        if term not in self.index or doc_id not in self.index[term]:
            return 0.0

        tf_raw = self.index[term][doc_id]
        dl = self.doc_lengths[doc_id]
        df = len(self.index[term])

        # Normalized TF
        tf = tf_raw / dl if dl > 0 else 0

        # Smooth IDF
        idf = math.log((self.N + 1) / (df + 1)) + 1

        return tf * idf

    # ── Search with BM25 ─────────────────────
    def search_bm25(self, query: str, top_k: int = 10) -> list[dict]:
        query_terms = preprocess(query)
        scores = defaultdict(float)

        for term in query_terms:
            if term in self.index:
                for doc_id in self.index[term]:
                    scores[doc_id] += self._bm25_score(term, doc_id)

        # Sort by score descending
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        results = []
        for doc_id, score in ranked[:top_k]:
            doc = next(d for d in self.corpus if d["id"] == doc_id)
            results.append({
                "id": doc_id,
                "title": doc["title"],
                "text": doc["text"][:300] + "...",
                "source": doc["source"],
                "category": doc["category"],
                "score": round(score, 4),
            })
        return results

    # ── Search with TF-IDF ───────────────────
    def search_tfidf(self, query: str, top_k: int = 10) -> list[dict]:
        query_terms = preprocess(query)
        scores = defaultdict(float)

        for term in query_terms:
            if term in self.index:
                for doc_id in self.index[term]:
                    scores[doc_id] += self._tfidf_score(term, doc_id)

        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        results = []
        for doc_id, score in ranked[:top_k]:
            doc = next(d for d in self.corpus if d["id"] == doc_id)
            results.append({
                "id": doc_id,
                "title": doc["title"],
                "text": doc["text"][:300] + "...",
                "source": doc["source"],
                "category": doc["category"],
                "score": round(score, 4),
            })
        return results

    # ── Enhancement E: side-by-side comparison ─
    def search_compare(self, query: str, top_k: int = 10) -> dict:
        """
        Returns both BM25 and TF-IDF rankings for the same query,
        with timing for each algorithm.
        """
        start = time.time()
        bm25_results = self.search_bm25(query, top_k)
        bm25_time = round((time.time() - start) * 1000, 2)

        start = time.time()
        tfidf_results = self.search_tfidf(query, top_k)
        tfidf_time = round((time.time() - start) * 1000, 2)

        return {
            "query": query,
            "bm25": {
                "results": bm25_results,
                "time_ms": bm25_time,
            },
            "tfidf": {
                "results": tfidf_results,
                "time_ms": tfidf_time,
            },
        }

    # ── Engine statistics ────────────────────
    def get_stats(self) -> dict:
        return {
            "total_documents": self.N,
            "vocabulary_size": self.vocab_size,
            "avg_document_length": round(self.avg_dl, 1),
            "bm25_k1": self.k1,
            "bm25_b": self.b,
        }

    # ── Return full inverted index (for debug) ─
    def get_index_sample(self, limit: int = 50) -> dict:
        sample = {}
        for i, (term, postings) in enumerate(self.index.items()):
            if i >= limit:
                break
            sample[term] = postings
        return sample


# ─────────────────────────────────────────────
#  QUICK TEST  (run: python search_engine.py)
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("Loading engine...")
    engine = NFLSearchEngine("corpus.json")

    stats = engine.get_stats()
    print(f"\n=== Engine Stats ===")
    print(f"Documents : {stats['total_documents']}")
    print(f"Vocabulary: {stats['vocabulary_size']} terms")
    print(f"Avg length: {stats['avg_document_length']} tokens")

    query = "Tom Brady Super Bowl championship"
    print(f"\n=== Query: '{query}' ===")

    comparison = engine.search_compare(query, top_k=5)

    print("\n-- BM25 Results --")
    for i, r in enumerate(comparison["bm25"]["results"], 1):
        print(f"  {i}. [{r['score']}] {r['title']}")

    print("\n-- TF-IDF Results --")
    for i, r in enumerate(comparison["tfidf"]["results"], 1):
        print(f"  {i}. [{r['score']}] {r['title']}")