// Este layout não adiciona estrutura própria.
// A sidebar com os links do negócio é renderizada pela Sidebar do (dashboard)/layout.tsx,
// que extrai o businessId automaticamente do pathname.
export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
