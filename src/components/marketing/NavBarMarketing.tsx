import { memo, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { Megaphone } from "lucide-react";

const links = [
  { to: "/marketing", label: "Marketing", icon: Megaphone, color: "--primary", exact: true },
];

function NavBarMarketingBase() {
  const { pathname } = useLocation();

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 pointer-events-none"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      <nav className="liquid-glass pointer-events-auto !rounded-[28px]">
        <div className="flex items-center gap-2 px-3 py-3">
          {links.map((l) => {
            const Icon = l.icon;
            const active = l.exact ? pathname === l.to : pathname.startsWith(l.to);
            const tileStyle = { "--tile-color": `var(${l.color})` } as CSSProperties;
            return (
              <Link
                key={l.to}
                to={l.to}
                aria-label={l.label}
                title={l.label}
                style={tileStyle}
                className={`dock-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active ? "dock-tile-active" : ""
                }`}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default memo(NavBarMarketingBase);
