import threading

cache = {"data": [], "last_updated": None, "loading": True, "errors": []}
cache_lock = threading.Lock()

sector_cache = {}
sector_lock = threading.Lock()

breadth_cache = {}
breadth_lock = threading.Lock()
breadth_ready = False
