import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/locale";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const toQueryString = (
  searchParams: Record<string, string | string[] | undefined>
): string => {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
      continue;
    }

    query.set(key, value);
  }

  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
};

export default async function PriceAliasPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  const queryString = toQueryString(resolvedSearchParams);

  const targetPath =
    locale === defaultLocale ? `/pricing${queryString}` : `/${locale}/pricing${queryString}`;

  redirect(targetPath);
}
