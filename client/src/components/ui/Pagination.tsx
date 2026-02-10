import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function Pagination({ currentPage, totalPages, onPageChange, isLoading }: PaginationProps) {
  const canGoPrevious = currentPage > 1;

  const handlePrevious = () => {
    console.log('[Pagination] Previous clicked, going to page', currentPage - 1);
    onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    console.log('[Pagination] Next clicked, going to page', currentPage + 1);
    onPageChange(currentPage + 1);
  };

  return (
    <div className="flex items-center justify-center gap-2 py-4 border-t border-border bg-background">
      {/* Previous Page */}
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={handlePrevious}
        disabled={!canGoPrevious || isLoading}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>

      {/* Page Info */}
      <span className="text-sm text-muted-foreground px-4">
        Page {currentPage}{totalPages > 1 ? ` of ${totalPages}` : ''}
      </span>

      {/* Next Page */}
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={handleNext}
        disabled={isLoading}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
