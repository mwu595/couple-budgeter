import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  // 1. Verify the caller is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Prevent duplicate households
  const { data: existing } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing?.household_id) {
    return NextResponse.json({ householdId: existing.household_id })
  }

  const { userA, userB } = await request.json() as {
    userA: { name: string; emoji: string }
    userB: { name: string; emoji: string }
  }

  // 3. Use service role to bypass RLS for initial household creation
  const service = createServiceClient()

  const { data: household, error: householdError } = await service
    .from('households')
    .insert({})
    .select('id')
    .single()

  if (householdError) {
    return NextResponse.json({ error: householdError.message }, { status: 500 })
  }

  // 4. Add user_a (the authenticated user) and a placeholder for user_b
  const { error: membersError } = await service.from('household_members').insert([
    {
      household_id: household.id,
      user_id:      user.id,       // authenticated user gets a real user_id
      slot:         'user_a',
      display_name: userA.name,
      avatar_emoji: userA.emoji,
    },
    {
      household_id: household.id,
      user_id:      null,          // partner hasn't signed up yet (Step 10 fills this in)
      slot:         'user_b',
      display_name: userB.name,
      avatar_emoji: userB.emoji,
    },
  ])

  if (membersError) {
    // Clean up the orphaned household
    await service.from('households').delete().eq('id', household.id)
    return NextResponse.json({ error: membersError.message }, { status: 500 })
  }

  return NextResponse.json({ householdId: household.id })
}
