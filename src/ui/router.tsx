import { useEffect, useState } from "react";

export function navigate(path: string, options: { replace?: boolean; scroll?: boolean } = {}) {
  if (options.replace) window.history.replaceState({}, "", path);
  else window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  if (options.scroll !== false) window.scrollTo({ top: 0 });
}

export function usePath() {
  const [path, setPath] = useState(window.location.pathname + window.location.search);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname + window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

export function useQueryParam(name: string) {
  const path = usePath();
  return new URLSearchParams(path.split("?")[1] ?? "").get(name) ?? "";
}

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> & {
  to: string;
  onClick?: () => void;
};

export function Link({ to, onClick, children, ...rest }: LinkProps) {
  return (
    <a
      {...rest}
      href={to}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        onClick?.();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

/** Sets document.title before the route's page_view fires (child effects run before the Router's). */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · Vitaly` : "Vitaly · Vitamins, minerals & natural care";
  }, [title]);
}
