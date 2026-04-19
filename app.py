from flask import Flask, render_template, jsonify
from datetime import datetime
import threading
import time
import logging
import os

from config import SECTOR_STOCKS, REFRESH_INTERVAL
import state
from fetchers import fetch_sector_stocks, refresh_all, fetch_all_breadth

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

app = Flask(__name__)


def background_loop():
    while True:
        try:
            refresh_all()
            fetch_all_breadth()
        except Exception as e:
            logging.error("Background refresh crashed: %s", e)
        time.sleep(REFRESH_INTERVAL)


@app.route("/")
def index():
    return render_template("index.html", refresh_interval=REFRESH_INTERVAL,
                           expandable=list(SECTOR_STOCKS.keys()))


@app.route("/api/data")
def api_data():
    with state.cache_lock:
        return jsonify({k: state.cache[k] for k in ("data", "last_updated", "loading", "errors")})


@app.route("/api/breadth")
def api_breadth():
    with state.breadth_lock:
        return jsonify({"ready": state.breadth_ready, "data": dict(state.breadth_cache)})


@app.route("/api/sector/<path:name>")
def api_sector(name):
    with state.sector_lock:
        cached = state.sector_cache.get(name)
        if cached and (datetime.now() - cached["fetched_at"]).total_seconds() < REFRESH_INTERVAL:
            return jsonify({"loading": False, "data": cached["data"], "error": None})

    data = fetch_sector_stocks(name)
    with state.sector_lock:
        state.sector_cache[name] = {"data": data, "fetched_at": datetime.now()}
    return jsonify({"loading": False, "data": data, "error": None if data else "No data"})


threading.Thread(target=background_loop, daemon=True).start()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(debug=False, port=port, use_reloader=False, threaded=True)
