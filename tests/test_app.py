import json
import os
import pytest
from app import app, DATA_FILE, QUOTES


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_dataset_integrity():
    """Verify that quotes.json contains exactly 100 quotes with required fields and unique IDs."""
    assert os.path.exists(DATA_FILE), f"Dataset file missing: {DATA_FILE}"
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        quotes = json.load(f)

    assert len(quotes) == 100, f"Expected 100 quotes, found {len(quotes)}"
    ids = set()
    for q in quotes:
        assert "id" in q, "Missing 'id'"
        assert isinstance(q["id"], int), "Quote 'id' must be an integer"
        assert q["id"] not in ids, f"Duplicate ID found: {q['id']}"
        ids.add(q["id"])

        assert "quote" in q and len(q["quote"].strip()) > 0, "Empty quote text"
        assert "author" in q and len(q["author"].strip()) > 0, "Empty author"
        assert "category" in q and len(q["category"].strip()) > 0, "Empty category"


def test_index_page(client):
    """Test that the homepage loads successfully and includes accessibility attributes and controls."""
    response = client.get("/")
    assert response.status_code == 200
    assert b"QuoteWise" in response.data
    assert b"Random Quote" in response.data
    assert b'aria-live="polite"' in response.data
    assert b"btnBackToTop" in response.data




def test_get_all_quotes(client):
    """Test retrieving all quotes."""
    response = client.get("/api/quotes")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] == 100
    assert len(data["quotes"]) == 100


def test_get_random_quote(client):
    """Test getting a random quote."""
    response = client.get("/api/quotes/random")
    assert response.status_code == 200
    data = response.get_json()
    assert "quote" in data
    assert data["quote"]["id"] in range(1, 101)


def test_get_random_quote_filtered_by_category(client):
    """Test getting a random quote from a specific category."""
    response = client.get("/api/quotes/random?category=Science")
    assert response.status_code == 200
    data = response.get_json()
    assert data["quote"]["category"] == "Science"


def test_get_random_quote_filtered_by_author(client):
    """Test getting a random quote from a specific author."""
    response = client.get("/api/quotes/random?author=Einstein")
    assert response.status_code == 200
    data = response.get_json()
    assert "Einstein" in data["quote"]["author"]


def test_search_quotes_by_author(client):
    """Test searching quotes by author name."""
    response = client.get("/api/quotes?author=Shakespeare")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] >= 1
    for q in data["quotes"]:
        assert "shakespeare" in q["author"].lower()


def test_filter_quotes_by_category(client):
    """Test filtering quotes by category."""
    response = client.get("/api/quotes?category=Philosophy")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] > 0
    for q in data["quotes"]:
        assert q["category"].lower() == "philosophy"


def test_search_quotes_by_keyword(client):
    """Test searching quotes by keyword in quote body."""
    response = client.get("/api/quotes?search=opportunity")
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] >= 1
    found = any("opportunity" in q["quote"].lower() for q in data["quotes"])
    assert found


def test_get_categories(client):
    """Test getting categories endpoint."""
    response = client.get("/api/categories")
    assert response.status_code == 200
    data = response.get_json()
    assert "categories" in data
    assert data["total_quotes"] == 100
    assert len(data["categories"]) >= 5


def test_get_authors(client):
    """Test getting authors endpoint."""
    response = client.get("/api/authors")
    assert response.status_code == 200
    data = response.get_json()
    assert "authors" in data
    assert len(data["authors"]) > 10


def test_export_quotes_csv_all(client):
    """Test exporting all quotes to CSV."""
    response = client.get("/api/quotes/export")
    assert response.status_code == 200
    assert "text/csv" in response.content_type
    assert 'filename=quotes.csv' in response.headers.get("Content-Disposition", "")
    lines = response.data.decode("utf-8").strip().splitlines()
    assert lines[0] == "ID,Quote,Author,Category"
    assert len(lines) == 101  # Header + 100 quotes


def test_export_quotes_csv_filtered(client):
    """Test exporting filtered quotes to CSV."""
    response = client.get("/api/quotes/export?category=Science")
    assert response.status_code == 200
    assert "text/csv" in response.content_type
    lines = response.data.decode("utf-8").strip().splitlines()
    assert lines[0] == "ID,Quote,Author,Category"
    assert len(lines) == 10  # Header + 9 Science quotes
    for line in lines[1:]:
        assert "Science" in line

