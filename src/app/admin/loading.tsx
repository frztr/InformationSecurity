import { PageSectionSkeleton } from "@/components/site/PageSectionSkeleton";

/**
 * Индикатор загрузки страницы администрирования.
 */
export default function AdminLoading() {
  return <PageSectionSkeleton cardCount={3} />;
}
