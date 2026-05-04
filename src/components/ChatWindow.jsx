import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { deleteSubscription, BACKEND_URL } from "../api";

function ChatWindow() {
    const [sessionId, setSessionId] = useState("");
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState([]);

    const eventSourceRef = useRef(null);
    const bottomRef = useRef(null);

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
    // AUTO SCROLL
    // -------------------------
    useEffect(() => {
        bottomRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages]);

    // -------------------------
    // CREATE MESSAGE
    // -------------------------
    const createMessage = (role, content = "", status = "done") => ({
        id: crypto.randomUUID(),
        role,
        content,
        status,
        timestamp: Date.now(),
    });

    // -------------------------
    // SSE CONNECTION
    // -------------------------
    const startSSE = (conversationId, questionId) => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

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
                        parsed.body?.answer ||
                        parsed.body?.content ||
                        "No response";

                    setMessages((prev) => {
                        const updated = [...prev];
                        const lastIndex = updated.length - 1;

                        if (
                            updated[lastIndex] &&
                            updated[lastIndex].role === "assistant"
                        ) {
                            updated[lastIndex] = {
                                ...updated[lastIndex],
                                content: answer,
                                status: "done",
                            };
                        }

                        return updated.slice(-20);
                    });
                }

                es.close();
            } catch (e) {
                console.error("Parse error", e);
                handleError("Parsing error");
                es.close();
            }
        };

        es.onerror = () => {
            handleError("Connection error");
            es.close();
        };
    };

    // -------------------------
    // CREATE QUESTION
    // -------------------------
    const createQuestion = async (conversationId, questionText) => {
        const res = await fetch(
            `${BACKEND_URL}/api/v1/question?conversationId=${conversationId}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    question: questionText,
                }),
            }
        );

        if (!res.ok) {
            throw new Error("Failed to create question");
        }

        return await res.json();
    };

    // -------------------------
    // TRIGGER BACKEND
    // -------------------------
    const triggerBackendProcessing = async (
        conversationId,
        questionId
    ) => {
        const res = await fetch(
            `${BACKEND_URL}/api/v1/sse/question?conversationId=${conversationId}&questionId=${questionId}`
        );

        if (!res.ok) {
            throw new Error("Backend trigger failed");
        }
    };

    // -------------------------
    // SEND QUESTION
    // -------------------------
    const sendQuestion = async () => {
        if (!question.trim()) return;

        const userQ = question;
        const conversationId = sessionId;

        try {
            setMessages((prev) => [
                ...prev,
                createMessage("user", userQ),
                createMessage("assistant", "Thinking...", "streaming"),
            ]);

            setQuestion("");

            const questionResponse = await createQuestion(
                conversationId,
                userQ
            );

            const questionId = questionResponse.questionId;

            startSSE(conversationId, questionId);

            await triggerBackendProcessing(
                conversationId,
                questionId
            );
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
            handleError("Request cancelled");
        } catch (e) {
            console.error("Cancel failed", e);
        }
    };

    // -------------------------
    // ERROR HANDLING
    // -------------------------
    const handleError = (msg) => {
        setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;

            if (updated[lastIndex]?.role === "assistant") {
                updated[lastIndex] = {
                    ...updated[lastIndex],
                    content: `⚠️ ${msg}`,
                    status: "error",
                };
            }

            return updated;
        });
    };

    // -------------------------
    // ENTER KEY
    // -------------------------
    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            sendQuestion();
        }
    };

    return (
        <div className="chat-window">
            <h2>AI Assistant</h2>

            <div className="messages">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`message ${msg.role} ${msg.status}`}
                    >
                        <div className="bubble">
                            <div className="content">
                                <ReactMarkdown>
                                    {msg.content}
                                </ReactMarkdown>
                            </div>

                            <div className="meta">
                                {msg.status === "streaming" && (
                                    <span className="typing">
                                        typing...
                                    </span>
                                )}

                                <span>
                                    {new Date(
                                        msg.timestamp
                                    ).toLocaleTimeString()}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                <div ref={bottomRef} />
            </div>

            <div className="chat-input">
                <input
                    value={question}
                    onChange={(e) =>
                        setQuestion(e.target.value)
                    }
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                />

                <button onClick={sendQuestion}>
                    Send
                </button>

                <button
                    onClick={cancelSubscription}
                    className="cancel-btn"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

export default ChatWindow;