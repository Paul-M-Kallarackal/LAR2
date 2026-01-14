import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth.store';
import {
  Building2, Sun, Car, Leaf, TrendingUp,
  ArrowRight, Lock, LogOut, User
} from 'lucide-react';

interface TemplateCard {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: 'active' | 'coming_soon';
}

const SUSTAINABILITY_TEMPLATES: TemplateCard[] = [
  {
    id: 'green-building',
    name: 'Green Building / LEED Certification Loan',
    description: 'Finance sustainable construction and green building certifications with favorable terms.',
    icon: Building2,
    status: 'active',
  },
  {
    id: 'solar-energy',
    name: 'Solar Energy Financing',
    description: 'Fund solar panel installations and renewable energy infrastructure projects.',
    icon: Sun,
    status: 'coming_soon',
  },
  {
    id: 'ev-vehicle',
    name: 'Electric Vehicle Loan',
    description: 'Special financing rates for electric and hybrid vehicle purchases.',
    icon: Car,
    status: 'coming_soon',
  },
  {
    id: 'sustainable-agriculture',
    name: 'Sustainable Agriculture Loan',
    description: 'Support organic farming, regenerative agriculture, and eco-friendly practices.',
    icon: Leaf,
    status: 'coming_soon',
  },
  {
    id: 'esg-corporate',
    name: 'ESG Corporate Loan',
    description: 'Corporate financing tied to environmental, social, and governance metrics.',
    icon: TrendingUp,
    status: 'coming_soon',
  },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleTemplateClick = (template: TemplateCard) => {
    if (template.status === 'active') {
      navigate(`/questionnaire/${template.id}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Leaf className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">LAR</h1>
              <p className="text-xs text-muted-foreground font-medium">LMA Automate Reimagined</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">{user?.name}</span>
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full capitalize">
                {user?.role}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-foreground mb-4">
            Sustainability Loan Templates
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Select a template to begin your green financing journey. Our guided questionnaire will help you complete all required documentation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {SUSTAINABILITY_TEMPLATES.map((template) => {
            const Icon = template.icon;
            const isActive = template.status === 'active';

            return (
              <Card
                key={template.id}
                className={`relative transition-all duration-300 border-0 shadow-finance-lg bg-card ${
                  isActive
                    ? 'cursor-pointer hover:shadow-finance-xl hover:-translate-y-1 hover:scale-[1.02]'
                    : 'opacity-60 cursor-not-allowed'
                }`}
                style={{ borderRadius: '24px' }}
                onClick={() => handleTemplateClick(template)}
              >
                {!isActive && (
                  <div className="absolute top-4 right-4 z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/80 backdrop-blur-sm text-xs font-medium rounded-full text-muted-foreground border border-border/50">
                      <Lock className="h-3 w-3" />
                      Coming Soon
                    </span>
                  </div>
                )}

                <CardHeader className="pb-6 pt-8 px-8">
                  <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-6">
                    <Icon className="h-8 w-8 text-primary stroke-[1.5]" />
                  </div>
                  <CardTitle className="text-xl font-semibold leading-tight text-foreground mb-2">
                    {template.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="px-8 pb-8">
                  <CardDescription className="text-sm leading-relaxed text-muted-foreground mb-6">
                    {template.description}
                  </CardDescription>

                  {isActive && (
                    <Button 
                      className="w-full h-12 text-base font-medium rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm" 
                      variant="default"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTemplateClick(template);
                      }}
                    >
                      Start Application
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-20 text-center">
          <p className="text-sm text-muted-foreground font-medium">
            More sustainability loan products coming soon.
          </p>
        </div>
      </main>
    </div>
  );
}
