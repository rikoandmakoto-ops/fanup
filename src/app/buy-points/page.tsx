import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BuyPointsForm from './BuyPointsForm'

export default async function BuyPointsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <BuyPointsForm />
}
