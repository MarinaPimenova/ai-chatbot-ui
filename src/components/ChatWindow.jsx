import { useEffect, useState } from "react";
import {inquire} from "../api";

function ChatWindow() {
    const [sessionId, setSessionId] = useState("");
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        let savedSession = localStorage.getItem("sessionId");
        if (!savedSession) {
            savedSession = 1;
        }
        setSessionId(savedSession);
    }, []);

    const sendQuestion = async (q) => {
        try {
            const userQ = q || question;

            const data = await inquire(sessionId, userQ);

            const answer = data.content;
            localStorage.setItem("sessionId", data.sessionId);
            const newMessages = [...messages, { role: "user", content: userQ }, { role: "assistant", content: answer }];
            setMessages(newMessages.slice(-10)); // Keep only latest 10
            setQuestion("");
        } catch (error) {
            alert(error);
            console.error(error);
        }
    };

    return (
        <div className="chat-window">
            <h2>Chat: AI Assistant</h2>
            <div className="messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={msg.role}>
                        <strong>{msg.role}({sessionId}):</strong> {msg.content}
                        {msg.role === "user" && (
                            <button onClick={() => sendQuestion(msg.content)}>Resend</button>
                        )}
                    </div>
                ))}
            </div>
            <div className="chat-input">
                <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question..." />
                <button onClick={() => sendQuestion(question)}>Send</button>
            </div>
        </div>
    );
}

export default ChatWindow;
