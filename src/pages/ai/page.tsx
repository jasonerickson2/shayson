import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Send, Calendar, DollarSign, TrendingUp, Sparkles, Settings as SettingsIcon } from 'lucide-react';
import { api } from '../../lib/api';
import AppLayout from '../../components/layout/AppLayout';
import PricingTab from '../approvals/PricingTab';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: {
    id: string;
    description: string;
  };
}

const QUICK_ACTIONS = [
  {
    id: 'block-dates',
    icon: Calendar,
    title: 'Block Dates',
    description: 'Block a property for specific dates',
    prompt: 'I want to block dates for a property',
  },
  {
    id: 'set-rate',
    icon: DollarSign,
    title: 'Set Rate',
    description: 'Override the nightly rate for a property',
    prompt: 'I want to set a custom rate for a property',
  },
  {
    id: 'check-pacing',
    icon: TrendingUp,
    title: 'Check Pacing',
    description: 'See how a month is pacing vs last year',
    prompt: 'Show me how this month is pacing compared to last year',
  },
  {
    id: 'gap-analysis',
    icon: Sparkles,
    title: 'Gap Analysis',
    description: 'Find and fill booking gaps across properties',
    prompt: 'Run a gap analysis to find booking opportunities',
  },
];

import { AI_PROPERTY_DESCRIPTION } from '../../config/properties';

const DEFAULT_SYSTEM_PROMPT = `You are the AI assistant for Shayson, a vacation rental portfolio at Roadhouse Twin Lakes in Twin Lakes, Colorado. ${AI_PROPERTY_DESCRIPTION} Help with blocking dates, setting rates, analyzing revenue, checking pacing, finding gaps, and property management tasks.`;

export default function AIPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);

  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => api.ai.sendMessage(message, messages),
    onSuccess: (response) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
        action: response.action ? {
          id: response.actionId!,
          description: response.actionDescription!,
        } : undefined,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
  });

  const approveActionMutation = useMutation({
    mutationFn: (actionId: string) => api.ai.executeAction(actionId),
    onSuccess: (response) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
  });

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    sendMessageMutation.mutate(text);
  };

  const handleQuickAction = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleApproveAction = (actionId: string) => {
    approveActionMutation.mutate(actionId);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
            <p className="text-sm text-gray-500 mt-1">
              Your intelligent assistant for property management
            </p>
          </div>
          <button
            onClick={() => setIsEditingPrompt(!isEditingPrompt)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <SettingsIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* System Prompt Editor */}
        {isEditingPrompt && (
          <div className="mb-4 bg-white rounded-lg border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C9082] focus:border-transparent outline-none resize-none"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
              >
                Reset to Default
              </button>
              <button
                onClick={() => setIsEditingPrompt(false)}
                className="px-3 py-1.5 text-sm bg-[#7C9082] text-white rounded-lg hover:bg-[#6B7F71] transition-colors whitespace-nowrap"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Pricing Proposals */}
        {messages.length === 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-3">AI Price Suggestions</p>
            <PricingTab />
          </div>
        )}

        {/* Quick Actions */}
        {messages.length === 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-[#A3B8A0] hover:bg-[#F0F4F1] transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 bg-[#E0EBE3] rounded-lg flex items-center justify-center group-hover:bg-[#7C9082] transition-colors">
                      <Icon className="w-5 h-5 text-[#7C9082] group-hover:text-white" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">{action.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-y-auto p-4 space-y-4 mb-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#E0EBE3] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-[#7C9082]" />
                </div>
                <p className="text-base font-medium text-gray-900 mb-1">
                  Welcome to Shayson AI
                </p>
                <p className="text-sm text-gray-500">
                  Choose a quick action or type a command to get started
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-[#7C9082] text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.action && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <p className="text-xs mb-2 opacity-90">{message.action.description}</p>
                      <button
                        onClick={() => handleApproveAction(message.action!.id)}
                        disabled={approveActionMutation.isPending}
                        className="px-3 py-1.5 bg-white text-[#7C9082] rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {approveActionMutation.isPending ? 'Processing...' : 'Approve'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {sendMessageMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputText);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a command or ask a question..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7C9082] focus:border-transparent outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sendMessageMutation.isPending}
            className="px-6 py-3 bg-[#7C9082] hover:bg-[#6B7F71] disabled:bg-[#8BA894] text-white rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
