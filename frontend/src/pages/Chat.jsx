import React, { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";

const POLL_MS = 2500;

function formatBubbleTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatListTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return formatBubbleTime(ts);
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function previewText(msg) {
  if (!msg) return "Tap to start chatting";
  let t = msg.text || "";
  if (msg.senderRole === "user") t = "You: " + t;
  else t = "Dr: " + t;
  return t.length > 46 ? t.slice(0, 44) + "…" : t;
}

const Chat = () => {
  const navigate = useNavigate();
  const { token, backendUrl } = useContext(AppContext);

  const [inbox, setInbox] = useState([]);
  const [docId, setDocId] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const bottomRef = useRef(null);
  const chatContainerRef = useRef(null);

  const loadInbox = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(backendUrl + "/api/user/chat/inbox", {
        headers: { token },
      });
      if (data.success) {
        setInbox(data.conversations);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const loadMessages = async (selectedDoc) => {
    if (!token || !selectedDoc) return;
    try {
      const { data } = await axios.get(
        backendUrl + "/api/user/chat?docId=" + encodeURIComponent(selectedDoc),
        { headers: { token } }
      );
      if (data.success) {
        setMessages(data.messages);
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      console.log(e);
      toast.error(e.message);
    }
  };

  useEffect(() => {
    if (token) {
      loadInbox();
    }
  }, [token]);

  useEffect(() => {
    if (!inbox.length) return;
    if (!docId || !inbox.some((c) => c.docId === docId)) {
      setDocId(inbox[0].docId);
    }
  }, [inbox, docId]);

  useEffect(() => {
    if (!docId || !token) return;
    loadMessages(docId);
    const id = setInterval(() => {
      loadMessages(docId);
      loadInbox();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [docId, token, backendUrl]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length, docId]);

  const send = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !docId || !token) return;
    setLoading(true);
    try {
      const { data } = await axios.post(
        backendUrl + "/api/user/chat",
        { docId, text: trimmed },
        { headers: { token } }
      );
      if (data.success) {
        setText("");
        await loadMessages(docId);
        await loadInbox();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.log(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = (id) => {
    setDocId(id);
    setMobileChatOpen(true);
  };

  const active = inbox.find((c) => c.docId === docId);

  if (!token) {
    return (
      <div className="my-10 text-center max-w-lg mx-auto px-4">
        <p className="text-gray-600 mb-4">
          Sign in to message doctors you have appointments with.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="bg-primary text-white px-8 py-3 rounded-full"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (inbox.length === 0) {
    return (
      <div className="my-10 max-w-lg mx-auto text-center px-4">
        <p className="text-gray-600 mb-4">
          Book an appointment with a doctor first — then you can chat here.
        </p>
        <button
          onClick={() => navigate("/doctors")}
          className="bg-primary text-white px-8 py-3 rounded-full"
        >
          Find doctors
        </button>
      </div>
    );
  }

  return (
    <div className="my-4 md:my-6 max-w-6xl mx-auto px-0 sm:px-2">
      <p className="text-xs text-gray-500 px-3 md:px-0 mb-2">
        Messages sync every few seconds. Not for emergencies.
      </p>

      <div className="flex rounded-xl overflow-hidden border border-gray-200 shadow-md bg-[#f0f2f5] min-h-[min(640px,calc(100vh-10rem))] max-h-[calc(100vh-8rem)]">
        {/* Conversation list — WhatsApp-style */}
        <aside
          className={`flex flex-col w-full md:w-[340px] shrink-0 bg-white border-r border-gray-200 min-h-0 ${
            mobileChatOpen ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="bg-[#00A884] text-white px-4 py-3 shrink-0">
            <h2 className="text-lg font-semibold">Chats</h2>
            <p className="text-xs text-white/90">Your doctors</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {inbox.map((row) => {
              const d = row.docData;
              const last = row.lastMessage;
              const selected = row.docId === docId;
              return (
                <button
                  key={row.docId}
                  type="button"
                  onClick={() => selectConversation(row.docId)}
                  className={`w-full flex gap-3 px-3 py-3 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selected ? "bg-[#f0f2f5]" : ""
                  }`}
                >
                  <img
                    src={d?.image}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover shrink-0 bg-gray-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {d?.name}
                      </span>
                      {last && (
                        <span className="text-[11px] text-gray-500 shrink-0">
                          {formatListTime(last.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-0.5">
                      {previewText(last)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Thread */}
        <section
          className={`flex-1 flex flex-col min-w-0 min-h-0 bg-[#e5ddd5] ${
            mobileChatOpen ? "flex" : "hidden md:flex"
          }`}
        >
          {active && (
            <>
              <header className="flex items-center gap-3 px-3 py-2 bg-[#f0f2f5] border-b border-gray-200 shrink-0">
                <button
                  type="button"
                  className="md:hidden p-2 -ml-1 text-gray-700"
                  aria-label="Back"
                  onClick={() => setMobileChatOpen(false)}
                >
                  ←
                </button>
                <img
                  src={active.docData?.image}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover bg-gray-200"
                />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {active.docData?.name}
                  </p>
                  <p className="text-xs text-gray-500">Doctor</p>
                </div>
              </header>

              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-2 py-3 space-y-1 bg-[#e5ddd5] bg-[length:400px] bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23d4d4d4%22 fill-opacity=%220.12%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"
              >
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-12 px-4">
                    No messages yet. Say hello below.
                  </p>
                ) : (
                  messages.map((m) => {
                    const mine = m.senderRole === "user";
                    return (
                      <div
                        key={m._id}
                        className={`flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-lg px-2 py-1.5 shadow-sm ${
                            mine
                              ? "bg-[#dcf8c6] rounded-tr-none"
                              : "bg-white rounded-tl-none"
                          }`}
                        >
                          <p className="text-[15px] text-gray-900 whitespace-pre-wrap break-words leading-snug">
                            {m.text}
                          </p>
                          <div className="flex justify-end gap-1 mt-0.5">
                            <span className="text-[11px] text-gray-500">
                              {formatBubbleTime(m.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form
                onSubmit={send}
                className="flex gap-2 items-end p-2 bg-[#f0f2f5] shrink-0"
              >
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message"
                  maxLength={2000}
                  className="flex-1 rounded-full border-0 bg-white px-4 py-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-[#00A884]/40"
                />
                <button
                  type="submit"
                  disabled={loading || !text.trim()}
                  className="shrink-0 w-11 h-11 rounded-full bg-[#00A884] text-white flex items-center justify-center disabled:opacity-40 shadow-md"
                  aria-label="Send"
                >
                  <span className="text-lg leading-none">➤</span>
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Chat;
