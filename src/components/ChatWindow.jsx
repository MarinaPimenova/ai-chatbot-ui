import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { deleteSubscription, BACKEND_URL } from "../api";

function ChatWindow() {
    const [sessionId, setSessionId] = useState("");
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState([]);

    const eventSourceRef = useRef(null);
    const bottomRef = useRef(null);

    // ⏱ 3-min timeout guard
    const typingTimeoutRef = useRef(null);
    const currentQuestionIdRef = useRef(null);

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
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
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
    // MESSAGE FACTORY
    // -------------------------
    const createMessage = (role, content = "", status = "done") => ({
        id: crypto.randomUUID(),
        role,
        content,
        status,
        timestamp: Date.now(),
    });

    // -------------------------
    // SSE CONNECTION (WITH TIMEOUT)
    // -------------------------
    const startSSE = (conversationId, questionId) => {
        let completed = false;
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        const es = new EventSource(
            `${BACKEND_URL}/api/v1/sse/subscription/${conversationId}/${questionId}`
        );

        eventSourceRef.current = es;

        // =========================
        // OVERALL SAFETY TIMEOUT
        // =========================
        typingTimeoutRef.current = setTimeout(() => {
            console.warn("SSE overall timeout");

            es.close();

            handleError("Response timeout");
        }, 330000); // 5m30s

        // =========================
        // CONNECTED EVENT
        // =========================
        es.addEventListener("connected", (event) => {
            console.log("SSE connected", event.data);
        });

        // =========================
        // HEARTBEAT EVENT
        // =========================
        es.addEventListener("ping", (event) => {
            console.log("heartbeat", event.data);
        });
        // =========================
        // SUCCESS EVENT
        // =========================
        es.addEventListener("data", (event) => {
            try {
                let parsed;

                try {
                    parsed = JSON.parse(event.data);
                } catch {
                    parsed = event.data;
                }

                const answer =
                    parsed.answer ||
                    parsed.content ||
                    parsed.body?.answer ||
                    "No response";

                setMessages((prev) => {
                    const updated = [...prev];

                    const lastIndex = updated.length - 1;

                    if (updated[lastIndex]?.role === "assistant") {
                        updated[lastIndex] = {
                            ...updated[lastIndex],
                            content: answer,
                            status: "done",
                        };
                    }

                    return updated;
                });

                clearTimeout(typingTimeoutRef.current);

                typingTimeoutRef.current = null;
                completed = true;
                es.close();
            } catch (e) {
                console.error("Failed parsing SSE response", e);

                handleError("Parsing error");

                es.close();
            }
        });

        // =========================
        // ERROR EVENT FROM SERVER
        // =========================
        es.addEventListener("server-error", (event) => {
            console.error("Server SSE error", event);
            completed = true;
            const errorMessage =
                event.data || "Server processing error";

            handleError(errorMessage);

            clearTimeout(typingTimeoutRef.current);

            typingTimeoutRef.current = null;

            es.close();
        });

        // =========================
        // NETWORK ERROR
        // =========================
        es.onerror = (event) => {
            if (completed) {
                return;
            }

            console.error("EventSource transport error", event);

            handleError("Connection lost");

            clearTimeout(typingTimeoutRef.current);

            typingTimeoutRef.current = null;

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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: questionText }),
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
    const triggerBackendProcessing = async (conversationId, questionId) => {
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

        // clear timeout safely
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        try {
            setMessages((prev) => [
                ...prev,
                createMessage("user", userQ),
                createMessage("assistant", "", "streaming"),
            ]);

            setQuestion("");

            const questionResponse = await createQuestion(
                conversationId,
                userQ
            );

            const questionId = questionResponse.questionId;
            currentQuestionIdRef.current = questionId;

            startSSE(conversationId, questionId);

            await triggerBackendProcessing(conversationId, questionId);
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

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        try {
            await deleteSubscription(sessionId, currentQuestionIdRef.current);
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
            } else {
                updated.push(
                    createMessage("assistant", `⚠️ ${msg}`, "error")
                );
            }

            return updated;
        });
    };

    // -------------------------
    // RETRY LOGIC
    // -------------------------
    const retryLastQuestion = async () => {
        const lastUserMsg = [...messages]
            .reverse()
            .find((m) => m.role === "user");

        if (!lastUserMsg) return;

        const userQ = lastUserMsg.content;
        const conversationId = sessionId;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        try {
            setMessages((prev) => [
                ...prev,
                createMessage("assistant", "", "streaming"),
            ]);

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
            handleError("Retry failed");
        }
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

                                {msg.status === "error" && (
                                    <button
                                        className="retry-btn"
                                        onClick={retryLastQuestion}
                                    >
                                        ↻ Retry
                                    </button>
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

                <button onClick={sendQuestion}>Send</button>

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