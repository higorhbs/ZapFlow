"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationApi, whatsappApi } from "@/lib/api";
import { useBusinessId } from "@/lib/use-business-id";
import { formatCustomerLabel, STATUS_LABELS, cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare, Send, User, Loader2, Search, Trash2 } from "lucide-react";
import { IaIcon, IA_DISPLAY_NAME, isIaMessageRole } from "@/lib/ia-brand";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Conversation = {
  id: string;
  customerPhone: string;
  replyJid?: string;
  customerName?: string;
  status: string;
  lastMessageAt: string;
  messages?: Message[];
};

type Message = {
  id: string;
  role: "CUSTOMER" | "IA" | "HUMAN" | "BOT";
  content: string;
  createdAt: string;
};

export default function ConversationsPage() {
  const businessId = useBusinessId();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["conversations", businessId],
    queryFn: () => conversationApi.list(businessId, { page: 1 }),
    enabled: !!businessId,
    refetchInterval: 10_000,
  });

  const {
    data: detail,
    isLoading: detailLoading,
    isError: detailError,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ["conversation-detail", businessId, selected],
    queryFn: () => (selected ? conversationApi.get(businessId, selected) : null),
    enabled: !!businessId && !!selected,
    refetchInterval: 5_000,
  });

  const attendMutation = useMutation({
    mutationFn: (convId: string) => conversationApi.attend(businessId, convId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-detail", businessId, selected] });
      toast.success("Atendimento assumido — a IA pausou para esta conversa.");
    },
  });

  const releaseMutation = useMutation({
    mutationFn: (convId: string) => conversationApi.release(businessId, convId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-detail", businessId, selected] });
      toast.success("IA reativada para esta conversa.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (convId: string) => conversationApi.remove(businessId, convId),
    onSuccess: (_data, convId) => {
      setSelected((cur) => (cur === convId ? null : cur));
      void queryClient.invalidateQueries({ queryKey: ["conversations", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations-open-count", businessId] });
      void queryClient.removeQueries({ queryKey: ["conversation-detail", businessId, convId] });
      toast.success("Conversa excluída.");
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao excluir conversa"),
  });

  const sendMutation = useMutation({
    mutationFn: ({
      to,
      text,
      conversationId,
    }: {
      to: string;
      text: string;
      conversationId: string;
    }) => whatsappApi.send(businessId, to, text, conversationId),
    onSuccess: (data: { message?: Message }) => {
      setReplyText("");
      if (data?.message && selected) {
        queryClient.setQueryData(
          ["conversation-detail", businessId, selected],
          (old: (Conversation & { messages: Message[] }) | null | undefined) =>
            old ? { ...old, messages: [...old.messages, data.message!] } : old
        );
      }
      void queryClient.invalidateQueries({ queryKey: ["conversation-detail", businessId, selected] });
      void queryClient.invalidateQueries({ queryKey: ["conversations", businessId] });
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao enviar mensagem"),
  });

  const conversations: Conversation[] = data?.conversations ?? [];
  const filtered = conversations.filter((c) => {
    const label = formatCustomerLabel(c.customerPhone, c.customerName).toLowerCase();
    return label.includes(search.toLowerCase()) || c.customerPhone.includes(search);
  });

  const selectedConv = detail as (Conversation & { messages: Message[] }) | null | undefined;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  }, [selectedConv?.messages]);

  function sendDest(conv: Conversation) {
    return conv.replyJid?.trim() || conv.customerPhone;
  }

  return (
    <div className="flex h-full">
      <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h1 className="font-semibold text-gray-900 mb-3">Conversas</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9 text-sm"
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
                type="button"
                onClick={() => setSelected(conv.id)}
                className={cn(
                  "w-full text-left p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors",
                  selected === conv.id && "bg-brand-50 border-brand-100"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {formatCustomerLabel(conv.customerPhone, conv.customerName)}
                    </p>
                    {!conv.customerName && conv.customerPhone.includes("@lid") ? (
                      <p className="text-xs text-gray-400 truncate">WhatsApp</p>
                    ) : null}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <Badge variant="secondary" className={cn("text-xs", STATUS_LABELS[conv.status]?.color)}>
                      {STATUS_LABELS[conv.status]?.label}
                    </Badge>
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

      <div className="flex-1 flex flex-col bg-gray-50">
        {selected && detailLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : selected && detailError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
            <p className="text-sm text-gray-600">Não foi possível carregar esta conversa.</p>
            <Button type="button" variant="outline" onClick={() => void refetchDetail()}>
              Tentar novamente
            </Button>
          </div>
        ) : selectedConv ? (
          <>
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">
                  {formatCustomerLabel(selectedConv.customerPhone, selectedConv.customerName)}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={STATUS_LABELS[selectedConv.status]?.color}>
                  {STATUS_LABELS[selectedConv.status]?.label}
                </Badge>
                {selectedConv.status === "OPEN" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => attendMutation.mutate(selectedConv.id)}
                    disabled={attendMutation.isPending}
                  >
                    <User className="w-3 h-3" />
                    Assumir atendimento
                  </Button>
                )}
                {selectedConv.status === "ATTENDING" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => releaseMutation.mutate(selectedConv.id)}
                    disabled={releaseMutation.isPending}
                  >
                    <IaIcon className="w-3 h-3" />
                    Devolver à IA
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    const label = formatCustomerLabel(
                      selectedConv.customerPhone,
                      selectedConv.customerName
                    );
                    if (
                      !confirm(
                        `Excluir a conversa com ${label}? Todas as mensagens serão apagadas. Esta ação não pode ser desfeita.`
                      )
                    ) {
                      return;
                    }
                    deleteMutation.mutate(selectedConv.id);
                  }}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  Excluir
                </Button>
              </div>
            </div>

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
                        : isIaMessageRole(msg.role)
                        ? "bg-brand-600 text-white rounded-tr-sm"
                        : "bg-blue-600 text-white rounded-tr-sm"
                    )}
                  >
                    {msg.role !== "CUSTOMER" && (
                      <p className="text-xs opacity-70 mb-1 flex items-center gap-1">
                        {isIaMessageRole(msg.role) ? (
                          <>
                            <IaIcon className="w-3 h-3" /> {IA_DISPLAY_NAME}
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3" /> Você
                          </>
                        )}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-60 mt-1 text-right">
                      {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {selectedConv.status === "ATTENDING" && (
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex items-end gap-3">
                  <Textarea
                    className="min-h-20 flex-1 resize-none text-sm"
                    placeholder="Digite sua mensagem..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (replyText.trim()) {
                          sendMutation.mutate({
                            to: sendDest(selectedConv),
                            text: replyText.trim(),
                            conversationId: selectedConv.id,
                          });
                        }
                      }
                    }}
                  />
                  <Button
                    className="h-10"
                    disabled={!replyText.trim() || sendMutation.isPending}
                    onClick={() =>
                      sendMutation.mutate({
                        to: sendDest(selectedConv),
                        text: replyText.trim(),
                        conversationId: selectedConv.id,
                      })
                    }
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
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
