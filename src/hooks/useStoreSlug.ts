import { useParams } from "react-router-dom";
import { getSubdomainSlug } from "@/utils/subdomain";

/**
 * Returns the store slug from URL params (path mode) or subdomain.
 * Use this instead of `useParams().slug` in all store pages.
 */
export function useStoreSlug(): string | undefined {
  const { slug } = useParams<{ slug?: string }>();
  return slug || getSubdomainSlug() || undefined;
}
