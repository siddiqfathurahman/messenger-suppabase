"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { MdMarkUnreadChatAlt } from "react-icons/md";

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

export default function ChatRoom() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const getUsernameColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLORS[Math.abs(hash) % COLORS.length];
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
    <section className="bg-gray-50 p-6">
      <div className="max-w-[1440px] mx-auto">
        <div className="bg-white rounded-xl shadow-md p-5">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <MdMarkUnreadChatAlt /> Chat Room
            </h1>
            <button
              onClick={clearChat}
              className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md transition"
            >
              Clear Chat
            </button>
          </div>

          <input
            className="border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none rounded-md p-2 w-full mb-3 text-sm"
            placeholder="Your name..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <div className="border border-gray-200 rounded-md p-3 h-[500px] overflow-y-auto mb-3 bg-gray-100">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center">Belum ada pesan</p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.username === username;
                const colorClass = getUsernameColor(msg.username);
                const time = new Date(msg.created_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={msg.id}
                    className={`flex mb-3 ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    {!isMe && (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-bold text-white mr-2">
                        {msg.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] p-2 rounded-lg shadow-sm ${
                        isMe
                          ? "bg-blue-200 text-black rounded-br-none"
                          : "bg-white text-gray-900 rounded-bl-none"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <p className={`text-sm font-semibold ${colorClass}`}>
                          {msg.username}
                        </p>
                      </div>
                      <p className="text-lg break-words">{msg.message}</p>
                      <span className="text-[10px] text-gray-500">{time}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex space-x-2">
            <input
              className="border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none rounded-md flex-1 p-2 text-sm"
              placeholder="Write a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
