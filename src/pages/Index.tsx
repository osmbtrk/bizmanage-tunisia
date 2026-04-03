import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, FileText, ShoppingCart, Package, BarChart3, ArrowRight } from 'lucide-react';

export default function Index() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      if (error) {
        setError(error);
      } else {
        setSuccess('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground flex-col justify-center px-12 xl:px-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20">
              <Building2 className="h-7 w-7" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Fatourty</h1>
          </div>
          <p className="text-xl text-primary-foreground/90 mb-6 leading-relaxed">
            La solution de facturation et gestion commerciale conçue pour les entreprises tunisiennes.
          </p>
          <p className="text-primary-foreground/70 mb-10">
            Gérez vos factures, clients, stock et point de vente dans une seule plateforme moderne et intuitive.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-10">
            {[
              { icon: FileText, label: 'Facturation conforme' },
              { icon: ShoppingCart, label: 'Point de Vente' },
              { icon: Package, label: 'Gestion de Stock' },
              { icon: BarChart3, label: 'Analytiques' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-primary-foreground/10 p-3 backdrop-blur-sm border border-primary-foreground/10">
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>

          <Link to="/landing" className="inline-flex items-center gap-2 text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
            Découvrir toutes les fonctionnalités <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Right — Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                <Building2 className="h-7 w-7 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Fatourty</h1>
            </div>
            <p className="text-muted-foreground text-sm">Facturation conforme à la législation tunisienne</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
            <h2 className="text-xl font-semibold mb-1 text-center">
              {isLogin ? 'Connexion' : 'Créer un compte'}
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {isLogin ? 'Accédez à votre espace de gestion' : 'Commencez gratuitement'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <Label>Nom complet</Label>
                  <Input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Votre nom" />
                </div>
              )}
              <div>
                <Label>Email</Label>
                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" />
              </div>
              <div>
                <Label>Mot de passe</Label>
                <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
              </div>

              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
              {success && <p className="text-sm text-success bg-success/10 rounded-lg px-3 py-2">{success}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLogin ? 'Se connecter' : "S'inscrire"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
                className="text-sm text-primary hover:underline"
              >
                {isLogin ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link to="/landing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Découvrir Fatourty →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
