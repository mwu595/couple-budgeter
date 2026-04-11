import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email } = await request.json() as { email: string }
  if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const invitedEmail = email.trim().toLowerCase()

  // Inviter must be in a household
  const { data: member } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'You are not in a household yet' }, { status: 403 })

  // Can't invite yourself
  if (invitedEmail === user.email?.toLowerCase()) {
    return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 })
  }

  // Check if the invited email already belongs to a household member
  const service = createServiceClient()
  const { data: existingMember } = await service
    .from('household_members')
    .select('user_id')
    .eq('household_id', member.household_id)
    .not('user_id', 'is', null)

  const { data: authUsers } = await service.auth.admin.listUsers()
  const inviteeUser = authUsers?.users.find(
    (u) => u.email?.toLowerCase() === invitedEmail,
  )

  if (inviteeUser) {
    const alreadyMember = existingMember?.some((m) => m.user_id === inviteeUser.id)
    if (alreadyMember) {
      return NextResponse.json({ error: 'This person is already in your household' }, { status: 409 })
    }
  }

  // Upsert the invite (update if already sent to the same email)
  const { error } = await service.from('household_invites').upsert(
    {
      household_id:  member.household_id,
      invited_email: invitedEmail,
      invited_by:    user.id,
      accepted_at:   null,
    },
    { onConflict: 'household_id,invited_email' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// GET — return the current household's invite status
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ invite: null })

  const { data: invite } = await supabase
    .from('household_invites')
    .select('invited_email, accepted_at, created_at')
    .eq('household_id', member.household_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Check if user_b slot has a real user (partner joined)
  const service = createServiceClient()
  const { data: partnerSlot } = await service
    .from('household_members')
    .select('user_id')
    .eq('household_id', member.household_id)
    .eq('slot', 'user_b')
    .maybeSingle()

  const partnerJoined = partnerSlot?.user_id !== null && partnerSlot?.user_id !== undefined

  return NextResponse.json({ invite, partnerJoined })
}
