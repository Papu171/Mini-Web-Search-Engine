# Mini-Web-Search-Engine


**Student:** Emiliano Corona  
**Course:** Big Data - UAG  
**Enhancement:** E — TF-IDF vs BM25 Comparison

---

## 📌 Domain & Justification

**Domain:** National Football League (NFL)

The NFL is the most popular sports league in the United States and one of the most data-rich domains in professional sports. Every player, team, game, and historical moment generates a wealth of documented information across news articles, statistics, and encyclopedic sources. This makes the NFL an ideal domain for a search engine — queries can range from specific players like "Josh Allen" or "Aaron Donald" to historical events like the Ice Bowl or Super Bowl LI. The diversity of documents across categories (players, teams, Super Bowls, history, media) allows the search engine to demonstrate meaningful ranking differences between algorithms, which is especially valuable for the BM25 vs TF-IDF comparison enhancement.

---

## ⚙️ Enhancement E — TF-IDF vs BM25 Side-by-Side Comparison

This project implements **Enhancement E: TF-IDF vs BM25 Comparison**.

The interface offers three search modes:

| Mode | Description |
|------|-------------|
| **BM25 vs TF-IDF** | Shows both rankings side by side for the same query |
| **BM25 only** | Single-column results ranked by BM25 |
| **TF-IDF only** | Single-column results ranked by TF-IDF |

### Why the rankings differ

**BM25 (Best Match 25)** normalizes scores by document length using parameters `k1=1.5` and `b=0.75`. A long document that mentions a term many times is penalized if it is much longer than average, preventing it from dominating results simply due to size.

**TF-IDF (Term Frequency × Inverse Document Frequency)** uses normalized term frequency divided by document length, multiplied by a smooth IDF. It does not apply the same saturation control as BM25, which means short dense documents often rank higher under TF-IDF.

The side-by-side view makes these differences immediately visible to the user.

---

## 📁 Project Structure

```
nfl-search-engine/
├── corpus.json          # 40 real NFL documents with Wikipedia sources
├── search_engine.py     # Tokenization, inverted index, BM25, TF-IDF
├── app.py               # Flask web server with /search and /stats routes
├── requirements.txt     # Python dependencies
├── README.md            # This file
├── templates/
│   └── index.html       # Main search interface
└── static/
    ├── css/
    │   └── style.css    # Dark sports editorial design
    └── js/
        └── main.js      # Frontend search logic
```

---

## 🧠 Search Engine Components

| Component | Implementation |
|-----------|---------------|
| **Tokenization** | `re.sub` + `.split()` on lowercased text |
| **Stop words** | NLTK English stop words list |
| **Stemming** | NLTK Porter Stemmer |
| **Inverted Index** | `dict` → `{term: {doc_id: frequency}}` |
| **BM25** | Full BM25 with IDF and TF normalization, k1=1.5, b=0.75 |
| **TF-IDF** | Normalized TF × smooth IDF |
| **Backend** | Flask 3.0 with `/`, `/search`, `/stats` routes |

---

## 📊 Corpus

- **40 documents** sourced from Wikipedia
- **Categories:** players, teams, superbowls, history, media
- **Notable documents:** Tom Brady, Patrick Mahomes, Josh Allen, Drew Brees, Justin Jefferson, Joe Burrow, Aaron Donald, Travis Kelce, Jerry Rice, Lamar Jackson, and more
- Each document contains 100–200+ words
- All sources documented with real Wikipedia URLs

---

## 🚀 How to Run Locally

### 1. Clone the repository
```bash
git clone https://github.com/emilianoc/nfl-search-engine.git
cd nfl-search-engine
```

### 2. Install dependencies
```bash
pip install flask nltk
```

### 3. Run the server
```bash
python app.py
```

### 4. Open in browser
```
http://127.0.0.1:5000
```

---

## 🔍 Example Queries to Try

| Query | What it demonstrates |
|-------|----------------------|
| `Tom Brady Super Bowl` | Core BM25 vs TF-IDF ranking difference |
| `Josh Allen Buffalo Bills quarterback` | Modern player document retrieval |
| `greatest defense NFL history` | Multi-term query across history docs |
| `Aaron Donald defensive player` | Specific player + position query |
| `Drew Brees New Orleans passing yards` | Stats-heavy query |

---

## 🖥️ Interface Screenshots

> *(Add screenshots here after running the project)*

**Main search page**  
![Main page](screenshots/main.png)

**BM25 vs TF-IDF comparison results**  
![Comparison](screenshots/comparison.png)

---

## 📦 Dependencies

```
flask==3.0.3
nltk==3.9.1
```

Install with:
```bash
pip install flask nltk
```

---

## ⚠️ Notes

- Search libraries such as Whoosh, Elasticsearch, and Lucene are **not used**. All components are implemented from scratch.
- Flask is used only as the HTTP server, not as part of the search logic.
- NLTK is used only for stop words and stemming.

---

*NFL Search Engine · Data Mining · UAG · 2025*
