import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, Package, Truck,
  Receipt, Menu, X, Settings, LogOut, User, ChevronDown, Plus, ShoppingCart, BarChart3,
  Warehouse, Archive, FolderTree, CreditCard, ArrowLeftRight, Calculator, ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import GlobalCreateDialogs, { type GlobalDialogType } from '@/components/GlobalCreateDialogs';
import { Package as PackageIcon, Building2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: { to: string; icon: React.ElementType; label: string }[];
}

const navGroups: NavGroup[] = [
  {
    label: 'VENTES',
    icon: ShoppingCart,
    items: [
      { to: '/pos', icon: ShoppingCart, label: 'Point de Vente' },
      { to: '/factures', icon: FileText, label: 'Factures' },
      { to: '/devis', icon: FileText, label: 'Devis' },
      { to: '/paiements', icon: CreditCard, label: 'Paiements' },
    ],
  },
  {
    label: 'CLIENTS',
    icon: Users,
    items: [
      { to: '/clients', icon: Users, label: 'Gestion clients' },
    ],
  },
  {
    label: 'PRODUITS & STOCK',
    icon: Package,
    items: [
      { to: '/produits', icon: Package, label: 'Produits' },
      { to: '/categories', icon: FolderTree, label: 'Catégories' },
      { to: '/stock', icon: Warehouse, label: 'Gestion Stock' },
      { to: '/mouvements', icon: ArrowLeftRight, label: 'Mouvements' },
    ],
  },
  {
    label: 'ACHATS',
    icon: Truck,
    items: [
      { to: '/fournisseurs', icon: Truck, label: 'Fournisseurs' },
      { to: '/factures-fournisseurs', icon: FileText, label: 'Factures fournisseurs' },
    ],
  },
  {
    label: 'FINANCES',
    icon: Receipt,
    items: [
      { to: '/depenses', icon: Receipt, label: 'Dépenses' },
      { to: '/taxes', icon: Calculator, label: 'Taxes' },
      { to: '/archives', icon: Archive, label: 'Archive numérique' },
    ],
  },
];

const standaloneTop = { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' };
const standaloneBottom = [
  { to: '/analytiques', icon: BarChart3, label: 'Analytiques' },
  { to: '/parametres', icon: Settings, label: 'Paramètres' },
];

function SidebarNavGroup({ group, currentPath, onNavigate }: { group: NavGroup; currentPath: string; onNavigate: () => void }) {
  const isGroupActive = group.items.some(i => currentPath === i.to || (i.to !== '/' && currentPath.startsWith(i.to)));
  const [open, setOpen] = useState(isGroupActive);
  const GroupIcon = group.icon;

  return (
    <div className="pt-1 first:pt-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-sidebar-accent group whitespace-nowrap">
          <GroupIcon className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isGroupActive ? "text-sidebar-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground"
          )} />
          <span className={cn(
            "flex-1 text-left transition-colors",
            isGroupActive ? "text-sidebar-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground"
          )}>
            {group.label}
          </span>
          <ChevronRight className={cn(
            "h-4 w-4 transition-transform duration-200",
            isGroupActive ? "text-sidebar-primary" : "text-sidebar-muted",
            open && "rotate-90"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-0.5 space-y-0.5 ml-1">
          {group.items.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createDialog, setCreateDialog] = useState<GlobalDialogType>(null);
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground',
        'transform transition-transform duration-200 ease-in-out',
        'lg:relative lg:translate-x-0 flex flex-col',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
              <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold text-sidebar-foreground">Fatourty</h1>
              <p className="text-xs text-sidebar-muted">Facturation Tunisie</p>
            </div>
          </div>
          <button onClick={closeSidebar} className="lg:hidden text-sidebar-muted hover:text-sidebar-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scroll-smooth overscroll-contain">
          {/* Dashboard - standalone */}
          <NavLink
            to={standaloneTop.to}
            end
            onClick={closeSidebar}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )
            }
          >
            <standaloneTop.icon className="h-4.5 w-4.5 shrink-0" />
            {standaloneTop.label}
          </NavLink>

          {/* Grouped sections */}
          {navGroups.map(group => (
            <SidebarNavGroup key={group.label} group={group} currentPath={location.pathname} onNavigate={closeSidebar} />
          ))}

          {/* Bottom standalone items */}
          <div className="pt-2 border-t border-sidebar-border mt-2 space-y-0.5">
            {standaloneBottom.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )
                }
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <User className="h-4 w-4 text-sidebar-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{profile?.full_name || profile?.email}</p>
              <p className="text-xs text-sidebar-muted capitalize">{role || 'utilisateur'}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-3 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />

          <ThemeToggle />

          <Button variant="outline" size="sm" className="gap-1.5 transition-colors duration-200" onClick={() => navigate('/pos')}>
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">POS</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Créer</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setCreateDialog('facture')} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" /> Nouvelle Facture
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateDialog('devis')} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" /> Nouveau Devis
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCreateDialog('client')} className="cursor-pointer">
                <Users className="h-4 w-4 mr-2" /> Nouveau Client
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateDialog('product')} className="cursor-pointer">
                <PackageIcon className="h-4 w-4 mr-2" /> Nouveau Produit
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <span className="hidden sm:inline">{profile?.full_name || profile?.email}</span>
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                {profile?.email}
                <br />
                <span className="capitalize font-medium">{role}</span>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <NavLink to="/parametres" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" /> Paramètres
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" /> Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      <GlobalCreateDialogs openDialog={createDialog} onClose={() => setCreateDialog(null)} />
    </div>
  );
}
