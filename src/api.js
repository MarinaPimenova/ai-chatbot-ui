export const BACKEND_URL = "http://localhost:8091";

// -----------------------------
// Upload APIs (unchanged)
// -----------------------------
export async function uploadKnowledgeFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${BACKEND_URL}/api/v1/upload`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error("Failed to upload knowledge");
    }
}

export async function uploadKnowledgeUrl(url) {
    const response = await fetch(`${BACKEND_URL}/api/v1/load-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
    });

    if (!response.ok) {
        throw new Error("Failed to upload knowledge from URL");
    }
}

// -----------------------------
// ✅ SSE: Open subscription
// -----------------------------
export function subscribeToQuestion(conversationId, questionId, onMessage, onError) {
    const eventSource = new EventSource(
        `${BACKEND_URL}/api/v1/sse/subscription/${conversationId}/${questionId}`
    );

    eventSource.onmessage = (event) => {
        if (!event.data) return;

        try {
            const parsed = JSON.parse(event.data);
            onMessage(parsed, eventSource);
        } catch (e) {
            console.error("SSE parse error", e);
            onError?.(e, eventSource);
        }
    };

    eventSource.onerror = (err) => {
        console.error("SSE connection error", err);
        onError?.(err, eventSource);
        eventSource.close();
    };

    return eventSource;
}

// -----------------------------
// ✅ SSE: Trigger processing
// -----------------------------
export async function triggerQuestion(conversationId, questionId) {
    const response = await fetch(
        `${BACKEND_URL}/api/v1/sse/question?conversationId=${conversationId}&questionId=${questionId}`
    );

    if (!response.ok) {
        throw new Error("Failed to trigger question processing");
    }
}

// -----------------------------
// ✅ Optional: Retry / warmup endpoint
// -----------------------------
export async function getQuestionSSE(conversationId, questionId) {
    const response = await fetch(
        `${BACKEND_URL}/api/v1/sse/question?conversationId=${conversationId}&questionId=${questionId}`
    );

    return response;
}

// -----------------------------
// ✅ Cancel subscription
// -----------------------------
export async function deleteSubscription(conversationId, questionId) {
    const response = await fetch(
        `${BACKEND_URL}/api/v1/sse/subscription/${conversationId}/${questionId}`,
        {
            method: "DELETE"
        }
    );

    if (!response.ok) {
        throw new Error("Failed to cancel subscription");
    }
}

// -----------------------------
// ❌ REMOVE (no longer valid with SSE)
// -----------------------------
// export async function inquire(...) ❌
// export async function newConversation(...) ❌