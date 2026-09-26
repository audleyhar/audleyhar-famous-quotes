# QuoteWise — 100 Famous Quotes Web Application

An interactive, responsive web application built with **Python Flask**, **plain vanilla JavaScript**, **HTML5**, and **CSS3** to explore, search, and discover 100 curated, iconic quotes.

## Features

- **Featured Random Quote**: Displays an inspiring quote on demand with smooth animations and instant clipboard copying.
- **Search Functionality**: Real-time debounced search by quote keywords or author name.
- **Category Filtering**: Filter quotes across 8 distinct categories (*Inspiration*, *Philosophy*, *Science*, *Wisdom*, *Humor*, *Literature*, *Leadership*, *Life*).
- **Author Filtering**: Quick dropdown selector and one-click filtering directly from quote cards.
- **Zero Frontend Frameworks**: Built using pure vanilla modern JavaScript (ES6+) and modern CSS variables.
- **RESTful Flask API**: Lightweight backend endpoints for random quotes, search queries, categories, and author lists.
- **Full Test Coverage**: Automated test suite powered by `pytest`.

## Project Structure

```
├── app.py                  # Flask backend & API routes
├── requirements.txt        # Python dependencies (Flask, pytest)
├── data/
│   └── quotes.json         # 100 curated quotes dataset
├── static/
│   ├── css/
│   │   └── style.css       # Responsive dark-theme styling
│   └── js/
│       └── app.js          # Pure vanilla JS client logic
├── templates/
│   └── index.html          # Semantic HTML5 layout
├── tests/
│   └── test_app.py         # Automated pytest suite
└── .gitignore              # Ignored files (caches, venvs, env)
```

## Getting Started

### 1. Prerequisites
- Python 3.10+ installed

### 2. Installation
```powershell
pip install -r requirements.txt
```

### 3. Run the Application
```powershell
python app.py
```
Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.

### 4. Run Automated Tests
```powershell
pytest tests/ -v
```

## License
MIT License
