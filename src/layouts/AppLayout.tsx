import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/button'
import { signOut } from '../data/client'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/projects', label: 'Proyectos' },
  { to: '/users', label: 'Usuarios', admin: true },
  { to: '/upload', label: 'Carga', admin: true },
]

export function AppLayout() {
  const navigate = useNavigate()
  const { profile, role } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="grid min-h-screen lg:grid-cols-[240px_1fr]">
        <aside className="hidden border-r bg-card lg:block">
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b px-6 py-4 text-lg font-semibold">
              <div className="h-8 w-8 rounded-lg bg-primary/10" />
              CAPEX Sync Pro
            </div>
            <nav className="flex-1 space-y-1 px-4 py-4 text-sm">
              {navItems
                .filter((item) => (item.admin ? role === 'admin' : true))
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-primary/10',
                        isActive ? 'bg-primary/10 text-primary' : 'text-foreground'
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
            </nav>
            <div className="border-t px-4 py-4 text-sm text-muted-foreground">
              <div className="font-semibold text-foreground">{profile?.full_name}</div>
              <div className="flex items-center justify-between gap-2">
                <span>{role === 'admin' ? 'Administrador' : 'Usuario'}</span>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Salir
                </Button>
              </div>
            </div>
          </div>
        </aside>
        <main className="flex flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card/80 px-6 py-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold">
                  CS
                </div>
              </Link>
              <div>
                <p className="text-xs uppercase text-muted-foreground">CAPEX Control</p>
                <h1 className="text-xl font-semibold">CAPEX Sync Pro</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {profile?.email}
            </div>
          </header>
          <div className="flex-1 px-4 py-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
