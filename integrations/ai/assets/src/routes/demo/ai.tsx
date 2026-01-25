import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Send, Square } from 'lucide-react'
import { Streamdown } from 'streamdown'

import { useGuitarChat } from '../../lib/ai-chat'
import type { ChatMessages } from '../../lib/ai-chat'
import GuitarRecommendation from '../../components/GuitarRecommendation'

import './ai.css'

export const Route = createFileRoute('/demo/ai')({
  component: AiDemo,
})

function Messages({ messages }: { messages: ChatMessages }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-xl">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text">
            TanStack AI Chat
          </h1>
          <p className="text-gray-400 mb-2">
            Ask me about guitars! I can recommend instruments from our inventory.
          </p>
          <p className="text-gray-500 text-sm">
            Try: "What guitar would you recommend for a beginner?"
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto pb-4">
      <div className="max-w-3xl mx-auto px-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`p-4 ${
              message.role === 'assistant'
                ? 'bg-gradient-to-r from-cyan-500/5 to-blue-600/5'
                : 'bg-transparent'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium text-white shrink-0 ${
                  message.role === 'assistant'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600'
                    : 'bg-gray-700'
                }`}
              >
                {message.role === 'assistant' ? 'AI' : 'U'}
              </div>
              <div className="flex-1 min-w-0 prose prose-invert max-w-none prose-sm">
                {message.parts.map((part, index) => {
                  if (part.type === 'text' && part.content) {
                    return (
                      <div key={index}>
                        <Streamdown>{part.content}</Streamdown>
                      </div>
                    )
                  }
                  if (
                    part.type === 'tool-call' &&
                    part.name === 'recommendGuitar' &&
                    part.output
                  ) {
                    return (
                      <div key={part.id} className="max-w-sm">
                        <GuitarRecommendation id={String(part.output?.id)} />
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AiDemo() {
  const { messages, sendMessage, isLoading, stop } = useGuitarChat()
  const [input, setInput] = useState('')

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gray-900">
      <Messages messages={messages} />

      <div className="border-t border-cyan-500/10 bg-gray-900/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {isLoading && (
            <div className="flex justify-center mb-3">
              <button
                onClick={stop}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Square className="w-4 h-4 fill-current" />
                Stop
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (input.trim()) {
                sendMessage(input)
                setInput('')
              }
            }}
          >
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about guitars..."
                className="w-full rounded-lg border border-cyan-500/20 bg-gray-800/50 pl-4 pr-12 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '200px' }}
                disabled={isLoading}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  target.style.height = Math.min(target.scrollHeight, 200) + 'px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
                    e.preventDefault()
                    sendMessage(input)
                    setInput('')
                  }
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-cyan-500 hover:text-cyan-400 disabled:text-gray-500"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
          <p className="mt-2 text-xs text-gray-500 text-center">
            Requires OPENAI_API_KEY environment variable
          </p>
          <div className="mt-2 text-center">
            <Link to="/" className="text-cyan-400 hover:text-cyan-300 text-sm">
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
