"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { useRouter } from "next/navigation";
import { MdInsertEmoticon, MdLogout, MdOutlineDelete } from "react-icons/md";
import { HiOutlineChatAlt2 } from "react-icons/hi";
import { IoSend } from "react-icons/io5";
import EmojiPicker from "emoji-picker-react";

interface Message {
  id: number;
  username: string;
  message: string;
  created_at: string;
}

const COLORS = [
  "text-blue-600",
  "text-green-600",
  "text-purple-600",
  "text-red-600",
  "text-pink-600",
  "text-indigo-600",
  "text-yellow-600",
];

const AVATAR_COLORS = [
  "bg-gradient-to-br from-blue-400 to-blue-600",
  "bg-gradient-to-br from-green-400 to-green-600",
  "bg-gradient-to-br from-purple-400 to-purple-600",
  "bg-gradient-to-br from-red-400 to-red-600",
  "bg-gradient-to-br from-pink-400 to-pink-600",
  "bg-gradient-to-br from-indigo-400 to-indigo-600",
  "bg-gradient-to-br from-yellow-400 to-yellow-600",
];

export default function ChatRoom() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [username] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("username") || "" : ""
  );
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEmojiClick = (emojiData: any) => {
    setNewMessage((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const getUsernameColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
  };

  const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  const sendToTelegram = async (text: string) => {
    try {
      await fetch("/api/send-to-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
    } catch (err) {
      console.error("Failed to send message to Telegram:", err);
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setMessages(data as Message[]);
    };

    fetchMessages();
    const channel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (newMessage.trim() === "" || username.trim() === "") return;

    const { error } = await supabase.from("messages").insert([
      {
        username,
        message: newMessage,
      },
    ]);

    if (!error) {
      await sendToTelegram(`${newMessage}`);
    }
    setNewMessage("");
  };

  const clearChat = async () => {
    const confirmClear = confirm("Yakin ingin menghapus semua pesan?");
    if (confirmClear) {
      await supabase.from("messages").delete().neq("id", 0);
      setMessages([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 mb-6">
          <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <HiOutlineChatAlt2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-green-500">
                    Welcome {username}
                  </h1>
                  <p className="text-gray-600 text-sm">Happy Chatting! 🎉</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-700 text-sm font-medium">
                    Online
                  </span>
                </div>

                <button
                  onClick={clearChat}
                  className="flex items-center space-x-2 bg-red-50 cursor-pointer hover:bg-red-100 text-red-600 px-4 py-2 rounded-full transition-all duration-200 hover:scale-105"
                >
                  <MdOutlineDelete className="w-4 h-4" />
                  <span className="text-sm font-medium">Clear</span>
                </button>

                <button
                  onClick={() => {
                    localStorage.removeItem("username");
                    router.push("/login");
                  }}
                  className="flex items-center space-x-2 cursor-pointer bg-gray-50 hover:bg-gray-100 text-gray-600 px-4 py-2 rounded-full transition-all duration-200 hover:scale-105"
                >
                  <MdLogout className="w-4 h-4" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="h-[500px] overflow-y-auto p-6 bg-gradient-to-b from-gray-50/50 to-white/50">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <HiOutlineChatAlt2 />
                </div>
                <p className="text-lg font-medium">Belum ada pesan</p>
                <p className="text-sm">
                  Mulai percakapan dengan mengirim pesan pertama!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isMe = msg.username === username;
                  const colorClass = getUsernameColor(msg.username);
                  const avatarColor = getAvatarColor(msg.username);
                  const time = new Date(msg.created_at).toLocaleTimeString(
                    "id-ID",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  );

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end space-x-2 ${
                        isMe ? "justify-end" : "justify-start"
                      } animate-fade-in`}
                    >
                      {!isMe && (
                        <div
                          className={`w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg`}
                        >
                          {msg.username.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div
                        className={`max-w-[70%] ${isMe ? "order-first" : ""}`}
                      >
                        <div
                          className={`px-4 py-3 rounded-2xl shadow-sm ${
                            isMe
                              ? "bg-green-500 text-white rounded-br-md"
                              : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"
                          }`}
                        >
                          {!isMe && (
                            <p
                              className={`text-sm font-semibold ${colorClass} mb-1`}
                            >
                              {msg.username}
                            </p>
                          )}
                          <p className="text-sm leading-relaxed break-words">
                            {msg.message}
                          </p>
                          <p
                            className={`text-xs mt-1 ${
                              isMe ? "text-blue-100" : "text-gray-500"
                            }`}
                          >
                            {time}
                          </p>
                        </div>
                      </div>

                      {isMe && (
                        <div
                          className={`w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg`}
                        >
                          {msg.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-6 bg-white/90 backdrop-blur-sm border-t border-gray-200/50">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12"
                  placeholder="Ketik pesan Anda..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />

                <div
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-600 hover:text-gray-800"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                >
                  <MdInsertEmoticon className="w-5 h-5" />
                </div>

                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2 z-50">
                    <EmojiPicker onEmojiClick={handleEmojiClick} />
                  </div>
                )}
              </div>

              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="bg-green-500 focus:outline-none outline-none ring-0 text-white p-3 rounded-full disabled:cursor-not-allowed shadow-lg"
              >
                <IoSend />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
