import React, { useContext, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { DoctorContext } from "../../context/DoctorContext";

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
  if (!msg) return "Tap to chat";
  let t = msg.text || "";
  if (msg.senderRole === "doctor") t = "You: " + t;
  else t = "Patient: " + t;
  return t.length > 46 ? t.slice(0, 44) + "…" : t;
}

const DoctorChat = () => {
  const { dToken, backendUrl, getAppointments } = useContext(DoctorContext);
  const [searchParams] = useSearchParams();

  const [inbox, setInbox] = useState([]);
  const [userId, setUserId] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const bottomRef = useRef(null);

  const loadInbox = async () => {
    if (!dToken) return;
    try {
      const { data } = await axios.get(backendUrl + "/api/doctor/chat/inbox", {
        headers: { dToken },
      });
      if (data.success) {
        setInbox(data.conversations);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const loadMessages = async (uid) => {
    if (!dToken || !uid) return;
    try {
      const { data } = await axios.get(
        backendUrl + "/api/doctor/chat?userId=" + encodeURIComponent(uid),
        { headers: { dToken } }
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
    if (dToken) {
      getAppointments();
      loadInbox();
    }
  }, [dToken]);

  useEffect(() => {
    if (!inbox.length) return;
    const q = searchParams.get("userId");
    if (q && inbox.some((c) => c.userId === q)) {
      setUserId(q);
      setMobileChatOpen(true);
      return;
    }
    setUserId((prev) => {
      if (prev && inbox.some((c) => c.userId === prev)) return prev;
      return inbox[0].userId;
    });
  }, [searchParams, inbox]);

  useEffect(() => {
    if (!inbox.length || !userId) return;
    if (!inbox.some((c) => c.userId === userId)) {
      setUserId(inbox[0].userId);
    }
  }, [inbox, userId]);

  useEffect(() => {
    if (!userId || !dToken) return;
    loadMessages(userId);
    const id = setInterval(() => {
      loadMessages(userId);
      loadInbox();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [userId, dToken, backendUrl]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !userId || !dToken) return;
    setLoading(true);
    try {
      const { data } = await axios.post(
        backendUrl + "/api/doctor/chat",
        { userId, text: trimmed },
        { headers: { dToken } }
      );
      if (data.success) {
        setText("");
        await loadMessages(userId);
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
    setUserId(id);
    setMobileChatOpen(true);
  };

  const active = inbox.find((c) => c.userId === userId);

  if (inbox.length === 0) {
    return (
      <div className="m-5 max-w-xl">
        <p className="text-lg font-medium mb-2">Messages</p>
        <p className="text-gray-500 text-sm">
          When patients book appointments with you, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="m-3 md:m-5 max-w-6xl">
      <p className="text-xs text-gray-500 mb-2">
        Chats update every few seconds on both sides.
      </p>

      <div className="flex rounded-xl overflow-hidden border border-gray-200 shadow-md bg-[#f0f2f5] min-h-[min(640px,calc(100vh-10rem))] max-h-[calc(100vh-8rem)]">
        <aside
          className={`flex flex-col w-full md:w-[340px] shrink-0 bg-white border-r border-gray-200 min-h-0 ${
            mobileChatOpen ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="bg-[#00A884] text-white px-4 py-3 shrink-0">
            <h2 className="text-lg font-semibold">Chats</h2>
            <p className="text-xs text-white/90">Your patients</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {inbox.map((row) => {
              const u = row.userData;
              const last = row.lastMessage;
              const selected = row.userId === userId;
              return (
                <button
                  key={row.userId}
                  type="button"
                  onClick={() => selectConversation(row.userId)}
                  className={`w-full flex gap-3 px-3 py-3 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selected ? "bg-[#f0f2f5]" : ""
                  }`}
                >
                  <img
                    src={u?.image}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover shrink-0 bg-gray-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {u?.name}
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
                  src={active.userData?.image}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover bg-gray-200"
                />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {active.userData?.name}
                  </p>
                  <p className="text-xs text-gray-500">Patient</p>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 bg-[#e5ddd5]">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-12 px-4">
                    No messages yet.
                  </p>
                ) : (
                  messages.map((m) => {
                    const mine = m.senderRole === "doctor";
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

export default DoctorChat;
