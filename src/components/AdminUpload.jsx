import { useState } from "react";
import { uploadKnowledgeFile } from "../api";

function AdminUpload() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setStatus("");

        try {
            await uploadKnowledgeFile(file);
            setStatus("Uploaded ✔");
            setFile(null);
        } catch (err) {
            setStatus("Upload failed ❌");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="upload-bar">
            {/* CLIP BUTTON */}
            <label className="upload-btn">
                📎
                <input
                    type="file"
                    hidden
                    onChange={(e) => {
                        const selected = e.target.files?.[0] || null;
                        setFile(selected);
                        setStatus("");
                    }}
                />
            </label>

            {/* FILE NAME DISPLAY */}
            <div className="file-name">
                {file ? file.name : "No file selected"}
            </div>

            {/* UPLOAD BUTTON */}
            <button
                onClick={handleUpload}
                disabled={!file || loading}
            >
                {loading ? "Uploading..." : "Upload"}
            </button>

            {/* STATUS */}
            {status && <span className="status">{status}</span>}
        </div>
    );
}

export default AdminUpload;