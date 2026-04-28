import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const { record } = await req.json()
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const isFromCoach = record.from_coach

    const toEmail = isFromCoach ? record.client_email : 'phoebe@rebalanceco.com'
    const subject = isFromCoach ? 'New message from your coach' : 'New message from a client'
    const body = isFromCoach
      ? `Your coach sent you a message:\n\n"${record.content}"\n\nLog in to reply: https://euphonious-dango-9bba15.netlify.app/login`
      : `A client sent you a message:\n\n"${record.content}"\n\nLog in to reply: https://euphonious-dango-9bba15.netlify.app`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: toEmail,
        subject,
        text: body,
      }),
    })

    const data = await res.json()
    console.log('Resend response:', JSON.stringify(data))
    return new Response(JSON.stringify(data), { status: 200 })
  } catch (err) {
    console.error('Error:', String(err))
    return new Response(String(err), { status: 500 })
  }
})