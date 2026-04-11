import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return NextResponse.json({ accepted: false })

  const userEmail = user.email.toLowerCase()
  const service   = createServiceClient()

  // Find a pending (unaccepted) invite for this email
  const { data: invite } = await service
    .from('household_invites')
    .select('id, household_id')
    .eq('invited_email', userEmail)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!invite) return NextResponse.json({ accepted: false })

  // Link this user to the user_b slot in the household
  const { error: updateError } = await service
    .from('household_members')
    .update({ user_id: user.id })
    .eq('household_id', invite.household_id)
    .eq('slot', 'user_b')
    .is('user_id', null)   // only claim an unclaimed slot

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Mark the invite as accepted
  await service
    .from('household_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({ accepted: true, householdId: invite.household_id })
}
