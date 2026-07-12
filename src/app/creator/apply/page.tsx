import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreatorApplyForm from './CreatorApplyForm'

export default async function CreatorApplyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <CreatorApplyForm />
}
