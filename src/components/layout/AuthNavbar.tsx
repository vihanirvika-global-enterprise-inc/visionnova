import { getSession } from '@/lib/session'
import { Navbar } from './Navbar'

export async function AuthNavbar() {
  const session = getSession()
  return <Navbar isLoggedIn={!!session} />
}
