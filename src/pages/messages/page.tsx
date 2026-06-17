import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Paperclip, Smile, MoreVertical, Search, Filter, X } from 'lucide-react';
import { api } from '../../lib/api';
import { Conversation, Message } from '../../types';
import { format } from 'date-fns';
import AppLayout from '../../components/layout/AppLayout';

import { MESSAGE_PROPERTIES as PROPERTIES } from '../../config/properties';

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState('all');
  const queryClient = useQueryClient();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: api.conversations.getAll,
  });

  const { data: messages } = useQuery({
    queryKey: ['messages', selectedConversation],
    queryFn: () => selectedConversation ? api.conversations.getMessages(selectedConversation) : Promise.resolve([]),
    enabled: !!selectedConversation,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => 
      api.conversations.sendMessage(selectedConversation!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] });
      setMessageText('');
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && selectedConversation) {
      sendMessageMutation.mutate(messageText);
    }
  };

  // Filter conversations by search query and property
  const filteredConversations = conversations?.filter(conv => {
    const matchesSearch = conv.guestName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProperty = selectedProperty === 'all' || conv.propertyId === selectedProperty;
    return matchesSearch && matchesProperty;
  });

  const selectedConv = conversations?.find(c => c.id === selectedConversation);

  // Get property name for display
  const getPropertyName = (propertyId: string) => {
    const property = PROPERTIES.find(p => p.id === propertyId);
    return property?.name || propertyId;
  };

  return (
    <AppLayout>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 140px - env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex h-full">
          {/* Conversations List */}
          <div className={`
            w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col
            ${selectedConversation ? 'hidden md:flex' : 'flex'}
          `}>
            {/* Search Header */}
            <div className="p-4 border-b border-gray-200 space-y-3">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full"
                />
              </div>
              
              {/* Property Filter */}
              <div className="relative">
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm border-none outline-none appearance-none cursor-pointer pr-8"
                >
                  {PROPERTIES.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
                <Filter className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredConversations?.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-500">No conversations found</p>
                </div>
              ) : (
                filteredConversations?.map(conversation => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`
                      w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100
                      ${selectedConversation === conversation.id ? 'bg-[#F0F4F1]' : ''}
                    `}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-[#8BA894] to-blue-500 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0">
                      {conversation.guestName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{conversation.guestName}</p>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {format(new Date(conversation.lastMessageTime), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{getPropertyName(conversation.propertyId)}</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-gray-600 truncate">{conversation.lastMessage}</p>
                        {conversation.unreadCount > 0 && (
                          <span className="bg-[#7C9082] text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      <span className={`
                        inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full
                        ${conversation.channel === 'airbnb' ? 'bg-red-50 text-red-700' : ''}
                        ${conversation.channel === 'booking.com' ? 'bg-blue-50 text-blue-700' : ''}
                        ${conversation.channel === 'direct' ? 'bg-green-50 text-green-700' : ''}
                      `}>
                        {conversation.channel}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Messages Area */}
          <div className={`
            flex-1 flex flex-col
            ${selectedConversation ? 'flex' : 'hidden md:flex'}
          `}>
            {selectedConversation && selectedConv ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 bg-gradient-to-br from-[#8BA894] to-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                      {selectedConv.guestName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{selectedConv.guestName}</p>
                      <p className="text-xs text-gray-500">{getPropertyName(selectedConv.propertyId)}</p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <MoreVertical className="w-5 h-5 text-gray-600" />
                  </button>
                </div>

                {/* Messages - sorted oldest first, auto-scroll to bottom */}
                <MessagesView messages={messages} />

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Paperclip className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex-1 bg-gray-100 rounded-lg px-4 py-2">
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type your message..."
                        rows={1}
                        className="w-full bg-transparent border-none outline-none text-sm resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Smile className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      type="submit"
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                      className="p-2 bg-[#7C9082] hover:bg-[#6B7F71] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-base font-medium text-gray-900 mb-1">Select a conversation</p>
                  <p className="text-sm text-gray-500">Choose a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// Sort messages oldest-first and auto-scroll to bottom
function MessagesView({ messages }: { messages: any[] | undefined }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sort messages by timestamp ascending (oldest first = top, newest = bottom)
  const sorted = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    return [...messages].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [messages]);

  // Auto-scroll to bottom when messages load or change
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sorted]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {sorted.map(message => (
        <div
          key={message.id}
          className={`flex ${message.sender === 'host' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`
            max-w-[70%] rounded-lg px-4 py-2
            ${message.sender === 'host'
              ? 'bg-[#7C9082] text-white'
              : 'bg-gray-100 text-gray-900'
            }
          `}>
            <p className="text-sm">{message.content}</p>
            <div className={`flex items-center gap-2 mt-1 text-xs ${
              message.sender === 'host' ? 'text-[#D4DCD9]' : 'text-gray-500'
            }`}>
              <span>{message.timestamp ? format(new Date(message.timestamp), 'MMM d, HH:mm') : ''}</span>
              {message.sender === 'host' && (
                <span className="capitalize">{message.status}</span>
              )}
            </div>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
