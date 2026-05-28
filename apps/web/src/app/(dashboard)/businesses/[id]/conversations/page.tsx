"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationApi, whatsappApi } from "@/lib/api";
import { useBusinessId } from "@/lib/use-business-id";
import { formatPhone, STATUS_LABELS, cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, Send, Bot, User, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

type Conversation = {
  id: string;
  customerPhone: string;
  customerName?: string;
  status: string;
  lastMessageAt: string;
  messages?: Message[];
};

type Message = {
  id: string;
  role: "CUSTOMER" | "BOT" | "HUMAN";
  content: string;
  createdAt: string;
};

export default function ConversationsPage() {
  const businessId = useBusinessId();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["conversations", businessId],
    queryFn: () => conversationApi.list(businessId, { page: 1 }),
    refetchInterval: 10_000,
  });

  const { data: detail } = useQuery({
    queryKey: ["conversation-detail", businessId, selected],
    queryFn: () => selected ? conversationApi.get(businessId, selected) : null,
    enabled: !!selected,
    refetchInterval: 5_000,
  });

  const attendMutation = useMutation({
    mutationFn: (convId: string) => conversationApi.attend(businessId, convId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-detail", businessId, selected] });
      toast.success("Atendimento assumido — o bot pausou para esta conversa.");
    },
  });

  const releaseMutation = useMutation({
    mutationFn: (convId: string) => conversationApi.release(businessId, convId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-detail", businessId, selected] });
      toast.success("Bot reativado para esta conversa.");
    },
  });

  const sendMutation = useMutation({
    mutationFn: ({ to, text }: { to: string; text: string }) =>
      whatsappApi.send(businessId, to, text),
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["conversation-detail", businessId, selected] });
    },
    onError: () => toast.error("Erro ao enviar mensagem"),
  });

  const conversations: Conversation[] = data?.conversations ?? [];
  const filtered = conversations.filter((c) =>
    c.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    c.customerPhone.includes(search)
  );

  const selectedConv = detail as Conversation & { messages: Message[] } | null;

  return (
    <div className="flex h-screen">
      {/* List */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h1 className="font-semibold text-gray-900 mb-3">Conversas</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9 text-sm"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-12">Nenhuma conversa</div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelected(conv.id)}
                className={cn(
                  "w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors",
                  selected === conv.id && "bg-brand-50 border-brand-100"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {conv.customerName ?? formatPhone(conv.customerPhone)}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{conv.customerPhone}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className={cn("badge text-xs", STATUS_LABELS[conv.status]?.color)}>
                      {STATUS_LABELS[conv.status]?.label}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(conv.lastMessageAt), { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {selectedConv.customerName ?? formatPhone(selectedConv.customerPhone)}
                </h2>
                <p className="text-sm text-gray-500">{selectedConv.customerPhone}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("badge", STATUS_LABELS[selectedConv.status]?.color)}>
                  {STATUS_LABELS[selectedConv.status]?.label}
                </span>
                {selectedConv.status === "OPEN" && (
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => attendMutation.mutate(selectedConv.id)}
                    disabled={attendMutation.isPending}
                  >
                    <User className="w-3 h-3" />
                    Assumir atendimento
                  </button>
                )}
                {selectedConv.status === "ATTENDING" && (
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => releaseMutation.mutate(selectedConv.id)}
                    disabled={releaseMutation.isPending}
                  >
                    <Bot className="w-3 h-3" />
                    Devolver ao bot
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {selectedConv.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex", msg.role === "CUSTOMER" ? "justify-start" : "justify-end")}
                >
                  <div
                    className={cn(
                      "max-w-sm rounded-2xl px-4 py-2.5 text-sm",
                      msg.role === "CUSTOMER"
                        ? "bg-white border border-gray-200 text-gray-900 rounded-tl-sm"
                        : msg.role === "BOT"
                        ? "bg-brand-600 text-white rounded-tr-sm"
                        : "bg-blue-600 text-white rounded-tr-sm"
                    )}
                  >
                    {msg.role !== "CUSTOMER" && (
                      <p className="text-xs opacity-70 mb-1 flex items-center gap-1">
                        {msg.role === "BOT" ? <><Bot className="w-3 h-3" /> Bot</> : <><User className="w-3 h-3" /> Você</>}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-60 mt-1 text-right">
                      {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply */}
            {selectedConv.status === "ATTENDING" && (
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex items-end gap-3">
                  <textarea
                    className="input flex-1 resize-none h-20 text-sm"
                    placeholder="Digite sua mensagem..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (replyText.trim()) {
                          sendMutation.mutate({ to: selectedConv.customerPhone, text: replyText.trim() });
                        }
                      }
                    }}
                  />
                  <button
                    className="btn-primary h-10"
                    disabled={!replyText.trim() || sendMutation.isPending}
                    onClick={() => sendMutation.mutate({ to: selectedConv.customerPhone, text: replyText.trim() })}
                  >
                    {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Enter para enviar • Shift+Enter para nova linha</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Selecione uma conversa para visualizar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
