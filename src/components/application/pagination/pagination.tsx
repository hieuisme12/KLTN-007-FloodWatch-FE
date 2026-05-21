import type { PaginationRootProps } from "./pagination-base";
import { Pagination } from "./pagination-base";
import { cx } from "@/utils/cx";
import { useTranslation } from "react-i18next";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

interface PaginationProps extends Partial<Omit<PaginationRootProps, "children">> {
    /** Whether the pagination buttons are rounded. */
    rounded?: boolean;
}

const PaginationItem = ({ value, rounded, isCurrent }: { value: number; rounded?: boolean; isCurrent: boolean }) => (
    <Pagination.Item value={value} isCurrent={isCurrent}>
        {({ isSelected, onClick, "aria-current": ariaCurrent, "aria-label": ariaLabel }) => (
            <button
                type="button"
                onClick={onClick}
                aria-current={ariaCurrent}
                aria-label={ariaLabel}
                className={cx(
                    "flex h-9 min-w-9 cursor-pointer items-center justify-center px-2 text-sm font-medium text-slate-600 outline-none transition duration-100 hover:bg-slate-100 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                    rounded ? "rounded-full" : "rounded-lg",
                    isSelected && "bg-indigo-50 font-semibold text-indigo-700 hover:bg-indigo-100",
                )}
            >
                {value}
            </button>
        )}
    </Pagination.Item>
);

export const PaginationPageDefault = ({
    rounded,
    page = 1,
    total = 1,
    className,
    onPageChange,
    siblingCount,
    ...rest
}: PaginationProps) => {
    const { t } = useTranslation();
    const safeTotal = Math.max(1, total);

    return (
        <Pagination.Root
            {...rest}
            page={page}
            total={safeTotal}
            siblingCount={siblingCount ?? 1}
            onPageChange={onPageChange}
            className={cx(
                "flex w-full flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-3 md:px-6",
                className,
            )}
        >
            <div className="flex flex-1 justify-start">
                <Pagination.PrevTrigger asChild>
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <FaChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="hidden sm:inline">{t("reportsPage.paginationPrev")}</span>
                    </button>
                </Pagination.PrevTrigger>
            </div>

            <Pagination.Context>
                {({ pages, currentPage, total: pageTotal }) => (
                    <>
                        <div className="hidden justify-center gap-0.5 md:flex">
                            {pages.map((p, index) =>
                                p.type === "page" ? (
                                    <PaginationItem
                                        key={`${p.value}-${index}`}
                                        rounded={rounded}
                                        value={p.value}
                                        isCurrent={p.isCurrent}
                                    />
                                ) : (
                                    <Pagination.Ellipsis
                                        key={`ellipsis-${index}`}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center text-slate-400"
                                    >
                                        &#8230;
                                    </Pagination.Ellipsis>
                                ),
                            )}
                        </div>

                        <p className="text-center text-sm text-slate-500 md:hidden">
                            {t("reportsPage.paginationPageOf", { page: currentPage, total: pageTotal })}
                        </p>
                    </>
                )}
            </Pagination.Context>

            <div className="flex flex-1 justify-end">
                <Pagination.NextTrigger asChild>
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <span className="hidden sm:inline">{t("reportsPage.paginationNext")}</span>
                        <FaChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    </button>
                </Pagination.NextTrigger>
            </div>
        </Pagination.Root>
    );
};

export { Pagination } from "./pagination-base";
export type { PaginationRootProps, PaginationItemProps } from "./pagination-base";
