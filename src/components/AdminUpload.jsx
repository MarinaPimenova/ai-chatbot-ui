import { useState } from "react";
import { uploadKnowledgeFile, uploadKnowledgeUrl } from "../api";

function AdminUpload() {
    const [file, setFile] = useState(null);
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");

    const reset = () => {
        setFile(null);
        setUrl("");
    };

    const handleUpload = async () => {
        if (!file && !url) {
            setStatus("Please select a file or provide a URL.");
            return;
        }

        setLoading(true);
        setStatus("");

        try {
            if (file) {
                await uploadKnowledgeFile(file);
                setStatus("✅ File uploaded successfully!");
            } else {
                await uploadKnowledgeUrl(url);
                setStatus("✅ URL uploaded successfully!");
            }

            reset();
        } catch (error) {
            setStatus(
                "❌ Upload failed: " + (error?.message || "Unknown error")
            );
        } finally {
            setLoading(false);
        }
    };

    const isDisabled = loading || (!file && !url);

    return (
        <div className="admin-upload">
            <h2>Admin Upload Knowledge</h2>

            {/* FILE UPLOAD */}
            <div style={{ marginBottom: "20px" }}>
                <h4>Upload File</h4>
                <input
                    type="file"
                    disabled={loading}
                    onChange={(e) => {
                        setUrl(""); // clear URL if file selected
                        setFile(e.target.files?.[0] || null);
                    }}
                />
            </div>

            {/* URL INPUT */}
            <div style={{ marginBottom: "20px" }}>
                <h4>Or Provide URL</h4>
                <input
                    type="text"
                    placeholder="https://example.com/article"
                    value={url}
                    disabled={loading}
                    onChange={(e) => {
                        setFile(null); // clear file if URL entered
                        setUrl(e.target.value);
                    }}
                    style={{
                        width: "100%",
                        padding: "8px",
                    }}
                />
            </div>

            {/* SINGLE ACTION BUTTON */}
            <button
                onClick={handleUpload}
                disabled={isDisabled}
                style={{
                    padding: "10px 16px",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.5 : 1,
                }}
            >
                {loading ? "Uploading..." : "Upload Knowledge"}
            </button>

            {/* STATUS */}
            {status && (
                <p style={{ marginTop: "10px" }}>
                    {status}
                </p>
            )}
        </div>
    );
}

export default AdminUpload;