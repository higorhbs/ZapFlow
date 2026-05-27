export function generateStaticParams() {
  return [{ id: "app" }];
}

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
