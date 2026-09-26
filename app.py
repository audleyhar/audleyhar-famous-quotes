import json
import os
import random
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Base directory & data path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "data", "quotes.json")


def load_quotes():
    """Load quotes from the JSON data file."""
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


QUOTES = load_quotes()


@app.route("/")
def index():
    """Serve the main HTML page."""
    return render_template("index.html")


@app.route("/api/quotes", methods=["GET"])
def get_quotes():
    """
    Search and filter quotes.
    Query parameters:
      - search / q: Substring match in quote text or author name
      - author: Filter by author name (case-insensitive substring)
      - category: Filter by category (case-insensitive exact match)
    """
    query = request.args.get("search") or request.args.get("q", "")
    author_filter = request.args.get("author", "").strip().lower()
    category_filter = request.args.get("category", "").strip().lower()

    results = QUOTES

    if category_filter and category_filter != "all":
        results = [q for q in results if q["category"].lower() == category_filter]

    if author_filter and author_filter != "all":
        results = [q for q in results if author_filter in q["author"].lower()]

    if query.strip():
        q_clean = query.strip().lower()
        results = [
            q
            for q in results
            if q_clean in q["quote"].lower() or q_clean in q["author"].lower()
        ]

    return jsonify({"total": len(results), "quotes": results})


@app.route("/api/quotes/random", methods=["GET"])
def get_random_quote():
    """
    Return a single random quote.
    Optional query parameters:
      - category: pick random quote from specific category
      - author: pick random quote from specific author
      - exclude_id: avoid repeating the currently displayed quote id
    """
    category_filter = request.args.get("category", "").strip().lower()
    author_filter = request.args.get("author", "").strip().lower()
    exclude_id = request.args.get("exclude_id", type=int)

    candidates = QUOTES

    if category_filter and category_filter != "all":
        candidates = [q for q in candidates if q["category"].lower() == category_filter]

    if author_filter and author_filter != "all":
        candidates = [q for q in candidates if author_filter in q["author"].lower()]

    if not candidates:
        return jsonify({"quote": None, "message": "No quotes found for criteria"}), 404

    # If more than 1 candidate and exclude_id matches, filter it out to prevent repeats
    if len(candidates) > 1 and exclude_id is not None:
        filtered_candidates = [q for q in candidates if q.get("id") != exclude_id]
        if filtered_candidates:
            candidates = filtered_candidates

    selected = random.choice(candidates)
    return jsonify({"quote": selected})


@app.route("/api/categories", methods=["GET"])
def get_categories():
    """Return all unique categories with their respective quote counts."""
    counts = {}
    for q in QUOTES:
        cat = q.get("category", "General")
        counts[cat] = counts.get(cat, 0) + 1

    sorted_categories = sorted(counts.items(), key=lambda x: x[0])
    return jsonify({
        "categories": [{"name": name, "count": count} for name, count in sorted_categories],
        "total_quotes": len(QUOTES),
    })


@app.route("/api/authors", methods=["GET"])
def get_authors():
    """Return list of distinct authors and quote count per author."""
    counts = {}
    for q in QUOTES:
        author = q.get("author", "Unknown")
        counts[author] = counts.get(author, 0) + 1

    sorted_authors = sorted(counts.items(), key=lambda x: x[0])
    return jsonify({
        "authors": [{"name": name, "count": count} for name, count in sorted_authors]
    })


if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)
