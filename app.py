"""
Resume Information Extraction System - Flask App
No external LLM/Generative AI API is called anywhere in this app.
"""
from flask import Flask, request, jsonify, render_template, send_file
import io
import json
import traceback

from extractor import parse_resume

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB per file

ALLOWED_EXTENSIONS = {"pdf", "docx"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/")
def landing():
    return render_template("landing.html")


@app.route("/extract")
def extract_page():
    return render_template("extract.html")


@app.route("/api/extract", methods=["POST"])
def api_extract():
    if "files" not in request.files:
        return jsonify({"error": "No files uploaded."}), 400

    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files uploaded."}), 400

    results = []
    for f in files:
        if f.filename == "":
            continue
        if not allowed_file(f.filename):
            results.append({
                "filename": f.filename,
                "success": False,
                "error": "Unsupported file type. Only .pdf and .docx are allowed.",
            })
            continue
        try:
            file_bytes = f.read()
            data = parse_resume(f.filename, file_bytes)
            results.append({"filename": f.filename, "success": True, "data": data})
        except Exception as e:
            app.logger.error(traceback.format_exc())
            results.append({"filename": f.filename, "success": False, "error": str(e)})

    return jsonify({"results": results})


@app.route("/api/download", methods=["POST"])
def api_download():
    """Accepts the full JSON result set and returns it as a downloadable file."""
    payload = request.get_json(force=True)
    buf = io.BytesIO(json.dumps(payload, indent=2).encode("utf-8"))
    buf.seek(0)
    return send_file(
        buf,
        mimetype="application/json",
        as_attachment=True,
        download_name="extracted_resume_data.json",
    )


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
