import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { record } = await req.json()
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const isFromCoach = record.from_coach

    const toEmail = isFromCoach ? record.client_email : 'phoebe@rebalanceco.com'
    const subject = isFromCoach ? 'New message from your coach' : 'New message from a client'
    const body = isFromCoach
      ? `Your coach sent you a message:\n\n"${record.content}"\n\nLog in to reply: https://app.rebalanceco.com/login`
      : `A client sent you a message:\n\n"${record.content}"\n\nLog in to reply: https://app.rebalanceco.com`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'notifications@rebalanceco.com',
        to: toEmail,
        subject,
        text: body,
      }),
    })

    const data = await res.json()
    console.log('Resend response:', JSON.stringify(data))
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Error:', String(err))
    return new Response(String(err), {
      status: 500,
      headers: corsHeaders
    })
  }
})