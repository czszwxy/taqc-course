from fastapi import FastAPI

app = FastAPI(title="Gadget shop")


@app.get("/")
def root():
    return {"message": "Gadget shop API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/version")
def version():
    return {"name": "gadget-shop", "version": "1.4.0"}
