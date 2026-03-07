import { Check, X } from 'lucide-react'

function formatTime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatBubble({
  message,
  isOwn,
  onAcceptOffer,
  onDeclineOffer,
}) {
  const { content, created_at, offer_price, offer_status } = message

  const bubbleClasses = isOwn
    ? 'bg-brand text-white rounded-[16px] rounded-br-[4px] ml-auto'
    : 'bg-gray-100 text-gray-900 rounded-[16px] rounded-bl-[4px] mr-auto'

  return (
    <div
      className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end self-end' : 'items-start self-start'}`}
    >
      {/* Offer card */}
      {offer_price != null && (
        <div
          className={`w-full rounded-[12px] border p-3 mb-1 ${
            offer_status === 'accepted'
              ? 'border-green-300 bg-green-50'
              : offer_status === 'declined'
                ? 'border-red-300 bg-red-50'
                : 'border-brand/30 bg-orange-50'
          }`}
        >
          <p className="text-xs font-medium text-gray-500 mb-1">
            {isOwn ? 'You sent an offer' : 'Offer received'}
          </p>
          <p className="text-lg font-bold text-gray-900">
            ${typeof offer_price === 'number' ? offer_price.toFixed(2) : offer_price}
          </p>

          {offer_status === 'accepted' && (
            <p className="text-xs font-medium text-green-600 mt-1">Accepted</p>
          )}
          {offer_status === 'declined' && (
            <p className="text-xs font-medium text-red-500 mt-1">Declined</p>
          )}

          {/* Accept / Decline buttons for the recipient only */}
          {!isOwn && !offer_status && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onAcceptOffer?.(message)}
                className="flex items-center gap-1 rounded-[8px] bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
              >
                <Check className="h-3 w-3" />
                Accept
              </button>
              <button
                onClick={() => onDeclineOffer?.(message)}
                className="flex items-center gap-1 rounded-[8px] bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors"
              >
                <X className="h-3 w-3" />
                Decline
              </button>
            </div>
          )}
        </div>
      )}

      {/* Message bubble */}
      {content && (
        <div className={`px-4 py-2.5 text-sm ${bubbleClasses}`}>
          {content}
        </div>
      )}

      {/* Timestamp */}
      {created_at && (
        <span className="mt-1 text-[11px] text-gray-400">
          {formatTime(created_at)}
        </span>
      )}
    </div>
  )
}
