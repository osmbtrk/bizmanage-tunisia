import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  FileText, Users, Package, ShoppingCart, BarChart3, Receipt,
  Truck, Warehouse, ArrowRight, CheckCircle2, Building2, Shield, Zap
} from 'lucide-react';

const features = [
  { icon: ShoppingCart, title: 'Point de Vente', desc: 'Interface POS rapide avec gestion du panier, remises et impression de tickets.' },
  { icon: FileText, title: 'Facturation', desc: 'Factures, devis et bons conformes à la législation tunisienne avec numérotation automatique.' },
  { icon: Package, title: 'Gestion de Stock', desc: 'Suivi en temps réel, alertes de stock bas, mouvements et nomenclature (BOM).' },
  { icon: Users, title: 'Clients & Fournisseurs', desc: 'Base de données complète avec historique des transactions et statuts.' },
  { icon: Receipt, title: 'Dépenses & Finances', desc: 'Suivi des dépenses, calcul automatique de TVA et rapports financiers.' },
  { icon: BarChart3, title: 'Analytiques', desc: 'Tableaux de bord avec KPIs, graphiques de revenus et classement clients.' },
];

const benefits = [
  'Conforme à la réglementation fiscale tunisienne',
  'Numérotation séquentielle automatique des documents',
  'Calcul automatique de TVA (0%, 7%, 13%, 19%)',
  'Archivage numérique des documents avec stockage sécurisé',
  'Rôles et permissions (Admin, Caissier, Comptable)',
  'Mode sombre / clair automatique',
];

const pricing = [
  { name: 'Starter', price: 'Gratuit', period: '', features: ['1 utilisateur', '50 factures/mois', 'POS basique', 'Support email'], highlighted: false },
  { name: 'Pro', price: '49 TND', period: '/mois', features: ['5 utilisateurs', 'Factures illimitées', 'POS avancé', 'Analytiques', 'Support prioritaire'], highlighted: true },
  { name: 'Entreprise', price: '149 TND', period: '/mois', features: ['Utilisateurs illimités', 'Multi-établissement', 'API dédiée', 'Formation incluse', 'Support 24/7'], highlighted: false },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Fatourty</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>Connexion</Button>
            <Button size="sm" onClick={() => navigate('/')}>Commencer</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-32">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-medium mb-6">
              <Zap className="h-3 w-3 text-primary" /> Solution #1 de facturation en Tunisie
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight max-w-3xl leading-[1.1]">
              Gérez votre entreprise avec <span className="text-primary">simplicité</span>
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mt-6 leading-relaxed">
              Facturation, stock, POS et analytiques dans une seule plateforme moderne, conçue pour les entreprises tunisiennes.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-8">
              <Button size="lg" className="gap-2 text-base px-8 h-12" onClick={() => navigate('/')}>
                Commencer gratuitement <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-base px-8 h-12" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                Découvrir
              </Button>
            </div>
            <div className="flex items-center gap-6 mt-8 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Gratuit pour démarrer</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Sans carte bancaire</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Conforme TVA</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Tout ce dont vous avez besoin</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">Une suite complète d'outils pour gérer votre activité commerciale au quotidien.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div key={i} className="group rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 mb-4 group-hover:bg-primary/15 transition-colors">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-3">Conçu pour la Tunisie</h2>
              <p className="text-muted-foreground text-lg mb-8">Fatourty respecte les exigences fiscales et comptables tunisiennes dès le départ.</p>
              <div className="space-y-3">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{b}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <Shield className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="font-bold text-2xl">RLS</p>
                <p className="text-xs text-muted-foreground mt-1">Sécurité par défaut</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <Zap className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="font-bold text-2xl">&lt;1s</p>
                <p className="text-xs text-muted-foreground mt-1">Temps de réponse</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <Warehouse className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="font-bold text-2xl">BOM</p>
                <p className="text-xs text-muted-foreground mt-1">Nomenclature intégrée</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <Truck className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="font-bold text-2xl">360°</p>
                <p className="text-xs text-muted-foreground mt-1">Vue complète</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Tarification simple</h2>
          <p className="text-muted-foreground text-lg">Choisissez le plan adapté à votre activité.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3 max-w-4xl mx-auto">
          {pricing.map((plan, i) => (
            <div key={i} className={`rounded-xl border p-6 flex flex-col transition-all duration-300 ${plan.highlighted ? 'border-primary bg-primary/5 shadow-xl ring-1 ring-primary/20 scale-[1.02]' : 'border-border bg-card hover:shadow-md'}`}>
              {plan.highlighted && <span className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">Populaire</span>}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <div className="mt-3 mb-6">
                <span className="text-3xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant={plan.highlighted ? 'default' : 'outline'} className="w-full" onClick={() => navigate('/')}>
                {plan.price === 'Gratuit' ? 'Commencer' : 'Essai gratuit'}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Prêt à simplifier votre gestion ?</h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">Rejoignez les entreprises tunisiennes qui font confiance à Fatourty.</p>
          <Button size="lg" variant="secondary" className="gap-2 text-base px-8" onClick={() => navigate('/')}>
            Créer mon compte <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-semibold">Fatourty</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Fatourty — Facturation Tunisie. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
