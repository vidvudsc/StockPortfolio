import { NavLink } from 'react-router-dom';
import { TrendingUp, Users, BarChart3 } from 'lucide-react';

const Header = () => {
  const navItems = [
    { to: '/', label: 'Overview', icon: BarChart3 },
    { to: '/portfolio/zile', label: 'Zile', icon: TrendingUp },
    { to: '/portfolio/liga', label: 'Liga', icon: TrendingUp },
    { to: '/portfolio/pauls', label: 'Pauls', icon: TrendingUp },
    { to: '/portfolio/vidvuds', label: 'Vidvuds', icon: TrendingUp },
    { to: '/trades', label: 'All Trades', icon: Users },
  ];

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Family Portfolio</h1>
          </div>
          
          <nav className="flex items-center space-x-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;