import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

const jsonResponse = (data: unknown, init?: { status?: number }) => {
  return new Response(JSON.stringify(data), {
    status: init?.status,
    headers: {
      'content-type': 'application/json',
    },
  })
}

export async function POST(req: Request) {
  const {
    apiKey: key,
    model = 'gpt-4o-mini',
    prompt,
    system,
  } = (await req.json()) as {
    apiKey?: string
    model?: string
    prompt: string
    system?: string
  }

  const apiKey = key || process.env.OPENAI_API_KEY

  if (!apiKey) {
    return jsonResponse({ error: 'Missing OpenAI API key.' }, { status: 401 })
  }

  const openai = createOpenAI({ apiKey })

  try {
    const result = await generateText({
      abortSignal: req.signal,
      maxOutputTokens: 50,
      model: openai(model),
      prompt: prompt,
      system,
      temperature: 0.7,
    })

    return jsonResponse(result)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return jsonResponse(null, { status: 408 })
    }

    return jsonResponse(
      { error: 'Failed to process AI request' },
      { status: 500 }
    )
  }
}
