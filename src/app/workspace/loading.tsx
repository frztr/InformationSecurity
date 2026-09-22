import { PageSectionSkeleton } from "@/components/site/PageSectionSkeleton";

/**
 * Индикатор загрузки страницы рабочего стола.
 */
export default function WorkspaceLoading() {
  return <PageSectionSkeleton cardCount={2} />;
}
