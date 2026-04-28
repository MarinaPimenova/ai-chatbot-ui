import { useState } from 'react';
import axios from 'axios';

function UploadKnowledge() {
    const [content, setContent] = useState('');

    const handleUpload = async () => {
        await axios.post('/api/upload', { content });
        alert('Knowledge uploaded!');
        setContent('');
    };

    return (
        <div style={{ marginBottom: '20px' }}>
            <h2>Upload Knowledge</h2>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                cols={50}
                placeholder="Paste knowledge text here..."
            />
            <br />
            <button onClick={handleUpload}>Upload</button>
        </div>
    );
}

export default UploadKnowledge;
