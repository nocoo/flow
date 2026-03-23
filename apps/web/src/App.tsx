import { Chat } from "@/components/chat";
import { PinyinInput } from "@/components/pinyin-input";

export default function App() {
  return (
    <div className="flex min-h-svh items-center justify-center gap-6 bg-background p-4">
      <Chat />
      <PinyinInput />
    </div>
  );
}
