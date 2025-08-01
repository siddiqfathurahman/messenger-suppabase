"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ChatRoom from "./ChatRoom";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username) {
      router.push("/login");
    }
  }, [router]);

  return <ChatRoom />;
}
