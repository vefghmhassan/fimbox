addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  }

  try {
    const url = new URL(request.url)
    const telegramUrl = 'https://api.telegram.org' + url.pathname + url.search
    
    const modifiedRequest = new Request(telegramUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TelegramBot (Cloudflare Worker)'
      },
      body: request.body
    })

    const response = await fetch(modifiedRequest)
    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error.message,
      description: 'Error processing request through Cloudflare Worker'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
} 