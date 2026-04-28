import { useState } from "react";
import { uploadKnowledgeFile, uploadKnowledgeUrl } from "../api";

function AdminUpload() {
    const [file, setFile] = useState(null);
    const [url, setUrl] = useState("");
    const [status, setStatus] = useState("");

    const handleFileUpload = async () => {
        if (!file) return;
        try {
            await uploadKnowledgeFile(file);
            setStatus("File upload successful!");
        } catch (error) {
            setStatus("File upload failed: " + error.message);
        }
    };

    const handleUrlUpload = async () => {
        if (!url) return;
        try {
            await uploadKnowledgeUrl(url);
            setStatus("URL upload successful!");
        } catch (error) {
            setStatus("URL upload failed: " + error.message);
        }
    };

    return (
        <div className="admin-upload">
            <h2>Admin Upload Knowledge</h2>

            <h4>Upload File</h4>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0])} />
            <button onClick={handleFileUpload}>Upload File</button>

            <h4>Or Provide URL</h4>
            <input
                type="text"
                placeholder="https://www.microsoft.com/investor/reports/ar24/index.html"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                style={{ width: "100%", marginBottom: "10px" }}
            />
            <button onClick={handleUrlUpload}>Upload URL</button>

            {status && <p>{status}</p>}
        </div>
    );
}

export default AdminUpload;
