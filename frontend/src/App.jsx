import { useState } from "react";

function App() {
  const [page, setPage] = useState("login"); // "login" | "register" | "chat"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  // ── AUTH ──────────────────────────────────────────

  const handleRegister = async () => {
    setError("");
    try {
      const res = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      setPage("login");
      setError("Account created! Please log in.");
    } catch {
      setError("Something went wrong.");
    }
  };

  const handleLogin = async () => {
    setError("");
    try {
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      setToken(data.token);
      setUserEmail(data.email);
      setPage("chat");
    } catch {
      setError("Something went wrong.");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUserEmail("");
    setMessages([]);
    setConversationId(null);
    setPage("login");
  };

  // ── CHAT ──────────────────────────────────────────

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // send JWT with every request
        },
        body: JSON.stringify({ messages: updatedMessages, conversationId }),
      });

      const data = await res.json();
      if (!conversationId) setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationId(null);
  };

  // ── PAGES ──────────────────────────────────────────

  if (page === "register") {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authBox}>
          <h2 style={styles.authTitle}>Create Account</h2>
          {error && <p style={styles.error}>{error}</p>}
          <input style={styles.authInput} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={styles.authInput} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button style={styles.authBtn} onClick={handleRegister}>Register</button>
          <p style={styles.switchText}>
            Already have an account?{" "}
            <span style={styles.link} onClick={() => { setPage("login"); setError(""); }}>Log in</span>
          </p>
        </div>
      </div>
    );
  }

  if (page === "login") {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authBox}>
          <h2 style={styles.authTitle}>Welcome Back</h2>
          {error && <p style={styles.error}>{error}</p>}
          <input style={styles.authInput} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={styles.authInput} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button style={styles.authBtn} onClick={handleLogin}>Log In</button>
          <p style={styles.switchText}>
            No account?{" "}
            <span style={styles.link} onClick={() => { setPage("register"); setError(""); }}>Register</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>AI Chatbot</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={styles.userLabel}>{userEmail}</span>
          <button style={styles.newChatBtn} onClick={startNewChat}>+ New Chat</button>
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div style={styles.chatBox}>
        {messages.length === 0 && (
          <p style={styles.placeholder}>Send a message to start chatting...</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === "user" ? styles.userMsg : styles.aiMsg}>
            <strong>{msg.role === "user" ? "You" : "AI"}:</strong> {msg.content}
          </div>
        ))}
        {loading && <div style={styles.aiMsg}>AI is typing...</div>}
      </div>

      <div style={styles.inputRow}>
        <input
          style={styles.input}
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button style={styles.button} onClick={sendMessage} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}

const styles = {
  // auth
  authContainer: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f5f5f5" },
  authBox: { background: "#fff", padding: "40px", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", width: "360px", display: "flex", flexDirection: "column", gap: "12px" },
  authTitle: { margin: "0 0 8px", textAlign: "center" },
  authInput: { padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px" },
  authBtn: { padding: "12px", borderRadius: "8px", background: "#4CAF50", color: "white", border: "none", cursor: "pointer", fontSize: "15px", fontWeight: "bold" },
  switchText: { textAlign: "center", fontSize: "13px", color: "#666" },
  link: { color: "#4CAF50", cursor: "pointer", fontWeight: "bold" },
  error: { color: "red", fontSize: "13px", textAlign: "center", margin: 0 },
  // chat
  container: { maxWidth: "600px", margin: "40px auto", fontFamily: "sans-serif", padding: "0 16px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  userLabel: { fontSize: "13px", color: "#666" },
  newChatBtn: { padding: "8px 16px", borderRadius: "8px", background: "#fff", border: "1px solid #ddd", cursor: "pointer", fontSize: "14px" },
  logoutBtn: { padding: "8px 16px", borderRadius: "8px", background: "#ff4444", color: "white", border: "none", cursor: "pointer", fontSize: "14px" },
  chatBox: { border: "1px solid #ddd", borderRadius: "8px", padding: "16px", height: "400px", overflowY: "auto", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" },
  placeholder: { color: "#aaa", textAlign: "center", marginTop: "160px" },
  userMsg: { background: "#dcf8c6", padding: "8px 12px", borderRadius: "8px", alignSelf: "flex-end", maxWidth: "80%" },
  aiMsg: { background: "#f1f1f1", padding: "8px 12px", borderRadius: "8px", alignSelf: "flex-start", maxWidth: "80%" },
  inputRow: { display: "flex", gap: "8px" },
  input: { flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "14px" },
  button: { padding: "10px 20px", borderRadius: "8px", background: "#4CAF50", color: "white", border: "none", cursor: "pointer", fontSize: "14px" },
};

export default App;