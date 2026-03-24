from flask import Flask, jsonify, render_template, request

from search_engine import NFLSearchEngine

app = Flask(__name__)

# Load engine once at startup
engine = NFLSearchEngine("corpus.json")


# ─────────────────────────────────────────────
#  ROUTES
# ─────────────────────────────────────────────

@app.route("/")
def index():
    """Serve the main search page."""
    stats = engine.get_stats()
    return render_template("index.html", stats=stats)


@app.route("/search")
def search():
    """
    Search endpoint.
    Query params:
      - q      : search query (required)
      - mode   : 'bm25' | 'tfidf' | 'compare'  (default: compare)
      - top_k  : number of results (default: 10)
    """
    query = request.args.get("q", "").strip()
    mode  = request.args.get("mode", "compare")
    top_k = int(request.args.get("top_k", 10))

    if not query:
        return jsonify({"error": "Empty query"}), 400

    if mode == "bm25":
        results = engine.search_bm25(query, top_k)
        return jsonify({
            "query": query,
            "mode": "bm25",
            "results": results,
            "stats": engine.get_stats(),
        })

    elif mode == "tfidf":
        results = engine.search_tfidf(query, top_k)
        return jsonify({
            "query": query,
            "mode": "tfidf",
            "results": results,
            "stats": engine.get_stats(),
        })

    else:  # compare (Enhancement E)
        comparison = engine.search_compare(query, top_k)
        comparison["stats"] = engine.get_stats()
        return jsonify(comparison)


@app.route("/suggestions")
def suggestions():
    """Return document titles as autocomplete suggestions."""
    data = [
        {"text": doc["title"] + " " + doc.get("category", ""), "category": doc.get("category", "")}
        for doc in engine.corpus
    ]
    # Also add some common multi-word queries built from titles
    extra = [
        {"text": doc["title"], "category": doc.get("category", "")}
        for doc in engine.corpus
    ]
    return jsonify({"suggestions": extra})


@app.route("/stats")
def stats():
    """Return engine statistics as JSON."""
    return jsonify(engine.get_stats())


# ─────────────────────────────────────────────
#  RUN
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("NFL Search Engine running at http://127.0.0.1:5000")
    app.run(debug=True)