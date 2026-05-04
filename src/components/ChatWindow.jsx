import { useEffect, useRef, useState } from "react";
import { deleteSubscription, BACKEND_URL } from "../api";

function ChatWindow() {
    const [sessionId, setSessionId] = useState("");
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState([]);

    const eventSourceRef = useRef(null);

    // -------------------------
    // INIT SESSION
    // -------------------------
    useEffect(() => {
        let savedSession = localStorage.getItem("sessionId");

        if (!savedSession) {
            savedSession = crypto.randomUUID();
            localStorage.setItem("sessionId", savedSession);
        }

        setSessionId(savedSession);
    }, []);

    // -------------------------
    // SSE CONNECTION
    // -------------------------
    const startSSE = (conversationId, questionId) => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        console.log("👉 SSE SUBSCRIBE:", conversationId, questionId);

        const es = new EventSource(
            `${BACKEND_URL}/api/v1/sse/subscription/${conversationId}/${questionId}`
        );

        eventSourceRef.current = es;

        es.onmessage = (event) => {
            if (!event.data) return;

            try {
                const parsed = JSON.parse(event.data);

                if (parsed.statusCodeValue === 200) {
                    const answer =
                        parsed.body?.answer || parsed.body?.content;

                    setMessages((prev) => {
                        const updated = [...prev];
                        const lastIndex = updated.length - 1;

                        if (updated[lastIndex]?.role === "assistant") {
                            updated[lastIndex] = {
                                role: "assistant",
                                content: answer,
                            };
                        }

                        return updated.slice(-10);
                    });
                }

                es.close();
            } catch (e) {
                console.error("Parse error", e);
                handleError("Parsing error");
                es.close();
            }
        };

        es.onerror = (err) => {
            console.error("SSE error", err);
            handleError("Connection error");
            es.close();
        };
    };

    // -------------------------
    // STEP 1: CREATE QUESTION (IMPORTANT FIX)
    // -------------------------
    const createQuestion = async (conversationId, questionText) => {
        const res = await fetch(
            `${BACKEND_URL}/api/v1/question?conversationId=${conversationId}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ question: questionText }),
            }
        );

        if (!res.ok) {
            throw new Error("Failed to create question");
        }

        return await res.json(); // QuestionResponse
    };

    // -------------------------
    // STEP 3: TRIGGER PROCESSING
    // -------------------------
    const triggerBackendProcessing = async (conversationId, questionId) => {
        console.log("👉 Trigger backend processing");

        const res = await fetch(
            `${BACKEND_URL}/api/v1/sse/question?conversationId=${conversationId}&questionId=${questionId}`
        );

        if (!res.ok) {
            throw new Error("Backend trigger failed");
        }
    };

    // -------------------------
    // SEND QUESTION FLOW (FIXED ORDER)
    // -------------------------
    const sendQuestion = async (q) => {
        const userQ = q || question;
        const conversationId = sessionId;

        try {
            console.log("👉 SEND CLICKED");

            // 1. UI update FIRST
            setMessages((prev) => [
                ...prev,
                { role: "user", content: userQ },
                { role: "assistant", content: "Thinking... 🤔" },
            ]);

            // -------------------------
            // STEP 1: CREATE QUESTION
            // -------------------------
            const questionResponse = await createQuestion(
                conversationId,
                userQ
            );

            const questionId = questionResponse.questionId;

            console.log("👉 QUESTION CREATED:", questionId);

            // -------------------------
            // STEP 2: OPEN SSE
            // -------------------------
            startSSE(conversationId, questionId);

            // -------------------------
            // STEP 3: TRIGGER PROCESSING
            // -------------------------
            await triggerBackendProcessing(conversationId, questionId);

            setQuestion("");
        } catch (error) {
            console.error(error);
            handleError("Failed to send question");
        }
    };

    // -------------------------
    // CANCEL
    // -------------------------
    const cancelSubscription = async () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        try {
            await deleteSubscription(sessionId, "latest");
        } catch (e) {
            console.error("Cancel failed", e);
        }
    };

    const handleError = (msg) => {
        setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
                role: "assistant",
                content: msg,
            };
            return updated;
        });
    };

    return (
        <div className="chat-window">
            <h2>Chat: AI Assistant</h2>

            <div className="messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={msg.role}>
                        <strong>
                            {msg.role} ({sessionId}):
                        </strong>{" "}
                        {msg.content}
                    </div>
                ))}
            </div>

            <div className="chat-input">
                <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question..."
                />

                <button onClick={() => sendQuestion(question)}>
                    Send
                </button>

                <button onClick={cancelSubscription}>Cancel</button>
            </div>
        </div>
    );
}

export default ChatWindow;