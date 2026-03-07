import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Send,
  ArrowLeft,
  DollarSign,
  X,
  Inbox,
  Image as ImageIcon,
} from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import { useConversations, useMessages, useSendMessage } from '../hooks/useMessages';
import { useAuthStore } from '../stores/authStore';

export default function InboxPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [message, setMessage] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const messagesEndRef = useRef(null);

  const { data: conversations, isLoading: convosLoading } = useConversations();
  const { data: messages, isLoading: msgsLoading } = useMessages(selectedConvo?.id);
  const sendMessage = useSendMessage();

  // Auto-select conversation from URL params
  useEffect(() => {
    const sellerId = searchParams.get('seller');
    if (sellerId && conversations?.length) {
      const existing = conversations.find(
        (c) => c.other_user?.id === sellerId
      );
      if (existing) setSelectedConvo(existing);
    }
  }, [searchParams, conversations]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !selectedConvo) return;
    try {
      await sendMessage.mutateAsync({
        conversation_id: selectedConvo.id,
        content: message.trim(),
        sender_id: user.id,
      });
      setMessage('');
    } catch (err) {
      console.error('Failed to send:', err);
    }
  };

  const handleSendOffer = async () => {
    if (!offerPrice || !selectedConvo) return;
    try {
      await sendMessage.mutateAsync({
        conversation_id: selectedConvo.id,
        content: `[OFFER] I'd like to offer $${parseFloat(offerPrice).toFixed(2)} for this item.`,
        sender_id: user.id,
        type: 'offer',
        metadata: { offer_amount: parseFloat(offerPrice) },
      });
      setOfferPrice('');
      setShowOfferModal(false);
    } catch (err) {
      console.error('Failed to send offer:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <EmptyState
          icon="lock"
          title="Sign in to view messages"
          description="You need to be logged in to access your inbox."
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white dark:bg-gray-950">
      {/* Conversation List */}
      <div
        className={`w-full border-r border-gray-200 dark:border-gray-800 md:w-80 lg:w-96 ${
          selectedConvo ? 'hidden md:flex' : 'flex'
        } flex-col`}
      >
        <div className="border-b border-gray-200 p-4 dark:border-gray-800">
          <h1 className="font-['Baloo_2'] text-xl font-bold text-gray-900 dark:text-white">
            Messages
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {convosLoading ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : !conversations?.length ? (
            <div className="flex h-full items-center justify-center p-8">
              <EmptyState
                icon="inbox"
                title="No messages yet"
                description="Start a conversation by messaging a seller from a product page."
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {conversations.map((convo) => {
                const isActive = selectedConvo?.id === convo.id;
                return (
                  <button
                    key={convo.id}
                    onClick={() => setSelectedConvo(convo)}
                    className={`flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 ${
                      isActive ? 'bg-[#FF6B35]/5' : ''
                    }`}
                  >
                    <Avatar
                      src={convo.other_user?.avatar_url}
                      name={convo.other_user?.name}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate font-['Nunito'] font-bold text-gray-900 dark:text-white">
                          {convo.other_user?.name || 'User'}
                        </p>
                        <span className="flex-shrink-0 text-xs text-gray-400">
                          {formatTime(convo.last_message_at || convo.updated_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {convo.product?.image && (
                          <img
                            src={convo.product.image}
                            alt=""
                            className="h-6 w-6 flex-shrink-0 rounded object-cover"
                          />
                        )}
                        <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                          {convo.last_message || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                    {convo.unread_count > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FF6B35] px-1.5 text-xs font-bold text-white">
                        {convo.unread_count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat View */}
      <div
        className={`flex flex-1 flex-col ${
          selectedConvo ? 'flex' : 'hidden md:flex'
        }`}
      >
        {selectedConvo ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
              <button
                onClick={() => setSelectedConvo(null)}
                className="md:hidden"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
              <Avatar
                src={selectedConvo.other_user?.avatar_url}
                name={selectedConvo.other_user?.name}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-['Nunito'] font-bold text-gray-900 dark:text-white">
                  {selectedConvo.other_user?.name || 'User'}
                </p>
                {selectedConvo.product?.title && (
                  <p className="truncate text-xs text-gray-500">
                    Re: {selectedConvo.product.title}
                  </p>
                )}
              </div>
              <Button
                onClick={() => setShowOfferModal(true)}
                className="flex items-center gap-1 border border-[#FF6B35] bg-transparent px-3 py-1.5 text-xs font-semibold text-[#FF6B35] hover:bg-[#FF6B35]/5"
              >
                <DollarSign className="h-3 w-3" />
                Make Offer
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {msgsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                      <Skeleton className="h-10 w-48 rounded-2xl" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {messages?.map((msg) => {
                    const isMine = msg.sender_id === user.id;
                    const isOffer = msg.type === 'offer' || msg.content?.startsWith('[OFFER]');
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                            isOffer
                              ? 'border-2 border-[#FFD23F] bg-[#FFD23F]/10'
                              : isMine
                              ? 'bg-[#FF6B35] text-white'
                              : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                          }`}
                        >
                          {isOffer && (
                            <div className="mb-1 flex items-center gap-1 text-xs font-bold text-[#FF6B35]">
                              <DollarSign className="h-3 w-3" />
                              Offer
                            </div>
                          )}
                          <p className="font-['Nunito'] text-sm whitespace-pre-line">
                            {msg.content?.replace('[OFFER] ', '')}
                          </p>
                          <p
                            className={`mt-1 text-[10px] ${
                              isMine ? 'text-white/70' : 'text-gray-400'
                            }`}
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="border-t border-gray-200 p-4 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-['Nunito'] text-sm text-gray-700 transition-colors focus:border-[#FF6B35] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim()}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FF6B35] text-white transition-colors hover:bg-[#e55a2b] disabled:opacity-40"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Inbox className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" />
              <p className="mt-4 font-['Baloo_2'] text-xl font-bold text-gray-400 dark:text-gray-500">
                Select a conversation
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Choose a chat from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Offer Modal */}
      <Modal isOpen={showOfferModal} onClose={() => setShowOfferModal(false)}>
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-['Baloo_2'] text-xl font-bold text-gray-900 dark:text-white">
              Make an Offer
            </h2>
            <button onClick={() => setShowOfferModal(false)}>
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          </div>
          {selectedConvo?.product && (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
              {selectedConvo.product.image && (
                <img
                  src={selectedConvo.product.image}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {selectedConvo.product.title}
                </p>
                <p className="text-sm text-gray-500">
                  Listed at ${selectedConvo.product.price?.toFixed(2)}
                </p>
              </div>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Your Offer Price
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-lg font-bold text-gray-900 focus:border-[#FF6B35] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <Button
            onClick={handleSendOffer}
            disabled={!offerPrice}
            className="mt-4 w-full bg-[#FF6B35] py-3 font-semibold text-white hover:bg-[#e55a2b] disabled:opacity-40"
          >
            Send Offer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
